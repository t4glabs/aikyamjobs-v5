#!/usr/bin/env node
'use strict';

/**
 * Drafts requirement checklists for jobs that don't have one yet, using Claude
 * (via `claude -p`, so no API key needed). Writes a REVIEW file — nothing is
 * pushed to Strapi here. You skim/edit, then run apply-checklists.js.
 *
 * One batched Claude call per run (all N jobs in a single prompt) so the
 * Claude Code system-prompt overhead is paid once, not per job.
 *
 * Usage:
 *   node scripts/generate-checklists.js --limit=10
 *   STRAPI_URL=https://aikyamjobs.org node scripts/generate-checklists.js --limit=10
 *
 * Env: STRAPI_URL (default https://aikyamjobs.org), CLAUDE_MODEL (default Haiku)
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STRAPI_URL = (process.env.STRAPI_URL || 'https://aikyamjobs.org').replace(/\/$/, '');
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 10) : 10;
// Jobs per Claude call. Keep small — one giant call produces long output that
// gets truncated/malformed. 100 jobs => 10 batches of 10.
const chunkArg = process.argv.find((a) => a.startsWith('--chunk='));
const CHUNK = chunkArg ? Math.max(1, parseInt(chunkArg.split('=')[1], 10) || 10) : 10;

async function fetchJobsNeedingChecklist(limit) {
  const collected = [];
  let page = 1;
  const pageSize = 50;
  for (;;) {
    const url =
      `${STRAPI_URL}/api/jobs?fields[0]=title&fields[1]=slug&fields[2]=description` +
      `&populate[requirementChecklist][fields][0]=label` +
      `&populate[company][fields][0]=name` +
      `&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Strapi ${res.status} fetching jobs (page ${page})`);
    const body = await res.json();
    for (const d of body.data || []) {
      const cl = d.attributes.requirementChecklist;
      if (!Array.isArray(cl) || cl.length === 0) {
        collected.push({
          id: d.id,
          title: d.attributes.title,
          slug: d.attributes.slug,
          company:
            (d.attributes.company &&
              d.attributes.company.data &&
              d.attributes.company.data.attributes.name) ||
            '',
          description: d.attributes.description || '',
        });
        if (collected.length >= limit) return collected;
      }
    }
    const pageCount = (body.meta && body.meta.pagination && body.meta.pagination.pageCount) || 1;
    if (page >= pageCount) break;
    page += 1;
  }
  return collected;
}

function cleanJD(s) {
  return String(s || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // markdown images
    .replace(/https?:\/\/\S+/g, '') // bare urls
    .replace(/[#>*_`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBatchPrompt(jobs) {
  const blocks = jobs
    .map(
      (j, i) =>
        `--- JOB ${i + 1} ---\nslug: ${j.slug}\ntitle: ${j.title}\ncompany: ${j.company}\nJOB DESCRIPTION:\n${cleanJD(
          j.description
        ).slice(0, 8000)}`
    )
    .join('\n\n');

  return `You convert nonprofit job descriptions into precise applicant self-assessment checklists.

For EACH job, read its requirements / qualifications / "who we're looking for" section and produce 4-6 checklist items. Extract the CONCRETE requirements the JD actually states — years of experience, specific skills, tools/software, qualifications or degrees, languages, and location — and rewrite each as a short first-person statement the applicant can honestly tick.

Match this STYLE exactly (concrete, one requirement each, a clear yes/no boundary):
- "I have 2+ years of experience in the social impact sector"
- "I am based in or willing to relocate to Bhopal"
- "I have experience writing grant proposals"
- "I am fluent in Hindi and English"

Hard rules:
- Preserve the JD's specifics: exact numbers ("3+ years"), named skills/tools, degree names, languages, and the city/state.
- ONE requirement per item — never bundle two unrelated things into one line.
- NO vague filler. Do NOT write items like "relevant experience", "interested in the sector", or "good communication skills" unless the JD names something specific.
- "required": true ONLY for stated must-haves (mandatory location, minimum years of experience, a mandatory qualification). At most 3 per job.
- "weight": 1 = nice-to-have, 2 = important, 3 = critical.
- Never invent a requirement the JD does not state. If the post covers multiple different roles, base the checklist only on requirements common to all of them.

Output ONLY a JSON array (no prose, no markdown code fences). One object per job:
[{"slug":"<the job's slug>","checklist":[{"label":"...","required":true,"weight":3}]}]

${blocks}`;
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', '--output-format', 'json', '--model', MODEL], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.slice(0, 400)}`));
      resolve(out);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function extractModelText(stdout) {
  try {
    const env = JSON.parse(stdout);
    if (env && typeof env.result === 'string') return env.result;
  } catch {
    /* not the JSON envelope — use raw */
  }
  return stdout;
}

// Tolerant extractor: scans for balanced {...} objects and keeps any that parse
// into {slug, checklist}. Survives code fences, commentary, multiple arrays, and
// a truncated final object (it's simply skipped) — far more robust than trying
// to JSON.parse one giant array.
function extractObjects(text) {
  const objs = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let k = i; k < text.length; k++) {
      const c = text[k];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            const o = JSON.parse(text.slice(i, k + 1));
            if (o && typeof o.slug === 'string' && Array.isArray(o.checklist)) objs.push(o);
          } catch {
            /* not a complete/valid object — skip */
          }
          i = k;
          break;
        }
      }
    }
  }
  return objs;
}

function sanitizeChecklist(cl) {
  if (!Array.isArray(cl)) return [];
  return cl
    .filter((it) => it && typeof it.label === 'string' && it.label.trim())
    .slice(0, 6)
    .map((it) => ({
      label: it.label.trim(),
      required: !!it.required,
      weight: Math.min(3, Math.max(1, parseInt(it.weight, 10) || 1)),
    }));
}

(async () => {
  console.log(`Fetching up to ${LIMIT} job(s) without a checklist from ${STRAPI_URL} ...`);
  const jobs = await fetchJobsNeedingChecklist(LIMIT);
  if (!jobs.length) {
    console.log('✓ No jobs are missing a checklist. Nothing to do.');
    return;
  }

  const chunks = [];
  for (let i = 0; i < jobs.length; i += CHUNK) chunks.push(jobs.slice(i, i + CHUNK));
  console.log(
    `Drafting checklists for ${jobs.length} job(s) in ${chunks.length} batch(es) of up to ${CHUNK}, via ${MODEL} ...`
  );

  const bySlug = new Map();
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    process.stdout.write(`  batch ${ci + 1}/${chunks.length} (${chunk.length} jobs) ... `);
    try {
      const raw = await callClaude(buildBatchPrompt(chunk));
      const objs = extractObjects(extractModelText(raw));
      let got = 0;
      for (const o of objs) {
        bySlug.set(o.slug, sanitizeChecklist(o.checklist));
        got += 1;
      }
      console.log(`${got} checklists`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
  const out = jobs.map((j) => ({
    jobId: j.id,
    slug: j.slug,
    title: j.title,
    company: j.company,
    checklist: bySlug.get(j.slug) || [],
  }));
  const missing = out.filter((o) => !o.checklist.length);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.resolve(__dirname, 'checklists');
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, `checklists-${ts}.json`);
  const mdPath = path.join(dir, `checklists-${ts}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));

  const md = out
    .map((o) => {
      const L = [
        `## ${o.title}`,
        `slug: ${o.slug} · job id: ${o.jobId} · ${STRAPI_URL}/jobs/${o.slug}`,
        '',
      ];
      if (!o.checklist.length) L.push('> ⚠ no checklist generated — re-run or add manually');
      for (const it of o.checklist)
        L.push(`- [ ] ${it.label}  _(w${it.weight}${it.required ? ', required' : ''})_`);
      L.push('');
      return L.join('\n');
    })
    .join('\n');
  fs.writeFileSync(mdPath, md);

  console.log(`\n✓ Drafted ${out.length - missing.length}/${out.length} checklists.`);
  if (missing.length)
    console.log(`  ⚠ ${missing.length} had no output: ${missing.map((m) => m.slug).join(', ')}`);
  console.log(`\nReview (readable): ${mdPath}`);
  console.log(`Review/edit (JSON): ${jsonPath}`);
  console.log(`\nWhen happy, apply to Strapi:`);
  console.log(
    `  STRAPI_URL=${STRAPI_URL} STRAPI_WRITE_TOKEN=<token> node scripts/apply-checklists.js "${jsonPath}"`
  );
  console.log(`  (add --gate at the end to also switch those jobs to gated immediately)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

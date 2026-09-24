'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { NodeCompiler } = require('@myriaddreamin/typst-ts-node-compiler');
const { resolveApplyMode } = require('./apply');
const { markdownToBlocks } = require('./markdownBlocks');

const WORKSPACE = __dirname;
const TEMPLATE_PATH = path.join(WORKSPACE, 'mindmap-template.typ');
const DATA_SHADOW_PATH = path.join(WORKSPACE, 'mindmap-data.json');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Same "is this the real applicationUrl/Email, or the gated Application
 * Assist flow?" decision the job controller and JD page already make --
 * reused verbatim rather than re-derived, so this PDF can never end up
 * leaking a gated job's real apply target (the exact class of bug the
 * gating feature exists to prevent). Mirrors the sidebar CTA copy on
 * app/jobs/[slug]/page.tsx exactly ("Application Assist" / "Apply now" /
 * "Apply via email").
 */
function resolveApplyCta(job, settings) {
  const resolved = resolveApplyMode(job, settings);
  if (resolved === 'gated') {
    return { label: 'Application Assist', href: `${SITE_URL}/jobs/${job.slug}/apply` };
  }
  if (job.applicationUrl) return { label: 'Apply now', href: job.applicationUrl };
  if (job.applicationEmail) return { label: 'Apply via email', href: `mailto:${job.applicationEmail}` };
  return null;
}

/**
 * mindmapJson has shown up in two real shapes so far: one with an explicit
 * `root: { label, ... }` object, and one with no `root` key at all where the
 * top-level object IS the root (its own text in `title`). Both are valid --
 * the Typst template renders either -- this just confirms *something*
 * tree-shaped is actually present before spending a compile on it. Shared
 * by both the job's own mindmap and its company's.
 */
function looksLikeMindmapTree(mindmapJson) {
  if (!mindmapJson || typeof mindmapJson !== 'object') return false;
  const root = mindmapJson.root || mindmapJson;
  if (!root || typeof root !== 'object') return false;
  return typeof root.label === 'string' || typeof root.title === 'string';
}

function buildJobSection(job, settings) {
  return {
    title: job.title,
    url: job.slug ? `${SITE_URL}/jobs/${job.slug}` : null,
    location: job.location || null,
    jobType: job.jobType || null,
    experienceLevel: job.experienceLevel || null,
    salary: job.salary || null,
    closingDate: formatDate(job.closingDate),
    impactArea: job.impactArea || null,
    skills: Array.isArray(job.skills) ? job.skills : [],
    categories: Array.isArray(job.categories) ? job.categories.map((c) => c.name).filter(Boolean) : [],
    descriptionBlocks: markdownToBlocks(job.description),
    apply: resolveApplyCta(job, settings),
  };
}

function buildCompanySection(company) {
  if (!company) return null;
  return {
    name: company.name,
    url: company.slug ? `${SITE_URL}/companies/${company.slug}` : null,
    location: company.location || null,
    size: company.size || null,
    industry: company.industry || null,
    website: company.website || null,
    descriptionBlocks: markdownToBlocks(company.description),
  };
}

/**
 * Renders the full "JD as a PDF" document -- branded header, the JD
 * mindmap, the job description itself, then (only if the company has its
 * own mindmap set) the company's mindmap and profile, then a footer.
 * Compiles a fresh in-process compiler per call (cheap, sub-second) with
 * the data injected as an in-memory shadow file -- never writes to disk, so
 * concurrent calls (multiple jobs publishing at once) can't collide on a
 * shared temp path. Typst's own embedded default font is used deliberately
 * (covers ₹ and accented Latin text fine) so no font files need to be
 * bundled or installed on the server.
 */
function generateMindmapPdf({ jobMindmap, job, companyMindmap, company, brandColor }) {
  const compiler = NodeCompiler.create({ workspace: WORKSPACE });
  try {
    const shadowData = {
      meta: { brandColor: brandColor || '#AE4634' },
      jobMindmap: jobMindmap || null,
      job,
      companyMindmap: companyMindmap || null,
      company: company || null,
    };
    compiler.mapShadow(DATA_SHADOW_PATH, Buffer.from(JSON.stringify(shadowData)));
    const pdf = compiler.pdf({ mainFilePath: TEMPLATE_PATH });
    if (!pdf) throw new Error('Typst compilation produced no output');
    return Buffer.from(pdf);
  } finally {
    compiler.evictCache(0);
  }
}

/**
 * Generates the PDF and uploads it into Strapi's media library via the
 * upload plugin's own service (the same one CV uploads go through). The
 * upload service reads from a real file path (formidable convention:
 * file.path/name/type/size), so the in-memory buffer is written to a
 * uniquely-named temp file just for the upload call, then removed
 * regardless of outcome.
 */
async function uploadMindmapPdf(strapi, { slug, ...rest }) {
  const buffer = generateMindmapPdf(rest);
  const tmpPath = path.join(os.tmpdir(), `mindmap-${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const [uploaded] = await strapi.plugin('upload').service('upload').upload({
      data: {},
      files: {
        path: tmpPath,
        name: `${slug || 'job'}-mindmap.pdf`,
        type: 'application/pdf',
        size: buffer.length,
      },
    });
    return uploaded;
  } finally {
    fs.rm(tmpPath, { force: true }, () => {});
  }
}

/**
 * Full generate -> upload -> link -> clean-up-previous-file flow for one
 * job. Never throws -- logs and returns without touching the job on any
 * failure, since a Typst bug should never block saving the job itself
 * (this always runs from a lifecycle hook, after the job row is already
 * committed).
 *
 * Only the JOB's own mindmapJson gates whether a PDF gets built at all --
 * the company mindmap/profile sections are included opportunistically
 * when the job's company happens to have mindmapJson set at the moment of
 * generation, not required. Reasoning: the JD mindmap + JD text are a
 * complete, useful document on their own, and gating the whole feature on
 * an unrelated content type's optional field being filled in first would
 * block the common case (company mindmaps will lag behind job postings in
 * practice). One consequence: editing a company's mindmapJson does NOT
 * retroactively refresh PDFs for that company's already-published jobs --
 * re-saving the job (same as any other JD-mindmap edit) does.
 */
async function regenerateJobMindmap(strapi, jobId) {
  const job = await strapi.entityService.findOne('api::job.job', jobId, {
    populate: {
      mindmapPdf: true,
      requirementChecklist: true,
      categories: { fields: ['name'] },
      company: { fields: ['name', 'slug', 'description', 'location', 'size', 'industry', 'website', 'mindmapJson'] },
    },
    fields: [
      'slug', 'title', 'mindmapJson', 'description', 'location', 'jobType', 'experienceLevel',
      'salary', 'closingDate', 'impactArea', 'skills', 'applyMode', 'applicationUrl', 'applicationEmail',
    ],
  });
  if (!job) {
    strapi.log.warn(`[mindmap] job ${jobId} not found when regenerating — skipping`);
    return;
  }
  if (!job.mindmapJson) {
    strapi.log.info(`[mindmap] job ${jobId} (${job.slug}) has no mindmapJson set — nothing to generate`);
    return;
  }
  if (!looksLikeMindmapTree(job.mindmapJson)) {
    strapi.log.warn(
      `[mindmap] job ${jobId} (${job.slug}) has mindmapJson set but it doesn't look like a valid tree (no root/label/title found) — skipping generation`
    );
    return;
  }

  const previousPdf = job.mindmapPdf;
  const settings = await strapi.entityService.findMany('api::site-setting.site-setting');

  const company = job.company || null;
  let companyMindmap = null;
  if (!company) {
    strapi.log.info(`[mindmap] job ${jobId} (${job.slug}) has no company relation set — company section will be omitted`);
  } else if (!company.mindmapJson) {
    strapi.log.info(
      `[mindmap] job ${jobId} (${job.slug}) company "${company.name}" (id ${company.id}) has no mindmapJson set — company section will be omitted`
    );
  } else if (!looksLikeMindmapTree(company.mindmapJson)) {
    strapi.log.warn(
      `[mindmap] job ${jobId} (${job.slug}) company "${company.name}" (id ${company.id}) has mindmapJson set but it doesn't look like a valid tree — company section will be omitted`
    );
  } else {
    companyMindmap = company.mindmapJson;
  }

  let uploaded;
  try {
    uploaded = await uploadMindmapPdf(strapi, {
      slug: job.slug,
      jobMindmap: job.mindmapJson,
      job: buildJobSection(job, settings),
      companyMindmap,
      company: buildCompanySection(company),
      brandColor: settings?.primaryColor,
    });
  } catch (err) {
    strapi.log.error(`[mindmap] job ${jobId} (${job.slug}) PDF generation/upload failed`, err);
    return;
  }

  await strapi.entityService.update('api::job.job', jobId, {
    data: { mindmapPdf: uploaded.id },
  });

  strapi.log.info(
    `[mindmap] job ${jobId} (${job.slug}) regenerated PDF (upload id ${uploaded.id}) — sections: JD mindmap + JD` +
      (companyMindmap ? ' + company mindmap + company profile' : company ? ' (company profile only, no company mindmap)' : '')
  );

  if (previousPdf && previousPdf.id !== uploaded.id) {
    await strapi
      .plugin('upload')
      .service('upload')
      .remove(previousPdf)
      .catch((err) => strapi.log.error('[mindmap] failed to remove previous mindmap PDF', err));
  }
}

module.exports = { generateMindmapPdf, regenerateJobMindmap };

#!/usr/bin/env node
'use strict';

/**
 * Apply-mode rollout tracker.
 *
 * Prints, for all published jobs, where each stands in the migration from the
 * old external "Apply now" button to the new gated aikyam flow:
 *
 *   ✅ LIVE GATED     — resolvedApplyMode = gated (new button is showing)
 *   🟡 READY TO FLIP  — has a requirement checklist but still external
 *                       (the team prepped it; just needs applyMode -> gated,
 *                        or the site-wide switch)
 *   🔴 NEEDS CHECKLIST — no requirement checklist yet (team must add one before
 *                        it can ever go gated)
 *
 * Usage:
 *   node scripts/apply-rollout-status.js            # summary + actionable lists
 *   node scripts/apply-rollout-status.js --all      # also list live gated jobs
 *   STRAPI_URL=http://127.0.0.1:1338 node scripts/apply-rollout-status.js
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const SHOW_ALL = process.argv.includes('--all');

async function fetchAllJobs() {
  const jobs = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const url =
      `${STRAPI_URL}/api/jobs?fields[0]=title&fields[1]=slug&fields[2]=applyMode` +
      `&populate[requirementChecklist][fields][0]=label` +
      `&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=title:asc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Strapi ${res.status} fetching jobs (page ${page})`);
    const body = await res.json();
    jobs.push(...(body.data || []));
    const pageCount = body.meta?.pagination?.pageCount || 1;
    if (page >= pageCount) break;
    page += 1;
  }
  return jobs;
}

function categorize(job) {
  const a = job.attributes || {};
  const checklist = a.requirementChecklist || [];
  const hasChecklist = Array.isArray(checklist) && checklist.length > 0;
  if (a.resolvedApplyMode === 'gated') return 'live';
  if (hasChecklist) return 'ready';
  return 'needs';
}

(async () => {
  let jobs;
  try {
    jobs = await fetchAllJobs();
  } catch (err) {
    console.error(`\n✗ Could not reach Strapi at ${STRAPI_URL}\n  ${err.message}\n`);
    process.exit(1);
  }

  const buckets = { live: [], ready: [], needs: [] };
  for (const job of jobs) buckets[categorize(job)].push(job);

  const total = jobs.length;
  const line = (n) => `${n}`.padStart(4);

  console.log(`\n  Apply-mode rollout  —  ${STRAPI_URL}`);
  console.log(`  ${'─'.repeat(46)}`);
  console.log(`  ✅ LIVE GATED       ${line(buckets.live.length)}`);
  console.log(`  🟡 READY TO FLIP    ${line(buckets.ready.length)}   (prepped, still external)`);
  console.log(`  🔴 NEEDS CHECKLIST  ${line(buckets.needs.length)}   (team must add items)`);
  console.log(`  ${'─'.repeat(46)}`);
  console.log(`     published jobs   ${line(total)}\n`);

  if (buckets.ready.length) {
    console.log(`  🟡 Ready to flip to gated (${buckets.ready.length}):`);
    for (const j of buckets.ready) console.log(`     · ${j.attributes.slug}   ${j.attributes.title}`);
    console.log('');
  }

  if (buckets.needs.length) {
    console.log(`  🔴 Needs a requirement checklist before it can go gated (${buckets.needs.length}):`);
    for (const j of buckets.needs) console.log(`     · ${j.attributes.slug}   ${j.attributes.title}`);
    console.log('');
  }

  if (SHOW_ALL && buckets.live.length) {
    console.log(`  ✅ Live gated (${buckets.live.length}):`);
    for (const j of buckets.live) console.log(`     · ${j.attributes.slug}   ${j.attributes.title}`);
    console.log('');
  }
})();

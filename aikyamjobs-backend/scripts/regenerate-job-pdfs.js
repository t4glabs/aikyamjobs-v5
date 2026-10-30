'use strict';

/**
 * One-off maintenance, after the 2026-10-30 JD PDF fixes:
 *
 *   1. Company maps stuck on the draft. Before the fix, the Company mindmap
 *      side panel saved maps to the company's *draft* only, so the live
 *      company (which the site and the PDF read) never got them. For every
 *      *published* company whose draft map is missing from / different to
 *      its live row, copy the draft map onto the live row. Companies that
 *      were never published are only listed -- publishing a company is an
 *      editorial call.
 *   2. Rebuild the PDF of every published job that has a usable mindmap, in
 *      the current layout, attached to both its draft and live rows (same
 *      code path as the side panel: regenerateJobMindmap 'published').
 *
 * Dry run by default (lists what it would do, changes nothing):
 *   TELEGRAM_BOT_TOKEN= node scripts/regenerate-job-pdfs.js
 * Do it:
 *   TELEGRAM_BOT_TOKEN= node scripts/regenerate-job-pdfs.js --apply
 *
 * Run from aikyamjobs-backend/ with the live backend STOPPED (SQLite, one
 * writer at a time). TELEGRAM_BOT_TOKEN must be blank for this command:
 * loading Strapi starts the Telegram bot, and a second poller would fight
 * the live one.
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');

const APPLY = process.argv.includes('--apply');

(async () => {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.error('Refusing to run with TELEGRAM_BOT_TOKEN set. Prefix the command with: TELEGRAM_BOT_TOKEN=');
    process.exit(1);
  }

  const app = await createStrapi(await compileStrapi()).load();
  const { regenerateJobMindmap } = require('../src/utils/mindmapPdf');
  const { toPublicTree } = require('../src/utils/mindmapTree');
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  try {
    console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (nothing will change; add --apply to do it) ===');

    // ---- 1. Company maps stuck on the draft ----
    const drafts = await app.db.query('api::company.company').findMany({
      where: { publishedAt: null, mindmapJson: { $notNull: true } },
    });
    let synced = 0;
    for (const draft of drafts) {
      const live = await app.db.query('api::company.company').findOne({
        where: { documentId: draft.documentId, publishedAt: { $notNull: true } },
      });
      if (!live) {
        console.log(`  [company not published — left alone] ${draft.slug}`);
        continue;
      }
      if (same(live.mindmapJson, draft.mindmapJson)) continue;
      console.log(`  [${live.mindmapJson ? 'live map outdated' : 'map only on draft'}] ${draft.slug}${APPLY ? ' -> copied to live' : ''}`);
      if (APPLY) {
        await app.db.query('api::company.company').update({ where: { id: live.id }, data: { mindmapJson: draft.mindmapJson } });
      }
      synced++;
    }
    console.log(`Company maps ${APPLY ? 'copied to live' : 'to copy to live'}: ${synced}`);

    // ---- 2. Rebuild PDFs for published jobs with a usable mindmap ----
    const jobs = await app.db.query('api::job.job').findMany({
      where: { publishedAt: { $notNull: true }, mindmapJson: { $notNull: true } },
      select: ['documentId', 'slug', 'mindmapJson'],
    });
    const usable = jobs.filter((j) => toPublicTree(j.mindmapJson));
    const skipped = jobs.filter((j) => !toPublicTree(j.mindmapJson));
    skipped.forEach((j) => console.log(`  [no usable mindmap — skipped] ${j.slug}`));
    console.log(`Published jobs with a usable mindmap: ${usable.length}`);

    if (APPLY) {
      let ok = 0;
      const failed = [];
      const started = Date.now();
      for (const [i, job] of usable.entries()) {
        const res = await regenerateJobMindmap(app, job.documentId, { source: 'published' }).catch(() => null);
        if (res) ok++;
        else failed.push(job.slug);
        if ((i + 1) % 20 === 0) console.log(`  ...${i + 1}/${usable.length}`);
      }
      console.log(`PDFs rebuilt: ${ok}/${usable.length} in ${Math.round((Date.now() - started) / 1000)}s`);
      failed.forEach((s) => console.log(`  [FAILED — see log above] ${s}`));
    }
  } finally {
    await app.destroy();
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
'use strict';

/**
 * Applies reviewed checklists (the JSON produced by generate-checklists.js) to
 * Strapi. Fills ONLY requirementChecklist — it never changes applyMode, so no
 * job goes gated automatically. Updating an existing published job's checklist
 * does not fire the Telegram announcement (that only triggers on publish/create).
 *
 * Usage:
 *   STRAPI_URL=https://aikyamjobs.org STRAPI_WRITE_TOKEN=xxxxx \
 *     node scripts/apply-checklists.js scripts/checklists/checklists-<ts>.json
 *
 * The token is a Strapi API token (admin → Settings → API Tokens) with
 * permission to update Job entries.
 */

import fs from 'fs';

const STRAPI_URL = (process.env.STRAPI_URL || 'https://aikyamjobs.org').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_WRITE_TOKEN;
const args = process.argv.slice(2);
const GATE = args.includes('--gate');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error(
    'Usage: STRAPI_WRITE_TOKEN=xxx node scripts/apply-checklists.js <checklists-*.json> [--gate]\n' +
      '  --gate   also set applyMode=gated on each job (goes live immediately)'
  );
  process.exit(1);
}
if (!TOKEN) {
  console.error(
    'Set STRAPI_WRITE_TOKEN — a Strapi API token (admin → Settings → API Tokens) with Job update permission.'
  );
  process.exit(1);
}

(async () => {
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const it of items) {
    if (!it.checklist || !it.checklist.length) {
      console.log(`  – ${it.slug}: no checklist in file, skipped`);
      skip += 1;
      continue;
    }
    const res = await fetch(`${STRAPI_URL}/api/jobs/${it.jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          requirementChecklist: it.checklist,
          ...(GATE ? { applyMode: 'gated' } : {}),
        },
      }),
    });
    if (res.ok) {
      console.log(`  ✓ ${it.slug} (${it.checklist.length} items${GATE ? ', gated' : ''})`);
      ok += 1;
    } else {
      const t = await res.text().catch(() => '');
      console.log(`  ✗ ${it.slug}: HTTP ${res.status} ${t.slice(0, 140)}`);
      fail += 1;
    }
  }

  console.log(`\nApplied: ${ok} | skipped: ${skip} | failed: ${fail}`);
  if (GATE) {
    console.log('Checklists added AND jobs set to gated — live now. Verify in Strapi.');
  } else {
    console.log(
      'Checklists added; applyMode left untouched. Review in Strapi, then gate per job ' +
        '(or flip globalApplyMode), or re-run apply with --gate.'
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

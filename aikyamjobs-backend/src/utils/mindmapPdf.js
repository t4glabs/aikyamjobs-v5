'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { NodeCompiler } = require('@myriaddreamin/typst-ts-node-compiler');

const WORKSPACE = __dirname;
const TEMPLATE_PATH = path.join(WORKSPACE, 'mindmap-template.typ');
const DATA_SHADOW_PATH = path.join(WORKSPACE, 'mindmap-data.json');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

/**
 * Renders a JD mindmap into a branded PDF buffer: an aikyamjobs header band,
 * the job title + a live link back to the listing, the mindmap itself, then
 * a closing line. Compiles a fresh in-process compiler per call (cheap,
 * sub-second) with the data injected as an in-memory shadow file — never
 * writes to disk, so concurrent calls (multiple jobs publishing at once)
 * can't collide on a shared temp path. Typst's own embedded default font is
 * used deliberately (covers ₹ and accented Latin text fine) so no font
 * files need to be bundled or installed on the server.
 */
function generateMindmapPdf({ mindmapJson, jobTitle, jobUrl, brandColor }) {
  const compiler = NodeCompiler.create({ workspace: WORKSPACE });
  try {
    const shadowData = {
      tree: mindmapJson,
      meta: { jobTitle: jobTitle || '', jobUrl: jobUrl || null, brandColor: brandColor || '#AE4634' },
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
 * Generates the mindmap PDF for a job and uploads it into Strapi's media
 * library via the upload plugin's own service (the same one CV uploads go
 * through). The upload service reads from a real file path (formidable
 * convention: file.path/name/type/size), so the in-memory buffer is
 * written to a uniquely-named temp file just for the upload call, then
 * removed regardless of outcome.
 */
async function uploadMindmapPdf(strapi, { slug, mindmapJson, jobTitle, brandColor }) {
  const jobUrl = slug ? `${SITE_URL}/jobs/${slug}` : null;
  const buffer = generateMindmapPdf({ mindmapJson, jobTitle, jobUrl, brandColor });
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
 * mindmapJson has shown up in two real shapes so far: one with an explicit
 * `root: { label, ... }` object, and one with no `root` key at all where the
 * top-level object IS the root (its own text in `title`). Both are valid —
 * the Typst template itself renders either — this just confirms *something*
 * tree-shaped is actually present before spending a compile on it.
 */
function looksLikeMindmapTree(mindmapJson) {
  if (!mindmapJson || typeof mindmapJson !== 'object') return false;
  const root = mindmapJson.root || mindmapJson;
  if (!root || typeof root !== 'object') return false;
  return typeof root.label === 'string' || typeof root.title === 'string';
}

/**
 * Full generate -> upload -> link -> clean-up-previous-file flow for one
 * job. Never throws — logs and returns without touching the job on any
 * failure, since a Typst bug should never block saving the job itself
 * (this always runs from a lifecycle hook, after the job row is already
 * committed).
 */
async function regenerateJobMindmap(strapi, jobId) {
  const job = await strapi.entityService.findOne('api::job.job', jobId, {
    populate: { mindmapPdf: true },
    fields: ['slug', 'title', 'mindmapJson'],
  });
  if (!job || !job.mindmapJson) return;
  if (!looksLikeMindmapTree(job.mindmapJson)) {
    strapi.log.warn(
      `[mindmap] job ${jobId} has mindmapJson set but it doesn't look like a valid tree (no root/label/title found) — skipping generation`
    );
    return;
  }

  const previousPdf = job.mindmapPdf;
  const settings = await strapi.entityService.findMany('api::site-setting.site-setting');

  let uploaded;
  try {
    uploaded = await uploadMindmapPdf(strapi, {
      slug: job.slug,
      mindmapJson: job.mindmapJson,
      jobTitle: job.title,
      brandColor: settings?.primaryColor,
    });
  } catch (err) {
    strapi.log.error('[mindmap] PDF generation/upload failed', err);
    return;
  }

  await strapi.entityService.update('api::job.job', jobId, {
    data: { mindmapPdf: uploaded.id },
  });

  if (previousPdf && previousPdf.id !== uploaded.id) {
    await strapi
      .plugin('upload')
      .service('upload')
      .remove(previousPdf)
      .catch((err) => strapi.log.error('[mindmap] failed to remove previous mindmap PDF', err));
  }
}

module.exports = { generateMindmapPdf, regenerateJobMindmap };

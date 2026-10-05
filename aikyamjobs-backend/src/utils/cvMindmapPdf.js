'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { NodeCompiler } = require('@myriaddreamin/typst-ts-node-compiler');

const WORKSPACE = __dirname;
const TEMPLATE_PATH = path.join(WORKSPACE, 'cv-mindmap-template.typ');
const DATA_SHADOW_PATH = path.join(WORKSPACE, 'cv-mindmap-data.json');

/**
 * cvMindmapJson has the same "is there a root/label/title anywhere" check as
 * Job/Company mindmapJson -- confirms something tree-shaped is actually
 * present before spending a compile on it. Shared logic, not a shared
 * function, since this file is deliberately independent of mindmapPdf.js
 * (see cv-mindmap-template.typ's header comment for why).
 */
function looksLikeMindmapTree(mindmapJson) {
  if (!mindmapJson || typeof mindmapJson !== 'object') return false;
  const root = mindmapJson.root || mindmapJson;
  if (!root || typeof root !== 'object') return false;
  return typeof root.label === 'string' || typeof root.title === 'string';
}

/**
 * Renders an applicant's CV mindmap into a branded PDF buffer: header, the
 * candidate's name + one-line summary, the mindmap tree, a closing line.
 * Compiles a fresh in-process compiler per call (cheap, sub-second) with the
 * data injected as an in-memory shadow file -- same pattern as
 * mindmapPdf.js's generateMindmapPdf.
 */
function generateCvMindmapPdf({ cvMindmap, brandColor }) {
  const compiler = NodeCompiler.create({ workspace: WORKSPACE });
  try {
    const shadowData = {
      meta: { brandColor: brandColor || '#AE4634' },
      cvMindmap,
    };
    compiler.mapShadow(DATA_SHADOW_PATH, Buffer.from(JSON.stringify(shadowData)));
    const pdf = compiler.pdf({ mainFilePath: TEMPLATE_PATH });
    if (!pdf) throw new Error('Typst compilation produced no output');
    return Buffer.from(pdf);
  } finally {
    compiler.evictCache(0);
  }
}

async function uploadCvMindmapPdf(strapi, { slug, ...rest }) {
  const buffer = generateCvMindmapPdf(rest);
  const tmpPath = path.join(os.tmpdir(), `cv-mindmap-${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const [uploaded] = await strapi.plugin('upload').service('upload').upload({
      data: {},
      files: {
        path: tmpPath,
        name: `${slug || 'applicant'}-cv-mindmap.pdf`,
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
 * applicant. Never throws -- logs and returns without touching the
 * applicant on any failure, same reasoning as Job's regenerateJobMindmap:
 * this always runs from a lifecycle hook after the row is already
 * committed, and a Typst bug should never block saving an applicant.
 */
async function regenerateApplicantCvMindmap(strapi, applicantId) {
  const applicant = await strapi.entityService.findOne('api::applicant.applicant', applicantId, {
    populate: { cvMindmapPdf: true },
    fields: ['name', 'email', 'cvMindmapJson'],
  });
  if (!applicant) {
    strapi.log.warn(`[cv-mindmap] applicant ${applicantId} not found when regenerating — skipping`);
    return;
  }
  if (!applicant.cvMindmapJson) {
    strapi.log.info(`[cv-mindmap] applicant ${applicantId} has no cvMindmapJson set — nothing to generate`);
    return;
  }
  if (!looksLikeMindmapTree(applicant.cvMindmapJson)) {
    strapi.log.warn(
      `[cv-mindmap] applicant ${applicantId} has cvMindmapJson set but it doesn't look like a valid tree (no root/label/title found) — skipping generation`
    );
    return;
  }

  const previousPdf = applicant.cvMindmapPdf;
  const settings = await strapi.entityService.findMany('api::site-setting.site-setting');

  // Slug-ish filename from the applicant's name/email -- applicants have no
  // real `slug` field (they're not public content), so this is cosmetic
  // only, purely for the uploaded file's display name.
  const slugSource = applicant.name || applicant.email || 'applicant';
  const slug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  let uploaded;
  try {
    uploaded = await uploadCvMindmapPdf(strapi, {
      slug,
      cvMindmap: applicant.cvMindmapJson,
      brandColor: settings?.primaryColor,
    });
  } catch (err) {
    strapi.log.error(`[cv-mindmap] applicant ${applicantId} PDF generation/upload failed`, err);
    return;
  }

  await strapi.entityService.update('api::applicant.applicant', applicantId, {
    data: { cvMindmapPdf: uploaded.id },
  });

  if (previousPdf && previousPdf.id !== uploaded.id) {
    await strapi
      .plugin('upload')
      .service('upload')
      .remove(previousPdf)
      .catch((err) => strapi.log.error('[cv-mindmap] failed to remove previous CV mindmap PDF', err));
  }

  strapi.log.info(`[cv-mindmap] applicant ${applicantId} regenerated CV mindmap PDF (upload id ${uploaded.id})`);
}

module.exports = { generateCvMindmapPdf, regenerateApplicantCvMindmap };

'use strict';

const { regenerateApplicantCvMindmap } = require('../utils/cvMindmapPdf');

const UID = 'api::applicant.applicant';

/**
 * Registered as a global Document Service middleware (src/index.js's
 * register()) -- see document-middlewares/job.js for why this replaced the
 * old per-content-type lifecycles.js mechanism.
 *
 * Applicant has draftAndPublish disabled, so there's no draft/published
 * duality to worry about here (unlike Job): every write is already the live
 * row, so regenerating just needs "was cvMindmapJson part of this write."
 *
 * Recursion safety: regenerateApplicantCvMindmap's own update() call (to set
 * cvMindmapPdf) re-enters this same middleware, but that inner call's data
 * never includes cvMindmapJson, so the check below is correctly false for it.
 */
module.exports = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== UID) return next();

    if (ctx.action === 'update') {
      const cvMindmapJsonInPayload = Object.prototype.hasOwnProperty.call(
        ctx.params.data || {},
        'cvMindmapJson'
      );
      const result = await next();
      if (cvMindmapJsonInPayload) {
        await regenerateApplicantCvMindmap(strapi, ctx.params.documentId).catch((err) =>
          strapi.log.error('[cv-mindmap] regenerateApplicantCvMindmap failed', err)
        );
      }
      return result;
    }

    if (ctx.action === 'create') {
      const result = await next();
      if (result?.cvMindmapJson) {
        await regenerateApplicantCvMindmap(strapi, result.documentId).catch((err) =>
          strapi.log.error('[cv-mindmap] regenerateApplicantCvMindmap failed', err)
        );
      }
      return result;
    }

    return next();
  });
};

'use strict';

const { regenerateApplicantCvMindmap } = require('../../../../utils/cvMindmapPdf');

/**
 * Applicant has no draftAndPublish (options.draftAndPublish: false in its
 * schema) -- every save is already live, so unlike Job's two-step
 * save-then-publish dance (which needed a dual trigger condition),
 * regenerating here just needs "was cvMindmapJson part of this write."
 *
 * Recursion safety: regenerateApplicantCvMindmap's own entityService.update
 * call (to set cvMindmapPdf) re-triggers beforeUpdate/afterUpdate, but that
 * inner call's data never includes cvMindmapJson, so cvMindmapJsonInPayload
 * is correctly false for it -- same guard pattern as Job's lifecycle.
 */
module.exports = {
  async beforeUpdate(event) {
    const { data } = event.params || {};
    event.state = event.state || {};
    event.state.cvMindmapJsonInPayload =
      !!data && Object.prototype.hasOwnProperty.call(data, 'cvMindmapJson');
  },

  async afterUpdate(event) {
    if (event.state?.cvMindmapJsonInPayload) {
      await regenerateApplicantCvMindmap(strapi, event.result.id).catch((err) =>
        strapi.log.error('[cv-mindmap] regenerateApplicantCvMindmap failed', err)
      );
    }
  },

  async afterCreate(event) {
    if (event.result.cvMindmapJson) {
      await regenerateApplicantCvMindmap(strapi, event.result.id).catch((err) =>
        strapi.log.error('[cv-mindmap] regenerateApplicantCvMindmap failed', err)
      );
    }
  },
};

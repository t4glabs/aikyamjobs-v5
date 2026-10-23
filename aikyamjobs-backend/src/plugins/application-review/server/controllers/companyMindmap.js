'use strict';

const { looksLikeMindmapTree } = require('../../../../utils/cvMindmapPdf');
const { regenerateJobMindmap } = require('../../../../utils/mindmapPdf');
const { idToDocumentId } = require('../../../../utils/resolveDocumentId');

/**
 * Lets HR check/edit a Company's mindmap JSON directly from the Job edit
 * screen (see src/admin/components/CompanyMindmapCheck.js, injected into
 * the content-manager's Job edit view) instead of needing Company open in a
 * second tab -- same reasoning as applicantCvMindmap.js, different entity.
 *
 * Company has no standalone PDF of its own (its mindmap only ever renders
 * as a section inside a JD's PDF -- see Company schema's own field
 * description), so unlike the applicant version there's nothing to
 * regenerate here by itself. If the request names which job is currently
 * being edited (jobIdToRefresh), that job's own PDF is refreshed too, so
 * the person editing the company JSON from the Job screen sees the result
 * land in the one PDF that actually matters to them without a separate
 * save step.
 */
module.exports = {
  async getMindmapStatus(ctx) {
    const documentId = await idToDocumentId(strapi, 'api::company.company', ctx.params.id);
    if (!documentId) return ctx.notFound();

    // No `fields` allowlist -- mindmapJson is `private: true`, and Strapi
    // 5's Document Service rejects explicitly selecting a private field via
    // `fields` even for internal server-side calls.
    const company = await strapi.documents('api::company.company').findOne({
      documentId,
    });
    if (!company) return ctx.notFound();

    ctx.body = {
      companyName: company.name,
      mindmapJson: company.mindmapJson || null,
    };
  },

  async setMindmapStatus(ctx) {
    const { mindmapJson, jobIdToRefresh } = ctx.request.body || {};

    if (!mindmapJson || typeof mindmapJson !== 'object') {
      return ctx.badRequest('mindmapJson must be a JSON object.');
    }
    if (!looksLikeMindmapTree(mindmapJson)) {
      return ctx.badRequest(
        "This doesn't look like a valid mindmap — the root (or the object itself) needs a `label` or `title`."
      );
    }

    const documentId = await idToDocumentId(strapi, 'api::company.company', ctx.params.id);
    if (!documentId) return ctx.notFound();

    await strapi.documents('api::company.company').update({
      documentId,
      data: { mindmapJson },
    });

    let jobMindmapRefreshed = false;
    if (jobIdToRefresh) {
      try {
        await regenerateJobMindmap(strapi, jobIdToRefresh);
        jobMindmapRefreshed = true;
      } catch (err) {
        strapi.log.error('[company-mindmap] failed to refresh the job mindmap PDF after a company JSON save', err);
      }
    }

    ctx.body = { ok: true, mindmapJson, jobMindmapRefreshed };
  },
};

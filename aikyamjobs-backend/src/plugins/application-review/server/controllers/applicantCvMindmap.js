'use strict';

const { looksLikeMindmapTree } = require('../../../../utils/cvMindmapPdf');
const { idToDocumentId } = require('../../../../utils/resolveDocumentId');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/**
 * Lets HR add/edit an applicant's CV mindmap JSON directly from the
 * Application Review / CV Improver detail screens, instead of needing to
 * separately open the Applicant in Content Manager -- that disconnect was
 * the actual complaint (the JSON already existed as a field, it just wasn't
 * reachable from where HR is already looking at this person's CV).
 *
 * Saving goes through entityService.update like any other write, so the
 * Applicant lifecycle hook (regenerateApplicantCvMindmap) fires exactly as
 * it would from a Content Manager edit -- no separate PDF-generation logic
 * here, this is just a more convenient door into the same mechanism.
 */
module.exports = {
  async setCvMindmap(ctx) {
    const { cvMindmapJson } = ctx.request.body || {};

    if (!cvMindmapJson || typeof cvMindmapJson !== 'object') {
      return ctx.badRequest('cvMindmapJson must be a JSON object.');
    }
    if (!looksLikeMindmapTree(cvMindmapJson)) {
      return ctx.badRequest(
        "This doesn't look like a valid mindmap — the root (or the object itself) needs a `label` or `title`."
      );
    }

    const documentId = await idToDocumentId(strapi, 'api::applicant.applicant', ctx.params.id);
    if (!documentId) return ctx.notFound();

    await strapi.documents('api::applicant.applicant').update({
      documentId,
      data: { cvMindmapJson },
    });

    // Re-fetch rather than trust the update() return value -- the document
    // middleware's own nested update (setting cvMindmapPdf once the PDF is
    // built) happens as part of this same call chain, so by now it's
    // already reflected in the DB, but not necessarily in what update()
    // itself returned.
    // No `fields` allowlist -- cvMindmapJson is `private: true`, and Strapi
    // 5's Document Service rejects explicitly selecting a private field via
    // `fields` even for internal server-side calls.
    const fresh = await strapi.documents('api::applicant.applicant').findOne({
      documentId,
      populate: { cvMindmapPdf: true },
    });

    ctx.body = {
      ok: true,
      cvMindmapJson: fresh.cvMindmapJson,
      cvMindmapPdf: fresh.cvMindmapPdf ? { url: absoluteMediaUrl(fresh.cvMindmapPdf.url) } : null,
    };
  },
};

'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { idToDocumentId } = require('../../../utils/resolveDocumentId');

module.exports = createCoreService('api::applicant.applicant', ({ strapi }) => ({
  /**
   * Phase-3 groundwork: after an applicant applies, fold the job's category
   * slugs into their interestTags so we can later recommend matching jobs. Pure
   * set-union of tag slugs — no AI, deterministic, cheap. Best-effort: callers
   * fire-and-forget and swallow errors so it never blocks a submission.
   */
  async addInterestFromJob(applicantId, jobId) {
    const jobDocumentId = await idToDocumentId(strapi, 'api::job.job', jobId);
    const job = jobDocumentId
      ? await strapi.documents('api::job.job').findOne({
          documentId: jobDocumentId,
          populate: { categories: true },
        })
      : null;
    const slugs = ((job && job.categories) || [])
      .map((c) => c.slug)
      .filter(Boolean);
    if (!slugs.length) return;

    const applicantDocumentId = await idToDocumentId(strapi, 'api::applicant.applicant', applicantId);
    if (!applicantDocumentId) return;
    const applicant = await strapi.documents('api::applicant.applicant').findOne({
      documentId: applicantDocumentId,
    });
    const current = Array.isArray(applicant.interestTags) ? applicant.interestTags : [];
    const merged = Array.from(new Set([...current, ...slugs]));

    if (merged.length !== current.length) {
      await strapi.documents('api::applicant.applicant').update({
        documentId: applicantDocumentId,
        data: { interestTags: merged },
      });
    }
  },
}));

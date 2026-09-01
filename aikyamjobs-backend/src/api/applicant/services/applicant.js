'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::applicant.applicant', ({ strapi }) => ({
  /**
   * Phase-3 groundwork: after an applicant applies, fold the job's category
   * slugs into their interestTags so we can later recommend matching jobs. Pure
   * set-union of tag slugs — no AI, deterministic, cheap. Best-effort: callers
   * fire-and-forget and swallow errors so it never blocks a submission.
   */
  async addInterestFromJob(applicantId, jobId) {
    const job = await strapi.entityService.findOne('api::job.job', jobId, {
      populate: { categories: true },
    });
    const slugs = ((job && job.categories) || [])
      .map((c) => c.slug)
      .filter(Boolean);
    if (!slugs.length) return;

    const applicant = await strapi.entityService.findOne(
      'api::applicant.applicant',
      applicantId
    );
    const current = Array.isArray(applicant.interestTags) ? applicant.interestTags : [];
    const merged = Array.from(new Set([...current, ...slugs]));

    if (merged.length !== current.length) {
      await strapi.entityService.update('api::applicant.applicant', applicantId, {
        data: { interestTags: merged },
      });
    }
  },
}));

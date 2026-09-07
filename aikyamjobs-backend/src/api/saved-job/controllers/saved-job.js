'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

async function findJobBySlug(strapi, jobSlug) {
  const [job] = await strapi.entityService.findMany('api::job.job', {
    filters: { slug: jobSlug },
    fields: ['id'],
    limit: 1,
  });
  return job;
}

module.exports = createCoreController('api::saved-job.saved-job', ({ strapi }) => ({
  /**
   * Every job this applicant has bookmarked, newest first — feeds a "Saved
   * jobs" list page the same way application.mine feeds "My applications".
   */
  async mine(ctx) {
    const { applicant } = ctx.state;
    const saved = await strapi.entityService.findMany('api::saved-job.saved-job', {
      filters: { applicant: applicant.id },
      sort: { createdAt: 'desc' },
      populate: {
        job: { populate: { company: { fields: ['name'] } }, fields: ['title', 'slug'] },
      },
    });

    return {
      savedJobs: saved
        .filter((s) => s.job)
        .map((s) => ({
          jobId: s.job.id,
          jobTitle: s.job.title,
          jobSlug: s.job.slug,
          companyName: s.job.company?.name || null,
          savedAt: s.createdAt,
        })),
    };
  },

  /** Does this applicant already have this job saved — powers the heart icon's initial state. */
  async status(ctx) {
    const { applicant } = ctx.state;
    const job = await findJobBySlug(strapi, ctx.params.jobSlug);
    if (!job) return ctx.notFound();

    const existing = await strapi.db.query('api::saved-job.saved-job').findOne({
      where: { applicant: applicant.id, job: job.id },
    });
    return { saved: !!existing };
  },

  async save(ctx) {
    const { applicant } = ctx.state;
    const job = await findJobBySlug(strapi, ctx.params.jobSlug);
    if (!job) return ctx.notFound();

    const existing = await strapi.db.query('api::saved-job.saved-job').findOne({
      where: { applicant: applicant.id, job: job.id },
    });
    if (!existing) {
      await strapi.entityService.create('api::saved-job.saved-job', {
        data: { applicant: applicant.id, job: job.id },
      });
    }
    return { saved: true };
  },

  async unsave(ctx) {
    const { applicant } = ctx.state;
    const job = await findJobBySlug(strapi, ctx.params.jobSlug);
    if (!job) return ctx.notFound();

    const existing = await strapi.db.query('api::saved-job.saved-job').findOne({
      where: { applicant: applicant.id, job: job.id },
    });
    if (existing) {
      await strapi.entityService.delete('api::saved-job.saved-job', existing.id);
    }
    return { saved: false };
  },
}));

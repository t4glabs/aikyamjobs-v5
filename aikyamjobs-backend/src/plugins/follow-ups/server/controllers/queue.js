'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPT_OUT_TAG = 'no-further-followup';
const AUTO_EXPIRED_TAG = 'expired-job';

module.exports = {
  async find(ctx) {
    const siteSettings = await strapi.db.query('api::site-setting.site-setting').findOne({
      select: ['followUpThresholdDays'],
    });
    const thresholdDays = siteSettings?.followUpThresholdDays ?? 30;
    const thresholdMs = thresholdDays * DAY_MS;
    const now = Date.now();

    const draftJobs = await strapi.entityService.findMany('api::job.job', {
      filters: { publishedAt: null },
      fields: ['title', 'slug', 'closingDate', 'unpublishedAt', 'lastFollowUpAt'],
      populate: {
        company: { fields: ['name', 'slug'] },
        internalTags: { fields: ['name'] },
      },
      sort: { unpublishedAt: 'asc' },
      limit: -1,
    });

    const queue = draftJobs
      .filter((job) => job.unpublishedAt)
      .filter((job) => !(job.internalTags || []).some((tag) => tag.name === OPT_OUT_TAG))
      .map((job) => {
        const effectiveDate = job.lastFollowUpAt || job.unpublishedAt;
        const daysSinceEffective = Math.floor((now - new Date(effectiveDate).getTime()) / DAY_MS);
        return {
          id: job.id,
          title: job.title,
          slug: job.slug,
          companyName: job.company?.name || null,
          closingDate: job.closingDate,
          unpublishedAt: job.unpublishedAt,
          lastFollowUpAt: job.lastFollowUpAt,
          effectiveDate,
          daysSinceEffective,
          wasAutoExpired: (job.internalTags || []).some((tag) => tag.name === AUTO_EXPIRED_TAG),
        };
      })
      .filter((job) => now - new Date(job.effectiveDate).getTime() >= thresholdMs)
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    ctx.body = { thresholdDays, queue };
  },

  async markFollowedUp(ctx) {
    const { id } = ctx.params;

    const job = await strapi.entityService.findOne('api::job.job', id, {
      fields: ['publishedAt'],
    });

    if (!job) {
      return ctx.notFound();
    }

    if (job.publishedAt) {
      return ctx.badRequest('Job is currently published — nothing to follow up on.');
    }

    const updated = await strapi.entityService.update('api::job.job', id, {
      data: { lastFollowUpAt: new Date() },
    });

    ctx.body = { id: updated.id, lastFollowUpAt: updated.lastFollowUpAt };
  },
};

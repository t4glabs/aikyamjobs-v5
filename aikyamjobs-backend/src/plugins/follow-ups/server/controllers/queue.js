'use strict';

const { idToDocumentId } = require('../../../../utils/resolveDocumentId');

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

    // No `fields`/`sort` on unpublishedAt/lastFollowUpAt -- both are
    // `private: true`, and Strapi 5's Document Service rejects referencing a
    // private field via `fields` or `sort` even for internal server-side
    // calls. The final `.sort()` below (by effectiveDate) already fully
    // reorders the result, so dropping this DB-level sort changes nothing.
    const draftJobs = await strapi.documents('api::job.job').findMany({
      filters: { publishedAt: null },
      populate: {
        company: { fields: ['name', 'slug'] },
        internalTags: { fields: ['name'] },
      },
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

    const documentId = await idToDocumentId(strapi, 'api::job.job', id);
    if (!documentId) return ctx.notFound();

    const job = await strapi.documents('api::job.job').findOne({
      documentId,
      fields: ['publishedAt'],
    });

    if (!job) {
      return ctx.notFound();
    }

    if (job.publishedAt) {
      return ctx.badRequest('Job is currently published — nothing to follow up on.');
    }

    const updated = await strapi.documents('api::job.job').update({
      documentId,
      data: { lastFollowUpAt: new Date() },
    });

    ctx.body = { id: updated.id, lastFollowUpAt: updated.lastFollowUpAt };
  },
};

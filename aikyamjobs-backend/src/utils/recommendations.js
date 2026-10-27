'use strict';

const { getSiteSettings } = require('./siteSettings');

/**
 * Finds up to `limit` other published, gated jobs whose categories overlap
 * with the applicant's interestTags (built up across their past applications
 * — see applicant service addInterestFromJob), excluding the job they just
 * didn't match. Plain overlap count, sorted by most-overlap-then-newest —
 * deliberately no AI/embeddings here, keeps it cheap and predictable.
 */
async function findRecommendedJobs(strapi, { applicant, excludeJobId, limit = 2 }) {
  const tags = Array.isArray(applicant && applicant.interestTags) ? applicant.interestTags : [];
  if (!tags.length) return [];

  // A job is "gated" (goes through the aikyam apply flow we're steering them
  // back into) if it's explicitly gated, OR it's auto-mode while the whole site
  // is flipped to gatedEverywhere — mirror resolveApplyMode so site-wide gating
  // doesn't silently drop every auto-mode job from recommendations.
  const settings = await getSiteSettings(strapi);
  const gatedModes =
    settings?.globalApplyMode === 'gatedEverywhere' ? ['gated', 'auto'] : ['gated'];

  const candidates = await strapi.documents('api::job.job').findMany({
    filters: {
      id: { $ne: excludeJobId },
      applyMode: { $in: gatedModes },
      categories: { slug: { $in: tags } },
    },
    populate: { categories: { fields: ['slug'] } },
    sort: { createdAt: 'desc' },
    limit: 20,
  });

  const scored = candidates.map((job) => {
    const overlap = (job.categories || []).filter((c) => tags.includes(c.slug)).length;
    return { job, overlap };
  });

  scored.sort((a, b) => b.overlap - a.overlap);

  return scored.slice(0, limit).map(({ job }) => ({ title: job.title, slug: job.slug }));
}

module.exports = { findRecommendedJobs };

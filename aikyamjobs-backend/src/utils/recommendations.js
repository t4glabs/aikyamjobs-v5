'use strict';

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

  const candidates = await strapi.entityService.findMany('api::job.job', {
    filters: {
      id: { $ne: excludeJobId },
      applyMode: 'gated',
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

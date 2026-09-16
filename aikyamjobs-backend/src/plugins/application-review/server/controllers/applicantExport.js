'use strict';

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/**
 * Bulk CV export for candidate-sourcing work that's independent of any one
 * job/application — e.g. building a standalone "resourceful people" pool.
 * Scope is deliberately narrow: only applicants who've actually submitted a
 * job application or CV Improver request (real consent given at that point),
 * never a bare upload someone abandoned mid-flow. Each row is that person's
 * CURRENT CV (their freshest version), not whichever one a past application
 * happened to snapshot. No application/review data (scores, decisions, which
 * job) is included on purpose — this list is for a separate exercise.
 */
module.exports = {
  async cvExport(ctx) {
    const since = ctx.query.since ? new Date(ctx.query.since) : null;

    const applicants = await strapi.entityService.findMany('api::applicant.applicant', {
      filters: {
        currentCv: { id: { $notNull: true } },
        $or: [{ applications: { id: { $notNull: true } } }, { cvReviews: { id: { $notNull: true } } }],
      },
      populate: {
        currentCv: { populate: { file: true } },
        applications: { fields: ['submittedAt'] },
        cvReviews: { fields: ['submittedAt'] },
      },
      limit: -1,
    });

    const rows = applicants
      .map((a) => {
        const dates = [
          ...(a.applications || []).map((x) => x.submittedAt),
          ...(a.cvReviews || []).map((x) => x.submittedAt),
        ]
          .filter(Boolean)
          .map((d) => new Date(d));
        const lastActivityAt = dates.length ? new Date(Math.max(...dates)) : null;
        return { a, lastActivityAt };
      })
      .filter(({ lastActivityAt }) => !since || (lastActivityAt && lastActivityAt >= since))
      .sort((x, y) => (y.lastActivityAt || 0) - (x.lastActivityAt || 0))
      .map(({ a, lastActivityAt }) => ({
        applicantId: a.id,
        name: a.name || null,
        email: a.email,
        phone: a.phone || null,
        cvOriginalName: a.currentCv?.originalName || null,
        cvUrl: absoluteMediaUrl(a.currentCv?.file?.url),
        lastActivityAt,
      }));

    ctx.body = { count: rows.length, candidates: rows };
  },
};

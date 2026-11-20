'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { applyGateToJob, gateNestedJobs, isApplyContactOracleQuery } = require('../../../utils/apply');
const { getSiteSettings } = require('../../../utils/siteSettings');
const { toPublicTree } = require('../../../utils/mindmapTree');

/**
 * Force requirementChecklist into the populate set so we can always resolve
 * apply mode server-side, regardless of what the client asked for. Preserves
 * any populate the frontend already requested (company, categories, images).
 */
function addChecklistPopulate(ctx) {
  const q = { ...(ctx.query || {}) };
  const p = q.populate;
  if (p == null) {
    q.populate = { requirementChecklist: true };
  } else if (Array.isArray(p)) {
    q.populate = Array.from(new Set([...p, 'requirementChecklist']));
  } else if (typeof p === 'object') {
    q.populate = { ...p, requirementChecklist: true };
  }
  // populate='*' (string) already includes first-level components — leave as is.
  ctx.query = q;
}

module.exports = createCoreController('api::job.job', ({ strapi }) => ({
  // applyGateToJob handles the top-level jobs; gateNestedJobs covers jobs
  // nested under them (job -> company -> jobs, job -> categories -> jobs),
  // which used to come back with their real URLs. See utils/apply.js.
  async find(ctx) {
    if (isApplyContactOracleQuery(ctx.query)) return ctx.badRequest('Invalid query');
    addChecklistPopulate(ctx);
    const { data, meta } = await super.find(ctx);
    const settings = await getSiteSettings(strapi);
    if (Array.isArray(data)) data.forEach((d) => applyGateToJob(d, settings));
    gateNestedJobs(data);
    return { data, meta };
  },

  async findOne(ctx) {
    if (isApplyContactOracleQuery(ctx.query)) return ctx.badRequest('Invalid query');
    addChecklistPopulate(ctx);
    const res = await super.findOne(ctx);
    if (!res || !res.data) return res;
    const settings = await getSiteSettings(strapi);
    applyGateToJob(res.data, settings);
    gateNestedJobs(res.data);
    return res;
  },

  /**
   * GET /jobs/:slug/mindmap -- see routes/mindmap.js. mindmapJson is private,
   * so this is the only way the trees reach the frontend, and only in the
   * whitelisted shape toPublicTree() produces. No `fields` allowlist on
   * either query: Strapi 5's Document Service rejects selecting a private
   * field that way, even server-side.
   */
  async mindmap(ctx) {
    const { slug } = ctx.params;
    if (typeof slug !== 'string' || !slug) return ctx.badRequest('slug is required');

    const job = await strapi.documents('api::job.job').findFirst({
      filters: { slug },
      status: 'published',
      populate: { company: true },
    });
    if (!job) return ctx.notFound();

    const company = job.company || null;
    ctx.body = {
      data: {
        job: toPublicTree(job.mindmapJson),
        company: toPublicTree(company?.mindmapJson),
        companyName: company?.name || null,
      },
    };
  },
}));

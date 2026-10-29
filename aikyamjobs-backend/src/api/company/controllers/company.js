'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { gateNestedJobs } = require('../../../utils/apply');
const { toPublicTree } = require('../../../utils/mindmapTree');

/**
 * Company has an inverse `jobs` relation, so an unauthenticated request can
 * populate it directly (e.g. `?populate[jobs][populate]=*`), completely
 * bypassing the Job controller's own gating logic. Strip the sensitive
 * fields from anything that came back under `jobs`. See utils/apply.js for
 * the full story on why this exists.
 */
module.exports = createCoreController('api::company.company', ({ strapi }) => ({
  async find(ctx) {
    const res = await super.find(ctx);
    if (Array.isArray(res.data)) gateNestedJobs(res.data);
    return res;
  },

  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (res && res.data) gateNestedJobs(res.data);
    return res;
  },

  /**
   * GET /companies/:slug/mindmap -- see routes/mindmap.js. Same reasoning as
   * the job controller's mindmap(): mindmapJson is private, this is the only
   * way it reaches the frontend, and only as toPublicTree()'s whitelisted
   * shape. No `fields` allowlist (Strapi 5 rejects private fields there).
   */
  async mindmap(ctx) {
    const { slug } = ctx.params;
    if (typeof slug !== 'string' || !slug) return ctx.badRequest('slug is required');

    const company = await strapi.documents('api::company.company').findFirst({
      filters: { slug },
      status: 'published',
    });
    if (!company) return ctx.notFound();

    ctx.body = { data: { company: toPublicTree(company.mindmapJson) } };
  },
}));

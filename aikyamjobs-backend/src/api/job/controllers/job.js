'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { applyGateToJob } = require('../../../utils/apply');

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
  async find(ctx) {
    addChecklistPopulate(ctx);
    const { data, meta } = await super.find(ctx);
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    if (Array.isArray(data)) data.forEach((d) => applyGateToJob(d, settings));
    return { data, meta };
  },

  async findOne(ctx) {
    addChecklistPopulate(ctx);
    const res = await super.findOne(ctx);
    if (!res || !res.data) return res;
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    applyGateToJob(res.data, settings);
    return res;
  },
}));

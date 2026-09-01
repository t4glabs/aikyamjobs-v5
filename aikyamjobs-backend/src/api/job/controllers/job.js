'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveApplyMode } = require('../../../utils/apply');

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

/**
 * The gate: stamp attributes.resolvedApplyMode and, for gated jobs, DELETE the
 * real applicationUrl/applicationEmail from the response. This is what stops
 * the external link leaking into the API / inspect-element. The link is only
 * ever revealed later, by email, after approval.
 */
function applyGate(entry, settings) {
  if (!entry || !entry.attributes) return;
  const a = entry.attributes;
  const resolved = resolveApplyMode(a, settings);
  a.resolvedApplyMode = resolved;
  if (resolved === 'gated') {
    delete a.applicationUrl;
    delete a.applicationEmail;
  }
}

module.exports = createCoreController('api::job.job', ({ strapi }) => ({
  async find(ctx) {
    addChecklistPopulate(ctx);
    const { data, meta } = await super.find(ctx);
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    if (Array.isArray(data)) data.forEach((d) => applyGate(d, settings));
    return { data, meta };
  },

  async findOne(ctx) {
    addChecklistPopulate(ctx);
    const res = await super.findOne(ctx);
    if (!res || !res.data) return res;
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    applyGate(res.data, settings);
    return res;
  },
}));

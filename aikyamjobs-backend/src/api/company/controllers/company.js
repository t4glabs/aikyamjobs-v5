'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { gateNestedJobs } = require('../../../utils/apply');

/**
 * Company has an inverse `jobs` relation, so an unauthenticated request can
 * populate it directly (e.g. `?populate[jobs][populate]=*`), completely
 * bypassing the Job controller's own gating logic. Strip the sensitive
 * fields from anything that came back under `jobs`. See utils/apply.js for
 * the full story on why this exists.
 */
module.exports = createCoreController('api::company.company', () => ({
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
}));

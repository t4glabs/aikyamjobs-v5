'use strict';
const { createCoreRouter } = require('@strapi/strapi').factories;

// Internal tags are editorial-only (e.g. `expired-job`) and must never reach
// the public site, so no content-API routes at all. The team still manages
// them in the admin panel, and the cron + follow-ups plugin read them
// server-side through the Document Service, neither of which uses these
// routes. Until 2026-11-20 the Public role could list them at
// /api/internal-tags.
module.exports = createCoreRouter('api::internal-tag.internal-tag', { only: [] });

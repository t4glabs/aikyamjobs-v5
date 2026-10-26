'use strict';

/**
 * Strapi 5's Document Service findMany() returns an array even for a single
 * type -- confirmed live: `draftAndPublish` is off for site-setting (exactly
 * one row, no draft/published split), yet findMany() still wraps it in an
 * array. Every direct `.findMany()` call on site-setting across this
 * codebase was silently reading `undefined` off that array (array[field]
 * returns undefined rather than throwing, so nothing ever surfaced as an
 * error) instead of the real settings object. Centralizing the correct
 * access here so there's exactly one place this can go wrong again.
 */
async function getSiteSettings(strapi) {
  const rows = await strapi.documents('api::site-setting.site-setting').findMany();
  return (Array.isArray(rows) ? rows[0] : rows) || {};
}

module.exports = { getSiteSettings };

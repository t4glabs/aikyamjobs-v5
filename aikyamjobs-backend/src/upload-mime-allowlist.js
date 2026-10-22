'use strict';

/**
 * Strapi's upload plugin has no built-in MIME/extension allowlist for the
 * generic POST /api/upload endpoint -- it only checks filenames for path
 * traversal, not content type. This hooks every upload (regardless of entry
 * point: content-manager media picker, the CV-upload applicant flow, or a
 * direct API call) and rejects anything outside what this app actually uses:
 * standard raster images for logos/featureImages, and PDF/Word documents for
 * CVs (matches the frontend's own `accept=".pdf,.doc,.docx"` file pickers).
 * Notably excludes image/svg+xml and any HTML/text mime type, which Strapi's
 * upload plugin would otherwise happily store and serve back with a
 * browser-executable Content-Type -- a known stored-XSS vector for CMS
 * upload endpoints.
 *
 * Registered via strapi.db.lifecycles.subscribe() in src/index.js's
 * bootstrap -- plugin content types (plugin::upload.file) don't pick up a
 * standalone extensions lifecycles.js file the way custom api content types
 * do; Strapi's own core plugins (i18n, admin) register this way too.
 */
const { ValidationError } = require('@strapi/utils').errors;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function assertAllowedMime(event) {
  const mime = event.params?.data?.mime;
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    throw new ValidationError(`File type "${mime}" is not allowed.`);
  }
}

module.exports = function registerUploadMimeAllowlist(strapi) {
  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],
    beforeCreate: assertAllowedMime,
    beforeUpdate: assertAllowedMime,
  });
};

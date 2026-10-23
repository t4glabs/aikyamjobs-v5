'use strict';

/**
 * Our own admin-plugin routes (application-review, follow-ups) were never
 * changed to pass documentId -- they still take the numeric `:id` the admin
 * UI has always used. This resolves that numeric id to the documentId the
 * Document Service API needs, so none of the route contracts or frontend
 * admin code had to change for the v5 migration.
 */
async function idToDocumentId(strapi, uid, id) {
  if (id === undefined || id === null) return null;
  const row = await strapi.db.query(uid).findOne({ where: { id }, select: ['id', 'documentId'] });
  return row?.documentId || null;
}

module.exports = { idToDocumentId };

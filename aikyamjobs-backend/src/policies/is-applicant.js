'use strict';

const jwt = require('jsonwebtoken');
const { idToDocumentId } = require('../utils/resolveDocumentId');

// Strapi's policy context is a shallow copy of Koa's ctx (see
// createPolicyContext in @strapi/utils), which drops ctx.cookies -- it's
// defined as a non-enumerable getter on Koa's context prototype, so
// Object.assign never picks it up (confirmed by hand: policyContext.cookies
// is undefined even though it works fine in controllers). Parsing the raw
// Cookie header directly sidesteps that entirely.
function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

/**
 * Authenticates a job applicant from the JWT minted by the magic-link verify
 * endpoint. On success attaches the applicant row to ctx.state.applicant.
 * These are NOT Strapi admin/users-permissions users — they're the lightweight
 * `applicant` identities, so we verify our own token (signed with JWT_SECRET,
 * type: "applicant") rather than going through users-permissions.
 *
 * Reads the token from the httpOnly `aikyam_apply_jwt` cookie (set by
 * applicant.verify) first, falling back to a Bearer Authorization header.
 * The header fallback exists only so a browser tab left open from before the
 * cookie migration (still holding the old localStorage-based token and
 * attaching it as a header) keeps working until that tab's session naturally
 * ends — new logins only ever get the cookie.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const header = policyContext.request.header.authorization || '';
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = readCookie(policyContext.request.header.cookie, 'aikyam_apply_jwt');
  const token = cookieToken || headerToken;
  if (!token) return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || payload.type !== 'applicant' || !payload.sub) return false;

    const documentId = await idToDocumentId(strapi, 'api::applicant.applicant', payload.sub);
    if (!documentId) return false;
    const applicant = await strapi.documents('api::applicant.applicant').findOne({ documentId });
    if (!applicant) return false;

    policyContext.state.applicant = applicant;
    return true;
  } catch (err) {
    return false;
  }
};

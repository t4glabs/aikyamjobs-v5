'use strict';

const jwt = require('jsonwebtoken');

/**
 * Authenticates a job applicant from a Bearer JWT minted by the magic-link
 * verify endpoint. On success attaches the applicant row to ctx.state.applicant.
 * These are NOT Strapi admin/users-permissions users — they're the lightweight
 * `applicant` identities, so we verify our own token (signed with JWT_SECRET,
 * type: "applicant") rather than going through users-permissions.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const header = policyContext.request.header.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || payload.type !== 'applicant' || !payload.sub) return false;

    const applicant = await strapi.entityService.findOne(
      'api::applicant.applicant',
      payload.sub
    );
    if (!applicant) return false;

    policyContext.state.applicant = applicant;
    return true;
  } catch (err) {
    return false;
  }
};

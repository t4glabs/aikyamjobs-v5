'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

// Core CRUD router. Public access to these routes stays DISABLED in
// users-permissions (deny by default) — all applicant access goes through the
// custom, JWT-protected routes in routes/auth.js and routes/me.js.
module.exports = createCoreRouter('api::applicant.applicant');

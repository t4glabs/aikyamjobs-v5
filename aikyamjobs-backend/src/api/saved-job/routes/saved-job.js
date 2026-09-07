'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

// Deny-by-default core router — applicants use the JWT-protected custom
// routes below; there's no public/admin CRUD surface for this content type.
module.exports = createCoreRouter('api::saved-job.saved-job');

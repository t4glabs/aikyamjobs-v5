'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

// Deny-by-default core router. Applicants submit via the JWT-protected custom
// route (routes/submit.js); staff review applications inside the Strapi admin.
module.exports = createCoreRouter('api::application.application');

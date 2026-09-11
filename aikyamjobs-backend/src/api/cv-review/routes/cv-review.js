'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

// Deny-by-default core router. Applicants submit via the JWT-protected custom
// routes (routes/submit.js etc.); staff review through the Application
// Review admin plugin's CV Improver tab.
module.exports = createCoreRouter('api::cv-review.cv-review');

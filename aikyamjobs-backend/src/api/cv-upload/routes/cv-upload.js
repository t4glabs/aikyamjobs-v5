'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

// Deny-by-default core router. CV upload/replace happens through the
// JWT-protected custom route in the applicant api (routes/me.js).
module.exports = createCoreRouter('api::cv-upload.cv-upload');

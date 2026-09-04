'use strict';

module.exports = {
  admin: {
    type: 'admin',
    // Nginx only proxies known Strapi path prefixes (/admin, /content-manager, /api, /uploads, ...)
    // to Strapi; anything else falls through to the Next.js frontend. Mounting under /admin
    // reuses the prefix Nginx already forwards, so no server/infra config change is needed.
    prefix: '/admin/application-review',
    routes: [
      {
        method: 'GET',
        path: '/queue',
        handler: 'review.queue',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      {
        method: 'GET',
        path: '/:id',
        handler: 'review.findOne',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      {
        method: 'GET',
        path: '/:id/applicant-answers',
        handler: 'review.applicantAnswers',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      {
        method: 'POST',
        path: '/:id/decide',
        handler: 'review.decide',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
    ],
  },
};

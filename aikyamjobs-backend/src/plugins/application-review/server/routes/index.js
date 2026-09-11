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
      // CV Improver routes MUST come before the generic GET /:id below — this
      // router matches in array declaration order, not by specificity, so a
      // literal /cv-reviews registered after /:id would be silently shadowed
      // by it (confirmed: caused a 404 before this was reordered).
      {
        method: 'GET',
        path: '/cv-reviews',
        handler: 'cvReview.queue',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      {
        method: 'GET',
        path: '/cv-reviews/:id',
        handler: 'cvReview.findOne',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      {
        method: 'POST',
        path: '/cv-reviews/:id/decide',
        handler: 'cvReview.decide',
        config: { policies: ['admin::isAuthenticatedAdmin'] },
      },
      // Star candidates — lives on the Applicant, shared by both Application
      // and CV Improver Detail screens.
      {
        method: 'POST',
        path: '/applicants/:id/star',
        handler: 'applicantStar.setStar',
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

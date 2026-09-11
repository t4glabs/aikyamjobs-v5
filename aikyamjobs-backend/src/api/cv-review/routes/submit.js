'use strict';

// Applicant-authenticated submission endpoint (JWT via is-applicant policy).
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cv-improver/submit',
      handler: 'cv-review.submit',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

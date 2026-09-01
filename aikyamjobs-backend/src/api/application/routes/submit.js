'use strict';

// Applicant-authenticated submission endpoint (JWT via is-applicant policy).
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/apply/submit',
      handler: 'application.submit',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

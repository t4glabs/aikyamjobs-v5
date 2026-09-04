'use strict';

// Applicant-authenticated: check whether I already have an application for a
// given job (and its state), so the JD page can show my result instead of the
// generic apply CTA on revisit.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/status/:jobSlug',
      handler: 'application.status',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

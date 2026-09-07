'use strict';

// Applicant-authenticated: is this specific job already saved by me — powers
// the heart icon's initial filled/unfilled state.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/saved/:jobSlug',
      handler: 'saved-job.status',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

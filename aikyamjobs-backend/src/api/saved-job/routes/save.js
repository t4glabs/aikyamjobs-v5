'use strict';

// Applicant-authenticated: bookmark a job (idempotent).
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/apply/saved/:jobSlug',
      handler: 'saved-job.save',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

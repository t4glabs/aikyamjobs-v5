'use strict';

// Applicant-authenticated: list every job I've bookmarked to apply to later.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/saved',
      handler: 'saved-job.mine',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

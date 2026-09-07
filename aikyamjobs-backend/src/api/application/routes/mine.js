'use strict';

// Applicant-authenticated: list all of my own applications (across every job),
// for the "My Applications" page.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/mine',
      handler: 'application.mine',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

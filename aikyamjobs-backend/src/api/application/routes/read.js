'use strict';

// Applicant-authenticated: view the outcome of one's own reviewed application.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/apply/read/:id',
      handler: 'application.read',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

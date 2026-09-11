'use strict';

// Applicant-authenticated: view the outcome of one's own CV Improver request.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cv-improver/read/:id',
      handler: 'cv-review.read',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

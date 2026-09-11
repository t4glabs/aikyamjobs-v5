'use strict';

// Applicant-authenticated: list all of my own CV Improver requests, so the
// /cv-improver page can show history before offering a new submission.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cv-improver/mine',
      handler: 'cv-review.mine',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

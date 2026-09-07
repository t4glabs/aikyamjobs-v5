'use strict';

// Applicant-authenticated: remove a bookmark.
module.exports = {
  routes: [
    {
      method: 'DELETE',
      path: '/apply/saved/:jobSlug',
      handler: 'saved-job.unsave',
      config: { auth: false, policies: ['global::is-applicant'] },
    },
  ],
};

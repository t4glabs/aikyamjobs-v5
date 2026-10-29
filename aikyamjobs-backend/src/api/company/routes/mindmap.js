'use strict';

// Public, read-only: the sanitized mindmap tree for one published company,
// for the company page's "Organisation at a glance" view. Three path
// segments, so it never collides with the core `/companies/:id` route.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/companies/:slug/mindmap',
      handler: 'company.mindmap',
      config: { auth: false },
    },
  ],
};

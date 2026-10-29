'use strict';

// Public, read-only: the sanitized JD + company mindmap trees for one
// published job, for the JD page's interactive "Role at a glance" view.
// Three path segments, so it never collides with the core `/jobs/:id` route.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/jobs/:slug/mindmap',
      handler: 'job.mindmap',
      config: { auth: false },
    },
  ],
};

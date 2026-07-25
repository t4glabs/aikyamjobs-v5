'use strict';

module.exports = {
  admin: {
    type: 'admin',
    // Nginx only proxies known Strapi path prefixes (/admin, /content-manager, /api, /uploads, ...)
    // to Strapi; anything else falls through to the Next.js frontend. Mounting under /admin
    // reuses the prefix Nginx already forwards, so no server/infra config change is needed.
    prefix: '/admin/follow-ups',
    routes: [
      {
        method: 'GET',
        path: '/queue',
        handler: 'queue.find',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'POST',
        path: '/queue/:id/mark-followed-up',
        handler: 'queue.markFollowedUp',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
    ],
  },
};

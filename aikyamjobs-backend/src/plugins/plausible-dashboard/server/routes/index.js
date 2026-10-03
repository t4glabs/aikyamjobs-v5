'use strict';

module.exports = {
  admin: {
    type: 'admin',
    // Nginx only proxies known Strapi path prefixes (/admin, /content-manager, /api, /uploads, ...)
    // to Strapi; anything else falls through to the Next.js frontend. Mounting under /admin
    // reuses the prefix Nginx already forwards, so no server/infra config change is needed.
    prefix: '/admin/plausible-dashboard',
    routes: [
      {
        method: 'GET',
        path: '/embed-url',
        handler: 'embed.find',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
    ],
  },
};

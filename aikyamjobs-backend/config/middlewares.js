module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'dl.airtable.com'],
          'media-src': ["'self'", 'data:', 'blob:'],
          // Lets the admin panel's Analytics page iframe the Plausible shared
          // dashboard -- without this, the CSP's default-src 'self' blocks
          // any cross-origin frame outright (confirmed: browser console
          // showed a frame-src CSP violation for analytics.aikyamhq.com).
          'frame-src': ["'self'", 'https://analytics.aikyamhq.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Explicit origins (not the '*' default) so the applicant httpOnly-cookie
      // auth flow works: browsers reject credentialed cross-origin responses
      // when Access-Control-Allow-Origin is a literal '*', which is what
      // Strapi's default origin:'*' + credentials:true combination actually
      // sends. Needed cross-origin in local dev (frontend :3000/:3001, Strapi
      // :1337/:1338); in production nginx proxies both under one domain, so
      // this is same-origin there and wouldn't strictly need the list, but
      // listing it explicitly costs nothing and removes any ambiguity.
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://beta.aikyamjobs.org',
        'https://aikyamjobs.org',
      ],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '256mb',
      jsonLimit: '256mb',
      textLimit: '256mb',
      formidable: {
        maxFileSize: 200 * 1024 * 1024, // 200MB
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

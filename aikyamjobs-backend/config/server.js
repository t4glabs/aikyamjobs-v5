module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  // Trust nginx's X-Forwarded-For/X-Forwarded-Proto (the /api and /admin
  // location blocks in the production nginx config already set these
  // correctly) so ctx.request.ip reflects the real client instead of
  // nginx's own loopback address -- needed for IP-scoped rate limiting.
  proxy: true,
  app: {
    keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cron: {
    enabled: true,
    tasks: require('./cron-tasks'),
  },
});

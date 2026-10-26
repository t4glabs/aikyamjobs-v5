module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  // Trust nginx's X-Forwarded-For/X-Forwarded-Proto (the /api and /admin
  // location blocks in the production nginx config already set these
  // correctly) so ctx.request.ip reflects the real client instead of
  // nginx's own loopback address -- needed for IP-scoped rate limiting.
  //
  // Strapi 5 moved this from a flat boolean to server.proxy.koa -- the
  // underlying @strapi/core server bootstrap reads strapi.config.get
  // ('server.proxy.koa') directly, so a bare `proxy: true` (valid per the
  // TS type, which still allows `boolean | Proxy`) silently resolves to
  // undefined at runtime and Koa stops trusting the proxy headers
  // entirely. Confirmed live: this broke `ctx.secure`, which made every
  // httpOnly-cookie `Set-Cookie` call (sign-in verify, logout) think it
  // was on a plain HTTP connection and throw "Cannot send secure cookie
  // over unencrypted connection" -- the exact cause of the Internal
  // Server Error on the apply sign-in flow post-migration.
  proxy: { koa: true },
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

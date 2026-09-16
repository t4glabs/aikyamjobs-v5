'use strict';

// In-memory fixed-window limiter for the unauthenticated magic-link request
// endpoint, scoped by client IP. Single Strapi process (PM2, not clustered)
// so a plain Map is sufficient -- no Redis needed at this scale. This is a
// second layer on top of requestLink()'s per-email cooldown: that stops
// repeated hits to one target, this stops one caller spraying many distinct
// targets in a burst. Requires config/server.js's `proxy: true` so
// ctx.request.ip reflects the real client (via nginx's X-Forwarded-For)
// instead of nginx's own address.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;

const hits = new Map();

module.exports = async (policyContext) => {
  const ip = (policyContext.request.ip || '').trim() || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= MAX_REQUESTS;
};

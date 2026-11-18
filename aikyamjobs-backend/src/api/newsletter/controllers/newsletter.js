'use strict';

const dns = require('node:dns').promises;
const { verifyTurnstile } = require('../../../utils/turnstile');
const listmonkApi = require('../../../utils/listmonkApi');

/**
 * POST /api/newsletter/subscribe  { email, token, website }
 *
 * The website /subscribe form posts here instead of straight to Listmonk.
 * Every step runs before Listmonk sends a single email, so a bot can't use
 * the form to send mail to made-up or victim addresses:
 *   1. honeypot field (`website`) filled → silently dropped
 *   2. strict email format
 *   3. per-IP limit
 *   4. Cloudflare Turnstile token verified with Cloudflare
 *   5. per-address cooldown → at most one confirmation email per address per day
 *   6. hourly cap across all sign-ups → circuit breaker if Turnstile is ever beaten at scale
 *   7. the domain must have mail (MX) records
 * Only then is the address added through Listmonk's API (double opt-in).
 *
 * Limits are in memory: fine for this single PM2 process; they reset on restart.
 */

const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 5;
const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX = Number(process.env.NEWSLETTER_MAX_PER_HOUR) || 60;

const ipHits = new Map(); // ip -> { count, windowStart }
const emailLastSent = new Map(); // email -> timestamp
let globalWindow = { count: 0, windowStart: 0 };

function sweep(map, ttlMs, now, timeOf) {
  if (map.size < 5000) return;
  for (const [key, value] of map) {
    if (now - timeOf(value) > ttlMs) map.delete(key);
  }
}

function hitIp(ip, now) {
  sweep(ipHits, IP_WINDOW_MS, now, (v) => v.windowStart);
  const entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= IP_MAX;
}

function hitGlobal(now) {
  if (now - globalWindow.windowStart > GLOBAL_WINDOW_MS) globalWindow = { count: 0, windowStart: now };
  globalWindow.count += 1;
  return globalWindow.count <= GLOBAL_MAX;
}

// false only when DNS says the domain can't receive mail. Lookup failures
// (timeouts, resolver trouble) let the address through: Turnstile already ran.
async function domainAcceptsMail(domain) {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), 4000)),
    ]);
    // RFC 7505 "null MX": a single record with an empty exchange = no mail.
    return records.some((r) => r.exchange && r.exchange !== '.');
  } catch (err) {
    return !['ENOTFOUND', 'ENODATA', 'NXDOMAIN'].includes(err.code);
  }
}

function clientIp(ctx) {
  // Cloudflare sets CF-Connecting-IP to the real visitor. X-Forwarded-For
  // (behind ctx.request.ip) can be pre-filled by the client, so it's the fallback.
  return (ctx.get('CF-Connecting-IP') || ctx.request.ip || 'unknown').trim();
}

const OK = { ok: true };

module.exports = {
  async subscribe(ctx) {
    const { email: rawEmail, token, website } = ctx.request.body || {};
    const ip = clientIp(ctx);
    const log = (msg) => strapi.log.info(`[newsletter] ${msg} ip=${ip}`);

    if (website) {
      log('dropped: honeypot');
      ctx.body = OK;
      return;
    }

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return ctx.badRequest('Please enter a valid email address.');
    }

    const now = Date.now();
    if (!hitIp(ip, now)) {
      log('blocked: per-IP limit');
      ctx.status = 429;
      ctx.body = { error: { message: 'Too many attempts. Please try again in a few minutes.' } };
      return;
    }

    const human = await verifyTurnstile(token, ip);
    if (!human.ok) {
      if (human.reason === 'not-configured') strapi.log.error('[newsletter] TURNSTILE_SECRET_KEY is not set');
      log(`blocked: turnstile (${human.reason})`);
      ctx.status = 403;
      ctx.body = { error: { message: "We couldn't verify you're human. Please refresh the page and try again." } };
      return;
    }

    // Same answer whether or not a mail goes out, so the form can't be used
    // to repeatedly mail one address or to probe who is subscribed.
    const last = emailLastSent.get(email);
    if (last && now - last < EMAIL_COOLDOWN_MS) {
      log('skipped: address cooldown');
      ctx.body = OK;
      return;
    }

    if (!hitGlobal(now)) {
      strapi.log.warn(`[newsletter] hourly cap of ${GLOBAL_MAX} reached; refusing sign-ups (possible bot attack) ip=${ip}`);
      ctx.status = 429;
      ctx.body = { error: { message: 'Sign-ups are busy right now. Please try again in an hour.' } };
      return;
    }

    const domain = email.split('@')[1];
    if (!(await domainAcceptsMail(domain))) {
      log(`blocked: no mail records for ${domain}`);
      return ctx.badRequest("That email domain can't receive mail. Please check the address.");
    }

    if (!listmonkApi.isConfigured()) {
      strapi.log.error('[newsletter] LISTMONK_API_USER / LISTMONK_API_TOKEN / LISTMONK_SUBSCRIBE_LIST_ID not set');
      ctx.status = 503;
      ctx.body = { error: { message: "Subscriptions are unavailable right now. Please try again later." } };
      return;
    }

    try {
      const outcome = await listmonkApi.subscribe(email);
      emailLastSent.set(email, now);
      sweep(emailLastSent, EMAIL_COOLDOWN_MS, now, (t) => t);
      log(`ok: ${outcome} (@${domain})`);
      ctx.body = OK;
    } catch (err) {
      strapi.log.error(`[newsletter] listmonk failed for @${domain}: ${err.message}`);
      ctx.status = 502;
      ctx.body = { error: { message: "We couldn't subscribe you right now. Please try again later." } };
    }
  },
};

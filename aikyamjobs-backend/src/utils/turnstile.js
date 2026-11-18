'use strict';

/**
 * Server-side check of a Cloudflare Turnstile token. Turnstile is the
 * invisible "are you human" check on the /subscribe form: most visitors never
 * see it, and suspicious ones get one checkbox, never an image puzzle. The
 * widget alone protects nothing; the token must be verified here, and each
 * token is single-use and expires after 5 minutes.
 *
 * Fails closed: no secret configured, a missing token, or Cloudflare being
 * unreachable all count as "not verified".
 *
 * Env: TURNSTILE_SECRET_KEY (Cloudflare dashboard → Turnstile → the widget).
 * For local dev, Cloudflare's test secret 1x0000000000000000000000000000000AA
 * always passes and 2x0000000000000000000000000000000AA always fails.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'not-configured' };
  if (typeof token !== 'string' || !token || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.success === true) return { ok: true };
    return { ok: false, reason: (data['error-codes'] || []).join(',') || `http-${res.status}` };
  } catch (err) {
    return { ok: false, reason: `unreachable: ${err.message}` };
  }
}

module.exports = { verifyTurnstile };

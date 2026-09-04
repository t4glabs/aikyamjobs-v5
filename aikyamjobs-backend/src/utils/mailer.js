'use strict';

/**
 * Minimal Mailgun sender. We deliberately do NOT wire this as a Strapi email
 * provider — a direct HTTPS call keeps it dependency-free and easy to no-op
 * locally. If credentials are absent (e.g. local dev) it logs and returns
 * { skipped: true } instead of throwing, so the apply flow never breaks just
 * because email isn't configured.
 *
 * Env:
 *   MAILGUN_API_KEY   - Mailgun private API key
 *   MAILGUN_DOMAIN    - sending domain (e.g. mg.aikyamfellows.org)
 *   MAILGUN_FROM      - default From header (e.g. "aikyam jobs <no-reply@...>")
 *   MAILGUN_BASE_URL  - optional, defaults to https://api.mailgun.net (use
 *                       https://api.eu.mailgun.net for EU region)
 */

async function sendEmail({ to, subject, text, html, from, replyTo }) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';
  const sender = from || process.env.MAILGUN_FROM || `aikyam jobs <no-reply@${domain || 'localhost'}>`;

  if (!apiKey || !domain) {
    strapi.log.warn(
      `[mailer] MAILGUN not configured — skipping email "${subject}" to ${to}`
    );
    return { skipped: true };
  }

  const form = new URLSearchParams();
  form.set('from', sender);
  form.set('to', Array.isArray(to) ? to.join(',') : to);
  form.set('subject', subject);
  if (text) form.set('text', text);
  if (html) form.set('html', html);
  if (replyTo) form.set('h:Reply-To', replyTo);

  const auth = Buffer.from(`api:${apiKey}`).toString('base64');

  try {
    const res = await fetch(`${baseUrl}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      strapi.log.error(`[mailer] Mailgun ${res.status} sending "${subject}": ${body}`);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    strapi.log.error(`[mailer] send failed for "${subject}": ${err.message}`);
    return { ok: false, error: err.message };
  }
}

/**
 * The one place that decides who "the team" is for email purposes: used both
 * as the recipient of new-submission notifications and as the Reply-To on
 * every applicant-facing email, so a reply lands somewhere a person reads it
 * instead of the no-reply sending address.
 *
 * Reads exclusively from Site Settings > applicationsNotifyEmail — no
 * hardcoded fallback. If it's not configured, returns null and logs a
 * warning; callers decide how to handle that (skip sending, or just omit a
 * Reply-To), but nothing silently redirects to a specific hardcoded person.
 */
async function getNotifyEmail() {
  const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
  const email = settings && settings.applicationsNotifyEmail;
  if (!email) {
    strapi.log.warn('[mailer] Site Settings > applicationsNotifyEmail is not configured.');
    return null;
  }
  return email;
}

module.exports = { sendEmail, getNotifyEmail };

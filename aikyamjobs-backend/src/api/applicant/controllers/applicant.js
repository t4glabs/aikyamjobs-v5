'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../../utils/mailer');

const TOKEN_TTL_MIN = 20;
const JWT_TTL = '30d';

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';
const FRONTEND_URL = process.env.SITE_URL || 'http://localhost:3001';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

function absoluteMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${STRAPI_PUBLIC_URL}${url}`;
}

module.exports = createCoreController('api::applicant.applicant', ({ strapi }) => ({
  /**
   * Step 1 of magic-link: create/find the applicant by email, stash a hashed
   * one-time token, and email the sign-in link. Always returns { ok: true }
   * regardless of whether the email existed (no account enumeration). The link
   * is also logged so local dev works without Mailgun configured.
   */
  async requestLink(ctx) {
    const { email, name, redirect } = ctx.request.body || {};
    if (!email || !EMAIL_RE.test(email)) return ctx.badRequest('A valid email is required');

    const normEmail = String(email).trim().toLowerCase();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60000);

    let applicant = await strapi.db
      .query('api::applicant.applicant')
      .findOne({ where: { email: normEmail } });

    if (!applicant) {
      await strapi.entityService.create('api::applicant.applicant', {
        data: {
          email: normEmail,
          name: name || null,
          magicTokenHash: tokenHash,
          magicTokenExpiresAt: expiresAt,
        },
      });
    } else {
      await strapi.entityService.update('api::applicant.applicant', applicant.id, {
        data: {
          magicTokenHash: tokenHash,
          magicTokenExpiresAt: expiresAt,
          ...(name && !applicant.name ? { name } : {}),
        },
      });
    }

    // Carry a safe relative return path so the link works cross-device (email
    // opened on a phone): only same-origin paths, never an absolute/protocol URL.
    let redirectPart = '';
    if (
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//')
    ) {
      redirectPart = `&redirect=${encodeURIComponent(redirect)}`;
    }

    const link = `${FRONTEND_URL}/apply/verify?email=${encodeURIComponent(
      normEmail
    )}&token=${rawToken}${redirectPart}`;

    strapi.log.info(`[apply] magic link for ${normEmail}: ${link}`);

    await sendEmail({
      to: normEmail,
      subject: 'Your aikyamjobs sign-in link',
      text: `Continue your application on aikyamjobs:\n\n${link}\n\nThis link expires in ${TOKEN_TTL_MIN} minutes. If you didn't request it, you can ignore this email.`,
      html: `<p>Continue your application on <strong>aikyamjobs</strong>:</p><p><a href="${link}">${link}</a></p><p style="color:#666;font-size:13px">This link expires in ${TOKEN_TTL_MIN} minutes. If you didn't request it, you can ignore this email.</p>`,
    });

    return { ok: true };
  },

  /**
   * Step 2 of magic-link: validate the token, clear it (single use), stamp
   * lastLoginAt, and mint a 30-day applicant JWT.
   */
  async verify(ctx) {
    const { email, token } = ctx.request.body || {};
    if (!email || !token) return ctx.badRequest('email and token are required');

    const normEmail = String(email).trim().toLowerCase();
    const applicant = await strapi.db
      .query('api::applicant.applicant')
      .findOne({ where: { email: normEmail } });

    if (!applicant || !applicant.magicTokenHash || !applicant.magicTokenExpiresAt) {
      return ctx.unauthorized('Invalid or expired link');
    }
    if (new Date(applicant.magicTokenExpiresAt).getTime() < Date.now()) {
      return ctx.unauthorized('This link has expired. Please request a new one.');
    }
    if (hashToken(token) !== applicant.magicTokenHash) {
      return ctx.unauthorized('Invalid link');
    }

    await strapi.entityService.update('api::applicant.applicant', applicant.id, {
      data: { magicTokenHash: null, magicTokenExpiresAt: null, lastLoginAt: new Date() },
    });

    const jwtToken = jwt.sign(
      { sub: applicant.id, type: 'applicant' },
      process.env.JWT_SECRET,
      { expiresIn: JWT_TTL }
    );

    return {
      jwt: jwtToken,
      applicant: { id: applicant.id, email: applicant.email, name: applicant.name },
    };
  },

  /** Current applicant profile + CV-on-file (drives the "no re-upload" UX). */
  async me(ctx) {
    const { applicant } = ctx.state;
    const full = await strapi.entityService.findOne(
      'api::applicant.applicant',
      applicant.id,
      { populate: { currentCv: { populate: { file: true } } } }
    );

    const cv = full.currentCv;
    return {
      id: full.id,
      email: full.email,
      name: full.name,
      phone: full.phone,
      currentCv: cv
        ? {
            id: cv.id,
            originalName: cv.originalName,
            uploadedAt: cv.uploadedAt,
            url: absoluteMediaUrl(cv.file && cv.file.url),
          }
        : null,
    };
  },

  /** Upload or replace the applicant's CV (rate-limit logic in cv-upload svc). */
  async uploadCv(ctx) {
    const { applicant } = ctx.state;
    const files = ctx.request.files || {};
    const file = files.file || files.cv || Object.values(files)[0];
    if (!file) return ctx.badRequest('No file uploaded (expected field "file")');

    const result = await strapi
      .service('api::cv-upload.cv-upload')
      .recordUpload(applicant.id, file);

    return result;
  },
}));

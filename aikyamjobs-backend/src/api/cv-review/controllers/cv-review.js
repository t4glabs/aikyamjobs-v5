'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { sendEmail, getNotifyEmail } = require('../../../utils/mailer');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/**
 * Emails the review team that a new CV Improver request came in — the general,
 * not-tied-to-any-job counterpart of application.js's notifySummary(). Deep
 * links into the Application Review admin plugin's CV Improver tab.
 */
async function notifyCvReviewSubmission({ applicant, cvReview, cvUrl }) {
  const to = await getNotifyEmail();
  if (!to) {
    strapi.log.warn('[cv-improver] skipping new-submission notification: no notify email configured');
    return;
  }

  const adminLink = `${STRAPI_PUBLIC_URL}/admin/application-review?tab=cv-reviews&id=${cvReview.id}`;

  const lines = [
    'New CV Improver request (not tied to any specific job)',
    '',
    `Applicant:  ${applicant.name || '—'} <${applicant.email}>`,
    `Targeting:  ${cvReview.targetRoles}`,
    '',
    `CV: ${cvUrl || '—'}`,
    '',
    `Review in admin: ${adminLink}`,
  ];

  await sendEmail({
    to,
    replyTo: applicant.email,
    subject: `New CV Improver request: ${applicant.email}`,
    text: lines.join('\n'),
  });
}

module.exports = createCoreController('api::cv-review.cv-review', ({ strapi }) => ({
  /**
   * Submit a general CV Improver request. Requires a CV on file and consent.
   * Only one pending (not yet reviewed) request per applicant at a time —
   * unlike job applications there's no natural per-job dedup key, so the rule
   * is simply "wait for the current one before sending another."
   */
  async submit(ctx) {
    const { applicant } = ctx.state;
    const { targetRoles, consent } = ctx.request.body || {};

    if (consent !== true) return ctx.badRequest('Consent is required.');
    if (!targetRoles || !targetRoles.trim()) {
      return ctx.badRequest('Please describe what roles or domains you are targeting.');
    }

    const full = await strapi.entityService.findOne('api::applicant.applicant', applicant.id, {
      populate: { currentCv: { populate: { file: true } } },
    });
    if (!full.currentCv) {
      return ctx.badRequest('Please upload your CV before requesting feedback.');
    }

    const pending = await strapi.db.query('api::cv-review.cv-review').findOne({
      where: { applicant: applicant.id, status: 'submitted' },
    });
    if (pending) {
      ctx.status = 409;
      ctx.body = {
        error: {
          status: 409,
          name: 'Conflict',
          message: 'You already have a CV Improver request with us. We will get back to you before you can send another.',
        },
      };
      return;
    }

    const cvReview = await strapi.entityService.create('api::cv-review.cv-review', {
      data: {
        applicant: applicant.id,
        cvUsed: full.currentCv.id,
        targetRoles: targetRoles.trim(),
        consent: true,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });

    notifyCvReviewSubmission({
      applicant: full,
      cvReview,
      cvUrl: absoluteMediaUrl(full.currentCv.file && full.currentCv.file.url),
    }).catch((err) => strapi.log.error('[cv-improver] notify failed', err));

    return { ok: true, id: cvReview.id, status: 'submitted' };
  },

  /**
   * The applicant's own result page. Only the applicant who submitted it can
   * view it; before review, returns pending rather than an error so the
   * frontend can show a friendly waiting state.
   */
  async read(ctx) {
    const { applicant } = ctx.state;
    const cvReview = await strapi.entityService.findOne('api::cv-review.cv-review', ctx.params.id, {
      populate: { applicant: true },
    });

    if (!cvReview || cvReview.applicant?.id !== applicant.id) {
      return ctx.notFound();
    }

    if (cvReview.status !== 'reviewed') {
      return { status: 'pending', targetRoles: cvReview.targetRoles, submittedAt: cvReview.submittedAt };
    }

    return {
      status: 'reviewed',
      targetRoles: cvReview.targetRoles,
      leadWithThese: cvReview.leadWithThese || null,
      fixBeforeSending: cvReview.fixBeforeSending || null,
      submittedAt: cvReview.submittedAt,
      reviewedAt: cvReview.reviewedAt,
    };
  },

  /**
   * "My CV Improver history" — every request this applicant has ever sent,
   * newest first. Lets the /cv-improver page show history before offering a
   * new submission, and tells the frontend whether one is still pending.
   */
  async mine(ctx) {
    const { applicant } = ctx.state;
    const reviews = await strapi.entityService.findMany('api::cv-review.cv-review', {
      filters: { applicant: applicant.id },
      sort: { submittedAt: 'desc' },
    });

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        targetRoles: r.targetRoles,
        status: r.status,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
      })),
    };
  },
}));

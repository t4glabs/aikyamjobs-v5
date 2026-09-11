'use strict';

const { sendCvReviewEmail } = require('../../../../utils/cvReviewEmail');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

async function loadFull(id) {
  return strapi.entityService.findOne('api::cv-review.cv-review', id, {
    populate: {
      applicant: true,
      cvUsed: { populate: { file: true } },
      reviewedBy: true,
    },
  });
}

module.exports = {
  /**
   * The CV Improver queue. Defaults to pending (not yet reviewed); pass
   * ?status=reviewed|all to look back at past feedback.
   */
  async queue(ctx) {
    const status = ctx.query.status || 'pending';
    const filters = status === 'all' ? {} : status === 'pending' ? { status: 'submitted' } : { status };

    const reviews = await strapi.entityService.findMany('api::cv-review.cv-review', {
      filters,
      populate: { applicant: { fields: ['name', 'email', 'isStarCandidate'] } },
      sort: { submittedAt: 'asc' },
      limit: -1,
    });

    ctx.body = {
      queue: reviews.map((r) => ({
        id: r.id,
        status: r.status,
        applicantName: r.applicant?.name || null,
        applicantEmail: r.applicant?.email || '(deleted applicant)',
        isStarCandidate: !!r.applicant?.isStarCandidate,
        targetRoles: r.targetRoles,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
      })),
    };
  },

  async findOne(ctx) {
    const r = await loadFull(ctx.params.id);
    if (!r) return ctx.notFound();

    ctx.body = {
      id: r.id,
      status: r.status,
      targetRoles: r.targetRoles,
      submittedAt: r.submittedAt,
      consent: r.consent,
      applicant: {
        id: r.applicant?.id,
        name: r.applicant?.name || null,
        email: r.applicant?.email,
        isStarCandidate: !!r.applicant?.isStarCandidate,
        starCandidateNote: r.applicant?.starCandidateNote || null,
        starCandidateMarkedByAdminEmail: r.applicant?.starCandidateMarkedByAdminEmail || null,
        starCandidateMarkedAt: r.applicant?.starCandidateMarkedAt || null,
      },
      cv: r.cvUsed
        ? {
            originalName: r.cvUsed.originalName,
            url: absoluteMediaUrl(r.cvUsed.file?.url),
          }
        : null,
      leadWithThese: r.leadWithThese || '',
      fixBeforeSending: r.fixBeforeSending || '',
      reviewedAt: r.reviewedAt,
      decisionEmailSent: r.decisionEmailSent,
      decisionByAdminEmail: r.decisionByAdminEmail,
    };
  },

  /**
   * Save feedback and mark reviewed. No verdict/score here — just the two
   * notes fields, same vocabulary as the job-application queue (leadWithThese
   * / fixBeforeSending) so it's familiar to reviewers who already use that
   * one. Sending the email is gated by Site Settings > autoSendCvReviewEmails
   * (default OFF), independent of the job-application email toggle.
   */
  async decide(ctx) {
    const { leadWithThese, fixBeforeSending } = ctx.request.body || {};

    const r = await loadFull(ctx.params.id);
    if (!r) return ctx.notFound();

    const updated = await strapi.entityService.update('api::cv-review.cv-review', r.id, {
      data: {
        status: 'reviewed',
        leadWithThese: leadWithThese || null,
        fixBeforeSending: fixBeforeSending || null,
        decisionByAdminEmail: ctx.state.user?.email || null,
        reviewedAt: new Date(),
      },
    });

    let emailSent = false;
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    if (settings?.autoSendCvReviewEmails) {
      try {
        await sendCvReviewEmail({
          cvReview: updated,
          applicant: r.applicant,
          reviewerFirstName: ctx.state.user?.firstname || null,
        });
        emailSent = true;
        await strapi.entityService.update('api::cv-review.cv-review', r.id, {
          data: { decisionEmailSent: true },
        });
      } catch (err) {
        strapi.log.error('[application-review] cv-review email failed', err);
      }
    }

    ctx.body = {
      ok: true,
      emailSent,
      autoSendEnabled: !!settings?.autoSendCvReviewEmails,
    };
  },
};

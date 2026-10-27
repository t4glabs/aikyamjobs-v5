'use strict';

const { sendCvReviewEmail } = require('../../../../utils/cvReviewEmail');
const { idToDocumentId } = require('../../../../utils/resolveDocumentId');
const { getSiteSettings } = require('../../../../utils/siteSettings');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

async function loadFull(id) {
  const documentId = await idToDocumentId(strapi, 'api::cv-review.cv-review', id);
  if (!documentId) return null;
  return strapi.documents('api::cv-review.cv-review').findOne({
    documentId,

    populate: {
      applicant: { populate: { cvMindmapPdf: true } },
      cvUsed: { populate: { file: true } },
      reviewedBy: true,
    },
  });
}

module.exports = {
  /**
   * The CV Improver queue. Defaults to pending (not yet reviewed); pass
   * ?status=reviewed|all to look back at past feedback.
   *
   * Newest-submitted first (see review.queue's comment for why this changed
   * from oldest-first, and why pagination exists now). ?page=1&pageSize=20
   * control pagination; defaults match that.
   */
  async queue(ctx) {
    const status = ctx.query.status || 'pending';
    const filters = status === 'all' ? {} : status === 'pending' ? { status: 'submitted' } : { status };

    const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(ctx.query.pageSize, 10) || 20);

    const [reviews, total] = await Promise.all([
      strapi.documents('api::cv-review.cv-review').findMany({
        filters,
        // No `fields` allowlist -- cvMindmapJson is `private: true`, and
        // Strapi 5's Document Service rejects explicitly selecting a private
        // field via `fields` even for internal server-side calls.
        populate: { applicant: true },
        sort: { submittedAt: 'desc' },
        start: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.documents('api::cv-review.cv-review').count({ filters }),
    ]);

    ctx.body = {
      queue: reviews.map((r) => ({
        id: r.id,
        status: r.status,
        applicantName: r.applicant?.name || null,
        applicantEmail: r.applicant?.email || '(deleted applicant)',
        isStarCandidate: !!r.applicant?.isStarCandidate,
        hasCvMindmap: !!r.applicant?.cvMindmapJson,
        targetRoles: r.targetRoles,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
      })),
      pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
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
        cvMindmapJson: r.applicant?.cvMindmapJson || null,
        cvMindmapPdf: r.applicant?.cvMindmapPdf
          ? { url: absoluteMediaUrl(r.applicant.cvMindmapPdf.url) }
          : null,
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
    // Route policy (admin::isAuthenticatedAdmin) already gates entry, so this
    // should be unreachable -- but without it, a missing ctx.state.user would
    // silently write decisionByAdminEmail: null instead of failing, losing
    // the audit trail for who made the decision.
    if (!ctx.state.user) return ctx.forbidden();

    const { leadWithThese, fixBeforeSending } = ctx.request.body || {};

    const r = await loadFull(ctx.params.id);
    if (!r) return ctx.notFound();

    const updated = await strapi.documents('api::cv-review.cv-review').update({
      documentId: r.documentId,

      data: {
        status: 'reviewed',
        leadWithThese: leadWithThese || null,
        fixBeforeSending: fixBeforeSending || null,
        decisionByAdminEmail: ctx.state.user?.email || null,
        reviewedAt: new Date(),
        // Reset on every decision so re-reviewing can't inherit a stale
        // "already emailed" flag; set back to true below only if this
        // review's email actually goes out.
        decisionEmailSent: false,
      }
    });

    let emailSent = false;
    const settings = await getSiteSettings(strapi);
    if (settings?.autoSendCvReviewEmails) {
      try {
        await sendCvReviewEmail({
          cvReview: updated,
          applicant: r.applicant,
          reviewerFirstName: ctx.state.user?.firstname || null,
          reviewerEmail: ctx.state.user?.email || null,
        });
        emailSent = true;
        await strapi.documents('api::cv-review.cv-review').update({
          documentId: r.documentId,
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

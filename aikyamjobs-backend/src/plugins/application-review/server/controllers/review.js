'use strict';

const { scoreChecklist } = require('../../../../utils/apply');
const { sendDecisionEmail } = require('../../../../utils/decisionEmail');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';
const DECIDABLE_STATUSES = ['approved', 'rejected_with_tips'];
const PENDING_STATUSES = ['submitted', 'under_review'];

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

async function loadFull(id) {
  return strapi.entityService.findOne('api::application.application', id, {
    populate: {
      job: { populate: { requirementChecklist: true, company: { fields: ['name'] } } },
      applicant: true,
      cvUsed: { populate: { file: true } },
      decisionBy: true,
    },
  });
}

module.exports = {
  /**
   * The review queue. Defaults to what's pending (not yet decided); pass
   * ?status=approved|rejected_with_tips|rejected|all to look back at past
   * decisions — reviewers can reopen and correct a decision, so this isn't a
   * one-way queue.
   */
  async queue(ctx) {
    const status = ctx.query.status || 'pending';
    const filters =
      status === 'all' ? {} : status === 'pending' ? { status: { $in: PENDING_STATUSES } } : { status };

    const applications = await strapi.entityService.findMany('api::application.application', {
      filters,
      populate: {
        job: { fields: ['title'], populate: { company: { fields: ['name'] } } },
        applicant: { fields: ['name', 'email'] },
      },
      sort: { submittedAt: 'asc' },
      limit: -1,
    });

    ctx.body = {
      queue: applications.map((a) => ({
        id: a.id,
        status: a.status,
        jobTitle: a.job?.title || '(deleted job)',
        companyName: a.job?.company?.name || null,
        applicantName: a.applicant?.name || null,
        applicantEmail: a.applicant?.email || '(deleted applicant)',
        checklistPercent: a.checklistPercent,
        hasRequiredMissing: !!(a.checklistAnswers?.requiredMissing?.length),
        submittedAt: a.submittedAt,
        decisionAt: a.decisionAt,
      })),
    };
  },

  /**
   * Detail view for one application. While undecided, deliberately omits the
   * applicant's PER-ITEM self-score (checklistAnswers.items) — only the
   * aggregate score/max/percent numbers are included. This is the
   * anti-anchoring guard: the reviewer forms their own read of the CV first;
   * the itemised comparison only unlocks via applicantAnswers() below, or
   * automatically once a decision already exists (nothing left to anchor).
   */
  async findOne(ctx) {
    const app = await loadFull(ctx.params.id);
    if (!app) return ctx.notFound();

    const decided = !!app.decisionAt;

    ctx.body = {
      id: app.id,
      status: app.status,
      submittedAt: app.submittedAt,
      consent: app.consent,
      previousDecisionSummary: app.previousDecisionSummary || null,
      job: {
        id: app.job?.id,
        title: app.job?.title,
        companyName: app.job?.company?.name || null,
        requirementChecklist: (app.job?.requirementChecklist || []).map((i) => ({
          label: i.label,
          required: i.required,
          weight: i.weight,
        })),
        applicationUrl: app.job?.applicationUrl || null,
        applicationEmail: app.job?.applicationEmail || null,
      },
      applicant: {
        id: app.applicant?.id,
        name: app.applicant?.name || null,
        email: app.applicant?.email,
      },
      cv: app.cvUsed
        ? {
            originalName: app.cvUsed.originalName,
            url: absoluteMediaUrl(app.cvUsed.file?.url),
          }
        : null,
      applicantChecklist: {
        score: app.checklistScore,
        max: app.checklistMax,
        percent: app.checklistPercent,
        requiredMissing: app.checklistAnswers?.requiredMissing || [],
        // Per-item ticks only included once already decided — see comment above.
        items: decided ? app.checklistAnswers?.items || null : null,
      },
      decision: decided
        ? {
            decisionAt: app.decisionAt,
            decisionByAdminEmail: app.decisionByAdminEmail,
            reviewerChecklist: app.reviewerChecklistAnswers,
            reviewerScore: app.reviewerScore,
            reviewerMax: app.reviewerMax,
            reviewerPercent: app.reviewerPercent,
            leadWithThese: app.leadWithThese,
            fixBeforeSending: app.fixBeforeSending,
            decisionEmailSent: app.decisionEmailSent,
          }
        : null,
    };
  },

  /** The reveal step: the applicant's itemised self-score, on demand. */
  async applicantAnswers(ctx) {
    const app = await strapi.entityService.findOne('api::application.application', ctx.params.id, {
      fields: ['checklistAnswers'],
    });
    if (!app) return ctx.notFound();
    ctx.body = { items: app.checklistAnswers?.items || [] };
  },

  /**
   * Record a decision. Always recomputes the reviewer's score server-side
   * from their raw ticks (never trusts a client-sent score), using the exact
   * same scoreChecklist function the applicant side already uses — one
   * scoring algorithm in the whole codebase, not two that could drift apart.
   *
   * Sending the outcome email is gated by Site Settings > autoSendDecisionEmails
   * (default OFF). Either way the decision itself is always saved, so nothing
   * is lost by trialling this with sending switched off.
   */
  async decide(ctx) {
    const { reviewerChecked, leadWithThese, fixBeforeSending, decisionNote, decision } =
      ctx.request.body || {};

    if (!DECIDABLE_STATUSES.includes(decision)) {
      return ctx.badRequest('decision must be "approved" or "rejected_with_tips"');
    }

    const app = await loadFull(ctx.params.id);
    if (!app) return ctx.notFound();

    const checklist = app.job?.requirementChecklist || [];
    const snapshot = scoreChecklist(checklist, reviewerChecked);

    const updated = await strapi.entityService.update('api::application.application', app.id, {
      data: {
        status: decision,
        reviewerChecklistAnswers: snapshot,
        reviewerScore: snapshot.score,
        reviewerMax: snapshot.max,
        reviewerPercent: snapshot.percent,
        leadWithThese: leadWithThese || null,
        fixBeforeSending: fixBeforeSending || null,
        decisionNote: decisionNote || null,
        decisionByAdminEmail: ctx.state.user?.email || null,
        decisionAt: new Date(),
      },
    });

    let emailSent = false;
    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    if (settings?.autoSendDecisionEmails) {
      try {
        await sendDecisionEmail({
          application: updated,
          job: app.job,
          applicant: app.applicant,
          reviewerFirstName: ctx.state.user?.firstname || null,
        });
        emailSent = true;
        await strapi.entityService.update('api::application.application', app.id, {
          data: { decisionEmailSent: true },
        });
      } catch (err) {
        strapi.log.error('[application-review] decision email failed', err);
      }
    }

    ctx.body = {
      ok: true,
      status: updated.status,
      reviewerScore: snapshot.score,
      reviewerMax: snapshot.max,
      reviewerPercent: snapshot.percent,
      emailSent,
      autoSendEnabled: !!settings?.autoSendDecisionEmails,
    };
  },
};

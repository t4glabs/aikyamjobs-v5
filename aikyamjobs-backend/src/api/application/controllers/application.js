'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveApplyMode, scoreChecklist } = require('../../../utils/apply');
const { sendEmail, getNotifyEmail } = require('../../../utils/mailer');
const { findRecommendedJobs } = require('../../../utils/recommendations');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/** One-line context for the reviewer when an applicant retries after a decision. */
function buildPreviousSummary(existing) {
  const when = existing.decisionAt
    ? new Date(existing.decisionAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'earlier';
  const outcome = existing.status === 'approved' ? 'approved' : 'not a match';
  const notes = existing.fixBeforeSending || existing.leadWithThese || '';
  return `Previous attempt (${when}): ${outcome}.${notes ? ` ${notes}` : ''}`;
}

/**
 * Emails the review team a self-contained summary of a new submission: who,
 * which job, the deterministic checklist score, which items they ticked, any
 * required items they DIDN'T tick (the red flags), and a direct CV link. This
 * is the "analytics in the inbox" the team reviews before deciding. No AI.
 */
async function notifySummary({ job, applicant, snapshot, application, cvUrl, isRetry }) {
  const to = await getNotifyEmail();

  const ticked = snapshot.items.filter((i) => i.checked).map((i) => `  ✓ ${i.label}`);
  const missed = snapshot.items
    .filter((i) => !i.checked)
    .map((i) => `  ✗ ${i.label}${i.required ? '  (REQUIRED)' : ''}`);
  // Deep-links straight into the Application Review console (not raw
  // content-manager) — index.js reads ?id= on mount and opens that record.
  const adminLink = `${STRAPI_PUBLIC_URL}/admin/application-review?id=${application.id}`;

  const lines = [
    isRetry ? `Reapplication through aikyamjobs (previous attempt wasn't a match)` : `New application through aikyamjobs`,
    ``,
    `Job:        ${job.title}`,
    `Applicant:  ${applicant.name || '—'} <${applicant.email}>`,
    `Score:      ${snapshot.score}/${snapshot.max}  (${snapshot.percent}%)`,
    snapshot.requiredMissing.length
      ? `⚠ Missing REQUIRED: ${snapshot.requiredMissing.join(', ')}`
      : `✓ All required items ticked`,
    ``,
    `Self-assessment:`,
    ...ticked,
    ...missed,
    ``,
    `CV: ${cvUrl || '—'}`,
    ``,
    `Review in admin: ${adminLink}`,
  ];

  await sendEmail({
    to,
    replyTo: applicant.email,
    subject: `${isRetry ? 'Reapplied' : 'New application'}: ${applicant.email} → ${job.title} (${snapshot.percent}%)`,
    text: lines.join('\n'),
  });
}

module.exports = createCoreController('api::application.application', ({ strapi }) => ({
  /**
   * Submit a gated application. Validates consent, that the job actually
   * resolves to gated, that a CV is on file, and that this applicant hasn't
   * already applied to this job (server-side dedupe — the real enforcement).
   * Stores a self-contained checklist snapshot + deterministic score.
   */
  async submit(ctx) {
    const { applicant } = ctx.state;
    const { jobId, jobSlug, checked, consent, answers } = ctx.request.body || {};

    if (consent !== true) return ctx.badRequest('Consent is required to apply.');

    let job;
    if (jobId) {
      job = await strapi.entityService.findOne('api::job.job', jobId, {
        populate: { requirementChecklist: true },
      });
    } else if (jobSlug) {
      const [j] = await strapi.entityService.findMany('api::job.job', {
        filters: { slug: jobSlug },
        populate: { requirementChecklist: true },
        limit: 1,
      });
      job = j;
    }
    if (!job) return ctx.notFound('Job not found');

    const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
    if (resolveApplyMode(job, settings) !== 'gated') {
      return ctx.badRequest('This job is not accepting applications through aikyamjobs.');
    }

    const full = await strapi.entityService.findOne(
      'api::applicant.applicant',
      applicant.id,
      { populate: { currentCv: { populate: { file: true } } } }
    );
    if (!full.currentCv) {
      return ctx.badRequest('Please upload your CV before applying.');
    }

    const existing = await strapi.db.query('api::application.application').findOne({
      where: { applicant: applicant.id, job: job.id },
    });

    let isRetry = false;
    let previousDecisionSummary = null;

    if (existing) {
      const isFinalNegative =
        existing.decisionAt && ['rejected_with_tips', 'rejected'].includes(existing.status);

      if (!isFinalNegative) {
        // Still pending review, or already approved — no legitimate reason to resubmit.
        ctx.status = 409;
        ctx.body = {
          error: {
            status: 409,
            name: 'Conflict',
            message: 'You have already applied to this role with aikyamjobs.',
          },
        };
        return;
      }

      const settingsForRetry = await strapi.entityService.findMany('api::site-setting.site-setting');
      if (!settingsForRetry?.allowReapplyAfterRejection) {
        ctx.status = 409;
        ctx.body = {
          error: {
            status: 409,
            name: 'Conflict',
            message: 'Reapplying to this role isn’t open right now.',
          },
        };
        return;
      }

      isRetry = true;
      previousDecisionSummary = buildPreviousSummary(existing);
    }

    const snapshot = scoreChecklist(job.requirementChecklist, checked);

    const data = {
      applicant: applicant.id,
      job: job.id,
      status: 'submitted',
      checklistAnswers: { ...snapshot, freeText: answers || null },
      checklistScore: snapshot.score,
      checklistMax: snapshot.max,
      checklistPercent: snapshot.percent,
      consent: true,
      cvUsed: full.currentCv.id,
      submittedAt: new Date(),
    };

    let application;
    if (isRetry) {
      // Reset the same record in place — clears the prior decision so it goes
      // back through review fresh, but keeps a one-line note of what happened
      // last time for the reviewer's context.
      data.previousDecisionSummary = previousDecisionSummary;
      data.reviewerChecklistAnswers = null;
      data.reviewerScore = null;
      data.reviewerMax = null;
      data.reviewerPercent = null;
      data.leadWithThese = null;
      data.fixBeforeSending = null;
      data.decisionNote = null;
      data.decisionBy = null;
      data.decisionByAdminEmail = null;
      data.decisionEmailSent = false;
      data.decisionAt = null;
      application = await strapi.entityService.update('api::application.application', existing.id, {
        data,
      });
    } else {
      application = await strapi.entityService.create('api::application.application', { data });
    }

    // Phase-3 groundwork: learn interest tags (best effort, non-blocking).
    strapi
      .service('api::applicant.applicant')
      .addInterestFromJob(applicant.id, job.id)
      .catch((err) => strapi.log.error('[apply] interest learn failed', err));

    // Notify the review team (best effort, non-blocking).
    notifySummary({
      job,
      applicant: full,
      snapshot,
      application,
      cvUrl: absoluteMediaUrl(full.currentCv.file && full.currentCv.file.url),
      isRetry,
    }).catch((err) => strapi.log.error('[apply] summary email failed', err));

    return { ok: true, applicationId: application.id, status: 'submitted' };
  },

  /**
   * The applicant's own results page. Only the applicant who submitted it can
   * view it (enforced below, not just by the is-applicant policy), and only
   * once a reviewer has decided — before that it returns { status: 'pending' }
   * rather than an error, so the frontend can show a friendly waiting state.
   *
   * The real external apply link is only ever included here, for the first
   * time, when status is "approved" — this is the sole place it's revealed to
   * the applicant after being stripped from the public job API all along.
   */
  async read(ctx) {
    const { applicant } = ctx.state;
    const application = await strapi.entityService.findOne('api::application.application', ctx.params.id, {
      populate: {
        applicant: true,
        job: { populate: { company: { fields: ['name'] } }, fields: ['title', 'slug', 'applicationUrl', 'applicationEmail'] },
      },
    });

    if (!application || application.applicant?.id !== applicant.id) {
      return ctx.notFound();
    }

    if (!application.decisionAt) {
      return { status: 'pending' };
    }

    const isApproved = application.status === 'approved';

    const reviewerItems = application.reviewerChecklistAnswers?.items || [];
    const applicantByLabel = new Map(
      (application.checklistAnswers?.items || []).map((i) => [i.label, i.checked])
    );
    const items = reviewerItems.map((item) => ({
      label: item.label,
      required: item.required,
      weight: item.weight,
      reviewerChecked: item.checked,
      applicantChecked: applicantByLabel.has(item.label) ? applicantByLabel.get(item.label) : null,
    }));

    let recommendations = [];
    const isFinalNegative = ['rejected_with_tips', 'rejected'].includes(application.status);
    if (isFinalNegative) {
      recommendations = await findRecommendedJobs(strapi, {
        applicant,
        excludeJobId: application.job.id,
        limit: 2,
      }).catch(() => []);
    }

    let canReapply = false;
    if (isFinalNegative) {
      const settings = await strapi.entityService.findMany('api::site-setting.site-setting');
      canReapply = !!settings?.allowReapplyAfterRejection;
    }

    return {
      status: application.status,
      jobTitle: application.job.title,
      jobSlug: application.job.slug,
      companyName: application.job.company?.name || null,
      decisionAt: application.decisionAt,
      reviewerScore: application.reviewerScore,
      reviewerMax: application.reviewerMax,
      reviewerPercent: application.reviewerPercent,
      items,
      leadWithThese: application.leadWithThese || null,
      fixBeforeSending: application.fixBeforeSending || null,
      applyTarget: isApproved
        ? {
            url: application.job.applicationUrl || null,
            email: application.job.applicationEmail || null,
          }
        : null,
      recommendations,
      canReapply,
    };
  },

  /**
   * Lightweight check the JD page's status widget uses: does this applicant
   * already have an application for this job, and what's its state. Powers
   * showing "view your result" instead of the generic apply CTA on revisit.
   */
  async status(ctx) {
    const { applicant } = ctx.state;
    const { jobSlug } = ctx.params;

    const [job] = await strapi.entityService.findMany('api::job.job', {
      filters: { slug: jobSlug },
      fields: ['id'],
      limit: 1,
    });
    if (!job) return ctx.notFound();

    const application = await strapi.db.query('api::application.application').findOne({
      where: { applicant: applicant.id, job: job.id },
    });

    if (!application) return { hasApplication: false };

    return {
      hasApplication: true,
      applicationId: application.id,
      status: application.status,
      decided: !!application.decisionAt,
    };
  },
}));

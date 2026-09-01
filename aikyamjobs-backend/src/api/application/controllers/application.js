'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveApplyMode, scoreChecklist } = require('../../../utils/apply');
const { sendEmail } = require('../../../utils/mailer');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';
const DEFAULT_NOTIFY = 'greeshma@aikyamfellows.org';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/**
 * Emails the review team a self-contained summary of a new submission: who,
 * which job, the deterministic checklist score, which items they ticked, any
 * required items they DIDN'T tick (the red flags), and a direct CV link. This
 * is the "analytics in the inbox" the team reviews before deciding. No AI.
 */
async function notifySummary({ job, applicant, snapshot, application, cvUrl }) {
  const settings =
    (await strapi.entityService.findMany('api::site-setting.site-setting')) || {};
  const to = settings.applicationsNotifyEmail || DEFAULT_NOTIFY;

  const ticked = snapshot.items.filter((i) => i.checked).map((i) => `  ✓ ${i.label}`);
  const missed = snapshot.items
    .filter((i) => !i.checked)
    .map((i) => `  ✗ ${i.label}${i.required ? '  (REQUIRED)' : ''}`);
  const adminLink = `${STRAPI_PUBLIC_URL}/admin/content-manager/collectionType/api::application.application/${application.id}`;

  const lines = [
    `New application through aikyamjobs`,
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
    subject: `New application: ${applicant.email} → ${job.title} (${snapshot.percent}%)`,
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
    if (existing) {
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

    const snapshot = scoreChecklist(job.requirementChecklist, checked);

    const application = await strapi.entityService.create('api::application.application', {
      data: {
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
      },
    });

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
    }).catch((err) => strapi.log.error('[apply] summary email failed', err));

    return { ok: true, applicationId: application.id, status: 'submitted' };
  },
}));

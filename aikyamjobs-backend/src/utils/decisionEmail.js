'use strict';

const { sendEmail, getNotifyEmail } = require('./mailer');
const { findRecommendedJobs } = require('./recommendations');

const FRONTEND_URL = process.env.SITE_URL || 'http://localhost:3001';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8DvZ5CxoAsvj0Oie2C';

function toBullets(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `• ${line.replace(/^[•\-*]\s*/, '')}`);
}

/**
 * Builds the applicant-facing outcome email content. Pure and side-effect
 * free (no network call, no send) — deliberately split from sendDecisionEmail
 * so the exact copy can be inspected/tested without any chance of an
 * accidental real send.
 *
 * Reply-To: the approved copy says the reply "comes straight to me"
 * (singular) so it goes to the deciding reviewer's own email; the rejected
 * copy speaks as "us" (team), so it stays on the team's notify address.
 *
 * For an approved application, this is the FIRST time the real external
 * apply link is ever shown to the applicant; it's read fresh from the job
 * record here (server-side), bypassing the public API's stripping of
 * applicationUrl/applicationEmail for gated jobs.
 */
async function composeDecisionEmail({ application, job, applicant, reviewerFirstName, reviewerEmail }) {
  const readUrl = `${FRONTEND_URL}/apply/read/${application.id}`;
  const notifyEmail = await getNotifyEmail();
  const settings = (await strapi.entityService.findMany('api::site-setting.site-setting')) || {};
  const signedBy = reviewerFirstName || 'The aikyamjobs team';
  const firstName = (applicant.name || '').trim().split(/\s+/)[0] || 'there';
  const companySuffix = job.company?.name ? ` at ${job.company.name}` : '';

  if (application.status === 'approved') {
    const applyTarget = job.applicationUrl
      ? job.applicationUrl
      : job.applicationEmail
        ? `mailto:${job.applicationEmail}`
        : null;
    const strengths = toBullets(application.leadWithThese);

    const lines = [
      `Dear ${firstName},`,
      '',
      `Thank you for choosing aikyamjobs to improve your CV and chances for ${job.title}${companySuffix}!`,
      '',
      'I spent some time going through the CV you shared, and a few things really stood out:',
      ...(strengths.length ? ['', ...strengths] : []),
      '',
      'The shared CV could be a good fit for this role. You can submit your application directly to the team here:',
      `👉 ${applyTarget || "There's no apply link on file for this role just yet — reply to this email and we'll sort it out for you."}`,
      applyTarget ? "(This is the organisation's direct application link, so the process will be completed on their platform.)" : '',
      '',
      `For a closer look at how the CV compared to what the role needs, here's the full breakdown:`,
      `👉 ${readUrl}`,
      '',
      "Wishing you the very best with the application! If any questions come up along the way, just reply to this email, it comes straight to me and I'm happy to help.",
      '',
      'Stay Connected with aikyamjobs',
      `Subscribe to our curated job alerts: ${FRONTEND_URL}/subscribe`,
      `Or Join our WhatsApp Channel: ${WHATSAPP_CHANNEL_URL}`,
      '',
      'Warmly,',
      signedBy,
      'aikyamjobs',
    ];

    return {
      to: applicant.email,
      replyTo: reviewerEmail || notifyEmail,
      subject: `Your CV is a match for ${job.title}, here's the apply link`,
      text: lines.join('\n').replace(/\n{3,}/g, '\n\n'),
    };
  }

  if (application.status === 'rejected_with_tips') {
    const recs = await findRecommendedJobs(strapi, {
      applicant,
      excludeJobId: job.id,
      limit: 2,
    }).catch(() => []);

    const strengths = toBullets(application.leadWithThese);
    const growthAreas = toBullets(application.fixBeforeSending);

    const lines = [
      `Dear ${firstName},`,
      '',
      `Thank you for choosing aikyamjobs to improve your CV and chances for ${job.title}${companySuffix}!`,
      '',
      "I went through the CV shared with us, and here's what stood out:",
      '',
      'Three things that are strong in the CV:',
      ...strengths,
      '',
      'Three areas where the CV could be strengthened:',
      ...growthAreas,
    ];

    if (application.personalTouch && application.personalTouch.trim()) {
      lines.push('', `Oh, and by the way — ${application.personalTouch.trim()}`);
    }

    lines.push(
      '',
      "The shared CV needs some improvement to be a strong fit for this role. Please feel free to share an updated version here in this email if you'd like us to take another look, once you do, we'll review it again and share the job link so you can apply.",
      '',
      "In the meantime, here's how the CV compared to what the role needs:",
      `👉 ${readUrl}`
    );

    if (recs.length) {
      lines.push('', 'And your profile looks like a great fit for these open roles too:');
      for (const r of recs) lines.push(`${r.title}: ${FRONTEND_URL}/jobs/${r.slug}`);
    }

    lines.push(
      '',
      'Wishing you the very best in your search!',
      '',
      'Stay Connected with aikyamjobs',
      `Subscribe to our curated job alerts: ${FRONTEND_URL}/subscribe`,
      `Or Join our WhatsApp Channel: ${WHATSAPP_CHANNEL_URL}`,
      '',
      'Warmly,',
      signedBy,
      'aikyamjobs'
    );

    return {
      to: applicant.email,
      replyTo: notifyEmail,
      subject: `Not this one, here's what we'd change on your CV`,
      text: lines.join('\n').replace(/\n{3,}/g, '\n\n'),
    };
  }

  return null;
}

/** Composes and actually sends. The only function in this file that touches the network. */
async function sendDecisionEmail(params) {
  const message = await composeDecisionEmail(params);
  if (!message) return;
  await sendEmail(message);
}

module.exports = { sendDecisionEmail, composeDecisionEmail };

'use strict';

const { sendEmail, getNotifyEmail } = require('./mailer');
const { findRecommendedJobs } = require('./recommendations');

const FRONTEND_URL = process.env.SITE_URL || 'http://localhost:3001';

/**
 * Builds the applicant-facing outcome email content. Pure and side-effect
 * free (no network call, no send) — deliberately split from sendDecisionEmail
 * so the exact copy can be inspected/tested without any chance of an
 * accidental real send.
 *
 * Reply-To is set to the team's notify address (not the sending domain), so
 * if an applicant replies, it actually reaches someone instead of a no-reply
 * inbox.
 *
 * For an approved application, this is the FIRST time the real external
 * apply link is ever shown to the applicant; it's read fresh from the job
 * record here (server-side), bypassing the public API's stripping of
 * applicationUrl/applicationEmail for gated jobs.
 */
async function composeDecisionEmail({ application, job, applicant, reviewerFirstName }) {
  const readUrl = `${FRONTEND_URL}/apply/read/${application.id}`;
  const notifyEmail = await getNotifyEmail();
  const settings = (await strapi.entityService.findMany('api::site-setting.site-setting')) || {};
  const signedBy = reviewerFirstName || 'The aikyamjobs team';
  const firstName = (applicant.name || '').trim().split(/\s+/)[0] || 'there';

  if (application.status === 'approved') {
    const applyTarget = job.applicationUrl
      ? job.applicationUrl
      : job.applicationEmail
        ? `mailto:${job.applicationEmail}`
        : null;

    const lines = [
      `Hi ${firstName},`,
      '',
      `Good news. I read your CV against what ${job.title} is looking for, and it's a genuine match. Here's the link to apply directly:`,
      '',
      applyTarget || "There's no apply link on file for this role just yet. Reply to this email and we'll sort it out for you.",
      '',
      applyTarget
        ? "That's their own application form, so go ahead and apply there directly. We're not part of that process from here."
        : '',
      '',
      `I also put together a short, personal breakdown of how your CV matched up, plus a couple of things worth highlighting when you apply. It only takes a minute: ${readUrl}`,
      '',
      'Thanks for applying through aikyamjobs, and good luck.',
      '',
      'Thanks,',
      signedBy,
      'aikyamjobs',
      '',
      'Reply to this email if you have any questions. It comes straight to us.',
    ];

    return {
      to: applicant.email,
      replyTo: notifyEmail,
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

    const lines = [
      `Hi ${firstName},`,
      '',
      `I read your CV against what ${job.title} is looking for. A couple of the essentials didn't come through clearly on the page, so I'm not able to send you the apply link for this particular role. I didn't want to leave you with just a no though, so here's exactly what I could and couldn't find.`,
      '',
      application.fixBeforeSending ? `What I couldn't find on the page:\n${application.fixBeforeSending}` : '',
      '',
      "This is about what your CV currently shows, not about what you're capable of.",
      settings.allowReapplyAfterRejection
        ? "If you're able to make a change or two, you're welcome to apply again. There's more on this in the breakdown below."
        : '',
      '',
      `I put together the full breakdown of how your CV compared, item by item. It's worth a look: ${readUrl}`,
    ];

    if (recs.length) {
      lines.push('', "In the meantime, here are a couple of roles your CV is already a strong match for:");
      for (const r of recs) lines.push(`${r.title}: ${FRONTEND_URL}/jobs/${r.slug}`);
    }

    lines.push(
      '',
      'Thanks for applying through aikyamjobs.',
      '',
      'Thanks,',
      signedBy,
      'aikyamjobs',
      '',
      "If I've misread anything here, just reply and let me know. I'll happily take another look."
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

'use strict';

const { sendEmail, getNotifyEmail } = require('./mailer');

const FRONTEND_URL = process.env.SITE_URL || 'http://localhost:3001';

/**
 * Builds the applicant-facing CV Improver feedback email. Pure and
 * side-effect free — same compose/send split as decisionEmail.js, for the
 * same reason: lets the exact copy be inspected/tested with zero chance of an
 * accidental real send.
 */
async function composeCvReviewEmail({ cvReview, applicant, reviewerFirstName }) {
  const readUrl = `${FRONTEND_URL}/cv-improver/read/${cvReview.id}`;
  const notifyEmail = await getNotifyEmail();
  const signedBy = reviewerFirstName || 'The aikyamjobs team';
  const firstName = (applicant.name || '').trim().split(/\s+/)[0] || 'there';

  const lines = [
    `Hi ${firstName},`,
    '',
    `I read your CV against what you told us you're aiming for (${cvReview.targetRoles}), and put together some honest feedback for you.`,
    '',
    `You can read the full breakdown here: ${readUrl}`,
    '',
    'Thanks for using CV Improver.',
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
    subject: 'Your CV Improver feedback is ready',
    text: lines.join('\n').replace(/\n{3,}/g, '\n\n'),
  };
}

/** Composes and actually sends. The only function in this file that touches the network. */
async function sendCvReviewEmail(params) {
  const message = await composeCvReviewEmail(params);
  if (!message) return;
  await sendEmail(message);
}

module.exports = { sendCvReviewEmail, composeCvReviewEmail };

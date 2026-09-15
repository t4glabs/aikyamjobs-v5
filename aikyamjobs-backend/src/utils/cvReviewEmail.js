'use strict';

const { sendEmail, getNotifyEmail } = require('./mailer');

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
 * Builds the applicant-facing CV Improver feedback email. Pure and
 * side-effect free — same compose/send split as decisionEmail.js, for the
 * same reason: lets the exact copy be inspected/tested with zero chance of an
 * accidental real send.
 */
async function composeCvReviewEmail({ cvReview, applicant, reviewerFirstName, reviewerEmail }) {
  const readUrl = `${FRONTEND_URL}/cv-improver/read/${cvReview.id}`;
  const notifyEmail = await getNotifyEmail();
  const signedBy = reviewerFirstName || 'The aikyamjobs team';
  const firstName = (applicant.name || '').trim().split(/\s+/)[0] || 'there';
  const strengths = toBullets(cvReview.leadWithThese);

  const lines = [
    `Dear ${firstName},`,
    '',
    'Thank you for sending your CV to aikyamjobs for review!',
    '',
    'I have carefully gone through your CV to see how we can make your experience stand out to potential employers.' +
      (strengths.length ? ' Here are a few key strengths already working in your favor:' : ''),
    ...(strengths.length ? ['', ...strengths] : []),
    '',
    "To help you polish your CV and make it even stronger, I've put together a detailed breakdown with clear suggestions for improvement.",
    '',
    `You can access your personalized CV review here: 👉 ${readUrl}`,
    '',
    "Take your time going through the suggestions. If you have any questions or need help revising any section, simply reply to this email. It comes straight to me, and I'm happy to guide you!",
    '',
    'Stay Connected with aikyamjobs:',
    `• Subscribe to our curated job alerts: ${FRONTEND_URL}/subscribe`,
    `• Join our WhatsApp Channel: ${WHATSAPP_CHANNEL_URL}`,
    '',
    'Warmly,',
    signedBy,
    'aikyamjobs',
  ];

  return {
    to: applicant.email,
    replyTo: reviewerEmail || notifyEmail,
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

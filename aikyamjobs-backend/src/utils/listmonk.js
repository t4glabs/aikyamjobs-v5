'use strict';

const listmonkApi = require('./listmonkApi');

/**
 * Adds an applicant to the newsletter list (the /subscribe list, now Private
 * in Listmonk) when they submit an application or a CV Improver request.
 * Job alerts are part of the consent they tick on those forms, so no
 * separate opt-in step.
 *
 * No confirmation email: the applicant already proved they own the address
 * with the magic link, so a double opt-in mail would be a pointless second
 * loop. They're added as confirmed through the same admin-API client as the
 * website form (./listmonkApi.js, preconfirm mode).
 *
 * Once per applicant: newsletterSubscribedAt is set on success and the sync
 * is skipped from then on, so anyone who later unsubscribes is never re-added
 * by a later application. Applicants added under the old public-form flow
 * (listmonkSynced, but often never confirmed) are confirmed on their next
 * submission.
 *
 * Best effort: logs on failure and never throws, so a newsletter hiccup can
 * never break the apply or CV-review flow; a failure is retried on the next
 * submission.
 */
const ADDED = new Set(['created-confirmed', 'added-confirmed', 'confirmed-was-unconfirmed', 'already-confirmed']);

async function syncApplicantToNewsletter(applicant) {
  if (!applicant || !applicant.email || applicant.newsletterSubscribedAt) return;

  if (!listmonkApi.isConfigured()) {
    strapi.log.error('[listmonk] applicant newsletter sync skipped: LISTMONK_API_* env not set');
    return;
  }

  const email = String(applicant.email).trim().toLowerCase();
  const domain = email.split('@')[1];
  let outcome;
  try {
    outcome = await listmonkApi.subscribe(email, { preconfirm: true, name: applicant.name });
  } catch (err) {
    strapi.log.warn(`[listmonk] applicant newsletter sync failed (@${domain}): ${err.message}`);
    return;
  }
  strapi.log.info(`[listmonk] applicant newsletter sync: ${outcome} (@${domain})`);
  if (!ADDED.has(outcome)) return; // unsubscribed / blocklisted: left alone

  try {
    await strapi.documents('api::applicant.applicant').update({
      documentId: applicant.documentId,
      data: { newsletterSubscribedAt: new Date().toISOString(), listmonkSynced: true },
    });
  } catch (err) {
    strapi.log.warn(`[listmonk] could not record newsletter sync for applicant ${applicant.documentId}: ${err.message}`);
  }
}

module.exports = { syncApplicantToNewsletter };

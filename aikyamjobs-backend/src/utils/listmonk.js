'use strict';

/**
 * Adds an email to the public "aikyamjobs Website Subscribers" Listmonk list
 * via the SAME public subscription-form endpoint the website /subscribe page
 * posts to — so applicants land in the same list, with whatever opt-in mode
 * that list is configured for (e.g. a double-opt-in confirmation email).
 * Deliberately uses the public form, not Listmonk's admin API, so no API
 * credentials are needed. Best-effort: logs on failure, never throws, so a
 * newsletter hiccup can never break the apply / CV-review flow.
 *
 * Env (optional — defaults match the website subscribe form in
 * aikyamjobs-frontend/app/subscribe/page.tsx):
 *   LISTMONK_SUBSCRIBE_URL  default https://mails.tinybridge.org/subscription/form
 *   LISTMONK_LIST_UUID      default 4ab2985e-c34e-41c3-9370-7024f8b27bae
 */
const SUBSCRIBE_URL =
  process.env.LISTMONK_SUBSCRIBE_URL || 'https://mails.tinybridge.org/subscription/form';
const LIST_UUID =
  process.env.LISTMONK_LIST_UUID || '4ab2985e-c34e-41c3-9370-7024f8b27bae';

async function subscribeToNewsletter({ email, name } = {}) {
  if (!email) return { skipped: true };

  const form = new URLSearchParams();
  form.set('email', email);
  form.set('l', LIST_UUID);
  // Listmonk's external-embed form sends an empty nonce (same as our /subscribe page).
  form.set('nonce', '');
  if (name) form.set('name', name);

  try {
    const res = await fetch(SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    // Listmonk's public form returns 200 (HTML) or a 3xx redirect on success
    // (incl. "already subscribed"), and 4xx/5xx on a real rejection.
    if (res.status >= 400) {
      const body = await res.text().catch(() => '');
      strapi.log.warn(`[listmonk] subscribe ${email} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    strapi.log.warn(`[listmonk] subscribe failed for ${email}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

/**
 * Subscribe an applicant exactly once. Checks the applicant's listmonkSynced
 * flag, subscribes via the public form, then flips the flag ONLY on success —
 * so a transient failure just retries on their next submission instead of being
 * lost, and a confirmation email is never re-sent to someone already synced.
 * Takes an already-loaded applicant object ({ documentId, email, name,
 * listmonkSynced }). Call fire-and-forget from the submit controllers.
 */
async function syncApplicantToNewsletter(applicant) {
  if (!applicant || !applicant.email || applicant.listmonkSynced) return;

  const result = await subscribeToNewsletter({ email: applicant.email, name: applicant.name });
  if (!result || !result.ok) return; // leave listmonkSynced false so it retries next time

  try {
    await strapi.documents('api::applicant.applicant').update({
      documentId: applicant.documentId,
      data: { listmonkSynced: true },
    });
  } catch (err) {
    strapi.log.warn(`[listmonk] could not set listmonkSynced for ${applicant.email}: ${err.message}`);
  }
}

module.exports = { subscribeToNewsletter, syncApplicantToNewsletter };

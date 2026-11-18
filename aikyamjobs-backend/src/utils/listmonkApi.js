'use strict';

/**
 * Listmonk admin-API client for the /subscribe list. Used by the website
 * /subscribe form (src/api/newsletter) and by the applicant opt-in in
 * ./listmonk.js (preconfirm mode, below).
 *
 * Why the API and not Listmonk's public form: the public form has no bot
 * protection and its list ID is visible in the page, so bots posted to
 * Listmonk directly. With the list set to "Private" in Listmonk, the public
 * form rejects it, and the only way in is this server-side path, which runs
 * after the Turnstile and email checks.
 *
 * Behaves like Listmonk's own public form: new address → added as
 * unconfirmed, and Listmonk sends its double opt-in email. Existing address
 * → added to the list if missing, opt-in email re-sent if still unconfirmed,
 * left alone if already confirmed, unsubscribed or blocklisted.
 *
 * Env:
 *   LISTMONK_URL                default https://mails.tinybridge.org
 *   LISTMONK_API_USER           Listmonk API user (Users → New → type "API")
 *   LISTMONK_API_TOKEN          its token
 *   LISTMONK_SUBSCRIBE_LIST_ID  numeric ID of the /subscribe list
 */
function config() {
  return {
    base: (process.env.LISTMONK_URL || 'https://mails.tinybridge.org').replace(/\/+$/, ''),
    user: process.env.LISTMONK_API_USER,
    token: process.env.LISTMONK_API_TOKEN,
    listId: Number(process.env.LISTMONK_SUBSCRIBE_LIST_ID),
  };
}

function isConfigured() {
  const { user, token, listId } = config();
  return Boolean(user && token && Number.isInteger(listId) && listId > 0);
}

async function call(method, path, body) {
  const { base, user, token } = config();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `token ${user}:${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error page; keep the text for the log
  }
  return { status: res.status, json, text };
}

function fail(step, r) {
  return new Error(`${step} -> HTTP ${r.status}: ${String(r.text).slice(0, 200)}`);
}

const sameEmail = (email) => (s) => String(s.email).toLowerCase() === email.toLowerCase();
const onList = (subscriber, listId) => (subscriber?.lists || []).some((l) => l.id === listId);

// Listmonk silently drops lists the API user may not manage: it still
// answers 200, creates the subscriber with no list and sends no email.
// Seen in production on 2026-11-18, so check membership explicitly.
function permissionError(listId) {
  return new Error(
    `subscriber not on list ${listId}: give the API user a list role with "Manage" on that list ` +
      '(Listmonk → Users → List roles), and check LISTMONK_SUBSCRIBE_LIST_ID'
  );
}

// Finds an existing subscriber by exact email, on any Listmonk version:
//  - v5+: `search` (a bound, case-insensitive regex), anchored to the whole
//    address. Their `query` (raw SQL) param needs subscribers:sql_query,
//    which this API user shouldn't have.
//  - v4: has no `search` param (it's ignored and returns the first page of
//    everyone), so if that misses, fall back to `query`, which v4 allows
//    without extra permissions. Doubling single quotes keeps the value inside
//    the SQL string literal (the search pattern above escapes every
//    non-alphanumeric character and is a bound parameter anyway).
async function findByEmail(email) {
  const pattern = `^${email.replace(/[^a-z0-9@]/gi, '\\$&')}$`;
  const bySearch = await call('GET', `/api/subscribers?per_page=20&search=${encodeURIComponent(pattern)}`);
  if (bySearch.status !== 200) throw fail('lookup', bySearch);
  const hit = (bySearch.json?.data?.results || []).find(sameEmail(email));
  if (hit) return hit;

  const sql = `LOWER(subscribers.email) = '${email.toLowerCase().replace(/'/g, "''")}'`;
  const byQuery = await call('GET', `/api/subscribers?per_page=20&query=${encodeURIComponent(sql)}`);
  if (byQuery.status !== 200) throw fail('lookup (query fallback)', byQuery);
  const viaQuery = (byQuery.json?.data?.results || []).find(sameEmail(email));
  if (viaQuery) return viaQuery;
  throw new Error('lookup -> exists but not visible to the API user (needs subscribers:get_all)');
}

// Returns the outcome string; throws if Listmonk rejects a step.
//
// preconfirm: false (website /subscribe): unverified address, so Listmonk's
//   double opt-in email decides; an earlier unsubscribe is respected.
// preconfirm: true (applicants): they proved they own the address via the
//   magic link, and job alerts are part of the consent they gave on submit,
//   so they go straight to "confirmed" with no second email. Someone who
//   unsubscribed earlier is left alone, and so is an admin blocklist.
async function subscribe(email, { preconfirm = false, name } = {}) {
  const { listId } = config();

  const created = await call('POST', '/api/subscribers', {
    email,
    // Same default name Listmonk's public form uses when none is given.
    name: (name && String(name).trim()) || email.split('@')[0],
    status: 'enabled',
    lists: [listId],
    preconfirm_subscriptions: preconfirm,
  });
  if (created.status === 200) {
    if (!onList(created.json?.data, listId)) throw permissionError(listId);
    return preconfirm ? 'created-confirmed' : 'created';
  }
  if (created.status !== 409) throw fail('create', created);

  // 409 = the address is already in Listmonk (possibly only on other lists).
  const subscriber = await findByEmail(email);

  if (subscriber.status === 'blocklisted') return 'blocklisted';
  const membership = (subscriber.lists || []).find((l) => l.id === listId);

  if (preconfirm) {
    if (membership?.subscription_status === 'confirmed') return 'already-confirmed';
    if (membership?.subscription_status === 'unsubscribed') return 'unsubscribed';
    const set = await call('PUT', '/api/subscribers/lists', {
      ids: [subscriber.id],
      action: 'add',
      target_list_ids: [listId],
      status: 'confirmed',
    });
    if (set.status !== 200) throw fail('confirm-on-list', set);
    const after = await call('GET', `/api/subscribers/${subscriber.id}`);
    if (after.status !== 200) throw fail('re-check', after);
    const now = (after.json?.data?.lists || []).find((l) => l.id === listId);
    if (now?.subscription_status !== 'confirmed') throw permissionError(listId);
    return membership ? `confirmed-was-${membership.subscription_status}` : 'added-confirmed';
  }
  if (membership?.subscription_status === 'confirmed') return 'already-confirmed';
  // Respect an earlier unsubscribe, as Listmonk's own public form does.
  if (membership?.subscription_status === 'unsubscribed') return 'unsubscribed';

  if (!membership) {
    const added = await call('PUT', '/api/subscribers/lists', {
      ids: [subscriber.id],
      action: 'add',
      target_list_ids: [listId],
      status: 'unconfirmed',
    });
    if (added.status !== 200) throw fail('add-to-list', added);
    const after = await call('GET', `/api/subscribers/${subscriber.id}`);
    if (after.status !== 200) throw fail('re-check', after);
    if (!onList(after.json?.data, listId)) throw permissionError(listId);
  }

  const optin = await call('POST', `/api/subscribers/${subscriber.id}/optin`);
  if (optin.status !== 200) throw fail('send-optin', optin);
  return membership ? 'optin-resent' : 'added-to-list';
}

module.exports = { isConfigured, subscribe };

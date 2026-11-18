'use strict';

/**
 * Listmonk admin-API client used ONLY by the website /subscribe form
 * (src/api/newsletter). The applicant newsletter sync in ./listmonk.js is
 * separate and deliberately untouched.
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

// Returns the outcome string; throws if Listmonk rejects a step.
async function subscribe(email) {
  const { listId } = config();

  // Same default name Listmonk's public form uses when none is given.
  const created = await call('POST', '/api/subscribers', {
    email,
    name: email.split('@')[0],
    status: 'enabled',
    lists: [listId],
    preconfirm_subscriptions: false,
  });
  if (created.status === 200) return 'created';
  if (created.status !== 409) throw fail('create', created);

  // 409 = the address is already in Listmonk (possibly only on other lists).
  // Find it with `search` (a bound, case-insensitive regex on name/email),
  // anchored to the whole address, rather than the `query` SQL parameter,
  // which would need the powerful subscribers:sql_query permission.
  const pattern = `^${email.replace(/[^a-z0-9@]/gi, '\\$&')}$`;
  const found = await call('GET', `/api/subscribers?per_page=20&search=${encodeURIComponent(pattern)}`);
  if (found.status !== 200) throw fail('lookup', found);
  const subscriber = (found.json?.data?.results || []).find(
    (s) => String(s.email).toLowerCase() === email.toLowerCase()
  );
  if (!subscriber) throw new Error('lookup -> exists but not visible to the API user (needs subscribers:get_all)');

  if (subscriber.status === 'blocklisted') return 'blocklisted';
  const membership = (subscriber.lists || []).find((l) => l.id === listId);
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
  }

  const optin = await call('POST', `/api/subscribers/${subscriber.id}/optin`);
  if (optin.status !== 200) throw fail('send-optin', optin);
  return membership ? 'optin-resent' : 'added-to-list';
}

module.exports = { isConfigured, subscribe };

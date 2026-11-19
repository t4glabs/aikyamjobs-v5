/**
 * Global Meilisearch Indexer
 *
 * One Meilisearch server (search.aikyamfellows.org), one index per site:
 *   aikyamjobs_search  aikyamjobs.org: jobs, companies, blogs (Strapi 5)
 *   pattic_search      pattic.org's search box: newsletters (Ghost), library
 *                      (BookStack) and forum (Discourse) in one index, told
 *                      apart by `source`
 * Sites are indexed one after another and independently: one failing never
 * touches another site's index.
 *
 * Run:       node global-indexer.js
 * One site:  node global-indexer.js --site=pattic
 * Dry run:   node global-indexer.js --dry-run
 *            (fetches + builds documents and prints a summary, never touches
 *             Meilisearch, safe to run any time)
 * Force:     --force lets a unified site's index shrink by more than half
 *            (normally refused, as that's usually a broken source, not a
 *            real mass deletion)
 *
 * Settings come from the environment, or from a .env file next to this
 * script (KEY=value lines; real env vars win). Keep that file out of git and
 * chmod 600.
 *   MEILI_HOST                     default http://localhost:7700
 *   MEILI_KEY                      Meilisearch master key
 *   PATTIC_GHOST_CONTENT_KEY       pattic.org Ghost admin → Settings →
 *                                  Integrations → (custom integration)
 *   PATTIC_BOOKSTACK_TOKEN_ID      library.pattic.org → (user) → API tokens
 *   PATTIC_BOOKSTACK_TOKEN_SECRET
 * The forum needs no key: it's read as a logged-out visitor.
 */

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const ONLY_SITE = (process.argv.find(a => a.startsWith('--site=')) || '').slice('--site='.length) || null;

// Read lazily: the .env file is loaded at the start of main().
const meiliHost = () => (process.env.MEILI_HOST || 'http://localhost:7700').replace(/\/+$/, '');
const meiliKey = () => process.env.MEILI_KEY || '';

// ── Site configuration ────────────────────────────────────────────────────────
const sites = [
  // aikyamjobs — Strapi 5
  {
    name: 'aikyamjobs',
    type: 'strapi',               // <-- tells the indexer to use Strapi
    indexName: 'aikyamjobs_search',
    strapiUrl: 'https://aikyamjobs.org',
    siteUrl: 'https://aikyamjobs.org',
  },

  // Pattic — one index behind pattic.org's search box, fed by three sites.
  // The box (assets/js/meilisearch-override.js in the Ghost theme) groups
  // hits by `source`: blog → "Newsletters", wiki → "Library",
  // forum → "Forum Discussions".
  {
    name: 'pattic',
    type: 'unified',              // several sources, one index
    indexName: 'pattic_search',
    sources: [
      { type: 'ghost', url: 'https://pattic.org', keyEnv: 'PATTIC_GHOST_CONTENT_KEY' },
      {
        type: 'bookstack',
        url: 'https://library.pattic.org',
        tokenIdEnv: 'PATTIC_BOOKSTACK_TOKEN_ID',
        tokenSecretEnv: 'PATTIC_BOOKSTACK_TOKEN_SECRET',
      },
      { type: 'discourse', url: 'https://forum.pattic.org' },
    ],
  },
];

// ── Meilisearch client (lazy, so --dry-run works without the package/key) ────
let client;
async function getClient() {
  if (!client) {
    if (!meiliKey()) {
      throw new Error('Meilisearch key not set: put MEILI_KEY=... in the .env file next to this script.');
    }
    const { MeiliSearch } = await import('meilisearch');
    client = new MeiliSearch({ host: meiliHost(), apiKey: meiliKey() });
  }
  return client;
}

// ── Strapi indexer (for aikyamjobs) ──────────────────────────────────────────
//
// Strapi 5 returns flat entries — fields sit directly on the object
// (`job.title`, `job.company.name`, `job.categories[].name`), not under v4's
// `attributes` / `data.attributes` wrappers. Reading the v4 shape is what broke
// this with "Cannot read properties of undefined (reading 'title')".

function stripMarkdown(text = '') {
  return (text || '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_~`>]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 3000);
}

// Job.skills entries are plain strings today, but may become structured
// objects ({ label, type, level, ... }) — index just the label either way.
function skillLabels(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map(s => (typeof s === 'string' ? s : s?.label))
    .filter(Boolean);
}

async function fetchAllFromStrapi(strapiUrl, path) {
  const PAGE_SIZE = 100;
  let page = 1;
  let all = [];

  while (true) {
    const url = `${strapiUrl}/api${path}&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Strapi ${res.status} on ${url}`);
    const { data, meta } = await res.json();
    all = all.concat(data || []);
    if (page >= (meta?.pagination?.pageCount ?? 1)) break;
    page++;
  }

  return all;
}

async function indexStrapiSite(site) {
  try {
    console.log(`\nIndexing ${site.name} (Strapi)...`);
    const { strapiUrl, siteUrl, indexName } = site;

    // Fetch jobs, companies, blogs in parallel (published only — Strapi 5's default)
    const [jobs, companies, blogs] = await Promise.all([
      fetchAllFromStrapi(strapiUrl,
        '/jobs?populate[company][fields][0]=name&populate[categories][fields][0]=name' +
        '&fields[0]=title&fields[1]=slug&fields[2]=excerpt&fields[3]=description' +
        '&fields[4]=location&fields[5]=jobType&fields[6]=experienceLevel' +
        '&fields[7]=skills&fields[8]=featured&fields[9]=publishedAt'
      ),
      fetchAllFromStrapi(strapiUrl,
        '/companies?fields[0]=name&fields[1]=slug&fields[2]=excerpt' +
        '&fields[3]=description&fields[4]=industry&fields[5]=location&fields[6]=publishedAt'
      ),
      fetchAllFromStrapi(strapiUrl,
        '/blogs?fields[0]=title&fields[1]=slug&fields[2]=excerpt' +
        '&fields[3]=content&fields[4]=author&fields[5]=category' +
        '&fields[6]=externalLink&fields[7]=publishedAt'
      ),
    ]);

    // documentId is stable across publishes in Strapi 5 (the numeric id of the
    // published row changes every time an entry is re-published).
    const jobDocs = jobs.map(j => ({
      id: `job-${j.documentId || j.id}`,
      type: 'job',
      title: j.title,
      excerpt: j.excerpt || '',
      content: stripMarkdown(j.description),
      url: `${siteUrl}/jobs/${j.slug}`,
      location: j.location || '',
      jobType: j.jobType || '',
      experienceLevel: j.experienceLevel || '',
      company: j.company?.name || '',
      categories: (j.categories || []).map(c => c.name).filter(Boolean),
      skills: skillLabels(j.skills),
      featured: !!j.featured,
      published_at: j.publishedAt || '',
    }));

    const companyDocs = companies.map(c => ({
      id: `company-${c.documentId || c.id}`,
      type: 'company',
      title: c.name,
      excerpt: c.excerpt || '',
      content: stripMarkdown(c.description),
      url: `${siteUrl}/companies/${c.slug}`,
      location: c.location || '',
      industry: c.industry || '',
      company: '', categories: [], skills: [], jobType: '', featured: false,
      published_at: c.publishedAt || '',
    }));

    const blogDocs = blogs.map(b => ({
      id: `blog-${b.documentId || b.id}`,
      type: 'blog',
      title: b.title,
      excerpt: b.excerpt || '',
      content: stripMarkdown(b.content),
      url: b.externalLink || `${siteUrl}/blogs/${b.slug}`,
      author: b.author || '',
      category: b.category || '',
      company: '', location: '', categories: [], skills: [], jobType: '', featured: false,
      published_at: b.publishedAt || '',
    }));

    const documents = [...jobDocs, ...companyDocs, ...blogDocs];

    // Safety net: the reindex below wipes the index first, so never run it on
    // an empty/odd fetch (e.g. an API permission change returning no jobs).
    const untitled = documents.filter(d => !d.title).length;
    if (jobDocs.length === 0 || untitled > 0) {
      throw new Error(
        `refusing to reindex: ${jobDocs.length} jobs fetched, ${untitled} documents without a title ` +
        `(response shape changed?) — index left untouched`
      );
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would index ${jobDocs.length} jobs, ${companyDocs.length} companies, ${blogDocs.length} blogs from ${site.name}`);
      for (const sample of [jobDocs[0], companyDocs[0], blogDocs[0]].filter(Boolean)) {
        console.log(`[dry-run] sample ${sample.type}:`, JSON.stringify({ ...sample, content: sample.content.slice(0, 80) + '…' }, null, 2));
      }
      return;
    }

    const index = (await getClient()).index(indexName);

    await index.updateSearchableAttributes([
      'title', 'company', 'excerpt', 'categories', 'skills', 'location', 'industry', 'author', 'content'
    ]);
    await index.updateFilterableAttributes([
      'type', 'jobType', 'location', 'featured', 'categories', 'company', 'industry'
    ]);
    await index.updateSortableAttributes(['published_at']);

    // Full reindex — clears removed jobs/companies from search results
    await index.deleteAllDocuments();
    await index.addDocuments(documents, { primaryKey: 'id' });

    console.log(`✓ Indexed ${jobDocs.length} jobs, ${companyDocs.length} companies, ${blogDocs.length} blogs from ${site.name}`);
  } catch (error) {
    console.error(`✗ Failed to index ${site.name}:`, error.message);
  }
}

// ── Unified sites (Pattic): several sources, one index ───────────────────────
//
// Each document carries what pattic.org's search box reads: title, content,
// excerpt, url, source ('blog' | 'wiki' | 'forum') and source_detail (shown
// under a hit). The other fields are extra search context.
//
// Every run rebuilds the whole index and swaps it in, so anything deleted or
// hidden at a source drops out of search. If any source fails, nothing is
// published and the live index stays as it was until the next run.

const UNIFIED_SETTINGS = {
  // Order matters: a match in the title ranks above one in the body.
  searchableAttributes: ['title', 'tags', 'excerpt', 'content', 'replies', 'book', 'category'],
  // Everything except `replies`: searched, but too long to send to browsers.
  displayedAttributes: [
    'id', 'title', 'excerpt', 'content', 'url', 'source', 'source_detail',
    'book', 'book_slug', 'category', 'tags', 'published_at',
  ],
  filterableAttributes: ['source', 'source_detail'],
  sortableAttributes: ['published_at'],
};

const MAX_CONTENT = 5000;
const UA = 'meilisearch-indexer';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (add it to the .env file next to this script)`);
  return value;
}

// Keeps credentials that travel in a query string (Ghost's ?key=) out of logs.
const redact = url => url.replace(/([?&]key=)[^&]+/, '$1***');

// fetch with retries. 429 waits for Retry-After (BookStack allows 180 API
// calls a minute, Discourse rate-limits anonymous readers); 5xx and network
// errors back off. Gives up after 4 attempts. Never follows redirects, so a
// bounce to a login page shows up as a non-200 status.
async function request(url, { method = 'GET', headers = {} } = {}) {
  for (let attempt = 1; ; attempt++) {
    let res;
    let failure;
    try {
      res = await fetch(url, {
        method,
        redirect: 'manual',
        headers: { 'User-Agent': UA, ...headers },
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      failure = err;
    }
    if (res && res.status !== 429 && res.status < 500) return res;
    if (attempt === 4) {
      if (res) return res;
      throw new Error(`${method} ${redact(url)}: ${failure.message}`);
    }
    const retryAfter = Number(res?.headers.get('retry-after'));
    const wait = Math.min(retryAfter > 0 ? retryAfter : 5 * 2 ** attempt, 120);
    await res?.body?.cancel().catch(() => {});
    console.warn(`  ${res ? res.status : failure.message} on ${redact(url)}, retrying in ${wait}s`);
    await sleep(wait * 1000);
  }
}

async function getJson(url, headers = {}) {
  const res = await request(url, { headers: { Accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`${res.status} on GET ${redact(url)}: ${(await res.text()).slice(0, 150)}`);
  return res.json();
}

// Runs fn over items with at most `limit` calls in flight; keeps order.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ── Text clean-up ──
//
// pattic.org's search box puts hit titles and snippets into the page with
// innerHTML, unescaped, after decoding entities once more. So text that looks
// like markup, such as a forum post quoting "<img onerror=…>" or
// "&lt;script&gt;", would run as code on pattic.org. A zero-width space after
// a "<" or "&" that could start a tag or an escape stops that, however many
// times the text is parsed, and reads the same. (The theme should escape
// too. This keeps the index safe either way.)
const inert = text => text
  .replace(/<(?=[a-z/!?])/gi, '<​')
  .replace(/&(?=#|amp|lt|gt)/gi, '&​');

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', times: '×',
  rarr: '→', larr: '←', euro: '€', pound: '£', shy: '', zwj: '‍', zwnj: '‌',
};

// One pass only, so "&amp;lt;" correctly becomes the literal text "&lt;".
function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (whole, ref) => {
    if (ref[0] !== '#') return NAMED_ENTITIES[ref] ?? NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
    const code = /x/i.test(ref[1]) ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

const BLOCK_TAG = /<\/?(?:p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|blockquote|pre|section|article|aside|header|footer|figure|figcaption|details|summary|hr)\b[^>]*>/gi;

// HTML → one line of readable text, capped at `max` characters. Block tags
// become spaces (the old indexer glued "friend,</p><p>We" into "friend,We").
function plain(html, max = MAX_CONTENT) {
  const text = decodeEntities(String(html || '')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(BLOCK_TAG, ' ')
    .replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
  return inert(text.slice(0, max));
}

// Already-plain text (titles, names, descriptions), tidied and made inert.
const text = (value, max = MAX_CONTENT) => inert(String(value || '').replace(/\s+/g, ' ').trim().slice(0, max));

// The search box opens hits with onclick="window.location.href='<url>'", so
// keep quotes out of URLs.
const safeUrl = url => new URL(url).href.replace(/'/g, '%27').replace(/"/g, '%22');

// ── Ghost (newsletters) ──
async function fetchGhost(src) {
  const key = requireEnv(src.keyEnv);
  const posts = [];
  // Ghost 6 caps limit at 100 (limit=all quietly returns only the newest
  // 100), so page through.
  for (let page = 1; ; page++) {
    const { posts: batch, meta } = await getJson(
      `${src.url}/ghost/api/content/posts/?key=${encodeURIComponent(key)}&limit=100&page=${page}` +
      '&fields=id,title,url,excerpt,custom_excerpt,html,published_at&include=tags&formats=html'
    );
    posts.push(...batch);
    if (!meta?.pagination?.next) break;
  }
  console.log(`  ghost: ${posts.length} posts`);

  return posts.map(post => ({
    id: `ghost-${post.id}`,
    title: text(post.title),
    content: plain(post.html) || text(post.excerpt),
    excerpt: text(post.custom_excerpt || post.excerpt, 500),
    url: safeUrl(post.url),
    source: 'blog',
    tags: (post.tags || []).filter(t => t.visibility !== 'internal').map(t => text(t.name)),
    published_at: post.published_at || '',
  }));
}

// ── BookStack (library) ──
async function fetchBookStack(src) {
  const auth = { Authorization: `Token ${requireEnv(src.tokenIdEnv)}:${requireEnv(src.tokenSecretEnv)}` };

  const listAll = async type => {
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const { data, total } = await getJson(`${src.url}/api/${type}?count=500&offset=${offset}&sort=id`, auth);
      items.push(...data);
      if (!data.length || items.length >= total) break;
    }
    return items;
  };
  const [books, chapters, pages] = await Promise.all(['books', 'chapters', 'pages'].map(listAll));

  const bookById = new Map(books.map(b => [b.id, b]));
  const bookUrl = book => `${src.url}/books/${book.slug}`;
  const candidates = [
    ...books.map(b => ({ kind: 'book', item: b, book: b, url: bookUrl(b) })),
    ...chapters
      .filter(c => bookById.has(c.book_id))
      .map(c => ({ kind: 'chapter', item: c, book: bookById.get(c.book_id), url: `${bookUrl(bookById.get(c.book_id))}/chapter/${c.slug}` })),
    ...pages
      .filter(p => !p.draft && !p.template && bookById.has(p.book_id))
      .map(p => ({ kind: 'page', item: p, book: bookById.get(p.book_id), url: `${bookUrl(bookById.get(p.book_id))}/page/${p.slug}` })),
  ];

  // The API token sees more than the public does (restricted books,
  // chapters, pages). The index is public, so keep only what a logged-out
  // visitor can open.
  const open = await mapLimit(candidates, 6, async c => (await request(c.url, { method: 'HEAD' })).status === 200);
  const visible = candidates.filter((_, i) => open[i]);
  console.log(
    `  bookstack: ${books.length} books, ${chapters.length} chapters, ${pages.length} pages; ` +
    `${candidates.length - visible.length} not public, left out`
  );

  // Page bodies aren't in the listing: one call each.
  return mapLimit(visible, 4, async ({ kind, item, book, url }) => ({
    id: `bookstack-${kind}-${item.id}`,
    title: text(item.name),
    content: kind === 'page'
      ? plain((await getJson(`${src.url}/api/pages/${item.id}`, auth)).html)
      : text(item.description),
    url: safeUrl(url),
    source: 'wiki',
    source_detail: kind,
    book: text(book.name),
    book_slug: book.slug,
    published_at: item.created_at || '',
  }));
}

// ── Discourse (forum) ──
//
// Read as a logged-out visitor, with no API key: the index holds exactly the
// public forum, so staff-only or private categories can't leak into it.
async function fetchDiscourse(src) {
  const topics = new Map();
  for (let page = 0; ; page++) {
    const { topic_list: list } = await getJson(`${src.url}/latest.json?no_definitions=true&page=${page}`);
    for (const t of list.topics) topics.set(t.id, t);
    if (!list.more_topics_url || !list.topics.length) break;
  }
  const { categories = [] } = await getJson(`${src.url}/site.json`);
  const categoryName = new Map(categories.map(c => [c.id, c.name]));

  // Every post body, 50 per call, newest first: about 20 calls for the whole
  // forum instead of one per topic.
  const isShown = p => p.post_type === 1 && !p.hidden && !p.deleted_at && !p.user_deleted;
  const threads = new Map(); // topic id → its posts
  let postCount = 0;
  for (let before = null; ; ) {
    const { latest_posts: batch = [] } = await getJson(`${src.url}/posts.json${before ? `?before=${before}` : ''}`);
    if (!batch.length) break;
    for (const p of batch) {
      if (!topics.has(p.topic_id) || !isShown(p)) continue;
      if (!threads.has(p.topic_id)) threads.set(p.topic_id, []);
      threads.get(p.topic_id).push(p);
      postCount++;
    }
    const oldest = Math.min(...batch.map(p => p.id));
    if (before !== null && oldest >= before) break; // no progress: stop, don't loop
    before = oldest;
  }

  // Safety net: fetch a topic directly if its opening post was missed.
  const missing = [...topics.values()].filter(t => !(threads.get(t.id) || []).some(p => p.post_number === 1));
  await mapLimit(missing, 3, async t => {
    const { post_stream: stream } = await getJson(`${src.url}/t/${t.id}.json`);
    threads.set(t.id, (stream?.posts || []).filter(isShown));
  });
  console.log(`  discourse: ${topics.size} topics, ${postCount} posts${missing.length ? ` (+${missing.length} topics fetched one by one)` : ''}`);

  return [...topics.values()].map(t => {
    const thread = (threads.get(t.id) || []).sort((a, b) => a.post_number - b.post_number);
    const opening = thread.find(p => p.post_number === 1);
    return {
      id: `discourse-${t.id}`,
      title: text(t.title),
      content: opening ? plain(opening.cooked) : '',
      // Answers usually live in replies: searchable, but not sent to browsers.
      replies: plain(thread.filter(p => p.post_number > 1).map(p => p.cooked).join(' ')),
      excerpt: t.excerpt ? plain(t.excerpt, 500) : '',
      url: safeUrl(`${src.url}/t/${t.slug}/${t.id}`),
      source: 'forum',
      category: text(categoryName.get(t.category_id)),
      published_at: t.created_at || '',
    };
  });
}

const SOURCE_FETCHERS = { ghost: fetchGhost, bookstack: fetchBookStack, discourse: fetchDiscourse };

// ── Meilisearch REST (unified sites) ──
//
// Plain HTTP rather than the meilisearch package, whose task-waiting API
// differs between versions. This path waits for every task and checks it
// succeeded.
async function meili(method, path, body) {
  if (!meiliKey()) throw new Error('Meilisearch key not set: put MEILI_KEY=... in the .env file next to this script.');
  const res = await fetch(`${meiliHost()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${meiliKey()}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON error page; the raw text goes into the error below
  }
  if (!res.ok) {
    const err = new Error(`Meilisearch ${method} ${path}: ${res.status} ${json?.message || raw.slice(0, 200)}`);
    err.code = json?.code;
    throw err;
  }
  return json;
}

async function meiliTask(method, path, body) {
  const { taskUid } = await meili(method, path, body);
  const started = Date.now();
  for (;;) {
    const task = await meili('GET', `/tasks/${taskUid}`);
    if (task.status === 'succeeded') return task;
    if (task.status === 'failed' || task.status === 'canceled') {
      const err = new Error(`Meilisearch ${task.type} on ${task.indexUid || '-'}: ${task.error?.message || task.status}`);
      err.code = task.error?.code;
      throw err;
    }
    if (Date.now() - started > 10 * 60 * 1000) {
      throw new Error(`Meilisearch task ${taskUid} (${task.type}) still ${task.status} after 10 minutes`);
    }
    await sleep(300);
  }
}

async function indexSize(uid) {
  try {
    return (await meili('GET', `/indexes/${uid}/stats`)).numberOfDocuments;
  } catch (err) {
    if (err.code === 'index_not_found') return 0;
    throw err;
  }
}

async function dropIndex(uid) {
  await meiliTask('DELETE', `/indexes/${uid}`).catch(err => {
    if (err.code !== 'index_not_found') throw err;
  });
}

// Builds the new index beside the live one, then swaps them in one atomic
// step: search never sees a half-built or empty index.
async function replaceIndex(uid, documents, settings) {
  const next = `${uid}_next`;
  await dropIndex(next); // leftover from an interrupted run
  await meiliTask('POST', '/indexes', { uid: next, primaryKey: 'id' });
  await meiliTask('PATCH', `/indexes/${next}/settings`, settings);
  for (let i = 0; i < documents.length; i += 500) {
    await meiliTask('POST', `/indexes/${next}/documents`, documents.slice(i, i + 500));
  }
  const built = await indexSize(next);
  if (built !== documents.length) throw new Error(`new index holds ${built} of ${documents.length} documents`);

  // The swap needs both indexes to exist (first run: create an empty live one).
  await meiliTask('POST', '/indexes', { uid, primaryKey: 'id' }).catch(err => {
    if (err.code !== 'index_already_exists') throw err;
  });
  await meiliTask('POST', '/swap-indexes', [{ indexes: [uid, next] }]);
  await dropIndex(next).catch(err => console.warn(`  swapped, but could not delete ${next}: ${err.message}`));
}

async function indexUnifiedSite(site) {
  try {
    console.log(`\nIndexing ${site.name} (${site.sources.map(s => s.type).join(' + ')})...`);

    const perSource = await Promise.all(site.sources.map(async src => {
      let docs;
      try {
        docs = await SOURCE_FETCHERS[src.type](src);
      } catch (err) {
        throw new Error(`${src.type} (${src.url}): ${err.message}`);
      }
      const untitled = docs.filter(d => !d.title).length;
      if (!docs.length || untitled) {
        throw new Error(`${src.type} (${src.url}): ${docs.length} documents, ${untitled} without a title (response shape changed?)`);
      }
      return docs;
    }));
    const documents = perSource.flat();
    const duplicates = documents.length - new Set(documents.map(d => d.id)).size;
    if (duplicates) throw new Error(`${duplicates} duplicate document ids`);
    const summary = site.sources.map((s, i) => `${perSource[i].length} ${s.type}`).join(', ');

    if (DRY_RUN) {
      console.log(`[dry-run] would index ${documents.length} documents into ${site.indexName}: ${summary}`);
      for (const docs of perSource) {
        const sample = docs[0];
        console.log(`[dry-run] sample ${sample.source}:`, JSON.stringify({
          ...sample,
          content: sample.content.slice(0, 100) + '…',
          ...(sample.replies !== undefined ? { replies: sample.replies.slice(0, 60) + '…' } : {}),
        }, null, 2));
      }
      return;
    }

    const live = await indexSize(site.indexName);
    if (!FORCE && documents.length < live / 2) {
      throw new Error(
        `would shrink ${site.indexName} from ${live} to ${documents.length} documents; ` +
        'if that much content really was removed, run once with --force'
      );
    }

    await replaceIndex(site.indexName, documents, UNIFIED_SETTINGS);
    console.log(`✓ Indexed ${documents.length} documents into ${site.indexName} (${summary}; was ${live})`);
  } catch (error) {
    console.error(`✗ Failed to index ${site.name}: ${error.message} (live index left as it was)`);
  }
}

// ── .env loader ──
// Loaded by hand (not node --env-file) so this works on any Node 18+, run as
// either an ES module or CommonJS.
async function loadDotEnv() {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  let raw;
  try {
    raw = readFileSync(join(dirname(process.argv[1]), '.env'), 'utf8');
  } catch {
    return; // no .env: plain environment only
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await loadDotEnv();

  const selected = ONLY_SITE ? sites.filter(s => s.name === ONLY_SITE) : sites;
  if (!selected.length) throw new Error(`no site named "${ONLY_SITE}" (sites: ${sites.map(s => s.name).join(', ')})`);

  console.log(`Starting multi-site indexing at ${new Date().toISOString()}${DRY_RUN ? ' (dry run — Meilisearch untouched)' : ''}...\n`);

  for (const site of selected) {
    if (site.type === 'strapi') {
      await indexStrapiSite(site);
    } else if (site.type === 'unified') {
      await indexUnifiedSite(site);
    } else {
      console.error(`✗ ${site.name}: unknown site type "${site.type}"`);
    }
  }

  console.log('\n✓ Indexing complete!');
}

main().catch(console.error);

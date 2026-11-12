/**
 * Global Meilisearch Indexer
 * Indexes multiple sites — Ghost sites via the Ghost Content API,
 * aikyamjobs via the Strapi 5 REST API.
 *
 * Run:      node global-indexer.js
 * Dry run:  node global-indexer.js --dry-run
 *           (fetches + builds documents and prints a summary, never touches
 *            Meilisearch — safe to run any time to check the Strapi side)
 *
 * Env vars (optional — or paste the key below on the server copy):
 *   MEILI_HOST — Meilisearch host (default: http://localhost:7700)
 *   MEILI_KEY  — Meilisearch master key
 */

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_KEY  = process.env.MEILI_KEY  || 'REPLACE_WITH_MASTER_KEY';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Site configuration ────────────────────────────────────────────────────────
const sites = [
  // Ghost site template — kept for migrating other Ghost sites (e.g. Pattic's)
  // onto this indexer. Uncomment and fill in to enable. The Content API key is
  // in Ghost admin → Settings → Integrations → (custom integration).
  //
  // {
  //   name: 'example_ghost_site',              // used as site_name + id prefix
  //   indexName: 'example_ghost_site_search',
  //   ghostUrl: 'https://example.com',
  //   ghostKey: 'GHOST_CONTENT_API_KEY',
  // },

  // aikyamjobs — Strapi 5
  {
    name: 'aikyamjobs',
    type: 'strapi',               // <-- tells the indexer to use Strapi instead of Ghost
    indexName: 'aikyamjobs_search',
    strapiUrl: 'https://aikyamjobs.org',
    siteUrl: 'https://aikyamjobs.org',
  },
];

// ── Meilisearch client (lazy, so --dry-run works without the package/key) ────
let client;
async function getClient() {
  if (!client) {
    if (MEILI_KEY === 'REPLACE_WITH_MASTER_KEY') {
      throw new Error('Meilisearch key not set — set MEILI_KEY or paste it into MEILI_KEY at the top of this file.');
    }
    const { MeiliSearch } = await import('meilisearch');
    client = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_KEY });
  }
  return client;
}

// ── Ghost indexer ─────────────────────────────────────────────────────────────
async function indexGhostSite(site) {
  try {
    console.log(`\nIndexing ${site.name}...`);

    const response = await fetch(
      `${site.ghostUrl}/ghost/api/content/posts/?key=${site.ghostKey}&limit=all`
    );

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Ghost API error for ${site.name}: ${response.status}: ${bodyText}`);
    }

    const { posts } = await response.json();

    const documents = posts.map(post => {
      const tags = post.tags ? post.tags.map(tag => tag.name) : [];
      const isFAQ = tags.some(tag => tag.toLowerCase().includes('faq'));

      return {
        id: `${site.name}-post-${post.id}`,
        title: post.title,
        content: post.html ? post.html.replace(/<[^>]*>/g, '').substring(0, 5000) : post.excerpt || '',
        excerpt: post.excerpt || '',
        url: post.url,
        source: 'blog',
        site_name: site.name,
        published_at: post.published_at,
        tags: tags,
        is_faq: isFAQ
      };
    });

    if (DRY_RUN) {
      console.log(`[dry-run] would index ${documents.length} posts from ${site.name}`);
      if (documents[0]) console.log('[dry-run] sample:', JSON.stringify(documents[0], null, 2));
      return;
    }

    const index = (await getClient()).index(site.indexName);

    await index.updateSearchableAttributes(['title', 'content', 'excerpt', 'tags']);
    await index.updateFilterableAttributes(['site_name', 'source', 'is_faq', 'tags']);
    await index.updateSortableAttributes(['published_at']);
    await index.addDocuments(documents);

    console.log(`✓ Indexed ${documents.length} posts from ${site.name}`);
  } catch (error) {
    console.error(`✗ Failed to index ${site.name}:`, error.message);
  }
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Starting multi-site indexing${DRY_RUN ? ' (dry run — Meilisearch untouched)' : ''}...\n`);

  for (const site of sites) {
    if (site.type === 'strapi') {
      await indexStrapiSite(site);
    } else {
      await indexGhostSite(site);
    }
  }

  console.log('\n✓ Indexing complete!');
}

main().catch(console.error);

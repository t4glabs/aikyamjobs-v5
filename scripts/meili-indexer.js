/**
 * aikyamjobs Meilisearch Indexer
 *
 * Replaces the old Ghost-based indexer. Pulls from Strapi instead of
 * the Ghost Content API and indexes jobs, companies, and blogs into
 * the aikyamjobs_search Meilisearch index.
 *
 * Run: node meili-indexer.js
 *
 * Env vars (set in shell or .env):
 *   MEILI_HOST      — Meilisearch host (default: http://localhost:7700)
 *   MEILI_KEY       — Meilisearch master key
 *   STRAPI_URL      — public Strapi base URL (default: https://aikyamjobs.org)
 *   SITE_URL        — public site base URL for building links (default: https://aikyamjobs.org)
 */

import { MeiliSearch } from 'meilisearch';

// ── Config ────────────────────────────────────────────────────────────────────
const MEILI_HOST  = process.env.MEILI_HOST  || 'http://localhost:7700';
const MEILI_KEY   = process.env.MEILI_KEY   || '1RPuQcxxxxxxxxBXXlFo'; // replace with master key
const STRAPI_URL  = process.env.STRAPI_URL  || 'https://aikyamjobs.org';
const SITE_URL    = process.env.SITE_URL    || 'https://aikyamjobs.org';
const INDEX_NAME  = 'aikyamjobs_search'; // same index name as the old Ghost site

const client = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip markdown syntax to plain text for indexing */
function stripMarkdown(text = '') {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')         // remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → keep link text
    .replace(/#{1,6}\s+/g, '')               // headings
    .replace(/[*_~`>]/g, '')                 // bold/italic/strikethrough/code/blockquote
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 3000);
}

/** Fetch every page of a Strapi endpoint, returns all items */
async function fetchAll(path) {
  const PAGE_SIZE = 100;
  let page = 1;
  let all = [];

  while (true) {
    const url = `${STRAPI_URL}/api${path}&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Strapi ${res.status} on ${url}: ${body}`);
    }
    const { data, meta } = await res.json();
    all = all.concat(data);
    if (page >= (meta?.pagination?.pageCount ?? 1)) break;
    page++;
  }

  return all;
}

// ── Fetch and transform each content type ─────────────────────────────────────

async function getJobDocuments() {
  console.log('  Fetching jobs...');
  const jobs = await fetchAll(
    '/jobs' +
    '?populate[company][fields][0]=name' +
    '&populate[categories][fields][0]=name' +
    '&fields[0]=title&fields[1]=slug&fields[2]=excerpt' +
    '&fields[3]=description&fields[4]=location&fields[5]=jobType' +
    '&fields[6]=experienceLevel&fields[7]=skills&fields[8]=featured' +
    '&fields[9]=publishedAt&fields[10]=closingDate'
  );

  return jobs.map(job => ({
    id: `job-${job.id}`,
    type: 'job',
    title: job.attributes.title,
    excerpt: job.attributes.excerpt || '',
    content: stripMarkdown(job.attributes.description),
    url: `${SITE_URL}/jobs/${job.attributes.slug}`,
    // job-specific fields
    location: job.attributes.location || '',
    jobType: job.attributes.jobType || '',
    experienceLevel: job.attributes.experienceLevel || '',
    company: job.attributes.company?.data?.attributes?.name || '',
    categories: (job.attributes.categories?.data || []).map(c => c.attributes.name),
    skills: job.attributes.skills || [],
    featured: !!job.attributes.featured,
    closing_date: job.attributes.closingDate || null,
    published_at: job.attributes.publishedAt || '',
  }));
}

async function getCompanyDocuments() {
  console.log('  Fetching companies...');
  const companies = await fetchAll(
    '/companies' +
    '?fields[0]=name&fields[1]=slug&fields[2]=excerpt' +
    '&fields[3]=description&fields[4]=industry&fields[5]=location&fields[6]=publishedAt'
  );

  return companies.map(c => ({
    id: `company-${c.id}`,
    type: 'company',
    title: c.attributes.name,
    excerpt: c.attributes.excerpt || '',
    content: stripMarkdown(c.attributes.description),
    url: `${SITE_URL}/companies/${c.attributes.slug}`,
    // company-specific fields
    industry: c.attributes.industry || '',
    location: c.attributes.location || '',
    // fill common fields with empty defaults
    jobType: '',
    experienceLevel: '',
    company: '',
    categories: [],
    skills: [],
    featured: false,
    published_at: c.attributes.publishedAt || '',
  }));
}

async function getBlogDocuments() {
  console.log('  Fetching blogs...');
  const blogs = await fetchAll(
    '/blogs' +
    '?fields[0]=title&fields[1]=slug&fields[2]=excerpt' +
    '&fields[3]=content&fields[4]=author&fields[5]=category' +
    '&fields[6]=externalLink&fields[7]=publishedAt'
  );

  return blogs.map(b => ({
    id: `blog-${b.id}`,
    type: 'blog',
    title: b.attributes.title,
    excerpt: b.attributes.excerpt || '',
    content: stripMarkdown(b.attributes.content),
    url: b.attributes.externalLink || `${SITE_URL}/blogs/${b.attributes.slug}`,
    // blog-specific fields
    category: b.attributes.category || '',
    author: b.attributes.author || '',
    // fill common fields
    location: '',
    jobType: '',
    experienceLevel: '',
    company: '',
    categories: [],
    skills: [],
    featured: false,
    published_at: b.attributes.publishedAt || '',
  }));
}

// ── Configure index settings ──────────────────────────────────────────────────

async function configureIndex(index) {
  await index.updateSettings({
    searchableAttributes: [
      'title',      // highest weight — title matches rank first
      'company',    // company name is often what people search for
      'excerpt',
      'categories',
      'skills',
      'location',
      'industry',
      'author',
      'content',    // lowest weight — long body text
    ],
    filterableAttributes: [
      'type',           // job | company | blog
      'jobType',        // full-time | part-time | contract | internship
      'location',
      'featured',
      'categories',
      'company',
      'industry',
    ],
    sortableAttributes: [
      'published_at',
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\naikyamjobs Meilisearch Indexer');
  console.log('━'.repeat(40));
  console.log(`Meilisearch : ${MEILI_HOST}`);
  console.log(`Strapi      : ${STRAPI_URL}`);
  console.log(`Index       : ${INDEX_NAME}`);
  console.log('━'.repeat(40) + '\n');

  // 1. Fetch all content from Strapi
  const [jobs, companies, blogs] = await Promise.all([
    getJobDocuments(),
    getCompanyDocuments(),
    getBlogDocuments(),
  ]);

  const all = [...jobs, ...companies, ...blogs];
  console.log(`\n  Jobs      : ${jobs.length}`);
  console.log(`  Companies : ${companies.length}`);
  console.log(`  Blogs     : ${blogs.length}`);
  console.log(`  Total     : ${all.length}\n`);

  // 2. Configure the index
  const index = client.index(INDEX_NAME);
  console.log('Configuring index settings...');
  await configureIndex(index);
  console.log('  ✓ Settings applied');

  // 3. Replace all documents (full reindex)
  //    deleteAllDocuments first so removed content disappears from search
  console.log('Clearing old documents...');
  await index.deleteAllDocuments();
  console.log('  ✓ Old documents cleared');

  console.log('Uploading documents...');
  const task = await index.addDocuments(all, { primaryKey: 'id' });
  console.log(`  ✓ Upload queued (taskUid: ${task.taskUid})`);

  console.log('\n✓ Indexing complete! Documents will be searchable within seconds.\n');
}

main().catch(err => {
  console.error('\n✗ Indexer failed:', err.message);
  process.exit(1);
});

// Public URL — baked in at build time, used for image URLs in client components
const PUBLIC_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Internal URL — runtime env var (no NEXT_PUBLIC_), server-side API calls bypass nginx
// Set STRAPI_INTERNAL_URL=http://127.0.0.1:1338 in .env.local on the VPS
const INTERNAL_URL = process.env.STRAPI_INTERNAL_URL || PUBLIC_URL;

export function getStrapiMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') && !url.includes('localhost')) return url;
  const path = url.replace(/^https?:\/\/localhost:\d+/, '');
  return `${PUBLIC_URL}${path}`;
}

// --- Strapi v5 -> v4 response shape adapter ---
//
// Strapi 5 flattens REST responses (fields sit directly on the object, no
// `.attributes` wrapper; relations/media are flat objects/arrays too, no
// `.data` wrapper). Every component in this app (345+ call sites across 13
// page/component files, per the migration's own audit) was written against
// the old `{ id, attributes: {...} } }` / `{ data: { id, attributes } }`
// shape, so rather than touch every call site, this chokepoint re-wraps v5's
// flat response back into that old shape before it leaves this file.
// `documentId` is carried alongside `id` for future use but nothing here
// requires it yet.
//
// Components (e.g. Job.requirementChecklist) are deliberately NOT wrapped --
// they were always plain objects/arrays in v4 too (no `.data`, no
// `.attributes`), so they're already compatible as-is. Only relation and
// media fields need wrapping, so each entity wrapper below lists exactly the
// relation/media keys that function's own `populate` query actually fetches.

type AnyRecord = Record<string, any>;

function asRelation(value: any, wrap: (item: AnyRecord) => AnyRecord): any {
  if (value === null || value === undefined) return { data: null };
  if (Array.isArray(value)) return { data: value.map(wrap) };
  return { data: wrap(value) };
}

// For media and any relation whose own sub-relations were never populated by
// the query that fetched it -- just needs the id/documentId/attributes split.
function wrapPlain(flat: AnyRecord): AnyRecord {
  const { id, documentId, ...attributes } = flat;
  return { id, documentId, attributes };
}

function wrapCompany(flat: AnyRecord): AnyRecord {
  const { id, documentId, logo, jobs, ...rest } = flat;
  const attributes: AnyRecord = { ...rest };
  if ('logo' in flat) attributes.logo = asRelation(logo, wrapPlain);
  if ('jobs' in flat) attributes.jobs = asRelation(jobs, wrapPlain);
  return { id, documentId, attributes };
}

function wrapCourseProvider(flat: AnyRecord): AnyRecord {
  const { id, documentId, logo, ...rest } = flat;
  const attributes: AnyRecord = { ...rest };
  if ('logo' in flat) attributes.logo = asRelation(logo, wrapPlain);
  return { id, documentId, attributes };
}

function wrapJob(flat: AnyRecord): AnyRecord {
  const { id, documentId, company, categories, featureImage, socialImage, curatedBy, mindmapPdf, ...rest } =
    flat;
  const attributes: AnyRecord = { ...rest };
  if ('company' in flat) attributes.company = asRelation(company, wrapCompany);
  if ('categories' in flat) attributes.categories = asRelation(categories, wrapPlain);
  if ('featureImage' in flat) attributes.featureImage = asRelation(featureImage, wrapPlain);
  if ('socialImage' in flat) attributes.socialImage = asRelation(socialImage, wrapPlain);
  if ('curatedBy' in flat) attributes.curatedBy = asRelation(curatedBy, wrapPlain);
  if ('mindmapPdf' in flat) attributes.mindmapPdf = asRelation(mindmapPdf, wrapPlain);
  return { id, documentId, attributes };
}

function wrapCourse(flat: AnyRecord): AnyRecord {
  const { id, documentId, provider, fieldOfStudy, featureImage, socialImage, ...rest } = flat;
  const attributes: AnyRecord = { ...rest };
  if ('provider' in flat) attributes.provider = asRelation(provider, wrapCourseProvider);
  if ('fieldOfStudy' in flat) attributes.fieldOfStudy = asRelation(fieldOfStudy, wrapPlain);
  if ('featureImage' in flat) attributes.featureImage = asRelation(featureImage, wrapPlain);
  if ('socialImage' in flat) attributes.socialImage = asRelation(socialImage, wrapPlain);
  return { id, documentId, attributes };
}

function wrapBlog(flat: AnyRecord): AnyRecord {
  const { id, documentId, featuredImage, internalTags, ...rest } = flat;
  const attributes: AnyRecord = { ...rest };
  if ('featuredImage' in flat) attributes.featuredImage = asRelation(featuredImage, wrapPlain);
  if ('internalTags' in flat) attributes.internalTags = asRelation(internalTags, wrapPlain);
  return { id, documentId, attributes };
}

function wrapSiteSetting(flat: AnyRecord): AnyRecord {
  const { id, documentId, logo, ogImage, favicon, ...rest } = flat;
  const attributes: AnyRecord = { ...rest };
  if ('logo' in flat) attributes.logo = asRelation(logo, wrapPlain);
  if ('ogImage' in flat) attributes.ogImage = asRelation(ogImage, wrapPlain);
  if ('favicon' in flat) attributes.favicon = asRelation(favicon, wrapPlain);
  return { id, documentId, attributes };
}

// Applies a per-entity wrapper to a Strapi v5 list response (`{ data: [...],
// meta }`), or to a single flat object (for the one-off site-setting
// single-type response).
function normalizeList(response: AnyRecord, wrap: (item: AnyRecord) => AnyRecord): any {
  if (!response || !Array.isArray(response.data)) return response;
  return { ...response, data: response.data.map(wrap) };
}

function normalizeSingle(response: AnyRecord, wrap: (item: AnyRecord) => AnyRecord): any {
  if (!response || !response.data) return response;
  return { ...response, data: wrap(response.data) };
}

// Public content tolerates brief staleness, so cache every Strapi read in
// Next's Data Cache. All public routes are `force-dynamic` (no Full Route
// Cache), so without this each render — and each RSC prefetch — re-fanned out
// ~15-20 live Strapi calls (categories ×3 pages, /pages ×8, jobs, etc.). Under
// a prefetch burst that overwhelmed the single Strapi process and caused the
// frontend to reset connections (the 503s). The Data Cache works independently
// of route render mode, so dynamic renders now reuse cached data instead.
// 300s keeps a curated board fresh enough; callers can override via `options`
// (e.g. a mutation passing `cache: 'no-store'`). Tune via one constant here.
const REVALIDATE_SECONDS = 300;

export async function fetchAPI(path: string, options: RequestInit = {}) {
  // Cache GET reads; never cache mutations (POST/PUT/DELETE) — setting both a
  // revalidate and no-store would make Next throw, so pick one by method.
  const isMutation = !!options.method && options.method.toUpperCase() !== 'GET';
  const mergedOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...(isMutation ? { cache: 'no-store' } : { next: { revalidate: REVALIDATE_SECONDS } }),
    ...options,
  };

  const url = `${INTERNAL_URL}/api${path}`;
  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getJobs(filters?: {
  search?: string;
  location?: string;
  jobType?: string;
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}) {
  // Strapi 5 treats a bare `populate[x]=*` as a recursive deep-populate of
  // relation `x` (not "just populate `x`" like v4 did) -- it then trips on
  // `x`'s own back-relations/components ("Invalid key jobs at
  // categories.jobs", etc.). `populate[x]=true` is the v5-safe "populate
  // this relation's own fields, no further nesting" form; `[populate]=*` is
  // still fine when deliberately nesting one level deep (company below).
  let query = '/jobs?populate[company][populate]=*&populate[categories]=true&populate[featureImage]=true&populate[socialImage]=true';

  if (filters?.search) {
    query += `&filters[title][$containsi]=${encodeURIComponent(filters.search)}`;
  }

  if (filters?.location) {
    query += `&filters[location][$containsi]=${encodeURIComponent(filters.location)}`;
  }

  if (filters?.jobType) {
    query += `&filters[jobType][$eq]=${encodeURIComponent(filters.jobType)}`;
  }

  if (filters?.category) {
    query += `&filters[categories][slug][$eq]=${encodeURIComponent(filters.category)}`;
  }

  if (filters?.featured) {
    query += `&filters[featured][$eq]=true`;
  }

  query += `&pagination[page]=${filters?.page || 1}`;
  query += `&pagination[pageSize]=${filters?.pageSize || 10}`;
  query += `&sort=createdAt:desc`;

  return normalizeList(await fetchAPI(query), wrapJob);
}

export async function getJob(slug: string) {
  const response = await fetchAPI(`/jobs?filters[slug][$eq]=${slug}&populate[company][populate]=*&populate[categories]=true&populate[featureImage]=true&populate[socialImage]=true&populate[curatedBy][populate]=*&populate[mindmapPdf]=true`);
  return normalizeList(response, wrapJob);
}

// Powers the JD page's "Role at a glance" mindmap. Optional by design: no
// job mindmap, or any failure fetching it, just means no panel -- never a
// broken JD page.
export async function getJobMindmaps(slug: string) {
  try {
    const response = await fetchAPI(`/jobs/${encodeURIComponent(slug)}/mindmap`);
    return response?.data?.job ? response.data : null;
  } catch {
    return null;
  }
}

export async function getCompanies(page = 1, pageSize = 24) {
  const response = await fetchAPI(`/companies?populate[logo]=true&sort=name:asc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
  return normalizeList(response, wrapCompany);
}

export async function getCompany(slug: string) {
  const response = await fetchAPI(`/companies?filters[slug][$eq]=${slug}&populate[logo]=true&populate[jobs]=true`);
  return normalizeList(response, wrapCompany);
}

export async function getCategories() {
  const pageSize = 200;
  const firstPage = await fetchAPI(`/categories?pagination[pageSize]=${pageSize}&pagination[page]=1&sort=name:asc`);
  const pageCount = firstPage.meta?.pagination?.pageCount || 1;

  if (pageCount <= 1) {
    return normalizeList(firstPage, wrapPlain);
  }

  // Categories are created per-org and now exceed a single page — fetch the rest
  // so tags past the first `pageSize` alphabetically don't silently disappear
  // (this caused /tag/[slug] 404s for categories like "swasti").
  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) =>
      fetchAPI(`/categories?pagination[pageSize]=${pageSize}&pagination[page]=${i + 2}&sort=name:asc`)
    )
  );

  return normalizeList(
    {
      ...firstPage,
      data: [firstPage.data, ...remainingPages.map((page) => page.data)].flat(),
    },
    wrapPlain
  );
}

export async function subscribeEmail(data: {
  email: string;
  name?: string;
  skills?: string[];
  locations?: string[];
  impactAreas?: string[];
}) {
  return fetchAPI('/subscribers', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export async function getBlogs(filters?: {
  search?: string;
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}) {
  let query = '/blogs?populate=*';

  if (filters?.search) {
    query += `&filters[title][$containsi]=${encodeURIComponent(filters.search)}`;
  }

  if (filters?.category) {
    query += `&filters[category][$eq]=${encodeURIComponent(filters.category)}`;
  }

  if (filters?.featured) {
    query += `&filters[featured][$eq]=true`;
  }

  query += `&pagination[page]=${filters?.page || 1}`;
  query += `&pagination[pageSize]=${filters?.pageSize || 10}`;
  query += `&sort=publishDate:desc,createdAt:desc`;

  return normalizeList(await fetchAPI(query), wrapBlog);
}

export async function getBlog(slug: string) {
  const response = await fetchAPI(`/blogs?filters[slug][$eq]=${slug}&populate=*`);
  return normalizeList(response, wrapBlog);
}

export async function getSiteSettings() {
  // Cached for 1 hour so dynamic routes (like /search) reuse build-time data
  // instead of re-fetching Strapi on every request and potentially falling back
  // to DEFAULT_NAV_LINKS if Strapi is momentarily slow.
  const url = `${INTERNAL_URL}/api/site-setting?populate=*`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  return normalizeSingle(await response.json(), wrapSiteSetting);
}

export async function getPage(slug: string) {
  const response = await fetchAPI(`/pages?filters[slug][$eq]=${slug}`);
  return normalizeList(response, wrapPlain);
}

export async function getCourses(filters?: {
  search?: string;
  fieldOfStudy?: string;
  courseType?: string;
  mode?: string;
  provider?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}) {
  let query = '/courses?populate[provider][populate]=*&populate[fieldOfStudy]=true&populate[featureImage]=true&populate[socialImage]=true';

  if (filters?.search) {
    // skills is a json column — Strapi can't $containsi into it, so search
    // only covers title and excerpt (same limitation as getJobs' title-only search).
    const term = encodeURIComponent(filters.search);
    query += `&filters[$or][0][title][$containsi]=${term}`;
    query += `&filters[$or][1][excerpt][$containsi]=${term}`;
  }

  if (filters?.fieldOfStudy) {
    query += `&filters[fieldOfStudy][slug][$eq]=${encodeURIComponent(filters.fieldOfStudy)}`;
  }

  if (filters?.courseType) {
    query += `&filters[courseType][$eq]=${encodeURIComponent(filters.courseType)}`;
  }

  if (filters?.mode) {
    query += `&filters[mode][$eq]=${encodeURIComponent(filters.mode)}`;
  }

  if (filters?.provider) {
    query += `&filters[provider][slug][$eq]=${encodeURIComponent(filters.provider)}`;
  }

  if (filters?.featured) {
    query += `&filters[featured][$eq]=true`;
  }

  query += `&pagination[page]=${filters?.page || 1}`;
  query += `&pagination[pageSize]=${filters?.pageSize || 12}`;
  query += `&sort=createdAt:desc`;

  return normalizeList(await fetchAPI(query), wrapCourse);
}

export async function getCourse(slug: string) {
  const response = await fetchAPI(`/courses?filters[slug][$eq]=${slug}&populate[provider][populate]=*&populate[fieldOfStudy]=true&populate[featureImage]=true&populate[socialImage]=true`);
  return normalizeList(response, wrapCourse);
}

export async function getCourseProviders() {
  const response = await fetchAPI('/course-providers?populate[logo]=true&sort=name:asc&pagination[pageSize]=200');
  return normalizeList(response, wrapCourseProvider);
}

export async function getCourseFieldsOfStudy() {
  const response = await fetchAPI('/course-field-of-studies?sort=name:asc&pagination[pageSize]=200');
  return normalizeList(response, wrapPlain);
}

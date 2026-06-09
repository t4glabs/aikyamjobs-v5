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

export async function fetchAPI(path: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
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
  let query = '/jobs?populate[company][populate]=*&populate[categories]=*&populate[ogImage]=*&populate[socialImage]=*';

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

  return fetchAPI(query);
}

export async function getJob(slug: string) {
  return fetchAPI(`/jobs?filters[slug][$eq]=${slug}&populate[company][populate]=*&populate[categories]=*&populate[ogImage]=*&populate[socialImage]=*&populate[curatedBy][populate]=*`);
}

export async function getCompanies() {
  return fetchAPI('/companies?populate=*&sort=name:asc');
}

export async function getCompany(slug: string) {
  return fetchAPI(`/companies?filters[slug][$eq]=${slug}&populate[logo]=*&populate[jobs]=*`);
}

export async function getCategories() {
  return fetchAPI('/categories?pagination[pageSize]=200&sort=name:asc');
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

  return fetchAPI(query);
}

export async function getBlog(slug: string) {
  return fetchAPI(`/blogs?filters[slug][$eq]=${slug}&populate=*`);
}

export async function getSiteSettings() {
  return fetchAPI('/site-setting?populate=*');
}

import { getJobs, getCompanies, getBlogs } from '@/lib/api';
import { Job, Company, Blog } from '@/lib/types';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org';

  try {
    const [jobsResponse, companiesResponse, blogsResponse] = await Promise.all([
      getJobs({ pageSize: 1000 }),
      getCompanies(),
      getBlogs({ pageSize: 1000 }),
    ]);

    const jobs = jobsResponse.data;
    const companies = companiesResponse.data;
    const blogs = blogsResponse.data;

    const staticPages = [
      '',
      '/jobs',
      '/companies',
      '/blogs',
      '/subscribe',
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages.map((page: string) => `
  <url>
    <loc>${siteUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
  ${jobs.map((job: Job) => `
  <url>
    <loc>${siteUrl}/jobs/${job.attributes.slug}</loc>
    <lastmod>${new Date(job.attributes.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
  ${companies.map((company: Company) => `
  <url>
    <loc>${siteUrl}/companies/${company.attributes.slug}</loc>
    <lastmod>${new Date(company.attributes.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  ${blogs.map((blog: Blog) => `
  <url>
    <loc>${siteUrl}/blogs/${blog.attributes.slug}</loc>
    <lastmod>${new Date(blog.attributes.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    return new Response('Error generating sitemap', { status: 500 });
  }
}

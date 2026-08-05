import { getJobs } from '@/lib/api';
import { Job } from '@/lib/types';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*_`>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org';

  try {
    const jobsResponse = await getJobs({ pageSize: 30 });
    const jobs = jobsResponse.data as Job[];

    const items = jobs
      .map((job) => {
        const { title, slug, excerpt, description, company, location, jobType, publishedAt, createdAt } =
          job.attributes;
        const companyName = company?.data?.attributes?.name;
        const summary = stripMarkdown(excerpt || description || '').slice(0, 300);
        const meta = [companyName, location, jobType].filter(Boolean).join(' · ');
        const link = `${siteUrl}/jobs/${slug}`;
        const pubDate = new Date(publishedAt || createdAt).toUTCString();

        return `
  <item>
    <title>${escapeXml(companyName ? `${title} at ${companyName}` : title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(meta ? `${summary} (${meta})` : summary)}</description>
  </item>`;
      })
      .join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>aikyamjobs — Latest Jobs</title>
  <link>${siteUrl}/jobs</link>
  <description>Latest social impact job openings curated by aikyamjobs</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
  ${items}
</channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    });
  } catch (error) {
    return new Response('Error generating RSS feed', { status: 500 });
  }
}

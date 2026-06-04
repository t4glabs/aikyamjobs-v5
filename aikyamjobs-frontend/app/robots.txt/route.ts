export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org';

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

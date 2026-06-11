export const dynamic = 'force-dynamic';

import { permanentRedirect, notFound } from 'next/navigation';
import { getJob, getCompany, getPage } from '@/lib/api';
import { Page, StrapiResponse } from '@/lib/types';
import { generateSEOMetadata } from '@/components/SEO';
import { Metadata } from 'next';
import Markdown from '@/components/Markdown';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res: StrapiResponse<Page[]> = await getPage(slug);
    if (res.data && res.data.length > 0) {
      const page = res.data[0];
      return generateSEOMetadata({
        title: page.attributes.metaTitle || page.attributes.title,
        description: page.attributes.metaDescription || page.attributes.excerpt || page.attributes.title,
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org'}/${slug}`,
      });
    }
  } catch {}
  return {};
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Check if this is a static CMS page (About, Contact, etc.)
  try {
    const res: StrapiResponse<Page[]> = await getPage(slug);
    if (res.data && res.data.length > 0) {
      const page = res.data[0];
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || '';
      const content = strapiUrl
        ? page.attributes.content.replace(/https?:\/\/localhost:\d+\/uploads\//g, `${strapiUrl}/uploads/`)
        : page.attributes.content;

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-12 max-w-3xl">
            <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{page.attributes.title}</h1>
              {page.attributes.excerpt && (
                <p className="text-gray-500 mb-8 text-lg">{page.attributes.excerpt}</p>
              )}
              <div className="border-t border-gray-100 pt-8">
                <Markdown content={content} className="prose max-w-none" />
              </div>
            </div>
          </div>
        </div>
      );
    }
  } catch {}

  // 2. Legacy Ghost URL redirect — remove after old URLs are out of Google's index
  // NOTE: permanentRedirect() throws internally, so it must be called OUTSIDE try/catch
  let redirectTo: string | null = null;

  try {
    const job = await getJob(slug);
    if (job.data && job.data.length > 0) redirectTo = `/jobs/${slug}`;
  } catch {}

  if (!redirectTo) {
    try {
      const company = await getCompany(slug);
      if (company?.data && company.data.length > 0) redirectTo = `/companies/${slug}`;
    } catch {}
  }

  if (redirectTo) permanentRedirect(redirectTo);

  notFound();
}

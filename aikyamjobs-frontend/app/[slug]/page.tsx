export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { getJob } from '@/lib/api';

/**
 * Legacy URL redirect handler
 * Redirects old Ghost URLs (aikyamjobs.org/job-slug) to new format (/jobs/job-slug)
 * Only works for job posts that exist in Strapi
 */
export default async function LegacyJobRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // Check if this slug exists as a job
    const job = await getJob(slug);

    if (job.data && job.data.length > 0) {
      // Redirect to new URL format (301 permanent redirect)
      redirect(`/jobs/${slug}`);
    }
  } catch (error) {
    // If job not found or API error, show 404
    notFound();
  }

  // Fallback 404
  notFound();
}

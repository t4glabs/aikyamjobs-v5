export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getJob } from '@/lib/api';
import { Job, StrapiResponse } from '@/lib/types';
import ApplyClient from '@/components/apply/ApplyClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const jobResponse: StrapiResponse<Job[]> = await getJob(slug);
  const title = jobResponse.data?.[0]?.attributes?.title;
  return {
    title: title ? `Apply · ${title} · aikyamjobs` : 'Apply · aikyamjobs',
    robots: { index: false, follow: false },
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jobResponse: StrapiResponse<Job[]> = await getJob(slug);

  if (!jobResponse.data || jobResponse.data.length === 0) {
    notFound();
  }

  const job = jobResponse.data[0];
  const a = job.attributes;

  // Only gated jobs use this flow. Anything else goes back to the listing,
  // where the external apply button lives.
  if (a.resolvedApplyMode !== 'gated') {
    redirect(`/jobs/${slug}`);
  }

  const checklist = (a.requirementChecklist || []).map((i) => ({
    label: i.label,
    required: i.required,
    weight: i.weight,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/jobs/${slug}`} className="link-brand text-sm font-medium">
            ← Back to job
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <ApplyClient
          jobSlug={slug}
          jobTitle={a.title}
          companyName={job.attributes.company?.data?.attributes?.name}
          location={a.location}
          closingDate={a.closingDate}
          checklist={checklist}
        />
      </div>
    </div>
  );
}

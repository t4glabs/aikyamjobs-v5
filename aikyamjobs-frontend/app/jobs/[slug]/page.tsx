export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getJob, getStrapiMediaUrl } from "@/lib/api";
import { Job, StrapiResponse } from "@/lib/types";
import { notFound } from "next/navigation";
import { generateSEOMetadata } from "@/components/SEO";
import { Metadata } from "next";
import Markdown from "@/components/Markdown";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const jobResponse: StrapiResponse<Job[]> = await getJob(slug);

  if (!jobResponse.data || jobResponse.data.length === 0) {
    return {};
  }

  const job = jobResponse.data[0];
  const company = job.attributes.company?.data;

  const title = job.attributes.metaTitle || `${job.attributes.title} at ${company?.attributes.name || 'Company'}`;
  const description = job.attributes.metaDescription || `${job.attributes.title} position at ${company?.attributes.name}. ${job.attributes.location ? `Location: ${job.attributes.location}` : ''} Apply now!`;
  const keywords = job.attributes.keywords || [
    job.attributes.title,
    company?.attributes.name || '',
    job.attributes.location || '',
    job.attributes.jobType,
    'jobs',
    'public interest technology',
    'aikyam jobs'
  ].filter(Boolean);

  const ogImage = getStrapiMediaUrl(
    job.attributes.socialImage?.data?.attributes?.url ||
    job.attributes.featureImage?.data?.attributes?.url ||
    company?.attributes.featureImage?.data?.attributes?.url
  ) || undefined;

  return generateSEOMetadata({
    title,
    description,
    keywords,
    ogImage,
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org'}/jobs/${slug}`,
  });
}

export default async function JobDetailPage({
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
  const company = job.attributes.company?.data;

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  const description = strapiUrl
    ? (job.attributes.description || '').replace(/https?:\/\/localhost:\d+\/uploads\//g, `${strapiUrl}/uploads/`)
    : (job.attributes.description || '');

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/jobs" className="link-brand text-sm font-medium">
            ← Back to all jobs
          </Link>
        </div>
      </div>

      {/* Job Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex gap-4 min-w-0">
                  {company?.attributes.logo?.data ? (
                    <img
                      src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                      alt=""
                      className="w-11 h-11 flex-none object-contain rounded-md border border-gray-200"
                    />
                  ) : (
                    <span className="w-11 h-11 flex-none flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-base font-semibold text-gray-500">
                      {company?.attributes.name?.charAt(0) ?? '·'}
                    </span>
                  )}
                  <div className="min-w-0">
                    {company && (
                      <Link
                        href={`/companies/${company.attributes.slug}`}
                        className="text-sm font-medium text-gray-600 hover:text-brand inline-block mb-1"
                      >
                        {company.attributes.name}
                      </Link>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                      {job.attributes.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                      {job.attributes.location && <span>{job.attributes.location}</span>}
                      <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                      <span>{job.attributes.jobType}</span>
                      {job.attributes.experienceLevel && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>{job.attributes.experienceLevel} level</span>
                        </>
                      )}
                      {job.attributes.salary && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>{job.attributes.salary}</span>
                        </>
                      )}
                      {job.attributes.closingDate && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>
                            Closes {new Date(job.attributes.closingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {job.attributes.featured && (
                  <span className="flex-none rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                    Featured
                  </span>
                )}
              </div>

              {/* Render content as Markdown (converted from Ghost HTML) */}
              <Markdown
                content={description}
                className="prose mb-8 text-gray-800 leading-relaxed"
              />

              {job.attributes.skills && job.attributes.skills.length > 0 && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.attributes.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.attributes.categories?.data && job.attributes.categories.data.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.attributes.categories.data.map((category) => (
                      <Link
                        key={category.id}
                        href={`/tag/${category.attributes.slug}`}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                      >
                        {category.attributes.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              {/* Apply Button */}
              {(job.attributes.applicationUrl || job.attributes.applicationEmail) && (
                <div className="mb-6">
                  {job.attributes.applicationUrl ? (
                    <a
                      href={job.attributes.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
                    >
                      Apply now →
                    </a>
                  ) : job.attributes.applicationEmail ? (
                    <a
                      href={`mailto:${job.attributes.applicationEmail}`}
                      className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
                    >
                      Apply via email →
                    </a>
                  ) : null}
                </div>
              )}

              <div className="space-y-4 text-sm">
                {job.attributes.impactArea && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Impact Area</h4>
                    <p className="text-gray-700">{job.attributes.impactArea}</p>
                  </div>
                )}

                {job.attributes.location && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                    <p className="text-gray-700">{job.attributes.location}</p>
                  </div>
                )}

                {job.attributes.jobType && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Job Type</h4>
                    <p className="text-gray-700 capitalize">{job.attributes.jobType}</p>
                  </div>
                )}

                {job.attributes.experienceLevel && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Experience Level</h4>
                    <p className="text-gray-700 capitalize">{job.attributes.experienceLevel}</p>
                  </div>
                )}

                {job.attributes.salary && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Salary</h4>
                    <p className="text-gray-700">{job.attributes.salary}</p>
                  </div>
                )}

                {job.attributes.closingDate && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Application Deadline</h4>
                    <p className="text-gray-700">
                      {new Date(job.attributes.closingDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Posted On</h4>
                  <p className="text-gray-700">
                    {new Date(job.attributes.publishedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Company Info */}
              {company && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">About the Company</h4>
                  <div className="flex items-center gap-3 mb-2">
                    {company.attributes.logo?.data && (
                      <img
                        src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                        alt={company.attributes.name}
                        className="w-10 h-10 object-contain rounded border border-gray-100 flex-shrink-0"
                      />
                    )}
                    <p className="font-semibold text-gray-900">{company.attributes.name}</p>
                  </div>
                  {company.attributes.excerpt && (
                    <p className="text-sm text-gray-600 mb-3">
                      {company.attributes.excerpt.length > 150
                        ? company.attributes.excerpt.slice(0, 150) + '…'
                        : company.attributes.excerpt}
                    </p>
                  )}
                  {company.attributes.industry && (
                    <p className="text-sm text-gray-600 mb-3">{company.attributes.industry}</p>
                  )}
                  <Link
                    href={`/companies/${company.attributes.slug}`}
                    className="link-brand text-sm"
                  >
                    Read more →
                  </Link>
                </div>
              )}

              {/* Curated By */}
              {job.attributes.curatedBy?.data && (() => {
                const curator = job.attributes.curatedBy!.data!.attributes;
                const avatarUrl = getStrapiMediaUrl(curator.avatar?.data?.attributes?.url);
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Curated by</p>
                    <div className="flex items-center gap-2">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={curator.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0 text-brand font-semibold text-xs">
                          {curator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-800">{curator.name}</p>
                    </div>
                    {curator.bio && (
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{curator.bio}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

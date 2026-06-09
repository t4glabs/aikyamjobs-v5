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
    job.attributes.ogImage?.data?.attributes?.url ||
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
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-mono text-sm font-medium">
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
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {job.attributes.title}
              </h1>

              {company && (
                <Link
                  href={`/companies/${company.attributes.slug}`}
                  className="text-lg text-gray-700 font-semibold hover:text-blue-600 mb-4 inline-block"
                >
                  {company.attributes.name}
                </Link>
              )}

              <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
                {job.attributes.featured && (
                  <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full font-mono text-xs">
                    ⭐ Featured
                  </span>
                )}
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-mono text-xs">
                  {job.attributes.jobType}
                </span>
                {job.attributes.location && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-mono text-xs">
                    📍 {job.attributes.location}
                  </span>
                )}
                {job.attributes.experienceLevel && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-mono text-xs">
                    {job.attributes.experienceLevel} level
                  </span>
                )}
                {job.attributes.salary && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-mono text-xs">
                    {job.attributes.salary}
                  </span>
                )}
              </div>

              {/* Render content as Markdown (converted from Ghost HTML) */}
              <Markdown
                content={description}
                className="prose max-w-none mb-8 text-gray-800 leading-relaxed"
              />

              {job.attributes.skills && job.attributes.skills.length > 0 && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 font-mono">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.attributes.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-mono text-xs border border-blue-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.attributes.categories?.data && job.attributes.categories.data.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 font-mono">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.attributes.categories.data.map((category) => (
                      <Link
                        key={category.id}
                        href={`/tag/${category.attributes.slug}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-mono text-xs hover:bg-gray-200 transition"
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
                      className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Apply Now →
                    </a>
                  ) : job.attributes.applicationEmail ? (
                    <a
                      href={`mailto:${job.attributes.applicationEmail}`}
                      className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Apply via Email →
                    </a>
                  ) : null}
                </div>
              )}

              <div className="space-y-4 text-sm">
                {job.attributes.impactArea && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Impact Area</h4>
                    <p className="text-gray-700">{job.attributes.impactArea}</p>
                  </div>
                )}

                {job.attributes.location && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Location</h4>
                    <p className="text-gray-700">{job.attributes.location}</p>
                  </div>
                )}

                {job.attributes.jobType && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Job Type</h4>
                    <p className="text-gray-700 capitalize">{job.attributes.jobType}</p>
                  </div>
                )}

                {job.attributes.experienceLevel && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Experience Level</h4>
                    <p className="text-gray-700 capitalize">{job.attributes.experienceLevel}</p>
                  </div>
                )}

                {job.attributes.salary && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Salary</h4>
                    <p className="text-gray-700">{job.attributes.salary}</p>
                  </div>
                )}

                {job.attributes.closingDate && (
                  <div>
                    <h4 className="font-mono font-semibold text-gray-900 mb-1">Application Deadline</h4>
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
                  <h4 className="font-mono font-semibold text-gray-900 mb-1">Posted On</h4>
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
                  <h4 className="font-mono font-semibold text-gray-900 mb-3">About the Company</h4>
                  <Link
                    href={`/companies/${company.attributes.slug}`}
                    className="flex items-center gap-3 hover:text-blue-600 mb-2"
                  >
                    {company.attributes.logo?.data && (
                      <img
                        src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                        alt={company.attributes.name}
                        className="w-10 h-10 object-contain rounded border border-gray-100 flex-shrink-0"
                      />
                    )}
                    <p className="font-semibold text-gray-900">{company.attributes.name}</p>
                  </Link>
                  {company.attributes.location && (
                    <p className="text-sm text-gray-600 mb-2">📍 {company.attributes.location}</p>
                  )}
                  {company.attributes.industry && (
                    <p className="text-sm text-gray-600 mb-3">{company.attributes.industry}</p>
                  )}
                  {company.attributes.website && (
                    <a
                      href={company.attributes.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 font-mono"
                    >
                      Visit Website →
                    </a>
                  )}
                </div>
              )}

              {/* Curated By */}
              {job.attributes.curatedBy?.data && (() => {
                const curator = job.attributes.curatedBy!.data!.attributes;
                const avatarUrl = getStrapiMediaUrl(curator.avatar?.data?.attributes?.url);
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-400 font-mono mb-2">Curated by</p>
                    <div className="flex items-center gap-2">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={curator.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-semibold text-xs">
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

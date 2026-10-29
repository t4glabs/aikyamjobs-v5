export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { getCompany, getCompanyMindmap, getStrapiMediaUrl } from "@/lib/api";
import { Company, MindmapNode, StrapiResponse } from "@/lib/types";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import CompanyWebsiteLink from "@/components/CompanyWebsiteLink";
import MindmapPanel from "@/components/MindmapPanel";
import { Fragment } from "react";

// "https://www.ekjutindia.org/about" -> "ekjutindia.org"; falls back to a
// plain label for anything that doesn't parse as a URL.
function websiteLabel(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, '') || 'Website';
  } catch {
    return 'Website';
  }
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [companyResponse, orgMap]: [StrapiResponse<Company[]>, MindmapNode | null] = await Promise.all([
    getCompany(slug),
    getCompanyMindmap(slug),
  ]);

  if (!companyResponse.data || companyResponse.data.length === 0) {
    notFound();
  }

  const company = companyResponse.data[0];
  const facts = [company.attributes.location, company.attributes.size, company.attributes.industry].filter(
    (f): f is string => Boolean(f)
  );
  // Newest first, same as /jobs.
  const openJobs = [...(company.attributes.jobs?.data ?? [])].sort(
    (a, b) => new Date(b.attributes.publishedAt).getTime() - new Date(a.attributes.publishedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/companies" className="link-brand font-medium">
            ← Back to all companies
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            {/* Header mirrors the JD page's: logo tile, title, dot-separated
                facts. The website is a secondary action here (brand red is
                kept for Apply), so it's a quiet outlined button showing the
                actual domain rather than a generic "Visit Website". */}
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-200 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4 min-w-0">
                {company.attributes.logo?.data ? (
                  <Image
                    src={getStrapiMediaUrl(company.attributes.logo.data.attributes.url)}
                    alt=""
                    width={56}
                    height={56}
                    className="w-14 h-14 flex-none object-contain rounded-md border border-gray-200"
                  />
                ) : (
                  <span className="w-14 h-14 flex-none flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-lg font-semibold text-gray-500">
                    {company.attributes.name?.charAt(0) ?? '·'}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    {company.attributes.name}
                  </h1>
                  {facts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                      {facts.map((fact, i) => (
                        <Fragment key={i}>
                          {i > 0 && <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />}
                          <span>{fact}</span>
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {company.attributes.website && (
                <CompanyWebsiteLink
                  href={company.attributes.website}
                  companySlug={company.attributes.slug}
                  className="inline-flex flex-none items-center gap-1.5 self-start rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {websiteLabel(company.attributes.website)}
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 3.5H3.5v9h9v-3M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </CompanyWebsiteLink>
              )}
            </div>

            {orgMap && (
              <MindmapPanel
                views={[{ key: 'org', heading: 'Organisation at a glance', tree: orgMap }]}
                event="Company Mindmap Used"
                eventProps={{ company_slug: company.attributes.slug }}
              />
            )}

            {company.attributes.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <Markdown
                  content={company.attributes.description}
                  className="prose"
                />
              </div>
            )}
          </div>

          {/* Only published jobs come back from the populate (expired ones are
              unpublished by the cron), so this is the org's live openings. */}
          <div id="open-positions" className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Open Positions</h2>
              {openJobs.length > 0 && (
                <span className="text-sm text-gray-600">
                  {openJobs.length} {openJobs.length === 1 ? 'role' : 'roles'}
                </span>
              )}
            </div>

            {openJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {openJobs.map((job) => {
                  const facts = [job.attributes.location, job.attributes.salary, job.attributes.experienceLevel].filter(Boolean);
                  return (
                    <div
                      key={job.id}
                      className="relative flex flex-col rounded-lg border border-gray-200 p-5 transition hover:border-gray-300 hover:shadow-sm"
                    >
                      <Link
                        href={`/jobs/${job.attributes.slug}`}
                        prefetch={false}
                        className="absolute inset-0 rounded-lg z-0"
                        aria-label={job.attributes.title}
                      />
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold tracking-tight leading-snug text-gray-900">
                          {job.attributes.title}
                        </h3>
                        {job.attributes.featured && (
                          <span className="flex-none rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                            Featured
                          </span>
                        )}
                      </div>
                      {facts.length > 0 && (
                        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                          {facts.map((fact, i) => (
                            <Fragment key={i}>
                              {i > 0 && <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />}
                              <span>{fact}</span>
                            </Fragment>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        {job.attributes.jobType && (
                          <Link
                            href={`/jobs?jobType=${encodeURIComponent(job.attributes.jobType)}`}
                            prefetch={false}
                            className="relative z-10 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                          >
                            {job.attributes.jobType}
                          </Link>
                        )}
                        {job.attributes.closingDate && (
                          <span className="text-[13px] text-gray-600">
                            Closes {new Date(job.attributes.closingDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="text-gray-600">
                  No open roles at {company.attributes.name} right now.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <Link href="/jobs" className="inline-flex items-center h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-900 hover:bg-gray-50">
                    Browse all jobs
                  </Link>
                  <Link href="/subscribe" className="btn-brand inline-flex items-center h-10 rounded-md px-4 text-sm">
                    Get job alerts
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

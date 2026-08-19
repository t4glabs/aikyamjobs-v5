export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getJobs, getStrapiMediaUrl } from "@/lib/api";
import { Job, StrapiResponse } from "@/lib/types";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const location = typeof params.location === 'string' ? params.location : undefined;
  const jobType = typeof params.jobType === 'string' ? params.jobType : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

  const jobsResponse: StrapiResponse<Job[]> = await getJobs({
    search,
    location,
    jobType,
    category,
    page,
    pageSize: 12,
  });

  const jobs = jobsResponse.data;
  const pagination = jobsResponse.meta.pagination;

  // Active filters, as removable chips. Each href drops one key and resets paging.
  const activeFilters = [
    search && { key: 'search', label: search },
    location && { key: 'location', label: location },
    jobType && { key: 'jobType', label: jobType },
    category && { key: 'category', label: category },
  ].filter(Boolean) as { key: string; label: string }[];

  const hrefWithout = (key: string) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => k !== key && k !== 'page' && typeof v === 'string') as [string, string][]
    );
    const qs = next.toString();
    return qs ? `/jobs?${qs}` : '/jobs';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header + Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-5">
          <form method="get" className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-shrink-0 md:mr-4">
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">All jobs</h1>
                <p className="text-sm text-gray-600 mt-0.5">{pagination?.total || 0} curated roles</p>
              </div>

              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600">Keyword</span>
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Title, skill or organisation"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                />
              </label>

              <label className="flex flex-col gap-1.5 md:w-40">
                <span className="text-xs font-semibold text-gray-600">Location</span>
                <input
                  type="text"
                  name="location"
                  defaultValue={location}
                  placeholder="Anywhere"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                />
              </label>

              <label className="flex flex-col gap-1.5 md:w-40">
                <span className="text-xs font-semibold text-gray-600">Type</span>
                <select
                  name="jobType"
                  defaultValue={jobType}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <option value="">All types</option>
                  <option value="full-time">Full time</option>
                  <option value="part-time">Part time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="fellowship">Fellowship</option>
                </select>
              </label>

              <button
                type="submit"
                className="btn-brand h-10 rounded-md px-5 text-sm md:w-auto"
              >
                Filter
              </button>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {pagination?.total || 0} matching roles
                </span>
                {activeFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={hrefWithout(f.key)}
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-gray-800 transition hover:bg-gray-200"
                  >
                    {f.label}
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">Remove filter</span>
                  </Link>
                ))}
                <Link href="/jobs" className="text-[13px] font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900">
                  Clear all
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="container mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-lg font-semibold text-gray-900">No jobs match these filters</p>
            <p className="mt-1.5 text-sm text-gray-600">Try widening the location, or get an email when something new is posted.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/jobs" className="inline-flex items-center h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-900 hover:bg-gray-50">
                Clear filters
              </Link>
              <Link href="/subscribe" className="btn-brand inline-flex items-center h-10 rounded-md px-4 text-sm">
                Get job alerts
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="relative flex flex-col bg-white border border-gray-200 rounded-lg p-6 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <Link
                    href={`/jobs/${job.attributes.slug}`}
                    className="absolute inset-0 rounded-lg z-0"
                    aria-label={job.attributes.title}
                  />

                  {/* organisation + featured */}
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {job.attributes.company?.data?.attributes.logo?.data ? (
                        <img
                          src={getStrapiMediaUrl(job.attributes.company.data.attributes.logo.data.attributes.url)}
                          alt=""
                          className="w-8 h-8 object-contain rounded-md border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
                          {job.attributes.company?.data?.attributes.name?.charAt(0) ?? '·'}
                        </span>
                      )}
                      {job.attributes.company?.data && (
                        <span className="truncate text-sm font-medium text-gray-600">
                          {job.attributes.company.data.attributes.name}
                        </span>
                      )}
                    </div>
                    {job.attributes.featured && (
                      <span className="flex-none rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* role */}
                  <h2 className="mb-2.5 text-[19px] font-semibold tracking-tight leading-snug text-gray-900">
                    {job.attributes.title}
                  </h2>

                  {/* facts, not filters */}
                  <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                    {job.attributes.location && <span>{job.attributes.location}</span>}
                    {job.attributes.salary && (
                      <>
                        <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                        <span>{job.attributes.salary}</span>
                      </>
                    )}
                    {job.attributes.experienceLevel && (
                      <>
                        <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                        <span>{job.attributes.experienceLevel}</span>
                      </>
                    )}
                  </div>

                  {job.attributes.excerpt && (
                    <p className="mb-4 text-[15px] leading-relaxed text-gray-700 line-clamp-3">
                      {job.attributes.excerpt}
                    </p>
                  )}

                  {/* clickable filters, one style */}
                  <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3.5">
                    <Link
                      href={`/jobs?jobType=${encodeURIComponent(job.attributes.jobType)}`}
                      className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                    >
                      {job.attributes.jobType}
                    </Link>
                    {job.attributes.skills?.slice(0, 2).map((skill, index) => (
                      <Link
                        key={index}
                        href={`/jobs?search=${encodeURIComponent(skill)}`}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                      >
                        {skill}
                      </Link>
                    ))}
                    {job.attributes.skills && job.attributes.skills.length > 2 && (
                      <span className="px-1 text-[13px] text-gray-600">
                        +{job.attributes.skills.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pageCount > 1 && (
              <div className="flex items-center justify-center gap-8 mt-10 text-sm">
                {page > 1 ? (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...params as any, page: (page - 1).toString() })}`}
                    className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center min-h-11 px-1 text-gray-300">← Previous</span>
                )}
                <span className="text-gray-600">{page} of {pagination.pageCount}</span>
                {page < pagination.pageCount ? (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
                    className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="inline-flex items-center min-h-11 px-1 text-gray-300">Next →</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

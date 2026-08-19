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

  return (
    <div className="min-h-screen bg-background">
      {/* Header + Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">All Jobs</h1>
              <p className="text-sm text-gray-400 mt-0.5">{pagination?.total || 0} opportunities</p>
            </div>
            <form method="get" className="flex flex-col md:flex-row gap-2 flex-1 md:justify-end">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search title or skill..."
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400 w-full md:w-48"
              />
              <input
                type="text"
                name="location"
                defaultValue={location}
                placeholder="Location"
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400 w-full md:w-36"
              />
              <select
                name="jobType"
                defaultValue={jobType}
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 w-full md:w-36"
              >
                <option value="">All types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="fellowship">Fellowship</option>
              </select>
              <button
                type="submit"
                className="btn-brand px-4 py-1.5 text-sm rounded-lg"
              >
                Filter
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="container mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-xl text-gray-600">No jobs found matching your criteria.</p>
            <Link href="/jobs" className="link-brand mt-4 inline-block">
              Clear filters
            </Link>
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
                    className="text-gray-600 hover:text-gray-900 transition"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="text-gray-300">← Previous</span>
                )}
                <span className="text-gray-400">{page} of {pagination.pageCount}</span>
                {page < pagination.pageCount ? (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
                    className="text-gray-600 hover:text-gray-900 transition"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="text-gray-300">Next →</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

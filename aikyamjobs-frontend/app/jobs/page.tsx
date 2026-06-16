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
    <div className="min-h-screen bg-gray-50">
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
                  className="relative bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition flex flex-col"
                >
                  <Link
                    href={`/jobs/${job.attributes.slug}`}
                    className="absolute inset-0 rounded-lg z-0"
                    aria-label={job.attributes.title}
                  />
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <h2 className="text-xl font-bold text-gray-900 flex-1">
                        {job.attributes.title}
                      </h2>
                      {job.attributes.featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                          Featured
                        </span>
                      )}
                    </div>
                    {job.attributes.company?.data && (
                      <div className="flex items-center gap-2 mb-3">
                        {job.attributes.company.data.attributes.logo?.data && (
                          <img
                            src={getStrapiMediaUrl(job.attributes.company.data.attributes.logo.data.attributes.url)}
                            alt={job.attributes.company.data.attributes.name}
                            className="w-8 h-8 object-contain rounded border border-gray-100 flex-shrink-0"
                          />
                        )}
                        <p className="text-gray-700 font-medium">
                          {job.attributes.company.data.attributes.name}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Link
                        href={`/jobs?jobType=${encodeURIComponent(job.attributes.jobType)}`}
                        className="relative z-10 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full hover:bg-blue-200 transition"
                      >
                        {job.attributes.jobType}
                      </Link>
                      {job.attributes.location && (
                        <Link
                          href={`/jobs?location=${encodeURIComponent(job.attributes.location)}`}
                          className="relative z-10 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full hover:bg-gray-200 transition"
                        >
                          📍 {job.attributes.location}
                        </Link>
                      )}
                      {job.attributes.experienceLevel && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {job.attributes.experienceLevel}
                        </span>
                      )}
                    </div>
                    {job.attributes.salary && (
                      <p className="text-sm text-gray-600 mb-2">
                        💰 {job.attributes.salary}
                      </p>
                    )}
                    {job.attributes.excerpt && (
                      <p className="text-sm text-gray-600">
                        {job.attributes.excerpt.length > 300 ? job.attributes.excerpt.slice(0, 300) + '…' : job.attributes.excerpt}
                      </p>
                    )}
                  </div>
                  {job.attributes.skills && job.attributes.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                      {job.attributes.skills.slice(0, 4).map((skill, index) => (
                        <Link
                          key={index}
                          href={`/jobs?search=${encodeURIComponent(skill)}`}
                          className="relative z-10 text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition"
                        >
                          {skill}
                        </Link>
                      ))}
                      {job.attributes.skills.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{job.attributes.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
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

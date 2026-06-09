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
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">All Jobs</h1>
          <p className="text-gray-600 mt-2">
            {pagination?.total || 0} opportunities available
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by title or skill..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 placeholder:text-gray-600"
            />
            <input
              type="text"
              name="location"
              defaultValue={location}
              placeholder="Location"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 placeholder:text-gray-600"
            />
            <select
              name="jobType"
              defaultValue={jobType}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
            >
              <option value="">All Job Types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </form>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="container mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-xl text-gray-600">No jobs found matching your criteria.</p>
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.attributes.slug}`}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition flex flex-col"
                >
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
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {job.attributes.jobType}
                      </span>
                      {job.attributes.location && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          📍 {job.attributes.location}
                        </span>
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
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                      {job.attributes.skills.slice(0, 4).map((skill, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.attributes.skills.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{job.attributes.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pageCount > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...params as any, page: (page - 1).toString() })}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Page {page} of {pagination.pageCount}
                </span>
                {page < pagination.pageCount && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

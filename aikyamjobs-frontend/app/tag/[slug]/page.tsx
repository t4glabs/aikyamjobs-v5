export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getJobs, getCategories, getStrapiMediaUrl } from "@/lib/api";
import { Job, Category, StrapiResponse } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // Get all categories to find the current one
    const categoriesResponse: StrapiResponse<Category[]> = await getCategories();
    const category = categoriesResponse.data.find(
      (cat) => cat.attributes.slug === slug
    );

    // If category doesn't exist at all, show 404
    if (!category) {
      notFound();
    }

    // Get jobs for this category
    const jobsResponse: StrapiResponse<Job[]> = await getJobs({
      category: slug,
      pageSize: 100,
    });

    const jobs = jobsResponse.data;

    // Find related tags (tags that appear together with current tag in jobs)
    const relatedTagIds = new Set<number>();
    jobs.forEach(job => {
      job.attributes.categories?.data?.forEach(cat => {
        if (cat.id !== category.id) { // Exclude current tag
          relatedTagIds.add(cat.id);
        }
      });
    });

    // Get related categories
    let displayCategories = categoriesResponse.data
      .filter(cat => relatedTagIds.has(cat.id))
      .slice(0, 15);

    // If not enough related tags, add popular tags
    if (displayCategories.length < 10) {
      // Get all jobs to calculate tag popularity
      const allJobsResponse: StrapiResponse<Job[]> = await getJobs({ pageSize: 200 });
      const allJobs = allJobsResponse.data;

      // Count jobs per category
      const categoryJobCount = new Map<number, number>();
      allJobs.forEach(job => {
        job.attributes.categories?.data?.forEach(cat => {
          categoryJobCount.set(cat.id, (categoryJobCount.get(cat.id) || 0) + 1);
        });
      });

      // Add popular tags that aren't already in the list
      const existingIds = new Set([category.id, ...displayCategories.map(c => c.id)]);
      const popularTags = categoriesResponse.data
        .filter(cat => !existingIds.has(cat.id) && (categoryJobCount.get(cat.id) || 0) > 0)
        .sort((a, b) => (categoryJobCount.get(b.id) || 0) - (categoryJobCount.get(a.id) || 0))
        .slice(0, 15 - displayCategories.length);

      displayCategories = [...displayCategories, ...popularTags];
    }

    // Always include current category at the beginning
    displayCategories = [category, ...displayCategories];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
            <span>→</span>
            <Link href="/jobs" className="hover:text-brand">
              Jobs
            </Link>
            <span>→</span>
            <span className="text-gray-900">Tag: {category.attributes.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {category.attributes.name}
          </h1>
          <p className="text-gray-600 mt-2">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
          </p>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="container mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-xl text-gray-600 mb-4">
              No jobs found in this category yet.
            </p>
            <Link
              href="/jobs"
              className="link-brand font-semibold"
            >
              Browse all jobs →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.attributes.slug}`}
                className="flex flex-col bg-white border border-gray-200 rounded-lg p-6 transition hover:border-gray-300 hover:shadow-sm"
              >
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

                <h2 className="mb-2.5 text-[19px] font-semibold tracking-tight leading-snug text-gray-900">
                  {job.attributes.title}
                </h2>

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

                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3.5">
                  <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800">
                    {job.attributes.jobType}
                  </span>
                  {job.attributes.skills?.slice(0, 2).map((skill, index) => (
                    <span
                      key={index}
                      className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.attributes.skills && job.attributes.skills.length > 2 && (
                    <span className="px-1 text-[13px] text-gray-600">
                      +{job.attributes.skills.length - 2}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Related Tags Section */}
      <div className="container mx-auto px-4 pb-12">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Related Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/tag/${cat.attributes.slug}`}
                className={`inline-flex items-center h-9 px-4 rounded-md text-sm transition ${
                  cat.id === category.id
                    ? 'btn-brand'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.attributes.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/jobs"
              className="link-brand text-sm"
            >
              View all jobs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    notFound();
  }
}

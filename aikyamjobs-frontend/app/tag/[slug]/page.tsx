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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
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
        )}
      </div>

      {/* Related Tags Section */}
      <div className="container mx-auto px-4 pb-12">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Related Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/tag/${cat.attributes.slug}`}
                className={`px-4 py-2 rounded-full font-mono text-sm transition ${
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
              className="link-brand font-mono text-sm"
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

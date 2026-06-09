export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getJobs, getCategories, getBlogs, getSiteSettings, getStrapiMediaUrl } from "@/lib/api";
import { Job, Category, Blog, StrapiResponse, SiteSettings } from "@/lib/types";

export default async function Home() {
  const [jobsResponse, categoriesResponse, blogsResponse, settingsResponse]: [
    StrapiResponse<Job[]>,
    StrapiResponse<Category[]>,
    StrapiResponse<Blog[]> | null,
    { data: SiteSettings } | null
  ] = await Promise.all([
    getJobs({ pageSize: 12 }),
    getCategories(),
    getBlogs({ pageSize: 6 }).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  const jobs = jobsResponse.data;
  const allCategories = categoriesResponse.data;
  const blogs = blogsResponse?.data || [];

  // Default settings if not configured in Strapi
  const settings = settingsResponse?.data?.attributes || {
    heroTitle: "Discover your dream job in public interest technology",
    heroSubtitle: "Browse opportunities to solve pressing problems with your tech and design skills",
    jobsSectionTitle: "Latest Opportunities",
    jobsLayoutType: "grid" as const,
    jobsGridColumns: 3,
    blogsSectionTitle: "Latest from our Blog",
    blogsLayoutType: "grid" as const,
    blogsGridColumns: 3,
    showJobsOnHomepage: true,
    showBlogsOnHomepage: true,
    homepageJobsLimit: 12,
    homepageBlogsLimit: 6,
    homepageTagsLimit: 10,
  };

  // Get top N categories by counting jobs in each
  const categoriesWithJobCount = allCategories.map(category => ({
    ...category,
    jobCount: jobs.filter(job =>
      job.attributes.categories?.data?.some(cat => cat.id === category.id)
    ).length
  }));

  // Sort by job count and take top N (from settings)
  const categories = categoriesWithJobCount
    .filter(cat => cat.jobCount > 0) // Only show categories with jobs
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, settings.homepageTagsLimit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
              {settings.heroTitle}
            </h1>
            {settings.heroSubtitle && (
              <p className="text-lg text-gray-600 text-center mb-8">
                {settings.heroSubtitle}
              </p>
            )}

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <Link
                href="/jobs"
                className="px-5 py-2 bg-blue-600 text-white rounded-full font-mono text-sm hover:bg-blue-700 transition"
              >
                All
              </Link>
              <Link
                href="/jobs?jobType=remote"
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
              >
                Remote
              </Link>
              <Link
                href="/jobs?location=Delhi"
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
              >
                Delhi
              </Link>
              <Link
                href="/jobs?location=Mumbai"
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
              >
                Mumbai
              </Link>
              <Link
                href="/jobs?location=Bangalore"
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
              >
                Bangalore
              </Link>
              <Link
                href="/jobs?location=Hyderabad"
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
              >
                Hyderabad
              </Link>
            </div>

            {/* Search Bar */}
            <form action="/jobs" method="get" className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="search"
                  placeholder="Search by skill, location, or impact area"
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg font-mono text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="text-center">
              <Link
                href="/subscribe"
                className="text-blue-600 hover:text-blue-700 font-mono text-sm font-medium"
              >
                Subscribe for job alerts, stories & case-studies →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-white border-b">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Browse by Tag
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/tag/${category.attributes.slug}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-mono text-sm hover:bg-gray-200 transition"
                >
                  {category.attributes.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Job Listings */}
      {settings.showJobsOnHomepage && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {settings.jobsSectionTitle}
              </h2>
              <Link
                href="/jobs"
                className="text-blue-600 hover:text-blue-700 font-mono text-sm font-medium"
              >
                View all →
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600 font-mono">
                  No jobs available yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className={`grid ${settings.jobsLayoutType === 'grid' ? `grid-cols-1 md:grid-cols-2 lg:grid-cols-${settings.jobsGridColumns}` : 'grid-cols-1'} gap-6`}>
                {jobs.slice(0, settings.homepageJobsLimit).map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.attributes.slug}`}
                    className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {job.attributes.title}
                        </h3>
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
                              {job.attributes.experienceLevel}
                            </span>
                          )}
                          {job.attributes.featured && (
                            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full font-mono text-xs">
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                        {job.attributes.excerpt && (
                          <p className="text-sm text-gray-600">
                            {job.attributes.excerpt.length > 300 ? job.attributes.excerpt.slice(0, 300) + '…' : job.attributes.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {job.attributes.categories?.data?.slice(0, 3).map((category) => (
                            <span
                              key={category.id}
                              className="px-2 py-1 bg-gray-50 text-gray-600 rounded font-mono text-xs"
                            >
                              {category.attributes.name}
                            </span>
                          ))}
                        </div>
                        {job.attributes.closingDate && (
                          <p className="text-xs text-red-600 font-mono font-semibold">
                            ⏰ Closes: {new Date(job.attributes.closingDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Blog Section */}
      {settings.showBlogsOnHomepage && blogs.length > 0 && (
        <section className="py-12 bg-white border-t">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {settings.blogsSectionTitle}
              </h2>
              <Link
                href="/blogs"
                className="text-blue-600 hover:text-blue-700 font-mono text-sm font-medium"
              >
                View all →
              </Link>
            </div>

            <div className={`grid ${settings.blogsLayoutType === 'grid' ? `grid-cols-1 md:grid-cols-2 lg:grid-cols-${settings.blogsGridColumns}` : 'grid-cols-1'} gap-6`}>
              {blogs.slice(0, settings.homepageBlogsLimit).map((blog) => (
                <Link
                  key={blog.id}
                  href={blog.attributes.externalLink || `/blogs/${blog.attributes.slug}`}
                  target={blog.attributes.externalLink ? "_blank" : undefined}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition group"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {blog.attributes.category && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {blog.attributes.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      )}
                      {blog.attributes.featured && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                      {blog.attributes.readTime && (
                        <span className="text-xs text-gray-500">
                          {blog.attributes.readTime} min
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                      {blog.attributes.title}
                    </h3>
                    {blog.attributes.excerpt && (
                      <p className="text-gray-600 text-sm mb-3">
                        {blog.attributes.excerpt.length > 300 ? blog.attributes.excerpt.slice(0, 300) + '…' : blog.attributes.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                      {blog.attributes.author && (
                        <span className="font-medium">{blog.attributes.author}</span>
                      )}
                      <span>
                        {new Date(blog.attributes.publishDate || blog.attributes.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

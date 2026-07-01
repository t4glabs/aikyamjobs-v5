export const dynamic = 'force-dynamic';

import Link from "next/link";
import HomeSearch from "@/components/HomeSearch";
import { getJobs, getCategories, getBlogs, getSiteSettings, getStrapiMediaUrl } from "@/lib/api";
import { Job, Category, Blog, StrapiResponse, SiteSettings } from "@/lib/types";

export default async function Home() {
  const settingsResponse: { data: SiteSettings } | null = await getSiteSettings().catch(() => null);

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

  const [jobsResponse, categoriesResponse, blogsResponse]: [
    StrapiResponse<Job[]>,
    StrapiResponse<Category[]>,
    StrapiResponse<Blog[]> | null
  ] = await Promise.all([
    getJobs({ pageSize: settings.homepageJobsLimit }),
    getCategories(),
    getBlogs({ pageSize: settings.homepageBlogsLimit }).catch(() => null),
  ]);

  const jobs = jobsResponse.data;
  const allCategories = categoriesResponse.data;
  const blogs = blogsResponse?.data || [];

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
      <section className="bg-white border-b border-gray-100 py-16">
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
                className="btn-brand px-5 py-2 rounded-full font-mono text-sm"
              >
                All
              </Link>
              <Link
                href="/jobs?location=Remote"
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
            <HomeSearch />

            <div className="text-center space-y-2">
              <Link
                href="/subscribe"
                className="link-brand font-mono text-sm font-medium block"
              >
                Click here to join 3000+ others to get curated job alerts, skilling opportunities  →
              </Link>
              <Link
                href="https://whatsapp.com/channel/0029Vb8DvZ5CxoAsvj0Oie2C"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Or join our WhatsApp channel
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-white border-b border-gray-100">
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
                className="link-brand font-mono text-sm font-medium"
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
                  <div
                    key={job.id}
                    className="relative block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition"
                  >
                    <Link
                      href={`/jobs/${job.attributes.slug}`}
                      className="absolute inset-0 rounded-lg z-0"
                      aria-label={job.attributes.title}
                    />
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
                          <Link
                            href={`/jobs?jobType=${encodeURIComponent(job.attributes.jobType)}`}
                            className="relative z-10 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-mono text-xs hover:bg-blue-100 transition"
                          >
                            {job.attributes.jobType}
                          </Link>
                          {job.attributes.location && (
                            <Link
                              href={`/jobs?location=${encodeURIComponent(job.attributes.location)}`}
                              className="relative z-10 px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-mono text-xs hover:bg-gray-200 transition"
                            >
                              📍 {job.attributes.location}
                            </Link>
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
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {job.attributes.categories?.data?.slice(0, 3).map((category) => (
                            <Link
                              key={category.id}
                              href={`/jobs?category=${encodeURIComponent(category.attributes.slug)}`}
                              className="relative z-10 px-2 py-1 bg-gray-50 text-gray-600 rounded font-mono text-xs hover:bg-gray-100 transition"
                            >
                              {category.attributes.name}
                            </Link>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Blog Section */}
      {settings.showBlogsOnHomepage && blogs.length > 0 && (
        <section className="py-12 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {settings.blogsSectionTitle}
              </h2>
              <Link
                href="/blogs"
                className="link-brand font-mono text-sm font-medium"
              >
                View all →
              </Link>
            </div>

            {settings.blogsLayoutType === 'line' ? (
              <div className="max-w-2xl mx-auto divide-y divide-gray-100">
                {blogs.slice(0, settings.homepageBlogsLimit).map((blog) => (
                  <Link
                    key={blog.id}
                    href={blog.attributes.externalLink || `/blogs/${blog.attributes.slug}`}
                    target={blog.attributes.externalLink ? "_blank" : undefined}
                    className="flex items-center justify-between py-4 group"
                  >
                    <span className="text-gray-900 group-hover:underline pr-4">
                      {blog.attributes.title}
                    </span>
                    <span className="text-gray-400 group-hover:text-gray-700 flex-shrink-0 transition">→</span>
                  </Link>
                ))}
              </div>
            ) : (
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
                            {blog.attributes.category.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand transition line-clamp-2">
                        {blog.attributes.title}
                      </h3>
                      {blog.attributes.excerpt && (
                        <p className="text-gray-600 text-sm mb-3">
                          {blog.attributes.excerpt.length > 300 ? blog.attributes.excerpt.slice(0, 300) + '…' : blog.attributes.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
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
            )}
          </div>
        </section>
      )}
    </div>
  );
}

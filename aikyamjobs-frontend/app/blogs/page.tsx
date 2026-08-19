export const dynamic = 'force-dynamic';

import Link from "next/link";
import { getBlogs, getStrapiMediaUrl } from "@/lib/api";
import { Blog, StrapiResponse } from "@/lib/types";
import Image from "next/image";

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

  let blogsResponse: StrapiResponse<Blog[]>;
  let blogs: Blog[] = [];
  let pagination: any = null;

  try {
    blogsResponse = await getBlogs({
      search,
      category,
      page,
      pageSize: 12,
    });
    blogs = blogsResponse.data;
    pagination = blogsResponse.meta.pagination;
  } catch (error) {
    // Blogs API not accessible yet - permissions need to be configured
  }

  const categoryOptions = [
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'blog', label: 'Blog' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'story', label: 'Story' },
    { value: 'guide', label: 'Guide' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Blog & Resources</h1>
          <p className="text-gray-600 mt-2">
            {pagination?.total || 0} articles available
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search articles..."
              className="h-10 px-4 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
            />
            <select
              name="category"
              defaultValue={category}
              className="h-10 px-4 border border-gray-300 rounded-md text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-brand h-10 rounded-md font-semibold text-sm"
            >
              Apply Filters
            </button>
          </form>
        </div>
      </div>

      {/* Blog Grid */}
      <div className="container mx-auto px-4 py-8">
        {blogs.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-xl text-gray-600 mb-4">
              {pagination === null
                ? 'Blog feature not yet configured.'
                : 'No articles found matching your criteria.'
              }
            </p>
            {pagination === null ? (
              <div className="text-gray-600">
                <p className="mb-4">To enable blogs, configure permissions in Strapi:</p>
                <ol className="text-left max-w-md mx-auto space-y-2">
                  <li>1. Go to Settings → Users & Permissions → Roles</li>
                  <li>2. Select "Public" role</li>
                  <li>3. Under "Blog", enable: find and findOne</li>
                  <li>4. Click Save</li>
                </ol>
              </div>
            ) : (
              <Link href="/blogs" className="link-brand mt-4 inline-block">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={blog.attributes.externalLink || `/blogs/${blog.attributes.slug}`}
                  target={blog.attributes.externalLink ? "_blank" : undefined}
                  className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden transition hover:border-gray-300 hover:shadow-sm group"
                >
                  {blog.attributes.featuredImage?.data && (
                    <div className="relative h-48 bg-gray-100">
                      <Image
                        src={getStrapiMediaUrl(blog.attributes.featuredImage.data.attributes.url)}
                        alt={blog.attributes.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center gap-1.5 mb-3">
                      {blog.attributes.category && (
                        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800">
                          {blog.attributes.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      )}
                      {blog.attributes.featured && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          Featured
                        </span>
                      )}
                      {blog.attributes.readTime && (
                        <span className="text-xs text-gray-600">
                          {blog.attributes.readTime} min read
                        </span>
                      )}
                    </div>
                    <h2 className="text-[19px] font-semibold tracking-tight leading-snug text-gray-900 mb-2.5 group-hover:text-brand transition">
                      {blog.attributes.title}
                    </h2>
                    {blog.attributes.excerpt && (
                      <p className="text-[15px] leading-relaxed text-gray-700 line-clamp-3 mb-4">
                        {blog.attributes.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-sm text-gray-600 pt-3.5 border-t border-gray-100">
                      {blog.attributes.author && (
                        <span className="font-medium">{blog.attributes.author}</span>
                      )}
                      <span>
                        {new Date(blog.attributes.publishDate || blog.attributes.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pageCount > 1 && (
              <div className="flex items-center justify-center gap-8 mt-10 text-sm">
                {page > 1 ? (
                  <Link
                    href={`/blogs?${new URLSearchParams({ ...params as any, page: (page - 1).toString() })}`}
                    className="link-brand inline-flex items-center min-h-11 px-1"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center min-h-11 px-1 text-gray-300">← Previous</span>
                )}
                <span className="text-gray-600">{page} of {pagination.pageCount}</span>
                {page < pagination.pageCount ? (
                  <Link
                    href={`/blogs?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
                    className="link-brand inline-flex items-center min-h-11 px-1"
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

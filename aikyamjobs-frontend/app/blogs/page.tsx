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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Blog & Resources</h1>
          <p className="text-gray-600 mt-2">
            {pagination?.total || 0} articles available
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search articles..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900 placeholder:text-gray-600"
            />
            <select
              name="category"
              defaultValue={category}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
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
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
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
              <Link href="/blogs" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
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
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition group"
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
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {blog.attributes.category && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {blog.attributes.category}
                        </span>
                      )}
                      {blog.attributes.featured && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                      {blog.attributes.readTime && (
                        <span className="text-xs text-gray-500">
                          {blog.attributes.readTime} min read
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {blog.attributes.title}
                    </h2>
                    {blog.attributes.excerpt && (
                      <p className="text-gray-600 text-sm mb-3">
                        {blog.attributes.excerpt.length > 300 ? blog.attributes.excerpt.slice(0, 300) + '…' : blog.attributes.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
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
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/blogs?${new URLSearchParams({ ...params as any, page: (page - 1).toString() })}`}
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
                    href={`/blogs?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
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

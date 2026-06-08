export const dynamic = 'force-dynamic';

import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlog, getStrapiMediaUrl } from "@/lib/api";
import { Blog, StrapiResponse } from "@/lib/types";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateSEOMetadata } from "@/components/SEO";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let blogResponse: StrapiResponse<Blog[]>;
  try {
    blogResponse = await getBlog(slug);
  } catch {
    return {};
  }
  if (!blogResponse.data || blogResponse.data.length === 0) return {};
  const blog = blogResponse.data[0];
  const ogImage = getStrapiMediaUrl(blog.attributes.featuredImage?.data?.attributes?.url) || undefined;
  return generateSEOMetadata({
    title: blog.attributes.title,
    description: blog.attributes.excerpt || blog.attributes.title,
    ogImage,
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org'}/blogs/${slug}`,
  });
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let blogResponse: StrapiResponse<Blog[]>;
  try {
    blogResponse = await getBlog(slug);
  } catch (error) {
    notFound();
  }

  if (!blogResponse.data || blogResponse.data.length === 0) {
    notFound();
  }

  const blog = blogResponse.data[0];

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  const content = strapiUrl
    ? (blog.attributes.content || '').replace(/https?:\/\/localhost:\d+\/uploads\//g, `${strapiUrl}/uploads/`)
    : (blog.attributes.content || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blogs" className="hover:text-blue-600">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{blog.attributes.title}</span>
        </nav>

        {/* Header */}
        <header className="bg-white rounded-lg p-8 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {blog.attributes.category && (
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {blog.attributes.category}
              </span>
            )}
            {blog.attributes.featured && (
              <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                Featured
              </span>
            )}
            {blog.attributes.readTime && (
              <span className="text-sm text-gray-500">
                {blog.attributes.readTime} min read
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {blog.attributes.title}
          </h1>

          {blog.attributes.excerpt && (
            <p className="text-xl text-gray-600 mb-6">
              {blog.attributes.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-4 text-gray-600">
            <div>
              {blog.attributes.author && (
                <p className="font-medium text-gray-900">
                  By {blog.attributes.author}
                </p>
              )}
              <p className="text-sm">
                {new Date(blog.attributes.publishDate || blog.attributes.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            {blog.attributes.tags && blog.attributes.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blog.attributes.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {blog.attributes.featuredImage?.data && (
          <div className="relative h-[400px] bg-gray-100 rounded-lg overflow-hidden mb-6">
            <Image
              src={getStrapiMediaUrl(blog.attributes.featuredImage.data.attributes.url)}
              alt={blog.attributes.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg p-8">
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/blogs"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            ← Back to all articles
          </Link>
        </div>
      </article>
    </div>
  );
}

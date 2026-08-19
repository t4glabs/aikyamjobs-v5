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
    <div className="min-h-screen bg-background">
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blogs" className="hover:text-brand">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{blog.attributes.title}</span>
        </nav>

        {/* Header */}
        <header className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
              <span className="text-sm text-gray-600">
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

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-gray-600">
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
              <div className="flex flex-wrap gap-1.5">
                {blog.attributes.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800"
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
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link href="/blogs" className="link-brand text-sm">
            ← Back to all articles
          </Link>
        </div>
      </article>
    </div>
  );
}

export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { getCourse, getStrapiMediaUrl } from "@/lib/api";
import { Course, StrapiResponse } from "@/lib/types";
import { courseTypeLabel, modeLabel } from "@/lib/courseLabels";
import { notFound } from "next/navigation";
import { generateSEOMetadata } from "@/components/SEO";
import { Metadata } from "next";
import Markdown from "@/components/Markdown";
import ExternalCourseLink from "@/components/courses/ExternalCourseLink";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const courseResponse: StrapiResponse<Course[]> = await getCourse(slug);

  if (!courseResponse.data || courseResponse.data.length === 0) {
    return {};
  }

  const course = courseResponse.data[0];
  const provider = course.attributes.provider?.data;

  const title = course.attributes.metaTitle || `${course.attributes.title} | ${provider?.attributes.name || 'Learn & Grow'}`;
  const description = course.attributes.metaDescription || course.attributes.excerpt || course.attributes.title;
  const keywords = course.attributes.keywords || [
    course.attributes.title,
    provider?.attributes.name || '',
    course.attributes.fieldOfStudy?.data?.attributes.name || '',
    courseTypeLabel(course.attributes.courseType),
    'aikyam jobs',
    'learn and grow',
  ].filter(Boolean);

  const ogImage = getStrapiMediaUrl(
    course.attributes.socialImage?.data?.attributes?.url ||
    course.attributes.featureImage?.data?.attributes?.url
  ) || undefined;

  return generateSEOMetadata({
    title,
    description,
    keywords,
    ogImage,
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org'}/courses/${slug}`,
  });
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const courseResponse: StrapiResponse<Course[]> = await getCourse(slug);

  if (!courseResponse.data || courseResponse.data.length === 0) {
    notFound();
  }

  const course = courseResponse.data[0];
  const provider = course.attributes.provider?.data;
  const fieldOfStudy = course.attributes.fieldOfStudy?.data;

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || '';
  const content = strapiUrl
    ? (course.attributes.content || '').replace(/https?:\/\/localhost:\d+\/uploads\//g, `${strapiUrl}/uploads/`)
    : (course.attributes.content || '');

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/courses" className="link-brand text-sm font-medium">
            ← Back to all courses
          </Link>
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex gap-4 min-w-0">
                  {provider?.attributes.logo?.data ? (
                    <Image
                      src={getStrapiMediaUrl(provider.attributes.logo.data.attributes.url)}
                      alt=""
                      width={44}
                      height={44}
                      className="w-11 h-11 flex-none object-contain rounded-md border border-gray-200"
                    />
                  ) : (
                    <span className="w-11 h-11 flex-none flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-base font-semibold text-gray-500">
                      {provider?.attributes.name?.charAt(0) ?? '·'}
                    </span>
                  )}
                  <div className="min-w-0">
                    {provider && (
                      <span className="text-sm font-medium text-gray-600 inline-block mb-1">
                        {provider.attributes.name}
                      </span>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                      {course.attributes.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                      {course.attributes.duration && <span>{course.attributes.duration}</span>}
                      {course.attributes.mode && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>{modeLabel(course.attributes.mode)}</span>
                        </>
                      )}
                      {course.attributes.location && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>{course.attributes.location}</span>
                        </>
                      )}
                      {course.attributes.intake && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                          <span>Intake: {course.attributes.intake}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {course.attributes.featured && (
                  <span className="flex-none rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                    Featured
                  </span>
                )}
              </div>

              <Markdown
                content={content}
                className="prose mb-8 text-gray-800 leading-relaxed"
              />

              <div className="flex flex-wrap gap-1.5 mb-6">
                <Link
                  href={`/courses?courseType=${encodeURIComponent(course.attributes.courseType)}`}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                >
                  {courseTypeLabel(course.attributes.courseType)}
                </Link>
                {fieldOfStudy && (
                  <Link
                    href={`/courses?fieldOfStudy=${encodeURIComponent(fieldOfStudy.attributes.slug)}`}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                  >
                    {fieldOfStudy.attributes.name}
                  </Link>
                )}
              </div>

              {course.attributes.skills && course.attributes.skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills & Topics</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {course.attributes.skills.map((skill, index) => (
                      <Link
                        key={index}
                        href={`/courses?search=${encodeURIComponent(skill)}`}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                      >
                        {skill}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              {/* Apply */}
              {(course.attributes.applicationUrl || course.attributes.applicationEmail) && (
                <div className="mb-6">
                  {course.attributes.applicationUrl ? (
                    <ExternalCourseLink
                      href={course.attributes.applicationUrl}
                      courseSlug={course.attributes.slug}
                      className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
                    >
                      Apply now →
                    </ExternalCourseLink>
                  ) : course.attributes.applicationEmail ? (
                    <ExternalCourseLink
                      href={`mailto:${course.attributes.applicationEmail}`}
                      courseSlug={course.attributes.slug}
                      className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
                    >
                      Apply via email →
                    </ExternalCourseLink>
                  ) : null}
                  {course.attributes.applicationPhone && (
                    <p className="mt-2 text-center text-xs text-gray-500">
                      or call {course.attributes.applicationPhone}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4 text-sm">
                {course.attributes.eligibility && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Eligibility</h4>
                    <p className="text-gray-700">{course.attributes.eligibility}</p>
                  </div>
                )}

                {course.attributes.duration && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Duration</h4>
                    <p className="text-gray-700">{course.attributes.duration}</p>
                  </div>
                )}

                {course.attributes.mode && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Mode</h4>
                    <p className="text-gray-700">{modeLabel(course.attributes.mode)}</p>
                  </div>
                )}

                {course.attributes.location && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Campus / Location</h4>
                    <p className="text-gray-700">{course.attributes.location}</p>
                  </div>
                )}

                {course.attributes.intake && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Intake</h4>
                    <p className="text-gray-700">{course.attributes.intake}</p>
                  </div>
                )}

                {course.attributes.importantDates && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Important Dates</h4>
                    <p className="text-gray-700">{course.attributes.importantDates}</p>
                  </div>
                )}
              </div>

              {/* Provider Info */}
              {provider && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm">About the Provider</h4>
                  <div className="flex items-center gap-3 mb-2">
                    {provider.attributes.logo?.data && (
                      <Image
                        src={getStrapiMediaUrl(provider.attributes.logo.data.attributes.url)}
                        alt={provider.attributes.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain rounded border border-gray-100 flex-shrink-0"
                      />
                    )}
                    <p className="font-semibold text-gray-900">{provider.attributes.name}</p>
                  </div>
                  {provider.attributes.shortDescription && (
                    <p className="text-sm text-gray-600 mb-3">
                      {provider.attributes.shortDescription}
                    </p>
                  )}
                  {provider.attributes.website && (
                    <a
                      href={provider.attributes.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-brand text-sm"
                    >
                      Visit website →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

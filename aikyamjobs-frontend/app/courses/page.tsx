export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { getCourses, getCourseProviders, getCourseFieldsOfStudy, getStrapiMediaUrl } from "@/lib/api";
import { Course, CourseProvider, CourseFieldOfStudy, StrapiResponse } from "@/lib/types";
import { COURSE_TYPE_OPTIONS, MODE_OPTIONS, courseTypeLabel, modeLabel } from "@/lib/courseLabels";
import { generateSEOMetadata } from "@/components/SEO";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSEOMetadata({
    title: "Learn & Grow — Courses & Degrees",
    description: "Explore curated courses and degree programmes from mission-aligned institutions, filtered by field, level and skills.",
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aikyamjobs.org'}/courses`,
  });
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const fieldOfStudy = typeof params.fieldOfStudy === 'string' ? params.fieldOfStudy : undefined;
  const courseType = typeof params.courseType === 'string' ? params.courseType : undefined;
  const mode = typeof params.mode === 'string' ? params.mode : undefined;
  const provider = typeof params.provider === 'string' ? params.provider : undefined;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;

  const [coursesResponse, providersResponse, fieldsOfStudyResponse]: [
    StrapiResponse<Course[]>,
    StrapiResponse<CourseProvider[]>,
    StrapiResponse<CourseFieldOfStudy[]>
  ] = await Promise.all([
    getCourses({ search, fieldOfStudy, courseType, mode, provider, page, pageSize: 12 }),
    getCourseProviders(),
    getCourseFieldsOfStudy(),
  ]);

  const courses = coursesResponse.data;
  const pagination = coursesResponse.meta.pagination;
  const providers = providersResponse.data;
  const fieldsOfStudy = fieldsOfStudyResponse.data;

  const activeFilters = [
    search && { key: 'search', label: search },
    fieldOfStudy && { key: 'fieldOfStudy', label: fieldsOfStudy.find((f) => f.attributes.slug === fieldOfStudy)?.attributes.name || fieldOfStudy },
    courseType && { key: 'courseType', label: courseTypeLabel(courseType) },
    mode && { key: 'mode', label: modeLabel(mode) },
    provider && { key: 'provider', label: providers.find((p) => p.attributes.slug === provider)?.attributes.name || provider },
  ].filter(Boolean) as { key: string; label: string }[];

  const hrefWithout = (key: string) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => k !== key && k !== 'page' && typeof v === 'string') as [string, string][]
    );
    const qs = next.toString();
    return qs ? `/courses?${qs}` : '/courses';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 pt-10 pb-6">
          <span className="inline-flex items-center rounded-full bg-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Learn &amp; Grow
          </span>
          <h1 className="mt-3 text-3xl md:text-[34px] font-bold tracking-tight text-gray-900">
            Find your next course or degree
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600">
            Courses and degree programmes from partner institutions, curated for people building a career in social impact. Filter by field, level and skills to find a fit, then apply directly with the provider.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-5">
          <form method="get" className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-shrink-0 md:mr-2">
                <p className="text-sm text-gray-600">{pagination?.total || 0} courses</p>
              </div>

              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600">Keyword</span>
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Title or keyword"
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                />
              </label>

              <label className="flex flex-col gap-1.5 md:w-48">
                <span className="text-xs font-semibold text-gray-600">Field of study</span>
                <select
                  name="fieldOfStudy"
                  defaultValue={fieldOfStudy}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <option value="">All fields</option>
                  {fieldsOfStudy.map((f) => (
                    <option key={f.id} value={f.attributes.slug}>{f.attributes.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 md:w-44">
                <span className="text-xs font-semibold text-gray-600">Level</span>
                <select
                  name="courseType"
                  defaultValue={courseType}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <option value="">All levels</option>
                  {COURSE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 md:w-36">
                <span className="text-xs font-semibold text-gray-600">Mode</span>
                <select
                  name="mode"
                  defaultValue={mode}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <option value="">Any mode</option>
                  {MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              {providers.length > 0 && (
                <label className="flex flex-col gap-1.5 md:w-48">
                  <span className="text-xs font-semibold text-gray-600">Provider</span>
                  <select
                    name="provider"
                    defaultValue={provider}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 transition focus-visible:outline-none focus-visible:border-gray-600 focus-visible:ring-2 focus-visible:ring-gray-900/15"
                  >
                    <option value="">All providers</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.attributes.slug}>{p.attributes.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <button type="submit" className="btn-brand h-10 rounded-md px-5 text-sm md:w-auto">
                Filter
              </button>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Showing {pagination?.total || 0} matching courses</span>
                {activeFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={hrefWithout(f.key)}
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-gray-800 transition hover:bg-gray-200"
                  >
                    {f.label}
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">Remove filter</span>
                  </Link>
                ))}
                <Link href="/courses" className="text-[13px] font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900">
                  Clear all
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Course Grid */}
      <div className="container mx-auto px-4 py-8">
        {courses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-lg font-semibold text-gray-900">No courses match these filters</p>
            <p className="mt-1.5 text-sm text-gray-600">Try widening the field of study or level, or clear filters to see everything.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/courses" className="inline-flex items-center h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-900 hover:bg-gray-50">
                Clear filters
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const courseProvider = course.attributes.provider?.data;
                const courseFieldOfStudy = course.attributes.fieldOfStudy?.data;
                return (
                  <div
                    key={course.id}
                    className="relative flex flex-col bg-white border border-gray-200 rounded-lg p-6 transition hover:border-gray-300 hover:shadow-sm"
                  >
                    <Link
                      href={`/courses/${course.attributes.slug}`}
                      prefetch={false}
                      className="absolute inset-0 rounded-lg z-0"
                      aria-label={course.attributes.title}
                    />

                    {/* provider + featured */}
                    <div className="flex items-center justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {courseProvider?.attributes.logo?.data ? (
                          <Image
                            src={getStrapiMediaUrl(courseProvider.attributes.logo.data.attributes.url)}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain rounded-md border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
                            {courseProvider?.attributes.name?.charAt(0) ?? '·'}
                          </span>
                        )}
                        {courseProvider && (
                          <span className="truncate text-sm font-medium text-gray-600">
                            {courseProvider.attributes.name}
                          </span>
                        )}
                      </div>
                      {course.attributes.featured && (
                        <span className="flex-none rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* title */}
                    <h2 className="mb-2.5 text-[19px] font-semibold tracking-tight leading-snug text-gray-900">
                      {course.attributes.title}
                    </h2>

                    {/* facts */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
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
                    </div>

                    {course.attributes.excerpt && (
                      <p className="mb-4 text-[15px] leading-relaxed text-gray-700 line-clamp-3">
                        {course.attributes.excerpt}
                      </p>
                    )}

                    {/* filters */}
                    <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3.5">
                      <Link
                        href={`/courses?courseType=${encodeURIComponent(course.attributes.courseType)}`}
                        prefetch={false}
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                      >
                        {courseTypeLabel(course.attributes.courseType)}
                      </Link>
                      {courseFieldOfStudy && (
                        <Link
                          href={`/courses?fieldOfStudy=${encodeURIComponent(courseFieldOfStudy.attributes.slug)}`}
                          prefetch={false}
                          className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                        >
                          {courseFieldOfStudy.attributes.name}
                        </Link>
                      )}
                      {course.attributes.skills?.slice(0, 1).map((skill, index) => (
                        <Link
                          key={index}
                          href={`/courses?search=${encodeURIComponent(skill)}`}
                          prefetch={false}
                          className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[13px] font-medium text-gray-800 transition hover:bg-gray-100 hover:border-gray-300"
                        >
                          {skill}
                        </Link>
                      ))}
                      {course.attributes.skills && course.attributes.skills.length > 1 && (
                        <span className="px-1 text-[13px] text-gray-600">
                          +{course.attributes.skills.length - 1}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.pageCount > 1 && (
              <div className="flex items-center justify-center gap-8 mt-10 text-sm">
                {page > 1 ? (
                  <Link
                    href={`/courses?${new URLSearchParams({ ...params as any, page: (page - 1).toString() })}`}
                    className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center min-h-11 px-1 text-gray-300">← Previous</span>
                )}
                <span className="text-gray-600">{page} of {pagination.pageCount}</span>
                {page < pagination.pageCount ? (
                  <Link
                    href={`/courses?${new URLSearchParams({ ...params as any, page: (page + 1).toString() })}`}
                    className="inline-flex items-center min-h-11 px-1 text-gray-600 hover:text-gray-900 transition"
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

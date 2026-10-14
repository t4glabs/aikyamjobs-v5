'use client';

import { track } from '@/lib/analytics';

interface Props {
  href: string;
  courseSlug: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The "Apply now" / "Apply via email" link on a course detail page. Mirrors
 * ExternalApplyLink (jobs) so Learn & Grow clicks show up in analytics the
 * same way external job applies do.
 */
export default function ExternalCourseLink({ href, courseSlug, children, className }: Props) {
  const isMailto = href.startsWith('mailto:');
  return (
    <a
      href={href}
      target={isMailto ? undefined : '_blank'}
      rel={isMailto ? undefined : 'noopener noreferrer'}
      onClick={() => track('Course Apply Click', { course_slug: courseSlug })}
      className={className}
    >
      {children}
    </a>
  );
}

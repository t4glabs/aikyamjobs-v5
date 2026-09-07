'use client';

import { track } from '@/lib/analytics';

interface Props {
  href: string;
  jobSlug: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The "Apply now" / "Apply via email" link on non-gated JD pages. Tiny client
 * wrapper so the mostly-server JD page can still fire the same
 * External Apply Click event the gated flow's result page fires.
 */
export default function ExternalApplyLink({ href, jobSlug, children, className }: Props) {
  const isMailto = href.startsWith('mailto:');
  return (
    <a
      href={href}
      target={isMailto ? undefined : '_blank'}
      rel={isMailto ? undefined : 'noopener noreferrer'}
      onClick={() => track('External Apply Click', { job_slug: jobSlug, apply_source: 'direct_external' })}
      className={className}
    >
      {children}
    </a>
  );
}

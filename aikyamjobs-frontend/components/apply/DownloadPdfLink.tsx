'use client';

import { track } from '@/lib/analytics';

interface Props {
  href: string;
  jobSlug: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The "Download JD as PDF" link in the sidebar. Plausible's script already
 * auto-tracks this as a generic, sitewide "File Download" goal (any .pdf
 * link, no job context) -- this wrapper adds a job-level custom event on top
 * of that, the same pattern ExternalApplyLink uses for the Apply button, so
 * "which JD's PDF got downloaded" is answerable from job_slug rather than
 * just a sitewide download count.
 */
export default function DownloadPdfLink({ href, jobSlug, children, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download
      aria-label="Download this job description as a PDF"
      title="Download JD as PDF"
      onClick={() => track('JD PDF Downloaded', { job_slug: jobSlug })}
      className={className}
    >
      {children}
    </a>
  );
}

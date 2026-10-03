'use client';

import { track } from '@/lib/analytics';

interface Props {
  href: string;
  companySlug: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The "Visit Website →" button on a company profile page. Plausible's script
 * already auto-tracks this as a generic, sitewide "Outbound Link: Click" goal
 * (any external link, no company context) -- this wrapper adds a
 * company-level custom event on top, the same pattern ExternalApplyLink and
 * DownloadPdfLink use, so "which company's site people actually clicked
 * through to" is answerable (and shareable back to that org, per the
 * analytics-reports-to-partners practice) rather than just a sitewide count.
 */
export default function CompanyWebsiteLink({ href, companySlug, children, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('Company Website Click', { company_slug: companySlug })}
      className={className}
    >
      {children}
    </a>
  );
}

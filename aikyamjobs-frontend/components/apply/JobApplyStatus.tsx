'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getApplyStatus, type ApplyStatus } from '@/lib/apply';

interface Props {
  jobSlug: string;
}

/**
 * The gated-job sidebar CTA. Renders the standard "Does my CV fit this role?"
 * pitch by default (matches server-rendered state, so there's no flash for
 * anonymous visitors or first-time applicants) — and swaps to the applicant's
 * actual status once we know they've already applied here before. Minimal by
 * design: this is the only personalization on the JD page; a full "my
 * applications" list stays out of scope for now.
 */
export default function JobApplyStatus({ jobSlug }: Props) {
  const [status, setStatus] = useState<ApplyStatus | null>(null);

  useEffect(() => {
    let active = true;
    if (!getToken()) return;
    (async () => {
      const res = await getApplyStatus(jobSlug);
      if (!active || !res.ok) return;
      if (res.data.hasApplication) setStatus(res.data);
    })();
    return () => {
      active = false;
    };
  }, [jobSlug]);

  if (status?.hasApplication) {
    if (!status.decided) {
      return (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span className="text-gray-600">Your application is with a reviewer.</span>{' '}
          <Link href={`/apply/read/${status.applicationId}`} className="link-brand font-medium">
            Check status →
          </Link>
        </div>
      );
    }

    if (status.status === 'approved') {
      return (
        <div className="mb-6">
          <Link
            href={`/apply/read/${status.applicationId}`}
            className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
          >
            ✓ Good match — view your result →
          </Link>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <Link
          href={`/apply/read/${status.applicationId}`}
          className="block w-full text-center px-6 py-3 rounded-md text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
        >
          See what we found →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Link
        href={`/jobs/${jobSlug}/apply`}
        className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
      >
        Does my CV fit this role?
      </Link>
      <ul className="mt-4 space-y-2">
        <li className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
          Simply tick the job&rsquo;s requirements against your CV.
        </li>
        <li className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
          A team member reads your self scoring and reads your CV.
        </li>
        <li className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
          On a good fit, you will receive the job apply link by email.
        </li>
      </ul>
      <p className="mt-3 pt-3 border-t border-hairline text-xs text-gray-500">
        If it isn&rsquo;t a fit this time, we&rsquo;ll still write back with whatever would help —
        usually a few changes worth making in your CV.
      </p>
    </div>
  );
}

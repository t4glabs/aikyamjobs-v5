'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getApplyStatus, type ApplyStatus } from '@/lib/apply';

interface Props {
  jobSlug: string;
}

/**
 * The gated-job sidebar CTA. Renders the standard "CV Improver" pitch by
 * default (matches server-rendered state, so there's no flash for anonymous
 * visitors or first-time applicants) — and swaps to the applicant's actual
 * status once we know they've already applied here before.
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
        Use CV Improver to apply
      </Link>
      <p className="mt-2 text-center text-xs text-gray-500">
        Free. An aikyam friend reads it for you
      </p>
      <ul className="mt-4 space-y-2">
        <li className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
          Tick off what your CV already shows for this role.
        </li>
        <li className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
          Someone on our team reads the same CV and writes back with notes and the job
          application link.
        </li>
      </ul>
      <p className="mt-3 pt-3 border-t border-hairline text-xs text-gray-500">
        If it isn&rsquo;t a fit this time, we&rsquo;ll still write back with whatever would help —
        usually a few changes worth making in your CV.
      </p>
    </div>
  );
}

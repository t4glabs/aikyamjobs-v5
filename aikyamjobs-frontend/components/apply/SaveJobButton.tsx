'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, getSavedStatus, saveJob, unsaveJob, requestMagicLink } from '@/lib/apply';
import { track } from '@/lib/analytics';

interface Props {
  jobSlug: string;
  // True when there's no sibling PDF button in the row (job has no
  // mindmapPdf) -- this button should then take the full row width instead
  // of just its usual half, same as a lone flex child would, but a CSS grid
  // doesn't do that automatically so the parent has to say so explicitly.
  solo?: boolean;
}

/**
 * "Save" — one half of the compact utility row that sits above the primary
 * Apply / Application Assist CTA (see app/jobs/[slug]/page.tsx), deliberately
 * smaller and more muted than that button so it reads as secondary despite
 * coming first in document order. Uses the standard bookmark glyph rather
 * than a heart. Saved jobs are tied to the same applicant identity as
 * applications (per Jinso's call — synced across devices), so a signed-out
 * visitor gets a small inline sign-in card instead of the button just working
 * immediately.
 */
export default function SaveJobButton({ jobSlug, solo }: Props) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!getToken()) return;
    setSignedIn(true);
    (async () => {
      const res = await getSavedStatus(jobSlug);
      if (!active) return;
      if (res.ok) setSaved(res.data.saved);
    })();
    return () => {
      active = false;
    };
  }, [jobSlug]);

  async function toggle() {
    if (!signedIn) {
      setShowSignin((v) => !v);
      return;
    }
    setBusy(true);
    const res = saved ? await unsaveJob(jobSlug) : await saveJob(jobSlug);
    setBusy(false);
    if (res.ok) {
      track(res.data.saved ? 'Job Saved' : 'Job Unsaved', { job_slug: jobSlug });
      setSaved(res.data.saved);
    }
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await requestMagicLink({ email: email.trim(), redirect: pathname });
    setBusy(false);
    if (res.ok) {
      track('Magic Link Requested', { context: 'save', job_slug: jobSlug });
      setSent(true);
    } else {
      setError(res.error);
    }
  }

  return (
    // display:contents makes this wrapper invisible to layout -- its
    // children (the button, and the sign-in box when shown) become direct
    // items of the PARENT's grid instead of being trapped inside one half
    // of a two-column row. See the sign-in box below for why it needs
    // col-span-2 + order-last to actually land full-width underneath both
    // buttons rather than squeezed into this button's own column.
    <div className="contents">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved jobs' : 'Save this job for later'}
        title={saved ? 'Saved' : 'Save for later'}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${solo ? 'col-span-2' : ''} ${
          saved
            ? 'border-[var(--brand)] bg-[var(--brand-10)] text-[var(--brand)]'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 flex-none"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V20l-6-3.5L6 20V4.5Z"
          />
        </svg>
        {saved ? 'Saved' : 'Save'}
      </button>

      {showSignin && !signedIn && (
        <div className="col-span-2 order-last mt-2 rounded-lg border border-gray-200 bg-white p-3">
          {!sent ? (
            <form onSubmit={handleSignin} className="space-y-2">
              <p className="text-xs text-gray-500">Sign in to save this job.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={busy}
                className="btn-brand w-full px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send sign-in link'}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </form>
          ) : (
            <p className="text-xs text-gray-500">
              {`Sent to ${email}. Open it on this device, then tap save again.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

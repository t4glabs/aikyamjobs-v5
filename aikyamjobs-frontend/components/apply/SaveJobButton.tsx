'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, getSavedStatus, saveJob, unsaveJob, requestMagicLink } from '@/lib/apply';
import { track } from '@/lib/analytics';

interface Props {
  jobSlug: string;
}

/**
 * "Save for later" — a full-width secondary button under the primary Apply
 * CTA (same shape/weight, just outlined), using the standard bookmark glyph
 * rather than a heart. Saved jobs are tied to the same applicant identity as
 * applications (per Jinso's call — synced across devices), so a signed-out
 * visitor gets a small inline sign-in card instead of the button just working
 * immediately.
 */
export default function SaveJobButton({ jobSlug }: Props) {
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
    <div className="mb-6">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className={`flex w-full items-center justify-center gap-2 rounded-md border px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? 'border-[var(--brand)] bg-[var(--brand-10)] text-[var(--brand)]'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-none"
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
        {saved ? 'Saved' : 'Save for later'}
      </button>

      {showSignin && !signedIn && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
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

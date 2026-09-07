'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  getToken,
  getMe,
  getSavedJobs,
  unsaveJob,
  requestMagicLink,
  type SavedJob,
} from '@/lib/apply';
import { track } from '@/lib/analytics';

type Stage = 'checking' | 'signin' | 'link-sent' | 'list';

export default function SavedJobsPage() {
  const pathname = usePathname();

  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setStage('signin');
        return;
      }
      const me = await getMe();
      if (!active) return;
      if (!me.ok) {
        setStage('signin');
        return;
      }
      const res = await getSavedJobs();
      if (!active) return;
      if (!res.ok) {
        setStage('signin');
        return;
      }
      setSavedJobs(res.data.savedJobs);
      setStage('list');
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigninBusy(true);
    const res = await requestMagicLink({ email: email.trim(), redirect: pathname });
    setSigninBusy(false);
    if (res.ok) {
      track('Magic Link Requested', { context: 'saved' });
      setStage('link-sent');
    } else {
      setError(res.error);
    }
  }

  async function handleRemove(jobSlug: string) {
    setRemovingSlug(jobSlug);
    const res = await unsaveJob(jobSlug);
    setRemovingSlug(null);
    if (res.ok) {
      track('Job Unsaved', { job_slug: jobSlug });
      setSavedJobs((prev) => prev.filter((j) => j.jobSlug !== jobSlug));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/jobs" className="link-brand text-sm font-medium">
            ← Back to jobs
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            {stage === 'checking' && (
              <div className="flex items-center gap-3 py-8 justify-center text-gray-400">
                <span className="animate-spin h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-900" />
                <span className="text-sm">Loading…</span>
              </div>
            )}

            {stage === 'signin' && (
              <form onSubmit={handleSignin} className="space-y-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Sign in to see saved jobs</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    We&rsquo;ll email you a link to confirm it&rsquo;s you.
                  </p>
                </div>
                <div>
                  <label htmlFor="saved-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="saved-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="your@email.com"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={signinBusy}
                  className="btn-brand w-full px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {signinBusy ? 'Sending…' : 'Send me the sign-in link'}
                </button>
              </form>
            )}

            {stage === 'link-sent' && (
              <div className="text-center py-4">
                <h1 className="text-lg font-semibold text-gray-900">Your link is on its way</h1>
                <p className="text-sm text-gray-500 mt-2">
                  {`Sent to ${email}. Open it on this device to come straight back here.`}
                </p>
              </div>
            )}

            {stage === 'list' && savedJobs.length === 0 && (
              <div className="text-center py-4">
                <h1 className="text-lg font-semibold text-gray-900">No saved jobs yet</h1>
                <p className="text-sm text-gray-500 mt-2">
                  Tap &ldquo;Save for later&rdquo; on any role to keep it here.
                </p>
                <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
                  ← Browse roles
                </Link>
              </div>
            )}

            {stage === 'list' && savedJobs.length > 0 && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900 mb-4">Saved jobs</h1>
                <div className="divide-y divide-gray-100">
                  {savedJobs.map((sj) => (
                    <div key={sj.jobId} className="flex items-center justify-between gap-4 py-4">
                      <Link href={`/jobs/${sj.jobSlug}`} className="min-w-0 group">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:underline">
                          {sj.jobTitle}
                        </p>
                        {sj.companyName && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{sj.companyName}</p>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(sj.jobSlug)}
                        disabled={removingSlug === sj.jobSlug}
                        className="flex-none text-xs text-gray-500 hover:text-gray-800 transition disabled:opacity-60"
                      >
                        {removingSlug === sj.jobSlug ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

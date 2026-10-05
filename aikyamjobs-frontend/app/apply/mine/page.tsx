'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  getToken,
  getMe,
  getMyApplications,
  requestMagicLink,
  type MyApplication,
  type ApplicantProfile,
} from '@/lib/apply';
import { track } from '@/lib/analytics';

type Stage = 'checking' | 'signin' | 'link-sent' | 'list';

function statusBadge(app: MyApplication) {
  if (!app.decided) {
    return { label: 'WITH REVIEWER', className: 'bg-gray-100 text-gray-600' };
  }
  if (app.status === 'approved') {
    return { label: 'GOOD MATCH', className: 'bg-green-50 text-green-700' };
  }
  return { label: 'NOT THIS TIME', className: 'bg-gray-100 text-gray-600' };
}

export default function MyApplicationsPage() {
  const pathname = usePathname();

  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);

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
      setProfile(me.data);
      const res = await getMyApplications();
      if (!active) return;
      if (!res.ok) {
        setStage('signin');
        return;
      }
      setApplications(res.data.applications);
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
      track('Magic Link Requested', { context: 'mine' });
      setStage('link-sent');
    } else {
      setError(res.error);
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
          {stage === 'list' && profile && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6">
              <h1 className="text-lg font-semibold text-gray-900 mb-4">My profile</h1>

              <div className="space-y-1 text-sm mb-5">
                <p className="text-gray-900 font-medium">{profile.name || 'No name on file'}</p>
                <p className="text-gray-600">{profile.email}</p>
                {profile.phone && <p className="text-gray-600">{profile.phone}</p>}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">CV on file</h2>
                {profile.currentCv ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{profile.currentCv.originalName || 'Your CV'}</p>
                      {profile.currentCv.uploadedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Uploaded{' '}
                          {new Date(profile.currentCv.uploadedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    {profile.currentCv.url && (
                      <a
                        href={profile.currentCv.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-none text-xs font-semibold link-brand"
                      >
                        View →
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No CV on file yet — one gets added the first time you apply.</p>
                )}

                {profile.cvLimitStatus && (
                  <p className="text-xs text-gray-500 mt-3">
                    {profile.cvLimitStatus.remaining > 0
                      ? `${profile.cvLimitStatus.remaining} of ${profile.cvLimitStatus.max} CV updates left in the next ${Math.round(profile.cvLimitStatus.windowDays / 30)} months.`
                      : `You've used all ${profile.cvLimitStatus.max} CV updates allowed in a ${Math.round(profile.cvLimitStatus.windowDays / 30)}-month window. Your current CV stays on file and still works for applying.`}
                  </p>
                )}

                {profile.cvMindmapPdf && (
                  <a
                    href={profile.cvMindmapPdf.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 flex-none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                      />
                    </svg>
                    Download CV mindmap (PDF)
                  </a>
                )}
              </div>
            </div>
          )}

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
                  <h1 className="text-lg font-semibold text-gray-900">Sign in to see your applications</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    We&rsquo;ll email you a link to confirm it&rsquo;s you.
                  </p>
                </div>
                <div>
                  <label htmlFor="mine-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="mine-email"
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

            {stage === 'list' && applications.length === 0 && (
              <div className="text-center py-4">
                <h1 className="text-lg font-semibold text-gray-900">No applications yet</h1>
                <p className="text-sm text-gray-500 mt-2">
                  When you apply to a role through aikyamjobs, it&rsquo;ll show up here.
                </p>
                <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
                  ← Browse roles
                </Link>
              </div>
            )}

            {stage === 'list' && applications.length > 0 && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900 mb-4">My applications</h1>
                <div className="divide-y divide-gray-100">
                  {applications.map((app) => {
                    const badge = statusBadge(app);
                    return (
                      <Link
                        key={app.applicationId}
                        href={`/apply/read/${app.applicationId}`}
                        className="flex items-center justify-between gap-4 py-4 group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:underline">
                            {app.jobTitle}
                          </p>
                          {app.companyName && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{app.companyName}</p>
                          )}
                        </div>
                        <span
                          className={`flex-none inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

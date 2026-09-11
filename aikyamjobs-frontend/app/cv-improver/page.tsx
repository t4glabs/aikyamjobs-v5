'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getMe,
  uploadCv,
  requestMagicLink,
  clearToken,
  getToken,
  type ApplicantProfile,
} from '@/lib/apply';
import { submitCvReview, getMyCvReviews, type MyCvReview } from '@/lib/cvImprover';
import { track } from '@/lib/analytics';

type Stage = 'checking' | 'signin' | 'link-sent' | 'ready' | 'done';

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(review: MyCvReview) {
  if (review.status === 'reviewed') {
    return { label: 'FEEDBACK READY', className: 'bg-green-50 text-green-700' };
  }
  return { label: 'WITH REVIEWER', className: 'bg-gray-100 text-gray-600' };
}

export default function CvImproverPage() {
  const pathname = usePathname();

  const [stage, setStage] = useState<Stage>('checking');
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [reviews, setReviews] = useState<MyCvReview[]>([]);

  // sign-in form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);

  // submit form
  const [targetRoles, setTargetRoles] = useState('');
  const [consent, setConsent] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvNote, setCvNote] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadReviews() {
    const res = await getMyCvReviews();
    if (res.ok) setReviews(res.data.reviews);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setStage('signin');
        return;
      }
      const res = await getMe();
      if (!active) return;
      if (res.ok) {
        setProfile(res.data);
        await loadReviews();
        if (!active) return;
        setStage('ready');
      } else {
        clearToken();
        setStage('signin');
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigninBusy(true);
    const res = await requestMagicLink({ email: email.trim(), name: name.trim() || undefined, redirect: pathname });
    setSigninBusy(false);
    if (res.ok) {
      track('Magic Link Requested', { context: 'cv-improver' });
      setStage('link-sent');
    } else {
      setError(res.error);
    }
  }

  async function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCvNote(null);
    setCvBusy(true);
    const res = await uploadCv(file);
    setCvBusy(false);
    if (res.ok) {
      const me = await getMe();
      if (me.ok) setProfile(me.data);
      setCvNote(
        res.data.counted
          ? `CV uploaded. You can update it ${res.data.remaining} more time${res.data.remaining === 1 ? '' : 's'} in the next 6 months.`
          : 'CV replaced.'
      );
    } else {
      setError(res.error);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profile?.currentCv) {
      setError('Please upload your CV before requesting feedback.');
      return;
    }
    if (!targetRoles.trim()) {
      setError('Let us know what roles or domains you are aiming for.');
      return;
    }
    if (!consent) {
      setError('Please give consent to continue.');
      return;
    }
    setSubmitBusy(true);
    const res = await submitCvReview({ targetRoles: targetRoles.trim(), consent });
    setSubmitBusy(false);
    if (res.ok) {
      track('CV Improver Submitted');
      setStage('done');
    } else {
      setError(res.error);
    }
  }

  function handleSignOut() {
    clearToken();
    setProfile(null);
    setReviews([]);
    setStage('signin');
  }

  const pendingReview = reviews.find((r) => r.status === 'submitted');

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="link-brand text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500">CV Improver</p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Get honest feedback on your CV
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Not tied to any job — a real person reads your CV and writes back with notes.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            {stage === 'checking' && (
              <div className="flex items-center gap-3 py-8 justify-center text-gray-400">
                <span className="animate-spin h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-900" />
                <span className="text-sm">Loading…</span>
              </div>
            )}

            {/* ── Sign in ── */}
            {stage === 'signin' && (
              <form onSubmit={handleSignin} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Start with your email</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    So we can write back to you, and so your CV only needs uploading once.
                  </p>
                </div>
                <ul className="space-y-2 rounded-lg bg-background p-4">
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    We email you a one-tap link — that&rsquo;s the whole login, no password.
                  </li>
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    Your CV then stays on file, so the next one takes a minute.
                  </li>
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    This is completely separate from applying to any specific job.
                  </li>
                </ul>
                <div>
                  <label htmlFor="cvi-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your name
                  </label>
                  <input
                    id="cvi-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="cvi-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="cvi-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="your@email.com"
                  />
                  <p className="mt-1 text-xs text-gray-400">One you check — our reply comes here.</p>
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

            {/* ── Link sent ── */}
            {stage === 'link-sent' && (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-10">
                  <svg className="h-6 w-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Your link is on its way</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Sent to <strong className="text-gray-700">{email}</strong>.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  It arrives within a minute. Nothing there? Check spam, or{' '}
                  <button
                    type="button"
                    onClick={() => setStage('signin')}
                    className="link-brand font-medium underline"
                  >
                    use a different address
                  </button>
                  .
                </p>
              </div>
            )}

            {/* ── Signed in: history + form/pending ── */}
            {stage === 'ready' && profile && (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Signed in as <span className="text-gray-800 font-medium">{profile.email}</span>
                  </span>
                  <button type="button" onClick={handleSignOut} className="link-brand font-medium">
                    Not you?
                  </button>
                </div>

                {reviews.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Your CV Improver history</h3>
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {reviews.map((r) => {
                        const badge = statusBadge(r);
                        return (
                          <Link
                            key={r.id}
                            href={`/cv-improver/read/${r.id}`}
                            className="flex items-center justify-between gap-4 px-4 py-3 group"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:underline">
                                {r.targetRoles}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Submitted {formatDate(r.submittedAt)}
                              </p>
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

                {pendingReview ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Your CV is already with a reviewer. We&rsquo;ll email you once it&rsquo;s ready —
                    you can send another after that.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">The CV we&rsquo;ll read</h3>
                      {profile.currentCv ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="min-w-0">
                            <a
                              href={profile.currentCv.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-gray-800 truncate block hover:text-brand"
                            >
                              {profile.currentCv.originalName || 'Your CV'}
                            </a>
                            <p className="text-xs text-gray-500">
                              On file since {formatDate(profile.currentCv.uploadedAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={cvBusy}
                            className="flex-none text-sm font-medium link-brand disabled:opacity-60"
                          >
                            {cvBusy ? 'Uploading…' : 'Replace'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={cvBusy}
                          className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition disabled:opacity-60"
                        >
                          {cvBusy ? 'Uploading…' : '+ Upload your CV (PDF or Doc)'}
                        </button>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCvChange}
                        className="hidden"
                      />
                      {cvNote && <p className="text-xs text-gray-500 mt-1">{cvNote}</p>}
                    </div>

                    <div>
                      <label htmlFor="cvi-targets" className="block text-sm font-semibold text-gray-900 mb-1">
                        What roles or domains are you aiming for?
                      </label>
                      <p className="text-sm text-gray-500 mb-2">
                        This helps our reviewer give notes that actually fit what you&rsquo;re going for.
                      </p>
                      <textarea
                        id="cvi-targets"
                        required
                        rows={3}
                        value={targetRoles}
                        onChange={(e) => setTargetRoles(e.target.value)}
                        placeholder="e.g. Program Management roles in education, or Data Analyst positions in health-tech"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
                      />
                      <span className="text-sm text-gray-600">
                        I&rsquo;m happy for aikyamjobs to read my CV and email me feedback.
                      </span>
                    </label>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button
                      type="submit"
                      disabled={submitBusy || !profile.currentCv || !consent}
                      className="btn-brand w-full px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                      {submitBusy ? 'Sending…' : 'Send my CV for feedback'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Done ── */}
            {stage === 'done' && (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-10">
                  <svg className="h-6 w-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Someone&rsquo;s reading it now</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Greeshma, Senti, Shemeer, Chhabil, others on the team will read your CV and email
                  you notes either way.
                </p>
                <ul className="mt-4 space-y-2 rounded-lg bg-background p-4 text-left">
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    A person reads it. Just like a friend would.
                  </li>
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    You get notes either way, usually within a day.
                  </li>
                  <li className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                    Clear notes on what&rsquo;s working and what to change — no strings to any
                    specific job.
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-400">
                  You can always come back here to read it, or send another once this one&rsquo;s
                  done.
                </p>
                <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
                  ← Browse roles
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

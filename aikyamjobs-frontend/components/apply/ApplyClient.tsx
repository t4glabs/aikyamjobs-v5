'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getMe,
  uploadCv,
  submitApplication,
  requestMagicLink,
  clearToken,
  getToken,
  type ApplicantProfile,
} from '@/lib/apply';

interface ChecklistItem {
  label: string;
  required?: boolean;
  weight?: number;
}

interface Props {
  jobSlug: string;
  jobTitle: string;
  companyName?: string;
  checklist: ChecklistItem[];
  confirmationCopy: string;
}

type Stage = 'checking' | 'signin' | 'link-sent' | 'form' | 'done' | 'already';

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ApplyClient({
  jobSlug,
  jobTitle,
  companyName,
  checklist,
  confirmationCopy,
}: Props) {
  const pathname = usePathname();

  const [stage, setStage] = useState<Stage>('checking');
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);

  // sign-in form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);

  // application form
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => false));
  const [answers, setAnswers] = useState('');
  const [consent, setConsent] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvNote, setCvNote] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // On mount, resume any existing session.
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
        setStage('form');
      } else {
        clearToken();
        setStage('signin');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigninBusy(true);
    const res = await requestMagicLink({ email: email.trim(), name: name.trim() || undefined, redirect: pathname });
    setSigninBusy(false);
    if (res.ok) setStage('link-sent');
    else setError(res.error);
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
      // Refresh profile so the CV-on-file view reflects the new upload.
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
      setError('Please upload your CV before applying.');
      return;
    }
    if (!consent) {
      setError('Please give consent to continue.');
      return;
    }
    setSubmitBusy(true);
    const res = await submitApplication({ jobSlug, checked, consent, answers: answers.trim() || undefined });
    setSubmitBusy(false);
    if (res.ok) {
      setStage('done');
    } else if (res.status === 409) {
      setStage('already');
    } else {
      setError(res.error);
    }
  }

  function handleSignOut() {
    clearToken();
    setProfile(null);
    setStage('signin');
  }

  const requiredMissing = checklist.some((item, i) => item.required && !checked[i]);

  // ── Shell ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500">Apply with aikyamjobs</p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{jobTitle}</h1>
        {companyName && <p className="text-sm text-gray-600 mt-0.5">{companyName}</p>}
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
              <h2 className="text-lg font-semibold text-gray-900">First, let&rsquo;s verify your email</h2>
              <p className="text-sm text-gray-500 mt-1">
                We&rsquo;ll email you a secure sign-in link. This keeps your CV on file so you never
                have to re-upload it for future roles.
              </p>
            </div>
            <div>
              <label htmlFor="ap-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="ap-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="ap-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                id="ap-email"
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
              {signinBusy ? 'Sending…' : 'Email me a sign-in link'}
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
            <h2 className="text-lg font-semibold text-gray-900">Check your inbox</h2>
            <p className="text-sm text-gray-500 mt-2">
              We sent a sign-in link to <strong className="text-gray-700">{email}</strong>. Open it
              to continue your application. The link expires in 20 minutes.
            </p>
          </div>
        )}

        {/* ── Application form ── */}
        {stage === 'form' && profile && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Signed in as <span className="text-gray-800 font-medium">{profile.email}</span>
              </span>
              <button type="button" onClick={handleSignOut} className="link-brand font-medium">
                Not you?
              </button>
            </div>

            {/* CV on file */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your CV</h3>
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
                      On file · uploaded {formatDate(profile.currentCv.uploadedAt)}
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
              {cvNote && <p className="text-xs text-gray-500 mt-2">{cvNote}</p>}
            </div>

            {/* Checklist */}
            {checklist.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Tell us how you match this role
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Tick only what genuinely applies to you — honesty helps us match you well.
                </p>
                <div className="space-y-2.5">
                  {checklist.map((item, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:border-gray-300 transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked[i]}
                        onChange={(e) => {
                          const next = [...checked];
                          next[i] = e.target.checked;
                          setChecked(next);
                        }}
                        className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
                      />
                      <span className="text-sm text-gray-700">
                        {item.label}
                        {item.required && (
                          <span className="ml-1.5 text-[11px] font-medium text-brand align-middle">
                            required
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {requiredMissing && (
                  <p className="text-xs text-amber-600 mt-2">
                    You haven&rsquo;t ticked some items marked required. You can still apply — just
                    know these roles look for them.
                  </p>
                )}
              </div>
            )}

            {/* Optional note */}
            <div>
              <label htmlFor="ap-answers" className="block text-sm font-semibold text-gray-900 mb-1">
                Anything you&rsquo;d like to add? <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="ap-answers"
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm text-gray-900 placeholder:text-gray-400"
                placeholder="A sentence on why this role interests you…"
              />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
              />
              <span className="text-sm text-gray-600">
                I confirm the information above is accurate and consent to aikyamjobs reviewing my
                application and sharing it with the organisation for this role.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitBusy || !profile.currentCv || !consent}
              className="btn-brand w-full px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {submitBusy ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Application received</h2>
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{confirmationCopy}</p>
            <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
              ← Browse more roles
            </Link>
          </div>
        )}

        {/* ── Already applied ── */}
        {stage === 'already' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">You&rsquo;ve already applied</h2>
            <p className="text-sm text-gray-500 mt-2">
              Our records show you&rsquo;ve already applied to this role with aikyamjobs. We&rsquo;ll
              be in touch by email.
            </p>
            <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
              ← Browse more roles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

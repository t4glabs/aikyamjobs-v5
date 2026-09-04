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
  location?: string;
  closingDate?: string;
  checklist: ChecklistItem[];
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
  location,
  closingDate,
  checklist,
}: Props) {
  const orgName = companyName || 'this organisation';
  const pathname = usePathname();

  const [stage, setStage] = useState<Stage>('checking');
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);

  // sign-in form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);

  // application form
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => false));
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
    const res = await submitApplication({ jobSlug, checked, consent });
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
        <p className="text-sm font-medium text-gray-500">CV check for</p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{jobTitle}</h1>
        {(companyName || location) && (
          <p className="text-sm text-gray-600 mt-0.5">
            {[companyName, location].filter(Boolean).join(' · ')}
          </p>
        )}
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
                {`${orgName} doesn’t see any of this. It stays between you and us.`}
              </li>
            </ul>
            <div>
              <label htmlFor="ap-name" className="block text-sm font-medium text-gray-700 mb-1">
                Your name
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

            {/* Checklist */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Which of the job requirements does your CV already provide?
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                This is a question about the CV. Tick what a reader could point to — that&rsquo;s
                all our friendly reviewer looks for too.
              </p>
              <ul className="space-y-2 rounded-lg bg-background p-4 mb-4">
                <li className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                  Tick it if a reader could find it in your CV without having to ask you.
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                  There&rsquo;s no right score here. We&rsquo;re putting two reads side by side, not
                  testing you.
                </li>
                <li className="flex gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                  Where the two reads differ is where the useful advice could come from.
                </li>
              </ul>

              {checklist.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {`What ${orgName} is looking for`}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {checked.filter(Boolean).length} ticked
                    </span>
                  </div>
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
                              essential
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {requiredMissing && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      One of the essentials isn&rsquo;t on the page yet. Send it anyway — if the
                      experience is there but hard to see, that&rsquo;s the most useful thing our
                      reviewer can point out.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* CV on file */}
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
              <p className="mt-2 text-xs text-gray-400">
                Both scores are against this file, so upload the version you&rsquo;d actually send.
              </p>
              {cvNote && <p className="text-xs text-gray-500 mt-1">{cvNote}</p>}
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
                I&rsquo;m happy for aikyamjobs to read my CV against this role and email me the
                result.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitBusy || !profile.currentCv || !consent}
              className="btn-brand w-full px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {submitBusy ? 'Sending…' : 'Send my CV for review'}
            </button>
            <p className="text-center text-xs text-gray-400">
              {`This isn’t your application — ${orgName} hasn’t seen anything yet.`}
            </p>
          </form>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-10">
              <svg className="h-6 w-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-6 6m6-6l6 6" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">With a friendly reviewer now</h2>
            <p className="text-sm text-gray-500 mt-2">
              Someone on our team will read your CV, then write an email to you.
            </p>
            <ul className="mt-4 space-y-2 rounded-lg bg-background p-4 text-left">
              <li className="flex gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                A person reads your CV — no algorithm, no AI, no keyword filter.
              </li>
              <li className="flex gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                You&rsquo;ll hear back either way, usually within a day.
              </li>
              <li className="flex gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[var(--brand)]" />
                {`If it’s a good fit, that email carries ${orgName}’s apply link.${
                  closingDate ? ` They close on ${formatDate(closingDate)}.` : ''
                }`}
              </li>
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              {`Your self-score stays between you and us. It never goes to ${orgName}.`}
            </p>
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

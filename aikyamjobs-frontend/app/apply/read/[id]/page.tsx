'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  getToken,
  getMe,
  getReadResult,
  requestMagicLink,
  type ReadResult,
} from '@/lib/apply';

type Stage = 'checking' | 'signin' | 'link-sent' | 'result' | 'not-found';

export default function ReadResultPage() {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;

  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadResult | null>(null);

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
      const res = await getReadResult(id);
      if (!active) return;
      if (!res.ok) {
        setStage(res.status === 403 || res.status === 401 ? 'signin' : 'not-found');
        return;
      }
      setResult(res.data);
      setStage('result');
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigninBusy(true);
    const res = await requestMagicLink({ email: email.trim(), redirect: pathname });
    setSigninBusy(false);
    if (res.ok) setStage('link-sent');
    else setError(res.error);
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
                  <h1 className="text-lg font-semibold text-gray-900">Sign in to view your results</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    This page belongs to whoever applied — confirm it&rsquo;s you with a sign-in link.
                  </p>
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

            {stage === 'not-found' && (
              <div className="text-center py-4">
                <h1 className="text-lg font-semibold text-gray-900">Couldn&rsquo;t find this</h1>
                <p className="text-sm text-gray-500 mt-2">
                  Either the link is wrong, or this result belongs to a different email.
                </p>
                <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
                  ← Browse roles
                </Link>
              </div>
            )}

            {stage === 'result' && result?.status === 'pending' && (
              <div className="text-center py-4">
                <h1 className="text-lg font-semibold text-gray-900">Still with a reviewer</h1>
                <p className="text-sm text-gray-500 mt-2">
                  We haven&rsquo;t finished reading your CV yet. This page updates the moment we do —
                  check back soon, or wait for our email.
                </p>
              </div>
            )}

            {stage === 'result' && result && result.status !== 'pending' && (
              <ResultView result={result} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: ReadResult }) {
  const isApproved = result.status === 'approved';
  const items = result.items || [];

  return (
    <div className="space-y-6">
      <div>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
            isApproved ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isApproved ? 'GOOD MATCH' : 'NOT THIS TIME'}
        </span>
        <h1 className="text-xl font-bold text-gray-900 mt-2">
          {`Your CV against ${result.jobTitle || 'this role'}`}
        </h1>
        {result.companyName && <p className="text-sm text-gray-600 mt-0.5">{result.companyName}</p>}
      </div>

      <div className="flex items-center gap-6 rounded-lg bg-background p-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{result.reviewerPercent}%</p>
          <p className="text-xs text-gray-500">our read</p>
        </div>
        <p className="text-sm text-gray-600">
          Requirement by requirement, below — where we ticked more than you did, your CV proves more
          than you gave it credit for. Where we ticked less, it isn&rsquo;t on the page yet.
        </p>
      </div>

      {items.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Requirement</th>
                <th className="px-4 py-2 font-medium text-center">You</th>
                <th className="px-4 py-2 font-medium text-center">Us</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">
                    {item.label}
                    {item.required && <span className="ml-1.5 text-[11px] text-brand">essential</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.applicantChecked === null ? '—' : item.applicantChecked ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{item.reviewerChecked ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.leadWithThese && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Lead with these</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{result.leadWithThese}</p>
        </div>
      )}

      {result.fixBeforeSending && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {isApproved ? 'Worth changing first' : 'What we couldn’t find on the page'}
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{result.fixBeforeSending}</p>
        </div>
      )}

      {!isApproved && result.canReapply && result.jobSlug && (
        <Link
          href={`/jobs/${result.jobSlug}/apply`}
          className="inline-block text-xs link-brand font-medium"
        >
          Ready to apply again? →
        </Link>
      )}

      {!isApproved && result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Roles your CV already scores well against
          </h3>
          <div className="space-y-1.5">
            {result.recommendations.map((r) => (
              <Link
                key={r.slug}
                href={`/jobs/${r.slug}`}
                className="block text-sm link-brand font-medium"
              >
                {r.title} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {isApproved && result.applyTarget && (result.applyTarget.url || result.applyTarget.email) && (
        <div className="pt-2">
          <a
            href={result.applyTarget.url || `mailto:${result.applyTarget.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand block w-full text-center px-6 py-3 rounded-md text-sm font-semibold"
          >
            {result.applyTarget.url ? 'Apply on their site →' : 'Apply by email →'}
          </a>
          <p className="mt-2 text-center text-xs text-gray-500">
            That link is their own form — we&rsquo;re not in the middle of it.
          </p>
        </div>
      )}
    </div>
  );
}

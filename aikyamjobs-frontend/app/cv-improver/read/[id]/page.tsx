'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, getMe, requestMagicLink } from '@/lib/apply';
import { getCvReviewResult, type CvReviewResult } from '@/lib/cvImprover';
import { track } from '@/lib/analytics';

type Stage = 'checking' | 'signin' | 'link-sent' | 'result' | 'not-found';

export default function CvReviewResultPage() {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;

  const [stage, setStage] = useState<Stage>('checking');
  const [email, setEmail] = useState('');
  const [signinBusy, setSigninBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvReviewResult | null>(null);

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
      const res = await getCvReviewResult(id);
      if (!active) return;
      if (!res.ok) {
        setStage(res.status === 403 || res.status === 401 ? 'signin' : 'not-found');
        return;
      }
      setResult(res.data);
      setStage('result');
      if (res.data.status !== 'pending') {
        track('CV Improver Result Viewed');
      }
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
    if (res.ok) {
      track('Magic Link Requested', { context: 'cv-improver-read' });
      setStage('link-sent');
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <Link href="/cv-improver" className="link-brand text-sm font-medium">
            ← Back to CV Improver
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
                  <h1 className="text-lg font-semibold text-gray-900">Sign in to view your feedback</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    This page belongs to whoever submitted it — confirm it&rsquo;s you with a sign-in
                    link.
                  </p>
                </div>
                <div>
                  <label htmlFor="cvr-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="cvr-email"
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
                  Either the link is wrong, or this belongs to a different email.
                </p>
                <Link href="/cv-improver" className="inline-block mt-6 link-brand text-sm font-medium">
                  ← Back to CV Improver
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

function ResultView({ result }: { result: CvReviewResult }) {
  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700">
          FEEDBACK READY
        </span>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Your CV Improver feedback</h1>
        {result.targetRoles && (
          <p className="text-sm text-gray-600 mt-0.5">{`You told us you're aiming for: ${result.targetRoles}`}</p>
        )}
      </div>

      {result.leadWithThese && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">What&rsquo;s currently good</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{result.leadWithThese}</p>
        </div>
      )}

      {result.fixBeforeSending && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">What needs changes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{result.fixBeforeSending}</p>
        </div>
      )}

      <Link href="/cv-improver" className="inline-block text-xs link-brand font-medium">
        ← Back to CV Improver
      </Link>
    </div>
  );
}

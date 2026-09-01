'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyMagicLink } from '@/lib/apply';

function VerifyInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    // Tokens are single-use — guard against React strict-mode double-invoke.
    if (ran.current) return;
    ran.current = true;

    const email = sp.get('email');
    const token = sp.get('token');
    const redirectParam = sp.get('redirect');

    if (!email || !token) {
      setStatus('error');
      setMessage('This link is missing information. Please request a new one.');
      return;
    }

    (async () => {
      const res = await verifyMagicLink({ email, token });
      if (res.ok) {
        const dest =
          redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
            ? redirectParam
            : '/jobs';
        router.replace(dest);
      } else {
        setStatus('error');
        setMessage(res.error || 'This link is invalid or has expired.');
      }
    })();
  }, [sp, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
        {status === 'verifying' ? (
          <>
            <span className="mx-auto mb-4 block animate-spin h-6 w-6 rounded-full border-2 border-gray-200 border-t-gray-900" />
            <h1 className="text-lg font-semibold text-gray-900">Signing you in…</h1>
            <p className="text-sm text-gray-500 mt-2">Just a moment.</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Sign-in link problem</h1>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
            <Link href="/jobs" className="inline-block mt-6 link-brand text-sm font-medium">
              ← Browse roles
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}

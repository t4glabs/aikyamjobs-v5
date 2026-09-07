'use client';

import Link from 'next/link';
import { useApplicantIdentity } from './useApplicantIdentity';

/**
 * Mobile counterpart to ApplicantNavIndicator: the hamburger panel is already
 * an open menu, so this renders the same three items inline (no nested
 * dropdown) matching the other mobile nav links. Invisible if not signed in.
 */
export default function ApplicantMobileMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { email, signOut } = useApplicantIdentity();

  if (!email) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="px-0 pb-2 text-xs text-gray-400 truncate">{email}</p>
      <Link
        href="/apply/mine"
        onClick={onNavigate}
        className="flex items-center min-h-11 text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-50 transition"
      >
        My applications
      </Link>
      <Link
        href="/apply/saved"
        onClick={onNavigate}
        className="flex items-center min-h-11 text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-50 transition"
      >
        Saved jobs
      </Link>
      <button
        type="button"
        onClick={() => {
          signOut();
          onNavigate?.();
        }}
        className="flex items-center min-h-11 text-[15px] text-gray-700 hover:text-gray-900 transition"
      >
        Sign out
      </button>
    </div>
  );
}

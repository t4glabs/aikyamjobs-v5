'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApplicantIdentity } from './useApplicantIdentity';

/**
 * Desktop signed-in indicator: an initial circle that opens a small dropdown
 * (My applications, Saved jobs, Sign out). Invisible to everyone else. The
 * mobile hamburger menu renders the same three items inline instead — see
 * ApplicantMobileMenu — since a dropdown-inside-a-dropdown doesn't make sense
 * on small screens.
 */
export default function ApplicantNavIndicator() {
  const { email, signOut } = useApplicantIdentity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!email) return null;
  const initial = email.trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={email}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center justify-center h-8 w-8 flex-none rounded-full bg-[var(--brand)] text-white text-xs font-semibold transition hover:opacity-90"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
          <p className="px-3 py-2 text-xs text-gray-400 truncate border-b border-gray-100">{email}</p>
          <Link
            href="/apply/mine"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            My applications
          </Link>
          <Link
            href="/apply/saved"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Saved jobs
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              setOpen(false);
            }}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getToken, getMe, clearToken } from '@/lib/apply';

/**
 * Shared by the desktop dropdown and the mobile menu items so both surfaces
 * agree on whether an applicant is signed in without duplicating the fetch.
 */
export function useApplicantIdentity() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!getToken()) return;
    (async () => {
      const res = await getMe();
      if (!active) return;
      if (res.ok) setEmail(res.data.email);
    })();
    return () => {
      active = false;
    };
  }, []);

  function signOut() {
    clearToken();
    setEmail(null);
  }

  return { email, signOut };
}

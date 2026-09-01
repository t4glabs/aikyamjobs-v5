// Client-side helper for the gated application flow. Talks straight to the
// Strapi /apply/* endpoints (like the search page talks to Meili) and keeps the
// applicant's magic-link JWT in localStorage. Safe to import in client
// components only — every function guards `window`.

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const JWT_KEY = 'aikyam_apply_jwt';

export interface ApplicantProfile {
  id: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  currentCv?: {
    id: number;
    originalName?: string;
    uploadedAt?: string;
    url?: string | null;
  } | null;
}

export interface CvUploadResult {
  cvUpload: { id: number; originalName?: string; uploadedAt?: string; url?: string };
  counted: boolean;
  countedInWindow: number;
  remaining: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(JWT_KEY);
}
export function setToken(token: string) {
  window.localStorage.setItem(JWT_KEY, token);
}
export function clearToken() {
  window.localStorage.removeItem(JWT_KEY);
}
export function isSignedIn(): boolean {
  return !!getToken();
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function request<T>(
  path: string,
  { method = 'GET', body, auth = false, isForm = false }: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    isForm?: boolean;
  } = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}/api${path}`, {
      method,
      headers,
      body: isForm ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: 'Could not reach the server. Please try again.' };
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* some responses may be empty */
  }

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ||
      `Something went wrong (${res.status}).`;
    return { ok: false, status: res.status, error: message };
  }
  return { ok: true, data: json as T };
}

export function requestMagicLink(input: { email: string; name?: string; redirect?: string }) {
  return request<{ ok: boolean }>('/apply/auth/request', { method: 'POST', body: input });
}

export async function verifyMagicLink(input: { email: string; token: string }) {
  const res = await request<{ jwt: string; applicant: ApplicantProfile }>(
    '/apply/auth/verify',
    { method: 'POST', body: input }
  );
  if (res.ok) setToken(res.data.jwt);
  return res;
}

export function getMe() {
  return request<ApplicantProfile>('/apply/me', { auth: true });
}

export function uploadCv(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<CvUploadResult>('/apply/me/cv', {
    method: 'POST',
    auth: true,
    isForm: true,
    body: form,
  });
}

export function submitApplication(input: {
  jobSlug: string;
  checked: boolean[];
  consent: boolean;
  answers?: string;
}) {
  return request<{ ok: boolean; applicationId: number; status: string }>('/apply/submit', {
    method: 'POST',
    auth: true,
    body: input,
  });
}

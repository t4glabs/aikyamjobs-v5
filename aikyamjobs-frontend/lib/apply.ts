// Client-side helper for the gated application flow. Talks straight to the
// Strapi /apply/* endpoints (like the search page talks to Meili). The actual
// session is an httpOnly cookie set by the backend on verify — never
// JS-readable, so an XSS elsewhere on the site can't steal it. `getToken()`
// et al. below read/write a separate, non-sensitive "do we think we're
// signed in" marker, used only to decide whether it's worth making the real
// (server-authoritative) /apply/me call — never used as a credential itself.
// Safe to import in client components only — every function guards `window`.

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const SESSION_FLAG_KEY = 'aikyam_signed_in';

export interface CvLimitStatus {
  max: number;
  windowDays: number;
  countedInWindow: number;
  remaining: number;
}

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
  cvLimitStatus?: CvLimitStatus;
  cvMindmapPdf?: { url: string } | null;
}

export interface CvUploadResult {
  cvUpload: { id: number; originalName?: string; uploadedAt?: string; url?: string };
  counted: boolean;
  countedInWindow: number;
  remaining: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SESSION_FLAG_KEY);
}
export function setToken() {
  window.localStorage.setItem(SESSION_FLAG_KEY, '1');
}
export function clearToken() {
  window.localStorage.removeItem(SESSION_FLAG_KEY);
  // Fire-and-forget: the actual credential is the httpOnly cookie, which JS
  // can't clear directly. Not awaited so sign-out feels instant; harmless if
  // it races with navigation since the server-side clear doesn't depend on
  // the client sticking around.
  fetch(`${STRAPI_URL}/api/apply/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}
export function isSignedIn(): boolean {
  return !!getToken();
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function request<T>(
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

  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}/api${path}`, {
      method,
      headers,
      // The session lives in an httpOnly cookie now, not a header we attach
      // manually — 'include' is what makes the browser send it (and honor
      // Set-Cookie on the verify/logout responses) even when STRAPI_URL is a
      // different origin than the page, as it is in local dev.
      credentials: auth ? 'include' : 'same-origin',
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
  // auth: true here isn't "I already have a session" -- it's "please include
  // credentials so the Set-Cookie on this response actually gets stored,"
  // which request() needs for a cross-origin fetch (local dev) same as any
  // other authenticated call.
  const res = await request<{ ok: boolean; applicant: ApplicantProfile }>(
    '/apply/auth/verify',
    { method: 'POST', body: input, auth: true }
  );
  if (res.ok) setToken();
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

export interface ReadResultItem {
  label: string;
  required?: boolean;
  weight?: number;
  reviewerChecked: boolean;
  applicantChecked: boolean | null;
}

export interface ReadResult {
  status: 'pending' | 'approved' | 'rejected_with_tips' | string;
  jobTitle?: string;
  jobSlug?: string;
  companyName?: string | null;
  decisionAt?: string;
  reviewerScore?: number;
  reviewerMax?: number;
  reviewerPercent?: number;
  items?: ReadResultItem[];
  leadWithThese?: string | null;
  fixBeforeSending?: string | null;
  applyTarget?: { url: string | null; email: string | null } | null;
  recommendations?: Array<{ title: string; slug: string }>;
  canReapply?: boolean;
}

export interface ApplyStatus {
  hasApplication: boolean;
  applicationId?: number;
  status?: string;
  decided?: boolean;
}

export function getApplyStatus(jobSlug: string) {
  return request<ApplyStatus>(`/apply/status/${jobSlug}`, { auth: true });
}

export function getReadResult(id: string | number) {
  return request<ReadResult>(`/apply/read/${id}`, { auth: true });
}

export interface MyApplication {
  applicationId: number;
  jobTitle: string;
  jobSlug: string | null;
  companyName: string | null;
  status: string;
  decided: boolean;
  submittedAt?: string;
}

export function getMyApplications() {
  return request<{ applications: MyApplication[] }>('/apply/mine', { auth: true });
}

export interface SavedJob {
  jobId: number;
  jobTitle: string;
  jobSlug: string;
  companyName: string | null;
  savedAt?: string;
}

export function getSavedStatus(jobSlug: string) {
  return request<{ saved: boolean }>(`/apply/saved/${jobSlug}`, { auth: true });
}

export function saveJob(jobSlug: string) {
  return request<{ saved: boolean }>(`/apply/saved/${jobSlug}`, { method: 'POST', auth: true });
}

export function unsaveJob(jobSlug: string) {
  return request<{ saved: boolean }>(`/apply/saved/${jobSlug}`, { method: 'DELETE', auth: true });
}

export function getSavedJobs() {
  return request<{ savedJobs: SavedJob[] }>('/apply/saved', { auth: true });
}

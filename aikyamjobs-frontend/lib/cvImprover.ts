// Client-side helper for the standalone "CV Improver" flow — general CV
// feedback, not tied to any job. Reuses the exact same applicant identity
// (magic-link JWT, sign-in helpers, CV upload) as lib/apply.ts; only the
// CV-Improver-specific endpoints live here.

import { request } from './apply';

export interface SubmitCvReviewInput {
  targetRoles: string;
  consent: boolean;
}

export function submitCvReview(input: SubmitCvReviewInput) {
  return request<{ ok: boolean; id: number; status: string }>('/cv-improver/submit', {
    method: 'POST',
    auth: true,
    body: input,
  });
}

export interface CvReviewResult {
  status: 'pending' | 'reviewed';
  targetRoles?: string;
  leadWithThese?: string | null;
  fixBeforeSending?: string | null;
  submittedAt?: string;
  reviewedAt?: string;
}

export function getCvReviewResult(id: string | number) {
  return request<CvReviewResult>(`/cv-improver/read/${id}`, { auth: true });
}

export interface MyCvReview {
  id: number;
  targetRoles: string;
  status: 'submitted' | 'reviewed';
  submittedAt?: string;
  reviewedAt?: string | null;
}

export function getMyCvReviews() {
  return request<{ reviews: MyCvReview[] }>('/cv-improver/mine', { auth: true });
}

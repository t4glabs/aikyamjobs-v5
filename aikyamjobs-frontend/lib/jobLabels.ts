import type { Job } from '@/lib/types';

type JobType = Job['attributes']['jobType'];
type ExperienceLevel = Job['attributes']['experienceLevel'];

// Display labels for the Job enums. The stored values ('full-time',
// 'contract', ...) are what the backend filters on and what every shared
// /jobs?jobType=... link carries, so they must never change; only what the
// visitor reads goes through these. Keep in sync with the `jobType` and
// `experienceLevel` enums in the backend job schema.
export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'fellowship', label: 'Fellowship' },
];

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
};

const jobTypeMap = new Map<string, string>(JOB_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// Unknown values (a new enum option added in Strapi before this list is
// updated) still get a capital first letter instead of showing raw.
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function jobTypeLabel(value?: string | null): string {
  if (!value) return '';
  return jobTypeMap.get(value) || capitalizeFirst(value);
}

export function experienceLevelLabel(value?: string | null): string {
  if (!value) return '';
  return EXPERIENCE_LEVEL_LABELS[value as ExperienceLevel] || capitalizeFirst(value);
}

import { CourseFieldOfStudy, CourseType } from '@/lib/types';

// Mirrors the fixed Field of Study / Course Type lists in the Learn & Grow
// course authoring spec, plus a couple of extensions (physical-sciences,
// social-sciences, postgraduate-diploma) added when seeding Azim Premji
// University's full catalogue surfaced programmes the original fixed list
// didn't cleanly cover.
export const FIELD_OF_STUDY_OPTIONS: { value: CourseFieldOfStudy; label: string }[] = [
  { value: 'life-sciences', label: 'Life Sciences' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physical-sciences', label: 'Physical Sciences' },
  { value: 'environment-and-sustainability', label: 'Environment and Sustainability' },
  { value: 'management', label: 'Management' },
  { value: 'social-work', label: 'Social Work' },
  { value: 'social-sciences', label: 'Social Sciences' },
  { value: 'education', label: 'Education' },
  { value: 'public-policy', label: 'Public Policy' },
  { value: 'data-and-technology', label: 'Data and Technology' },
  { value: 'arts-and-humanities', label: 'Arts and Humanities' },
  { value: 'health-sciences', label: 'Health Sciences' },
];

export const COURSE_TYPE_OPTIONS: { value: CourseType; label: string }[] = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'postgraduate-diploma', label: 'Postgraduate Diploma' },
  { value: 'executive-education', label: 'Executive Education' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'workshop', label: 'Workshop' },
];

export const MODE_OPTIONS: { value: 'full-time' | 'part-time' | 'online'; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'online', label: 'Online' },
];

const fieldOfStudyMap = new Map(FIELD_OF_STUDY_OPTIONS.map((o) => [o.value, o.label]));
const courseTypeMap = new Map(COURSE_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const modeMap = new Map(MODE_OPTIONS.map((o) => [o.value, o.label]));

export function fieldOfStudyLabel(value?: string): string {
  if (!value) return '';
  return fieldOfStudyMap.get(value as CourseFieldOfStudy) || value;
}

export function courseTypeLabel(value?: string): string {
  if (!value) return '';
  return courseTypeMap.get(value as CourseType) || value;
}

export function modeLabel(value?: string): string {
  if (!value) return '';
  return modeMap.get(value as any) || value;
}

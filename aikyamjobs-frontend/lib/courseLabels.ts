import { CourseType } from '@/lib/types';

// Field of Study is admin-managed (api::course-field-of-study) so it can grow
// without a code deploy — see lib/api.ts getCourseFieldsOfStudy(). Course Type
// and Mode stay as fixed code-level enums: the Learn & Grow course authoring
// spec treats Course Type as a fixed list by design, and Mode's vocabulary
// (Full-time/Part-time/Online) isn't expected to grow.
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

const courseTypeMap = new Map(COURSE_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const modeMap = new Map(MODE_OPTIONS.map((o) => [o.value, o.label]));

export function courseTypeLabel(value?: string): string {
  if (!value) return '';
  return courseTypeMap.get(value as CourseType) || value;
}

export function modeLabel(value?: string): string {
  if (!value) return '';
  return modeMap.get(value as any) || value;
}

// Job.skills is a Strapi JSON field. Today every entry is a plain string
// ("MS Excel"). It's allowed to grow into a structured, ESCO-shaped object
// without a schema change -- one job (or one entry) at a time -- so every
// reader goes through normalizeSkills() and both shapes keep rendering:
//
//   "MS Excel"                                   // legacy, still valid
//   { label: "MS Excel",                         // ESCO: preferredLabel
//     type: "tool",                              // ESCO skillType / collection
//     level: 2,                                  // our 1-4 scale (ESCO has none)
//     importance: "essential",                   // ESCO occupation<->skill relation
//     esco: "http://data.europa.eu/esco/skill/…" // ESCO concept URI
//   }

export type SkillType = 'skill' | 'knowledge' | 'tool' | 'language' | 'transversal';
export type SkillLevel = 1 | 2 | 3 | 4;

export interface StructuredSkill {
  label: string;
  type?: SkillType;
  level?: SkillLevel;
  importance?: 'essential' | 'optional';
  esco?: string;
}

export type SkillEntry = string | StructuredSkill;

export interface NormalizedSkill {
  label: string;
  type?: SkillType;
  level?: SkillLevel;
  essential?: boolean;
  escoUri?: string;
}

export const SKILL_LEVELS: Record<SkillLevel, string> = {
  1: 'Basic',
  2: 'Working',
  3: 'Advanced',
  4: 'Expert',
};

export const SKILL_TYPES: Record<SkillType, string> = {
  skill: 'Skill',
  knowledge: 'Knowledge',
  tool: 'Tool',
  language: 'Language',
  // ESCO's term in the data; candidate-facing wording on the card.
  transversal: 'Soft skill',
};

// Only ever link out to ESCO itself -- this field is editorial input.
const ESCO_URI = /^http:\/\/data\.europa\.eu\/esco\/skill\/[0-9a-f-]{36}$/;

export function escoPageUrl(uri: string) {
  return `https://esco.ec.europa.eu/en/classification/skill?uri=${encodeURIComponent(uri)}`;
}

export function normalizeSkill(entry: unknown): NormalizedSkill | null {
  if (typeof entry === 'string') {
    const label = entry.trim();
    return label ? { label } : null;
  }
  if (!entry || typeof entry !== 'object') return null;

  const raw = entry as Record<string, unknown>;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!label) return null;

  const skill: NormalizedSkill = { label };
  if (typeof raw.type === 'string' && raw.type in SKILL_TYPES) skill.type = raw.type as SkillType;
  if (typeof raw.level === 'number' && raw.level in SKILL_LEVELS) skill.level = raw.level as SkillLevel;
  if (raw.importance === 'essential') skill.essential = true;
  if (raw.importance === 'optional') skill.essential = false;
  if (typeof raw.esco === 'string' && ESCO_URI.test(raw.esco)) skill.escoUri = raw.esco;
  return skill;
}

export function normalizeSkills(entries: unknown): NormalizedSkill[] {
  if (!Array.isArray(entries)) return [];
  return entries.map(normalizeSkill).filter((s): s is NormalizedSkill => s !== null);
}

// For places that only ever show the name (job cards, search links).
export function skillLabels(entries: unknown): string[] {
  return normalizeSkills(entries).map((s) => s.label);
}

import {
  escoPageUrl,
  normalizeSkills,
  SKILL_LEVELS,
  SKILL_TYPES,
  type NormalizedSkill,
  type SkillLevel,
} from '@/lib/skills';

/**
 * "Skills this role needs" -- the JD's skills array, moved up from the
 * bottom of the page and shown as tiles. Server component, no JS.
 *
 * Accepts today's plain-string skills and the optional structured shape
 * (see lib/skills.ts). Plain strings -- all current data -- render as
 * neutral tiles. Type, essential/optional, ESCO link and level only appear
 * once a skill actually carries them, so levels can be added to the data
 * later with no change here. Colour only ever means something: a single-hue
 * ramp that deepens with the required level (ordinal -> lightness), teal
 * rather than brand red so it never competes with the Apply button.
 */

interface Tone {
  bg: string;
  border: string;
  text: string;
  meta: string;
  barOn: string;
  barOff: string;
}

// Contrast-checked: text >= 5.9:1, meta >= 4.8:1, filled bar >= 4.5:1 on
// every step; each step visibly deeper than the last. 0 = no level (neutral).
const TONES: Record<0 | SkillLevel, Tone> = {
  0: { bg: '#F4F8F6', border: '#D8E7E1', text: '#1F2937', meta: '#3E6B5E', barOn: '#2E6F5E', barOff: 'rgba(31,41,55,0.14)' },
  1: { bg: '#EAF4F0', border: '#C9E1D7', text: '#1F2937', meta: '#2F6455', barOn: '#2E6F5E', barOff: 'rgba(31,41,55,0.14)' },
  2: { bg: '#CDE7DC', border: '#A9D2C2', text: '#1F2937', meta: '#245A4C', barOn: '#2E6F5E', barOff: 'rgba(31,41,55,0.16)' },
  3: { bg: '#9CCDB9', border: '#7AB9A1', text: '#10241E', meta: '#173D33', barOn: '#1E4D40', barOff: 'rgba(16,36,30,0.18)' },
  4: { bg: '#2E6F5E', border: '#245A4C', text: '#FFFFFF', meta: '#D7EDE5', barOn: '#FFFFFF', barOff: 'rgba(255,255,255,0.3)' },
};

const tone = (s: NormalizedSkill) => TONES[s.level ?? 0];

function LevelMeter({ level, t }: { level: SkillLevel; t: Tone }) {
  return (
    <span className="flex flex-none items-end gap-1" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className="h-1.5 w-3 rounded-full sm:w-4" style={{ background: n <= level ? t.barOn : t.barOff }} />
      ))}
    </span>
  );
}

function EscoLink({ uri, color }: { uri: string; color: string }) {
  return (
    <a
      href={escoPageUrl(uri)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] font-semibold underline-offset-2 hover:underline"
      style={{ color }}
    >
      ESCO
      <span className="sr-only"> definition (opens in a new tab)</span>
    </a>
  );
}

// Screen-reader sentence for the visual bits (meter, colour, dashed border).
function srDetails(s: NormalizedSkill) {
  const parts = [
    s.level ? `${SKILL_LEVELS[s.level]} level` : null,
    s.essential === true ? 'essential' : s.essential === false ? 'nice to have' : null,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

// Small key, only for what the data actually uses (nothing, for plain strings).
function Legend({ skills }: { skills: NormalizedSkill[] }) {
  const hasLevels = skills.some((s) => s.level);
  const hasOptional = skills.some((s) => s.essential === false);
  if (!hasLevels && !hasOptional) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600" aria-hidden="true">
      {hasLevels &&
        ([1, 2, 3, 4] as SkillLevel[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border" style={{ background: TONES[l].bg, borderColor: TONES[l].border }} />
            {SKILL_LEVELS[l]}
          </span>
        ))}
      {hasOptional && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border border-dashed border-gray-400" />
          Nice to have
        </span>
      )}
    </div>
  );
}

export default function SkillCards({ skills: raw }: { skills: unknown }) {
  const skills = normalizeSkills(raw);
  if (skills.length === 0) return null;

  // Once levels exist: highest first, so the "must be strong at" skills lead.
  const ordered = skills.some((s) => s.level) ? [...skills].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)) : skills;

  return (
    <section aria-labelledby="skills-heading" className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="skills-heading" className="text-base font-semibold text-gray-900">
          Skills this role needs
        </h2>
        <Legend skills={ordered} />
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ordered.map((s, i) => {
          const t = tone(s);
          const meta = [s.type ? SKILL_TYPES[s.type] : null, s.essential === false ? 'Nice to have' : null].filter(Boolean);
          return (
            <li
              key={i}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${s.level ? 'min-h-[84px]' : ''} ${s.essential === false ? 'border-dashed' : ''}`}
              style={{ background: t.bg, borderColor: t.border }}
            >
              {(meta.length > 0 || s.escoUri) && (
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.meta }}>
                  <span>{meta.join(' · ')}</span>
                  {s.escoUri && <EscoLink uri={s.escoUri} color={t.meta} />}
                </div>
              )}
              <p className="text-sm font-semibold leading-snug" style={{ color: t.text }}>
                {s.label}
                <span className="sr-only">{srDetails(s)}</span>
              </p>
              {s.level && (
                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1" aria-hidden="true">
                  <LevelMeter level={s.level} t={t} />
                  <span className="text-[11px] font-medium" style={{ color: t.meta }}>
                    {SKILL_LEVELS[s.level]}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

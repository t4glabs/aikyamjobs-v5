import type { MindmapNode } from '@/lib/types';

/**
 * Company page: just the "Major Initiatives & Programmes" branch of the
 * company's mindmap, as cards -- the rest of the map is left out on
 * purpose. Server component, no JS.
 *
 * The branch label varies across real company maps ("Major Initiatives &
 * Programmes", "Initiatives & Programmes", "Initiatives; Programmes",
 * "Major Programs & Global Impact", ...), so match "initiative" first, then
 * "programme/program". No matching branch -> nothing rendered. Item text is
 * short in practice (median ~130 chars, max ~200), so it's shown in full.
 */

// Same palette as the mindmap/PDF, used only to tell cards apart.
const ACCENTS = ['#AE4634', '#2E6F5E', '#3F5D8A', '#8A5A3F', '#5A4F8A', '#3F7A8A', '#7A3F6E'];

export function pickInitiatives(tree: MindmapNode | null): MindmapNode[] {
  const branches = tree?.children ?? [];
  const branch =
    branches.find((b) => /initiative/i.test(b.label)) ?? branches.find((b) => /programme|program/i.test(b.label));
  return branch?.children ?? [];
}

export default function InitiativeCards({ tree }: { tree: MindmapNode | null }) {
  const items = pickInitiatives(tree);
  if (items.length === 0) return null;

  // 2 or 4 items read better as a 2x grid; 3 or 5+ as 3 across.
  const cols = items.length === 2 || items.length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section aria-labelledby="initiatives-heading" className="mb-8">
      <h2 id="initiatives-heading" className="mb-3 text-base font-semibold text-gray-900">
        Major initiatives &amp; programmes
      </h2>
      <ul className={`grid grid-cols-1 gap-3 ${cols}`}>
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4"
            style={{ borderTop: `3px solid ${ACCENTS[i % ACCENTS.length]}` }}
          >
            <h3 className="text-sm font-semibold leading-snug text-gray-900">{item.label}</h3>
            {item.details && <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{item.details}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

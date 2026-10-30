'use strict';

/**
 * Turns a raw, editorial mindmapJson (Job or Company) into the small,
 * normalized tree the JD page's interactive "Role at a glance" view renders.
 *
 * mindmapJson itself stays `private: true` -- it never goes out through the
 * normal REST API (job lists, company pages, Meilisearch, KyaAI). Only this
 * whitelisted shape does, through the dedicated GET /jobs/:slug/mindmap
 * route. Deliberately independent of mindmapPdf.js / the Typst template, so
 * nothing here can change what the PDF renders.
 *
 * Accepts the same two shapes the PDF template tolerates:
 *   1. { title, root: { label, details?, children?: [...] } }
 *   2. { title, children: [...] } -- top-level object IS the root, node
 *      text in `title` instead of `label`.
 * plus node text in `topic` (jsMind-style; seen on a real job whose PDF is
 * skipped for exactly this reason).
 * Anything else (e.g. the flat { id, title, organization, role_summary }
 * shape seen on a couple of real jobs) returns null -- no panel, same as the
 * PDF skipping it.
 *
 * Output node: { label, details?, children? } -- every other key (`id`, any
 * stray editorial field) is dropped.
 */

const MAX_DEPTH = 6;
const MAX_NODES = 300;
const MAX_LABEL = 300;
const MAX_DETAILS = 2000;

// Source-citation markers the generator leaves in the text ("... [1]",
// "[2, 3]"). Meaningless on the page without the sources list.
const CITATION_RE = /\s*\[\d+(?:\s*,\s*\d+)*\]/g;

// A few real mindmaps carry HTML entities in their text ("Initiatives &amp;
// Programmes"). The frontend renders plain text (React escapes it), so these
// would show literally -- decode the basic ones here.
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
const ENTITY_RE = /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g;

function cleanText(value, max) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(ENTITY_RE, (e) => ENTITIES[e])
    .replace(CITATION_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function toPublicTree(mindmapJson) {
  if (!mindmapJson || typeof mindmapJson !== 'object' || Array.isArray(mindmapJson)) return null;
  const root = mindmapJson.root && typeof mindmapJson.root === 'object' ? mindmapJson.root : mindmapJson;

  let budget = MAX_NODES;

  function walk(node, depth) {
    if (!node || typeof node !== 'object' || budget <= 0) return null;
    const label = cleanText(node.label ?? node.title ?? node.topic, MAX_LABEL);
    if (!label) return null;
    budget -= 1;

    const out = { label };
    const details = cleanText(node.details, MAX_DETAILS);
    if (details) out.details = details;

    if (depth < MAX_DEPTH && Array.isArray(node.children)) {
      const children = node.children.map((c) => walk(c, depth + 1)).filter(Boolean);
      if (children.length) out.children = children;
    }
    return out;
  }

  const tree = walk(root, 0);
  // A root with nothing under it isn't worth an interactive panel.
  return tree && tree.children ? tree : null;
}

/**
 * The "Major Initiatives & Programmes" branch of a (normalized) company tree
 * -- the one part of a company map the site and the JD PDF show. Labels
 * vary across real maps ("Initiatives & Programmes", "Initiatives;
 * Programmes", "Major Programs & Global Impact", ...), so prefer
 * "initiative", then "programme/program". Mirrors the frontend's
 * components/InitiativeCards.tsx pickInitiatives().
 */
function pickInitiatives(tree) {
  const branches = (tree && tree.children) || [];
  const branch =
    branches.find((b) => /initiative/i.test(b.label)) || branches.find((b) => /programme|program/i.test(b.label));
  return branch && branch.children ? branch.children : [];
}

module.exports = { toPublicTree, pickInitiatives };

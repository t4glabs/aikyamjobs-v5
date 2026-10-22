// Meilisearch's `_formatted` fields wrap matched substrings in whatever
// highlightPreTag/highlightPostTag we configure, but pass the REST of the
// text through verbatim -- including any raw HTML-like characters already
// present in an indexed job/company/blog title. Rendering that via
// dangerouslySetInnerHTML lets anything in the index execute as markup.
// Using inert, non-HTML sentinel markers (instead of literal <mark> tags) for
// the Meilisearch request means nothing in the response is ever HTML -- we
// parse the sentinels ourselves and build real <mark> elements, so every
// other character becomes a plain string child that React auto-escapes.
// U+E000/U+E001 are Unicode Private Use Area code points, guaranteed not to
// appear in real indexed content, so splitting on them cannot misfire.
export const HIGHLIGHT_START = "\uE000";
export const HIGHLIGHT_END = "\uE001";

export const meiliHighlightTags = {
  highlightPreTag: HIGHLIGHT_START,
  highlightPostTag: HIGHLIGHT_END,
};

export function renderHighlighted(formatted: string | undefined, fallback: string, markClassName: string): React.ReactNode {
  const text = formatted || fallback;
  if (!text.includes(HIGHLIGHT_START)) return text;

  const nodes: React.ReactNode[] = [];
  const segments = text.split(HIGHLIGHT_START);
  nodes.push(segments[0]);
  for (let i = 1; i < segments.length; i++) {
    const [highlighted, ...rest] = segments[i].split(HIGHLIGHT_END);
    nodes.push(<mark key={i} className={markClassName}>{highlighted}</mark>);
    nodes.push(rest.join(HIGHLIGHT_END));
  }
  return nodes;
}

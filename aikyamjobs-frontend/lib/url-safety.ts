// Strapi-editor-controlled URL fields (company/provider website, job/course
// applicationUrl, Markdown-authored links) get rendered straight into <a
// href>. Without a protocol check, a `javascript:` value in any of those
// fields executes on click. Relative paths and in-page anchors carry no
// protocol to exploit, so they're always safe.
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function isSafeHref(href: string | null | undefined): boolean {
  if (!href) return false;
  if (href.startsWith('#')) return true;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    return SAFE_PROTOCOLS.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

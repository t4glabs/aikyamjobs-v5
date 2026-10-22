import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/api";
import { isSafeHref } from "@/lib/url-safety";

// footerCreditsLine is editor-authored and expected to be plain text plus an
// occasional "<a href=...>text</a>" credit link (see the `[&_a]` styling
// below) -- never arbitrary HTML. Rather than dangerouslySetInnerHTML the raw
// value (which would let a compromised editor inject a site-wide <script>),
// pull out only well-formed, protocol-safe <a> tags as real React elements
// and render everything else as plain text.
function renderCreditsLine(raw: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const anchorPattern = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const stripTags = (text: string) => text.replace(/<[^>]*>/g, '');

  while ((match = anchorPattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(stripTags(raw.slice(lastIndex, match.index)));
    }
    const [, href, text] = match;
    if (isSafeHref(href)) {
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
          {stripTags(text)}
        </a>
      );
    } else {
      nodes.push(stripTags(text));
    }
    lastIndex = anchorPattern.lastIndex;
  }
  if (lastIndex < raw.length) {
    nodes.push(stripTags(raw.slice(lastIndex)));
  }
  return nodes;
}

export default async function Footer() {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const siteName = settings?.siteName || 'Aikyam Jobs';
  const tagline = settings?.footerTagline || 'Connecting talent with public interest technology opportunities.';
  const creditsLine = settings?.footerCreditsLine || '';
  const resourceLinks: Array<{ label: string; url: string }> = settings?.footerResourceLinks || [
    { label: 'About Us', url: '/about' },
    { label: 'Contact', url: '/contact' },
  ];
  const seekerLinks: Array<{ label: string; url: string }> = settings?.footerSeekerLinks || [
    { label: 'Browse Jobs', url: '/jobs' },
    { label: 'Browse Companies', url: '/companies' },
    { label: 'Get Job Alerts', url: '/subscribe' },
  ];

  return (
    <footer className="bg-[#1F2421] text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="inline-flex items-center gap-3 mb-3">
              <Image
                src="/logo/clasp-vector-bold-white.svg"
                alt=""
                width={24}
                height={27}
                className="block flex-none"
                unoptimized
              />
              <span className="whitespace-nowrap text-[15px] font-semibold tracking-[0.02em] text-white">
                aikyam <span className="font-normal tracking-[-0.02em]">jobs</span>
              </span>
            </span>
            <p className="text-sm text-[#B8AFA9] leading-relaxed">{tagline}</p>
          </div>

          {/* For Job Seekers */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">For Job Seekers</h2>
            <ul className="space-y-2 text-sm text-[#B8AFA9]">
              {seekerLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.url} className="hover:text-white transition">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources — links from Strapi */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">Resources</h2>
            <ul className="space-y-2 text-sm text-[#B8AFA9]">
              {resourceLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.url} className="hover:text-white transition">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">Connect</h2>
            <p className="text-sm text-[#B8AFA9]">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
          </div>
        </div>

        {/* Credits line */}
        <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition [&_a]:text-gray-400 [&_a:hover]:text-gray-300">
          <p>
            aikyam / <span lang="ml">ഐക്യം</span> / <span lang="hi">ऐक्यम</span> | noun. unity
          </p>
          {creditsLine && (
            <p className="mt-1.5">{renderCreditsLine(creditsLine)}</p>
          )}
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { getSiteSettings } from "@/lib/api";

export default async function Footer() {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const siteName = settings?.siteName || 'Aikyam Jobs';
  const tagline = settings?.footerTagline || 'Connecting talent with public interest technology opportunities.';
  const creditsLine = settings?.footerCreditsLine || '';
  const creditsLinks: Array<{ label: string; url: string; external?: boolean }> = settings?.footerCreditsLinks || [];
  const resourceLinks: Array<{ label: string; url: string }> = settings?.footerResourceLinks || [
    { label: 'About Us', url: '/about' },
    { label: 'Contact', url: '/contact' },
  ];

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-semibold mb-3">{siteName}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{tagline}</p>
          </div>

          {/* For Job Seekers */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-300">For Job Seekers</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/jobs" className="hover:text-white transition">Browse Jobs</Link></li>
              <li><Link href="/companies" className="hover:text-white transition">Browse Companies</Link></li>
              <li><Link href="/subscribe" className="hover:text-white transition">Get Job Alerts</Link></li>
            </ul>
          </div>

          {/* Resources — links from Strapi */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-300">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {resourceLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.url} className="hover:text-white transition">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-300">Connect</h4>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
          </div>
        </div>

        {/* Credits line */}
        {(creditsLine || creditsLinks.length > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-500">
            {creditsLine && <p className="mb-2">{creditsLine}</p>}
            {creditsLinks.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {creditsLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-gray-500 hover:text-gray-300 transition underline underline-offset-2"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

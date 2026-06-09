import Link from "next/link";
import { getSiteSettings } from "@/lib/api";

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
        {creditsLine && (
          <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-500 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition [&_a]:text-gray-500 [&_a:hover]:text-gray-300">
            <p dangerouslySetInnerHTML={{ __html: creditsLine }} />
          </div>
        )}
      </div>
    </footer>
  );
}

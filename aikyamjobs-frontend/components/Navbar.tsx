import Link from "next/link";
import Image from "next/image";
import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";

const DEFAULT_NAV_LINKS: Array<{ label: string; url: string; external?: boolean }> = [
  { label: 'Home', url: '/' },
  { label: 'Jobs', url: '/jobs' },
  { label: 'Companies', url: '/companies' },
  { label: 'Blog', url: '/blogs' },
];

export default async function Navbar() {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const logoUrl = getStrapiMediaUrl(settings?.logo?.data?.attributes?.url) || null;
  const siteName = settings?.siteName || 'Aikyam Jobs';
  const brandColor = settings?.primaryColor || '#111827';
  const navLinks = settings?.navLinks?.length ? settings.navLinks : DEFAULT_NAV_LINKS;

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={140}
                height={32}
                className="object-contain h-8 w-auto"
                unoptimized
              />
            ) : (
              <span className="font-semibold text-gray-900 tracking-tight">{siteName}</span>
            )}
          </Link>
          <div className="flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="text-sm px-4 py-1.5 rounded-full font-medium transition hover:opacity-80"
              style={{ border: `1.5px solid ${brandColor}`, color: brandColor }}
            >
              Subscribe
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

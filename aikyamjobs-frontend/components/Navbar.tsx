import Link from "next/link";
import Image from "next/image";
import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";

export default async function Navbar() {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const logoUrl = getStrapiMediaUrl(settings?.logo?.data?.attributes?.url) || null;
  const siteName = settings?.siteName || 'Aikyam Jobs';
  const brandColor = settings?.primaryColor || '#111827';

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
            <Link href="/jobs" className="text-sm text-gray-600 hover:text-gray-900 transition">
              Jobs
            </Link>
            <Link href="/companies" className="text-sm text-gray-600 hover:text-gray-900 transition">
              Companies
            </Link>
            <Link href="/blogs" className="text-sm text-gray-600 hover:text-gray-900 transition">
              Blog
            </Link>
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

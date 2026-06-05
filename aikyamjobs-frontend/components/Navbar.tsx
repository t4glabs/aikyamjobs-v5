import Link from "next/link";
import Image from "next/image";
import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";

export default async function Navbar() {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const logoUrl = getStrapiMediaUrl(settings?.logo?.data?.attributes?.url) || null;
  const siteName = settings?.siteName || 'aikyam jobs';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              {logoUrl ? (
                <div className="h-10 relative">
                  <Image
                    src={logoUrl}
                    alt={siteName}
                    width={160}
                    height={40}
                    className="object-contain h-10 w-auto"
                    unoptimized
                  />
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  {siteName}
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link
              href="/jobs"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Jobs
            </Link>
            <Link
              href="/companies"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Companies
            </Link>
            <Link
              href="/blogs"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Blog
            </Link>
            <Link
              href="/subscribe"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

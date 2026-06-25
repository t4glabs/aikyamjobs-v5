import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";
import NavbarClient from "./NavbarClient";

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
    <NavbarClient
      logoUrl={logoUrl}
      siteName={siteName}
      brandColor={brandColor}
      navLinks={navLinks}
    />
  );
}

import type { Metadata } from "next";
import "@fontsource/figtree/300.css";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const title = settings?.metaTitle || settings?.siteName || "aikyam jobs - Public Interest Technology Jobs";
  const description = settings?.metaDescription || settings?.siteDescription || "Find your dream job in public interest technology. Discover opportunities to make an impact with your tech and design skills.";

  const ogImageUrl = getStrapiMediaUrl(settings?.ogImage?.data?.attributes?.url) || undefined;
  const faviconBaseUrl = getStrapiMediaUrl(settings?.favicon?.data?.attributes?.url) || undefined;
  // Cache-bust with the media's updatedAt — Firefox/Safari cache favicons
  // aggressively per-origin and otherwise won't pick up a re-uploaded file.
  const faviconVersion = settings?.favicon?.data?.attributes?.updatedAt;
  const faviconUrl = faviconBaseUrl && faviconVersion
    ? `${faviconBaseUrl}?v=${encodeURIComponent(faviconVersion)}`
    : faviconBaseUrl;

  return {
    title,
    description,
    keywords: settings?.metaKeywords,
    openGraph: {
      title: settings?.ogTitle || title,
      description: settings?.ogDescription || description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
      type: 'website',
    },
    twitter: {
      card: settings?.twitterCard || 'summary_large_image',
      site: settings?.twitterSite,
      title: settings?.ogTitle || title,
      description: settings?.ogDescription || description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
    icons: faviconUrl ? {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const primaryColor = settingsResponse?.data?.attributes?.primaryColor || '#AE4634';

  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{ '--brand': primaryColor } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Script
          src="https://analytics.aikyamhq.com/js/pa-_HzT8DaS7Kq85G-M_sjg3.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteSettings, getStrapiMediaUrl } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settingsResponse = await getSiteSettings().catch(() => null);
  const settings = settingsResponse?.data?.attributes;

  const title = settings?.metaTitle || settings?.siteName || "aikyam jobs - Public Interest Technology Jobs";
  const description = settings?.metaDescription || settings?.siteDescription || "Find your dream job in public interest technology. Discover opportunities to make an impact with your tech and design skills.";

  const ogImageUrl = getStrapiMediaUrl(settings?.ogImage?.data?.attributes?.url) || undefined;
  const faviconUrl = getStrapiMediaUrl(settings?.favicon?.data?.attributes?.url) || undefined;

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
  const primaryColor = settingsResponse?.data?.attributes?.primaryColor || '#111827';

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSiteSettings } from "@/lib/api";

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

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  const title = settings?.metaTitle || settings?.siteName || "aikyam jobs - Public Interest Technology Jobs";
  const description = settings?.metaDescription || settings?.siteDescription || "Find your dream job in public interest technology. Discover opportunities to make an impact with your tech and design skills.";

  const ogImageUrl = settings?.ogImage?.data?.attributes?.url
    ? `${API_URL}${settings.ogImage.data.attributes.url}`
    : undefined;

  const faviconUrl = settings?.favicon?.data?.attributes?.url
    ? `${API_URL}${settings.favicon.data.attributes.url}`
    : undefined;

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

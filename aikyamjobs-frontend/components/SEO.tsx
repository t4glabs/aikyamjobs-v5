import { Metadata } from "next";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

export function generateSEOMetadata({
  title,
  description,
  keywords,
  ogImage,
  canonical,
}: SEOProps): Metadata {
  const siteName = "aikyam jobs";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aikyamjobs.org";

  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const imageUrl = ogImage || `${siteUrl}/og-image.jpg`;
  const canonicalUrl = canonical || siteUrl;

  return {
    title: fullTitle,
    description,
    keywords: keywords?.join(", "),
    authors: [{ name: siteName }],
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

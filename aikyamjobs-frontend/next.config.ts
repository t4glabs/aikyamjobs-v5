import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1338',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'beta.aikyamjobs.org',
        pathname: '/uploads/**',
      },
      {
        // Covers the bare production domain in case PUBLIC_URL is ever
        // pointed at it directly instead of beta.aikyamjobs.org.
        protocol: 'https',
        hostname: 'aikyamjobs.org',
        pathname: '/uploads/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Static brand assets under public/logo — filenames already encode the
        // variant (e.g. -white), so a long cache lifetime is safe.
        source: '/logo/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;

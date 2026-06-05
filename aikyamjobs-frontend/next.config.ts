import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Redirects handled by catch-all route in app/[slug]/page.tsx */
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
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

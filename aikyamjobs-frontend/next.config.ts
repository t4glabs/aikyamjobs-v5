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
    // Pragmatic CSP, not a strict nonce-based one: this app has no
    // middleware.ts/nonce plumbing today, and Next.js's own hydration
    // scripts plus the inline Plausible init snippet in layout.tsx need
    // 'unsafe-inline' without one. Still meaningfully restricts which hosts
    // can load scripts/images/connect from and blocks framing, which a
    // stricter version would only improve on for inline-script injection
    // specifically (not a gap found in this app, as of the last audit pass).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://analytics.aikyamhq.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: http://localhost:1337 http://localhost:1338 https://beta.aikyamjobs.org https://aikyamjobs.org https://old.aikyamjobs.org",
      "font-src 'self'",
      "connect-src 'self' https://analytics.aikyamhq.com https://search.aikyamfellows.org",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://mails.tinybridge.org",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
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

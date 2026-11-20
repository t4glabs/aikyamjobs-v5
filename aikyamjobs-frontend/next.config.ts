import type { NextConfig } from "next";

// Local Strapi only exists in development. Keeping these hosts out of the
// production build means the image optimizer and the CSP never reference
// localhost on the live site. (beta.aikyamjobs.org was dropped 2026-11-20: it
// has no DNS record and no stored content references it.)
const isDev = process.env.NODE_ENV !== 'production';
const LOCAL_STRAPI_ORIGINS = isDev ? ['http://localhost:1337', 'http://localhost:1338'] : [];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...LOCAL_STRAPI_ORIGINS.map((origin) => {
        const { protocol, hostname, port } = new URL(origin);
        return { protocol: protocol.replace(':', '') as 'http', hostname, port, pathname: '/uploads/**' };
      }),
      {
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
      // challenges.cloudflare.com = Turnstile bot check on /subscribe (script + its iframe).
      "script-src 'self' 'unsafe-inline' https://analytics.aikyamhq.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      ["img-src 'self' data:", ...LOCAL_STRAPI_ORIGINS, 'https://aikyamjobs.org https://old.aikyamjobs.org'].join(' '),
      "font-src 'self'",
      // Local Strapi origins are dev-only (prod calls Strapi same-origin).
      ["connect-src 'self' https://analytics.aikyamhq.com https://search.aikyamfellows.org", ...LOCAL_STRAPI_ORIGINS].join(' '),
      "frame-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      // The subscribe form no longer posts to Listmonk directly.
      "form-action 'self'",
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

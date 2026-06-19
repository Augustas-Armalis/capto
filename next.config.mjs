import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy. 'unsafe-inline' is required because Next injects
// inline hydration scripts/styles and we have no nonce pipeline on static
// export; everything else is locked to our own origin + Stripe Checkout.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net",
  "frame-src 'self' https://checkout.stripe.com https://js.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so an ancestor lockfile (e.g. ~/package-lock.json)
  // can't make Turbopack infer the wrong file-tracing base.
  turbopack: { root: projectRoot },
  // Cloudflare/OpenNext doesn't run Next's sharp optimizer; we ship a few small
  // local PNGs, so serve them directly and skip the /_next/image round-trip.
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  async headers() {
    // CSP only in production: React's dev build uses eval() for debugging, which
    // a strict CSP blocks. Production React never uses eval, so prod stays strict.
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        // Baseline security headers for every route.
        source: '/:path*',
        headers: [
          ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

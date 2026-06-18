import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so an ancestor lockfile (e.g. ~/package-lock.json)
  // can't make Turbopack infer the wrong file-tracing base.
  turbopack: { root: projectRoot },
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  async headers() {
    return [
      {
        source: '/_editor/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;

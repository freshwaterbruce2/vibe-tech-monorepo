import type { NextConfig } from 'next';
import { join } from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo: trace from the workspace root so shared packages and hoisted
  // node_modules resolve and are included in the standalone output. Required for
  // standalone builds in a pnpm/Nx monorepo (Next.js 16 — top-level option).
  outputFileTracingRoot: join(__dirname, '../../'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

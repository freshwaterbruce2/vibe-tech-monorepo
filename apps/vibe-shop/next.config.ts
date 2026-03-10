import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // TypeScript errors must be fixed - no longer ignored
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
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

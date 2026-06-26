import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../../"),
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  transpilePackages: [
    "@remotion/player",
    "@remotion/media",
    "@remotion/media-utils",
  ],
  images: {
    dangerouslyAllowLocalIP: false,
    minimumCacheTTL: 14400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "models.readyplayer.me",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

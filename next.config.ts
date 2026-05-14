import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  // tsc + eslint run in CI; skip redundant checks during Vercel remote build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

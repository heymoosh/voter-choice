import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  // tsc + eslint run in CI; skip redundant checks during Vercel remote build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // PDF extraction route uses pdfjs-dist + @napi-rs/canvas to render PDF
  // pages to PNG for Claude vision. Both are native/CJS-heavy packages
  // that should NOT be bundled by Webpack — keep them external so the
  // Vercel serverless function can resolve the right linux-x64 variant
  // at runtime.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;

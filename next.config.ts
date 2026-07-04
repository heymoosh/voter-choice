import type { NextConfig } from "next";
import { resolve } from "path";

/**
 * Baseline security headers (audit finding docs/security/audit-2026-07.md
 * §4.6 area — the app had NO CSP / security headers anywhere). CSP ships
 * report-only first: it observes real violations without breaking anything,
 * so it can be tightened/enforced later from actual report data rather than
 * guesswork.
 *
 * connect-src/script-src/img-src are scoped to what the BROWSER actually
 * calls directly (CSP doesn't govern server-to-server calls, so
 * Neon/Census-geocoder/Civic API — all server-only — are deliberately NOT
 * listed here). Verified by loading the running app under this exact policy
 * (report-only) and reading the actual violation reports rather than
 * guessing:
 *   - https://api.anthropic.com — the BYOK path streams directly from the
 *     browser to Anthropic (src/lib/anthropic-client-byok.ts), never
 *     through this app's server.
 *   - https://maps.googleapis.com / https://maps.gstatic.com — the address
 *     input's Google Places Autocomplete loads its JS API client-side
 *     (src/lib/useGooglePlacesAutocomplete.ts) and pings/loads icons from
 *     these hosts. Missed on the first pass; caught by the report-only
 *     violations on the home page before this ever reached enforce mode.
 *
 * script-src allows 'unsafe-inline' because Next.js's App Router injects
 * inline hydration/RSC-payload scripts without nonces by default; tightening
 * this to a nonce-based policy is a follow-up once the report-only data
 * confirms nothing else needs it.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://maps.gstatic.com",
  "connect-src 'self' https://api.anthropic.com https://maps.googleapis.com",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: CSP_REPORT_ONLY,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  // tsc + eslint run in CI; skip redundant checks during Vercel remote build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // PDF extraction route uses pdfjs-dist + @napi-rs/canvas to render PDF
  // pages to PNG for Claude vision. Both are native/CJS-heavy packages
  // that should NOT be bundled by Webpack — keep them external so the
  // Vercel serverless function can resolve the right linux-x64 variant
  // at runtime.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  // Force-include the pdfjs worker + standard fonts for the
  // /api/extract-ballot serverless function. Webpack's tracer doesn't
  // follow pdfjs's dynamic worker import, so without this Vercel ships
  // the function without the worker file → "Cannot find module ...
  // pdf.worker.mjs". Standard fonts are static assets pdfjs loads at
  // render time; same problem, same fix.
  outputFileTracingIncludes: {
    "/api/extract-ballot": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
  },
};

export default nextConfig;

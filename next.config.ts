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
 *   - https://huggingface.co / https://*.hf.co / https://raw.githubusercontent.com
 *     — the flag-gated on-device-AI dev spike (/dev/on-device-ai,
 *     src/lib/onDeviceAI/webllmClient.ts) loads @mlc-ai/web-llm model
 *     weights from huggingface.co (verified against the installed package's
 *     source: node_modules/@mlc-ai/web-llm/lib/index.js model URLs) and
 *     compiled model libs (WASM) from raw.githubusercontent.com
 *     (mlc-ai/binary-mlc-llm-libs). *.huggingface.co / *.hf.co cover
 *     Hugging Face's LFS/CDN subdomains (e.g. cdn-lfs.huggingface.co) that
 *     the base-domain URLs in the package's source redirect through for the
 *     actual model-weight bytes. worker-src 'self' blob: covers the
 *     package's WASM execution. This is a single, additive widening of the
 *     one global CSP entry (not a second route-scoped header — Next.js
 *     applies ALL matching headers() entries and the browser intersects
 *     same-named headers, so a narrower per-route addition would not
 *     actually relax anything). Report-only today, so these widen an
 *     observational policy, not an enforced one.
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
  "connect-src 'self' https://api.anthropic.com https://maps.googleapis.com https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com",
  "worker-src 'self' blob:",
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
  // tsc runs in CI; skip the redundant check during Vercel remote build.
  // (Next 16 removed its built-in eslint integration entirely, so there's
  // no `eslint` config key anymore — lint is CI-only via `npm run lint`.)
  typescript: { ignoreBuildErrors: true },
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

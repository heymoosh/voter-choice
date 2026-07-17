import type { Metadata, Viewport } from "next";
// Prototype design system — the AUTHORITATIVE front-end CSS, served VERBATIM
// from /public (prototype.css + prototype-c.css) via <link> below, exactly as
// the prototype HTML loaded them. We deliberately do NOT import them through
// Next's CSS pipeline: Lightning CSS is stricter than the browser and rejects
// constructs the (browser-valid) prototype CSS uses. Static <link> = the
// browser parses it leniently, identical to the prototype.
// Printable-ballot stylesheet (scoped to .print-sheet / .no-print).
import "../styles/print.css";
import { statSync } from "node:fs";
import { join } from "node:path";

// Dev-only cache-bust for the static prototype stylesheets. They're served via
// <link> (not Next's CSS pipeline), so browsers — Safari especially — cache them
// across edits, making CSS tweaks look like they "didn't apply." Key the URL to
// the file's mtime: refetches exactly when the CSS changes, deterministic per
// render (no hydration mismatch). Prod gets no query (normal static caching;
// redeploys ship a fresh build).
function cssBust(file: string): string {
  if (process.env.NODE_ENV === "production") return "";
  try {
    return `?v=${Math.floor(statSync(join(process.cwd(), "public", file)).mtimeMs)}`;
  } catch {
    return "";
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Voter Choice — Assess Your Representatives with AI",
  description:
    "Assess your representatives with AI. Enter your address, see how your incumbents actually voted and who funds them. Free, private, nonpartisan.",
  openGraph: {
    title: "Voter Choice — Assess Your Representatives with AI",
    description:
      "Assess your representatives with AI. See how your incumbents actually voted and who funds them.",
    type: "website",
    locale: "en_US",
    siteName: "Voter Choice",
  },
  twitter: {
    card: "summary_large_image",
    title: "Voter Choice — Assess Your Representatives with AI",
    description:
      "Assess your representatives with AI. See how your incumbents actually voted and who funds them.",
  },
  robots: { index: true, follow: true },
};

// Experience flag (build-time inlined): mirrors src/app/page.tsx's own
// BALLOT_ENABLED check. The legacy ballot-centric experience keeps the civic
// default below; every other route (the congress-assessment app AND the
// static content pages — about/methodology/privacy/terms — which render
// outside App2's own root) gets the Bold Flag / Keystone palette by sharing
// one class here instead of each route wrapping its own root in it.
const BALLOT_ENABLED = process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Prototype design system — served static + browser-parsed (verbatim). */}
        <link
          rel="stylesheet"
          href={`/prototype.css${cssBust("prototype.css")}`}
        />
        <link
          rel="stylesheet"
          href={`/prototype-c.css${cssBust("prototype-c.css")}`}
        />
        {/* 2026 redesign surfaces (seat strip, attendance band, eligibility
            note, scorecard verdicts, polis). New class names only — loaded
            unconditionally; inert when the redesign isn't rendered. */}
        <link
          rel="stylesheet"
          href={`/redesign2.css${cssBust("redesign2.css")}`}
        />
        {/* Head-to-head candidate duel ("Time to replace" flow). Ported from
            the design session's candidates.css; new class names only, inert
            until the duel renders. */}
        <link
          rel="stylesheet"
          href={`/candidates.css${cssBust("candidates.css")}`}
        />
      </head>
      {/* Prototype visual defaults — Civic mood / Civic palette / Daylight
          treatment. prototype.css consumes these via body[data-mood="civic"].
          The mood/font-family axis stays civic app-wide (PR A1,
          civic-default.test.tsx) — orthogonal to the Bold Flag color-token
          axis below; data-palette="civic" has no matching CSS selector
          today, it's inert. */}
      <body
        data-mood="civic"
        data-palette="civic"
        data-treatment="daylight"
        className={BALLOT_ENABLED ? undefined : "bf-app"}
      >
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}

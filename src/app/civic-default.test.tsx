import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * PR A1 — Civic mood as production default.
 *
 * These tests pin the SSR / layout.tsx production default to:
 *   data-mood="civic" · data-palette="civic" · data-treatment="daylight"
 *
 * This default is what the LEGACY ballot app (behind NEXT_PUBLIC_BALLOT_ENABLED)
 * renders. The 2026 congress-assessment redesign (App2) then flips the palette
 * to Bold Flag "white" on mount — see the "App2 defaults to Bold Flag white"
 * block below. layout.tsx itself is intentionally left on civic so the legacy
 * app is untouched; the flip is scoped to the redesign app's mount.
 *
 * The redesigned layout loads all mood families (Newsreader, IBM Plex trio,
 * Space Grotesk, JetBrains Mono) via a single Google Fonts <link> so the
 * in-app mood/palette switcher can flip between them at runtime without an
 * additional network request per mood. This supersedes the previous
 * next/font per-family import pattern.
 *
 * jsdom + Vitest cannot import the real `src/app/layout.tsx` here
 * because importing it pulls in `./globals.css`, which trips Vitest's
 * CSS pipeline against this project's PostCSS config. We follow the
 * same source-string posture as `src/lib/design-tokens.test.ts` and
 * defer the rendered-DOM check to the Playwright live-verify step.
 */

const projectRoot = process.cwd();
const layoutSrc = fs.readFileSync(
  path.resolve(projectRoot, "src/app/layout.tsx"),
  "utf8",
);
const globalsCss = fs.readFileSync(
  path.resolve(projectRoot, "src/app/globals.css"),
  "utf8",
);
const app2Src = fs.readFileSync(
  path.resolve(projectRoot, "src/prototype/redesign/App2.tsx"),
  "utf8",
);
const redesign2Css = fs.readFileSync(
  path.resolve(projectRoot, "public/redesign2.css"),
  "utf8",
);

describe("PR A1 — Civic mood is the hardcoded production default", () => {
  it("layout.tsx hardcodes data-mood='civic' on <body>", () => {
    expect(layoutSrc).toMatch(/data-mood=["']civic["']/);
  });

  it("layout.tsx hardcodes data-palette='civic' on <body>", () => {
    expect(layoutSrc).toMatch(/data-palette=["']civic["']/);
  });

  it("layout.tsx hardcodes data-treatment='daylight' on <body>", () => {
    expect(layoutSrc).toMatch(/data-treatment=["']daylight["']/);
  });

  it("layout.tsx loads IBM Plex Serif via the Google Fonts <link> (Civic mood headline family)", () => {
    // The redesigned layout uses a static Google Fonts <link> instead of
    // next/font. IBM Plex Serif is the Civic mood headline family and must
    // be present in the link href.
    expect(layoutSrc).toMatch(/fonts\.googleapis\.com\/css2/);
    expect(layoutSrc).toMatch(/IBM\+Plex\+Serif/);
  });

  it("layout.tsx Google Fonts <link> includes the full mood font set", () => {
    // The redesigned layout intentionally loads all mood families so the
    // in-app mood/palette switcher (future ?tweaks=1 path) can switch between
    // Civic (IBM Plex), Editorial (Newsreader), and Manifesto
    // (Space Grotesk / JetBrains Mono) moods without additional network requests.
    expect(layoutSrc).toMatch(/Newsreader/);
    expect(layoutSrc).toMatch(/IBM\+Plex\+Sans/);
    expect(layoutSrc).toMatch(/IBM\+Plex\+Serif/);
    expect(layoutSrc).toMatch(/IBM\+Plex\+Mono/);
    expect(layoutSrc).toMatch(/Space\+Grotesk/);
    expect(layoutSrc).toMatch(/JetBrains\+Mono/);
  });

  it("globals.css has a body[data-mood='civic'] selector wiring IBM Plex Serif", () => {
    // The Tweaks-panel infrastructure stays: per-mood CSS selectors
    // remain so a future ?tweaks=1 path can flip moods without touching
    // globals.css again. Civic mood swaps --serif to IBM Plex Serif.
    expect(globalsCss).toMatch(
      /body\[data-mood=["']civic["']\][\s\S]*?--font-ibm-plex-serif/,
    );
  });

  it("globals.css no longer references the --font-newsreader CSS variable", () => {
    // Civic is now the production default, so the default --serif must
    // reference IBM Plex Serif (not Newsreader). The --font-newsreader
    // CSS variable (which next/font would have injected) is not used.
    expect(globalsCss).not.toMatch(/--font-newsreader/);
  });
});

describe("Redesign app (App2) defaults to the Bold Flag white palette", () => {
  // layout.tsx stays on civic (legacy app), but the congress-assessment
  // redesign flips data-palette to "white" on <body> for the duration of its
  // mount so all 11 of its surfaces render Bold Flag. Verified as a source
  // check here (jsdom can't mount App2's data-flow); the rendered-DOM check is
  // in the Playwright live-verify step.

  it("App2.tsx sets data-palette='white' on document.body", () => {
    expect(app2Src).toMatch(
      /document\.body\.setAttribute\(\s*["']data-palette["']\s*,\s*["']white["']\s*\)/,
    );
  });

  it("App2.tsx restores the prior palette on unmount (mount-scoped flip)", () => {
    // The effect captures the previous attribute value and returns a cleanup
    // that restores it, so the flip never leaks past App2's lifetime.
    expect(app2Src).toMatch(/getAttribute\(\s*["']data-palette["']\s*\)/);
    expect(app2Src).toMatch(/removeAttribute\(\s*["']data-palette["']\s*\)/);
  });

  it("redesign2.css defines Bold Flag tokens under body[data-palette='white']", () => {
    // The body-scoped block is what makes the 8 previously-teal sections
    // (workspace, rep card, scorecard, statics, intake, polis, nav) inherit
    // Bold Flag. It must redefine --brand and alias the legacy --civic name.
    expect(redesign2Css).toMatch(
      /body\[data-palette=["']white["']\][\s\S]*?--brand:\s*oklch\(/,
    );
    expect(redesign2Css).toMatch(
      /body\[data-palette=["']white["']\][\s\S]*?--civic:\s*var\(--brand\)/,
    );
  });
});

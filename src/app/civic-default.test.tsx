import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * PR A1 — Civic mood as production default.
 *
 * These tests pin the production default to:
 *   data-mood="civic" · data-palette="civic" · data-treatment="daylight"
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

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * PR A1 — Civic mood as production default.
 *
 * These tests pin the production default to:
 *   data-mood="civic" · data-palette="civic" · data-treatment="daylight"
 *
 * The full prototype Tweaks panel (with editorial / manifesto moods,
 * constitutional / newsprint palettes, inkwell treatment) is deferred —
 * see PR description. Civic mood swaps `--serif` from Newsreader to
 * IBM Plex Serif, so production no longer needs the Newsreader webfont.
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

  it("layout.tsx imports IBM_Plex_Serif via next/font (Civic mood headline family)", () => {
    expect(layoutSrc).toMatch(/IBM_Plex_Serif/);
    // The font instance is mapped to the --font-ibm-plex-serif CSS
    // variable so globals.css can chain through it for var(--serif).
    expect(layoutSrc).toMatch(/--font-ibm-plex-serif/);
  });

  it("layout.tsx attaches the IBM Plex Serif font variable to <body>", () => {
    // The next/font instance must be applied to the body className so
    // its CSS variable is in scope where globals.css consumes it.
    expect(layoutSrc).toMatch(/ibmPlexSerif\.variable/);
  });

  it("layout.tsx does NOT import the non-Civic display fonts via next/font", () => {
    // Newsreader is editorial mood; Space Grotesk + JetBrains Mono are
    // manifesto mood. Production boots Civic only — none of these
    // should be fetched on page load. We assert no `next/font/google`
    // imports name them, not the literal absence of the words (which
    // can legitimately appear in deferral-context comments).
    const importMatches = layoutSrc.match(
      /import\s+\{([^}]+)\}\s+from\s+["']next\/font\/google["']/g,
    );
    expect(importMatches).not.toBeNull();
    const allImports = (importMatches ?? []).join(" ");
    expect(allImports).not.toMatch(/Newsreader/);
    expect(allImports).not.toMatch(/Space_Grotesk/);
    expect(allImports).not.toMatch(/JetBrains_Mono/);
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
    // reference IBM Plex Serif (not Newsreader). The Newsreader webfont
    // is no longer loaded by next/font.
    expect(globalsCss).not.toMatch(/--font-newsreader/);
  });
});

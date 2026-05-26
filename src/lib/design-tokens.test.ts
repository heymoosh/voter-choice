import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Smoke tests for the 2026-redesign visual foundation: typography +
// okLCh color tokens. Vitest does not render CSS, so these assertions
// confirm the tokens are wired in the source files. Visual regression
// is deferred to a later Playwright/Lighthouse phase.

const projectRoot = process.cwd();
const globalsCss = fs.readFileSync(
  path.resolve(projectRoot, "src/app/globals.css"),
  "utf8",
);
const layoutTsx = fs.readFileSync(
  path.resolve(projectRoot, "src/app/layout.tsx"),
  "utf8",
);

describe("design tokens — color", () => {
  it("globals.css defines the core okLCh color tokens", () => {
    for (const token of [
      "--paper",
      "--paper-2",
      "--ink",
      "--civic",
      "--civic-soft",
      "--gold",
      "--vote-red",
    ]) {
      expect(globalsCss).toContain(token);
    }
  });

  it("globals.css uses okLCh notation for the civic palette", () => {
    expect(globalsCss).toMatch(/--civic:\s*oklch\(/);
    expect(globalsCss).toMatch(/--paper:\s*oklch\(/);
    expect(globalsCss).toMatch(/--ink:\s*oklch\(/);
  });
});

describe("design tokens — typography", () => {
  it("globals.css references the IBM Plex next/font CSS variables", () => {
    // PR A1: Civic mood is the production default → IBM Plex Serif
    // replaces Newsreader as the headline family. The Newsreader
    // webfont is no longer loaded.
    expect(globalsCss).toContain("--font-ibm-plex-serif");
    expect(globalsCss).toContain("--font-ibm-plex-sans");
    expect(globalsCss).toContain("--font-ibm-plex-mono");
  });

  it("layout.tsx imports the IBM Plex trio via next/font", () => {
    expect(layoutTsx).toMatch(/IBM_Plex_Sans/);
    expect(layoutTsx).toMatch(/IBM_Plex_Serif/);
    expect(layoutTsx).toMatch(/IBM_Plex_Mono/);
  });

  it("layout.tsx applies the font CSS variables on the body element", () => {
    // Each next/font instance exposes a `.variable` className that
    // injects its --font-* custom property at the element it's
    // attached to. The body must carry all three so the tokens
    // cascade down to every component.
    expect(layoutTsx).toMatch(/ibmPlexSans\.variable/);
    expect(layoutTsx).toMatch(/ibmPlexSerif\.variable/);
    expect(layoutTsx).toMatch(/ibmPlexMono\.variable/);
  });
});

describe("design tokens — legacy compatibility", () => {
  it("preserves legacy --color-* token names by aliasing them", () => {
    // 46 components reference Tailwind utility classes like
    // bg-primary / text-on-primary / bg-surface that derive from
    // these legacy variables. We alias them to the new okLCh tokens
    // so the foundation lands without a component sweep.
    for (const legacy of [
      "--color-primary",
      "--color-on-primary",
      "--color-surface",
      "--color-on-surface",
      "--color-outline",
    ]) {
      expect(globalsCss).toContain(legacy);
    }
  });
});

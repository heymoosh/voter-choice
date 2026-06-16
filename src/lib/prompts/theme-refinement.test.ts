import { describe, it, expect } from "vitest";
import {
  buildThemeRefinementPrompt,
  DISAMBIGUATION_CAP,
} from "./theme-refinement";

const THEMES = JSON.stringify([
  { name: "Healthcare", quotes: ["insulin"], canonicalIssue: "healthcare_affordability" },
]);

describe("buildThemeRefinementPrompt — disambiguation cap", () => {
  it("keeps the load-bearing marker phrase the e2e mock dispatches on", () => {
    const p = buildThemeRefinementPrompt({ currentThemesJson: THEMES });
    expect(p).toContain("refining a voter's priority themes");
  });

  it("still re-injects the current themes JSON", () => {
    const p = buildThemeRefinementPrompt({ currentThemesJson: THEMES });
    expect(p).toContain(THEMES);
  });

  it("defaults to 0 asked → advertises the full clarifying-question budget", () => {
    const p = buildThemeRefinementPrompt({ currentThemesJson: THEMES });
    expect(p).toContain("asked 0 clarifying question(s)");
    expect(p).toContain(`${DISAMBIGUATION_CAP} remain`);
    // Not yet in hard-stop mode.
    expect(p).not.toContain("NO CLARIFYING QUESTIONS LEFT");
  });

  it("reflects a partially-spent budget (1 asked → 1 remains)", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: THEMES,
      clarifyingQuestionsAsked: 1,
    });
    expect(p).toContain("asked 1 clarifying question(s)");
    expect(p).toContain("1 remain");
    expect(p).not.toContain("NO CLARIFYING QUESTIONS LEFT");
  });

  it("hard-stops at the cap: tells the model to lock in, not ask again", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: THEMES,
      clarifyingQuestionsAsked: DISAMBIGUATION_CAP,
    });
    expect(p).toContain("NO CLARIFYING QUESTIONS LEFT");
    expect(p).toContain("LOCK IN the concept now");
  });

  it("treats an over-cap count the same as the cap (never advertises a negative remainder)", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: THEMES,
      clarifyingQuestionsAsked: 99,
    });
    expect(p).toContain("NO CLARIFYING QUESTIONS LEFT");
    // Hard-stop branch never prints a "N remain" line, so no negative count.
    expect(p).not.toMatch(/-\d+ remain/);
  });

  it("flags an unrecognized concept as novel (kept, unmatched) rather than rejected", () => {
    const p = buildThemeRefinementPrompt({ currentThemesJson: THEMES });
    expect(p.toLowerCase()).toContain("novel concept");
    expect(p).toContain("OMIT canonicalIssue");
  });

  it("forbids re-asking an already-answered question (lock in all answers)", () => {
    const p = buildThemeRefinementPrompt({ currentThemesJson: THEMES });
    expect(p).toContain("already answered");
  });
});

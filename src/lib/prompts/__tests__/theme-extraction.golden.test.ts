import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildThemeExtractionPrompt } from "../theme-extraction";
import { parseThemeExtraction } from "../parse-theme-extraction";

describe("buildThemeExtractionPrompt — golden", () => {
  it("renders the verbatim prompt body with userInput substituted", () => {
    const rendered = buildThemeExtractionPrompt({
      userInput: "I care about healthcare and ICE.",
    });
    const golden = readFileSync(
      path.join(__dirname, "theme-extraction.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });
});

// Regression guard for the PR #114 split bug: a compound first message like
// "AI safety and healthcare insurance costs" used to collapse into ONE theme
// named the literal phrase (which matches no canonicalIssue → "no voting
// record data" → broken vote evaluation). Extraction is LLM-backed, so we
// can't assert the model's output offline. Instead we lock in the two halves
// of the fix that ARE deterministic: (1) the prompt CARRIES an explicit
// split rule, and (2) the parse/schema flow ACCEPTS a theme with no
// canonicalIssue (so a split-off concern with no canonical id still survives
// instead of being dropped — the failure mode the split rule depends on).
describe("buildThemeExtractionPrompt — compound-input split guard (PR #114 regression)", () => {
  const rendered = buildThemeExtractionPrompt({
    userInput: "AI safety and healthcare insurance costs",
  });

  it("prompt instructs the model to SPLIT multiple distinct concerns", () => {
    expect(rendered).toContain("SPLIT distinct concerns");
    // The rule must cover the compound "and"/comma case and forbid the
    // literal-named merge that was the bug.
    expect(rendered).toMatch(/SPLIT distinct concerns joined by[\s\S]*?commas/);
    expect(rendered).toMatch(
      /Never merge distinct\s+concerns into one literal-named theme\./,
    );
  });

  it("split rule permits a theme with no canonicalIssue", () => {
    // The rule must explicitly bless a split-off concern that maps to no
    // canonical id (e.g. "AI safety"), so the model doesn't avoid splitting
    // just because one half has no canonicalIssue.
    expect(rendered).toMatch(
      /SEPARATE\s+theme each[\s\S]*?no\s+canonicalIssue/,
    );
  });

  it("parser keeps a split theme that has no canonicalIssue", () => {
    // Simulate the model obeying the split rule: two themes, one of which
    // (AI safety) has no canonicalIssue. Both must survive parsing — i.e.
    // the schema permits canonicalIssue-less themes.
    const modelOutput = JSON.stringify([
      { name: "AI safety", quotes: ["AI safety"] },
      {
        name: "Healthcare insurance costs",
        quotes: ["healthcare insurance costs"],
        canonicalIssue: "healthcare_affordability",
      },
    ]);
    const themes = parseThemeExtraction(modelOutput);
    expect(themes).toHaveLength(2);
    expect(themes[0]).toEqual({ name: "AI safety", quotes: ["AI safety"] });
    expect(themes[0].canonicalIssue).toBeUndefined();
    expect(themes[1].canonicalIssue).toBe("healthcare_affordability");
  });
});

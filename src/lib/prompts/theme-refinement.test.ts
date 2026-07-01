import { describe, it, expect } from "vitest";
import {
  buildThemeRefinementPrompt,
  DISAMBIGUATION_CAP,
} from "./theme-refinement";
import { parseThemeRefinement } from "./parse-theme-refinement";

const THEMES = JSON.stringify([
  {
    name: "Healthcare",
    quotes: ["insulin"],
    canonicalIssue: "healthcare_affordability",
  },
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

// ---------------------------------------------------------------------------
// Alignment 2b — pole-disambiguation block
// ---------------------------------------------------------------------------
//
// These tests cover the PROMPT side of the feature: that the refinement
// prompt carries the per-issue disambiguation questions and the correct
// instructions for all three answer paths (picks a side → set stance;
// off-bucket → keep no-stance; cap reached → lock in, don't ask again).
// The PARSE side is unchanged (parse-theme-refinement already handles the
// model setting or omitting "stance" in the fenced JSON).

const CONTESTED_NEUTRAL_THEMES = JSON.stringify([
  {
    name: "Gun ownership concerns",
    quotes: ["I care about guns"],
    canonicalIssue: "gun_rights_safety",
    // stance intentionally absent — contested, voter didn't pick a side
  },
]);

describe("buildThemeRefinementPrompt — Alignment 2b pole-disambiguation", () => {
  it("includes the POLE DISAMBIGUATION section when budget is open", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
    });
    expect(p).toContain("POLE DISAMBIGUATION");
    expect(p).toContain(
      'canonicalIssue" is a contested issue AND "stance" is absent',
    );
  });

  it("injects the gun_rights_safety disambiguation question into the prompt", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
    });
    // The per-issue question from poleVocabulary is present verbatim
    expect(p).toContain(
      "On guns, are you more focused on protecting access to firearms",
    );
    // The open-ended tail must be present
    expect(p).toContain("or is it something else?");
  });

  it("instructs the model to set stance when voter picks a side", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
    });
    expect(p).toContain('set "stance" in the updated theme JSON');
  });

  it("instructs the model to KEEP the theme without stance when voter doesn't pick a side", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
    });
    expect(p).toContain('KEEP the theme without "stance"');
    expect(p).toContain("NEVER fabricate a stance");
    expect(p).toContain("NEVER drop the theme");
  });

  it("suppresses the disambiguation section at the question cap (lock-in mode)", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
      clarifyingQuestionsAsked: DISAMBIGUATION_CAP,
    });
    // At cap, poleDisambiguationBlock is "" — the section must not appear
    expect(p).not.toContain("POLE DISAMBIGUATION");
    // But the lock-in block must still be present
    expect(p).toContain("NO CLARIFYING QUESTIONS LEFT");
  });

  it("includes education_funding disambiguation question (second contested issue check)", () => {
    const p = buildThemeRefinementPrompt({
      currentThemesJson: CONTESTED_NEUTRAL_THEMES,
    });
    // All contested issues' disambiguation questions are embedded
    expect(p).toContain("On education, are you more focused on");
  });
});

// Parse-side regression: the existing parse flow correctly threads stance when
// the model sets it in response to a disambiguation answer, and keeps the
// theme without stance when the model leaves it absent.
describe("parseThemeRefinement — stance threading after disambiguation (Alignment 2b)", () => {
  it("preserves stance=in_favor when model resolves a contested neutral theme", () => {
    const resolved = JSON.stringify([
      {
        name: "Gun ownership concerns",
        quotes: ["I care about guns"],
        canonicalIssue: "gun_rights_safety",
        stance: "in_favor",
      },
    ]);
    const raw = `Got it — you're focused on protecting access.\n\`\`\`json\n${resolved}\n\`\`\``;
    const out = parseThemeRefinement(raw);
    expect(out.themes).toHaveLength(1);
    expect(out.themes![0].stance).toBe("in_favor");
    expect(out.themes![0].canonicalIssue).toBe("gun_rights_safety");
  });

  it("preserves theme without stance when model leaves it absent (off-bucket answer)", () => {
    const noStance = JSON.stringify([
      {
        name: "Gun ownership concerns",
        quotes: ["I care about guns", "it's complicated"],
        canonicalIssue: "gun_rights_safety",
        // stance absent — unmapped answer, honest no-score
      },
    ]);
    const raw = `Understood — I've kept your gun concern on the list without a direction.\n\`\`\`json\n${noStance}\n\`\`\``;
    const out = parseThemeRefinement(raw);
    expect(out.themes).toHaveLength(1);
    expect(out.themes![0].stance).toBeUndefined();
    expect(out.themes![0].canonicalIssue).toBe("gun_rights_safety");
  });
});

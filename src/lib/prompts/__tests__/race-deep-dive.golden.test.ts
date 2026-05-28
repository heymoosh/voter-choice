import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildRaceDeepDivePrompt } from "../race-deep-dive";

describe("buildRaceDeepDivePrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildRaceDeepDivePrompt({
      raceLabel: "Senate",
      state: "TX",
      county: "Harris",
      themesList: "1. Healthcare",
      candidatesJson: "[]",
      decidedSummary: "(none)",
    });
    const golden = readFileSync(
      path.join(__dirname, "race-deep-dive.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });

  it("contains the notice-relay rule (AC #7)", () => {
    const rendered = buildRaceDeepDivePrompt({
      raceLabel: "Senate",
      state: "TX",
      county: "Harris",
      themesList: "1. Healthcare",
      candidatesJson: "[]",
      decidedSummary: "(none)",
    });
    expect(rendered).toMatch(/notice.*relay|relay.*notice/i);
    expect(rendered).toMatch(/plain language/i);
  });

  // P0 #2 (live audit): voter typed "Tell me about BOOKER" with Cory Booker
  // already in the <candidates> roster, and the model asked "Do you mean Cory
  // Booker?" — refusing to use the roster it was given. The prompt body now
  // includes an explicit candidate-resolution rule so the model resolves
  // surnames, partials, and shouted-case against <candidates> instead of
  // bouncing the disambiguation back to the voter.
  it("instructs the model to resolve candidates from the roster without asking for clarification", () => {
    const rendered = buildRaceDeepDivePrompt({
      raceLabel: "U.S. Senate",
      state: "NJ",
      county: "Camden",
      themesList: "1. Healthcare",
      candidatesJson:
        '[{"name":"Cory Booker","party":"Democratic"},{"name":"Curtis Bashaw","party":"Republican"}]',
      decidedSummary: "(none)",
    });
    // Must reference the roster as the resolution source.
    expect(rendered).toMatch(/resolve.*<candidates>|<candidates>.*resolve/i);
    // Must explicitly cover surname / partial / shouted-case.
    expect(rendered).toMatch(/surname|last name/i);
    // Must prohibit the "Do you mean…?" bounce.
    expect(rendered).toMatch(
      /do not (ask|prompt).*clarif|don'?t (ask|prompt).*clarif/i,
    );
  });
});

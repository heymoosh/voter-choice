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
});

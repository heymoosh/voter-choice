import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildHandoffPrompt } from "../handoff";

describe("buildHandoffPrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildHandoffPrompt({
      addressCityState: "Houston, TX",
      electionLabel: "General",
      electionDate: "2026-11-03",
      ballotType: "general",
      themesRanked: "1. Healthcare",
      decidedJson: "[]",
      remainingList: "Senate",
      notableQuotes: "(none)",
    });
    const golden = readFileSync(
      path.join(__dirname, "handoff.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });
});

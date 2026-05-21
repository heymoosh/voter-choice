import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildPropositionPrompt } from "../proposition";

describe("buildPropositionPrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildPropositionPrompt({
      propLabel: "Prop A",
      propSummary: "Bond for parks",
      propIfYes: "City issues $500M bond",
      propIfNo: "No bond issued",
      themesList: "1. Parks",
      yesFunders: "Parks Coalition",
      noFunders: "Taxpayers United",
    });
    const golden = readFileSync(
      path.join(__dirname, "proposition.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });
});

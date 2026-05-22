import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildResearchCandidatePrompt } from "../research-candidate";

describe("buildResearchCandidatePrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildResearchCandidatePrompt({
      candidateName: "Jane Doe",
      jurisdiction: "TX-governor",
      topic: "voting record on healthcare",
    });
    const golden = readFileSync(
      path.join(__dirname, "research-candidate.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });

  it("includes the 3-bullet output contract and sources line", () => {
    const rendered = buildResearchCandidatePrompt({
      candidateName: "X",
      jurisdiction: "Y",
      topic: "Z",
    });
    // The contract is what keeps the sub-call output bounded — failing this
    // means the context-hygiene property of the tool is broken.
    expect(rendered).toMatch(/3 bullets/);
    expect(rendered).toMatch(/sources:/);
  });

  it("limits the sub-agent to web_search and at most 3 calls", () => {
    const rendered = buildResearchCandidatePrompt({
      candidateName: "X",
      jurisdiction: "Y",
      topic: "Z",
    });
    expect(rendered).toMatch(/web_search/);
    expect(rendered).toMatch(/max 3/);
  });
});

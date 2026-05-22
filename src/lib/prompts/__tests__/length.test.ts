import { describe, it, expect } from "vitest";
import { buildThemeExtractionPrompt } from "../theme-extraction";
import { buildRaceDeepDivePrompt } from "../race-deep-dive";
import { buildPropositionPrompt } from "../proposition";
import { buildThemeAmendmentPrompt } from "../theme-amendment";
import { buildHandoffPrompt } from "../handoff";
import { buildResearchCandidatePrompt } from "../research-candidate";

const LIMIT = 1500;

describe("task-prompt length budget", () => {
  it("theme-extraction body stays under the 1500-char limit", () => {
    const rendered = buildThemeExtractionPrompt({
      userInput: "I care about healthcare.",
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });

  it("race-deep-dive body stays under the 1500-char limit", () => {
    const rendered = buildRaceDeepDivePrompt({
      raceLabel: "Senate",
      state: "TX",
      county: "Harris",
      themesList: "1. Healthcare",
      candidatesJson: "[]",
      decidedSummary: "(none)",
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });

  it("proposition body stays under the 1500-char limit", () => {
    const rendered = buildPropositionPrompt({
      propLabel: "Prop A",
      propSummary: "Bond for parks",
      propIfYes: "Issue bond",
      propIfNo: "No bond",
      themesList: "1. Parks",
      yesFunders: "Coalition",
      noFunders: "Taxpayers United",
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });

  it("theme-amendment body stays under the 1500-char limit", () => {
    const rendered = buildThemeAmendmentPrompt({
      userInput: "I worry about housing too.",
      themesList: "1. Healthcare",
      decidedJson: "[]",
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });

  it("handoff body stays under the 1500-char limit", () => {
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
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });

  it("research-candidate body stays under the 1500-char limit", () => {
    const rendered = buildResearchCandidatePrompt({
      candidateName: "X",
      jurisdiction: "Y",
      topic: "Z",
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });
});

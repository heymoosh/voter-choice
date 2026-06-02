import { describe, it, expect } from "vitest";
import { buildThemeExtractionPrompt } from "../theme-extraction";
import { buildRaceDeepDivePrompt } from "../race-deep-dive";
import { buildPropositionPrompt } from "../proposition";
import { buildThemeAmendmentPrompt } from "../theme-amendment";
import { buildHandoffPrompt } from "../handoff";
import { buildResearchCandidatePrompt } from "../research-candidate";
import { buildChatCatchJudgePrompt } from "../chat-catch-judge";

const LIMIT = 1500;
// theme-extraction now carries the canonical-issue vocabulary (16 ids + what
// each covers) so the model can map the voter's words → a known issue id at
// cold-open. That vocab is load-bearing for downstream alignment scoring, so
// the prompt is intentionally longer than the 1500 baseline.
const THEME_EXTRACTION_LIMIT = 3500;
// P0 #2 (live audit): the race-deep-dive prompt now carries an explicit
// candidate-resolution rule so the model resolves surnames against
// <candidates> instead of bouncing the disambiguation back to the voter.
// The new bullet adds ~200 chars and pushes the prompt over the prior
// 1500 budget — bump the race-deep-dive ceiling rather than drop a load-
// bearing safety/UX rule. Other builders stay at 1500.
const RACE_DEEP_DIVE_LIMIT = 1800;

describe("task-prompt length budget", () => {
  it("theme-extraction body stays under the 3500-char limit", () => {
    const rendered = buildThemeExtractionPrompt({
      userInput: "I care about healthcare.",
    });
    expect(rendered.length).toBeLessThanOrEqual(THEME_EXTRACTION_LIMIT);
  });

  it("race-deep-dive body stays under the 1800-char limit", () => {
    const rendered = buildRaceDeepDivePrompt({
      raceLabel: "Senate",
      state: "TX",
      county: "Harris",
      themesList: "1. Healthcare",
      candidatesJson: "[]",
      decidedSummary: "(none)",
    });
    expect(rendered.length).toBeLessThanOrEqual(RACE_DEEP_DIVE_LIMIT);
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

  it("chat-catch-judge body stays under the 1500-char limit", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage:
        "I'm really worried about climate change and air quality in Houston this year ahead of the runoff.",
      currentThemes: [
        { name: "Healthcare costs", quotes: ["insulin"] },
        { name: "Housing affordability", quotes: ["rent up 30%"] },
      ],
    });
    expect(rendered.length).toBeLessThanOrEqual(LIMIT);
  });
});

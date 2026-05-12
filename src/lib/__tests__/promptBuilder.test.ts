import { describe, it, expect } from "vitest";
import {
  buildContextBlock,
  buildPrompt,
  buildRankingPreamble,
  buildConcernsPreamble,
} from "../promptBuilder";
import { getStateData } from "../stateData";
import { findNextElection } from "../stateData";
import type { RankedIssues, ConfirmedConcerns } from "../canonicalIssues";

const TODAY = new Date(2026, 4, 11); // May 11, 2026

describe("buildContextBlock", () => {
  it("includes state name in context block", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    expect(context).toContain("Texas");
    expect(context).toContain("73301");
  });

  it("includes zip code in context block", () => {
    const stateData = getStateData("CA")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "90210", election);
    expect(context).toContain("90210");
  });

  it("includes election name when election exists", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    if (election) {
      expect(context).toContain(election.name);
    }
  });

  it("includes registration deadline info", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    expect(context).toMatch(/registration/i);
  });

  it("includes sample ballot link", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    expect(context).toContain(stateData.resources.sampleBallotLookup);
  });

  it("includes county election office link", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    expect(context).toContain(stateData.resources.countyElectionLookup);
  });

  it("handles null election gracefully", () => {
    const stateData = getStateData("TX")!;
    const context = buildContextBlock(stateData, "73301", null);
    expect(context).toContain("Texas");
    expect(context).toMatch(/no upcoming election/i);
  });

  it("includes 'Help me with my ballot' call to action", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const context = buildContextBlock(stateData, "73301", election);
    expect(context).toContain("Help me with my ballot");
  });
});

describe("buildPrompt", () => {
  it("starts with the main prompt text (en)", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "73301", election);
    expect(prompt).toContain("nonpartisan civic research assistant");
  });

  it("contains the context block after the main prompt", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "73301", election);
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
    // Context block should come after the main prompt
    const mainPromptIdx = prompt.indexOf("nonpartisan civic research");
    const contextIdx = prompt.indexOf("I'm voting in");
    expect(contextIdx).toBeGreaterThan(mainPromptIdx);
  });

  it("builds California prompt correctly", () => {
    const stateData = getStateData("CA")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "90210", election);
    expect(prompt).toContain("California");
    expect(prompt).toContain("90210");
  });

  it("builds Vietnamese prompt with correct register", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "73301", election, "vi");
    // Vietnamese context block greeting
    expect(prompt).toContain("Xin chào");
    // Vietnamese date format: day tháng month
    expect(prompt).toMatch(/tháng/);
    // State name still present
    expect(prompt).toContain("Texas");
  });

  it("builds Chinese prompt with Simplified characters", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "73301", election, "zh");
    // Chinese context block greeting
    expect(prompt).toContain("你好");
    // Chinese date format: Year年Month月Day日
    expect(prompt).toMatch(/年.*月.*日/);
    // State name still present
    expect(prompt).toContain("Texas");
  });

  it("builds Arabic prompt (MSA)", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections, TODAY);
    const prompt = buildPrompt(stateData, "73301", election, "ar");
    // Arabic context block greeting
    expect(prompt).toContain("مرحباً");
    // Arabic month name should appear
    expect(prompt).toMatch(
      /يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر/,
    );
    // State name still present
    expect(prompt).toContain("Texas");
  });
});

// ─── Phase 6: buildRankingPreamble ──────────────────────────────────────────

describe("buildRankingPreamble", () => {
  const ranking: RankedIssues = {
    ordered: ["housing", "healthcare", "education", "economy-jobs"],
    skipped: false,
    timestamp: "2026-01-01T00:00:00.000Z",
  };

  it("includes top 3 priorities", () => {
    const preamble = buildRankingPreamble(ranking);
    expect(preamble).toContain("Housing");
    expect(preamble).toContain("Healthcare");
    expect(preamble).toContain("Education");
  });

  it("includes all ranked issues", () => {
    const preamble = buildRankingPreamble(ranking);
    expect(preamble).toContain("Economy & Jobs");
  });

  it("returns empty string when skipped", () => {
    const skipped: RankedIssues = {
      ordered: ["housing"],
      skipped: true,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(buildRankingPreamble(skipped)).toBe("");
  });

  it("returns empty string for empty ordered array", () => {
    const empty: RankedIssues = {
      ordered: [],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(buildRankingPreamble(empty)).toBe("");
  });

  it("contains the VOTER ISSUE PRIORITIES marker", () => {
    const preamble = buildRankingPreamble(ranking);
    expect(preamble).toContain("[VOTER ISSUE PRIORITIES");
    expect(preamble).toContain("[END VOTER ISSUE PRIORITIES]");
  });
});

// ─── Phase 6: buildConcernsPreamble ─────────────────────────────────────────

describe("buildConcernsPreamble", () => {
  const concerns: ConfirmedConcerns = {
    primaryIssues: ["housing", "economy-jobs"],
    originalText: "I can't afford rent in my city",
    rationale: "Maps to housing and economic issues.",
    skipped: false,
  };

  it("includes original text", () => {
    const preamble = buildConcernsPreamble(concerns);
    expect(preamble).toContain("I can't afford rent in my city");
  });

  it("includes rationale", () => {
    const preamble = buildConcernsPreamble(concerns);
    expect(preamble).toContain("Maps to housing and economic issues.");
  });

  it("includes confirmed issue labels", () => {
    const preamble = buildConcernsPreamble(concerns);
    expect(preamble).toContain("Housing");
    expect(preamble).toContain("Economy & Jobs");
  });

  it("returns empty string when skipped", () => {
    const skipped: ConfirmedConcerns = {
      primaryIssues: ["housing"],
      originalText: "rent",
      rationale: "housing",
      skipped: true,
    };
    expect(buildConcernsPreamble(skipped)).toBe("");
  });

  it("returns empty string for empty primaryIssues", () => {
    const empty: ConfirmedConcerns = {
      primaryIssues: [],
      originalText: "something",
      rationale: "nothing matched",
      skipped: false,
    };
    expect(buildConcernsPreamble(empty)).toBe("");
  });

  it("contains the VOTER SPECIFIC CONCERN marker", () => {
    const preamble = buildConcernsPreamble(concerns);
    expect(preamble).toContain("[VOTER SPECIFIC CONCERN");
    expect(preamble).toContain("[END VOTER SPECIFIC CONCERN]");
  });
});

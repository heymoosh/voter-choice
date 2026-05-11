import { describe, it, expect } from "vitest";
import { buildContextBlock, buildPrompt } from "../promptBuilder";
import { getStateData } from "../stateData";
import { findNextElection } from "../stateData";

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
  it("starts with the main prompt text", () => {
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
});

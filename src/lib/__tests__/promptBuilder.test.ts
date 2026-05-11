import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildContextBlock, buildFullPrompt } from "../promptBuilder";
import { getStateData } from "../stateData";
import { findNextElection } from "../deadlines";

const TODAY = "2026-05-11";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY + "T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildContextBlock", () => {
  it("includes state name and zip code", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes election name when available", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    if (election) {
      expect(block).toContain(election.name);
    }
  });

  it("includes registration deadline info", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain("Registration deadlines");
  });

  it("includes early voting info", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain("Early voting");
  });

  it("includes voter ID info", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain("Voter ID");
  });

  it("includes sample ballot link", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain(stateData.resources.sampleBallotLookup);
  });

  it("includes county election office link", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "73301", election);
    expect(block).toContain(stateData.resources.countyElectionLookup);
  });

  it("handles null election gracefully", () => {
    const stateData = getStateData("TX")!;
    const block = buildContextBlock(stateData, "73301", null);
    expect(block).toContain("No upcoming election found");
  });

  it("works for California", () => {
    const stateData = getStateData("CA")!;
    const election = findNextElection(stateData.elections);
    const block = buildContextBlock(stateData, "90210", election);
    expect(block).toContain("California");
    expect(block).toContain("90210");
  });
});

describe("buildFullPrompt", () => {
  it("includes the base ballot prompt text", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const prompt = buildFullPrompt(stateData, "73301", election);
    expect(prompt).toContain("nonpartisan civic research assistant");
  });

  it("includes the context block", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const prompt = buildFullPrompt(stateData, "73301", election);
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
  });

  it("separates prompt and context with separator", () => {
    const stateData = getStateData("TX")!;
    const election = findNextElection(stateData.elections);
    const prompt = buildFullPrompt(stateData, "73301", election);
    expect(prompt).toContain("---");
  });
});

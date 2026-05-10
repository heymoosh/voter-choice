import { describe, it, expect } from "vitest";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";
import { getStateData, getNextElection } from "@/lib/election-data";

describe("generateCustomizedPrompt", () => {
  it("includes zip code in output", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain("73301");
  });

  it("includes state name Texas in output", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain("Texas");
  });

  it("includes the election name", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain(election.name);
  });

  it("includes registration info", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt.toLowerCase()).toContain("registration");
  });

  it("includes sample ballot URL", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain(data.resources.sampleBallotLookup);
  });

  it("includes county election office URL", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain(data.resources.countyElectionLookup);
  });

  it("works for California", () => {
    const data = getStateData("CA")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("90210", data, election);
    expect(prompt).toContain("90210");
    expect(prompt).toContain("California");
  });

  it("includes voter ID info for Texas (ID required)", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt.toLowerCase()).toContain("id");
  });

  it("includes phones-at-polls detail", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("73301", data, election);
    expect(prompt).toContain(data.votingRules.phonesAtPollsDetail!);
  });

  it("returns a non-empty string", () => {
    const data = getStateData("NH")!;
    const election = getNextElection(data)!;
    const prompt = generateCustomizedPrompt("03031", data, election);
    expect(prompt.length).toBeGreaterThan(100);
  });
});

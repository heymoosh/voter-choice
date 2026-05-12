import { describe, it, expect } from "vitest";
import { parseBallot } from "../ballotParser";

const validBallot = `
MY BALLOT — Travis County — Texas General Election — November 3, 2026

U.S. Senate: Jane Doe
Governor: John Smith
U.S. Representative, District 25: Alice Johnson

Propositions:
Prop 1: YES
Prop 3: NO

REMINDER: Texas law prohibits wireless devices in the voting room. Print this or write it down.

Generated with Voter Choice — https://voter-choice.vercel.app
This document is your personal notes, not an official ballot.
`;

describe("parseBallot", () => {
  it("parses a valid ballot", () => {
    const result = parseBallot(validBallot);
    expect(result).not.toBeNull();
    expect(result?.county).toBe("Travis County");
    expect(result?.electionName).toBe("Texas General Election");
    expect(result?.date).toBe("November 3, 2026");
    expect(result?.entries).toHaveLength(3);
    expect(result?.entries[0]).toEqual({
      race: "U.S. Senate",
      pick: "Jane Doe",
    });
    expect(result?.entries[1]).toEqual({
      race: "Governor",
      pick: "John Smith",
    });
  });

  it("parses propositions", () => {
    const result = parseBallot(validBallot);
    expect(result?.propositions).toHaveLength(2);
    expect(result?.propositions[0]).toEqual({ number: "Prop 1", vote: "YES" });
    expect(result?.propositions[1]).toEqual({ number: "Prop 3", vote: "NO" });
  });

  it("returns null when MY BALLOT marker is absent", () => {
    const result = parseBallot("No ballot here. Just some text.");
    expect(result).toBeNull();
  });

  it("returns null when marker present but no entries", () => {
    const result = parseBallot("MY BALLOT\n\nNo entries here.");
    expect(result).toBeNull();
  });

  it("handles ballot without header info (minimal)", () => {
    const minimal = `MY BALLOT\n\nU.S. Senate: Alice\nGovernor: Bob`;
    const result = parseBallot(minimal);
    expect(result).not.toBeNull();
    expect(result?.entries).toHaveLength(2);
  });

  it("handles ballot without county/election info", () => {
    const noHeader = `MY BALLOT — Just One Part\n\nRace A: Candidate X`;
    const result = parseBallot(noHeader);
    expect(result).not.toBeNull();
    expect(result?.entries[0]).toEqual({ race: "Race A", pick: "Candidate X" });
  });

  it("stops at voter profile section", () => {
    const withProfile = `${validBallot}\n\n=== MY VOTER PROFILE — 2026-05-12 ===\nProfile content here.`;
    const result = parseBallot(withProfile);
    expect(result).not.toBeNull();
    // Should not include profile content
    expect(result?.entries.some((e) => e.race.includes("VOTER PROFILE"))).toBe(
      false,
    );
  });
});

import { describe, it, expect } from "vitest";
import { parseBallotOutput, parseVoterProfile } from "../ballotParser";

const VALID_BALLOT = `
Here is your ballot summary:

MY BALLOT — Travis County — Texas Primary 2026 — March 3, 2026

Governor: Jane Smith
US Senator: Bob Jones

Propositions:
Prop 1: YES
Prop 2: NO

REMINDER: Texas law prohibits wireless devices in the voting room. Print this or write it down.

Generated with Voter Choice — voterchoice.org
This document is your personal notes, not an official ballot.
`;

const MINIMAL_BALLOT = `
MY BALLOT

US Senate: Candidate A
US House: Candidate B
`;

const VALID_PROFILE = `
=== MY VOTER PROFILE — March 2026 ===

LOCATION: Austin, TX 73301

WHAT I CARE ABOUT:
- Environmental policy: high priority
- Healthcare: medium priority

HOW I MAKE DECISIONS:
- Research-driven

=== END VOTER PROFILE ===
`;

describe("parseBallotOutput", () => {
  it("parses a fully formatted ballot", () => {
    const result = parseBallotOutput(VALID_BALLOT);
    expect(result).not.toBeNull();
    expect(result?.county).toBe("Travis County");
    expect(result?.electionName).toBe("Texas Primary 2026");
    expect(result?.races.length).toBeGreaterThan(0);
    expect(result?.races[0].race).toBe("Governor");
    expect(result?.races[0].choice).toBe("Jane Smith");
  });

  it("parses propositions separately", () => {
    const result = parseBallotOutput(VALID_BALLOT);
    expect(result?.propositions.length).toBeGreaterThan(0);
    expect(result?.propositions[0].race).toBe("Prop 1");
    expect(result?.propositions[0].choice).toBe("YES");
  });

  it("parses a minimal ballot without header details", () => {
    const result = parseBallotOutput(MINIMAL_BALLOT);
    expect(result).not.toBeNull();
    expect(result?.races.length).toBe(2);
    expect(result?.races[0].race).toBe("US Senate");
    expect(result?.races[0].choice).toBe("Candidate A");
  });

  it("returns null if no MY BALLOT marker found", () => {
    const result = parseBallotOutput(
      "This is just some text without the marker.",
    );
    expect(result).toBeNull();
  });

  it("returns null if no races found after parsing", () => {
    const result = parseBallotOutput("MY BALLOT\n\nNo entries here.");
    expect(result).toBeNull();
  });
});

describe("parseVoterProfile", () => {
  it("extracts voter profile content", () => {
    const result = parseVoterProfile(VALID_PROFILE);
    expect(result).not.toBeNull();
    expect(result).toContain("MY VOTER PROFILE");
    expect(result).toContain("WHAT I CARE ABOUT");
  });

  it("returns null when no profile markers found", () => {
    const result = parseVoterProfile("Just some regular text.");
    expect(result).toBeNull();
  });
});

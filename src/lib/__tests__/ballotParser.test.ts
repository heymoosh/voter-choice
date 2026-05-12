import { describe, it, expect } from "vitest";
import { parseBallot } from "../ballotParser";

describe("parseBallot", () => {
  it("parses a well-formed MY BALLOT block", () => {
    const input = `
Here's your ballot summary!

MY BALLOT — Travis County — Texas General Election — November 4, 2026

US Senate: Jane Doe
Governor: John Smith
Proposition 1: YES
Proposition 2: NO

REMINDER: Texas law prohibits wireless devices in the voting room.

Generated with VoterChoice — voterchoice.org
This document is your personal notes, not an official ballot.
`;
    const result = parseBallot(input);
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Travis County");
    expect(result!.electionName).toBe("Texas General Election");
    expect(result!.date).toBe("November 4, 2026");
    expect(result!.entries).toHaveLength(4);
    expect(result!.entries[0]).toEqual({
      race: "US Senate",
      choice: "Jane Doe",
    });
    expect(result!.entries[2]).toEqual({
      race: "Proposition 1",
      choice: "YES",
    });
    expect(result!.reminder).toContain("Texas law");
  });

  it("returns null when no MY BALLOT marker", () => {
    const result = parseBallot("Some random text without the marker");
    expect(result).toBeNull();
  });

  it("handles extra whitespace and blank lines", () => {
    const input = `
MY BALLOT — Los Angeles County — California Primary — March 3, 2026

  US Senate :  Maria Garcia
  Measure A:  YES

REMINDER: California allows phones at polls.
`;
    const result = parseBallot(input);
    expect(result).not.toBeNull();
    expect(result!.entries[0]).toEqual({
      race: "US Senate",
      choice: "Maria Garcia",
    });
    expect(result!.entries[1]).toEqual({ race: "Measure A", choice: "YES" });
  });

  it("parses ballot without reminder section", () => {
    const input = `
MY BALLOT — Cook County — Illinois General — November 2026

Mayor: Alice Johnson
Alderman Ward 5: Bob Chen
`;
    const result = parseBallot(input);
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    expect(result!.reminder).toBeUndefined();
  });

  it("returns null for empty MY BALLOT block", () => {
    const input = `MY BALLOT — County — Election — Date\n\n`;
    const result = parseBallot(input);
    expect(result).toBeNull();
  });
});

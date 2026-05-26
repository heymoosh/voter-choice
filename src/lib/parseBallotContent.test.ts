import { describe, it, expect } from "vitest";
import { parseBallotContent } from "./parseBallotContent";

describe("parseBallotContent — single-candidate race lines (existing behavior)", () => {
  it("parses 'Office: Candidate (Party) — reason' into one race", () => {
    const text = ["MY BALLOT", "U.S. Senate: Cory Booker (D) — incumbent"].join(
      "\n",
    );
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(1);
    expect(parsed.races[0]).toEqual({
      office: "U.S. Senate",
      candidate: "Cory Booker",
      party: "D",
      reason: "incumbent",
    });
  });

  it("preserves em-dash reason when only one candidate is present", () => {
    const text = "U.S. House: Donald Norcross (D) — labor record";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(1);
    expect(parsed.races[0].reason).toBe("labor record");
  });
});

describe("parseBallotContent — multi-seat 'Vote for N' comma-separated races", () => {
  it("expands 'Office (Vote for N): A, B, C, D' into one race per candidate", () => {
    // The bug fixture: live NJ sample ballot pastes the commissioner race as
    // a single comma-separated line. Pre-fix, this collapsed to one mangled
    // race row. Post-fix, we want four distinct rows with the SAME office.
    const text =
      "County Commissioners (Vote for 2): Louis Cappelli Jr (Democratic), Jonathan Young (Democratic), Vanetta Hawkins (Democratic), Constance Mercedes (Democratic)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(4);
    expect(parsed.races.map((r) => r.candidate)).toEqual([
      "Louis Cappelli Jr",
      "Jonathan Young",
      "Vanetta Hawkins",
      "Constance Mercedes",
    ]);
  });

  it("strips '(Vote for N)' suffix from the office name on every emitted row", () => {
    // parsedBallotToContests groups by exact office string to detect
    // multi-seat collisions and to drive the workspace label. The visible
    // label must be "County Commissioners — Louis Cappelli Jr", not
    // "County Commissioners (Vote for 2) — ...". Normalize at the parser.
    const text =
      "County Commissioners (Vote for 2): Louis Cappelli Jr (Democratic), Jonathan Young (Democratic), Vanetta Hawkins (Democratic), Constance Mercedes (Democratic)";
    const parsed = parseBallotContent(text);
    for (const race of parsed.races) {
      expect(race.office).toBe("County Commissioners");
    }
  });

  it("also strips '(Vote for 1)' from single-candidate lines", () => {
    // Real ballots often label every race uniformly, including single-seat
    // ones. The suffix is meta-data about the seat count, not part of the
    // office name the workspace should display.
    const text = "U.S. Senate (Vote for 1): Cory Booker (Democratic)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(1);
    expect(parsed.races[0].office).toBe("U.S. Senate");
    expect(parsed.races[0].candidate).toBe("Cory Booker");
  });

  it("preserves party labels when each candidate has a different party", () => {
    // Mixed-party multi-candidate line: each candidate keeps its own party.
    const text = "City Council: Alice Smith (D), Bob Jones (R), Carol Lee (I)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(3);
    expect(
      parsed.races.map((r) => ({ name: r.candidate, party: r.party })),
    ).toEqual([
      { name: "Alice Smith", party: "D" },
      { name: "Bob Jones", party: "R" },
      { name: "Carol Lee", party: "I" },
    ]);
  });

  it("accepts long-form party labels like '(Democratic)' alongside short '(D)'", () => {
    const text =
      "School Board: Alice Smith (Democratic), Bob Jones (R), Carol Lee (Independent)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(3);
    expect(parsed.races[0].party).toBe("Democratic");
    expect(parsed.races[1].party).toBe("R");
    expect(parsed.races[2].party).toBe("Independent");
  });

  it("emits empty 'reason' for split candidates (em-dash reasons only apply to single-candidate lines)", () => {
    const text =
      "County Commissioners (Vote for 2): Louis Cappelli Jr (Democratic), Jonathan Young (Democratic)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(2);
    for (const race of parsed.races) {
      expect(race.reason).toBe("");
    }
  });

  it("does NOT split on commas that look like name suffixes (e.g. 'Jr, Sr')", () => {
    // Only split when the next chunk starts with a capital letter followed
    // by something name-shaped. "Sr" has no trailing space — won't trigger.
    // This is the rare edge the spec calls out for v1.
    const text = "Mayor: Louis Cappelli Jr, Sr (D)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(1);
    expect(parsed.races[0].candidate).toBe("Louis Cappelli Jr, Sr");
  });

  it("handles exactly two comma-separated candidates", () => {
    // Boundary case the mutation gate likes to target: not 1, not many — 2.
    const text =
      "County Commissioners (Vote for 2): Alice Smith (D), Bob Jones (D)";
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(2);
    expect(parsed.races[0].candidate).toBe("Alice Smith");
    expect(parsed.races[1].candidate).toBe("Bob Jones");
  });

  it("yields the full NJ DEM one-line fixture as 6 races (1 Senate + 1 House + 4 commissioners)", () => {
    // Live verification: pasting this exact text into the workspace should
    // surface six distinct rows in the rail. The four commissioners share
    // an office string so parsedBallotToContests's multi-seat path kicks in.
    const text = [
      "June 2, 2026 NJ Democratic Primary - Camden County",
      "US Senate (Vote for 1): Cory Booker (Democratic)",
      "US House CD-1 (Vote for 1): Donald Norcross (Democratic)",
      "County Commissioners (Vote for 2): Louis Cappelli Jr (Democratic), Jonathan Young (Democratic), Vanetta Hawkins (Democratic), Constance Mercedes (Democratic)",
    ].join("\n");
    const parsed = parseBallotContent(text);
    expect(parsed.races).toHaveLength(6);
    const offices = parsed.races.map((r) => r.office);
    expect(offices).toEqual([
      "US Senate",
      "US House CD-1",
      "County Commissioners",
      "County Commissioners",
      "County Commissioners",
      "County Commissioners",
    ]);
  });
});

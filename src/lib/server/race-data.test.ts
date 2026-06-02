import { describe, it, expect } from "vitest";
import {
  deriveLegislativeJurisdiction,
  donorFieldsFromResult,
  alignmentEntryFromResults,
  rosterIdForIndex,
  siblingFederalChamber,
  priorRoleLabelFor,
  assembleRaceData,
} from "./race-data";

describe("siblingFederalChamber", () => {
  it("crosses House ↔ Senate", () => {
    expect(siblingFederalChamber("federal-senate")).toBe("federal-house");
    expect(siblingFederalChamber("federal-house")).toBe("federal-senate");
  });
  it("returns null for state chambers (no cross-match)", () => {
    expect(siblingFederalChamber("state-NJ-senate")).toBeNull();
    expect(siblingFederalChamber("state-TX-house")).toBeNull();
  });
});

describe("priorRoleLabelFor", () => {
  it("names the chamber the record came from", () => {
    expect(priorRoleLabelFor("federal-house")).toMatch(/U\.S\. House/);
    expect(priorRoleLabelFor("federal-senate")).toMatch(/U\.S\. Senate/);
  });
});

describe("rosterIdForIndex", () => {
  it("maps 0..25 to A..Z", () => {
    expect(rosterIdForIndex(0)).toBe("A");
    expect(rosterIdForIndex(1)).toBe("B");
    expect(rosterIdForIndex(25)).toBe("Z");
  });
  it("wraps past 26 deterministically", () => {
    expect(rosterIdForIndex(26)).toBe("A1");
    expect(rosterIdForIndex(27)).toBe("B1");
  });
});

describe("deriveLegislativeJurisdiction", () => {
  const cases: Array<[string, string, string, string | null]> = [
    // Federal
    ["U.S. Senate", "Federal", "NJ", "federal-senate"],
    ["United States Senate", "Federal", "TX", "federal-senate"],
    ["U.S. House — CD-1", "Federal", "NJ", "federal-house"],
    ["U.S. Representative, District 12", "Federal", "TX", "federal-house"],
    ["U.S. House CD 1", "Federal", "NJ", "federal-house"],
    // State legislature — many lower-chamber names
    ["State Senate District 5", "State", "NJ", "state-NJ-senate"],
    ["State Assembly District 6", "State", "NJ", "state-NJ-house"],
    ["State House District 42", "State", "TX", "state-TX-house"],
    ["House of Delegates", "State", "VA", "state-VA-house"],
    ["State Representative", "State", "TX", "state-TX-house"],
    // No coverage → null
    ["Governor", "State", "TX", null],
    ["Attorney General", "State", "TX", null],
    ["County Commissioners", "County", "NJ", null],
    ["County Committee Member", "County", "NJ", null],
    ["Judge of the Superior Court", "Judicial", "NJ", null],
    ["Mayor", "Municipal", "NJ", null],
    ["Proposition 1", "Propositions", "TX", null],
    // Missing state → null (can't form a state-XX jurisdiction)
    ["U.S. Senate", "Federal", "", null],
  ];
  it.each(cases)("(%s / %s / %s) → %s", (label, section, state, expected) => {
    expect(deriveLegislativeJurisdiction(label, section, state)).toBe(expected);
  });

  it("does not classify a State-section Senate as federal", () => {
    // A bare "Senate" in the State section must be state-XX-senate, not federal.
    expect(deriveLegislativeJurisdiction("Senate", "State", "NJ")).toBe(
      "state-NJ-senate",
    );
  });
});

describe("donorFieldsFromResult", () => {
  it("maps a found result to coalition + totalRaised + source", () => {
    const fields = donorFieldsFromResult({
      found: true,
      candidateId: "uuid-1",
      totalRaised: 461539,
      buckets: [
        { label: "Healthcare industry", amount: 83077, percent: 18 },
        {
          label: "Small individual donors (under $200)",
          amount: 240000,
          percent: 52,
        },
      ],
      source: "FEC",
      sourceUrl: "https://www.fec.gov/data/candidate/x",
      electionCycle: "2026",
    });
    expect(fields.donorCoalition).toEqual([
      { label: "Healthcare industry", percent: 18, amount: 83077 },
      {
        label: "Small individual donors (under $200)",
        percent: 52,
        amount: 240000,
      },
    ]);
    expect(fields.totalRaised).toBe(461539);
    expect(fields.donorDataSource).toBe("voting_record");
    expect(fields.donorSource).toEqual({
      name: "FEC",
      url: "https://www.fec.gov/data/candidate/x",
    });
    expect(fields.donorUnavailable).toBeUndefined();
  });

  it("maps a not-resolved result to a backstop note", () => {
    const fields = donorFieldsFromResult({
      found: false,
      reason: "candidate_not_resolved",
    });
    expect(fields.donorCoalition).toBeNull();
    expect(fields.donorUnavailable?.reason).toMatch(/match/i);
    expect(fields.totalRaised).toBeUndefined();
  });

  it("maps a non-legislative result to an office-specific note", () => {
    const fields = donorFieldsFromResult({
      found: false,
      reason: "non_legislative_candidate",
    });
    expect(fields.donorCoalition).toBeNull();
    expect(fields.donorUnavailable?.reason).toMatch(/office/i);
  });
});

describe("alignmentEntryFromResults", () => {
  const issue = {
    canonicalIssue: "healthcare_affordability",
    issueLabel: "Healthcare Affordability",
    stance: "in_favor" as const,
  };

  it("builds a voting_record score from a found result", () => {
    const entry = alignmentEntryFromResults("A", [
      {
        issue,
        result: {
          found: true,
          candidateId: "uuid-1",
          kept: 4,
          total: 6,
          contributingVotes: [
            {
              billTitle: "HR 100",
              voteCast: "with",
              date: "2025-04-12",
              source: {
                name: "clerk.house.gov",
                url: "https://clerk.house.gov",
              },
            },
          ],
        },
      },
    ]);
    expect(entry.candidateId).toBe("A");
    expect(entry.scores).toHaveLength(1);
    expect(entry.scores?.[0]).toMatchObject({
      canonicalIssue: "healthcare_affordability",
      issueLabel: "Healthcare Affordability",
      resolvedStance: "in_favor",
      sourceType: "voting_record",
      kept: 4,
      total: 6,
    });
    expect(entry.unavailable).toBeUndefined();
  });

  it("returns scores:null + unavailable when every issue is not-found", () => {
    const entry = alignmentEntryFromResults("B", [
      {
        issue,
        result: {
          found: false,
          unavailable: { reason: "Candidate not found" },
        },
      },
    ]);
    expect(entry.scores).toBeNull();
    expect(entry.unavailable?.reason).toMatch(/no voting record/i);
  });

  it("skips an internally-unavailable found result (DB-not-configured edge)", () => {
    const entry = alignmentEntryFromResults("C", [
      {
        issue,
        result: {
          found: true,
          candidateId: "uuid-1",
          kept: 0,
          total: 0,
          contributingVotes: [],
          unavailable: { reason: "Voting record database is not configured" },
        },
      },
    ]);
    // The single "found but unavailable" score is dropped → entry collapses
    // to the backstop, not an empty 0/0 bar.
    expect(entry.scores).toBeNull();
    expect(entry.unavailable).toBeDefined();
  });

  it("keeps only the found scores in a mixed result set", () => {
    const entry = alignmentEntryFromResults("A", [
      {
        issue,
        result: {
          found: true,
          candidateId: "uuid-1",
          kept: 3,
          total: 5,
          contributingVotes: [],
        },
      },
      {
        issue: {
          canonicalIssue: "housing_affordability",
          issueLabel: "Housing",
          stance: "in_favor",
        },
        result: { found: false, unavailable: { reason: "no data" } },
      },
    ]);
    expect(entry.scores).toHaveLength(1);
    expect(entry.scores?.[0].canonicalIssue).toBe("healthcare_affordability");
  });
});

// Integration: with no DATABASE_URL in the test env, the DB is unconfigured,
// so resolveCandidateId returns null and lookups return found:false. This is
// EXACTLY the current production state. The endpoint must still render a full
// set of backstop cards (never crash, never empty), one per candidate.
describe("assembleRaceData (no DB configured — current prod state)", () => {
  it("renders a backstop card per candidate with donor + alignment unavailable", async () => {
    const data = await assembleRaceData({
      raceId: "u-s-senate",
      raceLabel: "U.S. Senate",
      section: "Federal",
      stateCode: "NJ",
      candidates: [
        { name: "Andy Kim", party: "Democratic" },
        { name: "Curtis Bashaw", party: "Republican" },
      ],
      issues: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare Affordability",
          stance: "in_favor",
        },
      ],
    });

    // Two cards, stable roster ids.
    expect(data.racePatterns.candidates).toHaveLength(2);
    expect(data.racePatterns.candidates.map((c) => c.id)).toEqual(["A", "B"]);
    expect(data.racePatterns.candidates[0].name).toBe("Andy Kim");
    // Federal Senate IS covered jurisdiction-wise (the gap is data, not office).
    expect(data.legislativeCoverage).toBe(true);
    // But with no DB, every donor lookup is a backstop.
    for (const c of data.racePatterns.candidates) {
      expect(c.donorCoalition).toBeNull();
      expect(c.donorUnavailable).toBeDefined();
    }
    // Alignment block present (we have an issue) but every entry is a backstop.
    expect(data.alignmentScores).not.toBeNull();
    expect(data.alignmentScores?.entries).toHaveLength(2);
    for (const e of data.alignmentScores!.entries) {
      expect(e.scores).toBeNull();
      expect(e.unavailable).toBeDefined();
    }
    // Card ids and alignment-entry ids line up so the renderer can join them.
    expect(data.alignmentScores?.entries.map((e) => e.candidateId)).toEqual([
      "A",
      "B",
    ]);
  });

  it("non-legislative office → legislativeCoverage:false, still renders cards", async () => {
    const data = await assembleRaceData({
      raceId: "county-commissioners",
      raceLabel: "County Commissioners",
      section: "County",
      stateCode: "NJ",
      candidates: [{ name: "Jane Doe" }],
      issues: [],
    });
    expect(data.legislativeCoverage).toBe(false);
    expect(data.racePatterns.candidates).toHaveLength(1);
    expect(data.racePatterns.candidates[0].donorCoalition).toBeNull();
    // No issues → no alignment block.
    expect(data.alignmentScores).toBeNull();
  });
});

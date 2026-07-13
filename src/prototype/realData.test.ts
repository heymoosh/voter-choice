import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchBallotFromAddress,
  fetchBallotFromText,
  stateCodeFrom,
  racesSpanMultipleParties,
  filterRacesByParty,
} from "./realData";
import { extractionToRaces } from "../lib/extractionToRaces";
import type { BallotExtraction } from "../lib/server/extract-types";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Tests for stateCodeFrom — best-effort 2-letter state/territory code from an
 * address string or a ballot jurisdiction. Pure and synchronous; never throws.
 *
 * The sharp cases are the save→paste round-trip: the app's own saved-plan .txt
 * export opens with a "MY BALLOT" (or Spanish "MI BOLETA") header, and the old
 * fallback grabbed the FIRST 2-letter uppercase token — "MY", or the valid-but-
 * wrong "MI" (Michigan). The state actually trails the jurisdiction, so the
 * fallback now keeps only real codes and prefers the LAST one.
 */
describe("stateCodeFrom", () => {
  describe('"MY BALLOT" / "MI BOLETA" header round-trip (the regression)', () => {
    it('reads the trailing state, not the "MY" in a "MY BALLOT" header', () => {
      const ballot =
        "MY BALLOT — Camden County, NJ\n" +
        "U.S. Senate: Cory Booker (D), Curtis Bashaw (R)";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it('reads the trailing state, not the "MI" (Michigan!) in a Spanish "MI BOLETA" header', () => {
      // Validation alone wouldn't fix this — "MI" is a real code — so the
      // last-match preference is what makes the trailing "NJ" win.
      const ballot =
        "MI BOLETA — Camden County, NJ\n" +
        "Senado de EE. UU.: Cory Booker (D), Curtis Bashaw (R)";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it("still resolves a trailing state under a SAMPLE BALLOT header", () => {
      expect(stateCodeFrom("SAMPLE BALLOT — Harris County, TX")).toBe("TX");
    });

    it('ignores the "IN" in an all-caps WRITE-IN body line (not Indiana)', () => {
      // stateCodeFrom receives the WHOLE pasted ballot, and "\bIN\b" inside
      // "WRITE-IN" is a valid code — so the header jurisdiction, not a stray
      // body token, must win.
      const ballot = "MY BALLOT — Camden County, NJ\nMayor: WRITE-IN";
      expect(stateCodeFrom(ballot)).toBe("NJ");
    });

    it("resolves the state from a realistic multi-race export with body noise", () => {
      const realExport = [
        "MY BALLOT — Camden County, NJ",
        "U.S. Senate (Vote for 1): Cory Booker (D), Curtis Bashaw (R)",
        "County Commissioner (Vote for 2): Jane Doe (D), WRITE-IN",
        "Propositions:",
        "Prop 1: NO — Keep the state property-tax cap",
      ].join("\n");
      expect(stateCodeFrom(realExport)).toBe("NJ");
    });
  });

  describe("full state names (case-insensitive)", () => {
    it("maps a full state name", () => {
      expect(stateCodeFrom("123 Main St, Newark, New Jersey")).toBe("NJ");
    });

    it("maps a lowercased full name", () => {
      expect(stateCodeFrom("somewhere in new jersey")).toBe("NJ");
    });

    it('prefers "west virginia" over its "virginia" substring', () => {
      // Longest-name-first ordering: an includes() on "west virginia" must not
      // short-circuit on the "virginia" entry and return VA.
      expect(stateCodeFrom("Charleston, West Virginia")).toBe("WV");
      expect(stateCodeFrom("Richmond, Virginia")).toBe("VA");
    });
  });

  describe("abbreviation fallback", () => {
    it("reads a bare jurisdiction tail", () => {
      expect(stateCodeFrom("Camden County, NJ")).toBe("NJ");
    });

    it("reads the state from a full street address with ZIP", () => {
      expect(stateCodeFrom("123 Main St, Newark, NJ 07102")).toBe("NJ");
    });

    it('rejects the non-state "US" token', () => {
      expect(stateCodeFrom("US Senate")).toBe("");
      expect(stateCodeFrom("US Senate, Newark NJ")).toBe("NJ");
    });

    it("recognizes a territory code", () => {
      expect(stateCodeFrom("Mayagüez, PR")).toBe("PR");
    });
  });

  describe("no resolvable state", () => {
    it("returns empty string when nothing matches", () => {
      expect(stateCodeFrom("County Commissioner ballot")).toBe("");
    });

    it("returns empty string for empty / whitespace / null-ish input", () => {
      expect(stateCodeFrom("")).toBe("");
      expect(stateCodeFrom("   ")).toBe("");
      expect(stateCodeFrom(undefined as unknown as string)).toBe("");
    });
  });
});

describe("ballot roster provenance", () => {
  it("marks pasted ballot text as user-supplied and unverified", async () => {
    const result = await fetchBallotFromText(
      "MY BALLOT — Camden County, NJ\nU.S. Senate: Cory Booker (D)",
    );

    expect(result.races[0].rosterProvenance).toMatchObject({
      sourceKind: "user_pasted_ballot",
      confidence: "unverified_user_supplied",
      ballotStatus: "user_supplied_unverified",
      selectableAsReplacement: false,
    });
  });

  it("marks exact-official Google Civic contests as address/election-tied verified roster data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          county: "Mercer County, NJ",
          contests: [
            {
              office: "U.S. Senate",
              district: "",
              candidates: [{ name: "Verified Candidate", party: "Democratic" }],
            },
          ],
          source: {
            provider: "Google Civic Information API",
            confidence: "exact_official",
            electionName: "2026 General Election",
            message: "Google Civic returned official contests for this address.",
            sourceLinks: [
              {
                label: "Google Civic Information API",
                url: "https://developers.google.com/civic-information",
              },
            ],
          },
        }),
      }),
    );

    const result = await fetchBallotFromAddress("123 Main St, Trenton, NJ");

    expect(result.races[0].rosterProvenance).toMatchObject({
      sourceKind: "google_civic",
      election: "2026 General Election",
      confidence: "official_address_election_tied",
      ballotStatus: "verified_current_ballot",
      selectableAsReplacement: true,
    });
  });
});

/**
 * Party-gate regression tests (R1).
 *
 * CONFIRMED BUG: after uploading a PRIMARY ballot, racesSpanMultipleParties
 * returned false because it read candidate.party (the ballot DESIGNATION)
 * and partyLetter() only matched strings starting with "d"/"r". Real Textract
 * output sets candidate.party to values like "Camden County Democrat Committee,
 * Inc." / "America First Always" / "Camden County Regular Republican Party" —
 * none start with d/r, so every heuristic check returned "" and the Set stayed
 * empty → racesSpanMultipleParties() === false → party gate never fired.
 *
 * The fixture below mirrors the REAL Textract output: races carry party_context
 * "Democratic Primary" / "Republican Primary" (the reliable race-level signal)
 * while candidate.party holds the ballot designations.
 *
 * These tests pass through extractionToRaces (which attaches partyLane) so
 * we're testing the full stack from extraction → gate/filter, not just the
 * utility functions in isolation.
 */

/** NJ Camden fixture with REAL Textract-style ballot designations in candidate.party */
function njCamdenDesignationFixture(): BallotExtraction {
  return {
    election_metadata: {
      election_date: "2026-06-03",
      election_type: "primary",
      jurisdiction: "Camden County, NJ",
    },
    sections: [
      {
        section_name: "Federal",
        races: [
          {
            office: "U.S. Senator",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Cory Booker",
                // Real designation from the Textract extraction, NOT "Democratic"
                party: "South Jersey Progressive Democrats",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "U.S. Senator",
            vote_for_n: 1,
            party_context: "Republican Primary",
            candidates: [
              {
                name: "John Bramnick",
                // Real designation from the Textract extraction, NOT "Republican"
                party: "Camden County Regular Republican Party",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
      {
        section_name: "County",
        races: [
          {
            office: "County Commissioner",
            vote_for_n: 2,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Louis Cappelli Jr",
                party: "Camden County Democrat Committee, Inc.",
                placeholder_reason: null,
              },
              {
                name: "Jonathan Young",
                party: "Camden County Democrat Committee, Inc.",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "County Commissioner",
            vote_for_n: 2,
            party_context: "Republican Primary",
            candidates: [
              {
                name: "Alice Rep",
                // A designation that doesn't start with d/r (this is the killer case)
                party: "America First Always",
                placeholder_reason: null,
              },
              {
                name: "Bob Rep",
                party: "The People, For The People",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
    ],
    _meta: {
      extraction_path: "vision",
      pages: 1,
      latency_ms: 0,
      cost_usd: 0,
    },
  };
}

describe("party gate — real Textract designation regression (R1)", () => {
  it("racesSpanMultipleParties returns TRUE when races have partyLane (even though designations don't start with d/r)", () => {
    // Build races via extractionToRaces (GENERAL tag so all 4 races come through)
    const races = extractionToRaces(njCamdenDesignationFixture(), "GENERAL");
    // Sanity: 4 races should be present
    expect(races).toHaveLength(4);

    // KEY ASSERTION: the gate must fire.
    // Old code returned false here because it read candidate.party =
    // "Camden County Democrat Committee, Inc." / "America First Always" /
    // "Camden County Regular Republican Party" / "The People, For The People"
    // — none start with d/r → partyLetter() = "" → seen empty → false.
    // New code reads race.partyLane ("D" or "R") from the reliable
    // party_context field → seen = {"D","R"} → true.
    expect(racesSpanMultipleParties(races)).toBe(true);
  });

  it("filterRacesByParty keeps Dem-lane races and drops Rep-lane ones (via partyLane)", () => {
    const races = extractionToRaces(njCamdenDesignationFixture(), "GENERAL");
    const demRaces = filterRacesByParty(races, "Democratic");

    // Should have only the 2 DEM-lane races (Senate + County Commissioner)
    expect(demRaces).toHaveLength(2);

    // DEM senate race is present
    const candidateNames = demRaces.flatMap((r) =>
      r.candidates.map((c) => c.name),
    );
    expect(candidateNames).toContain("Cory Booker");
    expect(candidateNames).toContain("Louis Cappelli Jr");

    // REP candidates are gone
    expect(candidateNames).not.toContain("John Bramnick");
    expect(candidateNames).not.toContain("Alice Rep");
    expect(candidateNames).not.toContain("Bob Rep");
  });

  it("filterRacesByParty keeps Rep-lane races and drops Dem-lane ones (via partyLane)", () => {
    const races = extractionToRaces(njCamdenDesignationFixture(), "GENERAL");
    const repRaces = filterRacesByParty(races, "Republican");

    expect(repRaces).toHaveLength(2);
    const candidateNames = repRaces.flatMap((r) =>
      r.candidates.map((c) => c.name),
    );
    expect(candidateNames).toContain("John Bramnick");
    expect(candidateNames).toContain("Alice Rep");
    expect(candidateNames).not.toContain("Cory Booker");
  });

  it("non-partisan (null partyLane) races are always kept by filterRacesByParty regardless of lane", () => {
    const ballotWithProp: BallotExtraction = {
      election_metadata: {
        election_date: "2026-06-03",
        election_type: "primary",
        jurisdiction: "Camden County, NJ",
      },
      sections: [
        ...njCamdenDesignationFixture().sections,
        {
          section_name: "Propositions",
          races: [
            {
              office: "Proposition 1",
              vote_for_n: 1,
              party_context: null,
              candidates: [],
            },
          ],
        },
      ],
      _meta: {
        extraction_path: "vision",
        pages: 1,
        latency_ms: 0,
        cost_usd: 0,
      },
    };

    const races = extractionToRaces(ballotWithProp, "GENERAL");
    const demRaces = filterRacesByParty(races, "Democratic");

    // 2 DEM-lane races + 1 Proposition (partyLane null → always kept)
    expect(demRaces).toHaveLength(3);
    expect(demRaces.some((r) => r.label === "Proposition 1")).toBe(true);
  });
});

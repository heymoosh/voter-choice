/**
 * Tests for extractionToRaces — the structured-extraction → workspace Race[]
 * bridge that replaces the lossy text round-trip via ballotJsonToText +
 * parseBallotContent for the PDF-extract path.
 *
 * Motivation: the prior path emitted markdown ("## Federal\n- Office\n  - Candidate")
 * which `parseBallotContent` (OFFICE: candidate regex) could not parse, so
 * 8 extracted races collapsed to whatever Civic happened to return. We bypass
 * the text round-trip and pass the structured BallotExtraction directly,
 * then filter on `party_context` per the voter's ballotTag.
 *
 * Per the bake-off "extract everything, filter downstream" principle.
 */

import { describe, it, expect } from "vitest";
import { extractionToRaces } from "./extractionToRaces";
import type { BallotExtraction } from "./server/extract-types";

const META: BallotExtraction["election_metadata"] = {
  election_date: "2026-06-02",
  election_type: "primary",
  jurisdiction: "Camden County, NJ",
};

/**
 * NJ Camden 2026 primary fixture — the live bug fixture. 8 races split
 * across Federal / County / Municipal sections, with both DEM and REP
 * primary variants for every partisan race.
 */
function njCamdenDemRepFixture(): BallotExtraction {
  return {
    election_metadata: META,
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
                party: "Democratic",
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
                party: "Republican",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "U.S. House of Representatives",
            district: "1",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Donald Norcross",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "U.S. House of Representatives",
            district: "1",
            vote_for_n: 1,
            party_context: "Republican Primary",
            candidates: [
              {
                name: "Joe Galbo",
                party: "Republican",
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
                name: "Louis Cappelli",
                party: "Democratic",
                placeholder_reason: null,
              },
              {
                name: "Jonathan Young",
                party: "Democratic",
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
                name: "Alice REP",
                party: "Republican",
                placeholder_reason: null,
              },
              {
                name: "Bob REP",
                party: "Republican",
                placeholder_reason: null,
              },
            ],
          },
        ],
      },
      {
        section_name: "Municipal",
        races: [
          {
            office: "County Committee — Female",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Carol Lee",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "County Committee — Male",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Dan Smith",
                party: "Democratic",
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

describe("extractionToRaces", () => {
  describe("DEM primary voter (ballotTag: DEM-primary)", () => {
    it("includes all Democratic Primary races plus universal (null party_context) races", () => {
      const races = extractionToRaces(njCamdenDemRepFixture(), "DEM-primary");
      // 1 Senate DEM + 1 House DEM + 1 Commissioner DEM + 2 County Committee DEM = 5
      expect(races).toHaveLength(5);
      const labels = races.map((r) => r.label);
      // Post-fix labels are normalized: "U.S. Senator" → "U.S. Senate",
      // verbose House → "U.S. House — CD-N", and "County Commissioner"
      // shortens to "County Commissioners" only for the "Members of the Board…"
      // variant. The DEM fixture uses the bare "County Commissioner" string,
      // which is already concise and passes through.
      expect(labels).toContain("U.S. Senate");
      expect(labels.some((l) => l.startsWith("U.S. House"))).toBe(true);
      expect(labels.some((l) => l.startsWith("County Commissioner"))).toBe(
        true,
      );
      expect(labels.some((l) => l.includes("County Committee"))).toBe(true);
      // No Republican Primary races leak through.
      const candidateNames = races.flatMap((r) =>
        r.candidates.map((c) => c.name),
      );
      expect(candidateNames).not.toContain("John Bramnick");
      expect(candidateNames).not.toContain("Joe Galbo");
      expect(candidateNames).not.toContain("Alice REP");
    });
  });

  describe("REP primary voter (ballotTag: REP-primary)", () => {
    it("includes all Republican Primary races plus universal races", () => {
      const races = extractionToRaces(njCamdenDemRepFixture(), "REP-primary");
      // 1 Senate REP + 1 House REP + 1 Commissioner REP = 3
      expect(races).toHaveLength(3);
      const candidateNames = races.flatMap((r) =>
        r.candidates.map((c) => c.name),
      );
      expect(candidateNames).toContain("John Bramnick");
      expect(candidateNames).toContain("Joe Galbo");
      // No Democratic Primary races leak through.
      expect(candidateNames).not.toContain("Cory Booker");
      expect(candidateNames).not.toContain("Donald Norcross");
    });
  });

  describe("unaffiliated / registered_other voter (ballotTag: GENERAL or unaffiliated/null)", () => {
    it("for ballotTag null: only includes universal (null party_context) races", () => {
      // Build a ballot with a non-partisan race so we can prove filtering works.
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Judicial Retention",
            races: [
              {
                office: "Justice Smith retention",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
          ...njCamdenDemRepFixture().sections,
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      // Only the non-partisan judicial retention race should appear.
      expect(races).toHaveLength(1);
      expect(races[0].label).toContain("Justice Smith");
    });

    it("for ballotTag 'GENERAL': returns ALL races regardless of party_context", () => {
      const races = extractionToRaces(njCamdenDemRepFixture(), "GENERAL");
      // General election shows everything.
      expect(races).toHaveLength(8);
    });
  });

  describe("section mapping and ordering", () => {
    it("orders sections Federal → State → County → Municipal → Judicial → Propositions → other", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
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
          {
            section_name: "Municipal",
            races: [
              {
                office: "Mayor",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
          {
            section_name: "Federal",
            races: [
              {
                office: "U.S. Senator",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
          {
            section_name: "County",
            races: [
              {
                office: "County Clerk",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      expect(races.map((r) => r.section)).toEqual([
        "Federal",
        "County",
        "Municipal",
        "Propositions",
      ]);
    });

    it("preserves section_name for non-canonical buckets (e.g. Constitutional Amendments)", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Constitutional Amendments",
            races: [
              {
                office: "Amendment 1",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      expect(races).toHaveLength(1);
      expect(races[0].section).toBe("Constitutional Amendments");
    });
  });

  describe("stable race ids", () => {
    it("disambiguates same-office races by party_context so DEM and REP rows have distinct ids", () => {
      // Sanity: with the fixture's two U.S. Senator rows (DEM + REP), if filter
      // didn't disambiguate them, makeRaceId would collide. We're not exercising
      // that filter path here (the GENERAL tag keeps both) but the ids must differ.
      const races = extractionToRaces(njCamdenDemRepFixture(), "GENERAL");
      // Label normalization collapses "U.S. Senator" → "U.S. Senate".
      const senators = races.filter((r) => r.label === "U.S. Senate");
      expect(senators).toHaveLength(2);
      expect(senators[0].id).not.toBe(senators[1].id);
    });
  });

  describe("candidate propagation", () => {
    it("emits candidate {name, party} entries from real candidates, skipping placeholders", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                office: "U.S. House",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Alice", party: "D", placeholder_reason: null },
                  { name: null, party: null, placeholder_reason: "write_in" },
                  {
                    name: null,
                    party: null,
                    placeholder_reason: "no_petition_filed",
                  },
                ],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      expect(races[0].candidates).toEqual([{ name: "Alice", party: "D" }]);
    });
  });

  describe("label normalization", () => {
    it("collapses verbose extracted offices into concise canonical labels", () => {
      // Real-bug fixture: PDF extraction often returns the verbose multi-clause
      // titles printed on the sample ballot. The rail should render the
      // canonical short form regardless.
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                office: "Member of the House of Representatives",
                district: "1st Congressional District",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: "United States Senator",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
          {
            section_name: "County",
            races: [
              {
                office: "Members of the Board of County Commissioners",
                vote_for_n: 2,
                party_context: null,
                candidates: [],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      const labels = races.map((r) => r.label);
      expect(labels).toContain("U.S. House — CD-1");
      expect(labels).toContain("U.S. Senate");
      expect(labels).toContain("County Commissioners");
    });
  });

  describe("empty / degenerate input", () => {
    it("returns [] for null input", () => {
      expect(extractionToRaces(null, "DEM-primary")).toEqual([]);
    });

    it("returns [] for an extraction with no sections", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [],
        _meta: njCamdenDemRepFixture()._meta,
      };
      expect(extractionToRaces(ballot, "DEM-primary")).toEqual([]);
    });
  });
});

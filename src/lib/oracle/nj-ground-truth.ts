/**
 * NJ ACCURACY ORACLE — canonical ground truth.
 *
 * Single source of truth for the "is the post-upload ballot accurate?" gate,
 * transcribed from the real Camden County / Audubon Borough June-2-2026 primary
 * PDF (see `.scratch-ballot/GROUND_TRUTH.md`, high-res re-read corrections folded
 * in). EVERY workstream verifies its output against THIS module — "done" means
 * the output matches ground truth, not "the flow runs."
 *
 * Do NOT loosen these values to make a test pass. If the real ballot differs,
 * fix the ballot reading in GROUND_TRUTH.md first, then update here.
 */

import type { BallotExtraction } from "../server/extract-types";

/** Who we actually hold a voting record for (everyone else → WS2 auto-populate). */
export type RecordSource = "in_db" | "no_record";

export interface GtCandidate {
  name: string;
  party: "Democratic" | "Republican";
  /** Whether our DB holds a real legislative voting record for this person. */
  record: RecordSource;
}

export interface GtRace {
  office: string;
  /** Congressional/legislative district as printed, if any. */
  district?: string;
  voteForN: number;
  candidates: GtCandidate[];
}

export const NJ_GROUND_TRUTH = {
  /** Ballot header facts. */
  meta: {
    state: "NJ",
    county: "Camden County",
    municipality: "Audubon Borough",
    congressionalDistrict: "NJ-01", // renders as "U.S. House — CD-1"
    electionType: "primary" as const,
    electionDate: "2026-06-02",
    countyClerk: "Pamela R. Lampitt",
    /** NJ semi-closed primary → the party gate MUST fire on this ballot. */
    partyGateFires: true,
  },

  /** Democratic primary ballot — the realistic single-party drive. */
  demBallot: [
    {
      office: "U.S. Senator",
      voteForN: 1,
      candidates: [
        { name: "Cory Booker", party: "Democratic", record: "in_db" },
      ],
    },
    {
      office: "U.S. House of Representatives",
      district: "1",
      voteForN: 1,
      candidates: [
        { name: "Donald Norcross", party: "Democratic", record: "in_db" },
      ],
    },
    {
      office: "County Commissioner",
      voteForN: 2,
      candidates: [
        { name: "Louis Cappelli", party: "Democratic", record: "no_record" },
        { name: "Jonathan Young", party: "Democratic", record: "no_record" },
        { name: "Vonetta Hawkins", party: "Democratic", record: "no_record" },
        {
          name: "Constance Mercedes",
          party: "Democratic",
          record: "no_record",
        },
      ],
    },
    // County Committee (male/female): mostly NO PETITION FILED → not a scored race.
  ] satisfies GtRace[],

  /** Republican primary ballot — the all-gap stress test (nobody is in-DB). */
  repBallot: [
    {
      office: "U.S. Senator",
      voteForN: 1,
      // EXACTLY 4 — this is the dense column F1 historically misread.
      candidates: [
        { name: "Robert Lebovics", party: "Republican", record: "no_record" },
        { name: "Justin Murphy", party: "Republican", record: "no_record" },
        { name: "Alex Zdan", party: "Republican", record: "no_record" },
        { name: "Richard Tabor", party: "Republican", record: "no_record" },
      ],
    },
    {
      office: "U.S. House of Representatives",
      district: "1",
      voteForN: 1,
      candidates: [
        { name: "Damon Galdo", party: "Republican", record: "no_record" },
      ],
    },
    {
      office: "County Commissioner",
      voteForN: 2,
      candidates: [
        { name: "Robert Stone", party: "Republican", record: "no_record" },
      ],
    },
  ] satisfies GtRace[],

  /** Pillar 3 — voting-details ground truth for this NJ address. */
  logistics: {
    idRequired: false, // NJ: no document required for most in-person voters
    pollingHoursPlain: "6:00 AM – 8:00 PM", // NJ polls (the TX mock said 7–7)
    congressionalDistrict: "NJ-01",
    earlyVotingPrimary: { start: "2026-05-26", end: "2026-05-31" },
  },

  /**
   * Strings that must NEVER appear in the rendered UI / print for an NJ voter.
   * These are the leaked TX/Harris/Houston mock values (F12 + the 2026-06-05
   * hardcoded-leak findings). Phase B asserts zero occurrences end-to-end.
   */
  forbiddenForNj: [
    "Texas",
    "Harris County",
    "Houston",
    "TX-7",
    "handgun",
    "Trini Mendell",
    "Precinct 0364",
  ],
} as const;

/**
 * A real-name BallotExtraction fixture for unit-testing the party filter
 * (`extractionToRaces`). Shape mirrors production extraction: one race per
 * (office × party_context), candidates with `placeholder_reason`. Empty
 * county-committee rows are included as `no_petition_filed` so tests can assert
 * they don't survive as scored races.
 *
 * NOTE: this exercises the FILTER, not the extractor. Whether the real PDF
 * extracts to THESE values is a separate (Textract/vision) accuracy check.
 */
export function njRealExtractionFixture(): BallotExtraction {
  return {
    election_metadata: {
      election_date: "2026-06-02",
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
                name: "Robert Lebovics",
                party: "Republican",
                placeholder_reason: null,
              },
              {
                name: "Justin Murphy",
                party: "Republican",
                placeholder_reason: null,
              },
              {
                name: "Alex Zdan",
                party: "Republican",
                placeholder_reason: null,
              },
              {
                name: "Richard Tabor",
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
                name: "Damon Galdo",
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
              {
                name: "Vonetta Hawkins",
                party: "Democratic",
                placeholder_reason: null,
              },
              {
                name: "Constance Mercedes",
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
                name: "Robert Stone",
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
                name: null,
                party: null,
                placeholder_reason: "no_petition_filed",
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

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
 * Harris-shaped fixture mirroring the production extraction. Each race
 * carries party_context: "Democratic Primary" because the extractor
 * reasonably labels a DEM primary runoff ballot that way (vs. the
 * bake-off ground truth which uses null). Hoisted to module scope so
 * both the runoff-tag block and the Option-B inference block can use it.
 */
function harrisDemRunoffFixture(): BallotExtraction {
  return {
    election_metadata: {
      election_date: "2026-05-26",
      election_type: "primary_runoff",
      jurisdiction: "Harris County, Texas",
      ballot_style: "Precinct 0865-DEM",
    },
    sections: [
      {
        section_name: "State",
        races: [
          {
            office: "Lieutenant Governor",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Vikki Goodwin",
                party: "Democratic",
                placeholder_reason: null,
              },
            ],
          },
          {
            office: "Attorney General",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Nathan Johnson",
                party: "Democratic",
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
            office: "County Judge",
            vote_for_n: 1,
            party_context: "Democratic Primary",
            candidates: [
              {
                name: "Letitia Plummer",
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
      latency_ms: 30000,
      cost_usd: 0.1,
    },
  };
}

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
  it("marks uploaded/extracted ballot rosters as user-supplied and unverified", () => {
    const races = extractionToRaces(harrisDemRunoffFixture(), "DEM-primary");

    expect(races[0].rosterProvenance).toMatchObject({
      sourceKind: "user_uploaded_ballot",
      confidence: "unverified_user_supplied",
      ballotStatus: "user_supplied_unverified",
      selectableAsReplacement: false,
    });
  });

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
    it("for ballotTag null on a multi-party ballot: shows everything (ambiguous lane → fail open)", () => {
      // P0 just-passed-election fix (Option B): when ballotTag is null
      // and the extracted ballot carries MULTIPLE party_contexts, we
      // can't infer a lane — pass all races through rather than show 0.
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
      // 1 judicial retention + 8 NJ Camden = 9. Better to show too much
      // than 0 races (the pre-fix behavior dropped the user into a
      // broken workspace with no contests).
      expect(races).toHaveLength(9);
      const labels = races.map((r) => r.label);
      expect(labels).toContain("Justice Smith retention");
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

    it("counts write_in placeholders as writeInSlots and excludes them from candidates (Fix B)", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "County",
            races: [
              {
                // vote-for-2 with one real candidate + one write-in slot
                office: "County Commissioner",
                vote_for_n: 2,
                party_context: null,
                candidates: [
                  {
                    name: "Stone",
                    party: "Republican",
                    placeholder_reason: null,
                  },
                  { name: null, party: null, placeholder_reason: "write_in" },
                ],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      expect(races[0].candidates).toEqual([
        { name: "Stone", party: "Republican" },
      ]);
      expect(races[0].writeInSlots).toBe(1);
    });

    it("emits no writeInSlots when there are no write_in placeholders", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                office: "U.S. Senate",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Alice", party: "D", placeholder_reason: null },
                ],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, null);
      expect(races[0].candidates).toEqual([{ name: "Alice", party: "D" }]);
      // No write_in placeholder → writeInSlots should be absent or 0
      expect(races[0].writeInSlots ?? 0).toBe(0);
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

  describe("judicial retention section reclassification", () => {
    it("reclassifies a retention office in a 'Judicial' section to 'Judicial Retention'", () => {
      // Root cause: the LLM files retention under "Judicial" section_name.
      // buildSectionRaces must override the section per-race using the office string.
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Judicial",
            races: [
              {
                office:
                  "Shall Judge Paetra Brownlee of the Sixth District Court of Appeal be retained in office?",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                // Normal judicial election in the same section — must stay "Judicial".
                office: "Circuit Judge, 9th Judicial Circuit Group 15",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Alice", party: "", placeholder_reason: null },
                  { name: "Bob", party: "", placeholder_reason: null },
                ],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      expect(races).toHaveLength(2);
      const retentionRace = races.find(
        (r) =>
          r.label.includes("Paetra Brownlee") ||
          r.label.includes("retained in office"),
      );
      expect(retentionRace).toBeDefined();
      expect(retentionRace!.section).toBe("Judicial Retention");

      const judgeRace = races.find((r) => r.label.includes("Circuit Judge"));
      expect(judgeRace).toBeDefined();
      expect(judgeRace!.section).toBe("Judicial");
    });

    it("reclassifies a retention office even when section_name is 'Nonpartisan Judicial Offices'", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Nonpartisan Judicial Offices",
            races: [
              {
                office:
                  "Shall Justice Renatha Francis of the Supreme Court be retained in office?",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      expect(races).toHaveLength(1);
      expect(races[0].section).toBe("Judicial Retention");
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

  /**
   * P0 live-prod bug — Harris County TX. The workspace was showing
   * "Election" and "Ballot style" as the only two races, because
   * (a) the model returned `party_context: "Democratic Primary"` for a
   * DEM runoff ballot (a defensible interpretation), (b) the party
   * filter only mapped DEM-primary / REP-primary / GENERAL, NOT
   * DEM-runoff / REP-runoff / UNSURE — so every real race got dropped
   * and the BallotToolClient races useMemo fell through to the text
   * parser which parsed `Election:` and `Ballot style:` lines emitted
   * by `ballotJsonToText` as races.
   */
  describe("runoff ballotTag variants (P0 Harris County TX bug)", () => {
    it("ballotTag 'DEM-runoff' includes Democratic Primary races", () => {
      const races = extractionToRaces(harrisDemRunoffFixture(), "DEM-runoff");
      expect(races).toHaveLength(3);
      const labels = races.map((r) => r.label);
      // Label normalization collapses "Lieutenant Governor" → "Lt. Governor".
      expect(
        labels.some((l) => /Lt\.?\s*Governor|Lieutenant Governor/i.test(l)),
      ).toBe(true);
      expect(labels).toContain("Attorney General");
      expect(labels).toContain("County Judge");
    });

    it("ballotTag 'DEM-runoff-open' (skipped primary, picking DEM lane) includes Democratic Primary races", () => {
      const races = extractionToRaces(
        harrisDemRunoffFixture(),
        "DEM-runoff-open",
      );
      expect(races).toHaveLength(3);
    });

    it("ballotTag 'REP-runoff' filters out Democratic Primary races (no REP lane on this ballot)", () => {
      const races = extractionToRaces(harrisDemRunoffFixture(), "REP-runoff");
      // All races are DEM-only on this DEM runoff ballot; REP filter drops them.
      expect(races).toHaveLength(0);
    });

    it("ballotTag 'UNSURE' (user can't determine lane) shows BOTH DEM and REP races", () => {
      // Mixed-party fixture so we can prove the UNSURE pass-through.
      const mixed = njCamdenDemRepFixture();
      const races = extractionToRaces(mixed, "UNSURE");
      // 8 total races (4 DEM + 3 REP + 2 universal in the fixture? Actually:
      // 2 DEM Senator/House + 2 REP Senator/House + 1 DEM + 1 REP commish + 2 DEM committee = 8)
      // UNSURE should not filter, so all 8 are visible.
      expect(races).toHaveLength(8);
    });
  });

  /**
   * P0 just-passed-election bug — TX Harris DEM runoff uploaded 2 days
   * AFTER the May 26 runoff. The just-passed runoff is no longer the
   * "upcoming election" (now November general), so PartyGate doesn't
   * fire and `ballotContext` stays null. Pre-fix the party filter
   * dropped every race because ballotTag was null on a partisan ballot.
   *
   * Option B: when ballotContext is null, infer the lane from the
   * extracted ballot's `party_context` values.
   *   - All races share one party_context → single-party ballot → infer
   *     that lane and filter on it.
   *   - All races have null party_context → general election content →
   *     pass everything through.
   *   - Mixed party_contexts → ambiguous (NJ-shape sample) → fail open
   *     (pass all races). Better too much than too little.
   */
  describe("ballotContext null — Option B lane inference from extraction", () => {
    it("TX Harris DEM runoff (2 days past, ballotContext null): infers DEM lane → 3 races visible", () => {
      // The canary test for the live-prod bug. Same Harris fixture as
      // the runoff-tag tests above, but ballotTag is null (because the
      // upcoming election is now the November general and PartyGate
      // didn't fire). Inference should kick in and surface all 3
      // Democratic Primary races.
      const races = extractionToRaces(harrisDemRunoffFixture(), null);
      expect(races).toHaveLength(3);
      const labels = races.map((r) => r.label);
      expect(
        labels.some((l) => /Lt\.?\s*Governor|Lieutenant Governor/i.test(l)),
      ).toBe(true);
      expect(labels).toContain("Attorney General");
      expect(labels).toContain("County Judge");
    });

    it("NJ-shape multi-party ballot (ballotContext null): infers ALL lane → all races visible", () => {
      const races = extractionToRaces(njCamdenDemRepFixture(), null);
      // 4 DEM + 2 REP + 2 DEM county committee = 8.
      expect(races).toHaveLength(8);
      const names = races.flatMap((r) => r.candidates.map((c) => c.name));
      // Both parties appear — fail-open semantics.
      expect(names).toContain("Cory Booker");
      expect(names).toContain("John Bramnick");
    });

    it("general-election ballot (all party_context null, ballotContext null): infers ALL lane → all races visible", () => {
      const generalBallot: BallotExtraction = {
        election_metadata: {
          election_date: "2026-11-03",
          election_type: "general",
          jurisdiction: "Harris County, Texas",
        },
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                office: "U.S. Senator",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Alice", party: "D", placeholder_reason: null },
                  { name: "Bob", party: "R", placeholder_reason: null },
                ],
              },
            ],
          },
          {
            section_name: "State",
            races: [
              {
                office: "Governor",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Carol", party: "D", placeholder_reason: null },
                ],
              },
            ],
          },
        ],
        _meta: {
          extraction_path: "vision" as const,
          pages: 1,
          latency_ms: 0,
          cost_usd: 0,
        },
      };
      const races = extractionToRaces(generalBallot, null);
      expect(races).toHaveLength(2);
    });

    it("single-REP-party ballot (ballotContext null): infers REP lane, no DEM leakage", () => {
      const repOnlyBallot: BallotExtraction = {
        election_metadata: {
          election_date: "2026-05-26",
          election_type: "primary_runoff",
          jurisdiction: "Synthetic County, TX",
        },
        sections: [
          {
            section_name: "State",
            races: [
              {
                office: "Lieutenant Governor",
                vote_for_n: 1,
                party_context: "Republican Primary",
                candidates: [
                  {
                    name: "Greg",
                    party: "Republican",
                    placeholder_reason: null,
                  },
                ],
              },
              {
                office: "Attorney General",
                vote_for_n: 1,
                party_context: "Republican Primary",
                candidates: [
                  {
                    name: "Henry",
                    party: "Republican",
                    placeholder_reason: null,
                  },
                ],
              },
            ],
          },
        ],
        _meta: {
          extraction_path: "vision" as const,
          pages: 1,
          latency_ms: 0,
          cost_usd: 0,
        },
      };
      const races = extractionToRaces(repOnlyBallot, null);
      expect(races).toHaveLength(2);
      const names = races.flatMap((r) => r.candidates.map((c) => c.name));
      expect(names).toContain("Greg");
      expect(names).toContain("Henry");
    });

    it("TX Harris DEM runoff with ballotContext set (DEM-runoff): existing PR #62 filter still works (regression guard)", () => {
      // Regression guard: when ballotContext IS set (PartyGate fired
      // during the runoff window), the existing tag-mapping path
      // (PR #62) must still produce the same 3 races. Option B
      // inference only kicks in when ballotContext is null.
      const races = extractionToRaces(harrisDemRunoffFixture(), "DEM-runoff");
      expect(races).toHaveLength(3);
    });
  });

  /**
   * Defensive guard — the model output COULD include literal "Election"
   * / "Ballot style" / "Date" / "Jurisdiction" office strings (extracted
   * metadata leakage at the prompt layer). The task spec explicitly
   * asks for a metadata-blocklist guard so these never reach the
   * workspace rail even when the model produces them.
   */
  describe("measureBody forwarding (WP3 ballot measure body text)", () => {
    it("forwards measure_text from ExtractRace to race.measureBody for a 'County Questions' section", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "County Questions",
            races: [
              {
                office: "County Question No. 1",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
                measure_text:
                  "Establishing a Rural Area of Critical State Concern in Collier County to protect natural resources and manage growth.",
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      expect(races).toHaveLength(1);
      expect(races[0].measureBody).toBe(
        "Establishing a Rural Area of Critical State Concern in Collier County to protect natural resources and manage growth.",
      );
    });

    it("does not set measureBody when measure_text is absent (candidate race)", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "Federal",
            races: [
              {
                office: "U.S. Senator",
                vote_for_n: 1,
                party_context: null,
                candidates: [
                  { name: "Alice", party: "D", placeholder_reason: null },
                ],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      expect(races).toHaveLength(1);
      expect(races[0].measureBody).toBeUndefined();
    });
  });

  describe("metadata-leakage blocklist (P0 defensive guard)", () => {
    it("filters out races whose office is a generic metadata field (case-insensitive)", () => {
      const ballot: BallotExtraction = {
        election_metadata: META,
        sections: [
          {
            section_name: "State",
            races: [
              {
                office: "Election",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: "Ballot style",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: "ELECTION",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: " Date ",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: "Jurisdiction",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              {
                office: "Precinct",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
              // A real race that must survive.
              {
                office: "U.S. Senator",
                vote_for_n: 1,
                party_context: null,
                candidates: [],
              },
            ],
          },
        ],
        _meta: njCamdenDemRepFixture()._meta,
      };
      const races = extractionToRaces(ballot, "GENERAL");
      expect(races).toHaveLength(1);
      expect(races[0].label).toBe("U.S. Senate");
    });
  });
});

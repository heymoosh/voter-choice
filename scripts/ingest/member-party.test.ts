/**
 * Unit tests for scripts/ingest/member-party.ts — the pure parse/map/plan
 * functions, matching committee-assignments.test.ts's scope. `planUpdates` is
 * the important one: it computes the exact per-row diff the ingest writes, so
 * covering it here is what makes `--dry-run` a trustworthy preview of a
 * production `UPDATE`. The fetch + write loop is validated by a live
 * `--dry-run` against prod, as Part 4's ingest was.
 */
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import {
  candidateIdFromBioguide,
  candidateIdFromFecId,
  partyCodeFromSource,
  flattenLegislators,
  mergeLegislators,
  planUpdates,
  type MemberParty,
} from "./member-party";

describe("id conventions", () => {
  it("mirrors member-stats.ts's federal-<BIOGUIDE> shape", () => {
    expect(candidateIdFromBioguide("K000401")).toBe("federal-K000401");
    expect(candidateIdFromBioguide("k000401")).toBe("federal-K000401");
  });

  it("builds fec-<FECID> ids", () => {
    expect(candidateIdFromFecId("H2CA03157")).toBe("fec-H2CA03157");
  });

  it("strips characters that don't belong in an id", () => {
    expect(candidateIdFromBioguide("K00/04 01")).toBe("federal-K000401");
  });
});

describe("partyCodeFromSource", () => {
  it("maps the source's prose to the FEC codes the column holds", () => {
    expect(partyCodeFromSource("Republican")).toBe("REP");
    expect(partyCodeFromSource("Democrat")).toBe("DEM");
    expect(partyCodeFromSource("Independent")).toBe("IND");
    expect(partyCodeFromSource("Libertarian")).toBe("LIB");
  });

  it("maps state Democratic affiliates to DEM", () => {
    expect(partyCodeFromSource("Democratic-Farmer-Labor")).toBe("DEM");
    expect(partyCodeFromSource("Democratic-NPL")).toBe("DEM");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(partyCodeFromSource("  republican ")).toBe("REP");
  });

  // Precision over recall: guessing a party puts a member in the wrong
  // same-/cross-party bucket, which is worse than leaving the stored value be.
  it("refuses to guess an unrecognized party", () => {
    expect(partyCodeFromSource("Whig")).toBeNull();
    expect(partyCodeFromSource("")).toBeNull();
    expect(partyCodeFromSource(null)).toBeNull();
  });
});

describe("flattenLegislators", () => {
  const doc = yaml.load(`
- id:
    bioguide: K000401
    fec: [H2CA03157, S4CA00999]
  name: {first: Kevin, last: Kiley}
  terms:
    - {type: rep, party: Democrat, start: "2023-01-03"}
    - {type: rep, party: Independent, caucus: Republican, start: "2025-01-03"}
- id:
    bioguide: NOTERMS
  terms: []
- name: {first: No, last: Bioguide}
  terms:
    - {type: rep, party: Republican}
`);

  it("takes party from the member's most recent term", () => {
    const out = flattenLegislators(doc, true);
    const kiley = out.find((m) => m.bioguide === "K000401");
    // The FIRST term says Democrat; the last one is what "their party" means.
    expect(kiley?.party).toBe("IND");
  });

  // The real Kiley shape: elected Independent, caucuses Republican. Both are
  // kept — the card prints the party, the buckets use the caucus.
  it("captures a caucus that differs from the elected party", () => {
    const kiley = flattenLegislators(doc, true).find(
      (m) => m.bioguide === "K000401",
    );
    expect(kiley).toMatchObject({ party: "IND", caucus: "REP" });
  });

  it("leaves caucus null when it merely repeats the party", () => {
    const same = yaml.load(`
- id: {bioguide: X000001}
  terms:
    - {type: rep, party: Republican, caucus: Republican}
`);
    expect(flattenLegislators(same, true)[0].caucus).toBeNull();
  });

  it("collects every FEC id the source lists", () => {
    const kiley = flattenLegislators(doc, true).find(
      (m) => m.bioguide === "K000401",
    );
    expect(kiley?.fecIds).toEqual(["H2CA03157", "S4CA00999"]);
  });

  it("stamps the sitting flag from the file it came from", () => {
    expect(flattenLegislators(doc, true)[0].sitting).toBe(true);
    expect(flattenLegislators(doc, false)[0].sitting).toBe(false);
  });

  it("keeps a member with no usable party as party=null rather than dropping them", () => {
    const noTerms = flattenLegislators(doc, true).find(
      (m) => m.bioguide === "NOTERMS",
    );
    expect(noTerms?.party).toBeNull();
  });

  it("drops entries with no bioguide — nothing to join them to", () => {
    expect(flattenLegislators(doc, true)).toHaveLength(2);
  });

  it("returns [] for a document that isn't a list", () => {
    expect(flattenLegislators({ not: "a list" }, true)).toEqual([]);
    expect(flattenLegislators(null, true)).toEqual([]);
  });
});

describe("mergeLegislators", () => {
  const historical: MemberParty[] = [
    { bioguide: "A1", party: "DEM", caucus: null, fecIds: [], sitting: false },
    { bioguide: "B2", party: "REP", caucus: null, fecIds: [], sitting: false },
  ];
  const current: MemberParty[] = [
    { bioguide: "B2", party: "REP", caucus: null, fecIds: [], sitting: true },
    { bioguide: "C3", party: "REP", caucus: null, fecIds: [], sitting: true },
  ];

  // A member who left and returned must never be flipped to is_incumbent=false.
  it("lets the current file win for a bioguide present in both", () => {
    const merged = mergeLegislators(historical, current);
    expect(merged.find((m) => m.bioguide === "B2")?.sitting).toBe(true);
  });

  it("keeps members unique to either file", () => {
    const merged = mergeLegislators(historical, current);
    expect(merged.map((m) => m.bioguide).sort()).toEqual(["A1", "B2", "C3"]);
  });
});

describe("planUpdates", () => {
  // The real row: elected Independent, caucuses Republican.
  const kiley: MemberParty = {
    bioguide: "K000401",
    party: "IND",
    caucus: "REP",
    fecIds: ["H2CA03157"],
    sitting: true,
  };

  it("writes party and caucus to both the bioguide row and the FEC row", () => {
    const existing = new Map([
      ["federal-K000401", { party: "I", caucus: null, isIncumbent: true }],
      ["fec-H2CA03157", { party: "OTH", caucus: null, isIncumbent: false }],
    ]);
    expect(planUpdates([kiley], existing)).toEqual([
      {
        candidateId: "federal-K000401",
        party: "IND",
        caucus: "REP",
        isIncumbent: true,
      },
      {
        candidateId: "fec-H2CA03157",
        party: "IND",
        caucus: "REP",
        isIncumbent: null,
      },
    ]);
  });

  // fec- rows' is_incumbent means FEC filer incumbency for a specific race —
  // a different concept this source can't speak to, so it stays null (unset).
  it("never writes is_incumbent on a fec- row", () => {
    const existing = new Map([
      ["fec-H2CA03157", { party: "OTH", caucus: null, isIncumbent: false }],
    ]);
    expect(planUpdates([kiley], existing)[0].isIncumbent).toBeNull();
  });

  // A caucus-only change still has to be planned, or the three affected
  // members would never get the field the buckets depend on.
  it("plans an update when only the caucus differs", () => {
    const existing = new Map([
      ["federal-K000401", { party: "IND", caucus: null, isIncumbent: true }],
    ]);
    expect(planUpdates([kiley], existing)).toEqual([
      {
        candidateId: "federal-K000401",
        party: "IND",
        caucus: "REP",
        isIncumbent: true,
      },
    ]);
  });

  it("flips a former member to is_incumbent=false", () => {
    const trone: MemberParty = {
      bioguide: "T000483",
      party: "DEM",
      caucus: null,
      fecIds: [],
      sitting: false,
    };
    const existing = new Map([
      ["federal-T000483", { party: null, caucus: null, isIncumbent: true }],
    ]);
    expect(planUpdates([trone], existing)).toEqual([
      {
        candidateId: "federal-T000483",
        party: "DEM",
        caucus: null,
        isIncumbent: false,
      },
    ]);
  });

  it("plans nothing when the stored values already agree (idempotent)", () => {
    const existing = new Map([
      ["federal-K000401", { party: "IND", caucus: "REP", isIncumbent: true }],
      ["fec-H2CA03157", { party: "IND", caucus: "REP", isIncumbent: false }],
    ]);
    expect(planUpdates([kiley], existing)).toEqual([]);
  });

  it("leaves rows we hold no source party for alone", () => {
    const unknown: MemberParty = {
      bioguide: "X000001",
      party: null,
      caucus: null,
      fecIds: [],
      sitting: true,
    };
    const existing = new Map([
      ["federal-X000001", { party: "OTH", caucus: null, isIncumbent: false }],
    ]);
    expect(planUpdates([unknown], existing)).toEqual([]);
  });

  // A bioguide in neither file, or with no candidates row, is left alone
  // rather than having "former" inferred from mere absence.
  it("skips source members with no candidates row", () => {
    expect(planUpdates([kiley], new Map())).toEqual([]);
  });
});

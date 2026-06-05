import { describe, it, expect } from "vitest";
import {
  reconcileSlot,
  reconcilePageSamples,
  isLargeFormatPage,
  SAMPLE_COUNT,
} from "./extract-sampler";
import type { ExtractCandidate } from "./extract-types";
import type { PageExtraction } from "./extract-stitcher";

const name = (
  n: string,
  extra: Partial<ExtractCandidate> = {},
): ExtractCandidate => ({
  name: n,
  party: null,
  placeholder_reason: null,
  ...extra,
});
const illegible = (): ExtractCandidate => ({
  name: null,
  party: null,
  placeholder_reason: "illegible",
});
const ph = (r: "write_in" | "no_petition_filed"): ExtractCandidate => ({
  name: null,
  party: null,
  placeholder_reason: r,
});

describe("reconcileSlot — abstention rule", () => {
  it("keeps a name all runs agree on (stable read)", () => {
    expect(
      reconcileSlot([name("STONE"), name("STONE"), name("STONE")], 3).name,
    ).toBe("STONE");
  });

  it("recovers a borderline name by strict majority", () => {
    // MERCEDES, MERCEDES, MERCADEL → MERCEDES (2 of 3 confident agree)
    const out = reconcileSlot(
      [name("MERCEDES"), name("MERCEDES"), name("MERCADEL")],
      3,
    );
    expect(out.name).toBe("MERCEDES");
    expect(out.placeholder_reason).toBeNull();
  });

  it("normalizes spelling/punctuation when counting agreement", () => {
    const out = reconcileSlot(
      [name("CAPPELLI, JR."), name("Cappelli, Jr."), name("CAPELLI JR")],
      3,
    );
    // First two normalize equal → majority of 2; keeps an original spelling.
    expect(out.name).toMatch(/CAPPELLI/i);
  });

  it("marks DISAGREEMENT illegible — kills fabrication (3 distinct guesses)", () => {
    const out = reconcileSlot([name("ZEBAR"), name("ZBAR"), name("ZEKIS")], 3);
    expect(out.name).toBeNull();
    expect(out.placeholder_reason).toBe("illegible");
  });

  it("marks a LONE confident read illegible — no fabrication from 1 read", () => {
    // illegible, illegible, LEVINE → only 1 confident read → abstain
    const out = reconcileSlot([illegible(), illegible(), name("LEVINE")], 3);
    expect(out.name).toBeNull();
    expect(out.placeholder_reason).toBe("illegible");
  });

  it("marks a 2-way tie illegible (no strict majority)", () => {
    const out = reconcileSlot([name("GALDO"), name("GALIDO"), illegible()], 3);
    expect(out.name).toBeNull();
    expect(out.placeholder_reason).toBe("illegible");
  });

  it("keeps the name when 2 of 3 agree despite a variant", () => {
    expect(
      reconcileSlot([name("GALDO"), name("GALDO"), name("GALIDO")], 3).name,
    ).toBe("GALDO");
  });

  it("keeps a write-in placeholder when it's the majority", () => {
    expect(
      reconcileSlot([ph("write_in"), ph("write_in"), ph("write_in")], 3),
    ).toMatchObject({ name: null, placeholder_reason: "write_in" });
  });

  it("keeps no_petition_filed when it's the majority", () => {
    const out = reconcileSlot(
      [ph("no_petition_filed"), ph("no_petition_filed"), illegible()],
      3,
    );
    expect(out.placeholder_reason).toBe("no_petition_filed");
  });

  it("a real majority name beats a minority placeholder", () => {
    expect(
      reconcileSlot([name("FOO"), name("FOO"), ph("write_in")], 3).name,
    ).toBe("FOO");
  });
});

describe("isLargeFormatPage", () => {
  it("flags a 17.5×23in trifold (rendered @ scale 2.0)", () => {
    expect(isLargeFormatPage(2520, 3312, 2.0)).toBe(true);
  });
  it("does NOT flag letter or tabloid", () => {
    expect(isLargeFormatPage(1224, 1584, 2.0)).toBe(false); // letter
    expect(isLargeFormatPage(1584, 2448, 2.0)).toBe(false); // tabloid
  });
});

describe("reconcilePageSamples", () => {
  const page = (
    races: PageExtraction["sections"][number]["races"],
  ): PageExtraction => ({
    election_metadata: { jurisdiction: "Camden", election_date: "2026-06-02" },
    sections: [{ section_name: "Federal", races }],
  });
  // A "sample" is a whole-ballot extraction = an array of pages. These ballots
  // are 1 page, so wrap each page in a single-element array.
  const ballot = (races: PageExtraction["sections"][number]["races"]) => [
    page(races),
  ];
  const senate = (
    cands: ExtractCandidate[],
    party: "Democratic Primary" | "Republican Primary",
  ) => ({
    office: "United States Senator",
    vote_for_n: 1,
    party_context: party,
    candidates: cands,
  });

  it("passes a single sample through unchanged", () => {
    const one = ballot([senate([name("BOOKER")], "Democratic Primary")]);
    expect(reconcilePageSamples([one])).toEqual(one);
  });

  it("keeps a race seen by a majority and reconciles its names", () => {
    const samples = [
      ballot([senate([name("BOOKER")], "Democratic Primary")]),
      ballot([senate([name("BOOKER")], "Democratic Primary")]),
      ballot([senate([illegible()], "Democratic Primary")]),
    ];
    const out = reconcilePageSamples(samples);
    expect(out[0].sections[0].races[0].candidates[0].name).toBe("BOOKER");
  });

  it("drops a race only a minority of runs saw", () => {
    const samples = [
      ballot([senate([name("BOOKER")], "Democratic Primary")]),
      ballot([]),
      ballot([]),
    ];
    expect(reconcilePageSamples(samples)[0].sections).toHaveLength(0);
  });

  it("keeps DEM and REP of the same office distinct (party_context in key)", () => {
    const samples = [
      ballot([
        senate([name("BOOKER")], "Democratic Primary"),
        senate([name("STONE"), name("STONE")], "Republican Primary"),
      ]),
      ballot([
        senate([name("BOOKER")], "Democratic Primary"),
        senate([name("STONE"), name("STONE")], "Republican Primary"),
      ]),
    ];
    const races = reconcilePageSamples(samples)[0].sections[0].races;
    expect(races).toHaveLength(2);
    expect(races.map((r) => r.party_context)).toEqual([
      "Democratic Primary",
      "Republican Primary",
    ]);
  });

  it("turns a nondeterministic dense column into honest illegible gaps", () => {
    // The real R-Senate failure: 3 runs, every name disagrees, count wobbles.
    const samples = [
      ballot([
        senate(
          [name("LEVINE"), name("MURPHY"), name("ZDAN"), name("ZEBAR")],
          "Republican Primary",
        ),
      ]),
      ballot([
        senate(
          [
            illegible(),
            name("MURPHY"),
            name("ZDAN"),
            name("ZBAR"),
            name("PATEL"),
          ],
          "Republican Primary",
        ),
      ]),
      ballot([
        senate(
          [name("LEVINSKAS"), name("MURPHY"), name("ZDAN"), name("ZEKIS")],
          "Republican Primary",
        ),
      ]),
    ];
    const cands =
      reconcilePageSamples(samples)[0].sections[0].races[0].candidates;
    const names = cands.map((c) => c.name);
    // MURPHY + ZDAN agree across runs → kept; the unstable slots → illegible (no fabrication).
    expect(names).toContain("MURPHY");
    expect(names).toContain("ZDAN");
    expect(names).not.toContain("LEVINE");
    expect(names).not.toContain("PATEL");
    expect(names).not.toContain("ZEBAR");
  });

  it("low-confidence guard blanks a semi-stable hallucination amid mostly-illegible slots", () => {
    // A fake name reaches a 2/3 majority, but the rest of the column is illegible.
    const samples = [
      ballot([
        senate(
          [illegible(), name("MEISSNER"), illegible(), illegible()],
          "Republican Primary",
        ),
      ]),
      ballot([
        senate(
          [illegible(), name("MEISSNER"), illegible(), illegible()],
          "Republican Primary",
        ),
      ]),
      ballot([
        senate(
          [illegible(), name("LEVINE"), illegible(), illegible()],
          "Republican Primary",
        ),
      ]),
    ];
    const cands =
      reconcilePageSamples(samples)[0].sections[0].races[0].candidates;
    // illegible (3) > names (1) → distrust the lone name; the race shows NO name.
    expect(cands.every((c) => c.name === null)).toBe(true);
    expect(cands.map((c) => c.name)).not.toContain("MEISSNER");
  });

  it("does NOT blank a healthy race that has a single illegible slot", () => {
    const samples = [
      ballot([
        senate(
          [name("CAPPELLI"), name("YOUNG"), name("HAWKINS"), illegible()],
          "Democratic Primary",
        ),
      ]),
      ballot([
        senate(
          [name("CAPPELLI"), name("YOUNG"), name("HAWKINS"), illegible()],
          "Democratic Primary",
        ),
      ]),
      ballot([
        senate(
          [name("CAPPELLI"), name("YOUNG"), name("HAWKINS"), illegible()],
          "Democratic Primary",
        ),
      ]),
    ];
    const names = reconcilePageSamples(
      samples,
    )[0].sections[0].races[0].candidates.map((c) => c.name);
    // names (3) ≥ illegible (1) → keep the confidently-read names.
    expect(names).toContain("CAPPELLI");
    expect(names).toContain("YOUNG");
    expect(names).toContain("HAWKINS");
  });
});

describe("SAMPLE_COUNT", () => {
  it("is an odd number ≥ 3 (so majority is well-defined)", () => {
    expect(SAMPLE_COUNT).toBeGreaterThanOrEqual(3);
    expect(SAMPLE_COUNT % 2).toBe(1);
  });
});

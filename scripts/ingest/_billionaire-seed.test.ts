import { describe, expect, it } from "vitest";
import {
  BILLIONAIRE_SEED,
  buildBillionaireIndex,
  deriveEmployerKeywords,
  matchBillionaire,
  normalizeFecName,
  scoreMatchConfidence,
} from "./_billionaire-seed";

describe("BILLIONAIRE_SEED", () => {
  it("has no duplicate keys", () => {
    const keys = BILLIONAIRE_SEED.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has no (lastName|firstName) index-key collisions across different people", () => {
    // billionaire-donor-match.ts upserts on fecSubId, and a collision would
    // make matchBillionaire() return >1 entry for the same FEC line, which
    // pushes two rows with the same fecSubId into one upsert batch — Postgres
    // rejects that ("cannot affect row a second time") and kills the whole
    // chunk. This turns that into a test failure at seed-edit time instead of
    // a confusing prod crash the next time an entry is added.
    const index = buildBillionaireIndex();
    for (const [key, entries] of index) {
      const uniqueKeys = new Set(entries.map((e) => e.key));
      expect(uniqueKeys.size, `index key "${key}"`).toBe(1);
    }
  });

  it("every entry has at least one name variant with a first name", () => {
    for (const entry of BILLIONAIRE_SEED) {
      expect(entry.nameVariants.length).toBeGreaterThan(0);
      for (const variant of entry.nameVariants) {
        expect(variant.lastName.length).toBeGreaterThan(0);
        expect(variant.firstNames.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("normalizeFecName", () => {
  it("splits FEC 'LAST, FIRST MIDDLE' format", () => {
    expect(normalizeFecName("MUSK, ELON")).toEqual({
      lastName: "MUSK",
      firstToken: "ELON",
    });
    expect(normalizeFecName("GATES, WILLIAM H")).toEqual({
      lastName: "GATES",
      firstToken: "WILLIAM",
    });
  });

  it("strips trailing period/comma from the first token", () => {
    expect(normalizeFecName("PRITZKER, J.B.")).toEqual({
      lastName: "PRITZKER",
      firstToken: "JB",
    });
  });

  it("returns null when unparseable", () => {
    expect(normalizeFecName("NO COMMA HERE")).toBeNull();
    expect(normalizeFecName(", ELON")).toBeNull();
    expect(normalizeFecName("MUSK, ")).toBeNull();
  });
});

describe("buildBillionaireIndex / matchBillionaire", () => {
  const index = buildBillionaireIndex();

  it("matches an exact name from the seed", () => {
    const hits = matchBillionaire(index, "MUSK, ELON");
    expect(hits.map((h) => h.key)).toEqual(["elon-musk"]);
  });

  it("matches an accepted alias first name", () => {
    const hits = matchBillionaire(index, "GATES, WILLIAM H");
    expect(hits.map((h) => h.key)).toEqual(["bill-gates"]);
  });

  it("returns [] for an unrelated name", () => {
    expect(matchBillionaire(index, "DOE, JANE")).toEqual([]);
  });

  it("does not collide same-surname billionaires with different first names", () => {
    expect(matchBillionaire(index, "WALTON, ALICE").map((h) => h.key)).toEqual([
      "alice-walton",
    ]);
    expect(matchBillionaire(index, "WALTON, JIM").map((h) => h.key)).toEqual([
      "jim-walton",
    ]);
  });

  it("matches a compound surname under any filed variant", () => {
    expect(
      matchBillionaire(index, "POWELL JOBS, LAURENE").map((h) => h.key),
    ).toEqual(["laurene-powell-jobs"]);
    expect(matchBillionaire(index, "JOBS, LAURENE").map((h) => h.key)).toEqual([
      "laurene-powell-jobs",
    ]);
  });
});

describe("deriveEmployerKeywords", () => {
  it("drops generic corporate-suffix stopwords", () => {
    expect(deriveEmployerKeywords("Koch Industries")).toEqual(["koch"]);
  });

  it("keeps distinctive multi-word phrases", () => {
    expect(deriveEmployerKeywords("Susquehanna International Group")).toEqual([
      "susquehanna",
    ]);
  });
});

describe("scoreMatchConfidence", () => {
  const musk = BILLIONAIRE_SEED.find((e) => e.key === "elon-musk");
  if (!musk) throw new Error("fixture billionaire missing from seed");

  it("is high when the employer corroborates the source of wealth", () => {
    const result = scoreMatchConfidence(musk, "TESLA INC");
    expect(result.confidence).toBe("high");
  });

  it("is medium when the employer is blank", () => {
    expect(scoreMatchConfidence(musk, "").confidence).toBe("medium");
  });

  it("is medium for known generic placeholders", () => {
    expect(scoreMatchConfidence(musk, "RETIRED").confidence).toBe("medium");
    expect(scoreMatchConfidence(musk, "self-employed").confidence).toBe(
      "medium",
    );
  });

  it("is low when the employer contradicts the source of wealth", () => {
    const result = scoreMatchConfidence(musk, "ACME PLUMBING LLC");
    expect(result.confidence).toBe("low");
  });
});

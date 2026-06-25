/**
 * Tests for scripts/ingest/_retag-selector.ts — the targeted re-tag bill
 * selector. Covers the pure state + keyword filter logic (no DB) and a
 * mocked-DB pass through selectRetagBills.
 */

import { describe, expect, it, vi } from "vitest";
import {
  RETAG_TARGET_STATES,
  buildKeywordList,
  extractStateCode,
  matchesKeywords,
  matchesWordBoundary,
  billMatchesRetagFilter,
  selectRetagBillIds,
  isRetagIssue,
} from "./_retag-selector";

// ---------------------------------------------------------------------------
// extractStateCode
// ---------------------------------------------------------------------------

describe("extractStateCode", () => {
  it("extracts the state from an OCD state jurisdiction", () => {
    expect(
      extractStateCode("ocd-jurisdiction/country:us/state:tx/government"),
    ).toBe("TX");
    expect(
      extractStateCode("ocd-jurisdiction/country:us/state:fl/government"),
    ).toBe("FL");
  });

  it("extracts the state from the legacy state-XX-chamber shape", () => {
    expect(extractStateCode("state-az-house")).toBe("AZ");
    expect(extractStateCode("state-tx-senate")).toBe("TX");
    expect(extractStateCode("state-fl-upper")).toBe("FL");
  });

  it("returns null for federal jurisdictions", () => {
    expect(extractStateCode("federal-house")).toBeNull();
    expect(extractStateCode("federal-senate")).toBeNull();
  });

  it("returns null for empty / unrecognized input", () => {
    expect(extractStateCode(null)).toBeNull();
    expect(extractStateCode("")).toBeNull();
    expect(extractStateCode("garbage")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildKeywordList
// ---------------------------------------------------------------------------

describe("buildKeywordList", () => {
  it("includes plain-language topic terms for reproductive_rights", () => {
    const kw = buildKeywordList("reproductive_rights");
    expect(kw).toContain("abortion");
    expect(kw).toContain("contracept");
    expect(kw).toContain("ivf");
    expect(kw).toContain("title x");
  });

  it("includes pole bill_signals (reused from poleVocabulary)", () => {
    // "fetal-personhood" is a pole signal; lower-cased it appears in the list.
    const kw = buildKeywordList("reproductive_rights");
    expect(kw.some((k) => k.includes("personhood"))).toBe(true);
  });

  it("includes immigration topic terms", () => {
    const kw = buildKeywordList("immigration");
    expect(kw).toContain("asylum");
    expect(kw).toContain("deport");
    expect(kw).toContain("border");
  });

  it("is de-duplicated and all-lowercase", () => {
    const kw = buildKeywordList("immigration");
    expect(new Set(kw).size).toBe(kw.length);
    expect(kw.every((k) => k === k.toLowerCase())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesKeywords
// ---------------------------------------------------------------------------

describe("matchesKeywords", () => {
  it("matches case-insensitively", () => {
    expect(matchesKeywords("An ABORTION ban", ["abortion"])).toBe(true);
  });

  it("returns false for null/empty text", () => {
    expect(matchesKeywords(null, ["abortion"])).toBe(false);
    expect(matchesKeywords("", ["abortion"])).toBe(false);
  });

  it("returns false when no keyword matches", () => {
    expect(matchesKeywords("A highway naming bill", ["abortion"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesWordBoundary — word-boundary regex helper for ambiguous short terms
// ---------------------------------------------------------------------------

describe("matchesWordBoundary", () => {
  const ICE_TERMS = ["ice"] as const;

  // Should MATCH — standalone "ICE" as an acronym / token
  it('matches standalone "ICE" (uppercase)', () => {
    expect(matchesWordBoundary("ICE arrested the suspect", ICE_TERMS)).toBe(
      true,
    );
  });
  it('matches "ICE" at the start of a sentence', () => {
    expect(matchesWordBoundary("Ice agents conducted a raid", ICE_TERMS)).toBe(
      true,
    );
  });
  it('matches "ICE" mid-sentence with surrounding punctuation', () => {
    expect(
      matchesWordBoundary("Cooperation with ICE, the agency", ICE_TERMS),
    ).toBe(true);
  });
  it('matches "Immigration and Customs Enforcement" via "ice" word in phrase', () => {
    // The phrase itself doesn't contain "ice" as a token — separate keyword
    // "immigra" handles that.  Verify "ice" boundary still works in isolation.
    expect(matchesWordBoundary("local ICE enforcement", ICE_TERMS)).toBe(true);
  });

  // Should NOT MATCH — "ice" embedded inside longer words
  it('does NOT match "police"', () => {
    expect(matchesWordBoundary("police enforcement bill", ICE_TERMS)).toBe(
      false,
    );
  });
  it('does NOT match "service"', () => {
    expect(matchesWordBoundary("child protective service act", ICE_TERMS)).toBe(
      false,
    );
  });
  it('does NOT match "license"', () => {
    expect(matchesWordBoundary("driver license requirements", ICE_TERMS)).toBe(
      false,
    );
  });
  it('does NOT match "office"', () => {
    expect(matchesWordBoundary("office of the governor", ICE_TERMS)).toBe(
      false,
    );
  });
  it('does NOT match "device"', () => {
    expect(
      matchesWordBoundary("electronic device regulations", ICE_TERMS),
    ).toBe(false);
  });
  it('does NOT match "notice"', () => {
    expect(matchesWordBoundary("advance notice requirements", ICE_TERMS)).toBe(
      false,
    );
  });

  it("returns false for null/empty text", () => {
    expect(matchesWordBoundary(null, ICE_TERMS)).toBe(false);
    expect(matchesWordBoundary("", ICE_TERMS)).toBe(false);
  });
  it("returns false when terms array is empty", () => {
    expect(matchesWordBoundary("ICE arrested the suspect", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Immigration keyword matching — false-positive / true-positive probe
// ---------------------------------------------------------------------------

describe("immigration keyword matching — false-positive regression", () => {
  // These titles contain "ice" as a substring of another word and must NOT
  // be selected as immigration bills.
  const falsePositiveTitles = [
    "police reform and accountability act",
    "public service commission reform",
    "driver license renewal simplification",
    "office of corrections oversight",
    "electronic device safety standards",
    "advance notice of termination act",
    "price gouging prevention act",
    "justice department practice standards",
  ];
  const kw = buildKeywordList("immigration");

  for (const title of falsePositiveTitles) {
    it(`does NOT match immigration keywords for: "${title}"`, () => {
      // Plain substring matching must not fire on these
      expect(matchesKeywords(title, kw)).toBe(false);
      // Word-boundary matching must not fire either
      expect(matchesWordBoundary(title, ["ice"])).toBe(false);
    });
  }

  // These MUST match immigration keywords.
  it('matches "deportation" via "deport" keyword', () => {
    expect(matchesKeywords("deportation enforcement bill", kw)).toBe(true);
  });
  it('matches "asylum" directly', () => {
    expect(matchesKeywords("asylum seeker protection act", kw)).toBe(true);
  });
  it('matches "Immigration and Customs Enforcement" via "immigra" keyword', () => {
    expect(
      matchesKeywords(
        "cooperation with Immigration and Customs Enforcement",
        kw,
      ),
    ).toBe(true);
  });
  it('matches standalone "ICE" via word-boundary check', () => {
    expect(matchesWordBoundary("ICE cooperation restrictions", ["ice"])).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// billMatchesRetagFilter — the combined state + keyword predicate
// ---------------------------------------------------------------------------

describe("billMatchesRetagFilter", () => {
  it("selects a TX abortion bill for reproductive_rights", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas Heartbeat Act — abortion restrictions",
          summary: "Bans abortion after detection of fetal cardiac activity.",
          jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
        },
        "reproductive_rights",
      ),
    ).toBe(true);
  });

  it("rejects a repro-keyword bill in an OFF-LIST state (CA)", () => {
    // CA is not in the reproductive_rights target list — state filter excludes.
    expect(
      billMatchesRetagFilter(
        {
          title: "California abortion access expansion",
          summary: "Protects clinic access.",
          jurisdiction: "ocd-jurisdiction/country:us/state:ca/government",
        },
        "reproductive_rights",
      ),
    ).toBe(false);
  });

  it("rejects an in-state bill with NO matching keyword", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas highway naming act",
          summary: "Designates a state highway.",
          jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
        },
        "reproductive_rights",
      ),
    ).toBe(false);
  });

  it("rejects a federal bill (state filter requires a state code)", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Federal abortion rights act",
          summary: "Codifies Roe nationally.",
          jurisdiction: "federal-house",
        },
        "reproductive_rights",
      ),
    ).toBe(false);
  });

  it("selects an AZ asylum bill for immigration", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Arizona border enforcement and asylum limits",
          summary: "Increases detention capacity.",
          jurisdiction: "ocd-jurisdiction/country:us/state:az/government",
        },
        "immigration",
      ),
    ).toBe(true);
  });

  it("rejects an immigration bill in an off-list state (OH not in immigration list)", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Ohio sanctuary city restrictions",
          summary: "Limits sanctuary policies.",
          jurisdiction: "ocd-jurisdiction/country:us/state:oh/government",
        },
        "immigration",
      ),
    ).toBe(false);
  });

  // BUG2 regression — legacy "state-XX-chamber" jurisdiction shape must be
  // handled correctly (prod bills use this shape, not the OCD shape).
  it("selects a TX immigration bill with legacy state-XX-chamber jurisdiction", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas border security act",
          summary: "Increases funding for border patrol.",
          jurisdiction: "state-tx-house",
        },
        "immigration",
      ),
    ).toBe(true);
  });

  it("rejects a legacy-shape bill in an off-list state (state-oh-senate)", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Ohio immigration reform act",
          summary: "Regulates undocumented worker documentation.",
          jurisdiction: "state-oh-senate",
        },
        "immigration",
      ),
    ).toBe(false);
  });

  // BUG1 regression — "police"/"service"/"office"/"license" must NOT be
  // selected as immigration bills (false-positive via bare "ice" substring).
  it("does NOT select a TX police reform bill as an immigration bill", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas police accountability and reform act",
          summary: "Establishes standards for police use of force.",
          jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
        },
        "immigration",
      ),
    ).toBe(false);
  });

  it("does NOT select a TX driver license bill as an immigration bill", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas driver license renewal requirements",
          summary: "Simplifies the license renewal process.",
          jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
        },
        "immigration",
      ),
    ).toBe(false);
  });

  // BUG1 — standalone ICE MUST still match after the fix.
  it("selects a TX bill mentioning ICE (the agency) as an immigration bill", () => {
    expect(
      billMatchesRetagFilter(
        {
          title: "Texas ICE cooperation restrictions",
          summary: "Limits local law enforcement cooperation with ICE.",
          jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
        },
        "immigration",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Target-state constants sanity
// ---------------------------------------------------------------------------

describe("RETAG_TARGET_STATES", () => {
  it("matches the card's state lists", () => {
    expect(RETAG_TARGET_STATES.reproductive_rights).toEqual([
      "TX",
      "FL",
      "OH",
      "GA",
      "NC",
      "AZ",
      "WI",
    ]);
    expect(RETAG_TARGET_STATES.immigration).toEqual(["TX", "AZ", "FL"]);
  });
});

describe("isRetagIssue", () => {
  it("accepts the two scoped issues and rejects others", () => {
    expect(isRetagIssue("reproductive_rights")).toBe(true);
    expect(isRetagIssue("immigration")).toBe(true);
    expect(isRetagIssue("healthcare_affordability")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectRetagBillIds — mocked DB
// ---------------------------------------------------------------------------

describe("selectRetagBillIds", () => {
  it("returns the ids from the query rows", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "openstates-tx-1",
            title: "abortion",
            summary: null,
            jurisdiction: "ocd-jurisdiction/country:us/state:tx/government",
          },
          {
            id: "openstates-fl-2",
            title: "clinic",
            summary: null,
            jurisdiction: "ocd-jurisdiction/country:us/state:fl/government",
          },
        ],
      }),
    } as unknown as import("../../db/client").DbClient;

    const ids = await selectRetagBillIds(db, "reproductive_rights");
    expect(ids).toEqual(["openstates-tx-1", "openstates-fl-2"]);
    expect(db.execute).toHaveBeenCalledOnce();
  });
});

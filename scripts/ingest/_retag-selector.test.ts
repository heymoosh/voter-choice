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

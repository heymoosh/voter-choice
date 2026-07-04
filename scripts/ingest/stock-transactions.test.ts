/**
 * scripts/ingest/stock-transactions.test.ts
 *
 * Tests for the STOCK Act PTR ingest's pure parse/normalize/member-match
 * logic. No network, no DB — small inline fixtures shaped like the real
 * House/Senate Stock Watcher datasets (field names verified against a live
 * sample, see header comment in stock-transactions.ts).
 */

import { describe, expect, it } from "vitest";
import {
  parseAmountRange,
  parseSourceDate,
  isValidFilingUrl,
  stripHtml,
  normalizeTicker,
  normalizeTransactionType,
  parseHouseDistrict,
  buildExternalId,
  parseHouseRow,
  parseSenateFilingGroup,
  normalizeMemberNameTokens,
  memberNamesMatch,
  buildHouseCandidateIndex,
  buildSenateCandidateIdSet,
  matchHouseCandidate,
  matchSenateCandidate,
  buildHouseTransactionRows,
  buildSenateTransactionRows,
  type HouseWatcherRow,
  type SenateWatcherFilingGroup,
  type FederalCandidateRow,
} from "./stock-transactions";

// ---------------------------------------------------------------------------
// parseAmountRange
// ---------------------------------------------------------------------------

describe("parseAmountRange", () => {
  it("parses a standard STOCK Act band", () => {
    expect(parseAmountRange("$1,001 - $15,000")).toEqual({
      low: 1001,
      high: 15000,
      label: "$1,001 - $15,000",
    });
  });

  it("parses the open-ended top band with a null high bound", () => {
    expect(parseAmountRange("Over $50,000,000")).toEqual({
      low: 50000000,
      high: null,
      label: "Over $50,000,000",
    });
  });

  it("parses a '+' suffixed open-ended band", () => {
    expect(parseAmountRange("$50,000,000+")).toEqual({
      low: 50000000,
      high: null,
      label: "$50,000,000+",
    });
  });

  it("returns null for malformed amount text — never fabricates a range", () => {
    expect(parseAmountRange("N/A")).toBeNull();
    expect(parseAmountRange("garbled text")).toBeNull();
    expect(parseAmountRange("$abc - $def")).toBeNull();
    expect(parseAmountRange("")).toBeNull();
    expect(parseAmountRange(undefined)).toBeNull();
  });

  it("returns null when high < low (inverted/corrupt range)", () => {
    expect(parseAmountRange("$15,000 - $1,001")).toBeNull();
  });

  it("returns null when a bound exceeds the numeric(14,2) column capacity — never overflows the DB", () => {
    expect(parseAmountRange("$1,001 - $9,999,999,999,999")).toBeNull();
    expect(parseAmountRange("Over $9,999,999,999,999")).toBeNull();
    expect(parseAmountRange("$9,999,999,999,999+")).toBeNull();
  });

  it("accepts a value at the top of the valid range", () => {
    expect(parseAmountRange("$1,001 - $999,999,999,999")).toEqual({
      low: 1001,
      high: 999999999999,
      label: "$1,001 - $999,999,999,999",
    });
  });
});

// ---------------------------------------------------------------------------
// parseSourceDate
// ---------------------------------------------------------------------------

describe("parseSourceDate", () => {
  it("converts MM/DD/YYYY to ISO", () => {
    expect(parseSourceDate("06/16/2026")).toBe("2026-06-16");
  });

  it("pads single-digit month/day", () => {
    expect(parseSourceDate("6/6/2026")).toBe("2026-06-06");
  });

  it("returns null for malformed/missing dates", () => {
    expect(parseSourceDate("not a date")).toBeNull();
    expect(parseSourceDate("13/40/2026")).toBeNull();
    expect(parseSourceDate(undefined)).toBeNull();
    expect(parseSourceDate("")).toBeNull();
  });

  it("returns null for a calendar-invalid date that passes the range check (e.g. Feb 30)", () => {
    expect(parseSourceDate("02/30/2026")).toBeNull();
    expect(parseSourceDate("04/31/2026")).toBeNull();
  });

  it("accepts a valid leap-day date", () => {
    expect(parseSourceDate("02/29/2024")).toBe("2024-02-29");
  });
});

// ---------------------------------------------------------------------------
// stripHtml / normalizeTicker
// ---------------------------------------------------------------------------

describe("stripHtml", () => {
  it("strips embedded HTML tags from a bond asset_description", () => {
    expect(
      stripHtml(
        'LII - Lennox International Inc. 526107AF4 <div class="text-muted"><em>Rate/Coupon:</em> 1.700%<br> <em>Matures:</em> 08/01/27</div>',
      ),
    ).toBe(
      "LII - Lennox International Inc. 526107AF4 Rate/Coupon: 1.700% Matures: 08/01/27",
    );
  });

  it("strips NUL bytes (Postgres text rejects them; seen in scraped House data)", () => {
    expect(stripHtml("Alphabet Inc. - Class A\u0000 Common Stock")).toBe(
      "Alphabet Inc. - Class A Common Stock",
    );
  });

  it("returns null for empty/whitespace-only input", () => {
    expect(stripHtml("   ")).toBeNull();
    expect(stripHtml(undefined)).toBeNull();
  });
});

describe("normalizeTicker", () => {
  it("extracts ticker text from an anchor tag", () => {
    expect(
      normalizeTicker(
        '<a href="https://finance.yahoo.com/q?s=PENN" target="_blank">PENN</a>',
      ),
    ).toBe("PENN");
  });

  it("treats the '--' sentinel (bonds/other non-ticker assets) as null", () => {
    expect(normalizeTicker("--")).toBeNull();
  });

  it("uppercases a plain ticker", () => {
    expect(normalizeTicker("googl")).toBe("GOOGL");
  });
});

// ---------------------------------------------------------------------------
// normalizeTransactionType
// ---------------------------------------------------------------------------

describe("normalizeTransactionType", () => {
  it("collapses House's plain 'Sale' and Senate's 'Sale (Full)' to the same bucket", () => {
    expect(normalizeTransactionType("Sale").type).toBe("sale");
    expect(normalizeTransactionType("Sale (Full)").type).toBe("sale");
  });

  it("keeps partial sales distinct", () => {
    expect(normalizeTransactionType("Sale (Partial)").type).toBe(
      "sale_partial",
    );
  });

  it("maps purchase and exchange", () => {
    expect(normalizeTransactionType("Purchase").type).toBe("purchase");
    expect(normalizeTransactionType("Exchange").type).toBe("exchange");
  });

  it("falls back to 'other' for unrecognized/missing labels, preserving the raw text", () => {
    const result = normalizeTransactionType("Gift");
    expect(result.type).toBe("other");
    expect(result.raw).toBe("Gift");
  });
});

// ---------------------------------------------------------------------------
// parseHouseDistrict
// ---------------------------------------------------------------------------

describe("parseHouseDistrict", () => {
  it("splits state + zero-padded district", () => {
    expect(parseHouseDistrict("TN07")).toEqual({ state: "TN", district: "07" });
  });

  it("handles at-large districts (00)", () => {
    expect(parseHouseDistrict("MT00")).toEqual({ state: "MT", district: "00" });
  });

  it("returns null for malformed district strings", () => {
    expect(parseHouseDistrict("bad-district")).toBeNull();
    expect(parseHouseDistrict(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildExternalId
// ---------------------------------------------------------------------------

describe("buildExternalId", () => {
  it("is deterministic for identical inputs", () => {
    const parts = {
      sourceDataset: "house_stock_watcher",
      filingKey: "federal-VANEPPS",
      ticker: "GOOGL",
      assetDescription: "Alphabet Inc.",
      transactionDate: "2026-06-16",
      rawTransactionType: "Sale",
      amountRangeLabel: "$1,001 - $15,000",
      owner: "Self",
    };
    expect(buildExternalId(parts)).toBe(buildExternalId({ ...parts }));
  });

  it("differs when the ticker differs (distinguishes same-day multi-ticker filings)", () => {
    const base = {
      sourceDataset: "house_stock_watcher",
      filingKey: "federal-VANEPPS",
      assetDescription: "Common Stock",
      transactionDate: "2026-06-16",
      rawTransactionType: "Sale",
      amountRangeLabel: "$1,001 - $15,000",
      owner: "Self",
    };
    expect(buildExternalId({ ...base, ticker: "GOOGL" })).not.toBe(
      buildExternalId({ ...base, ticker: "AMZN" }),
    );
  });
});

// ---------------------------------------------------------------------------
// parseHouseRow
// ---------------------------------------------------------------------------

const GOOD_HOUSE_ROW: HouseWatcherRow = {
  transaction_date: "06/16/2026",
  disclosure_date: "06/17/2026",
  ticker: "GOOGL",
  asset_description: "Alphabet Inc. - Class A Common Stock",
  asset_type: "Stock",
  type: "Sale",
  amount: "$1,001 - $15,000",
  representative: "Matthew Robert Van Epps",
  district: "TN07",
  owner: "Self",
  filing_id: "20034807",
  source_url:
    "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034807.pdf",
};

describe("parseHouseRow", () => {
  it("parses a well-formed row", () => {
    const parsed = parseHouseRow(GOOD_HOUSE_ROW);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      chamber: "house",
      state: "TN",
      district: "07",
      ticker: "GOOGL",
      assetDescription: "Alphabet Inc. - Class A Common Stock",
      transactionType: "sale",
      rawTransactionType: "Sale",
      amountLow: 1001,
      amountHigh: 15000,
      amountRangeLabel: "$1,001 - $15,000",
      transactionDate: "2026-06-16",
      disclosureDate: "2026-06-17",
      owner: "Self",
      filingUrl: GOOD_HOUSE_ROW.source_url,
    });
  });

  it("returns null when the amount range is malformed", () => {
    const bad: HouseWatcherRow = { ...GOOD_HOUSE_ROW, amount: "not a range" };
    expect(parseHouseRow(bad)).toBeNull();
  });

  it("returns null when the district is malformed", () => {
    const bad: HouseWatcherRow = { ...GOOD_HOUSE_ROW, district: "??" };
    expect(parseHouseRow(bad)).toBeNull();
  });

  it("returns null when asset_description or source_url is missing", () => {
    expect(
      parseHouseRow({ ...GOOD_HOUSE_ROW, asset_description: "" }),
    ).toBeNull();
    expect(parseHouseRow({ ...GOOD_HOUSE_ROW, source_url: "" })).toBeNull();
  });

  it("cleans NUL-garbled asset_description instead of dropping the row", () => {
    const garbled: HouseWatcherRow = {
      ...GOOD_HOUSE_ROW,
      asset_description: "Schwab One Account F\u0000\u0000 S\u0000\u0000",
    };
    const parsed = parseHouseRow(garbled);
    expect(parsed).not.toBeNull();
    expect(parsed?.assetDescription).not.toMatch(/\u0000/);
  });

  it("returns null when source_url is not a well-formed http(s) URL", () => {
    expect(
      parseHouseRow({ ...GOOD_HOUSE_ROW, source_url: "not a url" }),
    ).toBeNull();
    expect(
      parseHouseRow({
        ...GOOD_HOUSE_ROW,
        source_url: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(
      parseHouseRow({ ...GOOD_HOUSE_ROW, source_url: "/relative/path.pdf" }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidFilingUrl
// ---------------------------------------------------------------------------

describe("isValidFilingUrl", () => {
  it("accepts well-formed http(s) URLs", () => {
    expect(
      isValidFilingUrl(
        "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034807.pdf",
      ),
    ).toBe(true);
    expect(isValidFilingUrl("http://example.com/filing")).toBe(true);
  });

  it("rejects malformed, non-http(s), relative, or empty values", () => {
    expect(isValidFilingUrl("not a url")).toBe(false);
    expect(isValidFilingUrl("javascript:alert(1)")).toBe(false);
    expect(isValidFilingUrl("/relative/path.pdf")).toBe(false);
    expect(isValidFilingUrl("")).toBe(false);
    expect(isValidFilingUrl(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseSenateFilingGroup
// ---------------------------------------------------------------------------

const GOOD_SENATE_GROUP: SenateWatcherFilingGroup = {
  first_name: "Susan M",
  last_name: "Collins",
  office: "Collins, Susan M. (Senator)",
  ptr_link:
    "https://efdsearch.senate.gov/search/view/ptr/32550a8f-923e-416f-84f3-e19ab4f148b1/",
  date_recieved: "03/10/2021",
  bioguide: "C001035",
  transactions: [
    {
      transaction_date: "02/11/2021",
      owner: "Spouse",
      ticker: "--",
      asset_description:
        'LII - Lennox International Inc. 526107AF4 <div class="text-muted"><em>Rate/Coupon:</em> 1.700%</div>',
      asset_type: "Corporate Bond",
      type: "Purchase",
      amount: "$50,001 - $100,000",
      comment: "--",
    },
    {
      transaction_date: "12/16/2020",
      owner: "Spouse",
      ticker:
        '<a href="https://finance.yahoo.com/q?s=DNKN" target="_blank">DNKN</a>',
      asset_description: "Dunkin' Brands Group, Inc.",
      asset_type: "Stock",
      type: "Sale (Full)",
      amount: "$50,001 - $100,000",
      comment: "--",
    },
  ],
};

describe("parseSenateFilingGroup", () => {
  it("flattens all transactions in a filing, uppercasing the ticker and stripping HTML", () => {
    const parsed = parseSenateFilingGroup(GOOD_SENATE_GROUP);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      chamber: "senate",
      bioguide: "C001035",
      ticker: null, // "--" sentinel
      assetType: "Corporate Bond",
      transactionType: "purchase",
      disclosureDate: "2021-03-10",
      filingUrl: GOOD_SENATE_GROUP.ptr_link,
    });
    expect(parsed[0].assetDescription).not.toMatch(/<[^>]*>/);
    expect(parsed[1]).toMatchObject({
      ticker: "DNKN",
      transactionType: "sale",
    });
  });

  it("returns an empty array when bioguide is missing (cannot match a member)", () => {
    const noBioguide: SenateWatcherFilingGroup = {
      ...GOOD_SENATE_GROUP,
      bioguide: "",
    };
    expect(parseSenateFilingGroup(noBioguide)).toEqual([]);
  });

  it("skips only the malformed transaction within an otherwise-good filing", () => {
    const mixed: SenateWatcherFilingGroup = {
      ...GOOD_SENATE_GROUP,
      transactions: [
        GOOD_SENATE_GROUP.transactions![0],
        {
          ...GOOD_SENATE_GROUP.transactions![1],
          amount: "malformed amount range",
        },
      ],
    };
    const parsed = parseSenateFilingGroup(mixed);
    expect(parsed).toHaveLength(1);
  });

  it("skips a transaction whose ptr_link is not a well-formed http(s) URL", () => {
    const badLink: SenateWatcherFilingGroup = {
      ...GOOD_SENATE_GROUP,
      ptr_link: "not a url",
      transactions: [
        { ...GOOD_SENATE_GROUP.transactions![0], ptr_link: undefined },
      ],
    };
    expect(parseSenateFilingGroup(badLink)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Member matching
// ---------------------------------------------------------------------------

const CANDIDATE_ROWS: FederalCandidateRow[] = [
  {
    id: "federal-V000135",
    fullName: "Rep. Matthew Van Epps [R-TN7]", // GovTrack display format
    jurisdiction: "federal-house",
    state: "TN",
    district: "07",
    isIncumbent: true,
  },
  {
    id: "federal-C001035",
    fullName: "Sen. Susan M. Collins [R-ME]",
    jurisdiction: "federal-senate",
    state: "ME",
    district: null,
    isIncumbent: true,
  },
  // A former House member's row: not incumbent — must NOT be matchable.
  {
    id: "federal-OLD000",
    fullName: "Rep. Old Member [R-TN8]",
    jurisdiction: "federal-house",
    state: "TN",
    district: "08",
    isIncumbent: false,
  },
  // A challenger sharing a name pattern with no district/state resolved yet.
  {
    id: "federal-CHALLENGER1",
    fullName: "Some Challenger",
    jurisdiction: "federal-house",
    state: null,
    district: null,
    isIncumbent: false,
  },
];

// ---------------------------------------------------------------------------
// normalizeMemberNameTokens / memberNamesMatch
// ---------------------------------------------------------------------------

describe("normalizeMemberNameTokens", () => {
  it("strips titles, GovTrack tags, and lowercases", () => {
    expect(normalizeMemberNameTokens("Rep. Matthew Van Epps [R-TN7]")).toEqual([
      "matthew",
      "van",
      "epps",
    ]);
    expect(normalizeMemberNameTokens("Hon. Nancy Pelosi")).toEqual([
      "nancy",
      "pelosi",
    ]);
  });

  it("reorders 'Last, First' (FEC-normalized DB names)", () => {
    expect(normalizeMemberNameTokens("Van Epps, Matthew")).toEqual([
      "matthew",
      "van",
      "epps",
    ]);
  });

  it("drops generational suffixes, incl. as a trailing comma segment", () => {
    expect(normalizeMemberNameTokens("James French Hill Jr.")).toEqual([
      "james",
      "french",
      "hill",
    ]);
    expect(normalizeMemberNameTokens("Hill, James French, Jr.")).toEqual([
      "james",
      "french",
      "hill",
    ]);
  });

  it("strips diacritics and splits hyphenated names", () => {
    expect(normalizeMemberNameTokens("José Vargas-Ramírez")).toEqual([
      "jose",
      "vargas",
      "ramirez",
    ]);
  });

  it("keeps surname particles that collide with title tokens off the front", () => {
    expect(normalizeMemberNameTokens("Maria Del Rio")).toEqual([
      "maria",
      "del",
      "rio",
    ]);
  });
});

describe("memberNamesMatch", () => {
  it("matches across source formats for the same person", () => {
    expect(
      memberNamesMatch(
        "Hon. Matthew Robert Van Epps",
        "Rep. Matthew Van Epps [R-TN7]",
      ),
    ).toBe(true);
    expect(
      memberNamesMatch("Van Epps, Matthew", "Rep. Matthew Van Epps [R-TN7]"),
    ).toBe(true);
  });

  it("tolerates middle initials and leading initials", () => {
    expect(memberNamesMatch("Susan M. Collins", "Susan Collins")).toBe(true);
    expect(memberNamesMatch("K. Michael Conaway", "Michael Conaway")).toBe(
      true,
    );
    expect(memberNamesMatch("M. Van Epps", "Matthew Van Epps")).toBe(true);
  });

  it("tolerates short-form first names (prefix rule)", () => {
    expect(memberNamesMatch("W. Gregory Steube", "Greg Steube")).toBe(true);
  });

  it("rejects a different person on the same surname (family succession)", () => {
    // LA-05 2021: Julia Letlow succeeded Luke Letlow — same seat, same
    // surname, different person. Seat+surname alone must NOT match.
    expect(memberNamesMatch("Luke Letlow", "Rep. Julia Letlow [R-LA5]")).toBe(
      false,
    );
    // Shared surname particles ("Van") must not bridge different first names.
    expect(memberNamesMatch("Luke Van Epps", "Julia Van Epps")).toBe(false);
  });

  it("rejects a bare surname or missing name — never enough to attribute", () => {
    expect(memberNamesMatch("Pelosi", "Rep. Nancy Pelosi [D-CA11]")).toBe(
      false,
    );
    expect(memberNamesMatch(null, "Rep. Nancy Pelosi [D-CA11]")).toBe(false);
    expect(memberNamesMatch("", "Rep. Nancy Pelosi [D-CA11]")).toBe(false);
  });

  it("rejects different surnames outright", () => {
    expect(memberNamesMatch("Nancy Pelosi", "Rep. Kevin Hern [R-OK1]")).toBe(
      false,
    );
  });
});

describe("buildHouseCandidateIndex / matchHouseCandidate", () => {
  const index = buildHouseCandidateIndex(CANDIDATE_ROWS);

  it("matches an incumbent House member by state+district + name cross-check", () => {
    const parsed = parseHouseRow(GOOD_HOUSE_ROW)!;
    expect(matchHouseCandidate(parsed, index)).toBe("federal-V000135");
  });

  it("matches when the source name uses 'Last, First' format", () => {
    const parsed = parseHouseRow({
      ...GOOD_HOUSE_ROW,
      representative: "Van Epps, Matthew Robert",
    })!;
    expect(matchHouseCandidate(parsed, index)).toBe("federal-V000135");
  });

  it("matches when the source name carries a suffix", () => {
    const parsed = parseHouseRow({
      ...GOOD_HOUSE_ROW,
      representative: "Matthew Van Epps Jr.",
    })!;
    expect(matchHouseCandidate(parsed, index)).toBe("federal-V000135");
  });

  it("does NOT match a departed member's filing to the seat's current incumbent", () => {
    // Same seat (TN-07), different person: a historical filing by the
    // previous holder must be unmatched, not attributed to the successor.
    const parsed = parseHouseRow({
      ...GOOD_HOUSE_ROW,
      representative: "Hon. Mark Green",
    })!;
    expect(matchHouseCandidate(parsed, index)).toBeNull();
  });

  it("does NOT match when the source row has no representative name (seat alone is not identity)", () => {
    const parsed = parseHouseRow({
      ...GOOD_HOUSE_ROW,
      representative: undefined,
    })!;
    expect(matchHouseCandidate(parsed, index)).toBeNull();
  });

  it("does not match a non-incumbent (departed member / challenger)", () => {
    expect(index.has("TN|08")).toBe(false); // isIncumbent: false, excluded from index
  });

  it("returns null for an unknown district (unmatched member — INCUMBENTS ONLY)", () => {
    const parsed = parseHouseRow({ ...GOOD_HOUSE_ROW, district: "TX99" })!;
    expect(matchHouseCandidate(parsed, index)).toBeNull();
  });
});

describe("buildSenateCandidateIdSet / matchSenateCandidate", () => {
  const idSet = buildSenateCandidateIdSet(CANDIDATE_ROWS);

  it("matches an incumbent senator by bioguide", () => {
    const parsed = parseSenateFilingGroup(GOOD_SENATE_GROUP)[0];
    expect(matchSenateCandidate(parsed, idSet)).toBe("federal-C001035");
  });

  it("returns null for an unknown bioguide (unmatched member)", () => {
    const parsed = parseSenateFilingGroup({
      ...GOOD_SENATE_GROUP,
      bioguide: "Z999999",
    })[0];
    expect(matchSenateCandidate(parsed, idSet)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildHouseTransactionRows / buildSenateTransactionRows (end-to-end, no DB)
// ---------------------------------------------------------------------------

describe("buildHouseTransactionRows", () => {
  const index = buildHouseCandidateIndex(CANDIDATE_ROWS);

  it("builds one row per matched, well-formed input row and counts the rest", () => {
    const rows: HouseWatcherRow[] = [
      GOOD_HOUSE_ROW, // matches
      { ...GOOD_HOUSE_ROW, amount: "malformed" }, // malformed
      { ...GOOD_HOUSE_ROW, district: "ZZ99" }, // unmatched member (unknown district)
    ];
    const { rows: built, counts } = buildHouseTransactionRows(rows, index);
    expect(built).toHaveLength(1);
    expect(built[0].candidateId).toBe("federal-V000135");
    expect(built[0].amountLow).toBe("1001");
    expect(built[0].amountHigh).toBe("15000");
    expect(counts).toEqual({
      read: 3,
      malformed: 1,
      unmatchedMember: 1,
      built: 1,
    });
  });

  it("never throws on a fully garbage row (fail-open)", () => {
    const garbage = {} as HouseWatcherRow;
    expect(() => buildHouseTransactionRows([garbage], index)).not.toThrow();
    const { rows, counts } = buildHouseTransactionRows([garbage], index);
    expect(rows).toHaveLength(0);
    expect(counts.malformed).toBe(1);
  });
});

describe("buildSenateTransactionRows", () => {
  const idSet = buildSenateCandidateIdSet(CANDIDATE_ROWS);

  it("builds rows for a matched incumbent and skips an unknown-member filing", () => {
    const groups: SenateWatcherFilingGroup[] = [
      GOOD_SENATE_GROUP, // bioguide C001035 → matched
      { ...GOOD_SENATE_GROUP, bioguide: "Z999999" }, // unknown member
    ];
    const { rows, counts } = buildSenateTransactionRows(groups, idSet);
    expect(rows).toHaveLength(2); // both transactions in the matched filing
    expect(rows.every((r) => r.candidateId === "federal-C001035")).toBe(true);
    expect(counts.read).toBe(4); // 2 transactions per group × 2 groups
    expect(counts.unmatchedMember).toBe(2);
    expect(counts.built).toBe(2);
  });

  it("produces a stable, non-null filingUrl on every built row", () => {
    const { rows } = buildSenateTransactionRows([GOOD_SENATE_GROUP], idSet);
    for (const row of rows) {
      expect(row.filingUrl).toBe(GOOD_SENATE_GROUP.ptr_link);
    }
  });
});

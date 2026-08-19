import { describe, expect, it } from "vitest";
import { mapEmployerToBucket } from "./_bucket-mapping";
import {
  SECTOR_BUCKET_LABELS,
  aggregateContribution,
  buildSectorRows,
  isNonEmployerValue,
  isPrincipalCampaignCommittee,
  parseCclLine,
  parseIndivContributionLine,
  resolveSectorBucket,
  shouldKeepContribution,
  type IndivContributionRow,
  type SectorAggregate,
} from "./federal-sectors-bulk";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function cclLine(designation: string): string {
  return [
    "H6NJ03166", // [0] CAND_ID
    "2026", // [1] CAND_ELECTION_YR
    "2026", // [2] FEC_ELECTION_YR
    "C00773456", // [3] CMTE_ID
    "H", // [4] CMTE_TP
    designation, // [5] CMTE_DSGN
    "H6NJ03166C00773456", // [6] LINKAGE_ID
  ].join("|");
}

function indivLine(overrides: Partial<Record<number, string>> = {}): string {
  const fields = [
    "C00773456", // [0] CMTE_ID
    "N", // [1] AMNDT_IND
    "Q1", // [2] RPT_TP
    "P2026", // [3] TRANSACTION_PGI
    "202604159700000001", // [4] IMAGE_NUM
    "15", // [5] TRANSACTION_TP
    "IND", // [6] ENTITY_TP
    "DOE, JANE", // [7] NAME
    "TRENTON", // [8] CITY
    "NJ", // [9] STATE
    "086080000", // [10] ZIP_CODE
    "MERCK & CO", // [11] EMPLOYER
    "SCIENTIST", // [12] OCCUPATION
    "01312026", // [13] TRANSACTION_DT
    "500", // [14] TRANSACTION_AMT
    "", // [15] OTHER_ID
    "TRAN123", // [16] TRAN_ID
    "1234567", // [17] FILE_NUM
    "", // [18] MEMO_CD
    "", // [19] MEMO_TEXT
    "4021620261234567890", // [20] SUB_ID
  ];
  for (const [index, value] of Object.entries(overrides)) {
    fields[Number(index)] = value;
  }
  return fields.join("|");
}

function parsedIndiv(
  overrides: Partial<Record<number, string>> = {},
): IndivContributionRow {
  const row = parseIndivContributionLine(indivLine(overrides));
  if (!row) throw new Error("fixture indiv line failed to parse");
  return row;
}

// ---------------------------------------------------------------------------
// ccl parsing
// ---------------------------------------------------------------------------

describe("parseCclLine", () => {
  it("parses ccl rows by FEC column position", () => {
    expect(parseCclLine(cclLine("P"))).toEqual({
      candidateFecId: "H6NJ03166",
      committeeId: "C00773456",
      committeeDesignation: "P",
    });
  });

  it("returns null when CAND_ID or CMTE_ID is missing", () => {
    expect(parseCclLine("|2026|2026|C00773456|H|P|LINK")).toBeNull();
    expect(parseCclLine("H6NJ03166|2026|2026||H|P|LINK")).toBeNull();
  });

  it("normalizes a missing designation to null", () => {
    expect(parseCclLine(cclLine(""))?.committeeDesignation).toBeNull();
  });
});

describe("isPrincipalCampaignCommittee", () => {
  it('keeps designation "P" and drops "A"/"J"', () => {
    expect(isPrincipalCampaignCommittee(parseCclLine(cclLine("P"))!)).toBe(
      true,
    );
    expect(isPrincipalCampaignCommittee(parseCclLine(cclLine("A"))!)).toBe(
      false,
    );
    expect(isPrincipalCampaignCommittee(parseCclLine(cclLine("J"))!)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// indiv parsing
// ---------------------------------------------------------------------------

describe("parseIndivContributionLine", () => {
  it("parses indiv rows by FEC column position", () => {
    expect(parsedIndiv()).toEqual({
      committeeId: "C00773456",
      transactionType: "15",
      entityType: "IND",
      contributorName: "DOE, JANE",
      city: "TRENTON",
      state: "NJ",
      employer: "MERCK & CO",
      occupation: "SCIENTIST",
      transactionDate: "01312026",
      transactionAmount: 500,
      memoCode: null,
      subId: "4021620261234567890",
    });
  });

  it("captures the memo code and earmark transaction type", () => {
    const row = parsedIndiv({ 5: "15E", 18: "X" });
    expect(row.transactionType).toBe("15E");
    expect(row.memoCode).toBe("X");
  });

  it("returns null when CMTE_ID or TRANSACTION_TP is missing", () => {
    expect(parseIndivContributionLine(indivLine({ 0: "" }))).toBeNull();
    expect(parseIndivContributionLine(indivLine({ 5: "" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Filter truth table
// ---------------------------------------------------------------------------

describe("shouldKeepContribution", () => {
  it('keeps transaction type "15"', () => {
    expect(shouldKeepContribution(parsedIndiv())).toBe(true);
  });

  it('keeps earmarked "15E"', () => {
    expect(shouldKeepContribution(parsedIndiv({ 5: "15E" }))).toBe(true);
  });

  it('skips "15" with MEMO_CD "X" (reattribution/JFC duplicate)', () => {
    expect(shouldKeepContribution(parsedIndiv({ 18: "X" }))).toBe(false);
  });

  it('KEEPS "15E" with MEMO_CD "X" (earmark itemization carries the real donor)', () => {
    expect(shouldKeepContribution(parsedIndiv({ 5: "15E", 18: "X" }))).toBe(
      true,
    );
  });

  it('skips candidate self-contributions ("15C")', () => {
    expect(shouldKeepContribution(parsedIndiv({ 5: "15C" }))).toBe(false);
  });

  it('skips refunds ("22Y") rather than netting them', () => {
    expect(shouldKeepContribution(parsedIndiv({ 5: "22Y" }))).toBe(false);
  });

  it('skips ENTITY_TP "PAC" (recipient-side conduit lump rows)', () => {
    expect(shouldKeepContribution(parsedIndiv({ 6: "PAC" }))).toBe(false);
  });

  it('keeps ENTITY_TP "IND" and blank ENTITY_TP', () => {
    expect(shouldKeepContribution(parsedIndiv({ 6: "IND" }))).toBe(true);
    expect(shouldKeepContribution(parsedIndiv({ 6: "" }))).toBe(true);
  });

  it("skips conduit contributor names", () => {
    expect(shouldKeepContribution(parsedIndiv({ 7: "ACTBLUE" }))).toBe(false);
    expect(
      shouldKeepContribution(parsedIndiv({ 7: "WINRED TECHNICAL SERVICES" })),
    ).toBe(false);
    // \b guard: a person whose surname merely starts with "act" is kept.
    expect(shouldKeepContribution(parsedIndiv({ 7: "ACTON, MARY" }))).toBe(
      true,
    );
  });

  it("skips zero, negative, and non-numeric amounts", () => {
    expect(shouldKeepContribution(parsedIndiv({ 14: "0" }))).toBe(false);
    expect(shouldKeepContribution(parsedIndiv({ 14: "-500" }))).toBe(false);
    expect(shouldKeepContribution(parsedIndiv({ 14: "ABC" }))).toBe(false);
    expect(shouldKeepContribution(parsedIndiv({ 14: "" }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Non-employer placeholders
// ---------------------------------------------------------------------------

describe("isNonEmployerValue", () => {
  it("matches placeholders case-insensitively", () => {
    for (const value of [
      "RETIRED",
      "retired",
      "Not Employed",
      "UNEMPLOYED",
      "NONE",
      "N/A",
      "na",
      "INFORMATION REQUESTED",
      "Information Requested Per Best Efforts",
      "HOMEMAKER", // occupation, not an employer — deliberately skipped
      "Student", // occupation, not an employer — deliberately skipped
      "",
      "   ",
    ]) {
      expect(isNonEmployerValue(value), `expected skip for "${value}"`).toBe(
        true,
      );
    }
  });

  it("does not skip real employers", () => {
    expect(isNonEmployerValue("MERCK & CO")).toBe(false);
  });

  it("keeps SELF-EMPLOYED out of the skip set so the mapper's rule applies", () => {
    // _bucket-mapping classifies self-employment, so these must flow through.
    expect(mapEmployerToBucket("SELF-EMPLOYED")).toBe("Self-funded");
    expect(isNonEmployerValue("SELF-EMPLOYED")).toBe(false);
    expect(isNonEmployerValue("SELF EMPLOYED")).toBe(false);
    expect(isNonEmployerValue("SELF")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sector bucket resolution + label folding
// ---------------------------------------------------------------------------

describe("resolveSectorBucket", () => {
  it("maps a known employer to its sector", () => {
    expect(resolveSectorBucket("MERCK & CO", "SCIENTIST")).toBe(
      "Pharmaceutical & medical device",
    );
  });

  it('falls through to "Other" for unmatched employers', () => {
    expect(resolveSectorBucket("ZYXW WIDGETS LLC")).toBe("Other");
  });

  it('folds non-sector mapper outputs to "Other"', () => {
    // Verified mapper behavior, then the fold.
    expect(mapEmployerToBucket("SELF EMPLOYED")).toBe("Self-funded");
    expect(resolveSectorBucket("SELF EMPLOYED")).toBe("Other");

    expect(mapEmployerToBucket("REPUBLICAN NATIONAL COMMITTEE")).toBe(
      "Party committees",
    );
    expect(resolveSectorBucket("REPUBLICAN NATIONAL COMMITTEE")).toBe("Other");
  });

  it("never exposes funding-mix labels as sector outputs", () => {
    expect(SECTOR_BUCKET_LABELS).toHaveLength(13);
    for (const label of [
      "Small individual donors (under $200)",
      "Large individual donors ($200+)",
      "PACs",
      "Self-funded",
      "Party committees",
      "Other",
    ]) {
      expect(SECTOR_BUCKET_LABELS).not.toContain(label);
    }
  });
});

// ---------------------------------------------------------------------------
// Aggregation + row building
// ---------------------------------------------------------------------------

describe("aggregateContribution / buildSectorRows", () => {
  it("sums amounts and transaction-type counts across rows", () => {
    const aggregates = new Map<string, SectorAggregate>();
    const base = {
      aggregates,
      candidateId: "cand-1",
      cycle: "2026",
      bucket: "Pharmaceutical & medical device",
    } as const;

    aggregateContribution({ ...base, row: parsedIndiv({ 14: "100.5" }) });
    aggregateContribution({
      ...base,
      row: parsedIndiv({ 5: "15E", 14: "49.5" }),
    });
    aggregateContribution({
      ...base,
      bucket: "Other",
      row: parsedIndiv({ 11: "ZYXW WIDGETS LLC", 14: "25" }),
    });

    const rows = buildSectorRows(
      aggregates,
      "https://www.fec.gov/files/bulk-downloads/2026/indiv26.zip",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      candidateId: "cand-1",
      electionCycle: "2026",
      bucketLabel: "Other",
      amountTotal: "25.00",
      source: "fec_bulk",
      sourceUrl: "https://www.fec.gov/files/bulk-downloads/2026/indiv26.zip",
      rawMetadata: {
        generator: "federal-sectors-bulk",
        transactionCount: 1,
        transactionTypes: { "15": 1 },
      },
    });
    expect(rows[1]).toMatchObject({
      bucketLabel: "Pharmaceutical & medical device",
      amountTotal: "150.00",
      rawMetadata: {
        generator: "federal-sectors-bulk",
        transactionCount: 2,
        transactionTypes: { "15": 1, "15E": 1 },
      },
    });
  });

  it("sorts rows by candidate id then bucket label", () => {
    const aggregates = new Map<string, SectorAggregate>();
    const row = parsedIndiv();

    aggregateContribution({
      aggregates,
      row,
      candidateId: "cand-2",
      cycle: "2026",
      bucket: "Technology",
    });
    aggregateContribution({
      aggregates,
      row,
      candidateId: "cand-1",
      cycle: "2026",
      bucket: "Technology",
    });
    aggregateContribution({
      aggregates,
      row,
      candidateId: "cand-1",
      cycle: "2026",
      bucket: "Agriculture",
    });

    const rows = buildSectorRows(aggregates, "https://example.test/indiv.zip");
    expect(rows.map((r) => `${r.candidateId}:${r.bucketLabel}`)).toEqual([
      "cand-1:Agriculture",
      "cand-1:Technology",
      "cand-2:Technology",
    ]);
  });

  it("formats totals with two decimal places", () => {
    const aggregates = new Map<string, SectorAggregate>();
    aggregateContribution({
      aggregates,
      row: parsedIndiv({ 14: "33.333" }),
      candidateId: "cand-1",
      cycle: "2026",
      bucket: "Technology",
    });

    const rows = buildSectorRows(aggregates, "https://example.test/indiv.zip");
    expect(rows[0]?.amountTotal).toBe("33.33");
  });
});

/**
 * scripts/ingest/lobbying-issue-activity.test.ts
 *
 * Tests for the LDA LD-2 ingest's pure parse/normalize logic. No network, no
 * DB — fixtures shaped like the real lda.gov filings API response (field
 * names verified against a live sample, see header comment in
 * lobbying-issue-activity.ts).
 */

import { describe, expect, it } from "vitest";
import {
  isValidFilingUrl,
  normalizeAmount,
  buildLobbyingExternalId,
  parseFiling,
  type LdaFiling,
} from "./lobbying-issue-activity";

// ---------------------------------------------------------------------------
// isValidFilingUrl
// ---------------------------------------------------------------------------

describe("isValidFilingUrl", () => {
  it("accepts an https URL", () => {
    expect(
      isValidFilingUrl("https://lda.gov/filings/public/filing/abc-123/print/"),
    ).toBe(true);
  });

  it("rejects a relative path", () => {
    expect(isValidFilingUrl("/filings/public/filing/abc-123/print/")).toBe(
      false,
    );
  });

  it("rejects a javascript: URL", () => {
    expect(isValidFilingUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects null/undefined/empty", () => {
    expect(isValidFilingUrl(null)).toBe(false);
    expect(isValidFilingUrl(undefined)).toBe(false);
    expect(isValidFilingUrl("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeAmount
// ---------------------------------------------------------------------------

describe("normalizeAmount", () => {
  it("passes through a valid decimal string", () => {
    expect(normalizeAmount("10000.00")).toBe("10000.00");
  });

  it("returns null for missing values", () => {
    expect(normalizeAmount(null)).toBeNull();
    expect(normalizeAmount(undefined)).toBeNull();
    expect(normalizeAmount("")).toBeNull();
  });

  it("returns null for a negative amount", () => {
    expect(normalizeAmount("-500")).toBeNull();
  });

  it("returns null for a non-numeric string", () => {
    expect(normalizeAmount("not-a-number")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildLobbyingExternalId
// ---------------------------------------------------------------------------

describe("buildLobbyingExternalId", () => {
  it("is deterministic for the same inputs", () => {
    const parts = {
      filingUuid: "29c6a500-ec45-493b-908d-e68543e66f83",
      issueAreaCode: "FIN",
      chamber: "senate",
    };
    expect(buildLobbyingExternalId(parts)).toBe(
      buildLobbyingExternalId({ ...parts }),
    );
  });

  it("differs when chamber differs (same filing, same issue area)", () => {
    const base = { filingUuid: "abc", issueAreaCode: "FIN" };
    expect(buildLobbyingExternalId({ ...base, chamber: "senate" })).not.toBe(
      buildLobbyingExternalId({ ...base, chamber: "house" }),
    );
  });
});

// ---------------------------------------------------------------------------
// parseFiling
// ---------------------------------------------------------------------------

const LIVE_SAMPLE_FILING: LdaFiling = {
  filing_uuid: "29c6a500-ec45-493b-908d-e68543e66f83",
  filing_type: "3T",
  filing_year: 2026,
  filing_period: "third_quarter",
  filing_document_url:
    "https://lda.gov/filings/public/filing/29c6a500-ec45-493b-908d-e68543e66f83/print/",
  income: "10000.00",
  expenses: null,
  registrant: { name: "LIBERTY GOVERNMENT AFFAIRS" },
  client: {
    name: "NAVIGATORS GLOBAL LLC ON BEHALF OF GOLDCO",
    general_description: "Precious metals company",
    state: "CA",
  },
  lobbying_activities: [
    {
      general_issue_code: "FIN",
      general_issue_code_display:
        "Financial Institutions/Investments/Securities",
      description:
        "General financial issues related to precious metals with regard to retirement, savings, and investment.",
      government_entities: [
        { id: 2, name: "HOUSE OF REPRESENTATIVES" },
        { id: 1, name: "SENATE" },
      ],
    },
  ],
};

describe("parseFiling", () => {
  it("parses a real lda.gov sample into one row per chamber", () => {
    const { rows, activitiesRead, skippedNoChamber, skippedMalformed } =
      parseFiling(LIVE_SAMPLE_FILING);
    expect(activitiesRead).toBe(1);
    expect(skippedNoChamber).toBe(0);
    expect(skippedMalformed).toBe(0);
    expect(rows).toHaveLength(2);

    const chambers = rows.map((r) => r.chamber).sort();
    expect(chambers).toEqual(["house", "senate"]);

    const senateRow = rows.find((r) => r.chamber === "senate")!;
    expect(senateRow.filingUuid).toBe(LIVE_SAMPLE_FILING.filing_uuid);
    expect(senateRow.issueAreaCode).toBe("FIN");
    expect(senateRow.clientName).toBe(
      "NAVIGATORS GLOBAL LLC ON BEHALF OF GOLDCO",
    );
    expect(senateRow.registrantName).toBe("LIBERTY GOVERNMENT AFFAIRS");
    expect(senateRow.incomeAmount).toBe("10000.00");
    expect(senateRow.expensesAmount).toBeNull();
    expect(senateRow.externalId).toBe(
      "lda_gov::29c6a500-ec45-493b-908d-e68543e66f83::FIN::senate",
    );
    expect(senateRow.sourceDataset).toBe("lda_gov");
  });

  it("skips agency-only government entities (no house/senate)", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      lobbying_activities: [
        {
          general_issue_code: "AGR",
          general_issue_code_display: "Agriculture",
          description: "Farm subsidy issues.",
          government_entities: [{ id: 5, name: "DEPARTMENT OF AGRICULTURE" }],
        },
      ],
    };
    const { rows, skippedNoChamber } = parseFiling(filing);
    expect(rows).toHaveLength(0);
    expect(skippedNoChamber).toBe(1);
  });

  it("skips an activity missing an issue area code", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      lobbying_activities: [
        {
          general_issue_code_display: "Financial",
          government_entities: [{ name: "SENATE" }],
        },
      ],
    };
    const { rows, skippedMalformed } = parseFiling(filing);
    expect(rows).toHaveLength(0);
    expect(skippedMalformed).toBe(1);
  });

  it("returns zero rows for a filing missing filing_uuid", () => {
    const filing: LdaFiling = { ...LIVE_SAMPLE_FILING, filing_uuid: "" };
    const { rows, activitiesRead } = parseFiling(filing);
    expect(rows).toHaveLength(0);
    expect(activitiesRead).toBe(0);
  });

  it("returns zero rows for a filing with an invalid filing_document_url", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      filing_document_url: "not-a-url",
    };
    const { rows } = parseFiling(filing);
    expect(rows).toHaveLength(0);
  });

  it("returns zero rows for a filing missing client name", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      client: { ...LIVE_SAMPLE_FILING.client, name: "" },
    };
    const { rows } = parseFiling(filing);
    expect(rows).toHaveLength(0);
  });

  it("handles no lobbying_activities gracefully", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      lobbying_activities: undefined,
    };
    const { rows, activitiesRead } = parseFiling(filing);
    expect(rows).toHaveLength(0);
    expect(activitiesRead).toBe(0);
  });

  it("dedupes chambers within the same activity via a Set (no duplicate rows for the same entity twice)", () => {
    const filing: LdaFiling = {
      ...LIVE_SAMPLE_FILING,
      lobbying_activities: [
        {
          general_issue_code: "FIN",
          general_issue_code_display: "Financial",
          government_entities: [{ name: "SENATE" }, { name: "SENATE" }],
        },
      ],
    };
    const { rows } = parseFiling(filing);
    expect(rows).toHaveLength(1);
  });
});

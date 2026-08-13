/**
 * scripts/ingest/federal-pac-sponsors.test.ts
 *
 * Tests for the Part 6a ingest's pure functions — sponsor-sector
 * classification (the one inference), evidence URLs, aggregation, and
 * config. The FEC line parsers are federal-issue-pacs exports with their own
 * tests. No network, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  classifySponsorSector,
  evidenceUrlForCommittee,
  isAttributablePacCommittee,
  normalizeConnectedOrg,
  buildContributionRows,
  pairKey,
  resolveConfig,
  SPONSOR_SECTOR_ALLOWLIST,
  type PairAggregate,
} from "./federal-pac-sponsors";

describe("classifySponsorSector", () => {
  it("classifies a corporate PAC by its declared sponsor (CONNECTED_ORG)", () => {
    expect(
      classifySponsorSector({
        name: "PFIZER INC PAC",
        organizationType: "C",
        connectedOrganization: "PFIZER INC",
      }),
    ).toEqual({
      sector: "Pharmaceutical & medical device",
      method: "connected-org-keyword-v1",
    });

    expect(
      classifySponsorSector({
        name: "EMPLOYEES OF CHEVRON POLITICAL ACTION COMMITTEE",
        organizationType: "C",
        connectedOrganization: "CHEVRON CORPORATION",
      }).sector,
    ).toBe("Oil, gas & energy");
  });

  it("never guesses from a corporate committee NAME alone", () => {
    // An ideological PAC with an industry word in its name is NOT that
    // industry — no CONNECTED_ORG, no classification.
    expect(
      classifySponsorSector({
        name: "AMERICANS FOR ENERGY INDEPENDENCE",
        organizationType: null,
        connectedOrganization: null,
      }),
    ).toEqual({ sector: null, method: null });
  });

  it("classifies ORG_TP=L labor committees, name keywords first", () => {
    expect(
      classifySponsorSector({
        name: "INTERNATIONAL ASSOCIATION OF FIRE FIGHTERS PAC",
        organizationType: "L",
        connectedOrganization: null,
      }),
    ).toEqual({
      sector: "Public safety unions",
      method: "org-type-labor-name-keyword-v1",
    });

    // The filing says labor org; with no more specific name signal the
    // generic union bucket is the filing's own claim.
    expect(
      classifySponsorSector({
        name: "SOME GENERIC WORKERS COMMITTEE",
        organizationType: "L",
        connectedOrganization: null,
      }),
    ).toEqual({
      sector: "Trade unions (non-public-safety)",
      method: "org-type-labor-default-v1",
    });
  });

  it("routes labor committees with education names to Education employees", () => {
    expect(
      classifySponsorSector({
        name: "NATIONAL EDUCATION ASSOCIATION FUND",
        organizationType: "L",
        connectedOrganization: null,
      }).sector,
    ).toBe("Education employees");
  });

  it("drops non-industry bucket matches (party committees stay out)", () => {
    // A sponsor string matching the Party-committees rule must NOT classify —
    // party money is already its own funding-mix bucket.
    const result = classifySponsorSector({
      name: "SOME LEADERSHIP FUND",
      organizationType: "C",
      connectedOrganization: "REPUBLICAN PARTY OF TEXAS",
    });
    expect(result.sector).toBeNull();
  });

  it("allowlist contains only industry/union/education buckets", () => {
    expect(SPONSOR_SECTOR_ALLOWLIST.has("PACs" as never)).toBe(false);
    expect(SPONSOR_SECTOR_ALLOWLIST.has("Other" as never)).toBe(false);
    expect(SPONSOR_SECTOR_ALLOWLIST.has("Party committees" as never)).toBe(
      false,
    );
    expect(SPONSOR_SECTOR_ALLOWLIST.has("Self-funded" as never)).toBe(false);
    expect(SPONSOR_SECTOR_ALLOWLIST.has("Technology")).toBe(true);
  });
});

describe("isAttributablePacCommittee", () => {
  // From the 2026-08-13 first dry-run: the top "PAC contributions" were
  // candidate-to-candidate transfers, Victory Fund JFCs, and the NRSC.
  it("excludes candidate committees (a campaign transferring to itself is not PAC support)", () => {
    expect(isAttributablePacCommittee({ type: "H", designation: "P" })).toBe(
      false,
    );
    expect(isAttributablePacCommittee({ type: "S", designation: "A" })).toBe(
      false,
    );
    expect(isAttributablePacCommittee({ type: "P", designation: "P" })).toBe(
      false,
    );
  });

  it("excludes party committees (their own funding-mix bucket already)", () => {
    expect(isAttributablePacCommittee({ type: "Y", designation: "U" })).toBe(
      false,
    );
    expect(isAttributablePacCommittee({ type: "X", designation: null })).toBe(
      false,
    );
  });

  it("excludes joint-fundraising vehicles regardless of type", () => {
    expect(isAttributablePacCommittee({ type: "N", designation: "J" })).toBe(
      false,
    );
  });

  it("keeps corporate, membership, and leadership PACs", () => {
    expect(isAttributablePacCommittee({ type: "Q", designation: "B" })).toBe(
      true,
    );
    expect(isAttributablePacCommittee({ type: "Q", designation: "U" })).toBe(
      true,
    );
    expect(isAttributablePacCommittee({ type: "N", designation: "D" })).toBe(
      true,
    );
  });

  it("refuses committees absent from the master (precision over recall)", () => {
    expect(isAttributablePacCommittee(null)).toBe(false);
  });
});

describe("normalizeConnectedOrg", () => {
  it("nulls the FEC placeholder strings and empties", () => {
    expect(normalizeConnectedOrg("NONE")).toBeNull();
    expect(normalizeConnectedOrg("none")).toBeNull();
    expect(normalizeConnectedOrg("N/A")).toBeNull();
    expect(normalizeConnectedOrg("  ")).toBeNull();
    expect(normalizeConnectedOrg(null)).toBeNull();
  });

  it("keeps and trims real sponsor names", () => {
    expect(normalizeConnectedOrg("  PFIZER INC ")).toBe("PFIZER INC");
  });
});

describe("evidenceUrlForCommittee", () => {
  it("points at the committee's fec.gov page", () => {
    expect(evidenceUrlForCommittee("C00123456")).toBe(
      "https://www.fec.gov/data/committee/C00123456/",
    );
  });
});

describe("buildContributionRows", () => {
  it("builds sorted rows with fixed-2 amounts and drops zero totals", () => {
    const pairs = new Map<string, PairAggregate>([
      [
        pairKey("C2", "cand-b"),
        {
          committeeId: "C2",
          candidateId: "cand-b",
          amountTotal: 1500.5,
          transactionCount: 2,
        },
      ],
      [
        pairKey("C1", "cand-a"),
        {
          committeeId: "C1",
          candidateId: "cand-a",
          amountTotal: 5000,
          transactionCount: 1,
        },
      ],
      [
        pairKey("C3", "cand-a"),
        {
          committeeId: "C3",
          candidateId: "cand-a",
          amountTotal: 0,
          transactionCount: 0,
        },
      ],
    ]);
    const rows = buildContributionRows(
      pairs,
      "2026",
      "https://example.com/pas226.zip",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      committeeId: "C1",
      candidateId: "cand-a",
      electionCycle: "2026",
      amountTotal: "5000.00",
      transactionCount: 1,
      source: "fec_bulk",
    });
    expect(rows[1].amountTotal).toBe("1500.50");
  });
});

describe("resolveConfig", () => {
  it("defaults and flag parsing", () => {
    const config = resolveConfig({} as NodeJS.ProcessEnv, [
      "node",
      "script",
      "--cycle",
      "2026",
      "--dry-run",
      "--limit",
      "1000",
    ]);
    expect(config.cycle).toBe("2026");
    expect(config.dryRun).toBe(true);
    expect(config.limit).toBe(1000);
    expect(config.pas2ZipPath.endsWith("pas226.zip")).toBe(true);
    expect(config.committeeMasterZipPath.endsWith("cm26.zip")).toBe(true);
  });

  it("rejects malformed cycles", () => {
    expect(() =>
      resolveConfig({} as NodeJS.ProcessEnv, ["node", "s", "--cycle", "26"]),
    ).toThrow("Invalid --cycle");
  });
});

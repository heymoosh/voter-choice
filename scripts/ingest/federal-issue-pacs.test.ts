import { describe, expect, it } from "vitest";
import {
  classifyPacCommittee,
  issueFromIssuePacLabel,
  issuePacLabel,
} from "./_pac-issue-mapping";
import {
  aggregateIssuePacContribution,
  buildIssuePacRows,
  isDirectPacContribution,
  parseCommitteeMasterLine,
  parsePas2ContributionLine,
  type IssuePacAggregate,
} from "./federal-issue-pacs";

describe("_pac-issue-mapping", () => {
  it("classifies high-confidence issue PACs by FEC committee ID", () => {
    expect(classifyPacCommittee("C00053553", "Political Victory Fund")).toEqual(
      {
        canonicalIssue: "gun_rights_safety",
        stance: "in_favor",
        ruleName: "nra-pvf-fec-id",
      },
    );
  });

  it("classifies high-confidence issue PACs by committee name", () => {
    expect(
      classifyPacCommittee("C00999999", "Everytown for Gun Safety Action Fund"),
    ).toEqual({
      canonicalIssue: "gun_rights_safety",
      stance: "opposed",
      ruleName: "gun-safety-regulation",
    });
  });

  it("does not force new-axis PACs into unrelated canonical issues", () => {
    expect(classifyPacCommittee("C00799031", "United Democracy Project")).toBe(
      null,
    );
    expect(classifyPacCommittee("C00835959", "Fairshake PAC")).toBe(null);
  });

  it("round-trips issue-PAC bucket labels", () => {
    const label = issuePacLabel("environment_climate");
    expect(label).toBe("Issue-aligned PACs — environment_climate");
    expect(issueFromIssuePacLabel(label)).toBe("environment_climate");
    expect(issueFromIssuePacLabel("PACs")).toBeNull();
  });
});

describe("federal-issue-pacs parsing", () => {
  it("parses committee-master rows by FEC column position", () => {
    const committee = parseCommitteeMasterLine(
      [
        "C00053553",
        "NRA POLITICAL VICTORY FUND",
        "TREASURER",
        "1 MAIN ST",
        "",
        "FAIRFAX",
        "VA",
        "22030",
        "U",
        "Q",
        "",
        "M",
        "M",
        "NATIONAL RIFLE ASSOCIATION",
        "",
      ].join("|"),
    );

    expect(committee).toEqual({
      committeeId: "C00053553",
      name: "NRA POLITICAL VICTORY FUND",
      designation: "U",
      type: "Q",
      organizationType: "M",
      connectedOrganization: "NATIONAL RIFLE ASSOCIATION",
    });
  });

  it("parses PAS2 contribution rows and identifies direct contribution types", () => {
    const row = parsePas2ContributionLine(
      [
        "C00053553",
        "N",
        "Q2",
        "P2026",
        "202604019999999999",
        "24K",
        "COM",
        "NRA POLITICAL VICTORY FUND",
        "FAIRFAX",
        "VA",
        "22030",
        "",
        "",
        "04012026",
        "5000.00",
        "",
        "H6TX01111",
        "A123",
        "1789000",
        "",
        "",
        "401012026000000001",
      ].join("|"),
    );

    expect(row?.committeeId).toBe("C00053553");
    expect(row?.candidateFecId).toBe("H6TX01111");
    expect(row?.transactionAmount).toBe(5000);
    expect(row && isDirectPacContribution(row)).toBe(true);

    const independentExpenditure = parsePas2ContributionLine(
      [
        "C00053553",
        "N",
        "Q2",
        "P2026",
        "202604019999999999",
        "24A",
        "COM",
        "NRA POLITICAL VICTORY FUND",
        "",
        "",
        "",
        "",
        "",
        "04012026",
        "5000.00",
        "",
        "H6TX01111",
      ].join("|"),
    );
    expect(independentExpenditure).not.toBeNull();
    expect(
      independentExpenditure && isDirectPacContribution(independentExpenditure),
    ).toBe(false);
  });
});

describe("federal-issue-pacs aggregation", () => {
  it("aggregates classified issue-PAC dollars into dynamic donor rows", () => {
    const aggregates = new Map<string, IssuePacAggregate>();
    const row = parsePas2ContributionLine(
      [
        "C00053553",
        "N",
        "Q2",
        "P2026",
        "202604019999999999",
        "24K",
        "COM",
        "NRA POLITICAL VICTORY FUND",
        "FAIRFAX",
        "VA",
        "22030",
        "",
        "",
        "04012026",
        "5000.00",
        "",
        "H6TX01111",
        "A123",
        "1789000",
        "",
        "",
        "401012026000000001",
      ].join("|"),
    );
    expect(row).not.toBeNull();
    if (!row) return;

    const classified = aggregateIssuePacContribution({
      aggregates,
      row,
      committee: {
        committeeId: "C00053553",
        name: "NRA POLITICAL VICTORY FUND",
        designation: "U",
        type: "Q",
        organizationType: "M",
        connectedOrganization: "NATIONAL RIFLE ASSOCIATION",
      },
      candidateId: "fec-H6TX01111",
      cycle: "2026",
    });

    expect(classified).toBe(true);
    const rows = buildIssuePacRows(
      aggregates,
      "https://www.fec.gov/files/bulk-downloads/2026/pas226.zip",
    );

    expect(rows).toEqual([
      {
        candidateId: "fec-H6TX01111",
        electionCycle: "2026",
        bucketLabel: "Issue-aligned PACs — gun_rights_safety",
        amountTotal: "5000.00",
        source: "fec_bulk",
        sourceUrl: "https://www.fec.gov/files/bulk-downloads/2026/pas226.zip",
        rawMetadata: {
          issuePac: {
            canonicalIssue: "gun_rights_safety",
            stance: "in_favor",
          },
          transactionCount: 1,
          committees: [
            {
              committeeId: "C00053553",
              name: "NRA POLITICAL VICTORY FUND",
              stance: "in_favor",
              amountTotal: 5000,
              transactionCount: 1,
              ruleNames: ["nra-pvf-fec-id"],
            },
          ],
        },
      },
    ]);
  });

  it("merges conflicting same-issue stances into one mixed bucket", () => {
    const aggregates = new Map<string, IssuePacAggregate>();
    const nraRow = parsePas2ContributionLine(
      [
        "C00053553",
        "N",
        "Q2",
        "P2026",
        "202604019999999999",
        "24K",
        "COM",
        "NRA POLITICAL VICTORY FUND",
        "",
        "",
        "",
        "",
        "",
        "04012026",
        "1000.00",
        "",
        "H6TX01111",
      ].join("|"),
    );
    const everytownRow = parsePas2ContributionLine(
      [
        "C00999999",
        "N",
        "Q2",
        "P2026",
        "202604019999999999",
        "24K",
        "COM",
        "EVERYTOWN FOR GUN SAFETY ACTION FUND",
        "",
        "",
        "",
        "",
        "",
        "04022026",
        "2000.00",
        "",
        "H6TX01111",
      ].join("|"),
    );
    if (!nraRow || !everytownRow) throw new Error("bad fixture");

    aggregateIssuePacContribution({
      aggregates,
      row: nraRow,
      committee: null,
      candidateId: "fec-H6TX01111",
      cycle: "2026",
    });
    aggregateIssuePacContribution({
      aggregates,
      row: everytownRow,
      committee: null,
      candidateId: "fec-H6TX01111",
      cycle: "2026",
    });

    const rows = buildIssuePacRows(aggregates, "https://fec.gov/pas226.zip");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bucketLabel: "Issue-aligned PACs — gun_rights_safety",
      amountTotal: "3000.00",
      rawMetadata: {
        issuePac: {
          canonicalIssue: "gun_rights_safety",
          stance: "mixed",
        },
      },
    });
  });
});

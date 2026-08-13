/**
 * scripts/ingest/federal-independent-expenditures.test.ts
 *
 * Tests for the Part 6b ingest's pure functions — header validation (the
 * guard that stands in for the live format check we could not run), CSV
 * splitting, support/oppose mapping, row parsing, aggregation with amendment
 * supersession and candidate-resolution misses, spender-committee rows, and
 * config. No network, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  IE_COLUMN_ALIASES,
  REQUIRED_IE_COLUMNS,
  SUPPORT_OPPOSE_VALUES,
  aggregateIeRows,
  buildIeRows,
  buildSpenderCommitteeRows,
  createCsvRecordAssembler,
  ieKey,
  independentExpenditureCsvUrl,
  isCompleteCsvRecord,
  parseIeRecord,
  parseSupportOppose,
  resolveConfig,
  resolveIeColumns,
  splitCsvRecord,
  supersededFileNumbers,
  type IeExpenditureRow,
} from "./federal-independent-expenditures";

/** The documented FEC independent-expenditure header, in file order. */
const FEC_IE_HEADER = [
  "cand_id",
  "cand_name",
  "spe_id",
  "spe_nam",
  "ele_type",
  "can_office_state",
  "can_office_dis",
  "can_office",
  "cand_pty_aff",
  "exp_amo",
  "exp_dat",
  "agg_amo",
  "sup_opp",
  "pur",
  "pay",
  "file_num",
  "amndt_ind",
  "tran_id",
  "image_num",
  "receipt_dat",
  "election_type",
  "fec_election_yr",
  "prev_file_num",
  "dissem_dt",
];

function ieRow(overrides: Partial<IeExpenditureRow> = {}): IeExpenditureRow {
  return {
    candidateFecId: "H0TX01000",
    spenderCommitteeId: "C00100001",
    spenderName: "SENATE LEADERSHIP FUND",
    amount: 1000,
    supportOppose: "support",
    fileNumber: null,
    previousFileNumber: null,
    ...overrides,
  };
}

describe("resolveIeColumns", () => {
  it("resolves every field from the documented FEC header", () => {
    const columns = resolveIeColumns(FEC_IE_HEADER);
    expect(columns.candidateFecId).toBe(0);
    expect(columns.spenderCommitteeId).toBe(2);
    expect(columns.spenderName).toBe(3);
    expect(columns.amount).toBe(9);
    expect(columns.supportOppose).toBe(12);
    expect(columns.fileNumber).toBe(15);
    expect(columns.previousFileNumber).toBe(22);
  });

  it("is case/whitespace/BOM tolerant and ignores unknown extra columns", () => {
    const columns = resolveIeColumns([
      "﻿Cand_ID",
      " SPE_ID ",
      "Exp Amo",
      "SUP_OPP",
      "some_new_fec_column",
    ]);
    expect(columns.candidateFecId).toBe(0);
    expect(columns.spenderCommitteeId).toBe(1);
    expect(columns.amount).toBe(2);
    expect(columns.supportOppose).toBe(3);
  });

  it("accepts the browse-UI export's aliases for the same fields", () => {
    const columns = resolveIeColumns([
      "candidate_id",
      "committee_id",
      "expenditure_amount",
      "support_oppose_indicator",
    ]);
    for (const key of REQUIRED_IE_COLUMNS) {
      expect(columns[key]).toBeTypeOf("number");
    }
  });

  it("fails loudly — echoing the header — when a load-bearing column is missing", () => {
    // The failure mode this guards: someone points the ingest at oppexp
    // (OPERATING expenditures), which has no support/oppose flag at all.
    expect(() =>
      resolveIeColumns(["cand_id", "spe_id", "exp_amo", "pur", "pay"]),
    ).toThrow(/missing required column\(s\) sup_opp/u);
    expect(() =>
      resolveIeColumns(["cand_id", "spe_id", "exp_amo", "pur"]),
    ).toThrow(/Header seen: cand_id, spe_id, exp_amo, pur/u);
  });

  it("never guesses positionally when the header is unrecognizable", () => {
    expect(() => resolveIeColumns(["a", "b", "c", "d"])).toThrow(
      /unexpected independent-expenditure header/u,
    );
  });

  it("declares the four columns without which there is no ingest", () => {
    expect([...REQUIRED_IE_COLUMNS]).toEqual([
      "candidateFecId",
      "spenderCommitteeId",
      "amount",
      "supportOppose",
    ]);
    expect(IE_COLUMN_ALIASES.supportOppose[0]).toBe("sup_opp");
  });
});

describe("splitCsvRecord / isCompleteCsvRecord", () => {
  it("keeps commas inside quoted fields (FEC purpose strings carry them)", () => {
    expect(splitCsvRecord('C00100001,"MEDIA BUY, DIGITAL",1500.25,S')).toEqual([
      "C00100001",
      "MEDIA BUY, DIGITAL",
      "1500.25",
      "S",
    ]);
  });

  it("unescapes doubled quotes and strips carriage returns", () => {
    expect(splitCsvRecord('a,"say ""hi""",b\r')).toEqual([
      "a",
      'say "hi"',
      "b",
    ]);
  });

  it("detects records left open by a newline inside a quoted field", () => {
    expect(isCompleteCsvRecord('a,"open field')).toBe(false);
    expect(isCompleteCsvRecord('a,"open field\nclosed",b')).toBe(true);
  });

  it("reassembles a record split across lines by an embedded newline", () => {
    const nextRecord = createCsvRecordAssembler();
    expect(nextRecord("cand_id,pur,exp_amo")).toBe("cand_id,pur,exp_amo");
    expect(nextRecord('H0TX01000,"MEDIA BUY')).toBeNull();
    const record = nextRecord('SECOND LINE",2500');
    expect(record).toBe('H0TX01000,"MEDIA BUY\nSECOND LINE",2500');
    expect(splitCsvRecord(record ?? "")).toEqual([
      "H0TX01000",
      "MEDIA BUY\nSECOND LINE",
      "2500",
    ]);
  });
});

describe("parseSupportOppose", () => {
  it("maps the FEC codes and the spelled-out export values", () => {
    expect(parseSupportOppose("S")).toBe("support");
    expect(parseSupportOppose(" s ")).toBe("support");
    expect(parseSupportOppose("Support")).toBe("support");
    expect(parseSupportOppose("O")).toBe("oppose");
    expect(parseSupportOppose("OPPOSE")).toBe("oppose");
  });

  it("never guesses a direction it does not recognise", () => {
    expect(parseSupportOppose("")).toBeNull();
    expect(parseSupportOppose(null)).toBeNull();
    expect(parseSupportOppose("X")).toBeNull();
    // Not a prefix match: "OTHER" must not become "oppose".
    expect(parseSupportOppose("OTHER")).toBeNull();
    expect(parseSupportOppose("SEE MEMO")).toBeNull();
  });

  it("offers exactly two directions, so nothing can net them", () => {
    expect([...SUPPORT_OPPOSE_VALUES]).toEqual(["support", "oppose"]);
  });
});

describe("parseIeRecord", () => {
  const columns = resolveIeColumns(FEC_IE_HEADER);

  function record(overrides: Record<number, string> = {}): string[] {
    const fields = new Array(FEC_IE_HEADER.length).fill("");
    fields[0] = "h0tx01000"; // cand_id (lowercase on purpose)
    fields[2] = "c00100001"; // spe_id
    fields[3] = "SENATE LEADERSHIP FUND"; // spe_nam
    fields[9] = "25000.50"; // exp_amo
    fields[11] = "900000.00"; // agg_amo — must never be read
    fields[12] = "O"; // sup_opp
    fields[15] = "1700001"; // file_num
    fields[22] = ""; // prev_file_num
    for (const [index, value] of Object.entries(overrides)) {
      fields[Number(index)] = value;
    }
    return fields;
  }

  it("reads the per-filing amount, upcases ids, and keeps the direction", () => {
    expect(parseIeRecord(record(), columns)).toEqual({
      candidateFecId: "H0TX01000",
      spenderCommitteeId: "C00100001",
      spenderName: "SENATE LEADERSHIP FUND",
      amount: 25000.5,
      supportOppose: "oppose",
      fileNumber: "1700001",
      previousFileNumber: null,
    });
  });

  it("reads EXP_AMO, never the running AGG_AMO", () => {
    expect(parseIeRecord(record(), columns)?.amount).toBe(25000.5);
  });

  it("drops rows with no candidate or no spender", () => {
    expect(parseIeRecord(record({ 0: "" }), columns)).toBeNull();
    expect(parseIeRecord(record({ 2: "" }), columns)).toBeNull();
  });

  it("drops rows with an unusable amount rather than netting corrections", () => {
    expect(parseIeRecord(record({ 9: "" }), columns)).toBeNull();
    expect(parseIeRecord(record({ 9: "0" }), columns)).toBeNull();
    expect(parseIeRecord(record({ 9: "-500.00" }), columns)).toBeNull();
    expect(parseIeRecord(record({ 9: "n/a" }), columns)).toBeNull();
  });

  it("tolerates currency formatting in the amount", () => {
    expect(parseIeRecord(record({ 9: "$1,250.75" }), columns)?.amount).toBe(
      1250.75,
    );
  });

  it("drops rows whose support/oppose flag is unrecognised", () => {
    expect(parseIeRecord(record({ 12: "" }), columns)).toBeNull();
    expect(parseIeRecord(record({ 12: "?" }), columns)).toBeNull();
  });
});

describe("aggregateIeRows", () => {
  const candidateByFecId = new Map([
    ["H0TX01000", "fec-H0TX01000"],
    ["S0NY00099", "fec-S0NY00099"],
  ]);

  it("sums per spender × candidate × direction", () => {
    const result = aggregateIeRows(
      [
        ieRow({ amount: 1000 }),
        ieRow({ amount: 250.5 }),
        ieRow({ amount: 900, candidateFecId: "S0NY00099" }),
      ],
      candidateByFecId,
    );
    expect(result.matchedRows).toBe(3);
    expect(
      result.pairs.get(ieKey("C00100001", "fec-H0TX01000", "support")),
    ).toMatchObject({ amountTotal: 1250.5, expenditureCount: 2 });
    expect(
      result.pairs.get(ieKey("C00100001", "fec-S0NY00099", "support"))
        ?.amountTotal,
    ).toBe(900);
  });

  it("NEVER merges support and oppose for the same spender and candidate", () => {
    // The plan's non-negotiable rule: two figures, never one, never netted.
    const result = aggregateIeRows(
      [
        ieRow({ amount: 5000, supportOppose: "support" }),
        ieRow({ amount: 3000, supportOppose: "oppose" }),
      ],
      candidateByFecId,
    );
    expect(result.pairs.size).toBe(2);
    expect(
      result.pairs.get(ieKey("C00100001", "fec-H0TX01000", "support"))
        ?.amountTotal,
    ).toBe(5000);
    expect(
      result.pairs.get(ieKey("C00100001", "fec-H0TX01000", "oppose"))
        ?.amountTotal,
    ).toBe(3000);
    // Nothing anywhere holds 8000 or 2000.
    const amounts = [...result.pairs.values()].map((p) => p.amountTotal);
    expect(amounts).not.toContain(8000);
    expect(amounts).not.toContain(2000);
  });

  it("drops filings superseded by an amendment instead of double-counting", () => {
    const result = aggregateIeRows(
      [
        ieRow({ amount: 1000, fileNumber: "111" }),
        ieRow({ amount: 1500, fileNumber: "222", previousFileNumber: "111" }),
      ],
      candidateByFecId,
    );
    expect(result.supersededRowsDropped).toBe(1);
    expect(
      result.pairs.get(ieKey("C00100001", "fec-H0TX01000", "support"))
        ?.amountTotal,
    ).toBe(1500);
  });

  it("counts and tallies candidate-resolution misses instead of dropping them silently", () => {
    const result = aggregateIeRows(
      [
        ieRow({ amount: 1000, candidateFecId: "H9ZZ99999" }),
        ieRow({ amount: 400, candidateFecId: "H9ZZ99999" }),
        ieRow({ amount: 25, candidateFecId: "H0TX01000" }),
      ],
      candidateByFecId,
    );
    expect(result.matchedRows).toBe(1);
    expect(result.unresolvedCandidateRows).toBe(2);
    expect(result.unresolvedAmountByFecId.get("H9ZZ99999")).toBe(1400);
    expect(result.pairs.size).toBe(1);
  });

  it("collects superseded file numbers from the whole file", () => {
    expect(
      [
        ...supersededFileNumbers([
          ieRow({ previousFileNumber: "111" }),
          ieRow({ previousFileNumber: null }),
          ieRow({ previousFileNumber: "222" }),
        ]),
      ].sort(),
    ).toEqual(["111", "222"]);
  });
});

describe("buildIeRows", () => {
  it("emits one row per direction, fixed-2 amounts, sorted, zero dropped", () => {
    const result = aggregateIeRows(
      [
        ieRow({ amount: 5000, supportOppose: "support" }),
        ieRow({ amount: 3000.5, supportOppose: "oppose" }),
        ieRow({
          amount: 100,
          spenderCommitteeId: "C00000001",
          supportOppose: "oppose",
        }),
      ],
      new Map([["H0TX01000", "fec-H0TX01000"]]),
    );
    const rows = buildIeRows(
      result.pairs,
      "2026",
      "https://example.com/ie.csv",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      committeeId: "C00000001",
      candidateId: "fec-H0TX01000",
      electionCycle: "2026",
      supportOppose: "oppose",
      amountTotal: "100.00",
      expenditureCount: 1,
      source: "fec_bulk",
      sourceUrl: "https://example.com/ie.csv",
    });
    expect(rows[1]).toMatchObject({
      supportOppose: "oppose",
      amountTotal: "3000.50",
    });
    expect(rows[2]).toMatchObject({
      supportOppose: "support",
      amountTotal: "5000.00",
    });
  });
});

describe("buildSpenderCommitteeRows", () => {
  const master = new Map([
    [
      "C00100001",
      {
        committeeId: "C00100001",
        name: "CHEVRON EMPLOYEES PAC",
        designation: "B",
        type: "Q",
        organizationType: "C",
        connectedOrganization: "CHEVRON CORPORATION",
      },
    ],
  ]);

  it("classifies master-known spenders with Part 6a's own inference", () => {
    const { rows, spendersMissingFromMaster } = buildSpenderCommitteeRows({
      spenderIds: ["C00100001"],
      master,
      spenderNames: new Map(),
      cycle: "2026",
    });
    expect(spendersMissingFromMaster).toBe(0);
    expect(rows[0]).toMatchObject({
      committeeId: "C00100001",
      name: "CHEVRON EMPLOYEES PAC",
      connectedOrg: "CHEVRON CORPORATION",
      sector: "Oil, gas & energy",
      classificationMethod: "connected-org-keyword-v1",
      evidenceUrl: "https://www.fec.gov/data/committee/C00100001/",
      lastSeenCycle: "2026",
    });
  });

  it("falls back to the file's own spender name, unclassified, when the master has no entry", () => {
    const { rows, spendersMissingFromMaster } = buildSpenderCommitteeRows({
      spenderIds: ["C00999999"],
      master,
      spenderNames: new Map([["C00999999", "MYSTERY GROWTH FUND"]]),
      cycle: "2026",
    });
    expect(spendersMissingFromMaster).toBe(1);
    expect(rows[0]).toMatchObject({
      committeeId: "C00999999",
      name: "MYSTERY GROWTH FUND",
      connectedOrg: null,
      sector: null,
      classificationMethod: null,
    });
  });

  it("keeps party committees — outside spending is not the funding mix", () => {
    // Part 6a excludes party committees from pac_candidate_contributions to
    // avoid double-representing the "Party committees" funding-mix bucket.
    // No such risk here: IE money is not in the funding mix at all.
    const partyMaster = new Map([
      [
        "C00075820",
        {
          committeeId: "C00075820",
          name: "NRSC",
          designation: "U",
          type: "Y",
          organizationType: null,
          connectedOrganization: null,
        },
      ],
    ]);
    const { rows } = buildSpenderCommitteeRows({
      spenderIds: ["C00075820"],
      master: partyMaster,
      spenderNames: new Map(),
      cycle: "2026",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].committeeType).toBe("Y");
  });
});

describe("resolveConfig", () => {
  it("defaults to the keyless Schedule E bulk CSV for the cycle", () => {
    const config = resolveConfig({} as NodeJS.ProcessEnv, [
      "node",
      "script",
      "--cycle",
      "2026",
      "--dry-run",
      "--limit",
      "500",
    ]);
    expect(config.cycle).toBe("2026");
    expect(config.dryRun).toBe(true);
    expect(config.limit).toBe(500);
    expect(config.ieCsvUrl).toBe(
      "https://www.fec.gov/files/bulk-downloads/independent_expenditure_2026.csv",
    );
    expect(config.ieCsvPath.endsWith("independent_expenditure_2026.csv")).toBe(
      true,
    );
    expect(config.committeeMasterZipPath.endsWith("cm26.zip")).toBe(true);
  });

  it("lets --ie-url / --ie-csv override the unverified default location", () => {
    const config = resolveConfig({} as NodeJS.ProcessEnv, [
      "node",
      "script",
      "--ie-url",
      "https://example.com/schedule-e.csv",
      "--ie-csv",
      "/tmp/schedule-e.csv",
    ]);
    expect(config.ieCsvUrl).toBe("https://example.com/schedule-e.csv");
    expect(config.ieCsvPath).toBe("/tmp/schedule-e.csv");
  });

  it("rejects malformed cycles", () => {
    expect(() =>
      resolveConfig({} as NodeJS.ProcessEnv, ["node", "s", "--cycle", "26"]),
    ).toThrow("Invalid --cycle");
  });

  it("builds the documented per-cycle bulk URL", () => {
    expect(independentExpenditureCsvUrl("2024")).toBe(
      "https://www.fec.gov/files/bulk-downloads/independent_expenditure_2024.csv",
    );
  });
});

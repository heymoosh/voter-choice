import { describe, expect, it, vi } from "vitest";
import {
  candidateSourceUrl,
  createSummaryCollector,
  parseAmount,
  parseArgs,
  parseCoverageEndDate,
  preferredSummaryRow,
  summaryRowFromLine,
  type CandidateSummaryRow,
} from "./federal-candidate-summary-bulk";

// Verbatim lines from the live 2026 all-candidates file (weball26.zip,
// downloaded 2026-08-20). The column contract is the risky part of this
// ingest, so the fixture is real data, not a hand-built row. Both are exactly
// 30 pipe-delimited fields, which is itself part of the contract under test.
const PELTOLA =
  "H2AK01158|PELTOLA, MARY|C|1|DEM|152304.86|0|232791.29|0|83969.49|3483.06|0|0|0|0|0|0|63252.17|AK|00||||||13500|0|02/13/2026|18521.85|0";
const CONSTANT =
  "H2AK00200|CONSTANT, CHRISTOPHER|C|1|DEM|0|0|0|0|0|0|0|0|0|0|0|143180.09|0|AK|00||||||0|0|06/30/2026|0|0";

const map = new Map([
  ["H2AK01158", "cand-peltola"],
  ["H2AK00200", "cand-constant"],
]);

/** Rewrite one field of a fixture line, keeping the field count intact. */
function withField(line: string, index: number, value: string): string {
  const fields = line.split("|");
  fields[index] = value;
  return fields.join("|");
}

function expectRow(result: ReturnType<typeof summaryRowFromLine>) {
  expect(result.kind).toBe("row");
  if (result.kind !== "row") throw new Error("unreachable");
  return result.row;
}

describe("summaryRowFromLine", () => {
  it("reads the money columns and the coverage date off a real filing", () => {
    expect(summaryRowFromLine(PELTOLA, map, "2026")).toEqual({
      kind: "row",
      row: {
        candidateId: "cand-peltola",
        electionCycle: "2026",
        fecCandidateId: "H2AK01158",
        totalReceipts: "152304.86",
        individualTotal: "63252.17",
        pacTotal: "13500.00",
        partyTotal: "0.00",
        candidateSelfTotal: "0.00",
        coverageEndDate: "2026-02-13",
        source: "fec_bulk",
        sourceUrl: "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
      },
    });
  });

  it("records a filed zero as zero — the whole point of the table", () => {
    const row = expectRow(summaryRowFromLine(CONSTANT, map, "2026"));
    expect(row.pacTotal).toBe("0.00");
    expect(row.coverageEndDate).toBe("2026-06-30");
  });

  it("matches FEC ids case-insensitively", () => {
    const lower = PELTOLA.replace("H2AK01158", "h2ak01158");
    expect(expectRow(summaryRowFromLine(lower, map, "2026")).candidateId).toBe(
      "cand-peltola",
    );
  });

  it("reports candidates we do not track as untracked, not malformed", () => {
    // The common case: most of the file is candidates we do not carry. It must
    // never look like evidence that the column contract has broken.
    expect(summaryRowFromLine(PELTOLA, new Map(), "2026")).toEqual({
      kind: "untracked",
    });
  });

  // FINDING 1 — an unreadable money field must SKIP the row, never store 0.00.
  it.each([
    ["blank", ""],
    ["non-numeric", "n/a"],
    ["numeric with trailing junk", "13500junk"],
  ])("skips the row when OTHER_POL_CMTE_CONTRIB is %s", (_label, value) => {
    const result = summaryRowFromLine(
      withField(PELTOLA, 25, value),
      map,
      "2026",
    );
    expect(result.kind).toBe("malformed");
  });

  it("skips the row when any other money field is unreadable", () => {
    for (const column of [5, 11, 17, 26]) {
      const result = summaryRowFromLine(
        withField(PELTOLA, column, "??"),
        map,
        "2026",
      );
      expect(result.kind).toBe("malformed");
    }
  });

  // The column-shift scenario in miniature: a field inserted ahead of index 25
  // makes every money figure garbage while CAND_ID still matches.
  it("rejects a line whose field count is not 30", () => {
    const shifted = PELTOLA.split("|");
    shifted.splice(25, 0, "");
    expect(summaryRowFromLine(shifted.join("|"), map, "2026")).toEqual({
      kind: "malformed",
      reason: "expected 30 fields, got 31",
    });
    expect(
      summaryRowFromLine("H2AK01158|PELTOLA, MARY|C", map, "2026").kind,
    ).toBe("malformed");
    expect(summaryRowFromLine("|NO ID|C", map, "2026").kind).toBe("malformed");
  });

  it("rejects a full-width line with a blank CAND_ID", () => {
    expect(summaryRowFromLine(withField(PELTOLA, 0, ""), map, "2026")).toEqual({
      kind: "malformed",
      reason: "blank CAND_ID",
    });
  });

  // FINDING 2 — a summary with no coverage date is not a filing.
  it("skips a row with no coverage date rather than storing an undated $0", () => {
    // A candidate registered for the cycle who filed no report: all zeros and
    // a blank CVG_END_DT. Stored, this would be an undated "$0 PAC" claim.
    const registeredNotFiled = withField(CONSTANT, 27, "");
    expect(summaryRowFromLine(registeredNotFiled, map, "2026")).toEqual({
      kind: "no-coverage-date",
    });
  });

  it("counts a blank coverage date separately from a malformed one", () => {
    // A blank date is an expected state on a healthy file, so it must not feed
    // the column-shift thresholds; garbage in the same column must.
    expect(
      summaryRowFromLine(withField(CONSTANT, 27, ""), map, "2026").kind,
    ).toBe("no-coverage-date");
    expect(
      summaryRowFromLine(withField(CONSTANT, 27, "13/45/2026"), map, "2026")
        .kind,
    ).toBe("malformed");
  });
});

describe("parseAmount", () => {
  it("reads plain decimals, including a filed zero", () => {
    expect(parseAmount("13500")).toBe("13500.00");
    expect(parseAmount("0")).toBe("0.00");
    expect(parseAmount(" 152304.86 ")).toBe("152304.86");
    expect(parseAmount("-500.25")).toBe("-500.25");
  });

  it("returns null for anything it cannot read, INCLUDING blank", () => {
    // Blank is the load-bearing case: after a column shift, index 25 lands on
    // the usually-empty GEN_ELECTION_PRECENT. "Blank means zero" would turn
    // that into a filed $0 for every candidate in the file.
    for (const bad of ["", "   ", undefined, "n/a", "13500junk", "1,350"]) {
      expect(parseAmount(bad)).toBeNull();
    }
  });
});

describe("parseCoverageEndDate", () => {
  it("converts MM/DD/YYYY to an ISO date", () => {
    expect(parseCoverageEndDate("06/30/2026")).toBe("2026-06-30");
  });

  it("drops anything it cannot parse rather than guessing a date", () => {
    for (const bad of [
      "",
      "2026-06-30",
      "6/30/2026",
      "not a date",
      undefined,
    ]) {
      expect(parseCoverageEndDate(bad)).toBeNull();
    }
  });

  // FINDING 5 — shape-valid but impossible days used to become "2026-13-45",
  // which Postgres rejects, failing the whole 100-row chunk.
  it("rejects impossible calendar days, not just the wrong shape", () => {
    expect(parseCoverageEndDate("13/45/2026")).toBeNull();
    expect(parseCoverageEndDate("02/31/2026")).toBeNull();
    expect(parseCoverageEndDate("00/10/2026")).toBeNull();
    expect(parseCoverageEndDate("02/29/2024")).toBe("2024-02-29"); // leap year
  });
});

// FINDING 3 — two file lines can resolve to one candidate.
describe("preferredSummaryRow", () => {
  const base: CandidateSummaryRow = {
    candidateId: "cand-x",
    electionCycle: "2026",
    fecCandidateId: "H2AK01158",
    totalReceipts: "100.00",
    individualTotal: "0.00",
    pacTotal: "0.00",
    partyTotal: "0.00",
    candidateSelfTotal: "0.00",
    coverageEndDate: "2024-12-31",
    source: "fec_bulk",
    sourceUrl: "https://example.test",
  };

  it("prefers the later coverage date whichever order it sees them in", () => {
    const dormantHouse = { ...base, coverageEndDate: "2024-12-31" };
    const liveSenate = {
      ...base,
      fecCandidateId: "S6AK00123",
      coverageEndDate: "2026-06-30",
    };
    expect(preferredSummaryRow(dormantHouse, liveSenate)).toBe(liveSenate);
    expect(preferredSummaryRow(liveSenate, dormantHouse)).toBe(liveSenate);
  });

  it("breaks an exact date tie on the data, not on file order", () => {
    const small = { ...base, fecCandidateId: "H2AK00001" };
    const large = {
      ...base,
      fecCandidateId: "S6AK00002",
      totalReceipts: "990.00",
    };
    expect(preferredSummaryRow(small, large)).toBe(large);
    expect(preferredSummaryRow(large, small)).toBe(large);
  });
});

describe("createSummaryCollector", () => {
  const unlimited = { cycle: "2026", limit: null };

  it("dedupes two lines for one candidate and keeps the later filing", () => {
    // Both ids resolve to the same candidate — a House member running for
    // Senate whose source_id still holds the House id.
    const dualMap = new Map([
      ["H2AK01158", "cand-dual"],
      ["H2AK00200", "cand-dual"],
    ]);
    const collector = createSummaryCollector(dualMap, unlimited);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    collector.onLine(PELTOLA); // CVG_END_DT 02/13/2026
    collector.onLine(CONSTANT); // CVG_END_DT 06/30/2026 — later
    const { rows, counts } = collector.finish();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.fecCandidateId).toBe("H2AK00200");
    expect(counts.duplicates).toBe(1);
    vi.restoreAllMocks();
  });

  it("resolves a collision the same way whatever order the file lists them", () => {
    const dualMap = new Map([
      ["H2AK01158", "cand-dual"],
      ["H2AK00200", "cand-dual"],
    ]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const forward = createSummaryCollector(dualMap, unlimited);
    forward.onLine(PELTOLA);
    forward.onLine(CONSTANT);
    const reverse = createSummaryCollector(dualMap, unlimited);
    reverse.onLine(CONSTANT);
    reverse.onLine(PELTOLA);
    expect(forward.finish().rows).toEqual(reverse.finish().rows);
    vi.restoreAllMocks();
  });

  it("counts blank coverage dates without tripping the malformed guard", () => {
    // 200 registered-but-never-filed candidates on an otherwise healthy file:
    // far past both thresholds if they counted as malformed, yet the run must
    // succeed and simply store nothing for them.
    const bigMap = new Map<string, string>([["H2AK01158", "cand-peltola"]]);
    for (let i = 0; i < 200; i += 1) {
      bigMap.set(`H2AK${String(i).padStart(5, "0")}`, `cand-${i}`);
    }
    const collector = createSummaryCollector(bigMap, unlimited);
    for (let i = 0; i < 200; i += 1) {
      const id = `H2AK${String(i).padStart(5, "0")}`;
      collector.onLine(withField(withField(CONSTANT, 0, id), 27, ""));
    }
    collector.onLine(PELTOLA); // one real filing, so matched > 0
    const { rows, counts } = collector.finish();

    expect(counts.skippedNoCoverage).toBe(200);
    expect(counts.malformed).toBe(0);
    expect(counts.matched).toBe(1);
    expect(rows).toHaveLength(1);
  });

  it("throws when malformed lines look like a moved column", () => {
    const collector = createSummaryCollector(map, unlimited);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // A column inserted ahead of index 25: CAND_ID still matches, every line
    // is now 31 fields. Every line malformed clears both thresholds.
    const shifted = PELTOLA.split("|");
    shifted.splice(25, 0, "");
    for (let i = 0; i < 100; i += 1) collector.onLine(shifted.join("|"));
    expect(() => collector.finish()).toThrow(/no longer matches/u);
    vi.restoreAllMocks();
  });

  it("tolerates a handful of junk lines without blocking the good ones", () => {
    const collector = createSummaryCollector(map, unlimited);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 10; i += 1) collector.onLine("junk|line");
    for (let i = 0; i < 1000; i += 1) collector.onLine(PELTOLA);
    const { rows, counts } = collector.finish();

    expect(counts.malformed).toBe(10); // under the absolute floor of 25
    expect(rows).toHaveLength(1); // 1000 identical lines, one candidate
    expect(counts.matched).toBe(1000);
    vi.restoreAllMocks();
  });

  it("does not abort on a high malformed RATE when the count is tiny", () => {
    const collector = createSummaryCollector(map, unlimited);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    collector.onLine("junk|line"); // 1 of 2 lines malformed — 50%
    collector.onLine(PELTOLA);
    expect(() => collector.finish()).not.toThrow();
    vi.restoreAllMocks();
  });

  it("throws when nothing matched — an empty run is not a success", () => {
    const collector = createSummaryCollector(map, unlimited);
    for (let i = 0; i < 50; i += 1) {
      collector.onLine(withField(PELTOLA, 0, "H9ZZ99999"));
    }
    expect(() => collector.finish()).toThrow(/refusing to treat an empty run/u);
  });

  it("skips the matched===0 guard under --limit", () => {
    // weball is sorted by candidate id, so reading only the first few lines
    // can legitimately match no candidate we track.
    const collector = createSummaryCollector(map, { cycle: "2026", limit: 2 });
    collector.onLine(withField(PELTOLA, 0, "H9ZZ99999"));
    collector.onLine(withField(PELTOLA, 0, "H9ZZ99998"));
    expect(collector.onLine(PELTOLA)).toBe(false); // limit reached, stop
    const { rows, counts } = collector.finish();
    expect(rows).toHaveLength(0);
    expect(counts.fileRows).toBe(2); // the third line was never read
  });

  it("counts filed zeros and positives off the deduped rows", () => {
    const collector = createSummaryCollector(map, unlimited);
    collector.onLine(PELTOLA); // pac_total 13500
    collector.onLine(CONSTANT); // pac_total 0
    const { counts } = collector.finish();
    expect(counts.positivePac).toBe(1);
    expect(counts.zeroPac).toBe(1);
  });
});

describe("parseArgs", () => {
  it("defaults to the 2026 cycle and derives the zip name from it", () => {
    const config = parseArgs([], {});
    expect(config.cycle).toBe("2026");
    expect(config.weballZipPath).toMatch(/weball26\.zip$/u);
    expect(config.dryRun).toBe(false);
  });

  it("honours --cycle, --dry-run and --limit", () => {
    const config = parseArgs(
      ["--cycle", "2024", "--dry-run", "--limit", "10"],
      {},
    );
    expect(config.cycle).toBe("2024");
    expect(config.weballZipPath).toMatch(/weball24\.zip$/u);
    expect(config.dryRun).toBe(true);
    expect(config.limit).toBe(10);
  });

  // FINDING 4 — "2026-27" would have stored rows no read path can find.
  it("rejects a --cycle that is not a four-digit year", () => {
    for (const bad of ["2026-27", "26", "twenty-26", "2026.0"]) {
      expect(() => parseArgs(["--cycle", bad], {})).toThrow(/Invalid --cycle/u);
    }
  });
});

describe("candidateSourceUrl", () => {
  it("links the FEC page for the cycle the figure came from", () => {
    expect(candidateSourceUrl("H2AK01158", "2026")).toBe(
      "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
    );
  });
});

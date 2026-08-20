import { describe, expect, it } from "vitest";
import {
  candidateSourceUrl,
  parseArgs,
  parseCoverageEndDate,
  summaryRowFromLine,
} from "./federal-candidate-summary-bulk";

// Verbatim lines from the live 2026 all-candidates file (weball26.zip,
// downloaded 2026-08-20). The column contract is the risky part of this
// ingest, so the fixture is real data, not a hand-built row.
const PELTOLA =
  "H2AK01158|PELTOLA, MARY|C|1|DEM|152304.86|0|232791.29|0|83969.49|3483.06|0|0|0|0|0|0|63252.17|AK|00||||||13500|0|02/13/2026|18521.85|0";
const CONSTANT =
  "H2AK00200|CONSTANT, CHRISTOPHER|C|1|DEM|0|0|0|0|0|0|0|0|0|0|0|143180.09|0|AK|00||||||0|0|06/30/2026|0|0";

const map = new Map([
  ["H2AK01158", "cand-peltola"],
  ["H2AK00200", "cand-constant"],
]);

describe("summaryRowFromLine", () => {
  it("reads the money columns and the coverage date off a real filing", () => {
    expect(summaryRowFromLine(PELTOLA, map, "2026")).toEqual({
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
    });
  });

  it("records a filed zero as zero — the whole point of the table", () => {
    const row = summaryRowFromLine(CONSTANT, map, "2026");
    expect(row?.pacTotal).toBe("0.00");
    expect(row?.coverageEndDate).toBe("2026-06-30");
  });

  it("skips candidates we do not track rather than inventing rows", () => {
    expect(summaryRowFromLine(PELTOLA, new Map(), "2026")).toBeNull();
    expect(summaryRowFromLine("|NO ID|C", map, "2026")).toBeNull();
  });

  it("matches FEC ids case-insensitively", () => {
    const lower = PELTOLA.replace("H2AK01158", "h2ak01158");
    expect(summaryRowFromLine(lower, map, "2026")?.candidateId).toBe(
      "cand-peltola",
    );
  });

  it("treats a blank money field as zero, not as a broken row", () => {
    const blanked = PELTOLA.split("|");
    blanked[25] = "";
    expect(summaryRowFromLine(blanked.join("|"), map, "2026")?.pacTotal).toBe(
      "0.00",
    );
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
});

describe("candidateSourceUrl", () => {
  it("links the FEC page for the cycle the figure came from", () => {
    expect(candidateSourceUrl("H2AK01158", "2026")).toBe(
      "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
    );
  });
});

/**
 * The call-site contract between this ingest and `loadFederalCandidateMap`.
 *
 * Split out because it mocks _fec-bulk wholesale, which the parser tests next
 * door must not be. What it guards is a CROSS-INGEST invariant that no
 * single-file review can see: `loadFederalCandidateMap` takes an optional
 * cycle, and passing it makes the loader prefer the candidate row that carries
 * the funding mix. federal-pac-sponsors.ts passes it. If this ingest does not,
 * the two writers resolve one FEC id to DIFFERENT candidate rows, the filed
 * summary lands on a voteless duplicate, and that duplicate earns
 * `no_pac_money` on a candidate whose corporate contributions are sitting on
 * the other id.
 *
 * The assertion is on the ARGUMENT, deliberately. A test that only checked
 * "the ingest still works" would pass against a mock that ignores the cycle —
 * which is exactly how the contract change on the other branch slipped past
 * this one in the first place.
 */
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

const PELTOLA =
  "H2AK01158|PELTOLA, MARY|C|1|DEM|152304.86|0|232791.29|0|83969.49|3483.06|0|0|0|0|0|0|63252.17|AK|00||||||13500|0|02/13/2026|18521.85|0";

vi.mock("./_fec-bulk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./_fec-bulk")>();
  return {
    ...actual,
    ensureBulkZip: vi.fn(async () => "/nonexistent/weball26.zip"),
    loadFederalCandidateMap: vi.fn(
      async () => new Map([["H2AK01158", "cand-peltola"]]),
    ),
    streamZipLines: vi.fn(
      async (_zip: string, onLine: (line: string) => boolean | void) => {
        onLine(PELTOLA);
      },
    ),
  };
});

const { loadFederalCandidateMap } = await import("./_fec-bulk");
const { parseArgs, runCandidateSummaryIngest } =
  await import("./federal-candidate-summary-bulk");

afterEach(() => {
  vi.clearAllMocks();
});

describe("runCandidateSummaryIngest candidate resolution", () => {
  // --dry-run so nothing reaches a database; the loader call happens first.
  const db = { marker: "fake-db" } as never;
  const config = {
    ...parseArgs(["--cycle", "2026", "--dry-run", "--data-dir", tmpdir()], {}),
  };

  it("resolves candidates WITH the cycle, matching federal-pac-sponsors.ts", async () => {
    await runCandidateSummaryIngest(db, config);
    expect(loadFederalCandidateMap).toHaveBeenCalledWith(db, "2026");
  });

  it("passes whichever cycle the run was given, not a hardcoded one", async () => {
    const other = parseArgs(
      ["--cycle", "2024", "--dry-run", "--data-dir", tmpdir()],
      {},
    );
    await runCandidateSummaryIngest(db, other);
    expect(loadFederalCandidateMap).toHaveBeenCalledWith(db, "2024");
  });

  it("still produces the row it read, so the assertion is not vacuous", async () => {
    const counts = await runCandidateSummaryIngest(db, config);
    expect(counts.matched).toBe(1);
    expect(counts.positivePac).toBe(1);
  });
});

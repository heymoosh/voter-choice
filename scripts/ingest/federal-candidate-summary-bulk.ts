/**
 * scripts/ingest/federal-candidate-summary-bulk.ts
 *
 * Per-candidate FEC summary financials from the "all candidates" bulk file
 * (weball<yy>.zip) into `candidate_fec_summaries` (migration 0027).
 *
 * WHY THIS EXISTS — "$0" has to be a fact, not a missing row.
 * `federal-donors.ts` writes the "PACs" bucket only when the amount is > 0, so
 * a candidate who filed and reported zero PAC money is stored exactly like one
 * we never ingested. On prod (2026-08-20) that was 1,573 of 2,594 federal
 * non-incumbents with no PACs row and zero explicit zeros. This ingest records
 * the filed figure whatever it is — including 0 — plus CVG_END_DT, so a
 * "$0 corporate PAC money" claim can be dated and defended.
 *
 * Free: one ~200KB zip from the FEC's public bulk endpoint. No API key, no
 * rate limit, no metered spend. Re-run it as often as filings update.
 *
 * SCOPE — every federal candidate we track with a resolvable FEC id
 * (`loadFederalCandidateMap`), NOT only those that already carry a funding
 * mix. That is the point: the challengers this claim is about are precisely
 * the ones the funding-mix-scoped ingests skip.
 *
 * NOT donor_aggregates buckets, deliberately — see the migration header. This
 * table never feeds totalRaised or the funding mix.
 *
 * A candidate absent from the file has no summary on file with the FEC; we
 * write no row, and read paths must render that as "no filing yet", never $0.
 *
 * FAIL CLOSED — the load-bearing rule of this file.
 * Downstream this feeds a claim about ABSENCE ("no PAC contributions of any
 * kind in FEC filings"), which is only defensible on COMPLETE evidence. There
 * are three input states but the destination column is NOT NULL, so it can
 * represent only two: a filed figure, or no row at all. Anything we cannot
 * READ therefore has to collapse into "no row" — i.e. "no filing yet" — never
 * into "0.00", which is indistinguishable from a filed zero and would hand the
 * strongest badge on the site to a candidate we simply failed to parse.
 * Concretely: an unreadable money field, a blank money field, a short line, an
 * impossible coverage date, or no coverage date at all all SKIP the row. Fewer
 * stored rows is the intended direction; a missing badge is a mild cost, a
 * false "$0 PAC" badge is not.
 *
 * COLUMN-SHIFT DETECTION — what makes the above survivable in production.
 * The file is headerless, so the indices below are the only contract, and the
 * FEC has extended this file before (INDIV_REFUNDS / CMTE_REFUNDS are appended
 * columns). If a column were INSERTED ahead of OTHER_POL_CMTE_CONTRIB, index
 * 25 would read GEN_ELECTION_PRECENT — usually empty — for every candidate. So
 * every line is checked for exactly EXPECTED_FIELD_COUNT fields, malformed
 * lines are counted and surfaced, and the run ABORTS BEFORE WRITING ANYTHING
 * when malformed lines stop looking like FEC noise and start looking like the
 * file changed shape (see MALFORMED_*_LIMIT). `matched === 0` aborts too: a
 * shift that breaks CAND_ID writes nothing, and silence there is a failure
 * mode, not a success.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-candidate-summary-bulk.ts --cycle 2026 --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-candidate-summary-bulk.ts --cycle 2026
 *   Flags: --cycle, --limit N, --data-dir, --weball-zip, --skip-download, --dry-run
 *
 * File layout: https://www.fec.gov/campaign-finance-data/all-candidates-file-description/
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidateFecSummaries } from "../../db/schema";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_SOURCE,
  UPSERT_CHUNK_SIZE,
  ensureBulkZip,
  isoDateFromParts,
  loadFederalCandidateMap,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
} from "./_fec-bulk";

const LOG_PREFIX = "[federal-candidate-summary-bulk]";
const DEFAULT_CYCLE = "2026";

/**
 * Zero-based column positions in the all-candidates file. It ships with no
 * header row, so these are the contract — verified against the live 2026 file
 * on 2026-08-20.
 */
const COLUMN = {
  candidateId: 0,
  totalReceipts: 5,
  candidateContribution: 11,
  individualTotal: 17,
  pacTotal: 25,
  partyTotal: 26,
  coverageEndDate: 27,
} as const;

/**
 * The all-candidates file has exactly 30 pipe-delimited fields per line
 * (verified against the live 2026 file on 2026-08-20). This is the tripwire
 * for a column being inserted or removed upstream: without it, a shift that
 * preserves CAND_ID would silently turn every money figure into garbage while
 * the run reported success.
 */
const EXPECTED_FIELD_COUNT = 30;

/**
 * Every money column that has to be readable for a row to be stored. Listed
 * once so the "all of these or no row" rule cannot drift field by field.
 */
type MoneyField =
  | "totalReceipts"
  | "individualTotal"
  | "pacTotal"
  | "partyTotal"
  | "candidateSelfTotal";

const MONEY_COLUMNS: ReadonlyArray<readonly [MoneyField, number]> = [
  ["totalReceipts", COLUMN.totalReceipts],
  ["individualTotal", COLUMN.individualTotal],
  ["pacTotal", COLUMN.pacTotal],
  ["partyTotal", COLUMN.partyTotal],
  ["candidateSelfTotal", COLUMN.candidateContribution],
];

/**
 * Abort thresholds for malformed lines. A line is malformed when the FILE is
 * not shaped the way we think it is: wrong field count, an unreadable money
 * field, or a non-blank coverage date that is not a real day. (A BLANK
 * coverage date is NOT malformed — see `skippedNoCoverage`.)
 *
 * Both limits must be exceeded to abort, because they answer different
 * questions. The FEC ships the occasional junk line, and one junk line must
 * never block 2,500 good ones — hence the absolute floor. But a moved column
 * makes essentially EVERY line malformed, which the rate catches on a file of
 * any size. Requiring both means "a handful of bad rows" passes and "the file
 * changed shape" throws.
 */
const MALFORMED_ABSOLUTE_LIMIT = 25;
const MALFORMED_RATE_LIMIT = 0.01;

export interface CandidateSummaryConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  weballZipPath: string;
  skipDownload: boolean;
}

export interface CandidateSummaryRow {
  candidateId: string;
  electionCycle: string;
  fecCandidateId: string;
  totalReceipts: string;
  individualTotal: string;
  pacTotal: string;
  partyTotal: string;
  candidateSelfTotal: string;
  /**
   * Never null. A summary with no coverage date is not a filing (FINDING 2):
   * an undated row would let a read path render the strongest possible
   * absence claim with no "through <date>" to bound it.
   */
  coverageEndDate: string;
  source: string;
  sourceUrl: string;
}

export interface CandidateSummaryCounts {
  fileRows: number;
  matched: number;
  unmatched: number;
  /** Lines whose SHAPE we could not trust — the column-shift tripwire. */
  malformed: number;
  /** Tracked candidates in the file with no CVG_END_DT: registered, not filed. */
  skippedNoCoverage: number;
  /** Tracked candidates hit by more than one line; later filing wins. */
  duplicates: number;
  upserted: number;
  zeroPac: number;
  positivePac: number;
}

/**
 * What one bulk line resolved to. A discriminated result rather than
 * `row | null` because the two non-row outcomes mean opposite things:
 * `untracked` is the normal case (most of the file is candidates we do not
 * carry), while `malformed` is evidence the column contract has broken and
 * feeds the abort thresholds. Collapsing them would hide a shifted file
 * inside a count that is expected to be large.
 */
export type SummaryLineResult =
  | { kind: "row"; row: CandidateSummaryRow }
  | { kind: "untracked" }
  | { kind: "no-coverage-date" }
  | { kind: "malformed"; reason: string };

export function parseArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): CandidateSummaryConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  // Matches every sibling ingest (federal-independent-expenditures.ts). An
  // unvalidated cycle is not harmless here: `--cycle 2026-27` would fetch
  // weball26-27.zip and store election_cycle = "2026-27", producing rows no
  // read path ever looks up — invisible data that reads as "no filing yet".
  if (!/^\d{4}$/u.test(cycle)) {
    throw new Error(`Invalid --cycle value: ${cycle}`);
  }
  const dataDir = resolve(
    parseValueFlag(argv, "--data-dir") ??
      env.FEC_BULK_DIR ??
      DEFAULT_FEC_BULK_DIR,
  );
  return {
    cycle,
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
    dataDir,
    weballZipPath: resolve(
      parseValueFlag(argv, "--weball-zip") ??
        `${dataDir}/weball${cycle.slice(2)}.zip`,
    ),
    skipDownload: argv.includes("--skip-download"),
  };
}

/**
 * FEC money fields are plain decimals. Returns null — meaning "unreadable",
 * which SKIPS the row — for anything else, including BLANK.
 *
 * A blank is deliberately unreadable rather than zero. The weball money
 * columns are always populated in the live file (a candidate with nothing to
 * report files a literal "0"), so a blank does not mean "reported nothing" —
 * it means we are not reading the column we think we are. That is exactly the
 * shape of the column-shift failure: index 25 would land on
 * GEN_ELECTION_PRECENT, which is usually empty, and "blank means zero" would
 * turn a parsing failure into a filed-$0 claim for every candidate in the
 * file. So blank fails closed like any other unreadable value.
 *
 * The pattern is strict rather than a bare Number.parseFloat, which would
 * happily read "13500junk" as 13500. Rejecting an odd-but-legitimate form
 * costs one candidate a badge and resolves to "no filing yet"; the abort
 * thresholds catch it if it is ever systemic.
 */
export function parseAmount(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return null;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? value.toFixed(2) : null;
}

/**
 * CVG_END_DT is MM/DD/YYYY. Anything else is dropped rather than guessed —
 * including a shape-valid but impossible day like "13/45/2026", which the
 * old regex-only check would have turned into "2026-13-45" and Postgres would
 * have rejected at insert time, failing the whole 100-row chunk. The calendar
 * validation is shared with billionaire-donor-match.ts via `isoDateFromParts`.
 */
export function parseCoverageEndDate(raw: string | undefined): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec((raw ?? "").trim());
  if (!match) return null;
  const [, month, day, year] = match;
  return isoDateFromParts(Number(year), Number(month), Number(day));
}

export function candidateSourceUrl(
  fecCandidateId: string,
  cycle: string,
): string {
  return `https://www.fec.gov/data/candidate/${fecCandidateId}/?cycle=${cycle}`;
}

/**
 * Resolve one bulk line. Exported for tests — the column contract is the risky
 * part of this ingest.
 *
 * The full decision table, in evaluation order:
 *
 *   field count !== 30            -> malformed  (file shape changed)
 *   CAND_ID blank                 -> malformed  (a 30-field line must have one)
 *   CAND_ID not a candidate we    -> untracked  (normal: most of the file)
 *     track
 *   any money field unreadable    -> malformed  (blank counts — see parseAmount)
 *     or blank
 *   CVG_END_DT blank              -> no-coverage-date (registered, never filed)
 *   CVG_END_DT present but not a  -> malformed  (garbage, e.g. "13/45/2026")
 *     real MM/DD/YYYY day
 *   otherwise                     -> row
 *
 * Only the last state produces a row. Every other state stores nothing, so a
 * read path sees "no filing yet" — never a $0 it can build an absence claim
 * on. The field-count check runs FIRST, before the candidate lookup, because a
 * shifted column is a property of the file, not of one candidate: checking it
 * first means a shifted file trips the abort thresholds on every line rather
 * than hiding inside `untracked`.
 */
export function summaryRowFromLine(
  line: string,
  candidateByFecId: Map<string, string>,
  cycle: string,
): SummaryLineResult {
  const fields = line.split("|");
  if (fields.length !== EXPECTED_FIELD_COUNT) {
    return {
      kind: "malformed",
      reason: `expected ${EXPECTED_FIELD_COUNT} fields, got ${fields.length}`,
    };
  }

  const fecCandidateId = (fields[COLUMN.candidateId] ?? "")
    .trim()
    .toUpperCase();
  if (!fecCandidateId) return { kind: "malformed", reason: "blank CAND_ID" };

  const candidateId = candidateByFecId.get(fecCandidateId);
  if (!candidateId) return { kind: "untracked" };

  const money = {} as Record<MoneyField, string>;
  for (const [name, column] of MONEY_COLUMNS) {
    const value = parseAmount(fields[column]);
    if (value === null) {
      return {
        kind: "malformed",
        reason: `${fecCandidateId}: unreadable ${name} (column ${column})`,
      };
    }
    money[name] = value;
  }

  const rawCoverage = (fields[COLUMN.coverageEndDate] ?? "").trim();
  // A blank CVG_END_DT is an EXPECTED state, not a broken line: a candidate
  // registered for the cycle who has filed no report appears in weball with
  // all-zero money and no coverage date. It is not a filing, so we store
  // nothing — but it must not count toward the column-shift thresholds, or a
  // perfectly healthy file would abort every run.
  if (!rawCoverage) return { kind: "no-coverage-date" };
  const coverageEndDate = parseCoverageEndDate(rawCoverage);
  if (!coverageEndDate) {
    return {
      kind: "malformed",
      reason: `${fecCandidateId}: unreadable CVG_END_DT "${rawCoverage}"`,
    };
  }

  return {
    kind: "row",
    row: {
      candidateId,
      electionCycle: cycle,
      fecCandidateId,
      totalReceipts: money.totalReceipts,
      individualTotal: money.individualTotal,
      pacTotal: money.pacTotal,
      partyTotal: money.partyTotal,
      candidateSelfTotal: money.candidateSelfTotal,
      coverageEndDate,
      source: FEC_BULK_SOURCE,
      sourceUrl: candidateSourceUrl(fecCandidateId, cycle),
    },
  };
}

/**
 * Pick which of two lines for the SAME candidate wins.
 *
 * `loadFederalCandidateMap` is many-to-one — `fecCandidateIdsForRow` emits up
 * to three FEC ids per candidate — so a House member running for Senate can
 * match both their dormant H2XX… line and their live S6XX… line. Letting both
 * through would either abort the run outright (Postgres 21000, "ON CONFLICT DO
 * UPDATE command cannot affect row a second time", with earlier chunks already
 * committed) or, across chunks, silently let FILE ORDER decide which
 * committee's financials become the stored filed total. If the dormant one
 * won, a $0 PAC claim would be sourced from a dead committee.
 *
 * So the winner is chosen on the data, not on position: the later coverage
 * date, then the larger total receipts, then the lexicographically greater FEC
 * id. The last two only ever break exact ties, and they make the outcome
 * independent of how the file happens to be sorted.
 */
export function preferredSummaryRow(
  a: CandidateSummaryRow,
  b: CandidateSummaryRow,
): CandidateSummaryRow {
  if (a.coverageEndDate !== b.coverageEndDate) {
    return a.coverageEndDate > b.coverageEndDate ? a : b;
  }
  const aReceipts = Number(a.totalReceipts);
  const bReceipts = Number(b.totalReceipts);
  if (aReceipts !== bReceipts) return aReceipts > bReceipts ? a : b;
  return a.fecCandidateId >= b.fecCandidateId ? a : b;
}

export interface SummaryCollector {
  /** Feed one line; returns false once --limit is reached (stops streaming). */
  onLine: (line: string) => boolean | void;
  /** Run the abort guards and return the deduped rows plus the run counts. */
  finish: () => { rows: CandidateSummaryRow[]; counts: CandidateSummaryCounts };
}

/**
 * Accumulate rows off the bulk file, deduped by candidate, and hold the
 * guards that decide whether the run is trustworthy at all.
 *
 * Separated from `runCandidateSummaryIngest` so the guards are unit-testable
 * without a zip or a database — they are the part that has to be right.
 */
export function createSummaryCollector(
  candidateByFecId: Map<string, string>,
  config: Pick<CandidateSummaryConfig, "cycle" | "limit">,
): SummaryCollector {
  // Keyed by candidateId, not pushed as a list: the upsert targets
  // (candidate_id, election_cycle), so two rows for one candidate in the same
  // chunk is a hard Postgres error. See preferredSummaryRow.
  const byCandidate = new Map<string, CandidateSummaryRow>();
  const counts: CandidateSummaryCounts = {
    fileRows: 0,
    matched: 0,
    unmatched: 0,
    malformed: 0,
    skippedNoCoverage: 0,
    duplicates: 0,
    upserted: 0,
    zeroPac: 0,
    positivePac: 0,
  };

  return {
    onLine(line: string): boolean | void {
      if (config.limit !== null && counts.fileRows >= config.limit)
        return false;
      counts.fileRows += 1;

      const result = summaryRowFromLine(line, candidateByFecId, config.cycle);
      if (result.kind === "untracked") {
        counts.unmatched += 1;
        return;
      }
      if (result.kind === "malformed") {
        counts.malformed += 1;
        // Log the first few verbatim: when the column contract breaks, the
        // reason is the single most useful thing in the run output.
        if (counts.malformed <= 5) {
          console.warn(`${LOG_PREFIX} malformed line: ${result.reason}`);
        }
        return;
      }
      if (result.kind === "no-coverage-date") {
        counts.skippedNoCoverage += 1;
        return;
      }

      counts.matched += 1;
      const existing = byCandidate.get(result.row.candidateId);
      if (existing) {
        counts.duplicates += 1;
        const winner = preferredSummaryRow(existing, result.row);
        console.warn(
          `${LOG_PREFIX} duplicate candidate ${result.row.candidateId}: ` +
            `${existing.fecCandidateId} (${existing.coverageEndDate}) vs ` +
            `${result.row.fecCandidateId} (${result.row.coverageEndDate}) ` +
            `-> keeping ${winner.fecCandidateId}`,
        );
        byCandidate.set(result.row.candidateId, winner);
      } else {
        byCandidate.set(result.row.candidateId, result.row);
      }
    },

    finish() {
      // Both guards run BEFORE any write. Rows are buffered and upserted only
      // after this returns, so throwing here means a file we cannot trust
      // stores nothing at all rather than half a run.
      if (
        counts.malformed > MALFORMED_ABSOLUTE_LIMIT &&
        counts.malformed > counts.fileRows * MALFORMED_RATE_LIMIT
      ) {
        throw new Error(
          `${LOG_PREFIX} ${counts.malformed} of ${counts.fileRows} lines are malformed — ` +
            `the all-candidates file no longer matches the ${EXPECTED_FIELD_COUNT}-column ` +
            `contract in COLUMN. Re-check the FEC file description before storing anything.`,
        );
      }
      // A column shift that breaks CAND_ID matches nobody: nothing is written
      // and the run would otherwise exit 0 on total failure. Skipped under
      // --limit, where reading only the first N lines of an id-sorted file can
      // legitimately match no tracked candidate.
      if (counts.matched === 0 && config.limit === null) {
        throw new Error(
          `${LOG_PREFIX} matched 0 of ${counts.fileRows} lines against ` +
            `${candidateByFecId.size} tracked FEC ids — refusing to treat an ` +
            `empty run as success.`,
        );
      }

      const rows = [...byCandidate.values()];
      for (const row of rows) {
        if (Number(row.pacTotal) > 0) counts.positivePac += 1;
        else counts.zeroPac += 1;
      }
      return { rows, counts };
    },
  };
}

export async function upsertSummaries(
  db: DbClient,
  rows: CandidateSummaryRow[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0 || dryRun) return rows.length;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await db
      .insert(candidateFecSummaries)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          candidateFecSummaries.candidateId,
          candidateFecSummaries.electionCycle,
        ],
        set: {
          fecCandidateId: sql`excluded.fec_candidate_id`,
          totalReceipts: sql`excluded.total_receipts`,
          individualTotal: sql`excluded.individual_total`,
          pacTotal: sql`excluded.pac_total`,
          partyTotal: sql`excluded.party_total`,
          candidateSelfTotal: sql`excluded.candidate_self_total`,
          coverageEndDate: sql`excluded.coverage_end_date`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          updatedAt: sql`now()`,
        },
      });
  }
  return rows.length;
}

export async function runCandidateSummaryIngest(
  db: DbClient,
  config: CandidateSummaryConfig,
): Promise<CandidateSummaryCounts> {
  await mkdir(config.dataDir, { recursive: true });
  const zipPath = await ensureBulkZip({
    cycle: config.cycle,
    prefix: "weball",
    dataDir: config.dataDir,
    explicitPath: config.weballZipPath,
    skipDownload: config.skipDownload,
    logPrefix: LOG_PREFIX,
  });

  const candidateByFecId = await loadFederalCandidateMap(db);
  console.log(`${LOG_PREFIX} tracked federal FEC ids=${candidateByFecId.size}`);

  // The all-candidates file is one small row per candidate (~200KB zipped), so
  // it is collected in one pass and upserted in chunks after — streamZipLines
  // takes a synchronous callback. Buffering is also what lets `finish()` abort
  // a file that turns out to be untrustworthy before a single row is written.
  const collector = createSummaryCollector(candidateByFecId, config);
  await streamZipLines(zipPath, collector.onLine, LOG_PREFIX);
  const { rows, counts } = collector.finish();

  counts.upserted += await upsertSummaries(db, rows, config.dryRun);

  return counts;
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  const db = requireDb();
  const counts = await runCandidateSummaryIngest(db, config);
  console.log(
    `${LOG_PREFIX} ${config.dryRun ? "DRY RUN " : ""}cycle=${config.cycle} ` +
      `file_rows=${counts.fileRows} matched=${counts.matched} ` +
      `unmatched=${counts.unmatched} malformed=${counts.malformed} ` +
      `no_coverage_date=${counts.skippedNoCoverage} ` +
      `duplicates=${counts.duplicates} upserted=${counts.upserted} ` +
      `pac_zero=${counts.zeroPac} pac_positive=${counts.positivePac}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    () => process.exit(0),
    (error) => {
      console.error(`${LOG_PREFIX} failed`, error);
      process.exit(1);
    },
  );
}

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
  coverageEndDate: string | null;
  source: string;
  sourceUrl: string;
}

export interface CandidateSummaryCounts {
  fileRows: number;
  matched: number;
  unmatched: number;
  upserted: number;
  zeroPac: number;
  positivePac: number;
}

export function parseArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): CandidateSummaryConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
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

/** FEC money fields are plain decimals; a blank means zero, not unknown. */
function parseAmount(raw: string | undefined): string {
  const value = Number.parseFloat((raw ?? "").trim());
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

/** CVG_END_DT is MM/DD/YYYY. Anything else is dropped rather than guessed. */
export function parseCoverageEndDate(raw: string | undefined): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec((raw ?? "").trim());
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

export function candidateSourceUrl(
  fecCandidateId: string,
  cycle: string,
): string {
  return `https://www.fec.gov/data/candidate/${fecCandidateId}/?cycle=${cycle}`;
}

/**
 * Turn one bulk line into a row, or null when we do not track the candidate.
 * Exported for tests — the column contract is the risky part of this ingest.
 */
export function summaryRowFromLine(
  line: string,
  candidateByFecId: Map<string, string>,
  cycle: string,
): CandidateSummaryRow | null {
  const fields = line.split("|");
  const fecCandidateId = (fields[COLUMN.candidateId] ?? "")
    .trim()
    .toUpperCase();
  if (!fecCandidateId) return null;

  const candidateId = candidateByFecId.get(fecCandidateId);
  if (!candidateId) return null;

  return {
    candidateId,
    electionCycle: cycle,
    fecCandidateId,
    totalReceipts: parseAmount(fields[COLUMN.totalReceipts]),
    individualTotal: parseAmount(fields[COLUMN.individualTotal]),
    pacTotal: parseAmount(fields[COLUMN.pacTotal]),
    partyTotal: parseAmount(fields[COLUMN.partyTotal]),
    candidateSelfTotal: parseAmount(fields[COLUMN.candidateContribution]),
    coverageEndDate: parseCoverageEndDate(fields[COLUMN.coverageEndDate]),
    source: FEC_BULK_SOURCE,
    sourceUrl: candidateSourceUrl(fecCandidateId, cycle),
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

  const counts: CandidateSummaryCounts = {
    fileRows: 0,
    matched: 0,
    unmatched: 0,
    upserted: 0,
    zeroPac: 0,
    positivePac: 0,
  };

  // The all-candidates file is one small row per candidate (~200KB zipped), so
  // it is collected in one pass and upserted in chunks after — streamZipLines
  // takes a synchronous callback.
  const rows: CandidateSummaryRow[] = [];
  await streamZipLines(
    zipPath,
    (line) => {
      if (config.limit !== null && counts.fileRows >= config.limit)
        return false;
      counts.fileRows += 1;

      const row = summaryRowFromLine(line, candidateByFecId, config.cycle);
      if (!row) {
        counts.unmatched += 1;
        return;
      }
      counts.matched += 1;
      if (Number(row.pacTotal) > 0) counts.positivePac += 1;
      else counts.zeroPac += 1;
      rows.push(row);
    },
    LOG_PREFIX,
  );

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
      `unmatched=${counts.unmatched} upserted=${counts.upserted} ` +
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

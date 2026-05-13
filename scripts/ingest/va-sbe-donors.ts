/**
 * scripts/ingest/va-sbe-donors.ts
 *
 * Virginia State Board of Elections (SBE) donor ingest.
 *
 * Downloads monthly Report.csv and ScheduleA.csv files from the SBE bulk data
 * portal for each month of 2024, matches to VA General Assembly candidates in
 * our DB by normalized last name, aggregates into donor buckets, and upserts
 * into `donor_aggregates`.
 *
 * Source: Virginia SBE Campaign Finance bulk data
 * https://apps.elections.virginia.gov/SBE_CSV/CF/
 *
 * Report.csv fields (selected):
 *   ReportId, CommitteeType, CandidateName, IsGeneralAssembly,
 *   OfficeSought, District, ReportYear
 *
 * ScheduleA.csv fields (selected):
 *   ReportId, FirstName, MiddleName, LastOrCompanyName,
 *   NameOfEmployer, OccupationOrTypeOfBusiness, IsIndividual,
 *   TransactionDate, Amount
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/va-sbe-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE = "va_sbe_bulk";
const SOURCE_URL = "https://apps.elections.virginia.gov/SBE_CSV/CF/";
const BASE_URL = "https://apps.elections.virginia.gov/SBE_CSV/CF/";
const MONTHS = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; voter-choice-ingest/1.0)",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
  rawMetadata: unknown;
}

interface AggValue {
  totalDollars: number;
  donorCount: number;
  candidateName: string;
}

interface DonorAggregateRow {
  candidateId: string;
  electionCycle: string;
  bucketLabel: string;
  amountTotal: string;
  source: string;
  sourceUrl: string;
  rawMetadata: UnknownRecord;
}

export type VaSbeIngestCounts = {
  dbCandidatesQueried: number;
  candidatesMatched: number;
  contribsProcessed: number;
  contribsFiltered: number;
  rowsUpserted: number;
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface IngestConfig {
  dryRun: boolean;
  limit: number | null;
  year: string;
}

function resolveConfig(argv: string[] = process.argv): IngestConfig {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  let limit: number | null = null;
  if (limitIdx !== -1) {
    const raw = argv[limitIdx + 1];
    const parsed = Number.parseInt(raw ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) limit = parsed;
  }
  const yearIdx = argv.indexOf("--year");
  const year = yearIdx !== -1 ? (argv[yearIdx + 1] ?? "2024") : "2024";
  return { dryRun, limit, year };
}

// ---------------------------------------------------------------------------
// CSV streaming parser
//
// VA SBE CSVs are comma-separated with double-quoted fields that may contain
// embedded commas and escaped double-quotes (""). Handles CRLF and LF.
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Stream-read a CSV file, calling `onRow` with a record for each data line.
 * Skips blank lines. Headers are taken from the first line.
 *
 * VA SBE files are Windows-1252 encoded (not UTF-8), so we read as latin1
 * which is a superset that prevents decode errors.
 */
async function streamCsvFile(
  filePath: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use latin1 (windows-1252 compatible) to avoid UTF-8 decode errors in VA files
    const stream = fs.createReadStream(filePath, { encoding: "latin1" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers: string[] | null = null;

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const fields = parseCsvLine(trimmed);

      if (headers === null) {
        headers = fields;
        return;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i] as string] = (fields[i] ?? "").trim();
      }
      onRow(row);
    });

    rl.on("close", () => resolve());
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// HTTP download helpers
// ---------------------------------------------------------------------------

/**
 * Download a URL to a local file path. Returns false if the server returns
 * a non-2xx status (e.g. 404 for months with no data), true on success.
 */
async function downloadToFile(
  url: string,
  destPath: string,
): Promise<boolean> {
  const resp = await fetch(url, { headers: FETCH_HEADERS });

  if (!resp.ok) {
    console.warn(
      `[va-sbe-donors] download failed status=${resp.status} url=${url}`,
    );
    return false;
  }

  if (!resp.body) {
    console.warn(`[va-sbe-donors] empty body for url=${url}`);
    return false;
  }

  const writer = fs.createWriteStream(destPath);
  const nodeReadable = Readable.fromWeb(
    resp.body as Parameters<typeof Readable.fromWeb>[0],
  );

  await new Promise<void>((resolve, reject) => {
    nodeReadable.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
    nodeReadable.on("error", reject);
  });

  return true;
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

function normalizeStr(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/gu, "") // strip punctuation
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a DB candidate fullName.
 * DB format: "First [Middle] Last" (title case).
 */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeStr(last);
}

/**
 * Extract first name from a DB candidate fullName.
 */
function extractFirstNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  return normalizeStr(parts[0] ?? "");
}

/**
 * Extract last name from VA CandidateName field.
 * Format: "First  Last" (two spaces) or "First Last".
 */
function extractLastNameFromCandidateName(candidateName: string): string {
  // split(/\s+/) handles both single and double spaces
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeStr(last);
}

/**
 * Extract first name from VA CandidateName field.
 */
function extractFirstNameFromCandidateName(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  return normalizeStr(parts[0] ?? "");
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (VA state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-VA%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 2: Build last-name index for DB candidates
// ---------------------------------------------------------------------------

function buildLastNameIndex(
  dbCandidates: DbCandidate[],
): Map<string, DbCandidate[]> {
  const byLastName = new Map<string, DbCandidate[]>();
  for (const candidate of dbCandidates) {
    const lastName = extractLastNameFromDbName(candidate.fullName);
    if (!lastName) continue;
    const existing = byLastName.get(lastName) ?? [];
    existing.push(candidate);
    byLastName.set(lastName, existing);
  }
  return byLastName;
}

// ---------------------------------------------------------------------------
// GA office keywords — OfficeSought filter
//
// NOTE: IsGeneralAssembly is "False" for all 2024 rows (the VA GA election was
// November 2023). We filter by OfficeSought keywords instead to capture the
// 2023-cycle committees still filing activity reports in 2024.
// ---------------------------------------------------------------------------

const GA_OFFICE_KEYWORDS = [
  "delegate",
  "house of delegates",
  "senate of virginia",
  "state senate",
  "general assembly",
];

function isGaOfficeSought(officeSought: string): boolean {
  const lower = officeSought.toLowerCase();
  return GA_OFFICE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Step 3: Download and parse Report.csv files, build ReportId → DbCandidate map
// ---------------------------------------------------------------------------

async function buildReportIdMap(
  byLastName: Map<string, DbCandidate[]>,
  year: string = "2024",
): Promise<{
  reportIdToCandidate: Map<string, DbCandidate>;
  candidateNameByReportId: Map<string, string>;
}> {
  // ReportId → DbCandidate (many-to-one: multiple monthly reports per candidate)
  const reportIdToCandidate = new Map<string, DbCandidate>();
  // ReportId → raw CandidateName string for metadata
  const candidateNameByReportId = new Map<string, string>();

  // Cache: "normLast|normFirst" → DbCandidate | null
  const nameCache = new Map<string, DbCandidate | null>();

  function resolveByName(candidateName: string): DbCandidate | null {
    const normLast = extractLastNameFromCandidateName(candidateName);
    const normFirst = extractFirstNameFromCandidateName(candidateName);
    const cacheKey = `${normLast}|${normFirst}`;

    if (nameCache.has(cacheKey)) return nameCache.get(cacheKey) ?? null;

    if (!normLast) {
      nameCache.set(cacheKey, null);
      return null;
    }

    const dbCandidates = byLastName.get(normLast);
    if (!dbCandidates || dbCandidates.length === 0) {
      nameCache.set(cacheKey, null);
      return null;
    }

    let match: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      match = dbCandidates[0] ?? null;
    } else {
      // Disambiguate by first name
      if (normFirst) {
        const firstMatch = dbCandidates.find((c) => {
          const dbFirst = extractFirstNameFromDbName(c.fullName);
          return dbFirst === normFirst;
        });
        match = firstMatch ?? dbCandidates[0] ?? null;
      } else {
        match = dbCandidates[0] ?? null;
      }
    }

    nameCache.set(cacheKey, match);
    return match;
  }

  for (const month of MONTHS) {
    const url = `${BASE_URL}${year}_${month}/Report.csv`;
    const tmpPath = `/tmp/VA_${year}_${month}_Report.csv`;

    console.log(`[va-sbe-donors] downloading Report.csv month=${year}_${month} ...`);
    const ok = await downloadToFile(url, tmpPath);
    if (!ok) continue;

    let rowsRead = 0;
    let rowsMatched = 0;

    await streamCsvFile(tmpPath, (row) => {
      rowsRead++;

      // Filter: CommitteeType must be "Candidate Campaign Committee"
      const committeeType = row["CommitteeType"] ?? "";
      if (committeeType !== "Candidate Campaign Committee") return;

      // Filter: OfficeSought must be a General Assembly office
      const officeSought = row["OfficeSought"] ?? "";
      if (!isGaOfficeSought(officeSought)) return;

      // Filter: ReportYear must match the target year
      const reportYear = row["ReportYear"] ?? "";
      if (reportYear !== year) return;

      const reportId = row["ReportId"] ?? "";
      if (!reportId) return;

      const candidateName = row["CandidateName"] ?? "";
      if (!candidateName) return;

      const dbCandidate = resolveByName(candidateName);
      if (!dbCandidate) return;

      reportIdToCandidate.set(reportId, dbCandidate);
      candidateNameByReportId.set(reportId, candidateName);
      rowsMatched++;
    });

    console.log(
      `[va-sbe-donors] Report.csv month=${year}_${month}: rows_read=${rowsRead} reports_matched=${rowsMatched}`,
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }

  console.log(
    `[va-sbe-donors] total_report_ids_mapped=${reportIdToCandidate.size}`,
  );
  return { reportIdToCandidate, candidateNameByReportId };
}

// ---------------------------------------------------------------------------
// Step 4: Download and process ScheduleA.csv files, aggregate contributions
// ---------------------------------------------------------------------------

async function aggregateScheduleA(
  reportIdToCandidate: Map<string, DbCandidate>,
  candidateNameByReportId: Map<string, string>,
  year: string = "2024",
): Promise<{
  agg: Map<string, AggValue>;
  candidateMatchedNames: Map<string, Set<string>>;
  counters: { processed: number; filtered: number };
}> {
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  const counters = { processed: 0, filtered: 0 };

  for (const month of MONTHS) {
    const url = `${BASE_URL}${year}_${month}/ScheduleA.csv`;
    const tmpPath = `/tmp/VA_${year}_${month}_ScheduleA.csv`;

    console.log(
      `[va-sbe-donors] downloading ScheduleA.csv month=${year}_${month} ...`,
    );
    const ok = await downloadToFile(url, tmpPath);
    if (!ok) continue;

    let rowsInFile = 0;
    let matchedInFile = 0;

    await streamCsvFile(tmpPath, (row) => {
      rowsInFile++;
      counters.processed++;

      const reportId = row["ReportId"] ?? "";
      const dbCandidate = reportIdToCandidate.get(reportId);
      if (!dbCandidate) return;

      const amountRaw = row["Amount"] ?? "";
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      // Classify into bucket
      const isIndividualRaw = row["IsIndividual"] ?? "";
      const isIndividual = isIndividualRaw === "True" || isIndividualRaw === "1";
      const employer = row["NameOfEmployer"] ?? "";
      const occupation = row["OccupationOrTypeOfBusiness"] ?? "";
      const lastOrCompanyName = row["LastOrCompanyName"] ?? "";
      const firstName = row["FirstName"] ?? "";

      let bucket: DonorBucketLabel;

      if (isIndividual) {
        // Check employer for self-employment pattern
        const employerBucket = mapEmployerToBucket(employer, occupation);
        if (employerBucket === "Self-funded") {
          bucket = "Self-funded";
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Organization / company
        const orgBucket = mapEmployerToBucket(lastOrCompanyName) ?? mapEmployerToBucket(employer);
        bucket = orgBucket ?? "Other";
      }

      const aggKey = `${dbCandidate.id}|${year}|${bucket}`;
      const existing = agg.get(aggKey);
      const rawCandName = candidateNameByReportId.get(reportId) ?? "";
      if (existing) {
        existing.totalDollars += amount;
        existing.donorCount += 1;
      } else {
        agg.set(aggKey, {
          totalDollars: amount,
          donorCount: 1,
          candidateName: rawCandName,
        });
      }

      // Track raw candidate names for metadata
      const matched = candidateMatchedNames.get(dbCandidate.id) ?? new Set();
      matched.add(rawCandName);
      candidateMatchedNames.set(dbCandidate.id, matched);

      matchedInFile++;
      counters.filtered++;
    });

    console.log(
      `[va-sbe-donors] ScheduleA.csv month=${year}_${month}: rows_read=${rowsInFile} matched_contributions=${matchedInFile}`,
    );

    // Clean up temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }

  return { agg, candidateMatchedNames, counters };
}

// ---------------------------------------------------------------------------
// Step 5: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateMatchedNames: Map<string, Set<string>>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucket = aggKey.substring(secondPipe + 1);

    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const matchedNames = [...(candidateMatchedNames.get(candidateId) ?? [])];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        vaSbeCandidateNames: matchedNames,
      },
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 6: Upsert into donor_aggregates
// ---------------------------------------------------------------------------

async function upsertRows(
  db: DbClient,
  rows: DonorAggregateRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const CHUNK_SIZE = 100;
  let total = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const dbRows = chunk.map((row) => ({
      candidateId: row.candidateId,
      electionCycle: row.electionCycle,
      bucketLabel: row.bucketLabel,
      amountTotal: row.amountTotal,
      source: row.source,
      sourceUrl: row.sourceUrl,
      rawMetadata: row.rawMetadata,
      insertedAt: new Date(),
    }));

    await db
      .insert(donorAggregates)
      .values(dbRows)
      .onConflictDoUpdate({
        target: [
          donorAggregates.candidateId,
          donorAggregates.electionCycle,
          donorAggregates.bucketLabel,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          rawMetadata: sql`excluded.raw_metadata`,
          insertedAt: sql`excluded.inserted_at`,
        },
      });

    total += dbRows.length;
  }

  return total;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function ingestVaSbeDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<VaSbeIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[va-sbe-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load DB candidates (VA state only)
  console.log(`[va-sbe-donors] querying DB for VA state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[va-sbe-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[va-sbe-donors] no VA state candidates found in DB — check jurisdiction LIKE 'state-VA%'`,
    );
  }

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[va-sbe-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Download Report.csv files and build ReportId → candidate map
  console.log(`[va-sbe-donors] downloading Report.csv files for ${config.year} ...`);
  const { reportIdToCandidate, candidateNameByReportId } =
    await buildReportIdMap(byLastName, config.year);

  const uniqueCandidatesFromReports = new Set(
    [...reportIdToCandidate.values()].map((c) => c.id),
  );
  console.log(
    `[va-sbe-donors] unique_candidates_from_reports=${uniqueCandidatesFromReports.size}`,
  );

  // Step 4: Download ScheduleA.csv files and aggregate contributions
  console.log(`[va-sbe-donors] downloading ScheduleA.csv files for ${config.year} ...`);
  const { agg, candidateMatchedNames, counters } = await aggregateScheduleA(
    reportIdToCandidate,
    candidateNameByReportId,
    config.year,
  );

  console.log(
    `[va-sbe-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 5: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[va-sbe-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 6: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[va-sbe-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: VaSbeIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[va-sbe-donors] complete",
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `contributions_processed=${counts.contribsProcessed}`,
      `contributions_matched=${counts.contribsFiltered}`,
      `rows_upserted=${counts.rowsUpserted}`,
      `dry_run=${counts.dryRun}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  ingestVaSbeDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[va-sbe-donors] failed:", msg);
    process.exitCode = 1;
  });
}

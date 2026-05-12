/**
 * scripts/ingest/wa-pdc-donors.ts
 *
 * Phase E — Washington state donor ingest from WA PDC bulk campaign finance data.
 *
 * Reads two pre-downloaded CSV files:
 *   /tmp/WA_legislative_2024.csv
 *   /tmp/WA_legislative_2026.csv
 *
 * Matches PDC filer_name (e.g. "Jason Ritchie") to DB candidate full_name by
 * normalized last name, aggregates contributions into donor buckets, and upserts
 * into `donor_aggregates`.
 *
 * Source: WA Public Disclosure Commission bulk data
 * https://data.wa.gov/resource/kv7h-kjye.csv
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/wa-pdc-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
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

const CSV_FILES: Array<{ path: string; cycle: string }> = [
  { path: "/tmp/WA_legislative_2024.csv", cycle: "2024" },
  { path: "/tmp/WA_legislative_2026.csv", cycle: "2026" },
];

const SOURCE = "wa_pdc_bulk";
const SOURCE_URL = "https://data.wa.gov/resource/kv7h-kjye.csv";

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
  filerName: string;
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

export type WaPdcIngestCounts = {
  dbCandidatesQueried: number;
  candidatesMatched: number;
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
  return { dryRun, limit };
}

// ---------------------------------------------------------------------------
// CSV streaming parser
//
// WA PDC CSVs are comma-separated with double-quoted fields that may contain
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
        // Escaped double-quote inside quoted field
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
 */
async function streamCsv(
  filePath: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
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
        row[headers[i]] = fields[i] ?? "";
      }
      onRow(row);
    });

    rl.on("close", () => resolve());
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "") // strip punctuation except hyphens (Smith-Jones)
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a "First Last" format string.
 * WA PDC filer_name is "First Last" (e.g. "Jason Ritchie", "Mary Smith-Jones").
 * Last name = last space-delimited token.
 */
function extractLastName(fullName: string): string {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/u);
  return normalizeName(parts[parts.length - 1] ?? trimmed);
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (WA state)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-WA%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 2: Build last-name → candidateId lookup from DB candidates
// ---------------------------------------------------------------------------

function buildLastNameToCandidateMap(
  dbCandidates: DbCandidate[],
): Map<string, string> {
  // last-name (normalized) → candidateId
  // Last-match-wins when multiple candidates share a last name (acceptable for bulk ingest)
  const map = new Map<string, string>();
  for (const candidate of dbCandidates) {
    const lastName = extractLastName(candidate.fullName);
    if (lastName) {
      map.set(lastName, candidate.id);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Step 3: Stream CSV files, match to candidates, aggregate
// ---------------------------------------------------------------------------

async function aggregateContributions(
  lastNameToCandidate: Map<string, string>,
  dbCandidateIds: Set<string>,
): Promise<{
  agg: Map<string, AggValue>;
  matchedCandidateIds: Set<string>;
  contribsFiltered: number;
}> {
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();
  const matchedCandidateIds = new Set<string>();
  let contribsFiltered = 0;

  for (const { path: csvPath, cycle } of CSV_FILES) {
    if (!fs.existsSync(csvPath)) {
      console.warn(`[wa-pdc-donors] CSV not found, skipping: ${csvPath}`);
      continue;
    }

    console.log(`[wa-pdc-donors] streaming ${csvPath} (cycle=${cycle}) ...`);
    let rowsInFile = 0;
    let matchedInFile = 0;

    await streamCsv(csvPath, (row) => {
      rowsInFile++;

      // Only process candidate contributions for legislative races
      // (files are already filtered to Legislative, but guard anyway)
      const type = row["type"] ?? "";
      if (type !== "Candidate") return;

      const filerName = row["filer_name"] ?? "";
      if (!filerName) return;

      const filerLastName = extractLastName(filerName);
      const candidateId = lastNameToCandidate.get(filerLastName);
      if (!candidateId) return;

      const amountRaw = row["amount"] ?? "";
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      // Classify contributor
      const contributorCategory = row["contributor_category"] ?? "";
      const contributorName = row["contributor_name"] ?? "";
      const employerName = row["contributor_employer_name"] ?? "";
      const occupation = row["contributor_occupation"] ?? "";

      let bucket: DonorBucketLabel;

      if (contributorCategory.startsWith("Individual")) {
        // Try to map by employer; fall back to amount-based bucket
        const employerBucket = mapEmployerToBucket(employerName, occupation);
        if (employerBucket !== null && employerBucket !== "Other") {
          bucket = employerBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Business, Political Committee, PAC, etc.
        const orgBucket = mapEmployerToBucket(contributorName);
        bucket = orgBucket ?? "Other";
      }

      const aggKey = `${candidateId}|${cycle}|${bucket}`;
      const existing = agg.get(aggKey);
      if (existing) {
        existing.totalDollars += amount;
        existing.donorCount += 1;
      } else {
        agg.set(aggKey, {
          totalDollars: amount,
          donorCount: 1,
          filerName,
        });
      }

      matchedCandidateIds.add(candidateId);
      matchedInFile++;
      contribsFiltered++;
    });

    console.log(
      `[wa-pdc-donors] ${csvPath}: rows_read=${rowsInFile} matched_contributions=${matchedInFile}`,
    );
  }

  return { agg, matchedCandidateIds, contribsFiltered };
}

// ---------------------------------------------------------------------------
// Step 4: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(agg: Map<string, AggValue>): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const [candidateId, cycle, bucket] = aggKey.split("|");
    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        pdcFilerName: value.filerName,
      },
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 5: Upsert into donor_aggregates
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

export async function ingestWaPdcDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<WaPdcIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[wa-pdc-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load DB candidates (WA state only)
  console.log(`[wa-pdc-donors] querying DB for WA state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[wa-pdc-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[wa-pdc-donors] no WA candidates found in DB — check jurisdiction LIKE 'state-WA%'`,
    );
  }

  // Step 2: Build last-name lookup
  const lastNameToCandidate = buildLastNameToCandidateMap(dbCandidates);
  const dbCandidateIds = new Set(dbCandidates.map((c) => c.id));
  console.log(
    `[wa-pdc-donors] unique_last_names_indexed=${lastNameToCandidate.size}`,
  );

  // Step 3: Stream CSVs and aggregate contributions
  const { agg, matchedCandidateIds, contribsFiltered } =
    await aggregateContributions(lastNameToCandidate, dbCandidateIds);

  console.log(
    `[wa-pdc-donors] candidates_matched=${matchedCandidateIds.size} total_matched_contributions=${contribsFiltered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg);
  console.log(`[wa-pdc-donors] rows_to_upsert=${rows.length}`);

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[wa-pdc-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: WaPdcIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: matchedCandidateIds.size,
    contribsFiltered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[wa-pdc-donors] complete",
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `matched_contributions=${counts.contribsFiltered}`,
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
  ingestWaPdcDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[wa-pdc-donors] failed:", msg);
    process.exitCode = 1;
  });
}

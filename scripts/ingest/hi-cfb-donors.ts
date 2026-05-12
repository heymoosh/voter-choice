/**
 * scripts/ingest/hi-cfb-donors.ts
 *
 * Hawaii Campaign Finance Board (CFB) donor ingest.
 *
 * Reads /tmp/HI_contributions.csv (unzipped, ~4.5 MB), filters to state
 * House/Senate rows for 2024 or 2026 cycles, matches candidate names to HI
 * state candidates in our DB by normalized last name, aggregates into donor
 * buckets, and upserts into `donor_aggregates`.
 *
 * Source: Hawaii Campaign Spending Commission bulk data
 * https://ags.hawaii.gov/campaign/
 *
 * CSV columns:
 *   candidate_name, contributor_type, contributor_name, date, amount,
 *   aggregate, employer, occupation, street_address_1, street_address_2,
 *   city, state, zip_code, non_resident_yes_or_no_, non_monetary_yes_or_no,
 *   non_monetary_category, non_monetary_description, office, district,
 *   county, party, reg_no, election_period, mapping_address, inoutstate, range
 *
 * candidate_name format: "Last, First" (e.g., "Abbett, Richard")
 *
 * Filtering:
 *   - office must be "House" or "Senate" (excludes Council, Mayor, OHA, etc.)
 *   - year from date field >= 2024 OR election_period starts with "2024"
 *
 * Cycle mapping:
 *   - election_period "2024-2026" → cycle "2026"
 *   - election_period "2022-2024" → cycle "2024"
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/hi-cfb-donors.ts [--dry-run] [--limit 50]
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

const CSV_PATH = "/tmp/HI_contributions.csv";
const SOURCE = "hi_cfb_bulk";
const SOURCE_URL = "https://ags.hawaii.gov/campaign/";

// Only state legislature offices — exclude county/city/board offices
const STATE_LEGISLATURE_OFFICES = new Set(["House", "Senate"]);

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
  candidateName: string; // HI candidate_name that matched
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

export type HiCfbIngestCounts = {
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
// HI CSVs are comma-separated with double-quoted fields that may contain
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
        row[headers[i] as string] = fields[i] ?? "";
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

function normalizeStr(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, "") // strip punctuation
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from HI CSV candidate_name (format: "Last, First").
 * Falls back to last space-delimited token for names without a comma.
 */
function extractLastNameFromCsvName(candidateName: string): string {
  const trimmed = candidateName.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeStr(trimmed.substring(0, commaIdx));
  }
  // Fallback: last space-delimited token
  const parts = trimmed.split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? trimmed);
}

/**
 * Extract normalized last name from a DB candidate fullName.
 * DB format: "First [Middle] Last" (title case).
 */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeStr(last);
}

// ---------------------------------------------------------------------------
// Cycle mapping
//
// election_period "2024-2026" → cycle "2026"
// election_period "2022-2024" → cycle "2024"
// ---------------------------------------------------------------------------

function electionPeriodToCycle(electionPeriod: string): string | null {
  const trimmed = electionPeriod.trim();
  // Extract end year from "YYYY-YYYY"
  const match = /^\d{4}-(\d{4})$/u.exec(trimmed);
  if (match) {
    return match[1] ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (HI state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-HI%'`);

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
// Step 3: Stream CSV, aggregate contributions
// ---------------------------------------------------------------------------

async function aggregateContributions(
  csvPath: string,
  byLastName: Map<string, DbCandidate[]>,
): Promise<{
  agg: Map<string, AggValue>;
  candidateMatchedNames: Map<string, Set<string>>;
  counters: { processed: number; filtered: number };
}> {
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  const counters = { processed: 0, filtered: 0 };

  // Cache resolved candidate_name → DbCandidate to avoid re-parsing identical names
  const candidateCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(rawName: string): DbCandidate | null {
    if (candidateCache.has(rawName)) return candidateCache.get(rawName) ?? null;

    const lastName = extractLastNameFromCsvName(rawName);
    if (!lastName) {
      candidateCache.set(rawName, null);
      return null;
    }

    const dbCandidates = byLastName.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      candidateCache.set(rawName, null);
      return null;
    }

    let match: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      match = dbCandidates[0] ?? null;
    } else {
      // Try to narrow by first name from the CSV candidate_name field.
      // Format: "Last, First" → extract first name after comma
      const trimmed = rawName.trim();
      const commaIdx = trimmed.indexOf(",");
      let rawFirst = "";
      if (commaIdx !== -1) {
        rawFirst = trimmed.substring(commaIdx + 1).trim().split(/\s+/u)[0] ?? "";
      }
      const normFirst = normalizeStr(rawFirst);

      if (normFirst) {
        const firstMatch = dbCandidates.find((c) => {
          const dbFirst = normalizeStr(
            c.fullName.trim().split(/\s+/u)[0] ?? "",
          );
          return dbFirst === normFirst;
        });
        match = firstMatch ?? dbCandidates[0] ?? null;
      } else {
        match = dbCandidates[0] ?? null;
      }
    }

    candidateCache.set(rawName, match);
    return match;
  }

  console.log(`[hi-cfb-donors] streaming ${csvPath} ...`);
  let loggedAt = 0;

  await streamCsv(csvPath, (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 5_000) {
      loggedAt = counters.processed;
      console.log(
        `[hi-cfb-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    // Only state legislature offices
    const office = (row["office"] ?? "").trim();
    if (!STATE_LEGISLATURE_OFFICES.has(office)) return;

    // Filter by date year >= 2024 OR election_period starts with "2024"
    const dateRaw = (row["date"] ?? "").trim();
    const year = dateRaw.substring(0, 4);
    const electionPeriod = (row["election_period"] ?? "").trim();
    const yearNum = Number.parseInt(year, 10);
    const epStartsWith2024 = electionPeriod.startsWith("2024");

    if (!epStartsWith2024 && (Number.isNaN(yearNum) || yearNum < 2024)) return;

    // Determine cycle from election_period
    const cycle = electionPeriodToCycle(electionPeriod);
    if (!cycle) return;

    const candidateName = (row["candidate_name"] ?? "").trim();
    if (!candidateName) return;

    const amountRaw = (row["amount"] ?? "").trim();
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Skip non-monetary contributions
    const nonMonetary = (row["non_monetary_yes_or_no"] ?? "").trim();
    if (nonMonetary === "Y") return;

    const dbCandidate = resolveCandidate(candidateName);
    if (!dbCandidate) return;

    // Classify contributor into a bucket
    const contribType = (row["contributor_type"] ?? "").trim();
    const employer = (row["employer"] ?? "").trim();
    const occupation = (row["occupation"] ?? "").trim();
    const contributorName = (row["contributor_name"] ?? "").trim();

    let bucket: DonorBucketLabel;

    if (contribType === "Individual") {
      // Individual: try employer → fallback to amount bucket
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket === "Self-funded") {
        bucket = "Self-funded";
      } else if (employerBucket !== null) {
        bucket = employerBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      // Non-individual: Business, Candidate, Noncandidate Committee, etc.
      // Use contributor_name to classify, fall back to "Other"
      const orgBucket =
        mapEmployerToBucket(contributorName) ??
        mapEmployerToBucket(employer) ??
        null;
      bucket = orgBucket ?? "Other";
    }

    // Accumulate
    const aggKey = `${dbCandidate.id}|${cycle}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.totalDollars += amount;
      existing.donorCount += 1;
    } else {
      agg.set(aggKey, {
        totalDollars: amount,
        donorCount: 1,
        candidateName,
      });
    }

    // Track which HI candidate names matched each DB candidate
    const matched = candidateMatchedNames.get(dbCandidate.id) ?? new Set();
    matched.add(candidateName);
    candidateMatchedNames.set(dbCandidate.id, matched);

    counters.filtered++;
  });

  return { agg, candidateMatchedNames, counters };
}

// ---------------------------------------------------------------------------
// Step 4: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateMatchedNames: Map<string, Set<string>>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    // Bucket labels can contain "|" so split on first two "|" only
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
        hiCandidateNames: matchedNames,
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

export async function ingestHiCfbDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<HiCfbIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[hi-cfb-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `[hi-cfb-donors] CSV not found at ${CSV_PATH} — download from ${SOURCE_URL}`,
    );
  }

  // Step 1: Load DB candidates (HI state only)
  console.log(`[hi-cfb-donors] querying DB for HI state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[hi-cfb-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[hi-cfb-donors] no HI state candidates found in DB — check jurisdiction='state-HI%'`,
    );
  }

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[hi-cfb-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Stream CSV and aggregate
  const { agg, candidateMatchedNames, counters } =
    await aggregateContributions(CSV_PATH, byLastName);

  console.log(
    `[hi-cfb-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[hi-cfb-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[hi-cfb-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: HiCfbIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[hi-cfb-donors] complete",
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
  ingestHiCfbDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[hi-cfb-donors] failed:", msg);
    process.exitCode = 1;
  });
}

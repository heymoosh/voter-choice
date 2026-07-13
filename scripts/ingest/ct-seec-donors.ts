/**
 * scripts/ingest/ct-seec-donors.ts
 *
 * Connecticut SEEC (State Elections Enforcement Commission) donor ingest.
 *
 * Reads /tmp/CT_2024_candidates.csv (~78K rows), filters to State Representative
 * and State Senator candidate committee rows for 2024, matches to CT candidates
 * in our DB by candidate last name (using the explicit Candidate Last Name column),
 * aggregates into donor buckets, and upserts into `donor_aggregates`.
 *
 * Source: CT SEEC eCRIS bulk export
 * https://seec.ct.gov/Portal/eCRIS/CurPreYears
 *
 * CSV header (41 columns, selected relevant ones):
 *   Committee, Contributor Name, District, Office Sought, Employer,
 *   Receipt Type, Committee Type, Transaction Date, File To State, Amount,
 *   Receipt State, Occupation, ElectionYear, ...,
 *   Contributor First Name, Contributor Middle Initial, Contributor Last Name,
 *   Candidate First Name, Candidate Middle Intial, Candidate Last Name, ...
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ct-seec-donors.ts [--dry-run] [--limit 50]
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

const CSV_PATH = "/tmp/CT_2024_candidates.csv";
const SOURCE = "ct_seec_bulk";
const SOURCE_URL = "https://seec.ct.gov/Portal/eCRIS/CurPreYears";
const ELECTION_CYCLE = "2024";

// Offices we want (normalized to uppercase for comparison)
const VALID_OFFICES = new Set(["STATE REPRESENTATIVE", "STATE SENATOR"]);

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
  committeeName: string;
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

export type CtSeecIngestCounts = {
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
// CT SEEC CSVs are comma-separated with double-quoted fields that may contain
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
        // Trim every field to handle padding (CT CSV has padded state field etc.)
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
// Name normalization
// ---------------------------------------------------------------------------

function normalizeStr(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/gu, "")
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
 * DB format: "First [Middle] Last" (title case).
 */
function extractFirstNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  return normalizeStr(parts[0] ?? "");
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (CT state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-CT%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 2: Build last-name index for DB candidates (maps last name → candidates)
// ---------------------------------------------------------------------------

function buildNameIndex(dbCandidates: DbCandidate[]): {
  byLastName: Map<string, DbCandidate[]>;
} {
  const byLastName = new Map<string, DbCandidate[]>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastNameFromDbName(candidate.fullName);
    if (!lastName) continue;

    const existing = byLastName.get(lastName) ?? [];
    existing.push(candidate);
    byLastName.set(lastName, existing);
  }

  return { byLastName };
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

  // Cache: "CandidateLastName|CandidateFirstName" → DbCandidate | null
  const candidateCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(
    candLastRaw: string,
    candFirstRaw: string,
  ): DbCandidate | null {
    const normLast = normalizeStr(candLastRaw);
    const normFirst = normalizeStr(candFirstRaw);
    const cacheKey = `${normLast}|${normFirst}`;

    if (candidateCache.has(cacheKey)) return candidateCache.get(cacheKey) ?? null;

    if (!normLast) {
      candidateCache.set(cacheKey, null);
      return null;
    }

    const dbCandidates = byLastName.get(normLast);
    if (!dbCandidates || dbCandidates.length === 0) {
      candidateCache.set(cacheKey, null);
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

    candidateCache.set(cacheKey, match);
    return match;
  }

  console.log(`[ct-seec-donors] streaming ${csvPath} ...`);
  let loggedAt = 0;

  await streamCsv(csvPath, (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 10_000) {
      loggedAt = counters.processed;
      console.log(
        `[ct-seec-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    // Filter: Office Sought must be State Representative or State Senator
    const officeSought = (row["Office Sought"] ?? "").toUpperCase();
    if (!VALID_OFFICES.has(officeSought)) return;

    // Filter: Committee Type must be "Candidate Committee"
    const committeeType = row["Committee Type"] ?? "";
    if (committeeType !== "Candidate Committee") return;

    // Filter: ElectionYear must be 2024
    const electionYear = row["ElectionYear"] ?? "";
    if (electionYear !== ELECTION_CYCLE) return;

    // Filter: Amount must be > 0
    const amountRaw = row["Amount"] ?? "";
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Filter: Exclude Non-Monetary and In-Kind receipt types
    const receiptType = row["Receipt Type"] ?? "";
    if (
      receiptType.includes("Non-Monetary") ||
      receiptType.includes("In-Kind") ||
      receiptType.toLowerCase().includes("in-kind") ||
      receiptType.toLowerCase().includes("non-monetary")
    )
      return;

    // Match to DB candidate using explicit candidate name columns
    const candLast = row["Candidate Last Name"] ?? "";
    const candFirst = row["Candidate First Name"] ?? "";

    const dbCandidate = resolveCandidate(candLast, candFirst);
    if (!dbCandidate) return;

    // Classify contributor into a bucket
    const employer = row["Employer"] ?? "";
    const occupation = row["Occupation"] ?? "";
    const contribFirstName = row["Contributor First Name"] ?? "";
    const contribLastName = row["Contributor Last Name"] ?? "";
    const committeeName = row["Committee"] ?? "";

    let bucket: DonorBucketLabel;

    // Check if this is an individual contribution
    const isIndividual = receiptType.includes("Individual");

    if (isIndividual) {
      // Self-funded: contributor name matches candidate name
      const normContribLast = normalizeStr(contribLastName);
      const normContribFirst = normalizeStr(contribFirstName);
      const normCandLast = normalizeStr(candLast);
      const normCandFirst = normalizeStr(candFirst);

      if (
        normContribLast === normCandLast &&
        normContribFirst === normCandFirst &&
        normContribLast !== ""
      ) {
        bucket = "Self-funded";
      } else {
        // Check employer for self-employment
        const employerBucket = mapEmployerToBucket(employer, occupation);
        if (employerBucket === "Self-funded") {
          bucket = "Self-funded";
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      }
    } else {
      // Non-individual (organization, PAC, etc.)
      const contributorName = row["Contributor Name"] ?? "";
      const orgName = contributorName || employer;
      const orgBucket = mapEmployerToBucket(orgName) ?? mapEmployerToBucket(employer);
      bucket = orgBucket ?? "Other";
    }

    // Accumulate
    const aggKey = `${dbCandidate.id}|${ELECTION_CYCLE}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.totalDollars += amount;
      existing.donorCount += 1;
    } else {
      agg.set(aggKey, {
        totalDollars: amount,
        donorCount: 1,
        committeeName,
      });
    }

    // Track which committee names matched each candidate
    const matched = candidateMatchedNames.get(dbCandidate.id) ?? new Set();
    matched.add(committeeName);
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
    // Split on first two "|" only (bucket labels won't contain "|" but be safe)
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
        ctSeecCommitteeNames: matchedNames,
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

export async function ingestCtSeecDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<CtSeecIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ct-seec-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `[ct-seec-donors] CSV not found at ${CSV_PATH} — download from ${SOURCE_URL}`,
    );
  }

  // Step 1: Load DB candidates (CT state only)
  console.log(`[ct-seec-donors] querying DB for CT state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[ct-seec-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[ct-seec-donors] no CT state candidates found in DB — check jurisdiction='state-CT%'`,
    );
  }

  // Step 2: Build last-name index
  const { byLastName } = buildNameIndex(dbCandidates);
  console.log(
    `[ct-seec-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Stream CSV and aggregate
  const { agg, candidateMatchedNames, counters } =
    await aggregateContributions(CSV_PATH, byLastName);

  console.log(
    `[ct-seec-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[ct-seec-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ct-seec-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: CtSeecIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ct-seec-donors] complete",
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
  ingestCtSeecDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ct-seec-donors] failed:", msg);
    process.exitCode = 1;
  });
}

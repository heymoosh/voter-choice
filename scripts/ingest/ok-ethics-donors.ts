/**
 * scripts/ingest/ok-ethics-donors.ts
 *
 * Oklahoma Ethics Commission donor ingest.
 *
 * Reads /tmp/OK_2024_contributions.zip, streams the enclosed CSV directly via
 * `unzip -p` (no full extraction needed), filters to Candidate Committee
 * Monetary contributions for 2024, matches Candidate Name to OK state
 * candidates in our DB by normalized last name, aggregates into donor buckets,
 * and upserts into `donor_aggregates`.
 *
 * Source: Oklahoma Ethics Commission bulk data download
 * https://guardian.ok.gov/PublicSite/Docs/BulkDataDownloads/
 *
 * CSV columns (comma-separated, all quoted, latin-1 encoding):
 *   Receipt ID, Org ID, Receipt Type, Receipt Date, Receipt Amount,
 *   Description, Receipt Source Type, Last Name, First Name, Middle Name,
 *   Suffix, Address 1, Address 2, City, State, Zip, Filed Date,
 *   Committee Type, Committee Name, Candidate Name, Amended,
 *   Employer, Occupation
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ok-ethics-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
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

const ZIP_PATH = "/tmp/OK_2024_contributions.zip";
const CSV_ENTRY = "2024_ContributionLoanExtract.csv";
const ELECTION_CYCLE = "2024";
const SOURCE = "ok_ethics_bulk";
const SOURCE_URL =
  "https://guardian.ok.gov/PublicSite/Docs/BulkDataDownloads/";

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
  candidateName: string; // OK CSV "Candidate Name" that matched
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

export type OkEthicsIngestCounts = {
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
// CSV parser — handles double-quoted fields with embedded commas / escaped quotes
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

// ---------------------------------------------------------------------------
// Stream the ZIP file's named CSV entry line-by-line via `unzip -p`
// The file is latin-1 encoded; Node's readline handles byte streams, and
// we strip any latin-1 high-byte characters that appear in names/addresses.
// ---------------------------------------------------------------------------

async function streamZipCsv(
  zipPath: string,
  entryName: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, entryName], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });

    let headers: string[] | null = null;
    let errOutput = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      errOutput += chunk.toString();
    });

    rl.on("line", (line) => {
      // Strip latin-1 high-byte artifacts that appear as replacement chars
      const trimmed = line.replace(/�/gu, "").trim();
      if (!trimmed) return;

      const fields = parseCsvLine(trimmed);

      if (headers === null) {
        // Strip BOM if present on first field
        headers = fields.map((h) =>
          h.replace(/^﻿/, "").replace(/^\xEF\xBB\xBF/, "").trim(),
        );
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

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(
          new Error(`unzip exited with code ${code}: ${errOutput.trim()}`),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the OK CSV "Receipt Date" (format MM/DD/YYYY) falls in
 * the target election cycle year.
 */
function isInElectionCycle(receiptDate: string, cycle: string): boolean {
  const trimmed = receiptDate.trim();
  if (!trimmed) return false;

  // Fast path: "MM/DD/YYYY" — check last 4 chars
  if (trimmed.length >= 4) {
    const yearPart = trimmed.slice(-4);
    if (/^\d{4}$/u.test(yearPart)) {
      return yearPart === cycle;
    }
  }

  // Fallback: parse the date
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return false;
  return String(parsed.getFullYear()) === cycle;
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
 * Extract last name from an OK CSV "Candidate Name" field.
 * Format: "FIRST [MIDDLE] LAST" (all caps, space-separated).
 * Strategy: take the last space-delimited word, skipping known suffixes.
 */
const NAME_SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function extractLastNameFromCsvName(candidateName: string): string {
  const tokens = normalizeStr(candidateName)
    .split(/\s+/u)
    .filter(Boolean);
  if (tokens.length === 0) return "";

  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i] ?? "";
    if (!NAME_SUFFIXES.has(tok)) {
      return tok;
    }
  }

  return tokens[tokens.length - 1] ?? "";
}

/**
 * Extract last name from a DB candidate's fullName.
 * DB format: "First [Middle] Last" (title case, space-separated).
 */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeStr(last);
}

/**
 * Extract first name (first token) from a DB candidate fullName.
 * DB format: "First [Middle] Last".
 */
function extractFirstNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[0] ?? "");
}

/**
 * Extract first name (first token) from an OK CSV "Candidate Name".
 * Format: "FIRST [MIDDLE] LAST".
 */
function extractFirstNameFromCsvName(candidateName: string): string {
  const tokens = normalizeStr(candidateName).split(/\s+/u).filter(Boolean);
  return tokens[0] ?? "";
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (OK state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-OK%'`);

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
// Step 3: Stream ZIP CSV, aggregate contributions
// ---------------------------------------------------------------------------

async function aggregateContributions(
  zipPath: string,
  entryName: string,
  byLastName: Map<string, DbCandidate[]>,
): Promise<{
  agg: Map<string, AggValue>;
  candidateMatchedNames: Map<string, Set<string>>;
  counters: { processed: number; filtered: number };
}> {
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  const counters = { processed: 0, filtered: 0 };

  // Cache resolved candidate name → DbCandidate to avoid re-parsing identical
  // names thousands of times.
  const candidateCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(rawCandidateName: string): DbCandidate | null {
    if (candidateCache.has(rawCandidateName)) {
      return candidateCache.get(rawCandidateName) ?? null;
    }

    const lastName = extractLastNameFromCsvName(rawCandidateName);
    if (!lastName) {
      candidateCache.set(rawCandidateName, null);
      return null;
    }

    const dbCandidates = byLastName.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      candidateCache.set(rawCandidateName, null);
      return null;
    }

    let match: DbCandidate | null = null;

    if (dbCandidates.length === 1) {
      match = dbCandidates[0] ?? null;
    } else {
      // Try to disambiguate by first name
      const csvFirst = extractFirstNameFromCsvName(rawCandidateName);
      if (csvFirst) {
        const firstMatch = dbCandidates.find((c) => {
          const dbFirst = extractFirstNameFromDbName(c.fullName);
          return dbFirst === csvFirst;
        });
        match = firstMatch ?? dbCandidates[0] ?? null;
      } else {
        match = dbCandidates[0] ?? null;
      }
    }

    candidateCache.set(rawCandidateName, match);
    return match;
  }

  console.log(`[ok-ethics-donors] streaming ${zipPath}!${entryName} ...`);
  let loggedAt = 0;

  await streamZipCsv(zipPath, entryName, (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 50_000) {
      loggedAt = counters.processed;
      console.log(
        `[ok-ethics-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    // Filter 1: Only Candidate Committee rows
    const committeeType = (row["Committee Type"] ?? "").trim();
    if (committeeType !== "Candidate Committee") return;

    // Filter 2: Must have a non-empty Candidate Name
    const candidateName = (row["Candidate Name"] ?? "").trim();
    if (!candidateName) return;

    // Filter 3: Only Monetary contributions (skip Loan, In-Kind, etc.)
    const receiptType = (row["Receipt Type"] ?? "").trim();
    if (receiptType !== "Monetary") return;

    // Filter 4: Only positive amounts
    const amountRaw = (row["Receipt Amount"] ?? "").trim();
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Filter 5: Only 2024 contributions
    const receiptDate = (row["Receipt Date"] ?? "").trim();
    if (!isInElectionCycle(receiptDate, ELECTION_CYCLE)) return;

    // Match candidate name to DB candidate
    const dbCandidate = resolveCandidate(candidateName);
    if (!dbCandidate) return;

    // Classify contributor into a donor bucket
    const sourceType = (row["Receipt Source Type"] ?? "").trim();
    const employer = (row["Employer"] ?? "").trim();
    const occupation = (row["Occupation"] ?? "").trim();
    const lastName = (row["Last Name"] ?? "").trim();
    const firstName = (row["First Name"] ?? "").trim();
    const description = (row["Description"] ?? "").trim();

    let bucket: DonorBucketLabel;

    const sourceTypeLower = sourceType.toLowerCase();

    if (sourceTypeLower.includes("candidate") || sourceTypeLower.includes("self")) {
      // "Candidate (Self)" → Self-funded
      bucket = "Self-funded";
    } else if (sourceTypeLower.startsWith("individual")) {
      // Individual: use employer + occupation, fall back to amount bucketing
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket === "Self-funded") {
        // self-employed keyword hit — treat as amount-based individual
        bucket = bucketIndividualByAmount(amount);
      } else if (employerBucket !== null && employerBucket !== "Other") {
        bucket = employerBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else if (
      sourceTypeLower.includes("pac") ||
      sourceTypeLower.includes("political action")
    ) {
      // PAC / Political Action Committee: map by donor name or fall back to Other
      const orgName = lastName && !firstName ? lastName : `${lastName} ${firstName}`.trim();
      const orgBucket =
        mapEmployerToBucket(orgName) ??
        mapEmployerToBucket(description);
      bucket = orgBucket ?? "Other";
    } else if (sourceTypeLower.includes("party")) {
      bucket = "Party committees";
    } else {
      // Corporations, unions, other orgs: use contributor name or description
      const orgName = lastName && !firstName ? lastName : `${lastName} ${firstName}`.trim();
      const orgBucket =
        mapEmployerToBucket(orgName) ??
        mapEmployerToBucket(employer) ??
        mapEmployerToBucket(description);
      bucket = orgBucket ?? "Other";
    }

    // Accumulate into the aggregation map
    const aggKey = `${dbCandidate.id}|${ELECTION_CYCLE}|${bucket}`;
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

    // Track which OK candidate names matched each DB candidate
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
    // Split on first two "|" only — bucket labels may contain "|"
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1);

    if (!candidateId || !cycle || !bucketLabel) continue;
    if (value.totalDollars <= 0) continue;

    const matchedNames = [...(candidateMatchedNames.get(candidateId) ?? [])];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        okEthicsCandidateNames: matchedNames,
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

export async function ingestOkEthicsDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<OkEthicsIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ok-ethics-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load DB candidates (OK state only)
  console.log(`[ok-ethics-donors] querying DB for OK state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[ok-ethics-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[ok-ethics-donors] no OK state candidates found in DB — run state-votes.ts for STATE=OK first`,
    );
    console.warn(
      `[ok-ethics-donors] proceeding anyway — will match 0 contributions`,
    );
  }

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[ok-ethics-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Stream ZIP CSV and aggregate
  const { agg, candidateMatchedNames, counters } =
    await aggregateContributions(ZIP_PATH, CSV_ENTRY, byLastName);

  console.log(
    `[ok-ethics-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[ok-ethics-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ok-ethics-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: OkEthicsIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ok-ethics-donors] complete",
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
  ingestOkEthicsDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ok-ethics-donors] failed:", msg);
    process.exitCode = 1;
  });
}

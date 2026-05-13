/**
 * scripts/ingest/ne-nadc-donors.ts
 *
 * Nebraska Accountability and Disclosure Commission (NADC) donor ingest.
 *
 * Downloads the 2024 contribution bulk export from nadc-e.nebraska.gov,
 * streams the enclosed CSV directly via `unzip -p` (no full extraction
 * needed), filters to Candidate Committee Monetary contributions for 2024,
 * matches Candidate Name to NE state candidates in our DB by normalized
 * last name, aggregates into donor buckets, and upserts into
 * `donor_aggregates`.
 *
 * Source: NE NADC bulk data download
 * https://nadc-e.nebraska.gov/PublicSite/DataDownload.aspx
 * Direct URL: https://nadc-e.nebraska.gov/PublicSite/Docs/BulkDataDownloads/2024_ContributionLoanExtract.csv.zip
 *
 * CSV columns (comma-separated, double-quoted fields):
 *   Receipt ID, Org ID, Filer Type, Filer Name, Candidate Name,
 *   Receipt Transaction/Contribution Type, Other Funds Type, Receipt Date,
 *   Receipt Amount, Description, Contributor or Transaction Source Type,
 *   Contributor or Source Name (Individual Last Name), First Name, Middle Name,
 *   Suffix, Address 1, Address 2, City, State, Zip, Filed Date, Amended,
 *   Employer, Occupation
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ne-nadc-donors.ts [--dry-run] [--limit 50]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ne-nadc-donors.ts --local-file /path/to/file.zip
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
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

const NE_BULK_URL =
  "https://nadc-e.nebraska.gov/PublicSite/Docs/BulkDataDownloads/2024_ContributionLoanExtract.csv.zip";
const DEFAULT_CSV_PATH = "/tmp/NE_2024_contributions.zip";
const ELECTION_CYCLE = "2024";
const SOURCE = "ne_nadc_bulk";
const SOURCE_URL = "https://nadc-e.nebraska.gov/PublicSite/DataDownload.aspx";

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
  candidateName: string; // NE CSV "Candidate Name" that matched
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

export type NeNadcIngestCounts = {
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
  localFile: string | null;
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
  const localFileIdx = argv.indexOf("--local-file");
  const localFile = localFileIdx !== -1 ? (argv[localFileIdx + 1] ?? null) : null;
  return { dryRun, limit, localFile };
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
// Stream the ZIP file's CSV line-by-line via `unzip -p`
// The NE ZIP contains a single CSV file; no entry name needed.
// ---------------------------------------------------------------------------

async function streamZipCsv(
  zipPath: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // unzip -p with no entry name extracts the first (only) file in the archive
    const proc = spawn("unzip", ["-p", zipPath], {
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
 * Extract last name from an NE CSV "Candidate Name" field.
 * Format: "FIRST [MIDDLE] LAST" (all caps, space-separated).
 * Strategy: take the last space-delimited word.
 *
 * Edge cases handled:
 *   "SCOTT PRICE"          → "PRICE"
 *   "ELIZABETH OCONNOR"    → "OCONNOR"
 *   "DOUGLAS OERTWICH"     → "OERTWICH"
 *   "ROBERT E SORENSON JR" → "JR" (suffix) — we try last non-suffix word
 */

const NAME_SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function extractLastNameFromCsvName(candidateName: string): string {
  const tokens = normalizeStr(candidateName)
    .split(/\s+/u)
    .filter(Boolean);
  if (tokens.length === 0) return "";

  // Walk backwards, skip known suffixes
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i] ?? "";
    if (!NAME_SUFFIXES.has(tok)) {
      return tok;
    }
  }

  // All tokens were suffixes (very unlikely) — return last token
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
 * Extract first name (first token) from an NE CSV "Candidate Name".
 * Format: "FIRST [MIDDLE] LAST".
 */
function extractFirstNameFromCsvName(candidateName: string): string {
  const tokens = normalizeStr(candidateName).split(/\s+/u).filter(Boolean);
  return tokens[0] ?? "";
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

async function downloadToFile(url: string, destPath: string): Promise<void> {
  console.log(`[ne-nadc-donors] downloading ${url} → ${destPath}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "voter-choice-ne-nadc-donor-ingest" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  const mb = (buffer.byteLength / 1_048_576).toFixed(1);
  console.log(`[ne-nadc-donors] downloaded ${mb} MB`);
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (NE state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-NE%'`);

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

  console.log(`[ne-nadc-donors] streaming ${zipPath} ...`);
  let loggedAt = 0;

  await streamZipCsv(zipPath, (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 50_000) {
      loggedAt = counters.processed;
      console.log(
        `[ne-nadc-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    // Filter 1: Only Candidate Committee rows
    const filerType = (row["Filer Type"] ?? "").trim();
    if (filerType !== "Candidate Committee") return;

    // Filter 2: Only Monetary contributions (skip Loan, In-Kind, etc.)
    const contribType = (
      row["Receipt Transaction/Contribution Type"] ?? ""
    ).trim();
    if (contribType !== "Monetary") return;

    // Filter 3: Only positive amounts
    const amountRaw = (row["Receipt Amount"] ?? "").trim();
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Filter 4: Must have a candidate name that matches our DB
    const candidateName = (row["Candidate Name"] ?? "").trim();
    if (!candidateName) return;

    const dbCandidate = resolveCandidate(candidateName);
    if (!dbCandidate) return;

    // Classify contributor into a donor bucket
    const sourceType = (
      row["Contributor or Transaction Source Type"] ?? ""
    ).trim();
    const employer = (row["Employer"] ?? "").trim();
    const occupation = (row["Occupation"] ?? "").trim();
    const contributorLastName = (
      row["Contributor or Source Name (Individual Last Name)"] ?? ""
    ).trim();
    const contributorFirstName = (row["First Name"] ?? "").trim();
    const contributorOrgName =
      contributorLastName && !contributorFirstName
        ? contributorLastName
        : `${contributorLastName} ${contributorFirstName}`.trim();

    let bucket: DonorBucketLabel;

    const isIndividual = sourceType.toLowerCase().startsWith("individual");
    const isSelfCandidate =
      sourceType.toLowerCase().includes("self") ||
      sourceType.toLowerCase().includes("candidate");

    if (isSelfCandidate) {
      bucket = "Self-funded";
    } else if (isIndividual) {
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket === "Self-funded") {
        // mapEmployerToBucket returned Self-funded for self-employed keyword
        // in employer — treat as small/large individual instead
        bucket = bucketIndividualByAmount(amount);
      } else if (employerBucket !== null && employerBucket !== "Other") {
        bucket = employerBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      // Non-individual: Business, PAC, Political Party, Candidate Committee, etc.
      // Use contributor org name or source type to classify
      const orgName = contributorOrgName || employer;
      const orgBucket =
        mapEmployerToBucket(orgName) ??
        mapEmployerToBucket(employer) ??
        mapEmployerToBucket(sourceType);
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

    // Track which NE candidate names matched each DB candidate
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
        neNadcCandidateNames: matchedNames,
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

export async function ingestNeNadcDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<NeNadcIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ne-nadc-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Resolve local ZIP path: --local-file flag → default path → auto-download
  let csvPath = config.localFile ?? DEFAULT_CSV_PATH;
  if (!config.localFile && !fs.existsSync(csvPath)) {
    await downloadToFile(NE_BULK_URL, csvPath);
  } else if (!config.localFile) {
    console.log(`[ne-nadc-donors] using cached file at ${csvPath}`);
  }

  // Step 1: Load DB candidates (NE state only)
  console.log(`[ne-nadc-donors] querying DB for NE state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[ne-nadc-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[ne-nadc-donors] no NE state candidates found in DB — run state-votes-from-dump.ts STATE=NE first`,
    );
    console.warn(
      `[ne-nadc-donors] proceeding anyway — will match 0 contributions`,
    );
  }

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[ne-nadc-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Stream ZIP CSV and aggregate
  const { agg, candidateMatchedNames, counters } =
    await aggregateContributions(csvPath, byLastName);

  console.log(
    `[ne-nadc-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[ne-nadc-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ne-nadc-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: NeNadcIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ne-nadc-donors] complete",
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
  ingestNeNadcDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ne-nadc-donors] failed:", msg);
    process.exitCode = 1;
  });
}

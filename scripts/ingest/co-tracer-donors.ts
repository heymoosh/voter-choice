/**
 * scripts/ingest/co-tracer-donors.ts
 *
 * Phase E — Colorado TRACER campaign finance donor ingest.
 *
 * Reads /tmp/CO_2024_contributions.zip and /tmp/CO_2026_contributions.zip,
 * extracts CSVs, matches CandidateName to CO state candidates in our DB by
 * normalized last name, aggregates contributions into donor buckets, and
 * upserts into `donor_aggregates`.
 *
 * Source: Colorado TRACER bulk data
 * https://tracer.sos.colorado.gov/PublicSite/SearchPages/FilingSearch.aspx
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/co-tracer-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import extract from "extract-zip";
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

interface ZipSpec {
  zipPath: string;
  extractDir: string;
  csvName: string;
  /** Election cycle this file covers (used when date cannot be parsed) */
  defaultCycle: string;
}

const ZIP_SPECS: ZipSpec[] = [
  {
    zipPath: "/tmp/CO_2024_contributions.zip",
    extractDir: "/tmp/CO_2024_extracted",
    csvName: "2024_ContributionData.csv",
    defaultCycle: "2024",
  },
  {
    zipPath: "/tmp/CO_2026_contributions.zip",
    extractDir: "/tmp/CO_2026_extracted",
    csvName: "2026_ContributionData.csv",
    defaultCycle: "2026",
  },
];

const ELECTION_CYCLES = new Set(["2024", "2026"]);
const SOURCE = "co_tracer_bulk";
const SOURCE_URL =
  "https://tracer.sos.colorado.gov/PublicSite/SearchPages/FilingSearch.aspx";

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
  candidateName: string; // CO CandidateName that matched
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

export type CoTracerIngestCounts = {
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
// ZIP extraction
// ---------------------------------------------------------------------------

async function ensureExtracted(spec: ZipSpec): Promise<string> {
  const csvPath = path.join(spec.extractDir, spec.csvName);
  if (fs.existsSync(csvPath)) {
    console.log(
      `[co-tracer-donors] using existing extraction at ${spec.extractDir}`,
    );
    return csvPath;
  }
  console.log(
    `[co-tracer-donors] extracting ${spec.zipPath} → ${spec.extractDir} ...`,
  );
  fs.mkdirSync(spec.extractDir, { recursive: true });
  await extract(spec.zipPath, { dir: spec.extractDir });
  console.log(`[co-tracer-donors] extraction complete`);
  return csvPath;
}

// ---------------------------------------------------------------------------
// CSV streaming parser
//
// CO TRACER CSVs are comma-separated with double-quoted fields that may
// contain embedded commas and escaped double-quotes (""). Handles CRLF/LF.
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

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a CO CandidateName string.
 * CO format is "FIRST [MIDDLE...] LAST" (space-separated, last token is surname).
 * Also strips any trailing party tag like "(DEMOCRAT)" — but CO data uses
 * parens for nicknames, not party, so we strip parenthetical tokens at end.
 */
function extractLastNameFromCoName(candidateName: string): string {
  // Strip anything in parentheses (nicknames like "EDWARD (MAX) WOODFIN")
  const stripped = candidateName.replace(/\([^)]*\)/gu, "").trim();
  const parts = stripped.split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeName(last);
}

/**
 * Extract last name from a DB candidate fullName.
 * DB format is "First [Middle] Last" (title case).
 * Handles "Lynda Zamora Wilson" → "WILSON".
 */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeName(last);
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (CO state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-CO%'`);

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
// Step 3: Stream one CSV, aggregate contributions
// ---------------------------------------------------------------------------

async function aggregateCsvContributions(
  csvPath: string,
  defaultCycle: string,
  byLastName: Map<string, DbCandidate[]>,
  // Mutable: accumulated across both CSV files
  agg: Map<string, AggValue>,
  candidateMatchedNames: Map<string, Set<string>>, // candidateId → Set<CO CandidateName>
  counters: { processed: number; filtered: number },
): Promise<void> {
  // Build a quick lookup: normalized CO CandidateName → candidateId
  // We populate this lazily as we see new CandidateNames in the CSV.
  const coNameToCandidate = new Map<string, DbCandidate | null>();

  function resolveCoName(rawCandidateName: string): DbCandidate | null {
    const key = normalizeName(rawCandidateName);
    if (coNameToCandidate.has(key)) return coNameToCandidate.get(key) ?? null;

    const lastName = extractLastNameFromCoName(rawCandidateName);
    if (!lastName) {
      coNameToCandidate.set(key, null);
      return null;
    }

    const candidates = byLastName.get(lastName);
    if (!candidates || candidates.length === 0) {
      coNameToCandidate.set(key, null);
      return null;
    }

    // If multiple DB candidates share a last name, try to narrow by first name.
    // CO CandidateName is "FIRST ... LAST"; DB fullName is "First ... Last".
    const coFirst = normalizeName(
      rawCandidateName
        .replace(/\([^)]*\)/gu, "")
        .trim()
        .split(/\s+/u)[0] ?? "",
    );

    let match: DbCandidate | null = null;
    if (candidates.length === 1) {
      match = candidates[0] ?? null;
    } else {
      // Try first-name match among the group
      const firstNameMatch = candidates.find((c) => {
        const dbFirst = normalizeName(c.fullName.trim().split(/\s+/u)[0] ?? "");
        return dbFirst === coFirst;
      });
      match = firstNameMatch ?? candidates[0] ?? null;
    }

    coNameToCandidate.set(key, match);
    return match;
  }

  await streamCsv(csvPath, (row) => {
    counters.processed++;

    // Only process candidate committee records
    if (row["CommitteeType"] !== "Candidate Committee") return;

    const candidateName = row["CandidateName"] ?? "";
    if (!candidateName) return;

    // Determine election cycle from contribution date
    const dateStr = row["ContributionDate"] ?? "";
    const year = dateStr.substring(0, 4);
    const cycle = ELECTION_CYCLES.has(year) ? year : defaultCycle;

    // Parse amount
    const amountRaw = row["ContributionAmount"] ?? "";
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Match to DB candidate
    const dbCandidate = resolveCoName(candidateName);
    if (!dbCandidate) return;

    // Classify contributor into a bucket
    const contributorType = row["ContributorType"] ?? "";
    let bucket: DonorBucketLabel;

    const isIndividual =
      contributorType === "Individual" ||
      contributorType.startsWith("Individual (");

    if (isIndividual) {
      const employer = row["Employer"] ?? "";
      const occupation = row["Occupation"] ?? "";
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket === "Self-funded") {
        bucket = "Self-funded";
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      // Non-individual: committee, business, partnership, etc.
      // Use LastName (which may be a committee name for non-individual records)
      const lastName = row["LastName"] ?? "";
      const committeeName = row["CommitteeName"] ?? "";
      const orgName = lastName || committeeName;
      const orgBucket = mapEmployerToBucket(orgName);
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

    // Track which CO names matched each candidate
    const matched = candidateMatchedNames.get(dbCandidate.id) ?? new Set();
    matched.add(candidateName);
    candidateMatchedNames.set(dbCandidate.id, matched);

    counters.filtered++;
  });
}

// ---------------------------------------------------------------------------
// Step 4: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(agg: Map<string, AggValue>): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const parts = aggKey.split("|");
    const candidateId = parts[0];
    const cycle = parts[1];
    const bucket = parts.slice(2).join("|"); // in case bucket label contains |
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
        coTracerCandidateName: value.candidateName,
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

export async function ingestCoTracerDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<CoTracerIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[co-tracer-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load DB candidates (CO state only)
  console.log(`[co-tracer-donors] querying DB for CO state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(
    `[co-tracer-donors] db_candidates_found=${dbCandidates.length}`,
  );

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[co-tracer-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Process each ZIP file
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  const counters = { processed: 0, filtered: 0 };

  for (const spec of ZIP_SPECS) {
    if (!fs.existsSync(spec.zipPath)) {
      console.warn(
        `[co-tracer-donors] ZIP not found, skipping: ${spec.zipPath}`,
      );
      continue;
    }

    const csvPath = await ensureExtracted(spec);
    console.log(
      `[co-tracer-donors] streaming ${spec.csvName} (cycle default=${spec.defaultCycle}) ...`,
    );

    await aggregateCsvContributions(
      csvPath,
      spec.defaultCycle,
      byLastName,
      agg,
      candidateMatchedNames,
      counters,
    );

    console.log(
      `[co-tracer-donors] after ${spec.csvName}: rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
    );
  }

  console.log(
    `[co-tracer-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg);
  console.log(
    `[co-tracer-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[co-tracer-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: CoTracerIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[co-tracer-donors] complete",
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
  ingestCoTracerDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[co-tracer-donors] failed:", msg);
    process.exitCode = 1;
  });
}

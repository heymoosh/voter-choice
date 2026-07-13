/**
 * scripts/ingest/ny-boe-donors.ts
 *
 * Phase E — New York state donor ingest from NY BOE bulk campaign finance data.
 *
 * Reads three ZIP files:
 *   /tmp/NY_2024gen.zip  (2024gen.csv)
 *   /tmp/NY_2024pri.zip  (2024pri.csv)
 *   /tmp/NY_2024jul.zip  (2024jul.csv)
 *
 * Each ZIP contains a headerless CSV (56 columns, 0-based). Columns used:
 *   [0]  Filer ID
 *   [1]  Filer Name (committee name)
 *   [2]  Year
 *   [9]  Transaction type
 *   [15] Contributor type ("Individual", "Corporation", "LLC", ...)
 *   [22] Org name for non-Individual contributors
 *   [23] Contributor first name (Individual only)
 *   [25] Contributor last name (Individual only)
 *   [26] Contributor address
 *   [31] Payment method
 *   [34] Amount
 *   [38] Employer
 *   [39] Occupation
 *
 * Matches filer names to NY state candidates (`WHERE jurisdiction LIKE 'state-NY%'`)
 * by extracting the candidate last name from the committee name, then aggregates
 * 2024 contributions into donor buckets, and upserts into `donor_aggregates`.
 *
 * Source: NY Board of Elections Campaign Finance
 * https://publicreporting.elections.ny.gov/DownloadCampaignFinanceData/DownloadCampaignFinanceData
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ny-boe-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
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

/** ZIP files and the CSV entry they contain. */
const ZIP_ENTRIES: Array<{ zipPath: string; csvEntry: string }> = [
  { zipPath: "/tmp/NY_2024gen.zip", csvEntry: "2024gen.csv" },
  { zipPath: "/tmp/NY_2024pri.zip", csvEntry: "2024pri.csv" },
  { zipPath: "/tmp/NY_2024jul.zip", csvEntry: "2024jul.csv" },
];

const ELECTION_CYCLE = "2024";
const SOURCE = "ny_boe_bulk";
const SOURCE_URL =
  "https://publicreporting.elections.ny.gov/DownloadCampaignFinanceData/DownloadCampaignFinanceData";

// Column indices (0-based) — no header row
const COL_FILER_ID = 0;
const COL_FILER_NAME = 1;
const COL_TRANSACTION_TYPE = 9;
const COL_CONTRIBUTOR_TYPE = 15;
const COL_ORG_NAME = 22; // non-Individual contributor name
const COL_FIRST_NAME = 23; // Individual only
const COL_LAST_NAME = 25; // Individual only
const COL_AMOUNT = 34;
const COL_EMPLOYER = 38;
const COL_OCCUPATION = 39;

const MIN_COLS = 40; // rows shorter than this are malformed

// Log progress every N rows processed
const LOG_EVERY_N_ROWS = 100_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

interface FilerInfo {
  filerId: string;
  filerName: string;
  extractedLastName: string; // normalized
}

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

export type NyBoeIngestCounts = {
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
// CSV streaming via `unzip -p`
//
// Streams a single file from the ZIP without extracting to disk.
// NY BOE CSVs are comma-separated with double-quoted fields.
// Handles CRLF and LF. The CSVs have NO header row.
// ---------------------------------------------------------------------------

/**
 * Open a readable stream for a file inside the ZIP using `unzip -p`.
 */
function openZipEntry(zipPath: string, entryPath: string): Readable {
  const child = spawn("unzip", ["-p", zipPath, entryPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    if (msg) console.warn(`[ny-boe-donors] unzip stderr: ${msg}`);
  });

  child.on("error", (err) => {
    console.error(`[ny-boe-donors] unzip process error: ${err.message}`);
  });

  return child.stdout as unknown as Readable;
}

/**
 * Parse a single CSV line respecting double-quoted fields (may contain commas
 * and escaped double-quotes ""). Handles CRLF.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
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
 * Stream a headerless CSV from inside a ZIP, calling `onRow` with a string[]
 * for each data row. Skips blank lines.
 */
async function streamZipCsv(
  zipPath: string,
  entryPath: string,
  onRow: (cols: string[]) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = openZipEntry(zipPath, entryPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      const trimmed = line.trimEnd();
      if (!trimmed) return;
      const cols = parseCsvLine(trimmed);
      onRow(cols);
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
  // NFD-normalize to decompose accented chars (é→e+combining), then strip combining marks
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeForLookup(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract a candidate last name from a NY BOE committee/filer name.
 *
 * Patterns:
 *   "Friends of JOHN SMITH 2024"          → "SMITH" (last word before year)
 *   "Friends of Ted Danz"                 → "DANZ"  (last word)
 *   "SMITH for Assembly"                  → "SMITH" (first word)
 *   "JOHN SMITH FOR SENATE 2024"          → "SMITH" (word before FOR)
 *   "Linda Rosenthal For Assembly"        → "ROSENTHAL" (word before FOR)
 *   "Committee to Elect Stephanie Liggio" → "LIGGIO" (last word)
 *   "Smith-Jones Assembly Committee"      → "SMITH-JONES" (first word, hyphen ok)
 *   "Jim  Politi"                         → "POLITI" (last word)
 *
 * Strategy:
 * 1. Strip trailing year (4-digit number)
 * 2. If "FOR" appears, take text before "FOR" as the candidate name segment
 * 3. Otherwise use the full filer name
 * 4. Within the candidate segment, strip leading "Friends of", "Committee to Elect",
 *    "Committee for", "Committee to re-elect", "Citizens for", "People for"
 * 5. Take the last space-delimited token as the last name
 * 6. Skip tokens that are clearly not a person's last name (single chars, "THE", etc.)
 */
function extractLastNameFromFilerName(filerName: string): string {
  if (!filerName.trim()) return "";

  let name = normalizeName(filerName);

  // Strip trailing year
  name = name.replace(/\s+\d{4}\s*$/u, "").trim();

  // If contains " FOR ", take everything before it as the candidate segment
  const forIdx = /\bFOR\b/u.exec(name)?.index;
  if (forIdx !== undefined && forIdx > 0) {
    name = name.substring(0, forIdx).trim();
  }

  // Strip common prefixes that aren't part of the name
  const prefixes = [
    /^FRIENDS\s+OF\s+/u,
    /^COMMITTEE\s+TO\s+RE-?ELECT\s+/u,
    /^COMMITTEE\s+TO\s+ELECT\s+/u,
    /^COMMITTEE\s+FOR\s+/u,
    /^CITIZENS\s+FOR\s+/u,
    /^PEOPLE\s+FOR\s+/u,
    /^ELECT\s+/u,
    /^RE-ELECT\s+/u,
  ];
  for (const prefix of prefixes) {
    name = name.replace(prefix, "").trim();
  }

  // Take last space-delimited token
  const parts = name.split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";

  // If last token is a suffix like "JR", "SR", "II", "III", "IV", use second-to-last
  const suffixes = new Set(["JR", "SR", "II", "III", "IV", "ESQ"]);
  let lastName = parts[parts.length - 1]!;
  if (suffixes.has(lastName) && parts.length >= 2) {
    lastName = parts[parts.length - 2]!;
  }

  // Skip if token is trivially short (single char) or a stop word
  const stopWords = new Set(["NY", "NEW", "YORK", "THE", "FOR", "OF", "AND"]);
  if (lastName.length <= 1 || stopWords.has(lastName)) return "";

  return normalizeForLookup(lastName);
}

/**
 * Extract last name from a DB candidate's full name (e.g., "First Last" or "Last, First").
 */
function extractLastNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeForLookup(trimmed.substring(0, commaIdx));
  }
  const parts = trimmed.split(/\s+/u);
  return normalizeForLookup(parts[parts.length - 1] ?? trimmed);
}

// ---------------------------------------------------------------------------
// Step 1: First pass — collect unique filer IDs and filer names from all ZIPs
// ---------------------------------------------------------------------------

async function collectFilers(): Promise<Map<string, FilerInfo>> {
  const byId = new Map<string, FilerInfo>();

  for (const { zipPath, csvEntry } of ZIP_ENTRIES) {
    console.log(
      `[ny-boe-donors] scanning filers in ${csvEntry} from ${zipPath} ...`,
    );

    let rowCount = 0;
    await streamZipCsv(zipPath, csvEntry, (cols) => {
      if (cols.length < MIN_COLS) return;
      if (!cols[COL_TRANSACTION_TYPE]?.includes("Contribution")) return;

      const filerId = cols[COL_FILER_ID]?.trim() ?? "";
      const filerName = cols[COL_FILER_NAME]?.trim() ?? "";
      if (!filerId || !filerName) return;

      if (!byId.has(filerId)) {
        const extractedLastName = extractLastNameFromFilerName(filerName);
        byId.set(filerId, { filerId, filerName, extractedLastName });
      }

      rowCount++;
      if (rowCount % LOG_EVERY_N_ROWS === 0) {
        console.log(
          `[ny-boe-donors]   ${csvEntry}: scanned ${rowCount} contribution rows`,
        );
      }
    });

    console.log(
      `[ny-boe-donors] ${csvEntry}: done — filers_seen=${byId.size}`,
    );
  }

  return byId;
}

// ---------------------------------------------------------------------------
// Step 2: Query DB candidates
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-NY%'`);

  const rows = limit !== null ? await query.limit(limit) : await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 3: Match DB candidates to filers by last name
// ---------------------------------------------------------------------------

interface MatchResult {
  filerToCandidate: Map<string, string>; // filerId → candidateId
  candidateToFilerNames: Map<string, string[]>; // candidateId → filerNames
  matchedCandidateCount: number;
}

function matchCandidatesToFilers(
  dbCandidates: DbCandidate[],
  filerById: Map<string, FilerInfo>,
): MatchResult {
  // Build index: normalizedLastName → FilerInfo[]
  const byLastName = new Map<string, FilerInfo[]>();
  for (const filer of filerById.values()) {
    const key = filer.extractedLastName;
    if (!key) continue;
    const existing = byLastName.get(key) ?? [];
    existing.push(filer);
    byLastName.set(key, existing);
  }

  const filerToCandidate = new Map<string, string>();
  const candidateToFilerNames = new Map<string, string[]>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastNameFromFullName(candidate.fullName);
    if (!lastName) continue;

    const filers = byLastName.get(lastName);
    if (!filers || filers.length === 0) continue;

    const names: string[] = [];
    for (const filer of filers) {
      filerToCandidate.set(filer.filerId, candidate.id);
      names.push(filer.filerName);
    }
    candidateToFilerNames.set(candidate.id, names);
  }

  return {
    filerToCandidate,
    candidateToFilerNames,
    matchedCandidateCount: candidateToFilerNames.size,
  };
}

// ---------------------------------------------------------------------------
// Step 4: Stream all ZIPs again, aggregate matched contributions
// ---------------------------------------------------------------------------

async function aggregateContributions(
  filerToCandidate: Map<string, string>,
  filerById: Map<string, FilerInfo>,
): Promise<Map<string, AggValue>> {
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();

  let totalRowsProcessed = 0;
  let totalFiltered = 0;

  for (const { zipPath, csvEntry } of ZIP_ENTRIES) {
    console.log(
      `[ny-boe-donors] aggregating contributions from ${csvEntry} ...`,
    );
    let rowsProcessed = 0;
    let filtered = 0;

    await streamZipCsv(zipPath, csvEntry, (cols) => {
      rowsProcessed++;

      if (cols.length < MIN_COLS) return;

      // Filter: must be a contribution transaction
      const txType = cols[COL_TRANSACTION_TYPE]?.trim() ?? "";
      if (!txType.includes("Contribution")) return;

      // Filter: must map to a matched filer
      const filerId = cols[COL_FILER_ID]?.trim() ?? "";
      const candidateId = filerToCandidate.get(filerId);
      if (!candidateId) return;

      // Filter: amount must be positive numeric
      const amountRaw = cols[COL_AMOUNT]?.trim() ?? "";
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      // Classify contributor
      const contributorType = cols[COL_CONTRIBUTOR_TYPE]?.trim() ?? "";
      let bucket: DonorBucketLabel;

      if (contributorType === "Individual") {
        const employer = cols[COL_EMPLOYER]?.trim() ?? "";
        const occupation = cols[COL_OCCUPATION]?.trim() ?? "";
        const employerBucket = mapEmployerToBucket(employer, occupation);
        if (employerBucket !== null) {
          bucket = employerBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Corporation, LLC, Partnership, Political Committee, Other, etc.
        const orgName = cols[COL_ORG_NAME]?.trim() ?? "";
        const employerBucket = mapEmployerToBucket(orgName);
        bucket = employerBucket ?? "Other";
      }

      const aggKey = `${candidateId}|${ELECTION_CYCLE}|${bucket}`;
      const existing = agg.get(aggKey);
      const filerName = filerById.get(filerId)?.filerName ?? "";
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

      filtered++;

      if (rowsProcessed % LOG_EVERY_N_ROWS === 0) {
        console.log(
          `[ny-boe-donors]   ${csvEntry}: rows=${rowsProcessed} matched=${filtered}`,
        );
      }
    });

    console.log(
      `[ny-boe-donors] ${csvEntry}: done — rows=${rowsProcessed} matched=${filtered}`,
    );
    totalRowsProcessed += rowsProcessed;
    totalFiltered += filtered;
  }

  console.log(
    `[ny-boe-donors] aggregation complete: total_rows=${totalRowsProcessed} matched_contributions=${totalFiltered} agg_buckets=${agg.size}`,
  );

  return agg;
}

// ---------------------------------------------------------------------------
// Step 5: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateToFilerNames: Map<string, string[]>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const parts = aggKey.split("|");
    const candidateId = parts[0];
    const cycle = parts[1];
    const bucket = parts.slice(2).join("|"); // bucket labels may not contain "|" but be safe
    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const filerNames = candidateToFilerNames.get(candidateId) ?? [];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        filerNames,
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

export async function ingestNyBoeDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<NyBoeIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ny-boe-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Collect unique filers from all ZIPs
  console.log(`[ny-boe-donors] pass 1: collecting filer names ...`);
  const filerById = await collectFilers();
  console.log(`[ny-boe-donors] unique_filers=${filerById.size}`);

  // Step 2: Load DB candidates (NY state only)
  console.log(`[ny-boe-donors] querying DB for NY state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(
    `[ny-boe-donors] db_candidates_found=${dbCandidates.length}`,
  );

  // Step 3: Match candidates to filers by last name
  const { filerToCandidate, candidateToFilerNames, matchedCandidateCount } =
    matchCandidatesToFilers(dbCandidates, filerById);
  console.log(
    `[ny-boe-donors] candidates_matched=${matchedCandidateCount} filer_ids_matched=${filerToCandidate.size}`,
  );

  if (filerToCandidate.size === 0) {
    console.warn(
      `[ny-boe-donors] no filer matches found — check candidate last names against NY BOE filer names`,
    );
  }

  // Step 4: Stream contributions and aggregate
  console.log(`[ny-boe-donors] pass 2: aggregating contributions ...`);
  const agg = await aggregateContributions(filerToCandidate, filerById);

  // Step 5: Build upsert rows
  const rows = buildUpsertRows(agg, candidateToFilerNames);
  console.log(`[ny-boe-donors] rows_to_upsert=${rows.length}`);

  // Step 6: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ny-boe-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const contribsFiltered = rows.reduce(
    (sum, r) =>
      sum + ((r.rawMetadata as { donorCount?: number }).donorCount ?? 0),
    0,
  );

  const counts: NyBoeIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: matchedCandidateCount,
    contribsFiltered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ny-boe-donors] complete",
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
  ingestNyBoeDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ny-boe-donors] failed:", msg);
    process.exitCode = 1;
  });
}

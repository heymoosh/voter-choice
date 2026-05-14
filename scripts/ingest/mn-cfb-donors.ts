/**
 * scripts/ingest/mn-cfb-donors.ts
 *
 * Minnesota Campaign Finance Board (CFB) donor ingest.
 *
 * Reads /tmp/MN_contributions.csv (unzipped, ~80 MB), filters to PCC
 * (Principal Campaign Committee) rows for 2024 and 2026, matches recipient
 * committee names to MN state candidates in our DB by normalized last name,
 * aggregates into donor buckets, and upserts into `donor_aggregates`.
 *
 * Source: MN CFB bulk data
 * https://cfb.mn.gov/reports-and-data/self-help/data-downloads/campaign-finance/
 *
 * CSV header (15 columns):
 *   "Recipient reg num",Recipient,"Recipient type","Recipient subtype",
 *   Amount,"Receipt date",Year,Contributor,"Contrib Reg Num","Contrib type",
 *   "Receipt type","In kind?","In-kind descr","Contrib zip","Contrib Employer name"
 *
 * Recipient name formats (non-exhaustive):
 *   "Baker, David (Dave) House Committee"  → last name "Baker"
 *   "Fernandez Mejia, Edelgard House Committee" → last name "Fernandez Mejia"
 *   "Walz, Tim Gov Committee"              → last name "Walz"
 *   "Jones For House Committee"            → last name "Jones"
 *   "ANDERSON SENATE COMMITTEE"            → last name "Anderson"
 *   "Nash, Jim House Committee"            → last name "Nash"
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mn-cfb-donors.ts [--dry-run] [--limit 50]
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

const CSV_PATH = "/tmp/MN_contributions.csv";
const ELECTION_CYCLES = new Set(["2022", "2024", "2026"]);
const SOURCE = "mn_cfb_bulk";
const SOURCE_URL =
  "https://cfb.mn.gov/reports-and-data/self-help/data-downloads/campaign-finance/";

// Noise words in committee names — strip these before extracting last name
const COMMITTEE_NOISE_WORDS = new Set([
  "COMMITTEE",
  "FOR",
  "HOUSE",
  "SENATE",
  "GOV",
  "GOVERNOR",
  "ATTY",
  "GEN",
  "GENERAL",
  "SEC",
  "STATE",
  "DIST",
  "COURT",
  "SUP",
  "AUD",
  "TREASURER",
  "TREAS",
  "REP",
  "REPRESENTATIVE",
  "SENATOR",
  "CAMPAIGN",
  "COMMITTEE",
  "POLITICAL",
  "FUND",
  "MN",
  "MINNESOTA",
]);

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
  recipientName: string; // MN Recipient name that matched
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

export type MnCfbIngestCounts = {
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
// MN CFB CSVs are comma-separated with double-quoted fields that may contain
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
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/gu, "") // strip punctuation
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a MN CFB Recipient committee name.
 *
 * Handles multiple formats:
 *   1. "Last, First [Middle] [Nickname] [Office] Committee"
 *      → everything before the comma
 *   2. "First Last For [Office] Committee"
 *      → word before "For" (when "For" appears)
 *   3. "LAST OFFICE COMMITTEE" (all-caps, no comma, no "For")
 *      → first word (if it's not a noise word)
 *   4. "First Last Office Committee" (title case, no comma, no "For")
 *      → try to pick non-noise word
 */
function extractLastNameFromRecipient(recipientName: string): string {
  const trimmed = recipientName.trim();

  // Format 1: "Last, First ..." — comma is the delimiter
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    const lastName = trimmed.substring(0, commaIdx).trim();
    return normalizeStr(lastName);
  }

  // Normalize to uppercase for pattern matching
  const upper = normalizeStr(trimmed);
  const tokens = upper.split(/\s+/u).filter(Boolean);

  // Format 2: "FIRST [MIDDLE] LAST FOR OFFICE COMMITTEE"
  // Find "FOR" and take the token immediately before it
  const forIdx = tokens.indexOf("FOR");
  if (forIdx > 0) {
    const beforeFor = tokens[forIdx - 1] ?? "";
    if (beforeFor && !COMMITTEE_NOISE_WORDS.has(beforeFor)) {
      return beforeFor;
    }
  }

  // Format 3 / 4: No comma, no "For" — filter out noise words and
  // take the first remaining token (committee names usually start with
  // the last name when no comma/For format is used).
  const meaningful = tokens.filter((t) => !COMMITTEE_NOISE_WORDS.has(t));
  if (meaningful.length > 0) {
    return meaningful[0] ?? "";
  }

  // Fallback: return first token as-is
  return tokens[0] ?? "";
}

/**
 * Extract normalized last name from a DB candidate fullName.
 * DB format: "First [Middle] Last" (title case).
 * "Fernandez Mejia, Edelgard" won't occur in DB — DB names are space-separated.
 */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1] ?? "";
  return normalizeStr(last);
}

// ---------------------------------------------------------------------------
// Step 1: Query DB candidates (MN state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-MN%'`);

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

  // Cache resolved recipient → DbCandidate to avoid re-parsing identical
  // committee names thousands of times.
  const recipientCache = new Map<string, DbCandidate | null>();

  function resolveRecipient(rawName: string): DbCandidate | null {
    if (recipientCache.has(rawName)) return recipientCache.get(rawName) ?? null;

    const lastName = extractLastNameFromRecipient(rawName);
    if (!lastName) {
      recipientCache.set(rawName, null);
      return null;
    }

    const dbCandidates = byLastName.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      recipientCache.set(rawName, null);
      return null;
    }

    let match: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      match = dbCandidates[0] ?? null;
    } else {
      // Try to narrow by first name from the Recipient field.
      // For "Baker, David (Dave) House Committee" → first name token is "David"
      // For "Jones For House Committee" → first token before "For" is "Jones" (= last name, skip)
      const trimmed = rawName.trim();
      const commaIdx = trimmed.indexOf(",");
      let rawFirst = "";
      if (commaIdx !== -1) {
        // "Last, First [...]" → take first word after comma
        const afterComma = trimmed.substring(commaIdx + 1).trim();
        // Strip parenthetical nicknames: "David (Dave)" → "David"
        rawFirst = afterComma.replace(/\([^)]*\)/gu, "").trim().split(/\s+/u)[0] ?? "";
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

    recipientCache.set(rawName, match);
    return match;
  }

  console.log(`[mn-cfb-donors] streaming ${csvPath} ...`);
  let loggedAt = 0;

  await streamCsv(csvPath, (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 100_000) {
      loggedAt = counters.processed;
      console.log(
        `[mn-cfb-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    // Only PCC (Principal Campaign Committee) rows
    if (row["Recipient type"] !== "PCC") return;

    // Only 2024 and 2026
    const year = (row["Year"] ?? "").trim();
    if (!ELECTION_CYCLES.has(year)) return;

    const recipientName = row["Recipient"] ?? "";
    if (!recipientName) return;

    const amountRaw = (row["Amount"] ?? "").trim();
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const dbCandidate = resolveRecipient(recipientName);
    if (!dbCandidate) return;

    // Classify contributor into a bucket
    const contribType = (row["Contrib type"] ?? "").trim();
    const employer = (row["Contrib Employer name"] ?? "").trim();
    const contributorName = (row["Contributor"] ?? "").trim();

    let bucket: DonorBucketLabel;

    const isIndividual = contribType.toLowerCase().startsWith("individual");

    if (isIndividual) {
      // Check self-funded first (contributor == candidate or "Self" contrib type)
      const receiptType = (row["Receipt type"] ?? "").trim();
      if (receiptType === "Self" || contribType.toLowerCase() === "self") {
        bucket = "Self-funded";
      } else {
        const employerBucket = mapEmployerToBucket(employer);
        if (employerBucket === "Self-funded") {
          bucket = "Self-funded";
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      }
    } else {
      // Non-individual: Business, Political committee/fund, Party Unit, etc.
      // Use contributor name or employer to classify
      const orgName = contributorName || employer;
      const orgBucket = mapEmployerToBucket(orgName) ?? mapEmployerToBucket(employer);
      bucket = orgBucket ?? "Other";
    }

    // Accumulate
    const aggKey = `${dbCandidate.id}|${year}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.totalDollars += amount;
      existing.donorCount += 1;
    } else {
      agg.set(aggKey, {
        totalDollars: amount,
        donorCount: 1,
        recipientName,
      });
    }

    // Track which MN recipient names matched each candidate
    const matched = candidateMatchedNames.get(dbCandidate.id) ?? new Set();
    matched.add(recipientName);
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
    // Bucket labels can contain "|" (e.g., "Issue-aligned PACs — X") so split
    // on the first two "|" only.
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
        mnCfbRecipientNames: matchedNames,
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

export async function ingestMnCfbDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<MnCfbIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[mn-cfb-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `[mn-cfb-donors] CSV not found at ${CSV_PATH} — download from ${SOURCE_URL}`,
    );
  }

  // Step 1: Load DB candidates (MN state only)
  console.log(`[mn-cfb-donors] querying DB for MN state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[mn-cfb-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[mn-cfb-donors] no MN state candidates found in DB — check jurisdiction='state-MN%'`,
    );
  }

  // Step 2: Build last-name index
  const byLastName = buildLastNameIndex(dbCandidates);
  console.log(
    `[mn-cfb-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 3: Stream CSV and aggregate
  const { agg, candidateMatchedNames, counters } =
    await aggregateContributions(CSV_PATH, byLastName);

  console.log(
    `[mn-cfb-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 4: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedNames);
  console.log(
    `[mn-cfb-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[mn-cfb-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: MnCfbIngestCounts = {
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedNames.size,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[mn-cfb-donors] complete",
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
  ingestMnCfbDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[mn-cfb-donors] failed:", msg);
    process.exitCode = 1;
  });
}

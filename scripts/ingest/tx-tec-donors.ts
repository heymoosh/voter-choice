/**
 * scripts/ingest/tx-tec-donors.ts
 *
 * Phase E — Texas state donor ingest from TEC bulk campaign finance data.
 *
 * Reads /tmp/TEC_CF_CSV.zip, extracts to /tmp/TEC_CF_extracted/ (once),
 * matches TEC filers to our TX state candidates by last-name similarity,
 * aggregates 2024 and 2026 contributions into donor buckets, and upserts
 * into `donor_aggregates`.
 *
 * Source: Texas Ethics Commission bulk data
 * https://www.ethics.state.tx.us/data/search/cf/
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/tx-tec-donors.ts [--dry-run] [--limit 50]
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

const ZIP_PATH = "/tmp/TEC_CF_CSV.zip";
const EXTRACT_DIR = "/tmp/TEC_CF_extracted";
const ELECTION_CYCLES = ["2022", "2024", "2026"];
const SOURCE = "tec_bulk";
const SOURCE_URL = "https://www.ethics.state.tx.us/data/search/cf/";
const TEC_STATE_OFFICE_CODES = new Set(["STATEREP", "STATESENATE", "STATESEN"]);
const LOG_EVERY_N_FILES = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

interface TecFilerInfo {
  filerIdent: string;
  filerName: string;
  filerNameLast: string;
  officeCode: string;
  district: string;
}

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
  rawMetadata: unknown;
}

interface AggKey {
  candidateId: string;
  cycle: string;
  bucket: DonorBucketLabel;
}

interface AggValue {
  totalDollars: number;
  donorCount: number;
  filerIdent: string;
  officeCd: string;
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

export type TecIngestCounts = {
  tecFilersLoaded: number;
  dbCandidatesQueried: number;
  candidatesMatched: number;
  contribFilesProcessed: number;
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

async function ensureExtracted(): Promise<void> {
  if (fs.existsSync(EXTRACT_DIR)) {
    console.log(
      `[tx-tec-donors] using existing extraction at ${EXTRACT_DIR}`,
    );
    return;
  }
  console.log(
    `[tx-tec-donors] extracting ${ZIP_PATH} → ${EXTRACT_DIR} ...`,
  );
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  await extract(ZIP_PATH, { dir: EXTRACT_DIR });
  console.log(`[tx-tec-donors] extraction complete`);
}

// ---------------------------------------------------------------------------
// CSV streaming parser
//
// TEC CSVs are comma-separated with double-quoted fields that may contain
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
    .normalize("NFD") // decompose accented chars (é → e + combining accent)
    .replace(/[̀-ͯ]/gu, "") // strip combining marks so é→e, ñ→n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, "") // strip remaining non-ASCII punctuation
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a full name string.
 * Handles "Last, First" and "First Last" formats.
 */
function extractLastName(fullName: string): string {
  const trimmed = fullName.trim();
  // TEC format is often "Last, First Middle" — comma is the delimiter
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeName(trimmed.substring(0, commaIdx));
  }
  // Otherwise take last space-delimited token
  const parts = trimmed.split(/\s+/u);
  return normalizeName(parts[parts.length - 1] ?? trimmed);
}

// ---------------------------------------------------------------------------
// Step 1: Load TEC filers.csv
// ---------------------------------------------------------------------------

async function loadTecFilers(): Promise<{
  byId: Map<string, TecFilerInfo>;
  byLastName: Map<string, TecFilerInfo[]>;
}> {
  const filersPath = path.join(EXTRACT_DIR, "filers.csv");
  const byId = new Map<string, TecFilerInfo>();
  const byLastName = new Map<string, TecFilerInfo[]>();

  await streamCsv(filersPath, (row) => {
    if (row["filerTypeCd"] !== "COH") return;
    // Accept candidates who are seeking OR currently holding a state legislative office.
    // Some senators (e.g., Huffman, Eckhardt) ran for other offices (AG, Comptroller)
    // so their ctaSeekOfficeCd is not STATESEN, but filerHoldOfficeCd is.
    const seekCd = row["ctaSeekOfficeCd"] ?? "";
    const holdCd = row["filerHoldOfficeCd"] ?? "";
    const officeCd = TEC_STATE_OFFICE_CODES.has(seekCd) ? seekCd : holdCd;
    if (!TEC_STATE_OFFICE_CODES.has(officeCd)) return;

    const filerIdent = row["filerIdent"] ?? "";
    if (!filerIdent) return;

    const filerNameLast = row["filerNameLast"] ?? "";
    const filerName = row["filerName"] ?? "";
    // Use hold-office district when seek-office district is missing
    const district = row["ctaSeekOfficeDistrict"] || row["filerHoldOfficeDistrict"] || "";

    const info: TecFilerInfo = {
      filerIdent,
      filerName,
      filerNameLast,
      officeCode: officeCd,
      district,
    };

    byId.set(filerIdent, info);

    const normalized = normalizeName(filerNameLast);
    if (normalized) {
      const existing = byLastName.get(normalized) ?? [];
      existing.push(info);
      byLastName.set(normalized, existing);
    }
  });

  return { byId, byLastName };
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
    .where(sql`${candidates.jurisdiction} LIKE 'state-TX%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 3: Match DB candidates to TEC filers
// ---------------------------------------------------------------------------

function matchCandidatesToFilers(
  dbCandidates: DbCandidate[],
  byLastName: Map<string, TecFilerInfo[]>,
): Map<string, TecFilerInfo[]> {
  const candidateToFilers = new Map<string, TecFilerInfo[]>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastName(candidate.fullName);
    const filers = byLastName.get(lastName);
    if (filers && filers.length > 0) {
      candidateToFilers.set(candidate.id, filers);
    }
  }

  return candidateToFilers;
}

// ---------------------------------------------------------------------------
// Step 4: Build the set of matched filerIdents → candidateId
// ---------------------------------------------------------------------------

function buildFilerToCandidateMap(
  candidateToFilers: Map<string, TecFilerInfo[]>,
): Map<string, string> {
  const filerToCandidate = new Map<string, string>();
  for (const [candidateId, filers] of candidateToFilers) {
    for (const filer of filers) {
      // Last-match-wins if multiple candidates share a lastName; acceptable for bulk ingest
      filerToCandidate.set(filer.filerIdent, candidateId);
    }
  }
  return filerToCandidate;
}

// ---------------------------------------------------------------------------
// Step 5: Stream contribution files, aggregate
// ---------------------------------------------------------------------------

async function aggregateContributions(
  filerToCandidate: Map<string, string>,
  filerById: Map<string, TecFilerInfo>,
): Promise<Map<string, AggValue>> {
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();

  const allFiles = fs.readdirSync(EXTRACT_DIR);
  const contribFiles = allFiles
    .filter((f) => /^contribs_\d+\.csv$/u.test(f))
    .sort();

  console.log(
    `[tx-tec-donors] found ${contribFiles.length} contribution files`,
  );

  let filesProcessed = 0;
  let contribsFiltered = 0;

  for (const filename of contribFiles) {
    const filePath = path.join(EXTRACT_DIR, filename);

    await streamCsv(filePath, (row) => {
      const filerIdent = row["filerIdent"] ?? "";
      if (!filerToCandidate.has(filerIdent)) return;

      const contribDt = row["contributionDt"] ?? "";
      const year = contribDt.substring(0, 4);
      if (!ELECTION_CYCLES.includes(year)) return;

      const amountRaw = row["contributionAmount"] ?? "";
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const candidateId = filerToCandidate.get(filerIdent)!;
      const filerInfo = filerById.get(filerIdent);

      // Classify contributor
      const personTypeCd = row["contributorPersentTypeCd"] ?? "";
      let bucket: DonorBucketLabel;

      if (personTypeCd === "INDIVIDUAL") {
        const employer = row["contributorEmployer"] ?? "";
        const occupation = row["contributorOccupation"] ?? "";
        const employerBucket = mapEmployerToBucket(employer, occupation);
        if (employerBucket === "Self-funded") {
          bucket = "Self-funded";
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // ENTITY — organization donor
        const orgName =
          row["contributorNameOrganization"] ?? row["filerName"] ?? "";
        const employerBucket = mapEmployerToBucket(orgName);
        bucket = employerBucket ?? "Other";
      }

      const aggKey = `${candidateId}|${year}|${bucket}`;
      const existing = agg.get(aggKey);
      if (existing) {
        existing.totalDollars += amount;
        existing.donorCount += 1;
      } else {
        agg.set(aggKey, {
          totalDollars: amount,
          donorCount: 1,
          filerIdent,
          officeCd: filerInfo?.officeCode ?? "",
        });
      }

      contribsFiltered++;
    });

    filesProcessed++;
    if (filesProcessed % LOG_EVERY_N_FILES === 0) {
      console.log(
        `[tx-tec-donors] files_processed=${filesProcessed}/${contribFiles.length} matched_contributions=${contribsFiltered}`,
      );
    }
  }

  console.log(
    `[tx-tec-donors] finished streaming: files=${filesProcessed} matched_contributions=${contribsFiltered}`,
  );

  return agg;
}

// ---------------------------------------------------------------------------
// Step 6: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateToFilers: Map<string, TecFilerInfo[]>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const [candidateId, cycle, bucket] = aggKey.split("|");
    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const filersForCandidate = candidateToFilers.get(candidateId) ?? [];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        filerIdent: value.filerIdent,
        officeCd: value.officeCd,
        tecFilerNames: filersForCandidate.map((f) => f.filerName),
      },
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 7: Upsert into donor_aggregates
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

export async function ingestTecDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<TecIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[tx-tec-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Extract ZIP if needed
  await ensureExtracted();

  // Step 2: Load TEC filers
  console.log(`[tx-tec-donors] loading filers.csv ...`);
  const { byId: filerById, byLastName } = await loadTecFilers();
  console.log(
    `[tx-tec-donors] tec_state_filers=${filerById.size} unique_last_names=${byLastName.size}`,
  );

  // Step 3: Load DB candidates (TX state only)
  console.log(`[tx-tec-donors] querying DB for TX state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(
    `[tx-tec-donors] db_candidates_found=${dbCandidates.length}`,
  );

  // Step 4: Match candidates to filers by last name
  const candidateToFilers = matchCandidatesToFilers(dbCandidates, byLastName);
  const filerToCandidate = buildFilerToCandidateMap(candidateToFilers);
  console.log(
    `[tx-tec-donors] candidates_matched=${candidateToFilers.size} filer_ids_matched=${filerToCandidate.size}`,
  );

  if (filerToCandidate.size === 0) {
    console.warn(
      `[tx-tec-donors] no filer matches found — check candidate last names against TEC filer names`,
    );
  }

  // Step 5: Stream contributions and aggregate
  const agg = await aggregateContributions(filerToCandidate, filerById);

  // Step 6: Build upsert rows
  const rows = buildUpsertRows(agg, candidateToFilers);
  console.log(`[tx-tec-donors] rows_to_upsert=${rows.length}`);

  // Step 7: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[tx-tec-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    // Log a sample
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: TecIngestCounts = {
    tecFilersLoaded: filerById.size,
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateToFilers.size,
    contribFilesProcessed: fs
      .readdirSync(EXTRACT_DIR)
      .filter((f) => /^contribs_\d+\.csv$/u.test(f)).length,
    contribsFiltered: rows.reduce(
      (sum, r) =>
        sum +
        ((r.rawMetadata as { donorCount?: number }).donorCount ?? 0),
      0,
    ),
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[tx-tec-donors] complete",
      `tec_filers=${counts.tecFilersLoaded}`,
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `contrib_files=${counts.contribFilesProcessed}`,
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
  ingestTecDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[tx-tec-donors] failed:", msg);
    process.exitCode = 1;
  });
}

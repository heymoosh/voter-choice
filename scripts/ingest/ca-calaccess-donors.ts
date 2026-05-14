/**
 * scripts/ingest/ca-calaccess-donors.ts
 *
 * Phase E — California state donor ingest from CAL-ACCESS bulk campaign finance data.
 *
 * Reads /tmp/CA_CF.zip, streams three files from the ZIP using `unzip -p`
 * (avoiding full extraction of the 3.4 GB RCPT_CD.TSV), matches CAL-ACCESS
 * recipient committees to our CA state candidates by last-name, aggregates
 * 2024–2026 contributions into donor buckets, and upserts into `donor_aggregates`.
 *
 * Key structure:
 *   FILERNAME_CD — committee metadata; FILER_TYPE='RECIPIENT COMMITTEE' files F460/F497
 *   FILER_FILINGS_CD — links FILER_ID (committee) → FILING_ID
 *   RCPT_CD — contributions keyed by FILING_ID
 *
 * The candidate-to-committee link is via NAML: committee names like
 * "BAUER-KAHAN FOR ASSEMBLY 2024; REBECCA" embed the candidate's last name
 * before " FOR ".
 *
 * Source: California Secretary of State — CAL-ACCESS bulk data
 * https://www.sos.ca.gov/campaign-lobbying/cal-access-resources/raw-data-campaign-finance-and-lobbying-activity
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ca-calaccess-donors.ts [--dry-run] [--limit 50]
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

const ZIP_PATH = "/tmp/CA_CF.zip";
const ELECTION_CYCLES = new Set(["2022", "2023", "2024", "2025", "2026"]);
const SOURCE = "ca_calaccess_bulk";
const SOURCE_URL =
  "https://www.sos.ca.gov/campaign-lobbying/cal-access-resources/raw-data-campaign-finance-and-lobbying-activity";

// CAL-ACCESS ZIP internal paths
const FILERNAME_PATH = "CalAccess/DATA/FILERNAME_CD.TSV";
const FILER_FILINGS_PATH = "CalAccess/DATA/FILER_FILINGS_CD.TSV";
const RCPT_PATH = "CalAccess/DATA/RCPT_CD.TSV";

// Log progress every N RCPT rows processed
const LOG_EVERY_N_ROWS = 500_000;

// Campaign finance form types that carry receipt data
const CAMPAIGN_FINANCE_FORMS = new Set(["F460", "F497", "F450", "F425"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

interface CommitteeInfo {
  filerId: string;
  naml: string; // full committee name
  extractedLastName: string; // normalized last name extracted from naml
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
  committeeFilerIds: Set<string>;
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

export type CaIngestCounts = {
  committeesLoaded: number;
  dbCandidatesQueried: number;
  candidatesMatched: number;
  filingIdsMatched: number;
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
// TSV streaming via `unzip -p`
//
// Streams a single file from the ZIP without extracting to disk.
// CAL-ACCESS TSVs are tab-separated. Fields may contain spaces but not tabs.
// Handles CRLF and LF.
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
    if (msg) console.warn(`[ca-calaccess-donors] unzip stderr: ${msg}`);
  });

  return child.stdout as unknown as Readable;
}

/**
 * Stream-parse a CAL-ACCESS TSV file from inside the ZIP.
 * Calls `onRow` with a Record for each data row. Skips blank lines.
 */
async function streamZipTsv(
  zipPath: string,
  entryPath: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = openZipEntry(zipPath, entryPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers: string[] | null = null;

    rl.on("line", (line) => {
      const trimmed = line.trimEnd(); // strip trailing \r, keep internal whitespace
      if (!trimmed) return;

      const fields = trimmed.split("\t");

      if (headers === null) {
        headers = fields;
        return;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]!] = fields[i] ?? "";
      }
      onRow(row);
    });

    rl.on("close", () => resolve());
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Name normalization and extraction
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from a DB candidate's full name.
 * Handles "First Last", "Last, First", and hyphenated last names.
 */
function extractLastNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeName(trimmed.substring(0, commaIdx));
  }
  const parts = trimmed.split(/\s+/u);
  return normalizeName(parts[parts.length - 1] ?? trimmed);
}

/**
 * Extract last name from a CAL-ACCESS committee NAML.
 *
 * Committee names have a consistent pattern:
 *   "LASTNAME FOR OFFICE YEAR; FIRST"
 *   "COMMITTEE TO ELECT LASTNAME"
 *   "FRIENDS OF LASTNAME"
 *   "LASTNAME, FIRST FOR OFFICE"
 *
 * Strategy: take text before " FOR " or " TO ELECT " or comma.
 * Then take the last space-delimited token of that prefix as the last name.
 */
function extractLastNameFromCommitteeNaml(naml: string): string {
  if (!naml.trim()) return "";

  let prefix = naml;

  // Remove trailing content after semicolon (e.g., "; REBECCA")
  const semiIdx = naml.indexOf(";");
  if (semiIdx !== -1) {
    prefix = naml.substring(0, semiIdx).trim();
  }

  // Pattern: "LASTNAME FOR ASSEMBLY/SENATE/CONGRESS/..."
  const forMatch = /^(.+?)\s+FOR\s+/iu.exec(prefix);
  if (forMatch?.[1]) {
    const candidate = forMatch[1].trim();
    // May be "LAST, FIRST" or "FIRST LAST" or just "LAST"
    const commaIdx = candidate.indexOf(",");
    if (commaIdx !== -1) {
      return normalizeName(candidate.substring(0, commaIdx));
    }
    // Take last token (handles "BAUER-KAHAN" as single token)
    const parts = candidate.split(/\s+/u);
    return normalizeName(parts[parts.length - 1] ?? candidate);
  }

  // Pattern: "COMMITTEE TO ELECT LASTNAME" or "FRIENDS OF LASTNAME"
  const electMatch =
    /\b(?:TO\s+ELECT|FRIENDS\s+OF|RE-?ELECT|ELECT)\s+(.+)/iu.exec(prefix);
  if (electMatch?.[1]) {
    const parts = electMatch[1].trim().split(/\s+/u);
    return normalizeName(parts[0] ?? "");
  }

  // Fallback: first token before comma
  const commaIdx = prefix.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeName(prefix.substring(0, commaIdx));
  }

  // Last resort: first token
  const parts = prefix.split(/\s+/u);
  return normalizeName(parts[0] ?? "");
}

// ---------------------------------------------------------------------------
// Step 1: Load FILERNAME_CD — build committee map keyed by extracted last name
//
// We target RECIPIENT COMMITTEE entries because those file F460/F497 with
// contribution data. The committee NAML encodes the candidate's last name.
// ---------------------------------------------------------------------------

async function loadCaCommittees(): Promise<{
  byLastName: Map<string, CommitteeInfo[]>;
  total: number;
}> {
  const byLastName = new Map<string, CommitteeInfo[]>();
  const seen = new Set<string>(); // deduplicate by FILER_ID
  let total = 0;

  console.log(`[ca-calaccess-donors] streaming FILERNAME_CD.TSV ...`);

  await streamZipTsv(ZIP_PATH, FILERNAME_PATH, (row) => {
    if (row["FILER_TYPE"] !== "RECIPIENT COMMITTEE") return;

    const filerId = row["FILER_ID"] ?? "";
    if (!filerId || seen.has(filerId)) return;
    seen.add(filerId);

    const naml = (row["NAML"] ?? "").trim();
    if (!naml) return;

    const extractedLastName = extractLastNameFromCommitteeNaml(naml);
    if (!extractedLastName) return;

    const info: CommitteeInfo = { filerId, naml, extractedLastName };

    const existing = byLastName.get(extractedLastName) ?? [];
    existing.push(info);
    byLastName.set(extractedLastName, existing);

    total++;
  });

  return { byLastName, total };
}

// ---------------------------------------------------------------------------
// Step 2: Query DB candidates (CA state only)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-CA%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 3: Match DB candidates to CA committees by last name
// ---------------------------------------------------------------------------

function matchCandidatesToCommittees(
  dbCandidates: DbCandidate[],
  byLastName: Map<string, CommitteeInfo[]>,
): {
  candidateToCommittees: Map<string, CommitteeInfo[]>;
  committeeIdToCandidateId: Map<string, string>;
} {
  const candidateToCommittees = new Map<string, CommitteeInfo[]>();
  const committeeIdToCandidateId = new Map<string, string>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastNameFromFullName(candidate.fullName);
    if (!lastName) continue;

    const committees = byLastName.get(lastName);
    if (!committees || committees.length === 0) continue;

    candidateToCommittees.set(candidate.id, committees);
    for (const committee of committees) {
      // Last-match-wins for duplicate last names across candidates
      committeeIdToCandidateId.set(committee.filerId, candidate.id);
    }
  }

  return { candidateToCommittees, committeeIdToCandidateId };
}

// ---------------------------------------------------------------------------
// Step 4: Load FILER_FILINGS_CD — build filing_id → committee_filer_id map
//         for campaign finance forms with recent FILING_DATE
// ---------------------------------------------------------------------------

async function loadFilerFilings(
  committeeIds: Set<string>,
): Promise<Map<string, string>> {
  // filing_id → committee filer_id
  const filingToCommittee = new Map<string, string>();

  console.log(`[ca-calaccess-donors] streaming FILER_FILINGS_CD.TSV ...`);

  await streamZipTsv(ZIP_PATH, FILER_FILINGS_PATH, (row) => {
    const filerId = row["FILER_ID"] ?? "";
    if (!committeeIds.has(filerId)) return;

    const formId = row["FORM_ID"] ?? "";
    if (!CAMPAIGN_FINANCE_FORMS.has(formId)) return;

    const filingId = row["FILING_ID"] ?? "";
    if (!filingId) return;

    // Filter by FILING_DATE (more reliably populated than RPT_START)
    const filingDate = row["FILING_DATE"] ?? "";
    if (filingDate) {
      const yearStr = filingDate.split("/")[2]?.split(" ")[0];
      const year = Number.parseInt(yearStr ?? "0", 10);
      // Include filings from 2023 onwards (covers the 2024 and 2026 election cycles)
      if (year < 2023) return;
    }

    filingToCommittee.set(filingId, filerId);
  });

  return filingToCommittee;
}

// ---------------------------------------------------------------------------
// Step 5: Stream RCPT_CD and aggregate contributions
// ---------------------------------------------------------------------------

async function aggregateContributions(
  filingToCommittee: Map<string, string>,
  committeeIdToCandidateId: Map<string, string>,
): Promise<{ agg: Map<string, AggValue>; contribsFiltered: number }> {
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();
  let rowsScanned = 0;
  let contribsFiltered = 0;

  console.log(`[ca-calaccess-donors] streaming RCPT_CD.TSV (3.4 GB) ...`);

  await streamZipTsv(ZIP_PATH, RCPT_PATH, (row) => {
    rowsScanned++;
    if (rowsScanned % LOG_EVERY_N_ROWS === 0) {
      console.log(
        `[ca-calaccess-donors] rows_scanned=${rowsScanned.toLocaleString()} matched_so_far=${contribsFiltered}`,
      );
    }

    const filingId = row["FILING_ID"] ?? "";
    const committeeId = filingToCommittee.get(filingId);
    if (!committeeId) return;

    const candidateId = committeeIdToCandidateId.get(committeeId);
    if (!candidateId) return;

    // Parse year from RCPT_DATE: "M/D/YYYY HH:MM:SS AM/PM"
    const rcptDate = row["RCPT_DATE"] ?? "";
    const yearStr = rcptDate.split("/")[2]?.split(" ")[0];
    if (!yearStr || !ELECTION_CYCLES.has(yearStr)) return;

    const amountRaw = row["AMOUNT"] ?? "";
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Classify contributor
    const entityCd = row["ENTITY_CD"] ?? "";
    let bucket: DonorBucketLabel;

    if (entityCd === "IND") {
      // Individual contributor — use employer, fall back to amount bucket
      const employer = row["CTRIB_EMP"] ?? "";
      const occupation = row["CTRIB_OCC"] ?? "";
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket !== null) {
        bucket = employerBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      // Committee (COM), Other (OTH), etc. — use contributor last name as org name
      const orgName = row["CTRIB_NAML"] ?? "";
      const orgBucket = mapEmployerToBucket(orgName);
      bucket = orgBucket ?? "Other";
    }

    const aggKey = `${candidateId}|${yearStr}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.totalDollars += amount;
      existing.donorCount += 1;
      existing.committeeFilerIds.add(committeeId);
    } else {
      agg.set(aggKey, {
        totalDollars: amount,
        donorCount: 1,
        committeeFilerIds: new Set([committeeId]),
      });
    }

    contribsFiltered++;
  });

  console.log(
    `[ca-calaccess-donors] finished RCPT_CD: rows_scanned=${rowsScanned.toLocaleString()} matched_contributions=${contribsFiltered}`,
  );

  return { agg, contribsFiltered };
}

// ---------------------------------------------------------------------------
// Step 6: Build upsert rows
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateToCommittees: Map<string, CommitteeInfo[]>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    // Split carefully — bucket label may not contain | but be safe
    const pipeIdx1 = aggKey.indexOf("|");
    const pipeIdx2 = aggKey.indexOf("|", pipeIdx1 + 1);
    if (pipeIdx1 === -1 || pipeIdx2 === -1) continue;

    const candidateId = aggKey.substring(0, pipeIdx1);
    const cycle = aggKey.substring(pipeIdx1 + 1, pipeIdx2);
    const bucket = aggKey.substring(pipeIdx2 + 1);

    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const committeesForCandidate = candidateToCommittees.get(candidateId) ?? [];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        committeeIds: Array.from(value.committeeFilerIds),
        committeeNames: committeesForCandidate.map((c) => c.naml),
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

export async function ingestCaCalAccessDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<CaIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ca-calaccess-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load FILERNAME_CD — recipient committees
  const { byLastName, total: committeesLoaded } = await loadCaCommittees();
  console.log(
    `[ca-calaccess-donors] committees_loaded=${committeesLoaded} unique_last_names=${byLastName.size}`,
  );

  // Step 2: Load DB candidates (CA state only)
  console.log(`[ca-calaccess-donors] querying DB for CA state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(
    `[ca-calaccess-donors] db_candidates_found=${dbCandidates.length}`,
  );

  // Step 3: Match candidates to committees by last name
  const { candidateToCommittees, committeeIdToCandidateId } =
    matchCandidatesToCommittees(dbCandidates, byLastName);

  const matchedCommitteeIds = new Set(committeeIdToCandidateId.keys());

  console.log(
    `[ca-calaccess-donors] candidates_matched=${candidateToCommittees.size} committee_ids_matched=${matchedCommitteeIds.size}`,
  );

  if (committeeIdToCandidateId.size === 0) {
    console.warn(
      `[ca-calaccess-donors] no committee matches — check CA candidate last names against FILERNAME_CD committee NAMLs`,
    );
  }

  // Step 4: Load FILER_FILINGS_CD — get filing_id → committee_filer_id
  const filingToCommittee = await loadFilerFilings(matchedCommitteeIds);
  console.log(
    `[ca-calaccess-donors] filing_ids_matched=${filingToCommittee.size}`,
  );

  // Step 5: Stream RCPT_CD and aggregate
  const { agg, contribsFiltered } = await aggregateContributions(
    filingToCommittee,
    committeeIdToCandidateId,
  );

  // Step 6: Build upsert rows
  const rows = buildUpsertRows(agg, candidateToCommittees);
  console.log(`[ca-calaccess-donors] rows_to_upsert=${rows.length}`);

  // Step 7: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ca-calaccess-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: CaIngestCounts = {
    committeesLoaded,
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateToCommittees.size,
    filingIdsMatched: filingToCommittee.size,
    contribsFiltered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ca-calaccess-donors] complete",
      `committees_loaded=${counts.committeesLoaded}`,
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `filing_ids=${counts.filingIdsMatched}`,
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
  ingestCaCalAccessDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ca-calaccess-donors] failed:", msg);
    process.exitCode = 1;
  });
}

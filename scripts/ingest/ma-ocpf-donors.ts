/**
 * scripts/ingest/ma-ocpf-donors.ts
 *
 * Massachusetts OCPF (Office of Campaign and Political Finance) donor ingest.
 *
 * Downloads ocpf-filers.zip in-memory to build a CPF ID → candidate map,
 * then streams /tmp/MA_2024_reports.zip (reports.txt + report-items.txt) via
 * `unzip -p` to match contributions to MA state House/Senate candidates in
 * our DB, aggregates into donor buckets, and upserts into `donor_aggregates`.
 *
 * Source: MA OCPF bulk data downloads
 * https://ocpf2.blob.core.windows.net/downloads/data2/
 *
 * candidates.txt columns (tab-delimited, per actual header):
 *   CPF ID, Account Type Code, Comm_Name, Is_Candidate_Only,
 *   Candidate First Name, Candidate Last Name,
 *   Candidate Street Address, Candidate City, Candidate State, Candidate Zip Code,
 *   Treasurer First Name, Treasurer Last Name,
 *   Comm Street Address, Comm City, Comm State, Comm Zip Code,
 *   Chair First Name, Chair Last Name, Organization Date,
 *   District Code Sought, Office Type Sought, District Name Sought,
 *   District Code Held, Office Type Held, District Name Held,
 *   Closed Date, Party Affiliation
 *
 * reports.txt fields (selected): Report_ID, CPF_ID, Report_Year,
 *   OCPF_Candidate_First_Name, OCPF_Candidate_Last_Name, OCPF_Office
 *
 * report-items.txt fields: Item_ID, Report_ID, Record_Type_ID, Date, Amount,
 *   Name, First_Name, Street_Address, City, State, Zip, Description,
 *   Related_CPF_ID, Occupation, Employer, Principal_Officer, Tender_Type_ID,
 *   Clarified_Name, Clarified_Purpose, Is_Supported, Is_Previous_Year_Receipt
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ma-ocpf-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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

const SOURCE = "ma_ocpf_bulk";
const SOURCE_URL = "https://ocpf2.blob.core.windows.net/downloads/data2/";
const REPORTS_ZIP = "/tmp/MA_2024_reports.zip";
const ELECTION_CYCLE = "2024";
const FILERS_URL =
  "https://ocpf2.blob.core.windows.net/downloads/data2/ocpf-filers.zip";

// OCPF Record_Type_IDs for contributions
const CONTRIBUTION_TYPES = new Set([201, 202, 203, 211]);
// Individual = 201, Committee = 202, Union/Association = 203, Business/Corp = 211

// MA legislative offices in OCPF data
const LEGISLATIVE_OFFICES = new Set(["House", "Senate"]);

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

interface OcpfFilerInfo {
  cpfId: string;
  firstName: string;
  lastName: string;
  office: string;
}

interface AggValue {
  totalDollars: number;
  donorCount: number;
  cpfId: string;
  candidateName: string;
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

export type MaOcpfIngestCounts = {
  filersLoaded: number;
  dbCandidatesQueried: number;
  candidatesMatched: number;
  reportsIndexed: number;
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
// Tab-delimited parser with quote stripping
//
// OCPF files are tab-delimited. Most text fields are wrapped in double quotes.
// Numeric/boolean fields are unquoted. We split on tab and strip outer quotes.
// ---------------------------------------------------------------------------

function parseTabLine(line: string): string[] {
  return line.split("\t").map((field) => {
    const f = field.trim();
    // Strip surrounding double-quotes if present
    if (f.startsWith('"') && f.endsWith('"') && f.length >= 2) {
      return f.slice(1, -1);
    }
    return f;
  });
}

// ---------------------------------------------------------------------------
// Stream a ZIP entry line-by-line via `unzip -p`
// ---------------------------------------------------------------------------

async function streamZipEntry(
  zipPath: string,
  entry: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, entry], {
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

      const fields = parseTabLine(trimmed);

      if (headers === null) {
        headers = fields;
        return;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i] ?? ""] = fields[i] ?? "";
      }
      onRow(row);
    });

    rl.on("close", () => resolve());
    rl.on("error", reject);

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(
          new Error(
            `unzip exited with code ${code} for entry '${entry}': ${errOutput.trim()}`,
          ),
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
    .replace(/[^A-Z0-9\s]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Extract normalized last name from DB candidate fullName ("First [Middle] Last"). */
function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  return normalizeStr(parts[parts.length - 1] ?? "");
}

/** Extract normalized first name from DB candidate fullName. */
function extractFirstNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return "";
  return normalizeStr(parts[0] ?? "");
}

// ---------------------------------------------------------------------------
// Step 1: Load MA state candidates from DB
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-MA%'`);

  const rows = limit !== null ? await query.limit(limit) : await query;
  return rows as DbCandidate[];
}

/**
 * Build last-name → candidate(s) and first-name → candidate(s) indices.
 * Both keyed by normalized uppercase name.
 */
function buildNameIndices(dbCandidates: DbCandidate[]): {
  byLastName: Map<string, DbCandidate[]>;
  byFirstName: Map<string, DbCandidate[]>;
} {
  const byLastName = new Map<string, DbCandidate[]>();
  const byFirstName = new Map<string, DbCandidate[]>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastNameFromDbName(candidate.fullName);
    if (lastName) {
      const existing = byLastName.get(lastName) ?? [];
      existing.push(candidate);
      byLastName.set(lastName, existing);
    }

    const firstName = extractFirstNameFromDbName(candidate.fullName);
    if (firstName) {
      const existing = byFirstName.get(firstName) ?? [];
      existing.push(candidate);
      byFirstName.set(firstName, existing);
    }
  }

  return { byLastName, byFirstName };
}

// ---------------------------------------------------------------------------
// Step 2: Download filers ZIP in-memory and parse candidates.txt
//
// Actual candidates.txt columns (27 data + 1 trailing):
//   [0]  CPF ID
//   [1]  Account Type Code
//   [2]  Comm_Name
//   [3]  Is_Candidate_Only
//   [4]  Candidate First Name
//   [5]  Candidate Last Name
//   [6]  Candidate Street Address
//   [7]  Candidate City
//   [8]  Candidate State
//   [9]  Candidate Zip Code
//   [10] Treasurer First Name
//   [11] Treasurer Last Name
//   [12] Comm Street Address
//   [13] Comm City
//   [14] Comm State
//   [15] Comm Zip Code
//   [16] Chair First Name
//   [17] Chair Last Name
//   [18] Organization Date
//   [19] District Code Sought
//   [20] Office Type Sought  ← "House" or "Senate" here
//   [21] District Name Sought
//   [22] District Code Held
//   [23] Office Type Held
//   [24] District Name Held
//   [25] Closed Date
//   [26] Party Affiliation
// ---------------------------------------------------------------------------

async function loadFilers(
  byLastName: Map<string, DbCandidate[]>,
): Promise<{
  cpfIdToCandidate: Map<string, DbCandidate>;
  filersLoaded: number;
}> {
  console.log(`[ma-ocpf-donors] fetching filers ZIP from ${FILERS_URL} ...`);
  const resp = await fetch(FILERS_URL);
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch filers ZIP: ${resp.status} ${resp.statusText}`,
    );
  }

  // Write to a temp file for unzip (Node.js can't pipe from a stream to unzip -p directly)
  const tmpPath = "/tmp/ocpf-filers-tmp.zip";
  const arrayBuffer = await resp.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const { writeFileSync } = await import("node:fs");
  writeFileSync(tmpPath, buf);

  console.log(
    `[ma-ocpf-donors] filers ZIP downloaded (${(buf.length / 1024).toFixed(0)} KB), parsing candidates.txt ...`,
  );

  const cpfIdToCandidate = new Map<string, DbCandidate>();
  let filersLoaded = 0;

  await streamZipEntry(tmpPath, "candidates.txt", (row) => {
    const cpfId = (row["CPF ID"] ?? "").trim();
    const officeTypeSought = (row["Office Type Sought"] ?? "").trim();
    const closedDate = (row["Closed Date"] ?? "").trim();
    const filerFirstName = (row["Candidate First Name"] ?? "").trim();
    const filerLastName = (row["Candidate Last Name"] ?? "").trim();

    // Only House and Senate
    if (!LEGISLATIVE_OFFICES.has(officeTypeSought)) return;
    // Skip closed committees
    if (closedDate && closedDate !== "") return;
    if (!cpfId || !filerLastName) return;

    filersLoaded++;

    // Match to DB candidate by last name
    const normLast = normalizeStr(filerLastName);
    const dbCandidates = byLastName.get(normLast);
    if (!dbCandidates || dbCandidates.length === 0) return;

    let match: DbCandidate | null = null;

    if (dbCandidates.length === 1) {
      match = dbCandidates[0] ?? null;
    } else {
      // Disambiguate by first name
      const normFirst = normalizeStr(filerFirstName);
      if (normFirst) {
        const firstMatch = dbCandidates.find(
          (c) => extractFirstNameFromDbName(c.fullName) === normFirst,
        );
        match = firstMatch ?? dbCandidates[0] ?? null;
      } else {
        match = dbCandidates[0] ?? null;
      }
    }

    if (match) {
      cpfIdToCandidate.set(cpfId, match);
    }
  });

  return { cpfIdToCandidate, filersLoaded };
}

// ---------------------------------------------------------------------------
// Step 3: Stream reports.txt, build reportId → cpfId map
//
// reports.txt columns (selected):
//   Report_ID [0], CPF_ID [2], Report_Year [10], OCPF_Office [40]
// Filter: Report_Year == "2024", OCPF_Office in {"House","Senate"},
//         CPF_ID in cpfIdToCandidate
// ---------------------------------------------------------------------------

async function buildReportIndex(
  cpfIdToCandidate: Map<string, DbCandidate>,
): Promise<{
  reportIdToCpfId: Map<string, string>;
  reportsIndexed: number;
}> {
  console.log(`[ma-ocpf-donors] streaming reports.txt ...`);

  const reportIdToCpfId = new Map<string, string>();
  let reportsIndexed = 0;

  await streamZipEntry(REPORTS_ZIP, "reports.txt", (row) => {
    const reportId = (row["Report_ID"] ?? "").trim();
    const cpfId = (row["CPF_ID"] ?? "").trim();
    const reportYear = (row["Report_Year"] ?? "").trim();
    const ocpfOffice = (row["OCPF_Office"] ?? "").trim();

    if (reportYear !== ELECTION_CYCLE) return;
    if (!LEGISLATIVE_OFFICES.has(ocpfOffice)) return;
    if (!cpfIdToCandidate.has(cpfId)) return;
    if (!reportId) return;

    reportIdToCpfId.set(reportId, cpfId);
    reportsIndexed++;
  });

  return { reportIdToCpfId, reportsIndexed };
}

// ---------------------------------------------------------------------------
// Step 4: Stream report-items.txt, aggregate contributions
//
// report-items.txt columns:
//   Item_ID [0], Report_ID [1], Record_Type_ID [2], Date [3], Amount [4],
//   Name [5], First_Name [6], Street_Address [7], City [8], State [9], Zip [10],
//   Description [11], Related_CPF_ID [12], Occupation [13], Employer [14],
//   Principal_Officer [15], Tender_Type_ID [16], Clarified_Name [17],
//   Clarified_Purpose [18], Is_Supported [19], Is_Previous_Year_Receipt [20]
//
// Filter:
//   - Report_ID in reportIdToCpfId
//   - Record_Type_ID in {201, 202, 203, 211}
//   - Amount > 0
// ---------------------------------------------------------------------------

async function aggregateContributions(
  reportIdToCpfId: Map<string, string>,
  cpfIdToCandidate: Map<string, DbCandidate>,
): Promise<{
  agg: Map<string, AggValue>;
  candidateMatchedCpfIds: Map<string, Set<string>>;
  counters: { processed: number; filtered: number };
}> {
  const agg = new Map<string, AggValue>();
  const candidateMatchedCpfIds = new Map<string, Set<string>>();
  const counters = { processed: 0, filtered: 0 };

  console.log(`[ma-ocpf-donors] streaming report-items.txt ...`);
  let loggedAt = 0;

  await streamZipEntry(REPORTS_ZIP, "report-items.txt", (row) => {
    counters.processed++;

    if (counters.processed - loggedAt >= 100_000) {
      loggedAt = counters.processed;
      console.log(
        `[ma-ocpf-donors] rows_processed=${counters.processed} matched=${counters.filtered}`,
      );
    }

    const reportId = (row["Report_ID"] ?? "").trim();
    const cpfId = reportIdToCpfId.get(reportId);
    if (!cpfId) return;

    const recordTypeId = Number.parseInt(
      (row["Record_Type_ID"] ?? "").trim(),
      10,
    );
    if (!CONTRIBUTION_TYPES.has(recordTypeId)) return;

    const amountRaw = (row["Amount"] ?? "").trim();
    const amount = Number.parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const dbCandidate = cpfIdToCandidate.get(cpfId);
    if (!dbCandidate) return;

    // Classify into bucket
    const name = (row["Name"] ?? "").trim();
    const employer = (row["Employer"] ?? "").trim();
    const occupation = (row["Occupation"] ?? "").trim();

    let bucket: DonorBucketLabel;

    if (recordTypeId === 201) {
      // Individual contribution
      const employerBucket = mapEmployerToBucket(employer, occupation);
      if (employerBucket && employerBucket !== "Self-funded") {
        bucket = employerBucket;
      } else if (employerBucket === "Self-funded") {
        bucket = "Self-funded";
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else if (recordTypeId === 202) {
      // Committee contribution — use Name field
      const orgBucket = mapEmployerToBucket(name);
      bucket = orgBucket ?? "Other";
    } else if (recordTypeId === 203) {
      // Union/Association — use Name field
      const orgBucket = mapEmployerToBucket(name);
      // Default to Trade unions if the org bucket mapping doesn't match
      bucket = orgBucket ?? "Trade unions (non-public-safety)";
    } else {
      // 211: Business/Corp — use Name field
      const orgBucket = mapEmployerToBucket(name);
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
        cpfId,
        candidateName: dbCandidate.fullName,
      });
    }

    // Track CPF IDs matched per candidate (for metadata)
    const matched = candidateMatchedCpfIds.get(dbCandidate.id) ?? new Set();
    matched.add(cpfId);
    candidateMatchedCpfIds.set(dbCandidate.id, matched);

    counters.filtered++;
  });

  return { agg, candidateMatchedCpfIds, counters };
}

// ---------------------------------------------------------------------------
// Step 5: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateMatchedCpfIds: Map<string, Set<string>>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    // Split only on first two pipes — bucket label may contain pipes
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1);

    if (!candidateId || !cycle || !bucketLabel) continue;
    if (value.totalDollars <= 0) continue;

    const cpfIds = [...(candidateMatchedCpfIds.get(candidateId) ?? [])];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        maOcpfCpfIds: cpfIds,
        candidateName: value.candidateName,
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

export async function ingestMaOcpfDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<MaOcpfIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ma-ocpf-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!existsSync(REPORTS_ZIP)) {
    throw new Error(
      `[ma-ocpf-donors] reports ZIP not found at ${REPORTS_ZIP} — download from ${SOURCE_URL}`,
    );
  }

  // Step 1: Load DB candidates (MA state only)
  console.log(`[ma-ocpf-donors] querying DB for MA state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[ma-ocpf-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn(
      `[ma-ocpf-donors] no MA state candidates found in DB — check jurisdiction LIKE 'state-MA%'`,
    );
    return {
      filersLoaded: 0,
      dbCandidatesQueried: 0,
      candidatesMatched: 0,
      reportsIndexed: 0,
      contribsProcessed: 0,
      contribsFiltered: 0,
      rowsUpserted: 0,
      dryRun: config.dryRun,
    };
  }

  // Build name lookup indices
  const { byLastName } = buildNameIndices(dbCandidates);
  console.log(
    `[ma-ocpf-donors] unique_last_names_indexed=${byLastName.size}`,
  );

  // Step 2: Download filers and build CPF ID → DbCandidate map
  const { cpfIdToCandidate, filersLoaded } = await loadFilers(byLastName);
  console.log(
    `[ma-ocpf-donors] filers_loaded_house_senate=${filersLoaded} cpf_ids_matched=${cpfIdToCandidate.size}`,
  );

  if (cpfIdToCandidate.size === 0) {
    console.warn(
      `[ma-ocpf-donors] no CPF IDs matched to DB candidates — check name normalization`,
    );
  }

  // Step 3: Build report ID → CPF ID index
  const { reportIdToCpfId, reportsIndexed } =
    await buildReportIndex(cpfIdToCandidate);
  console.log(
    `[ma-ocpf-donors] reports_indexed=${reportsIndexed} unique_report_ids=${reportIdToCpfId.size}`,
  );

  // Step 4: Stream report-items.txt and aggregate
  const { agg, candidateMatchedCpfIds, counters } =
    await aggregateContributions(reportIdToCpfId, cpfIdToCandidate);

  console.log(
    `[ma-ocpf-donors] total_rows_processed=${counters.processed} matched_contributions=${counters.filtered}`,
  );

  // Step 5: Build upsert rows
  const rows = buildUpsertRows(agg, candidateMatchedCpfIds);
  console.log(
    `[ma-ocpf-donors] candidates_matched=${candidateMatchedCpfIds.size} rows_to_upsert=${rows.length}`,
  );

  // Show sample rows for visibility
  if (rows.length > 0) {
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  candidate=${row.candidateId.slice(0, 40)} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  }

  // Step 6: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ma-ocpf-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: MaOcpfIngestCounts = {
    filersLoaded,
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateMatchedCpfIds.size,
    reportsIndexed,
    contribsProcessed: counters.processed,
    contribsFiltered: counters.filtered,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ma-ocpf-donors] complete",
      `filers_loaded=${counts.filersLoaded}`,
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `reports_indexed=${counts.reportsIndexed}`,
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
  ingestMaOcpfDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[ma-ocpf-donors] failed:", msg);
    process.exitCode = 1;
  });
}

/**
 * scripts/ingest/wv-cfrs-donors.ts
 *
 * West Virginia Campaign Finance Reporting System (CFRS) donor ingest.
 *
 * Two-step API (no auth required):
 *   Step 1 — POST getDataDownloadDataList → S3 file path
 *   Step 2 — POST getDownloadLinkWithoutCookies → signed S3 URL (expires in 3600s)
 *   Step 3 — GET signed URL → CSV download
 *
 * CSV is comma-separated, latin-1 encoded, no quotes. Fields:
 *   RegistrantID, CommitteeName, CandidateName, TransactionType,
 *   TransactionCategory, TransactionDate, TransactionAmount,
 *   ContributorPayeeType, ContributorPayeeName, ContributorAddress,
 *   EmployerName, FiledDate
 *
 * Filters applied:
 *   - TransactionType = "Contributions"
 *   - TransactionCategory = "Monetary"
 *   - CandidateName non-empty
 *   - TransactionAmount > 0
 *
 * CandidateName format: "First [Middle] Last". Last name = last word.
 *
 * Bucketing:
 *   - ContributorPayeeType = "Self"                             → "Self-funded"
 *   - ContributorPayeeType = "Individual"                       → mapEmployerToBucket(EmployerName) or bucketIndividualByAmount(amount)
 *   - ContributorPayeeType = "Political Party Committee / Caucus Campaign Committee" → "Party committees"
 *   - ContributorPayeeType = "Political Action Committee"       → mapEmployerToBucket(ContributorPayeeName) or "Other"
 *   - ContributorPayeeType = "Business or Organization"         → mapEmployerToBucket(ContributorPayeeName) or "Other"
 *   - Other                                                     → mapEmployerToBucket(ContributorPayeeName) or "Other"
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/wv-cfrs-donors.ts [--dry-run] [--limit N] [--use-local-file]
 *
 *   --use-local-file   Read from /tmp/WV_2024_contributions.csv instead of calling the API
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
import * as os from "node:os";
import * as path from "node:path";
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

const DATA_LIST_URL =
  "https://cfrs.wvsos.gov/api/Public-Service/AccessReport/getDataDownloadDataList";
const SIGNED_URL_API =
  "https://cfrs.wvsos.gov/api/Common-Service/AmazonCloudFront/getDownloadLinkWithoutCookies";
const SOURCE = "wv_cfrs_bulk";
const SOURCE_URL = "https://cfrs.wvsos.gov/";
const DATA_TYPE = "CON";
const { year: DOWNLOAD_YEAR } = resolveConfig();
const LOCAL_CSV_PATH = `/tmp/WV_${DOWNLOAD_YEAR}_contributions.csv`;
const ELECTION_CYCLE = String(DOWNLOAD_YEAR);

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
  wvCandidateName: string;
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

export type WvCfrsIngestCounts = {
  contributionsFetched: number;
  contributionsFiltered: number;
  candidatesMatched: number;
  rowsUpserted: number;
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface IngestConfig {
  dryRun: boolean;
  limit: number | null;
  useLocalFile: boolean;
  year: number;
}

function resolveConfig(argv: string[] = process.argv): IngestConfig {
  const dryRun = argv.includes("--dry-run");
  const useLocalFile = argv.includes("--use-local-file");
  const limitIdx = argv.indexOf("--limit");
  const yearIdx = argv.indexOf("--year");
  let limit: number | null = null;
  if (limitIdx !== -1) {
    const raw = argv[limitIdx + 1];
    const parsed = Number.parseInt(raw ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) limit = parsed;
  }
  const year = yearIdx !== -1 ? Number.parseInt(argv[yearIdx + 1] ?? "2024", 10) : 2024;
  return { dryRun, limit, useLocalFile, year };
}

// ---------------------------------------------------------------------------
// CSV parser — simple split on comma (no quoting in WV CFRS CSVs)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  return line.split(",");
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

/**
 * Extract last name from a WV CandidateName field.
 * Format: "First [Middle] Last" — last word = last name.
 */
function extractLastName(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? "");
}

/**
 * Extract first name (first token) from a WV CandidateName field.
 */
function extractFirstName(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[0] ?? "");
}

// ---------------------------------------------------------------------------
// Two-step API: get signed S3 URL
// ---------------------------------------------------------------------------

interface DataListItem {
  id: number;
  s3ReportFilePath: string;
}

interface DataListResponse {
  isSuccess: boolean;
  responseData: {
    totalRecords: number;
    data: DataListItem[];
  };
}

interface SignedUrlResponse {
  isSuccess: boolean;
  responseData: string;
}

async function getSignedS3Url(): Promise<string> {
  console.log("[wv-cfrs-donors] step 1: fetching S3 file path from API ...");

  const listRes = await fetch(DATA_LIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Year: DOWNLOAD_YEAR, DataType: DATA_TYPE }),
  });

  if (!listRes.ok) {
    throw new Error(
      `[wv-cfrs-donors] data list API returned HTTP ${listRes.status}: ${listRes.statusText}`,
    );
  }

  const listBody = (await listRes.json()) as DataListResponse;
  if (!listBody.isSuccess) {
    throw new Error(
      `[wv-cfrs-donors] data list API isSuccess=false: ${JSON.stringify(listBody)}`,
    );
  }

  const items = listBody.responseData?.data ?? [];
  if (items.length === 0) {
    throw new Error(
      `[wv-cfrs-donors] data list API returned no data items for year=${DOWNLOAD_YEAR} type=${DATA_TYPE}`,
    );
  }

  // Use the first (most recent) item
  const item = items[0]!;
  const s3FilePath = item.s3ReportFilePath;
  console.log(`[wv-cfrs-donors] step 1 complete: s3_file_path=${s3FilePath}`);

  console.log("[wv-cfrs-donors] step 2: fetching signed S3 URL ...");

  const signedRes = await fetch(SIGNED_URL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ s3FilePath }),
  });

  if (!signedRes.ok) {
    throw new Error(
      `[wv-cfrs-donors] signed URL API returned HTTP ${signedRes.status}: ${signedRes.statusText}`,
    );
  }

  const signedBody = (await signedRes.json()) as SignedUrlResponse;
  if (!signedBody.isSuccess) {
    throw new Error(
      `[wv-cfrs-donors] signed URL API isSuccess=false: ${JSON.stringify(signedBody)}`,
    );
  }

  const signedUrl = signedBody.responseData;
  if (!signedUrl || typeof signedUrl !== "string") {
    throw new Error(
      `[wv-cfrs-donors] signed URL API returned unexpected responseData: ${JSON.stringify(signedBody)}`,
    );
  }

  console.log("[wv-cfrs-donors] step 2 complete: signed URL obtained");
  return signedUrl;
}

// ---------------------------------------------------------------------------
// Download CSV from signed S3 URL to a temp file
// ---------------------------------------------------------------------------

async function downloadCsvToTempFile(signedUrl: string): Promise<string> {
  console.log(
    "[wv-cfrs-donors] step 3: downloading CSV from signed S3 URL ...",
  );

  const res = await fetch(signedUrl);
  if (!res.ok) {
    throw new Error(
      `[wv-cfrs-donors] CSV download returned HTTP ${res.status}: ${res.statusText}`,
    );
  }

  if (!res.body) {
    throw new Error("[wv-cfrs-donors] CSV download returned no body");
  }

  const tmpPath = path.join(os.tmpdir(), `wv_cfrs_${Date.now()}.csv`);
  const writer = fs.createWriteStream(tmpPath);

  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  await new Promise<void>((resolve, reject) => {
    writer.end((err: Error | null | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log(`[wv-cfrs-donors] step 3 complete: CSV saved to ${tmpPath}`);
  return tmpPath;
}

// ---------------------------------------------------------------------------
// Stream CSV file line-by-line (latin-1 encoding)
// ---------------------------------------------------------------------------

async function streamCsvFile(
  csvPath: string,
  onRow: (row: Record<string, string>) => void,
  limit: number | null,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath, { encoding: "latin1" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headers: string[] | null = null;
    let rowCount = 0;
    let done = false;

    rl.on("line", (line) => {
      if (done) return;

      const trimmed = line.trim();
      if (!trimmed) return;

      const fields = parseCsvLine(trimmed);

      if (headers === null) {
        headers = fields;
        return;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i] ?? ""] = (fields[i] ?? "").trim();
      }

      onRow(row);
      rowCount++;

      if (limit !== null && rowCount >= limit) {
        done = true;
        rl.close();
        stream.destroy();
      }
    });

    rl.on("close", () => resolve(rowCount));
    rl.on("error", reject);
    stream.on("error", (err) => {
      // Ignore ECONNRESET from stream.destroy() when we hit limit
      if ((err as NodeJS.ErrnoException).code === "ERR_STREAM_DESTROYED") {
        resolve(rowCount);
      } else {
        reject(err);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Main ingest logic
// ---------------------------------------------------------------------------

export async function ingestWvCfrsDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<WvCfrsIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[wv-cfrs-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"} useLocalFile=${config.useLocalFile}`,
  );

  // Step 1: Load WV state candidates from DB
  console.log("[wv-cfrs-donors] querying DB for WV state candidates ...");
  const dbCandidatesRaw = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-WV%'`);
  const dbCandidates = dbCandidatesRaw as DbCandidate[];
  console.log(`[wv-cfrs-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn("[wv-cfrs-donors] no WV state candidates found in DB");
    return {
      contributionsFetched: 0,
      contributionsFiltered: 0,
      candidatesMatched: 0,
      rowsUpserted: 0,
      dryRun: config.dryRun,
    };
  }

  // Step 2: Build last-name and first-name indices
  const byLastName = new Map<string, DbCandidate[]>();

  for (const cand of dbCandidates) {
    const lastName = extractLastName(cand.fullName);
    if (lastName) {
      const existing = byLastName.get(lastName) ?? [];
      existing.push(cand);
      byLastName.set(lastName, existing);
    }
  }

  console.log(`[wv-cfrs-donors] last_names_indexed=${byLastName.size}`);

  // Cache WV CandidateName → DB candidate
  const nameCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(wvCandidateName: string): DbCandidate | null {
    if (nameCache.has(wvCandidateName))
      return nameCache.get(wvCandidateName) ?? null;

    const lastName = extractLastName(wvCandidateName);
    if (!lastName) {
      nameCache.set(wvCandidateName, null);
      return null;
    }

    const lastMatches = byLastName.get(lastName);
    if (lastMatches && lastMatches.length > 0) {
      if (lastMatches.length === 1) {
        nameCache.set(wvCandidateName, lastMatches[0] ?? null);
        return lastMatches[0] ?? null;
      }

      // Multiple last-name matches — disambiguate by first name
      const firstName = extractFirstName(wvCandidateName);
      if (firstName) {
        const firstMatch = lastMatches.find(
          (c) =>
            normalizeStr(c.fullName.trim().split(/\s+/u)[0] ?? "") ===
            firstName,
        );
        if (firstMatch) {
          nameCache.set(wvCandidateName, firstMatch);
          return firstMatch;
        }
      }

      // Fall back to first match in list
      nameCache.set(wvCandidateName, lastMatches[0] ?? null);
      return lastMatches[0] ?? null;
    }

    nameCache.set(wvCandidateName, null);
    return null;
  }

  // Step 3: Obtain CSV path (local file or API download)
  let csvPath: string;
  let tempFileToDelete: string | null = null;

  if (config.useLocalFile) {
    csvPath = LOCAL_CSV_PATH;
    console.log(`[wv-cfrs-donors] using local file: ${csvPath}`);
  } else {
    const signedUrl = await getSignedS3Url();
    const tmpPath = await downloadCsvToTempFile(signedUrl);
    csvPath = tmpPath;
    tempFileToDelete = tmpPath;
  }

  // Step 4: Stream the CSV and accumulate contributions
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  let contributionsFetched = 0;
  let contributionsFiltered = 0;

  console.log(`[wv-cfrs-donors] streaming ${csvPath} ...`);

  const rowsRead = await streamCsvFile(
    csvPath,
    (row) => {
      contributionsFetched++;

      // Filter 1: TransactionType must be "Contributions"
      const transactionType = row["TransactionType"] ?? "";
      if (transactionType !== "Contributions") return;

      // Filter 2: TransactionCategory must be "Monetary"
      const transactionCategory = row["TransactionCategory"] ?? "";
      if (transactionCategory !== "Monetary") return;

      // Filter 3: CandidateName must be non-empty
      const candidateName = row["CandidateName"] ?? "";
      if (!candidateName) return;

      // Filter 4: TransactionAmount must be > 0
      const amountRaw = row["TransactionAmount"] ?? "";
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      // Match CandidateName to DB candidate
      const dbCandidate = resolveCandidate(candidateName);
      if (!dbCandidate) return;

      contributionsFiltered++;

      // Classify into donor bucket
      const contributorPayeeType = row["ContributorPayeeType"] ?? "";
      const contributorPayeeName = row["ContributorPayeeName"] ?? "";
      const employerName = row["EmployerName"] ?? "";

      let bucket: DonorBucketLabel;

      if (contributorPayeeType === "Self") {
        bucket = "Self-funded";
      } else if (contributorPayeeType === "Individual") {
        // Try employer first, fall back to amount-based bucket
        const employerBucket = mapEmployerToBucket(employerName);
        if (employerBucket !== null) {
          bucket = employerBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else if (
        contributorPayeeType ===
        "Political Party Committee / Caucus Campaign Committee"
      ) {
        bucket = "Party committees";
      } else if (contributorPayeeType === "Political Action Committee") {
        const pacBucket = mapEmployerToBucket(contributorPayeeName);
        bucket = pacBucket ?? "Other";
      } else if (contributorPayeeType === "Business or Organization") {
        const orgBucket = mapEmployerToBucket(contributorPayeeName);
        bucket = orgBucket ?? "Other";
      } else {
        // All other types
        const fallbackBucket = mapEmployerToBucket(contributorPayeeName);
        bucket = fallbackBucket ?? "Other";
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
          wvCandidateName: candidateName,
        });
      }

      const matched =
        candidateMatchedNames.get(dbCandidate.id) ?? new Set<string>();
      matched.add(candidateName);
      candidateMatchedNames.set(dbCandidate.id, matched);
    },
    config.limit,
  );

  console.log(
    `[wv-cfrs-donors] stream_complete rows_read=${rowsRead} contributions_fetched=${contributionsFetched} filtered_matched=${contributionsFiltered} candidates_matched=${candidateMatchedNames.size}`,
  );

  // Clean up temp file if we downloaded one
  if (tempFileToDelete) {
    try {
      fs.unlinkSync(tempFileToDelete);
      console.log(`[wv-cfrs-donors] removed temp file: ${tempFileToDelete}`);
    } catch {
      console.warn(
        `[wv-cfrs-donors] could not remove temp file: ${tempFileToDelete}`,
      );
    }
  }

  // Step 5: Build upsert rows
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
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
        wvCandidateNames: matchedNames,
      },
    });
  }

  console.log(
    `[wv-cfrs-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 6: Upsert (or dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[wv-cfrs-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 10)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal} donors=${(row.rawMetadata as { donorCount: number }).donorCount}`,
      );
    }
  } else {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await db
        .insert(donorAggregates)
        .values(
          chunk.map((r) => ({
            candidateId: r.candidateId,
            electionCycle: r.electionCycle,
            bucketLabel: r.bucketLabel,
            amountTotal: r.amountTotal,
            source: r.source,
            sourceUrl: r.sourceUrl,
            rawMetadata: r.rawMetadata,
            insertedAt: new Date(),
          })),
        )
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
      rowsUpserted += chunk.length;
    }
  }

  const counts: WvCfrsIngestCounts = {
    contributionsFetched,
    contributionsFiltered,
    candidatesMatched: candidateMatchedNames.size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[wv-cfrs-donors] complete",
      `contributions_fetched=${contributionsFetched}`,
      `contributions_filtered=${contributionsFiltered}`,
      `candidates_matched=${candidateMatchedNames.size}`,
      `rows_upserted=${rowsUpserted}`,
      `dry_run=${config.dryRun}`,
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
  ingestWvCfrsDonors().catch((error: unknown) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[wv-cfrs-donors] failed:", msg);
    process.exitCode = 1;
  });
}

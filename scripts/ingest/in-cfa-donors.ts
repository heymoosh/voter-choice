/**
 * scripts/ingest/in-cfa-donors.ts
 *
 * Indiana Campaign Finance Administration (CFA) donor ingest.
 *
 * Streams /tmp/IN_2024_contributions.zip via `unzip -p`, reads
 * 2024_ContributionData.csv (latin-1 encoded, comma-quoted), filters for
 * Candidate committee contributions in 2024, matches CandidateName to IN
 * state candidates in our DB by normalized last name, aggregates into donor
 * buckets, and upserts into `donor_aggregates`.
 *
 * Source: Indiana Campaign Finance Administration bulk data
 * https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/
 *
 * CSV fields (comma-separated, double-quoted):
 *   FileNumber, CommitteeType, Committee, CandidateName, ContributorType,
 *   Name, Address, City, State, Zip, Occupation, Type, Description, Amount,
 *   ContributionDate, Received_By, Amended
 *
 * Filters applied:
 *   - CommitteeType = "Candidate"
 *   - CandidateName non-empty
 *   - Amount > 0
 *   - Type does NOT contain "In-Kind"
 *   - ContributionDate starts with "2024"
 *
 * CandidateName format: "FIRST [MIDDLE] LAST" (all-caps); last word = last name.
 *
 * Bucketing:
 *   - ContributorType = "Candidate"  → "Self-funded"
 *   - Individual donors              → mapEmployerToBucket(occupation) or
 *                                      bucketIndividualByAmount(amount)
 *   - Other (Corporation, PAC, etc.) → mapEmployerToBucket(Name) or "Other"
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/in-cfa-donors.ts [--dry-run] [--limit N]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
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

const ZIP_PATH = "/tmp/IN_2024_contributions.zip";
const CSV_ENTRY = "2024_ContributionData.csv";
const SOURCE = "in_cfa_bulk";
const SOURCE_URL =
  "https://campaignfinance.in.gov/PublicSite/Docs/BulkDataDownloads/";
const ELECTION_CYCLE = "2024";

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
  inCandidateName: string;
}

export type InCfaIngestCounts = {
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
 * Extract last name from an Indiana CandidateName field.
 * Format is "FIRST [MIDDLE] LAST" (all-caps space-separated).
 * Last name = last space-delimited token.
 */
function extractLastNameFromInName(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? "");
}

/**
 * Extract first name (first token) from an Indiana CandidateName field.
 */
function extractFirstNameFromInName(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[0] ?? "");
}

function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? "");
}

// ---------------------------------------------------------------------------
// Stream a single ZIP entry line-by-line via `unzip -p`
//
// The IN CSV is latin-1 encoded. Node readline will treat the stdout as
// a binary stream; latin-1 is a subset of ISO-8859-1 and all characters
// in the range 0x00–0xFF pass through correctly when decoded as
// 'latin1' (alias 'binary'). We request latin1 decoding so that
// extended characters (e.g. accented letters) are not mangled.
// ---------------------------------------------------------------------------

async function streamZipEntry(
  zipPath: string,
  entry: string,
  onRow: (row: Record<string, string>) => void,
  limit: number | null,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, entry], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });

    // Treat stdout as latin-1 so extended characters decode correctly
    proc.stdout.setEncoding("latin1");

    let headers: string[] | null = null;
    let errOutput = "";
    let rowCount = 0;
    let done = false;

    proc.stderr.on("data", (chunk: Buffer) => {
      errOutput += chunk.toString();
    });

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
        row[headers[i] ?? ""] = fields[i] ?? "";
      }

      onRow(row);
      rowCount++;

      if (limit !== null && rowCount >= limit) {
        done = true;
        rl.close();
        proc.kill();
      }
    });

    rl.on("close", () => resolve(rowCount));
    rl.on("error", reject);

    proc.on("error", reject);
    proc.on("close", (code) => {
      // code 0 = success, null or other = killed by us (limit) or error
      if (code !== 0 && code !== null && !done) {
        reject(
          new Error(
            `[in-cfa-donors] unzip exited with code ${code}: ${errOutput.trim()}`,
          ),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Main ingest logic
// ---------------------------------------------------------------------------

export async function ingestInCfaDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<InCfaIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[in-cfa-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load IN state candidates from DB
  console.log("[in-cfa-donors] querying DB for IN state candidates ...");
  const dbCandidatesRaw = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-IN%'`);
  const dbCandidates = dbCandidatesRaw as DbCandidate[];
  console.log(`[in-cfa-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn("[in-cfa-donors] no IN state candidates found in DB");
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
  const byFirstName = new Map<string, DbCandidate[]>();

  for (const cand of dbCandidates) {
    const parts = cand.fullName.trim().split(/\s+/u).filter(Boolean);
    const lastName = extractLastNameFromDbName(cand.fullName);
    const firstName = normalizeStr(parts[0] ?? "");

    if (lastName) {
      const existing = byLastName.get(lastName) ?? [];
      existing.push(cand);
      byLastName.set(lastName, existing);
    }
    if (firstName && firstName !== lastName) {
      const existing = byFirstName.get(firstName) ?? [];
      existing.push(cand);
      byFirstName.set(firstName, existing);
    }
  }

  console.log(
    `[in-cfa-donors] last_names_indexed=${byLastName.size} first_names_indexed=${byFirstName.size}`,
  );

  // Cache IN CandidateName → DB candidate
  const nameCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(inCandidateName: string): DbCandidate | null {
    if (nameCache.has(inCandidateName))
      return nameCache.get(inCandidateName) ?? null;

    const lastName = extractLastNameFromInName(inCandidateName);
    if (!lastName) {
      nameCache.set(inCandidateName, null);
      return null;
    }

    const lastMatches = byLastName.get(lastName);
    if (lastMatches && lastMatches.length > 0) {
      if (lastMatches.length === 1) {
        nameCache.set(inCandidateName, lastMatches[0] ?? null);
        return lastMatches[0] ?? null;
      }

      // Multiple last-name matches — disambiguate by first name
      const firstName = extractFirstNameFromInName(inCandidateName);
      if (firstName) {
        const firstMatch = lastMatches.find(
          (c) =>
            normalizeStr(c.fullName.trim().split(/\s+/u)[0] ?? "") ===
            firstName,
        );
        if (firstMatch) {
          nameCache.set(inCandidateName, firstMatch);
          return firstMatch;
        }
      }

      // Fall back to first match in list
      nameCache.set(inCandidateName, lastMatches[0] ?? null);
      return lastMatches[0] ?? null;
    }

    // Fallback: try first-name match
    const firstName = extractFirstNameFromInName(inCandidateName);
    const firstMatches = byFirstName.get(firstName);
    if (firstMatches && firstMatches.length === 1) {
      nameCache.set(inCandidateName, firstMatches[0] ?? null);
      return firstMatches[0] ?? null;
    }

    nameCache.set(inCandidateName, null);
    return null;
  }

  // Step 3: Stream the CSV from ZIP and accumulate contributions

  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  let contributionsFetched = 0;
  let contributionsFiltered = 0;

  console.log(
    `[in-cfa-donors] streaming ${ZIP_PATH}!${CSV_ENTRY} ...`,
  );

  const rowsRead = await streamZipEntry(
    ZIP_PATH,
    CSV_ENTRY,
    (row) => {
      contributionsFetched++;

      // Filter 1: CommitteeType must be "Candidate"
      const committeeType = (row["CommitteeType"] ?? "").trim();
      if (committeeType !== "Candidate") return;

      // Filter 2: CandidateName must be non-empty
      const candidateName = (row["CandidateName"] ?? "").trim();
      if (!candidateName) return;

      // Filter 3: Amount must be > 0
      const amountRaw = (row["Amount"] ?? "").trim();
      const amount = Number.parseFloat(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) return;

      // Filter 4: Skip In-Kind contributions
      const type = (row["Type"] ?? "").trim();
      if (/in[- ]kind/iu.test(type)) return;

      // Filter 5: ContributionDate must start with "2024"
      const contributionDate = (row["ContributionDate"] ?? "").trim();
      if (!contributionDate.startsWith("2024")) return;

      // Match CandidateName to DB candidate
      const dbCandidate = resolveCandidate(candidateName);
      if (!dbCandidate) return;

      contributionsFiltered++;

      // Classify into donor bucket
      const contributorType = (row["ContributorType"] ?? "").trim();
      const occupation = (row["Occupation"] ?? "").trim();
      const donorName = (row["Name"] ?? "").trim();

      let bucket: DonorBucketLabel;

      if (contributorType === "Candidate") {
        // Self-funded contribution
        bucket = "Self-funded";
      } else if (contributorType === "Individual") {
        // Individual donor — try occupation first, fall back to amount
        const occupationBucket = mapEmployerToBucket(occupation);
        if (occupationBucket !== null) {
          bucket = occupationBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Corporation, Political Action, Party, Union, etc.
        const orgBucket = mapEmployerToBucket(donorName) ?? null;
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
          inCandidateName: candidateName,
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
    `[in-cfa-donors] stream_complete rows_read=${rowsRead} contributions_fetched=${contributionsFetched} filtered_matched=${contributionsFiltered} candidates_matched=${candidateMatchedNames.size}`,
  );

  // Step 4: Build upsert rows
  const rows: Array<{
    candidateId: string;
    electionCycle: string;
    bucketLabel: string;
    amountTotal: string;
    source: string;
    sourceUrl: string;
    rawMetadata: UnknownRecord;
  }> = [];

  for (const [aggKey, value] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucket = aggKey.substring(secondPipe + 1);

    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const matchedNames = [
      ...(candidateMatchedNames.get(candidateId) ?? []),
    ];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        inCandidateNames: matchedNames,
      },
    });
  }

  console.log(
    `[in-cfa-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[in-cfa-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
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

  const counts: InCfaIngestCounts = {
    contributionsFetched,
    contributionsFiltered,
    candidatesMatched: candidateMatchedNames.size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[in-cfa-donors] complete",
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
  ingestInCfaDonors().catch((error: unknown) => {
    const msg =
      error instanceof Error
        ? error.message.replace(/\s+/gu, " ")
        : "unknown";
    console.error("[in-cfa-donors] failed:", msg);
    process.exitCode = 1;
  });
}

/**
 * scripts/ingest/ky-kref-donors.ts
 *
 * Kentucky donor ingest from the Kentucky Registry of Election Finance (KREF).
 * Source: https://secure.kentucky.gov/kref/publicsearch/ToCandidateSearch
 *
 * Export URLs (no auth required, direct GET):
 *   House: https://secure.kentucky.gov/kref/publicsearch/ExportContributors?ElectionDate=11%2F05%2F2024%2000%3A00%3A00&ElectionType=GENERAL&OfficeSought=STATE%20REPRESENTATIVE&ContributionSearchType=Candidate
 *   Senate: https://secure.kentucky.gov/kref/publicsearch/ExportContributors?ElectionDate=11%2F05%2F2024%2000%3A00%3A00&ElectionType=GENERAL&OfficeSought=STATE%20SENATOR%20(ODD)&ContributionSearchType=Candidate
 *
 * Note: Download via Playwright (Incapsula WAF blocks direct curl). Navigate to
 * ToCandidateSearch, select 11/5/2024 election + GENERAL type + office, click Export.
 *
 * CSV columns:
 *   To Organization, From Organization Name,
 *   Contributor Last Name, Contributor First Name,
 *   Recipient Last Name, Recipient First Name,
 *   Office Sought, Location, Election Date, Election Type,
 *   ..., Amount, Contribution Type, Contribution Mode,
 *   Occupation, Other Occupation, Employer, ...
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ky-kref-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ky-kref-donors.ts \
 *     --house-file /tmp/KY_house_2024.csv \
 *     --senate-file /tmp/KY_senate_2024.csv
 *
 * Default files: /tmp/KY_house_2024.csv, /tmp/KY_senate_2024.csv
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
import * as readline from "node:readline";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_HOUSE_FILE = "/tmp/KY_house_2024.csv";
const DEFAULT_SENATE_FILE = "/tmp/KY_senate_2024.csv";
const SOURCE = "ky_kref_bulk";
const SOURCE_URL = "https://secure.kentucky.gov/kref/publicsearch/ToCandidateSearch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

// ---------------------------------------------------------------------------
// Name normalization helpers
// ---------------------------------------------------------------------------

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFullName(last: string, first: string): string {
  return norm(`${last} ${first}`);
}

function extractLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitial(fullName: string): string {
  return norm(fullName).split(" ").filter(Boolean)[0]?.[0] ?? "";
}

// ---------------------------------------------------------------------------
// CSV parsing (handle quoted commas)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// ---------------------------------------------------------------------------
// Process one file
// ---------------------------------------------------------------------------

async function processFile(
  filePath: string,
  lastNameIdx: Map<string, DbCandidate[]>,
  agg: Map<string, number>,
  candidateNames: Map<string, string>,
  electionCycle: string,
): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;

  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (headers === null) {
      headers = parseCsvLine(trimmed);
      continue;
    }

    const cols = parseCsvLine(trimmed);
    const row: Record<string, string> = {};
    for (let i = 0; i < (headers?.length ?? 0); i++) {
      row[headers?.[i] ?? ""] = cols[i] ?? "";
    }

    // Parse amount — skip non-positive
    const amountStr = (row["Amount"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped++;
      continue;
    }

    // Skip bank interest (not a contribution)
    const contribType = row["Contribution Type"]?.trim() ?? "";
    if (contribType === "INTEREST") {
      skipped++;
      continue;
    }

    // Match recipient to DB candidate
    const recipLast = row["Recipient Last Name"]?.trim() ?? "";
    const recipFirst = row["Recipient First Name"]?.trim() ?? "";
    if (!recipLast) {
      skipped++;
      continue;
    }

    const lastKey = norm(recipLast);
    const firstInitial = norm(recipFirst)[0] ?? "";
    const dbCandidates = lastNameIdx.get(lastKey);

    if (!dbCandidates || dbCandidates.length === 0) {
      skipped++;
      continue;
    }

    let dbMatch: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0] ?? null;
    } else {
      dbMatch =
        dbCandidates.find(
          (c) => extractFirstInitial(c.fullName) === firstInitial,
        ) ??
        dbCandidates[0] ??
        null;
    }

    if (!dbMatch) {
      skipped++;
      continue;
    }

    // Classify into bucket
    const fromOrg = row["From Organization Name"]?.trim() ?? "";
    const employer = row["Employer"]?.trim() ?? "";
    const occupation = row["Occupation"]?.trim() ?? "";

    let bucket: DonorBucketLabel;

    switch (contribType) {
      case "CANDIDATE":
        bucket = "Self-funded";
        break;
      case "EXECUTIVECOMM":
      case "CAUCUS_CAMP_COMM":
        bucket = "Party committees";
        break;
      case "KYPAC":
      case "CONTRIBUTINGORGANIZATION":
      case "OTHER_CANDIDATES": {
        const orgBucket = mapEmployerToBucket(fromOrg);
        bucket = orgBucket ?? "Other";
        break;
      }
      case "UNITEMIZED":
        bucket = "Small individual donors (under $200)";
        break;
      case "INDIVIDUAL":
      case "CASH":
      case "ANONYMOUS":
      case "CANDIDATE_DEBT_ASSUMPTION":
      case "OTHER": {
        const empBucket = mapEmployerToBucket(employer || occupation);
        if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
          bucket = empBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
        break;
      }
      default:
        bucket = bucketIndividualByAmount(amount);
    }

    const aggKey = `${dbMatch.id}|${electionCycle}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, `${recipFirst} ${recipLast}`);
    processed++;
  }

  return { processed, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const houseFileIdx = process.argv.indexOf("--house-file");
  const senateFileIdx = process.argv.indexOf("--senate-file");
  const cycleIdx = process.argv.indexOf("--election-cycle");
  const ELECTION_CYCLE = cycleIdx !== -1 ? (process.argv[cycleIdx + 1] ?? "2024") : "2024";
  const houseFile =
    houseFileIdx !== -1
      ? (process.argv[houseFileIdx + 1] ?? DEFAULT_HOUSE_FILE)
      : DEFAULT_HOUSE_FILE;
  const senateFile =
    senateFileIdx !== -1
      ? (process.argv[senateFileIdx + 1] ?? DEFAULT_SENATE_FILE)
      : DEFAULT_SENATE_FILE;

  for (const [label, f] of [["house", houseFile], ["senate", senateFile]] as const) {
    if (!fs.existsSync(f)) {
      console.error(`[ky-kref] missing ${label} file: ${f}`);
      process.exitCode = 1;
      return;
    }
  }

  const db = requireDb();

  const kyHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-KY-house'`)) as DbCandidate[];
  const kySenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-KY-senate'`)) as DbCandidate[];

  console.log(`[ky-kref] DB: house=${kyHouse.length} senate=${kySenate.length}`);

  // Build last-name index (combined)
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...kyHouse, ...kySenate]) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();

  const houseResult = await processFile(houseFile, lastNameIdx, agg, candidateNames, ELECTION_CYCLE);
  console.log(
    `[ky-kref] house: processed=${houseResult.processed} skipped=${houseResult.skipped}`,
  );

  const senateResult = await processFile(senateFile, lastNameIdx, agg, candidateNames, ELECTION_CYCLE);
  console.log(
    `[ky-kref] senate: processed=${senateResult.processed} skipped=${senateResult.skipped}`,
  );

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[ky-kref] candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[ky-kref] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
      );
    }
    return;
  }

  let upserted = 0;
  for (const [aggKey, amount] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1) as DonorBucketLabel;

    await db
      .insert(donorAggregates)
      .values({
        candidateId,
        electionCycle: cycle,
        bucketLabel,
        amountTotal: amount.toFixed(2),
        source: SOURCE,
        sourceUrl: SOURCE_URL,
        rawMetadata: {
          kyRecipientName: candidateNames.get(candidateId) ?? "",
        },
        insertedAt: new Date(),
      })
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
    upserted++;
  }

  console.log(`[ky-kref] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ky-kref] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

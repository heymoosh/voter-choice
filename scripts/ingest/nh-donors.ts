/**
 * scripts/ingest/nh-donors.ts
 *
 * New Hampshire donor ingest from NH Campaign Finance System.
 * Source: https://cfs.sos.nh.gov/public/cf/downloads
 * API: POST https://cfsapi.sos.nh.gov/api/ExportData/GetExportPublicDownloadData
 *
 * The "Receipts" file combines contributions with loans and interest.
 * Candidate committee rows have Committee Subtype = "" (empty).
 * Candidate Name format: "Last, First [Middle] [Suffix] (optionalNickname)"
 *
 * Transaction Sub Types used: Itemized Monetary, Unitemized Monetary, Monetary Contribution
 * Contributor Types: Individual / Candidate, Business/ Group / Organization, Political Committee, Self
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nh-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nh-donors.ts --file /tmp/NH_contributions_2024.csv
 *
 * Default file: /tmp/NH_contributions_2024.csv (download from the Receipts 2024 link)
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

const DEFAULT_FILE = "/tmp/NH_contributions_2024.csv";
const SOURCE = "nh_cfs_bulk";
const SOURCE_URL = "https://cfs.sos.nh.gov/public/cf/downloads";
const ELECTION_CYCLE = "2024";

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

function extractLastFromDbName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitialFromDbName(fullName: string): string {
  return norm(fullName).split(" ").filter(Boolean)[0]?.[0] ?? "";
}

/**
 * Parse NH "Candidate Name": "Last, First [Middle] [Suffix] (optionalNickname)"
 * Strips parenthetical nicknames like "(Long, Pat )"
 */
function parseCandidateName(
  name: string,
): { last: string; first: string } | null {
  // Remove parenthetical sections
  const raw = name.replace(/\([^)]*\)/g, "").trim();
  const commaIdx = raw.indexOf(",");
  if (commaIdx <= 0) return null;
  const last = raw.substring(0, commaIdx).trim();
  const rest = raw.substring(commaIdx + 1).trim();
  const firstWord = rest.split(/\s+/)[0] ?? "";
  if (firstWord.length > 1 && !/^(for|of|the|and|by|at|to)$/i.test(firstWord)) {
    return { last, first: firstWord };
  }
  return null;
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const fileIdx = process.argv.indexOf("--file");
  const filePath =
    fileIdx !== -1 ? (process.argv[fileIdx + 1] ?? DEFAULT_FILE) : DEFAULT_FILE;

  if (!fs.existsSync(filePath)) {
    console.error(`[nh] file not found: ${filePath}`);
    console.error(`Download from: ${SOURCE_URL} → Receipts → 2024`);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  const nhHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-NH-house'`)) as DbCandidate[];
  const nhSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-NH-senate'`)) as DbCandidate[];

  console.log(`[nh] DB: house=${nhHouse.length} senate=${nhSenate.length}`);

  // Build last-name index
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...nhHouse, ...nhSenate]) {
    const last = extractLastFromDbName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();
  let rowsProcessed = 0;
  let rowsSkipped = 0;

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

    // Only candidate committee rows (empty Committee Subtype)
    const subType = row["Committee Subtype"]?.trim() ?? "";
    if (subType !== "") {
      rowsSkipped++;
      continue;
    }

    // Only monetary receipts
    const tranSubType = row["Transaction Sub Type"]?.trim() ?? "";
    if (
      tranSubType !== "Itemized Monetary" &&
      tranSubType !== "Unitemized Monetary" &&
      tranSubType !== "Monetary Contribution"
    ) {
      rowsSkipped++;
      continue;
    }

    // Parse amount
    const amountStr = (row["Amount of receipt"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      rowsSkipped++;
      continue;
    }

    // Parse candidate name
    const candidateName = row["Candidate Name"]?.trim() ?? "";
    const parsed = parseCandidateName(candidateName);
    if (!parsed) {
      rowsSkipped++;
      continue;
    }

    const lastKey = norm(parsed.last);
    const firstInitial = norm(parsed.first)[0] ?? "";
    const dbCandidates = lastNameIdx.get(lastKey);

    if (!dbCandidates || dbCandidates.length === 0) {
      rowsSkipped++;
      continue;
    }

    let dbMatch: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0] ?? null;
    } else {
      dbMatch =
        dbCandidates.find(
          (c) => extractFirstInitialFromDbName(c.fullName) === firstInitial,
        ) ??
        dbCandidates[0] ??
        null;
    }

    if (!dbMatch) {
      rowsSkipped++;
      continue;
    }

    // Classify contributor
    const contribType = row["Contributor Type"]?.trim() ?? "";
    const employer = row["Contributor Employer"]?.trim() ?? "";
    const contribName = row["Contributor Name"]?.trim() ?? "";

    let bucket: DonorBucketLabel;

    if (contribType === "Self") {
      bucket = "Self-funded";
    } else if (tranSubType === "Unitemized Monetary") {
      bucket = "Small individual donors (under $200)";
    } else if (contribType === "Business/ Group / Organization") {
      bucket = mapEmployerToBucket(contribName || employer) ?? "Other";
    } else if (contribType === "Political Committee" || contribType === "Candidate Committee") {
      bucket = "Other";
    } else if (contribType === "Individual / Candidate") {
      const empBucket = mapEmployerToBucket(employer);
      if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
        bucket = empBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      bucket = bucketIndividualByAmount(amount);
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, candidateName.substring(0, 50));
    rowsProcessed++;

    if (rowsProcessed % 5000 === 0) {
      console.log(`[nh] processed=${rowsProcessed}`);
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[nh] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[nh] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { nhCandidateName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[nh] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[nh] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

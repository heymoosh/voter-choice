/**
 * scripts/ingest/oh-sos-donors.ts
 *
 * Ohio donor ingest from the Ohio Secretary of State Campaign Finance
 * File Transfer Page.
 *
 * Source: https://www6.ohiosos.gov/ords/f?p=CFDISCLOSURE:73:...:CAN:...
 * File: Candidate Contributions-2024 (CAC_CON_2024.CSV, ~18MB)
 *
 * Downloaded via Playwright (bypasses Cloudflare on ohiosos.gov).
 *
 * CSV columns:
 *   COM_NAME, MASTER_KEY, REPORT_DESCRIPTION, RPT_YEAR, REPORT_KEY,
 *   SHORT_DESCRIPTION, FIRST_NAME, MIDDLE_NAME, LAST_NAME, SUFFIX_NAME,
 *   NON_INDIVIDUAL, PAC_REG_NO, ADDRESS, CITY, STATE, ZIP, FILE_DATE,
 *   AMOUNT, EVENT_DATE, EMP_OCCUPATION, INKIND_DESCRIPTION,
 *   OTHER_INCOME_TYPE, RCV_EVENT, CANDIDATE_FIRST_NAME, CANDIDATE_LAST_NAME,
 *   OFFICE, DISTRICT, PARTY
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/oh-sos-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/oh-sos-donors.ts \
 *     --file /path/to/CAC_CON_2024.CSV
 *
 * Default file path: /tmp/OH_CAC_CON_2024.CSV
 *
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

const DEFAULT_FILE = "/tmp/OH_CAC_CON_2024.CSV";
const SOURCE = "oh_sos_bulk";
const SOURCE_URL =
  "https://www6.ohiosos.gov/ords/f?p=CFDISCLOSURE:73:::NO:RP:P73_TYPE:CAN:";
const ELECTION_CYCLE = "2024";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

type BucketAgg = Map<DonorBucketLabel, number>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAME_SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function normalizeStr(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLastName(fullName: string): string {
  const parts = normalizeStr(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!NAME_SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitial(fullName: string): string {
  return normalizeStr(fullName).split(" ").filter(Boolean)[0]?.[0] ?? "";
}

function buildCandidateIndex(
  dbCandidates: DbCandidate[],
): Map<string, DbCandidate[]> {
  const idx = new Map<string, DbCandidate[]>();
  for (const c of dbCandidates) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = idx.get(last) ?? [];
    existing.push(c);
    idx.set(last, existing);
  }
  return idx;
}

function findCandidate(
  firstName: string,
  lastName: string,
  idx: Map<string, DbCandidate[]>,
): DbCandidate | null {
  const last = normalizeStr(lastName);
  const firstInitial = normalizeStr(firstName)[0] ?? "";
  const candidates = idx.get(last);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;
  return (
    candidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
    candidates[0] ??
    null
  );
}

// ---------------------------------------------------------------------------
// CSV streaming (no unzip needed — OH file is plain CSV)
// ---------------------------------------------------------------------------

async function processFile(
  filePath: string,
  houseIdx: Map<string, DbCandidate[]>,
  senateIdx: Map<string, DbCandidate[]>,
): Promise<{
  agg: Map<string, BucketAgg>;
  candidateNames: Map<string, string>;
  skipped: number;
}> {
  const agg = new Map<string, BucketAgg>();
  const candidateNames = new Map<string, string>();
  let skipped = 0;

  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (headers === null) {
      headers = parseCSVLine(trimmed);
      continue;
    }

    const cols = parseCSVLine(trimmed);
    const row: Record<string, string> = {};
    for (let i = 0; i < (headers?.length ?? 0); i++) {
      row[headers?.[i] ?? ""] = cols[i] ?? "";
    }

    const office = row["OFFICE"]?.trim() ?? "";
    if (office !== "HOUSE" && office !== "SENATE") continue;

    const amount = parseFloat(row["AMOUNT"]?.trim() ?? "0");
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const candFirst = row["CANDIDATE_FIRST_NAME"]?.trim() ?? "";
    const candLast = row["CANDIDATE_LAST_NAME"]?.trim() ?? "";
    if (!candLast) continue;

    const idx = office === "HOUSE" ? houseIdx : senateIdx;
    const dbMatch = findCandidate(candFirst, candLast, idx);

    if (!dbMatch) {
      skipped += 1;
      continue;
    }

    // Classify contribution into a bucket
    const empOccupation = row["EMP_OCCUPATION"]?.trim() ?? "";
    const nonIndividual = row["NON_INDIVIDUAL"]?.trim() ?? "";
    const firstName = row["FIRST_NAME"]?.trim() ?? "";

    let bucket: DonorBucketLabel;

    if (nonIndividual) {
      // PAC or organization contribution
      const orgBucket = mapEmployerToBucket(nonIndividual);
      bucket = orgBucket ?? "Other";
    } else if (firstName) {
      // Individual contribution — use employer/occupation
      const empBucket = mapEmployerToBucket(empOccupation);
      if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
        bucket = empBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    } else {
      bucket = "Other";
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.set(bucket, (existing.get(bucket) ?? 0) + amount);
    } else {
      const newMap: BucketAgg = new Map();
      newMap.set(bucket, amount);
      agg.set(aggKey, newMap);
    }

    candidateNames.set(
      dbMatch.id,
      `${candFirst} ${candLast}`.trim(),
    );
  }

  return { agg, candidateNames, skipped };
}

// ---------------------------------------------------------------------------
// Simple CSV parser
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
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
  const filePath = fileIdx !== -1 ? (process.argv[fileIdx + 1] ?? DEFAULT_FILE) : DEFAULT_FILE;

  if (!fs.existsSync(filePath)) {
    console.error(`[oh-sos] file not found: ${filePath}`);
    console.error(
      "Download from: https://www6.ohiosos.gov/ords/f?p=CFDISCLOSURE:73:::NO:RP:P73_TYPE:CAN:",
    );
    console.error("  → Click 'Candidate Contributions-2024' → save as " + DEFAULT_FILE);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  // Load OH candidates from DB
  const ohHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OH-house'`)) as DbCandidate[];
  const ohSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OH-senate'`)) as DbCandidate[];

  console.log(
    `[oh-sos] DB: house=${ohHouse.length} senate=${ohSenate.length} candidates`,
  );

  const houseIdx = buildCandidateIndex(ohHouse);
  const senateIdx = buildCandidateIndex(ohSenate);

  console.log(`[oh-sos] processing ${filePath} ...`);
  const { agg, candidateNames, skipped } = await processFile(
    filePath,
    houseIdx,
    senateIdx,
  );

  console.log(
    `[oh-sos] agg_keys=${agg.size} skipped_rows=${skipped}`,
  );

  // Flatten agg into upsert rows
  let upserted = 0;
  let matchedCandidates = new Set<string>();

  for (const [aggKey, bucketMap] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1) as DonorBucketLabel;
    const amount = bucketMap.get(bucketLabel) ?? 0;

    if (amount <= 0) continue;
    matchedCandidates.add(candidateId);

    if (!isDryRun) {
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
            ohCandidateName: candidateNames.get(candidateId) ?? "",
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
      upserted += 1;
    }
  }

  console.log(
    `[oh-sos] done candidates_matched=${matchedCandidates.size} rows_upserted=${isDryRun ? "(dry-run)" : upserted}`,
  );
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[oh-sos] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

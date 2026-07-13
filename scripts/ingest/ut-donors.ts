/**
 * scripts/ingest/ut-donors.ts
 *
 * Utah donor ingest from the Utah Lieutenant Governor's Office ORCA Disclosure system.
 * Source: https://disclosures.utah.gov/Search/AdvancedSearch
 * Download URL: https://disclosures.utah.gov/Search/AdvancedSearch/GenerateReport?ReportYear=2024&EntityType=PCC
 *
 * CSV columns (PCC = Political Campaign Committee = candidate):
 *   FILED, PCC (format: "Last, First"), REPORT, TRAN_ID, TRAN_TYPE,
 *   TRAN_DATE, TRAN_AMT, INKIND, LOAN, AMENDS,
 *   NAME (contributor), PURPOSE, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, INKIND_COMMENTS
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ut-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ut-donors.ts --file /tmp/UT_PCC_2024.csv
 *
 * Default file: /tmp/UT_PCC_2024.csv
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

const DEFAULT_FILE = "/tmp/UT_PCC_2024.csv";
const SOURCE = "ut_orca_bulk";
const SOURCE_URL = "https://disclosures.utah.gov/Search/AdvancedSearch";
const ELECTION_CYCLE = "2024";
const DOWNLOAD_URL =
  "https://disclosures.utah.gov/Search/AdvancedSearch/GenerateReport?ReportYear=2024&EntityType=PCC";

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
 * Parse UT PCC name: "Last, First [Middle]"
 */
function parsePccName(
  name: string,
): { last: string; first: string } | null {
  const raw = name.trim();
  const commaIdx = raw.indexOf(",");
  if (commaIdx > 0) {
    const last = raw.substring(0, commaIdx).trim();
    const rest = raw.substring(commaIdx + 1).trim();
    const firstWord = rest.split(/\s+/)[0] ?? "";
    if (
      firstWord.length > 1 &&
      !/^(for|of|the|and|by|at|to)$/i.test(firstWord)
    ) {
      return { last, first: firstWord };
    }
  }
  return null;
}

/**
 * Determine if contributor NAME is an org (no comma = not "Last, First").
 */
function isOrgName(name: string): boolean {
  return !name.includes(",");
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
    console.error(`[ut] file not found: ${filePath}`);
    console.error(`Download from: ${DOWNLOAD_URL}`);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  const utHouse = (await db
    .select()
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} = 'state-UT-house'`,
    )) as DbCandidate[];
  const utSenate = (await db
    .select()
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} = 'state-UT-senate'`,
    )) as DbCandidate[];

  console.log(`[ut] DB: house=${utHouse.length} senate=${utSenate.length}`);

  // Build last-name index
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...utHouse, ...utSenate]) {
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

    // Only contributions
    const tranType = row["TRAN_TYPE"]?.trim() ?? "";
    if (tranType !== "Contribution") {
      rowsSkipped++;
      continue;
    }

    // Parse amount
    const amountStr = (row["TRAN_AMT"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      rowsSkipped++;
      continue;
    }

    // Parse PCC candidate name
    const pccName = row["PCC"]?.trim() ?? "";
    const parsed = parsePccName(pccName);
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
    const contribName = row["NAME"]?.trim() ?? "";
    let bucket: DonorBucketLabel;

    if (!contribName) {
      bucket = bucketIndividualByAmount(amount);
    } else if (isOrgName(contribName)) {
      bucket = mapEmployerToBucket(contribName) ?? "Other";
    } else {
      bucket = bucketIndividualByAmount(amount);
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, `${parsed.first} ${parsed.last}`);
    rowsProcessed++;
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[ut] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[ut] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { utPccName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[ut] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ut] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

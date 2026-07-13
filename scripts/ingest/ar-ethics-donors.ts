/**
 * scripts/ingest/ar-ethics-donors.ts
 *
 * Arkansas donor ingest from Arkansas Secretary of State Financial Disclosure Portal.
 * Source: https://ethics-disclosures.sos.arkansas.gov/public/cf/downloads
 *
 * Download: Click "2024" in the Contributions and Loans row on the downloads page.
 * The download triggers via Angular event handler (no direct URL).
 *
 * CSV fields (22 columns):
 *   Filing Entity ID, Entity Name, FilerType, Transaction Type, Transaction Sub Type,
 *   Funding Source / Loan Source Type, Source Name, Source Address,
 *   Employer Name, Occupation, Occupation Other, Transaction Date, Transaction Amount,
 *   Transaction Description, Transaction ID, Election Type, Election Year,
 *   Guarantor Name, Guarantor Address, Report Filed Date, Report Name, Amended
 *
 * Entity Name format: "Last, First" (comma-separated inside quotes)
 * FilerType: Candidate | Political Action Committee | ...
 * Transaction Type: Contribution | Return Contribution | Loan
 * Funding Source Type: Individual | Business/Organization/Unlisted PAC | Political Committee
 *   | Political Party | County Political Party Committee | Self | Non-Itemized Monetary
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ar-ethics-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ar-ethics-donors.ts \
 *     --file /tmp/AR_2024_contributions.csv
 *
 * Default file: /tmp/AR_2024_contributions.csv
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

const DEFAULT_FILE = "/tmp/AR_2024_contributions.csv";
const SOURCE = "ar_ethics_bulk";
const SOURCE_URL =
  "https://ethics-disclosures.sos.arkansas.gov/public/cf/downloads";

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

/**
 * Parse AR entity name format: "Last, First" (or "Last, First Middle")
 * Returns the last name.
 */
function extractLastNameFromArEntity(entityName: string): string | null {
  const cleaned = entityName.trim();
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx > 0) {
    const lastName = cleaned.substring(0, commaIdx).trim();
    return lastName ? lastName : null;
  }
  // No comma — treat whole name as last name (single-name entity)
  return cleaned || null;
}

function extractFirstInitialFromArEntity(entityName: string): string {
  const commaIdx = entityName.indexOf(",");
  if (commaIdx >= 0) {
    const rest = entityName.substring(commaIdx + 1).trim();
    return norm(rest)[0] ?? "";
  }
  return "";
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
  const cycleIdx = process.argv.indexOf("--election-cycle");
  const filePath =
    fileIdx !== -1 ? (process.argv[fileIdx + 1] ?? DEFAULT_FILE) : DEFAULT_FILE;
  const ELECTION_CYCLE = cycleIdx !== -1 ? (process.argv[cycleIdx + 1] ?? "2024") : "2024";

  if (!fs.existsSync(filePath)) {
    console.error(`[ar-ethics] file not found: ${filePath}`);
    console.error(
      "Download: Navigate to https://ethics-disclosures.sos.arkansas.gov/public/cf/downloads\n" +
        "  Click '2024' in the Contributions and Loans row.",
    );
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  const arHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AR-house'`)) as DbCandidate[];
  const arSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AR-senate'`)) as DbCandidate[];

  console.log(`[ar-ethics] DB: house=${arHouse.length} senate=${arSenate.length}`);

  // Build last-name index
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...arHouse, ...arSenate]) {
    const last = extractLastName(c.fullName);
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

    // Only candidate filers
    const filerType = (row["FilerType"] ?? "").trim();
    if (filerType !== "Candidate") { rowsSkipped++; continue; }

    // Only contributions (not loans, returns, etc.)
    const txType = (row["Transaction Type"] ?? "").trim();
    if (txType !== "Contribution") { rowsSkipped++; continue; }

    // Only the target election year
    const electionYear = (row["Election Year"] ?? "").trim();
    if (electionYear !== ELECTION_CYCLE) { rowsSkipped++; continue; }

    // Parse amount
    const amountStr = (row["Transaction Amount"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) { rowsSkipped++; continue; }

    // Match candidate
    const entityName = (row["Entity Name"] ?? "").trim();
    if (!entityName) { rowsSkipped++; continue; }

    const lastName = extractLastNameFromArEntity(entityName);
    if (!lastName) { rowsSkipped++; continue; }
    const lastNameNorm = norm(lastName);
    const firstInitial = extractFirstInitialFromArEntity(entityName);

    const dbCandidates = lastNameIdx.get(lastNameNorm);
    if (!dbCandidates || dbCandidates.length === 0) { rowsSkipped++; continue; }

    let dbMatch: DbCandidate;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0]!;
    } else {
      dbMatch =
        dbCandidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
        dbCandidates[0]!;
    }

    // Classify into bucket
    const sourceType = (row["Funding Source / Loan Source Type"] ?? "").trim();
    const subType = (row["Transaction Sub Type"] ?? "").trim();
    const sourceName = (row["Source Name"] ?? "").trim();
    const employer = (row["Employer Name"] ?? "").trim();
    const occupation = (row["Occupation"] ?? "").trim();

    let bucket: DonorBucketLabel;

    if (sourceType === "Self") {
      bucket = "Self-funded";
    } else if (
      subType === "Non-Itemized Monetary" ||
      sourceType === "Non-Itemized Monetary"
    ) {
      bucket = "Small individual donors (under $200)";
    } else if (
      sourceType === "Political Party" ||
      sourceType === "County Political Party Committee"
    ) {
      bucket = "Party committees";
    } else if (
      sourceType === "Political Committee" ||
      sourceType === "Political Action Committee"
    ) {
      const pcBucket = mapEmployerToBucket(sourceName);
      bucket = pcBucket ?? "Other";
    } else if (sourceType === "Business/Organization/Unlisted PAC") {
      const orgBucket = mapEmployerToBucket(sourceName);
      bucket = orgBucket ?? "Other";
    } else {
      // Individual
      const empBucket = mapEmployerToBucket(employer || occupation);
      if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
        bucket = empBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, entityName);
    rowsProcessed++;

    if (rowsProcessed % 10000 === 0) {
      console.log(`[ar-ethics] processed=${rowsProcessed}`);
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[ar-ethics] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[ar-ethics] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { arEntityName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[ar-ethics] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ar-ethics] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

/**
 * scripts/ingest/ak-apoc-donors.ts
 *
 * Alaska donor ingest from AK Public Offices Commission (APOC) Campaign Disclosure.
 * Source: https://aws.state.ak.us/apocreports/campaigndisclosure/CDIncome.aspx
 *
 * Download procedure:
 *   1. Navigate to https://aws.state.ak.us/apocreports/campaigndisclosure/CDIncome.aspx
 *   2. Select Report Year = 2024
 *   3. Click Search
 *   4. Open browser devtools, set target attribute of Export All CSV link to empty,
 *      then click it (or: evaluate `document.querySelector('#M_C_...hlAllCSV').removeAttribute('target'); document.querySelector('#M_C_...hlAllCSV').click()`)
 *   5. Save downloaded file as /tmp/AK_2024_income.csv
 *
 * CSV fields (25 cols):
 *   Result, Date, Transaction Type, Payment Type, Payment Detail, Amount,
 *   Last/Business Name, First Name, Address, City, State, Zip, Country,
 *   Occupation, Employer, Purpose of Expenditure, --------, Report Type,
 *   Election Name, Election Type, Municipality, Office, Filer Type, Name, Report Year, Submitted
 *
 * Filer Type = "Candidate"; Office = "House" or "Senate"; Transaction Type = "Income"
 * Name (col 24): candidate full name (First Last or First Middle Last)
 * Last/Business Name + First Name: contributor name
 *
 * Bucket mapping:
 *   Payment Type = "Payroll Deduction" → Small individual donors (under $200)
 *   Last/Business Name looks like org (no FirstName field) → mapEmployerToBucket
 *   Individual → mapEmployerToBucket(Employer|Occupation) or bucketIndividualByAmount
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ak-apoc-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ak-apoc-donors.ts \
 *     --file /tmp/AK_2024_income.csv
 *
 * Default file: /tmp/AK_2024_income.csv
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

const DEFAULT_FILE = "/tmp/AK_2024_income.csv";
const SOURCE = "ak_apoc_bulk";
const SOURCE_URL =
  "https://aws.state.ak.us/apocreports/campaigndisclosure/CDIncome.aspx";
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

function extractLastName(fullName: string): string {
  // Strip parenthetical nicknames like "(Dan)" or "(Don)"
  const cleaned = fullName.replace(/\([^)]*\)/g, "").trim();
  const parts = norm(cleaned).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitial(fullName: string): string {
  const cleaned = fullName.replace(/\([^)]*\)/g, "").trim();
  return norm(cleaned).split(" ").filter(Boolean)[0]?.[0] ?? "";
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
    console.error(`[ak-apoc] file not found: ${filePath}`);
    console.error(
      "Download from https://aws.state.ak.us/apocreports/campaigndisclosure/CDIncome.aspx\n" +
        "  1. Select Report Year=2024, click Search\n" +
        "  2. Click Export, remove target=_blank from .CSV link, then click it",
    );
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  const akHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AK-house'`)) as DbCandidate[];
  const akSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AK-senate'`)) as DbCandidate[];

  console.log(`[ak-apoc] DB: house=${akHouse.length} senate=${akSenate.length}`);

  // Build last-name index per chamber
  const houseIdx = new Map<string, DbCandidate[]>();
  const senateIdx = new Map<string, DbCandidate[]>();

  for (const c of akHouse) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = houseIdx.get(last) ?? [];
    existing.push(c);
    houseIdx.set(last, existing);
  }
  for (const c of akSenate) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = senateIdx.get(last) ?? [];
    existing.push(c);
    senateIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;

  // Column indices (resolved after reading header)
  let txTypeIdx = -1, payTypeIdx = -1, officeIdx = -1, filerTypeIdx = -1;
  let nameIdx = -1, lastNameIdx = -1, firstNameIdx = -1;
  let occupationIdx = -1, employerIdx = -1, amountIdx = -1;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (headers === null) {
      headers = parseCsvLine(trimmed);
      txTypeIdx = headers.indexOf("Transaction Type");
      payTypeIdx = headers.indexOf("Payment Type");
      officeIdx = headers.indexOf("Office");
      filerTypeIdx = headers.indexOf("Filer Type");
      nameIdx = headers.indexOf("Name");
      lastNameIdx = headers.indexOf("Last/Business Name");
      firstNameIdx = headers.indexOf("First Name");
      occupationIdx = headers.indexOf("Occupation");
      employerIdx = headers.indexOf("Employer");
      amountIdx = headers.indexOf("Amount");
      continue;
    }

    const cols = parseCsvLine(trimmed);

    // Only Candidate filers
    if ((cols[filerTypeIdx] ?? "").trim() !== "Candidate") { rowsSkipped++; continue; }
    // Only Income transactions
    if ((cols[txTypeIdx] ?? "").trim() !== "Income") { rowsSkipped++; continue; }
    // Only House or Senate
    const office = (cols[officeIdx] ?? "").trim();
    if (office !== "House" && office !== "Senate") { rowsSkipped++; continue; }

    // Parse amount
    const amountStr = (cols[amountIdx] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) { rowsSkipped++; continue; }

    // Match candidate
    const candidateName = (cols[nameIdx] ?? "").trim();
    if (!candidateName) { rowsSkipped++; continue; }
    const lastName = extractLastName(candidateName);
    const firstInitial = extractFirstInitial(candidateName);
    if (!lastName) { rowsSkipped++; continue; }

    const idx = office === "House" ? houseIdx : senateIdx;
    const dbCandidates = idx.get(lastName);
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
    const payType = (cols[payTypeIdx] ?? "").trim();
    const contribLast = (cols[lastNameIdx] ?? "").trim();
    const contribFirst = (cols[firstNameIdx] ?? "").trim();
    const employer = (cols[employerIdx] ?? "").trim();
    const occupation = (cols[occupationIdx] ?? "").trim();

    let bucket: DonorBucketLabel;

    if (payType === "Payroll Deduction") {
      bucket = "Small individual donors (under $200)";
    } else if (!contribFirst && contribLast) {
      // No first name → organization/PAC contributor
      bucket = mapEmployerToBucket(contribLast) ?? "Other";
    } else {
      // Individual contributor — use employer/occupation for bucketing
      const empBucket = mapEmployerToBucket(employer || occupation);
      if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
        bucket = empBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, candidateName);
    rowsProcessed++;

    if (rowsProcessed % 5000 === 0) {
      console.log(`[ak-apoc] processed=${rowsProcessed}`);
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[ak-apoc] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[ak-apoc] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { akCandidateName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[ak-apoc] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[ak-apoc] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

/**
 * scripts/ingest/al-fcpa-donors.ts
 *
 * Alabama donor ingest from Alabama FCPA Campaign Finance System.
 * Source: https://fcpa.alabamavotes.gov/page.request.do?page=page.acfPublicDownloadData
 *
 * Download URLs (session cookie required — download from browser then curl with cookie):
 *   Cash Contributions 2024: /page.request.do?page=getTransactionData&id=8
 *   In-Kind Contributions 2024: /page.request.do?page=getTransactionData&id=9
 *
 * CSV fields: CommitteeId, ContributionAmount, ContributionDate,
 *   LastName, FirstName, MI, Suffix, Address1, City, State, Zip,
 *   ContributionID, FiledDate, ContributionType, ContributorType,
 *   CommitteeType, CommitteeName, CandidateName, Amended
 *
 * CandidateName: "FIRSTNAME LASTNAME" (space-separated, uppercase)
 * ContributorType: Individual | Group/Business/Corporation | PAC | Other
 * CommitteeType: Principal Campaign Committee | Political Action Committee
 * ContributionType: Cash (Itemized) | Cash (Non-Itemized) | In-Kind (Itemized)
 *                   Non-Itemized Employee Payroll Contribution
 *
 * Bucket mapping:
 *   Non-Itemized / Cash (Non-Itemized) → Small individual donors (under $200)
 *   Group/Business/Corporation | PAC → mapEmployerToBucket(LastName as org name)
 *   Individual → bucketIndividualByAmount
 *   Other → bucketIndividualByAmount
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/al-fcpa-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/al-fcpa-donors.ts \
 *     --cash-file /tmp/AL_2024_cash.csv --inkind-file /tmp/AL_2024_inkind.csv
 *
 * Default files: /tmp/AL_2024_cash.csv, /tmp/AL_2024_inkind.csv
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

const DEFAULT_CASH_FILE = "/tmp/AL_2024_cash.csv";
const DEFAULT_INKIND_FILE = "/tmp/AL_2024_inkind.csv";
const SOURCE = "al_fcpa_bulk";
const SOURCE_URL =
  "https://fcpa.alabamavotes.gov/page.request.do?page=page.acfPublicDownloadData";

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
// Process one CSV file
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

    // Only candidate committees
    const commType = (row["CommitteeType"] ?? "").trim();
    if (commType !== "Principal Campaign Committee") {
      skipped++;
      continue;
    }

    // Need a candidate name to match
    const candidateName = (row["CandidateName"] ?? "").trim();
    if (!candidateName) {
      skipped++;
      continue;
    }

    // Parse amount
    const amountStr = (row["ContributionAmount"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped++;
      continue;
    }

    // Match candidate by last name
    const lastName = extractLastName(candidateName);
    if (!lastName) { skipped++; continue; }

    const dbCandidates = lastNameIdx.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      skipped++;
      continue;
    }

    let dbMatch: DbCandidate;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0]!;
    } else {
      const firstInitial = extractFirstInitial(candidateName);
      dbMatch =
        dbCandidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
        dbCandidates[0]!;
    }

    // Classify into bucket
    const contribType = (row["ContributionType"] ?? "").trim();
    const contributorType = (row["ContributorType"] ?? "").trim();
    const orgName = (row["LastName"] ?? "").trim(); // org name stored in LastName field

    let bucket: DonorBucketLabel;

    if (
      contribType === "Cash (Non-Itemized)" ||
      contribType === "Non-Itemized Employee Payroll Contribution"
    ) {
      bucket = "Small individual donors (under $200)";
    } else if (
      contributorType === "Group/Business/Corporation" ||
      contributorType === "PAC"
    ) {
      bucket = mapEmployerToBucket(orgName) ?? "Other";
    } else {
      // Individual or Other
      bucket = bucketIndividualByAmount(amount);
    }

    const aggKey = `${dbMatch.id}|${electionCycle}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, candidateName);
    processed++;
  }

  return { processed, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const cashIdx = process.argv.indexOf("--cash-file");
  const inkindIdx = process.argv.indexOf("--inkind-file");
  const cycleIdx = process.argv.indexOf("--election-cycle");
  const cashFile = cashIdx !== -1 ? (process.argv[cashIdx + 1] ?? DEFAULT_CASH_FILE) : DEFAULT_CASH_FILE;
  const inkindFile = inkindIdx !== -1 ? (process.argv[inkindIdx + 1] ?? DEFAULT_INKIND_FILE) : DEFAULT_INKIND_FILE;
  const ELECTION_CYCLE = cycleIdx !== -1 ? (process.argv[cycleIdx + 1] ?? "2024") : "2024";

  const db = requireDb();

  const alHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AL-house'`)) as DbCandidate[];
  const alSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-AL-senate'`)) as DbCandidate[];

  console.log(`[al-fcpa] DB: house=${alHouse.length} senate=${alSenate.length}`);

  if (alHouse.length === 0 && alSenate.length === 0) {
    console.error("[al-fcpa] No AL candidates in DB — check jurisdiction slugs");
    process.exitCode = 1;
    return;
  }

  // Build last-name index (combined house + senate)
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...alHouse, ...alSenate]) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();

  for (const [label, filePath] of [["cash", cashFile], ["inkind", inkindFile]] as const) {
    if (!fs.existsSync(filePath)) {
      console.log(`[al-fcpa] skipping ${label} (file not found: ${filePath})`);
      continue;
    }
    const result = await processFile(filePath, lastNameIdx, agg, candidateNames, ELECTION_CYCLE);
    console.log(`[al-fcpa] ${label}: processed=${result.processed} skipped=${result.skipped}`);
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[al-fcpa] candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[al-fcpa] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { alCandidateName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[al-fcpa] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[al-fcpa] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

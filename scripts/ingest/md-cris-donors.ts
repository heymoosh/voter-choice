/**
 * scripts/ingest/md-cris-donors.ts
 *
 * Maryland donor ingest from Maryland Campaign Reporting Information System (MDCRIS).
 * Source: https://campaignfinance.maryland.gov/public/cf/downloads
 * API: POST https://api-campaignfinance.maryland.gov/api/ExportPublicData/GetExportPublicDownloadData
 *
 * Download command (no auth required):
 *   curl -s -X POST \
 *     "https://api-campaignfinance.maryland.gov/api/ExportPublicData/GetExportPublicDownloadData" \
 *     -H "Content-Type: application/json" -H "Referer: https://campaignfinance.maryland.gov/" \
 *     -d '{"filingYear":"2024","transactionTypeCode":"TCON","type":"CSV","fileName":"MD_2024","openInNewTab":false}' \
 *     -o /tmp/MD_contributions_2024.csv
 *
 * CSV key columns (835K rows for 2024):
 *   Committee Name, Committee Type (Candidate|PAC|Party Central|...),
 *   Contributor Type (Individual|Corporation|PAC|...),
 *   Contributor Company Name, Contributor Last Name, Contributor First Name,
 *   Transaction Amount
 *
 * Matching: committee name format "Last, First [descriptor]" parsed to extract
 * candidate name, matched against state-MD-house / state-MD-senate candidates in DB.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/md-cris-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/md-cris-donors.ts --file /tmp/MD_contributions_2024.csv
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

const DEFAULT_FILE = "/tmp/MD_contributions_2024.csv";
const SOURCE = "md_cris_bulk";
const SOURCE_URL = "https://campaignfinance.maryland.gov/public/cf/downloads";
const DOWNLOAD_CMD = `curl -s -X POST \\
  "https://api-campaignfinance.maryland.gov/api/ExportPublicData/GetExportPublicDownloadData" \\
  -H "Content-Type: application/json" \\
  -H "Referer: https://campaignfinance.maryland.gov/" \\
  -H "User-Agent: Mozilla/5.0" \\
  -d '{"filingYear":"2024","transactionTypeCode":"TCON","type":"CSV","fileName":"MD_2024","openInNewTab":false}' \\
  -o ${DEFAULT_FILE}`;

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
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
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
 * Parse MD committee name to extract candidate last and first name.
 * Formats observed:
 *   "Last, First [descriptor]"         → most common
 *   "Last (First) [descriptor]"        → less common
 *   "Friends of First Last"            → rare
 */
function parseCommitteeName(name: string): { last: string; first: string } | null {
  const raw = name.trim();

  // Format 1: "Last, First ..." (comma-separated)
  const commaIdx = raw.indexOf(",");
  if (commaIdx > 0) {
    const last = raw.substring(0, commaIdx).trim();
    const rest = raw.substring(commaIdx + 1).trim();
    // first name is the first word of the rest
    const firstWord = rest.split(/\s+/)[0] ?? "";
    // Filter out descriptors that aren't names (short conjunctions etc)
    if (firstWord.length > 1 && !/^(for|of|the|and|by|at|to)$/i.test(firstWord)) {
      return { last, first: firstWord };
    }
  }

  // Format 2: "Last (First) ..."
  const parenMatch = /^([^(]+)\s*\(([^)]+)\)/.exec(raw);
  if (parenMatch) {
    return { last: parenMatch[1]?.trim() ?? "", first: parenMatch[2]?.trim() ?? "" };
  }

  // Format 3: "Friends of First Last" or "Committee for First Last"
  const friendsMatch = /(?:friends\s+of|committee\s+for|elect)\s+([A-Za-z]+)\s+([A-Za-z]+)/i.exec(raw);
  if (friendsMatch) {
    return { last: friendsMatch[2]?.trim() ?? "", first: friendsMatch[1]?.trim() ?? "" };
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
  const cycleIdx = process.argv.indexOf("--election-cycle");
  const filePath = fileIdx !== -1 ? (process.argv[fileIdx + 1] ?? DEFAULT_FILE) : DEFAULT_FILE;
  const ELECTION_CYCLE = cycleIdx !== -1 ? (process.argv[cycleIdx + 1] ?? "2024") : "2024";

  if (!fs.existsSync(filePath)) {
    console.error(`[md-cris] file not found: ${filePath}`);
    console.error("Download with:");
    console.error(DOWNLOAD_CMD);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  // Load MD state legislative candidates
  const mdHouse = (await db.select().from(candidates).where(
    sql`${candidates.jurisdiction} = 'state-MD-house'`
  )) as DbCandidate[];
  const mdSenate = (await db.select().from(candidates).where(
    sql`${candidates.jurisdiction} = 'state-MD-senate'`
  )) as DbCandidate[];

  console.log(`[md-cris] DB: house=${mdHouse.length} senate=${mdSenate.length}`);

  // Build combined last-name index (both chambers; jurisdiction tracked per candidate)
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...mdHouse, ...mdSenate]) {
    const last = extractLastFromDbName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  // Aggregation map: candidateId|cycle|bucket → amount
  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();

  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let titleSkipped = false;

  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip the "Contributions and Loan Download as of..." title row
    if (!titleSkipped) {
      titleSkipped = true;
      continue;
    }

    if (headers === null) {
      headers = parseCsvLine(trimmed);
      continue;
    }

    const cols = parseCsvLine(trimmed);
    const row: Record<string, string> = {};
    for (let i = 0; i < (headers?.length ?? 0); i++) {
      row[headers?.[i] ?? ""] = cols[i] ?? "";
    }

    // Only process Candidate committee contributions
    const committeeType = row["Committee Type"]?.trim() ?? "";
    if (committeeType !== "Candidate") { rowsSkipped++; continue; }

    const amountStr = (row["Transaction Amount"] ?? "").replace(/[$,]/g, "");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) { rowsSkipped++; continue; }

    const committeeName = row["Committee Name"]?.trim() ?? "";
    const parsed = parseCommitteeName(committeeName);
    if (!parsed) { rowsSkipped++; continue; }

    const lastKey = norm(parsed.last);
    const firstInitial = norm(parsed.first)[0] ?? "";
    const dbCandidates = lastNameIdx.get(lastKey);

    if (!dbCandidates || dbCandidates.length === 0) { rowsSkipped++; continue; }

    let dbMatch: DbCandidate | null = null;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0] ?? null;
    } else {
      dbMatch =
        dbCandidates.find((c) => extractFirstInitialFromDbName(c.fullName) === firstInitial) ??
        dbCandidates[0] ??
        null;
    }

    if (!dbMatch) { rowsSkipped++; continue; }

    // Classify contributor into bucket
    const contribType = row["Contributor Type"]?.trim() ?? "";
    const companyName = row["Contributor Company Name"]?.trim() ?? "";
    const amount2 = amount;

    let bucket: DonorBucketLabel;

    if (contribType === "Individual") {
      const empBucket = mapEmployerToBucket(""); // no employer field in MD
      bucket = bucketIndividualByAmount(amount2);
    } else if (companyName) {
      bucket = mapEmployerToBucket(companyName) ?? "Other";
    } else if (/party|democratic|republican/i.test(contribType)) {
      bucket = "Party committees";
    } else {
      bucket = "Other";
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
    candidateNames.set(dbMatch.id, `${parsed.first} ${parsed.last}`);

    rowsProcessed++;

    if (rowsProcessed % 10000 === 0) {
      console.log(`[md-cris] processed=${rowsProcessed}`);
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|")))
  );

  console.log(
    `[md-cris] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amount] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[md-cris] [dry-run] candidate=${cid} bucket=${bucket} amount=${amount.toFixed(2)}`,
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
        rawMetadata: { mdCommitteeName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[md-cris] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[md-cris] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

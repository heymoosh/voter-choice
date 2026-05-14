/**
 * scripts/ingest/mo-mec-donors.ts
 *
 * Missouri donor ingest from Missouri Ethics Commission (MEC) Campaign Finance.
 * Source: https://www.mec.mo.gov/MEC/Campaign_Finance/CF_ContrCSV.aspx
 *
 * Download procedure:
 *   1. Navigate to https://www.mec.mo.gov/MEC/Campaign_Finance/CF_ContrCSV.aspx
 *   2. Select Report Type = "Itemized Contributions Received – Form CD1 Part A"
 *   3. Click Export to CSV → save as /tmp/MO_2024_contributions.csv
 *   4. Select Report Type = "Committee Data" → Export to CSV → /tmp/MO_committees.csv
 *
 * Committee Data CSV: MECID, Committee Type, Committee Name, Committee Status, Active Name
 * Contributions CSV: CD1_A ID, MECID, Committee Name, Committee, Company, First Name, Last Name,
 *   Address 1, Address 2, City, State, Zip, Employer, Occupation, Date, Amount,
 *   Contribution Type, Report
 *
 * Strategy:
 *   1. Load committee data → build MECID set for "Candidate" type committees
 *   2. For each Candidate MECID, extract candidate last name from committee name
 *   3. Match to DB candidates (state-MO-house or state-MO-senate) by last name
 *   4. Process contributions: filter by Candidate MECID, classify into buckets
 *
 * Bucket mapping:
 *   Company (non-empty) → mapEmployerToBucket(Company) or "Other"
 *   First Name empty + Company empty (aggregated?) → "Small individual donors"
 *   Individual → mapEmployerToBucket(Employer | Occupation) or bucketIndividualByAmount
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mo-mec-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/mo-mec-donors.ts \
 *     --contributions /tmp/MO_2024_contributions.csv \
 *     --committees /tmp/MO_committees.csv
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

const DEFAULT_CONTRIBUTIONS = "/tmp/MO_2024_contributions.csv";
const DEFAULT_COMMITTEES = "/tmp/MO_committees.csv";
const SOURCE = "mo_mec_bulk";
const SOURCE_URL =
  "https://www.mec.mo.gov/MEC/Campaign_Finance/CF_ContrCSV.aspx";
const _moCycleIdx = process.argv.indexOf("--election-cycle");
const ELECTION_CYCLE = _moCycleIdx !== -1 ? (process.argv[_moCycleIdx + 1] ?? "2024") : "2024";

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

// Missouri city/place names to exclude from last name extraction
const MO_CITIES = new Set([
  "MISSOURI", "MO", "HOUSE", "SENATE", "STATE", "DISTRICT", "COUNTY",
  "JEFFERSON", "SPRINGFIELD", "COLUMBIA", "INDEPENDENCE", "JOPLIN",
  "LIBERTY", "FLORISSANT", "CHESTERFIELD", "BALLWIN", "WENTZVILLE",
  "LEES", "SUMMIT", "KIRKWOOD", "MEHLVILLE", "ROLLA", "SEDALIA",
  "CAPE", "GIRARDEAU", "BRANSON", "NIXA", "OZARK", "REPUBLIC",
  "RAYTOWN", "LEES", "OFALLON", "OFALLON", "FESTUS", "FARMINGTON",
  "HANNIBAL", "KIRKSVILLE", "WARRENSBURG", "FULTON", "WAYNESVILLE",
]);

/**
 * Extract candidate last name from MO committee name patterns:
 *   "Committee To Elect First Last" → Last
 *   "Friends Of First Last" → Last
 *   "First Last For MO/Office/City" → Last
 *   "Citizens For First Last" → Last
 *   "First Last" (just a name) → Last
 */
function extractCandidateLastName(committeeName: string): string | null {
  let name = norm(committeeName);

  // Strip trailing "FOR ..." patterns (state, office, city)
  name = name.replace(/\s+FOR\s+(MISSOURI|MO|STATE|HOUSE|SENATE|REP|SENATE\s+DISTRICT|HOUSE\s+DISTRICT)\b.*$/, "");
  // Strip trailing digits (district numbers)
  name = name.replace(/\s+\d+$/, "");
  // Strip some trailing city names that might appear
  for (const city of ["JEFFERSON CITY", "ST LOUIS", "KANSAS CITY", "SPRINGFIELD", "COLUMBIA"]) {
    name = name.replace(new RegExp("\\s+FOR\\s+" + city + ".*$"), "");
  }
  // Generic "FOR <word>" at end - strip if the word is a city/place
  name = name.replace(/\s+FOR\s+(\w+)$/, (_, w) => MO_CITIES.has(w) ? "" : " FOR " + w);

  // Strip leading prefixes
  name = name.replace(/^(COMMITTEE|COMM)\s+TO\s+RE-?ELECT\s+/, "");
  name = name.replace(/^(COMMITTEE|COMM)\s+TO\s+ELECT\s+/, "");
  name = name.replace(/^FRIENDS\s+TO\s+ELECT\s+/, "");
  name = name.replace(/^FRIENDS\s+OF\s+/, "");
  name = name.replace(/^CITIZENS\s+(TO\s+ELECT|FOR)\s+/, "");
  name = name.replace(/^ELECT\s+/, "");
  name = name.replace(/^TEAM\s+/, "");
  name = name.replace(/^VOTE\s+/, "");
  name = name.replace(/^NEIGHBORS\s+(TO\s+ELECT|FOR)\s+/, "");
  name = name.replace(/^PEOPLE\s+(TO\s+ELECT|FOR)\s+/, "");
  name = name.replace(/^SUPPORT\s+/, "");

  name = name.trim();
  if (!name || name.length <= 1) return null;

  // Extract last non-suffix word
  const parts = name.split(" ").filter(Boolean);
  // Skip if the extracted "last name" looks like a place/keyword
  for (let i = parts.length - 1; i >= 0; i--) {
    const word = parts[i] ?? "";
    if (!SUFFIXES.has(word) && !MO_CITIES.has(word)) return word;
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

async function readCsvLines(filePath: string): Promise<{ headers: string[]; lines: AsyncIterable<string[]> }> {
  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  const lineQueue: string[][] = [];
  let done = false;

  async function* generateLines() {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (headers === null) {
        headers = parseCsvLine(trimmed);
        continue;
      }
      yield parseCsvLine(trimmed);
    }
    done = true;
  }

  // Prime the header
  const gen = generateLines();
  // Wait for first yield which also sets headers
  const firstLine = await gen.next();

  return {
    headers: headers!,
    lines: (async function* () {
      if (!firstLine.done) yield firstLine.value;
      for await (const line of gen) yield line;
    })(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const contrIdx = process.argv.indexOf("--contributions");
  const commIdx = process.argv.indexOf("--committees");
  const contrFile =
    contrIdx !== -1 ? (process.argv[contrIdx + 1] ?? DEFAULT_CONTRIBUTIONS) : DEFAULT_CONTRIBUTIONS;
  const commFile =
    commIdx !== -1 ? (process.argv[commIdx + 1] ?? DEFAULT_COMMITTEES) : DEFAULT_COMMITTEES;

  for (const [label, f] of [["contributions", contrFile], ["committees", commFile]] as const) {
    if (!fs.existsSync(f)) {
      console.error(`[mo-mec] ${label} file not found: ${f}`);
      process.exitCode = 1;
      return;
    }
  }

  const db = requireDb();

  const moHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-MO-house'`)) as DbCandidate[];
  const moSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-MO-senate'`)) as DbCandidate[];

  console.log(`[mo-mec] DB: house=${moHouse.length} senate=${moSenate.length}`);

  // Build last-name index (combined)
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...moHouse, ...moSenate]) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  // --- Step 1: Build MECID → DB candidate mapping from committee data ---
  const mecidToCandidate = new Map<string, DbCandidate>();
  const mecidToCommName = new Map<string, string>();

  {
    const stream = fs.createReadStream(commFile, "utf-8");
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let headers: string[] | null = null;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (headers === null) { headers = parseCsvLine(trimmed); continue; }
      const cols = parseCsvLine(trimmed);
      const row: Record<string, string> = {};
      for (let i = 0; i < (headers?.length ?? 0); i++) row[headers?.[i] ?? ""] = cols[i] ?? "";

      if (row["Committee Type"]?.trim() !== "Candidate") continue;
      const mecid = row["MECID"]?.trim();
      const commName = row["Committee Name"]?.trim() ?? "";
      if (!mecid || !commName) continue;

      const lastName = extractCandidateLastName(commName);
      if (!lastName) continue;

      const dbCandidates = lastNameIdx.get(lastName);
      if (!dbCandidates || dbCandidates.length === 0) continue;

      let dbMatch: DbCandidate;
      if (dbCandidates.length === 1) {
        dbMatch = dbCandidates[0]!;
      } else {
        // Try first initial from committee name
        const nameAfterPrefix = norm(commName).replace(/^(COMMITTEE|COMM|FRIENDS|CITIZENS|ELECT|TEAM|VOTE)\s+(TO\s+)?(ELECT|OF|FOR)?\s*/, "");
        const firstInitial = nameAfterPrefix[0] ?? "";
        dbMatch =
          dbCandidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
          dbCandidates[0]!;
      }

      mecidToCandidate.set(mecid, dbMatch);
      mecidToCommName.set(mecid, commName);
    }
  }

  console.log(`[mo-mec] committee_mecids_matched=${mecidToCandidate.size}`);

  // --- Step 2: Process contributions ---
  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  {
    const stream = fs.createReadStream(contrFile, "utf-8");
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let headers: string[] | null = null;

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (headers === null) { headers = parseCsvLine(trimmed); continue; }

      const cols = parseCsvLine(trimmed);
      const row: Record<string, string> = {};
      for (let i = 0; i < (headers?.length ?? 0); i++) row[headers?.[i] ?? ""] = cols[i] ?? "";

      const mecid = row["MECID"]?.trim();
      const dbMatch = mecid ? mecidToCandidate.get(mecid) : undefined;
      if (!dbMatch) { rowsSkipped++; continue; }

      const amountStr = (row["Amount"] ?? "").replace(/[$,]/g, "");
      const amount = parseFloat(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) { rowsSkipped++; continue; }

      const contribType = (row["Contribution Type"] ?? "").trim();
      // Skip non-monetary types
      if (contribType === "Non-Monetary") { rowsSkipped++; continue; }

      // Classify bucket
      const company = (row["Company"] ?? "").trim();
      const firstName = (row["First Name"] ?? "").trim();
      const employer = (row["Employer"] ?? "").trim();
      const occupation = (row["Occupation"] ?? "").trim();
      const committee = (row["Committee"] ?? "").trim(); // contributing PAC name

      let bucket: DonorBucketLabel;

      if (committee) {
        // Contribution from a PAC or party committee
        bucket = mapEmployerToBucket(committee) ?? "Other";
      } else if (company && !firstName) {
        // Organization contributor
        bucket = mapEmployerToBucket(company) ?? "Other";
      } else {
        // Individual contributor
        const empBucket = mapEmployerToBucket(employer || occupation);
        if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
          bucket = empBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      }

      const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
      agg.set(aggKey, (agg.get(aggKey) ?? 0) + amount);
      candidateNames.set(dbMatch.id, mecidToCommName.get(mecid ?? "") ?? "");
      rowsProcessed++;

      if (rowsProcessed % 10000 === 0) {
        console.log(`[mo-mec] processed=${rowsProcessed}`);
      }
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[mo-mec] processed=${rowsProcessed} skipped=${rowsSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[mo-mec] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { moCommitteeName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[mo-mec] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[mo-mec] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

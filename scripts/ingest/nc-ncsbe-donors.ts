/**
 * scripts/ingest/nc-ncsbe-donors.ts
 *
 * North Carolina donor ingest from NC State Board of Elections Campaign Finance.
 * Source: https://cf.ncsbe.gov/CFTxnLkup/AdvancedSearch/
 *
 * Data collection (requires browser session — session-based API):
 *   1. Navigate to https://cf.ncsbe.gov/CFTxnLkup/AdvancedSearch/
 *   2. Select: Receipt types only (uncheck Expenditure All)
 *      Committee Type: Candidate Committee only
 *      Office Type: N.C. House + N.C. Senate only
 *      Date: 01/01/2024 to 12/31/2024
 *   3. Click Search → on results page run in browser console:
 *      (see fetch-nc-contributions.js for the full script)
 *   4. Save result to /tmp/NC_contributions_2024.json
 *
 * JSON format:
 *   { totalRecords, committees, data: { [SboeID]: { commName, office, party, contribs: [{a, sub, isOrg, org, job, emp}] } } }
 *
 * Committee-to-candidate matching: extract last name from committee name pattern.
 * Match by (last name, office type) against DB.
 *
 * Subtype → bucket mapping:
 *   IND/GEN/NFPC/OUTS with isOrg: mapEmployerToBucket(org) → "Other"
 *   IND/GEN/NFPC/OUTS without isOrg: mapEmployerToBucket(job|emp) or bucketIndividualByAmount
 *   PPTY → "Party committees"
 *   CPCM → mapEmployerToBucket(org) or "Other"
 *   IND with FullName="Aggregated" → "Small individual donors (under $200)"
 *   RFND/LOAN/OTLN/INT/FRLN/CNRE → skip
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nc-ncsbe-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nc-ncsbe-donors.ts \
 *     --json /path/to/NC_contributions_2024.json
 *
 * Default JSON: /tmp/NC_contributions_2024.json
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as fs from "node:fs";
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

const DEFAULT_JSON = "/tmp/NC_contributions_2024.json";
const SOURCE = "nc_ncsbe_bulk";
const SOURCE_URL = "https://cf.ncsbe.gov/CFTxnLkup/AdvancedSearch/";
const ELECTION_CYCLE = "2024";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

interface NcContrib {
  a: number;         // amount
  sub: string;       // TransSubTypeCode
  isOrg: string | null;
  org: string;       // OrgName
  job: string;       // ProfJobTitle
  emp: string;       // EmpSpecFld
}

interface NcCommittee {
  commName: string;
  office: string;    // "NSHS" | "NCSN"
  party: string;
  contribs: NcContrib[];
}

interface NcData {
  totalRecords: number;
  committees: number;
  data: Record<string, NcCommittee>;
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
 * Extract candidate last name from NC committee name patterns:
 *   "COMMITTEE TO ELECT FIRSTNAME LASTNAME" → LASTNAME
 *   "FIRSTNAME LASTNAME FOR NC" → LASTNAME
 *   "LASTNAME FOR NC" → LASTNAME
 *   "FRIENDS OF FIRSTNAME LASTNAME" → LASTNAME
 *   "TEAM LASTNAME FOR NC" → LASTNAME
 */
function extractCandidateLastName(commName: string): string | null {
  let name = norm(commName);

  // Strip trailing state/office suffixes (most specific first)
  name = name.replace(/\s+FOR\s+NEW\s+NORTH\s+CAROLINA$/, "");
  name = name.replace(/\s+FOR\s+NORTH\s+CAROLINA$/, "");
  name = name.replace(/\s+FOR\s+NC\s+(SENATE|HOUSE)(\s+\d+)?$/, "");
  name = name.replace(/\s+FOR\s+NC(\s+\d+)?$/, "");
  name = name.replace(/\s+FOR\s+(SENATE|HOUSE)(\s+\d+)?$/, "");
  name = name.replace(/\s+FOR\s+NEW\s+NC$/, "");
  name = name.replace(/\s+NC\s+(SENATE|HOUSE)$/, "");
  name = name.replace(/\s+(SENATE|HOUSE)(\s+\d+)?$/, "");
  name = name.replace(/\s+\d{4}$/, "");
  name = name.replace(/\s+\d+$/, "");
  name = name.replace(/\s+COMMITTEE$/, "");
  name = name.replace(/\s+CAMPAIGN$/, "");
  name = name.replace(/\s+FOUNDATION$/, "");

  // Strip leading prefixes
  name = name.replace(/^(COMMITTEE|COMM)\s+TO\s+RE-?ELECT\s+/, "");
  name = name.replace(/^(COMMITTEE|COMM)\s+TO\s+ELECT\s+/, "");
  name = name.replace(/^FRIENDS\s+TO\s+ELECT\s+/, "");
  name = name.replace(/^FRIENDS\s+OF\s+/, "");
  name = name.replace(/^ELECT\s+/, "");
  name = name.replace(/^TEAM\s+/, "");

  name = name.trim();
  if (!name || name.length <= 1) return null;

  // Extract last non-suffix word
  const parts = name.split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Skip subtypes (not actual receipts or distorting)
// ---------------------------------------------------------------------------

const SKIP_SUBTYPES = new Set(["RFND", "LOAN", "OTLN", "INT", "FRLN", "CNRE"]);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const jsonIdx = process.argv.indexOf("--json");
  const jsonPath =
    jsonIdx !== -1 ? (process.argv[jsonIdx + 1] ?? DEFAULT_JSON) : DEFAULT_JSON;

  if (!fs.existsSync(jsonPath)) {
    console.error(`[nc-ncsbe] file not found: ${jsonPath}`);
    console.error(
      "Collect data via Playwright:\n" +
        "  1. Go to https://cf.ncsbe.gov/CFTxnLkup/AdvancedSearch/\n" +
        "  2. Select: Receipt types only, Committee Type=Candidate, Office=NC House+Senate, Date 2024\n" +
        "  3. Click Search, then run the browser evaluate script to fetch all pages",
    );
    process.exitCode = 1;
    return;
  }

  const rawData: NcData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(
    `[nc-ncsbe] loaded committees=${rawData.committees} totalRecords=${rawData.totalRecords}`,
  );

  const db = requireDb();

  const ncHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-NC-house'`)) as DbCandidate[];
  const ncSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-NC-senate'`)) as DbCandidate[];

  console.log(`[nc-ncsbe] DB: house=${ncHouse.length} senate=${ncSenate.length}`);

  // Build last-name index by office
  const houseIdx = new Map<string, DbCandidate[]>();
  const senateIdx = new Map<string, DbCandidate[]>();

  for (const c of ncHouse) {
    const last = extractLastFromDbName(c.fullName);
    if (!last) continue;
    const existing = houseIdx.get(last) ?? [];
    existing.push(c);
    houseIdx.set(last, existing);
  }
  for (const c of ncSenate) {
    const last = extractLastFromDbName(c.fullName);
    if (!last) continue;
    const existing = senateIdx.get(last) ?? [];
    existing.push(c);
    senateIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();
  let committeesMatched = 0;
  let committeesSkipped = 0;
  let contribsProcessed = 0;
  let contribsSkipped = 0;

  for (const [sboeId, committee] of Object.entries(rawData.data)) {
    // Determine office type and corresponding index
    const idx =
      committee.office === "NSHS"
        ? houseIdx
        : committee.office === "NCSN"
          ? senateIdx
          : null;

    if (!idx) {
      committeesSkipped++;
      continue;
    }

    // Extract candidate last name from committee name
    const lastName = extractCandidateLastName(committee.commName);
    if (!lastName) {
      committeesSkipped++;
      continue;
    }

    const dbCandidates = idx.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      committeesSkipped++;
      continue;
    }

    let dbMatch: DbCandidate;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0]!;
    } else {
      // Tie-break by first initial — extract from committee name after prefix strip
      const nameAfterPrefix = norm(committee.commName).replace(
        /^.*(ELECT|OF|FRIENDS|TEAM)\s+/,
        "",
      );
      const firstInitial = nameAfterPrefix[0] ?? "";
      dbMatch =
        dbCandidates.find((c) => extractFirstInitialFromDbName(c.fullName) === firstInitial) ??
        dbCandidates[0]!;
    }

    committeesMatched++;
    candidateNames.set(dbMatch.id, committee.commName);

    // Process each contribution
    for (const c of committee.contribs) {
      if (!c.a || c.a <= 0) { contribsSkipped++; continue; }
      if (SKIP_SUBTYPES.has(c.sub)) { contribsSkipped++; continue; }

      let bucket: DonorBucketLabel;
      const isOrg = c.isOrg === "1" || c.isOrg === true as unknown;

      if (c.sub === "PPTY") {
        bucket = "Party committees";
      } else if (isOrg) {
        bucket = mapEmployerToBucket(c.org) ?? "Other";
      } else if (c.sub === "CPCM") {
        // Political committee not flagged as org — treat as other
        bucket = "Other";
      } else {
        // Individual contribution
        const empBucket = mapEmployerToBucket(c.job || c.emp);
        if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
          bucket = empBucket;
        } else {
          bucket = bucketIndividualByAmount(c.a);
        }
      }

      const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
      agg.set(aggKey, (agg.get(aggKey) ?? 0) + c.a);
      contribsProcessed++;
    }
  }

  const matchedCandidateIds = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[nc-ncsbe] committees: matched=${committeesMatched} skipped=${committeesSkipped}`,
  );
  console.log(
    `[nc-ncsbe] contribs: processed=${contribsProcessed} skipped=${contribsSkipped}`,
  );
  console.log(
    `[nc-ncsbe] candidates_matched=${matchedCandidateIds.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[nc-ncsbe] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { ncCommitteeName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[nc-ncsbe] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[nc-ncsbe] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

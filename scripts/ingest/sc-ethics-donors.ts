/**
 * scripts/ingest/sc-ethics-donors.ts
 *
 * South Carolina donor ingest from the SC Ethics Commission Filing system.
 * Source: https://ethicsfiling.sc.gov/public/campaign-reports/contributions
 * API: POST https://ethicsfiling.sc.gov/api/Candidate/Contribution/Search/
 *
 * The API requires a browser session (Queue-IT WAF) — access via Playwright:
 *   1. Navigate to ethicsfiling.sc.gov/public/campaign-reports/contributions
 *   2. Run the in-page fetch to download all data
 * Or download and save the JSON manually (see --house-json and --senate-json flags).
 *
 * Candidate name format: "First Last" (already split)
 * Contributor "group" field: "Yes" = org/PAC, "No" = individual
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/sc-ethics-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/sc-ethics-donors.ts \
 *     --json /path/to/SC_2024_contributions.json
 *
 * Default JSON: /tmp/SC_2024_contributions.json (contains { house: [...], senate: [...] })
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

const DEFAULT_JSON = "/tmp/SC_2024_contributions.json";
const SOURCE = "sc_ethics_bulk";
const SOURCE_URL = "https://ethicsfiling.sc.gov/public/campaign-reports/contributions";
const ELECTION_CYCLE = "2024";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

interface ScContribution {
  contributionId: number;
  candidateId: number;
  date: string;
  amount: number;
  candidateName: string;
  officeName: string;
  electionDate: string;
  contributorName: string;
  contributorOccupation: string;
  group: string; // "Yes" = org, "No" = individual
  contributorAddress: string;
  description: string;
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
// Process contributions
// ---------------------------------------------------------------------------

function processContributions(
  rows: ScContribution[],
  lastNameIdx: Map<string, DbCandidate[]>,
  agg: Map<string, number>,
  candidateNames: Map<string, string>,
): { processed: number; skipped: number } {
  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.amount || row.amount <= 0) {
      skipped++;
      continue;
    }

    const candidateName = (row.candidateName ?? "").trim();
    if (!candidateName) {
      skipped++;
      continue;
    }

    // Match by last name + first initial (candidateName is "First Last")
    const lastKey = extractLastName(candidateName);
    const firstInitial = extractFirstInitial(candidateName);
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
    const isOrg = (row.group ?? "").trim() === "Yes";
    const contribName = (row.contributorName ?? "").trim();
    const occupation = (row.contributorOccupation ?? "").trim();
    const amount = row.amount;

    let bucket: DonorBucketLabel;

    if (isOrg) {
      const orgBucket = mapEmployerToBucket(contribName);
      bucket = orgBucket ?? "Other";
    } else {
      const empBucket = mapEmployerToBucket(occupation);
      if (empBucket && empBucket !== "Other" && empBucket !== "Self-funded") {
        bucket = empBucket;
      } else {
        bucket = bucketIndividualByAmount(amount);
      }
    }

    const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
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
  const jsonIdx = process.argv.indexOf("--json");
  const jsonPath =
    jsonIdx !== -1 ? (process.argv[jsonIdx + 1] ?? DEFAULT_JSON) : DEFAULT_JSON;

  if (!fs.existsSync(jsonPath)) {
    console.error(`[sc-ethics] file not found: ${jsonPath}`);
    console.error(
      "Download via Playwright:\n" +
        "  Navigate to https://ethicsfiling.sc.gov/public/campaign-reports/contributions\n" +
        "  Run in browser console:\n" +
        "    const h = await (await fetch('/api/Candidate/Contribution/Search/', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({amountMin:0, officeRun:'House of Representatives', candidate:'', contributorName:'', contributorOccupation:'', contributionDescription:'', contributionYear:2024}) })).json();\n" +
        "    const s = await (await fetch('/api/Candidate/Contribution/Search/', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({amountMin:0, officeRun:'Senate', candidate:'', contributorName:'', contributorOccupation:'', contributionDescription:'', contributionYear:2024}) })).json();\n" +
        "    // save JSON.stringify({house:h, senate:s}) to file",
    );
    process.exitCode = 1;
    return;
  }

  const rawContent = fs.readFileSync(jsonPath, "utf-8");
  let parsedData: { house: ScContribution[]; senate: ScContribution[] };
  const raw = JSON.parse(rawContent);
  if (typeof raw === "string") {
    parsedData = JSON.parse(raw);
  } else {
    parsedData = raw;
  }

  const { house = [], senate = [] } = parsedData;
  console.log(`[sc-ethics] loaded house=${house.length} senate=${senate.length}`);

  const db = requireDb();

  const scHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-SC-house'`)) as DbCandidate[];
  const scSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-SC-senate'`)) as DbCandidate[];

  console.log(`[sc-ethics] DB: house=${scHouse.length} senate=${scSenate.length}`);

  // Build last-name index
  const lastNameIdx = new Map<string, DbCandidate[]>();
  for (const c of [...scHouse, ...scSenate]) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const existing = lastNameIdx.get(last) ?? [];
    existing.push(c);
    lastNameIdx.set(last, existing);
  }

  const agg = new Map<string, number>();
  const candidateNames = new Map<string, string>();

  const houseResult = processContributions(house, lastNameIdx, agg, candidateNames);
  console.log(
    `[sc-ethics] house: processed=${houseResult.processed} skipped=${houseResult.skipped}`,
  );

  const senateResult = processContributions(senate, lastNameIdx, agg, candidateNames);
  console.log(
    `[sc-ethics] senate: processed=${senateResult.processed} skipped=${senateResult.skipped}`,
  );

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[sc-ethics] candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 3);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(
        `[sc-ethics] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`,
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
        rawMetadata: { scCandidateName: candidateNames.get(candidateId) ?? "" },
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

  console.log(`[sc-ethics] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[sc-ethics] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

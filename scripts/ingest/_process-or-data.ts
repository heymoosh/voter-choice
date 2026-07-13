/**
 * One-off script to process Oregon ORESTAR contributions collected via MCP browser session.
 * Reads _or-data.json, matches to DB candidates, buckets, and upserts.
 * Run once: DATABASE_URL=<neon> npx tsx scripts/ingest/_process-or-data.ts
 */
import * as fs from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

const SOURCE = "or_orestar_bulk";
const SOURCE_URL = "https://secure.sos.state.or.us/orestar/gotoPublicTransactionSearch.do";
const ELECTION_CYCLE = "2024";
const DATA_FILE = resolve(import.meta.dirname ?? __dirname, "_or-data.json");

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function norm(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function extractLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function classifyOrestarContributor(contributor: string, amount: number, subType: string): DonorBucketLabel {
  const upper = contributor.toUpperCase().trim();
  if (upper.startsWith("MISCELLANEOUS CASH CONTRIBUTIONS") || upper.startsWith("MISCELLANEOUS IN-KIND")) {
    return "Small individual donors (under $200)";
  }
  if (upper.includes("ACTBLUE") || upper.includes("WINRED")) {
    return "Small individual donors (under $200)";
  }
  if (/\(\d+\)/.test(contributor)) {
    const bucketFromName = mapEmployerToBucket(contributor);
    if (bucketFromName) return bucketFromName;
    if (upper.includes("DEMOCRATIC") || upper.includes("REPUBLICAN") || upper.includes("PARTY") || upper.includes("CENTRAL COMMITTEE")) {
      return "Party committees";
    }
    return "Other";
  }
  const bucketFromName = mapEmployerToBucket(contributor);
  if (bucketFromName && bucketFromName !== "Other" && bucketFromName !== "Self-funded") return bucketFromName;
  return bucketIndividualByAmount(amount);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Array<{
    contributor: string;
    subType: string;
    amount: number;
    label: string;
    chamber: string;
    cycle?: string;
  }>;
  console.log(`[or-process] loaded ${raw.length} contributions from ${DATA_FILE}`);

  const db = requireDb();
  const dbCandidates = await db.select().from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-OR-%'`) as any[];

  const houseIdx = new Map<string, any[]>();
  const senateIdx = new Map<string, any[]>();
  for (const c of dbCandidates) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const idx = c.jurisdiction.includes("house") ? houseIdx : senateIdx;
    const arr = idx.get(last) ?? [];
    arr.push(c);
    idx.set(last, arr);
  }

  const agg = new Map<string, number>();
  let matched = 0, skipped = 0;

  for (const contrib of raw) {
    const lastName = contrib.label; // already normalized (THATCHER, WEBER, BONHAM)
    const primaryIdx = contrib.chamber === "house" ? houseIdx : senateIdx;
    const fallbackIdx = contrib.chamber === "house" ? senateIdx : houseIdx;
    const dbMatches = primaryIdx.get(lastName) ?? fallbackIdx.get(lastName);
    if (!dbMatches || dbMatches.length === 0) { skipped++; continue; }
    const dbMatch = dbMatches[0];

    const bucket = classifyOrestarContributor(contrib.contributor, contrib.amount, contrib.subType);
    const cycle = contrib.cycle ?? ELECTION_CYCLE;
    const aggKey = `${dbMatch.id}|${cycle}|${bucket}`;
    agg.set(aggKey, (agg.get(aggKey) ?? 0) + contrib.amount);
    matched++;
  }

  const matchedCandidates = new Set([...agg.keys()].map(k => k.split("|")[0]));
  console.log(`[or-process] matched=${matched} skipped=${skipped} candidates=${matchedCandidates.size} upsert_rows=${agg.size}`);

  if (isDryRun) {
    for (const [key, amt] of [...agg.entries()].slice(0, 8)) {
      const [cid, , bucket] = key.split("|");
      console.log(`  candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`);
    }
    return;
  }

  let upserted = 0;
  for (const [aggKey, amount] of agg) {
    const [candidateId, cycle, ...bucketParts] = aggKey.split("|");
    const bucketLabel = bucketParts.join("|") as DonorBucketLabel;
    await db.insert(donorAggregates).values({
      candidateId: candidateId!,
      electionCycle: cycle!,
      bucketLabel,
      amountTotal: amount.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {},
      insertedAt: new Date(),
    }).onConflictDoUpdate({
      target: [donorAggregates.candidateId, donorAggregates.electionCycle, donorAggregates.bucketLabel],
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
  console.log(`[or-process] done upserted=${upserted}`);
}

main().catch(e => { console.error("[or-process] error:", e.message); process.exitCode = 1; });

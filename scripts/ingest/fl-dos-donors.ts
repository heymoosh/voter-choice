/**
 * scripts/ingest/fl-dos-donors.ts
 *
 * Florida donor ingest from the FL Division of Elections campaign finance database.
 * Source: https://dos.elections.myflorida.com/campaign-finance/contributions/
 *
 * Data obtained via Playwright (bypasses Cloudflare on dos.fl.gov) by querying
 * the "Contribution totals" tab-delimited export for "2024 Election" by office
 * (State Representative and State Senator separately).
 *
 * File format (tab-delimited, UTF-8):
 *   Candidate Name \t Party \t Office \t District \t Group \t Total Amount
 *
 * Office codes: STR = State Representative, STS = State Senator
 *
 * Because this is a total-amount-only export, all donations map to "Other" bucket.
 * For industry breakdown, FL would need per-contribution occupation data from the
 * full CSV export (2024gen.zip), but that requires committee→candidate linkage.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/fl-dos-donors.ts [--dry-run]
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/fl-dos-donors.ts \
 *     --house-file /tmp/FL_2024_house_totals.txt \
 *     --senate-file /tmp/FL_2024_senate_totals.txt
 *
 * Default file paths: /tmp/FL_2024_house_totals.txt, /tmp/FL_2024_senate_totals.txt
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FL_BASE_URL = "https://dos.elections.myflorida.com/campaign-finance/contributions/";
const DEFAULT_HOUSE_FILE = "/tmp/FL_2024_house_totals.txt";
const DEFAULT_SENATE_FILE = "/tmp/FL_2024_senate_totals.txt";

// Playwright download URLs for fetching fresh data
const PLAYWRIGHT_INSTRUCTIONS = `
To refresh FL data, run this Playwright automation:
  1. Navigate to ${FL_BASE_URL}
  2. Select Election Year = "2024 Election", Office = "State Representative",
     What = "Contribution totals", Format = "Tab Delimited Text File"
  3. Submit → save as ${DEFAULT_HOUSE_FILE}
  4. Repeat with Office = "State Senator" → save as ${DEFAULT_SENATE_FILE}
`.trim();

const SOURCE = "fl_dos_bulk";
const SOURCE_URL = FL_BASE_URL;
const ELECTION_CYCLE = "2024";
const BUCKET_LABEL = "Other";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlEntry {
  candidateName: string;
  party: string;
  office: "STR" | "STS";
  district: string;
  totalAmount: number;
}

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

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
  const parts = normalizeStr(fullName).split(" ").filter(Boolean);
  return parts[0]?.[0] ?? "";
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

async function parseTotalsFile(filePath: string, office: "STR" | "STS"): Promise<FlEntry[]> {
  const entries: FlEntry[] = [];
  const stream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }
    const parts = line.split("\t");
    const candidateName = parts[0]?.trim() ?? "";
    const party = parts[1]?.trim() ?? "";
    const officeCode = (parts[2]?.trim() ?? "") as "STR" | "STS";
    const district = parts[3]?.trim() ?? "";
    const totalStr = parts[5]?.trim() ?? "0";
    const totalAmount = parseFloat(totalStr) || 0;

    if (!candidateName || totalAmount <= 0) continue;
    if (officeCode !== office) continue;

    entries.push({ candidateName, party, office: officeCode, district, totalAmount });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const houseFileIdx = process.argv.indexOf("--house-file");
  const senateFileIdx = process.argv.indexOf("--senate-file");
  const houseFile = houseFileIdx !== -1 ? process.argv[houseFileIdx + 1] : DEFAULT_HOUSE_FILE;
  const senateFile = senateFileIdx !== -1 ? process.argv[senateFileIdx + 1] : DEFAULT_SENATE_FILE;

  if (!houseFile || !fs.existsSync(houseFile)) {
    console.error(`[fl-dos] missing house file: ${houseFile}`);
    console.error(PLAYWRIGHT_INSTRUCTIONS);
    process.exitCode = 1;
    return;
  }
  if (!senateFile || !fs.existsSync(senateFile)) {
    console.error(`[fl-dos] missing senate file: ${senateFile}`);
    console.error(PLAYWRIGHT_INSTRUCTIONS);
    process.exitCode = 1;
    return;
  }

  const db = requireDb();

  // Parse both files
  const houseEntries = await parseTotalsFile(houseFile, "STR");
  const senateEntries = await parseTotalsFile(senateFile, "STS");
  console.log(`[fl-dos] parsed house=${houseEntries.length} senate=${senateEntries.length} entries`);

  // Load FL candidates from DB
  const flHouse = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-FL-house'`) as DbCandidate[];
  const flSenate = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-FL-senate'`) as DbCandidate[];
  console.log(`[fl-dos] DB: house=${flHouse.length} senate=${flSenate.length} candidates`);

  // Build last-name index for each chamber
  function buildIndex(dbCandidates: DbCandidate[]): Map<string, DbCandidate[]> {
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

  const houseIdx = buildIndex(flHouse);
  const senateIdx = buildIndex(flSenate);

  function match(entry: FlEntry, idx: Map<string, DbCandidate[]>): DbCandidate | null {
    const last = extractLastName(entry.candidateName);
    const firstInitial = extractFirstInitial(entry.candidateName);
    const candidates = idx.get(last);
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0] ?? null;
    // Disambiguate by first initial
    return candidates.find((c) => extractFirstInitial(c.fullName) === firstInitial)
      ?? candidates[0]
      ?? null;
  }

  let matched = 0;
  let skipped = 0;
  let upserted = 0;

  const allEntries: Array<{ entry: FlEntry; dbMatch: DbCandidate | null; jurisdiction: string }> = [
    ...houseEntries.map((e) => ({ entry: e, dbMatch: match(e, houseIdx), jurisdiction: "state-FL-house" })),
    ...senateEntries.map((e) => ({ entry: e, dbMatch: match(e, senateIdx), jurisdiction: "state-FL-senate" })),
  ];

  for (const { entry, dbMatch } of allEntries) {
    if (!dbMatch) {
      skipped += 1;
      continue;
    }

    matched += 1;

    if (!isDryRun) {
      await db
        .insert(donorAggregates)
        .values({
          candidateId: dbMatch.id,
          electionCycle: ELECTION_CYCLE,
          bucketLabel: BUCKET_LABEL,
          amountTotal: entry.totalAmount.toFixed(2),
          source: SOURCE,
          sourceUrl: SOURCE_URL,
          rawMetadata: {
            flCandidateName: entry.candidateName,
            party: entry.party,
            office: entry.office,
            district: entry.district,
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
    } else {
      console.log(
        `[fl-dos] [dry-run] would upsert: ${entry.candidateName} → ${dbMatch.fullName} ${entry.totalAmount}`,
      );
    }
  }

  console.log(
    `[fl-dos] done matched=${matched} skipped=${skipped} upserted=${isDryRun ? "(dry-run)" : upserted}`,
  );
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[fl-dos] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

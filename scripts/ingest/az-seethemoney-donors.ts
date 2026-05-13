/**
 * scripts/ingest/az-seethemoney-donors.ts
 *
 * Arizona donor ingest from SeeTheMoney (AZ SOS campaign finance portal).
 *
 * Source: https://seethemoney.az.gov/Reporting/ExportEntityOverview/
 * - Free public bulk export of candidate income totals.
 * - The export gives total income per candidate-office combination.
 * - Transaction-level breakdown by donor industry is not available via bulk
 *   export (requires per-entity navigation); total income is mapped to "Other".
 * - For proper industry bucketing, FTM API is needed (see state-donors.ts).
 *
 * Name format in AZ CSV: "Last, First (CandidateID)" — converted to "First Last".
 * Matching strategy: last name + first initial against candidates WHERE
 * jurisdiction LIKE 'state-AZ-%'.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/az-seethemoney-donors.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/az-seethemoney-donors.ts --dry-run
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AZ_EXPORT_URL =
  "https://seethemoney.az.gov/Reporting/ExportEntityOverview/" +
  "?Page=1&startYear=2024&endYear=2024&JurisdictionId=0" +
  "&TablePage=1&TableLength=100000&IsLessActive=false" +
  "&ShowOfficeHolder=false&ChartName=1&ExportOptions=CSV";

const SOURCE = "az_seethemoney";
const SOURCE_URL = "https://seethemoney.az.gov/Reporting/Explore";
const ELECTION_CYCLE = "2024";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "Last, First (ID)" → { first, last, azId } */
function parseAzName(raw: string): { first: string; last: string; azId: string } | null {
  // Format: "Last, First Middle (12345)" or "Last, First (12345)"
  const m = /^([^,]+),\s*(.+?)\s*\((\d+)\)$/.exec(raw.trim());
  if (!m) return null;
  const last = m[1].trim();
  // First may contain middle name — take first token only for matching
  const first = m[2].trim().split(/\s+/)[0];
  const azId = m[3];
  return { first, last, azId };
}

/** Determine AZ chamber from office string */
function parseOffice(office: string): "house" | "senate" | null {
  if (office.includes("State Representative")) return "house";
  if (office.includes("State Senator")) return "senate";
  return null;
}

/** Parse a possibly-quoted CSV line */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const db = requireDb();

  console.log(`[az-seethemoney] fetching candidate overview CSV`);
  const res = await fetch(AZ_EXPORT_URL, {
    headers: { "User-Agent": "voter-choice-az-donor-ingest" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from AZ export`);

  const bytes = await res.arrayBuffer();
  // The response is UTF-16 LE
  let text: string;
  try {
    text = new TextDecoder("utf-16").decode(bytes);
  } catch {
    text = new TextDecoder("utf-16-le").decode(bytes);
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("Empty CSV response from AZ");

  const header = parseCSVLine(lines[0]);
  const nameIdx = header.indexOf("Name");
  const officeIdx = header.indexOf("Office");
  const incomeIdx = header.indexOf("Income");

  if (nameIdx < 0 || officeIdx < 0 || incomeIdx < 0) {
    throw new Error(`Unexpected AZ CSV header: ${header.join(",")}`);
  }

  console.log(`[az-seethemoney] parsed ${lines.length - 1} rows`);

  // Aggregate per (azId, chamber) — sum income across duplicate filings
  const azMap = new Map<
    string,
    { name: string; first: string; last: string; chamber: "house" | "senate"; totalIncome: number }
  >();

  for (const line of lines.slice(1)) {
    const cols = parseCSVLine(line);
    const rawName = cols[nameIdx] ?? "";
    const office = cols[officeIdx] ?? "";
    const incomeStr = cols[incomeIdx] ?? "0";

    const parsed = parseAzName(rawName);
    if (!parsed) continue;

    const chamber = parseOffice(office);
    if (!chamber) continue; // skip non-legislature candidates

    const income = parseFloat(incomeStr) || 0;
    if (income <= 0) continue;

    const key = `${parsed.azId}:${chamber}`;
    const existing = azMap.get(key);
    if (existing) {
      existing.totalIncome += income;
    } else {
      azMap.set(key, {
        name: rawName,
        first: parsed.first,
        last: parsed.last,
        chamber,
        totalIncome: income,
      });
    }
  }

  console.log(`[az-seethemoney] ${azMap.size} unique candidate-chamber rows`);

  // Load AZ candidates from DB
  const azCandidates = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-AZ-%'`);

  console.log(`[az-seethemoney] ${azCandidates.length} AZ candidates in DB`);

  // Match by last name + first initial + chamber
  let matched = 0;
  let skipped = 0;
  let upserted = 0;

  for (const entry of azMap.values()) {
    const jurisdiction = `state-AZ-${entry.chamber}`;
    const lastLower = entry.last.toLowerCase();
    const firstInitial = entry.first[0]?.toLowerCase() ?? "";

    const dbMatch = azCandidates.find((c) => {
      if (c.jurisdiction !== jurisdiction) return false;
      const fullName = (c.fullName ?? "").toLowerCase();
      // "first last" format — check last name and first initial
      const nameParts = fullName.split(/\s+/);
      const dbLast = nameParts[nameParts.length - 1] ?? "";
      const dbFirst = nameParts[0] ?? "";
      return dbLast === lastLower && dbFirst.startsWith(firstInitial);
    });

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
          bucketLabel: "Other",
          amountTotal: entry.totalIncome.toFixed(2),
          source: SOURCE,
          sourceUrl: SOURCE_URL,
          rawMetadata: {
            azCandidateName: entry.name,
            chamber: entry.chamber,
            office: `state-AZ-${entry.chamber}`,
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
    }
  }

  console.log(
    `[az-seethemoney] done matched=${matched} skipped=${skipped} upserted=${isDryRun ? "(dry-run)" : upserted}`,
  );
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[az-seethemoney] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}

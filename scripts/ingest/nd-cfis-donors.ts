/**
 * North Dakota Campaign Finance Information System donor ingest.
 *
 * Downloads contribution CSVs from cf.sos.nd.gov for ND state legislature
 * candidates using broad search terms ("for House", "for Senate", "elect"),
 * matches committee names to DB candidates, and upserts donor_aggregates.
 *
 * The ND CFIS search requires a name filter; this script uses terms that
 * cover most committee naming conventions. Candidates with no PAC/business
 * contributions will not appear in the system.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/nd-cfis-donors.ts [--dry-run]
 *
 * Requires pre-downloaded CSVs at /tmp/nd_house_2024.csv,
 * /tmp/nd_senate_2024.csv, /tmp/nd_elect_2024.csv
 * (obtained via browser from cf.sos.nd.gov searching "for House", etc.)
 */

import * as fs from "node:fs";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import { sql } from "drizzle-orm";
import { mapEmployerToBucket, bucketIndividualByAmount, type DonorBucketLabel } from "./_bucket-mapping";

const SOURCE = "nd_cfis_bulk";
const SOURCE_URL = "https://cf.sos.nd.gov/search/cfsearch.aspx";
const ELECTION_CYCLE = "2024";

const DRY_RUN = process.argv.includes("--dry-run");

const CSV_FILES = [
  "/tmp/nd_house_2024.csv",
  "/tmp/nd_senate_2024.csv",
  "/tmp/nd_elect_2024.csv",
];

function norm(s: string): string {
  return s.toUpperCase().replace(/['']/g, "").replace(/[-]/g, " ").replace(/\s+/g, " ").trim();
}

function dbLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

// Match committee name like "Kasper for House" to a DB candidate
function buildMatcher(dbCandidates: Array<{ id: string; fullName: string }>) {
  const byLast = new Map<string, string[]>(); // last → [fullName]
  for (const c of dbCandidates) {
    const last = dbLastName(c.fullName);
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last)!.push(c.fullName);
  }

  return function match(committee: string): string | null {
    const cn = norm(committee);
    const words = cn.split(" ").filter(Boolean);

    for (const word of words) {
      const candidates = byLast.get(word);
      if (!candidates || candidates.length === 0) continue;

      if (candidates.length === 1) return candidates[0];

      // Multiple candidates with same last name — try to disambiguate by first word
      const firstWord = words[0];
      for (const fullName of candidates) {
        const firstName = norm(fullName.split(" ")[0] ?? "");
        if (firstWord === firstName) return fullName;
        // Check if committee starts with "firstname lastname" pattern
        const firstLast = norm(fullName.split(" ")[0] + " " + fullName.split(" ").slice(-1)[0]);
        if (cn.includes(firstLast)) return fullName;
      }
      // Return first as fallback if word is clearly the last name
      if (words.indexOf(word) <= 1) return candidates[0];
    }
    return null;
  };
}

// Minimal CSV parser handling quoted fields
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(field); field = ""; }
      else field += ch;
    }
  }
  fields.push(field);
  return fields;
}

interface NdRow {
  "Contributed To": string;
  Street: string;
  City: string;
  State: string;
  Zip: string;
  Date: string;
  Amount: string;
  Contributor: string;
}

function classifyContributor(contributor: string, amount: number): DonorBucketLabel {
  const c = contributor.toUpperCase();

  if (/\bREPUBLICAN\b|\bDEMOCRAT(IC)?\b|\bGOP\b|\bPARTY\b/.test(c)) return "Party committees";
  if (/\bUNION\b|\bAFL\b|\bCIO\b|\bAFSCME\b|\bSEIU\b/.test(c)) {
    if (/POLICE|FIRE|FIREFIGHTER|SHERIFF|FOP/.test(c)) return "Public safety unions";
    if (/TEACHER|NEA|AFT|EDUCATION/.test(c)) return "Education employees";
    return "Trade unions (non-public-safety)";
  }
  if (/\bPAC\b|\bPOLITICAL ACTION\b|\bCOMMITTEE\b|\bASSOCIATION\b|\bFUND\b/.test(c)) {
    // Try industry matching on PAC name
    const bucket = mapEmployerToBucket(contributor);
    if (bucket && bucket !== "Other" && bucket !== "Self-funded") return bucket;
    return "Other";
  }
  // Default: individual contributor (classify by amount)
  return bucketIndividualByAmount(amount);
}

async function main() {
  const db = requireDb();
  console.log(`[nd-cfis] starting dryRun=${DRY_RUN}`);

  const dbCandidates = await db
    .select({ id: candidates.id, fullName: candidates.fullName, jurisdiction: candidates.jurisdiction })
    .from(candidates)
    .where(sql`jurisdiction LIKE 'state-ND-%'`);

  console.log(`[nd-cfis] db_candidates=${dbCandidates.length}`);

  const match = buildMatcher(dbCandidates);
  const candIdByName = new Map(dbCandidates.map(c => [c.fullName, c.id]));

  const aggregates = new Map<string, number>(); // `candidateId::bucket` → total
  const matched = new Set<string>();
  const committeeMatches = new Map<string, string>(); // committee → fullName (to avoid re-matching)

  let rowsScanned = 0;
  let rowsMatched = 0;
  let rowsSkipped = 0;

  // Process each CSV file (may have overlapping rows — the Map deduplicates by summing)
  const seenKeys = new Set<string>(); // deduplicate exact rows

  for (const csvPath of CSV_FILES) {
    if (!fs.existsSync(csvPath)) {
      console.log(`[nd-cfis] skipping missing file: ${csvPath}`);
      continue;
    }

    const text = fs.readFileSync(csvPath, "utf-8");
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) continue;

    const headers = parseCsvRow(lines[0]);
    console.log(`[nd-cfis] ${csvPath}: ${lines.length - 1} rows`);

    for (let i = 1; i < lines.length; i++) {
      rowsScanned++;
      const vals = parseCsvRow(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] ?? "").trim(); });

      const committee = row["Contributed To"]?.trim();
      if (!committee) { rowsSkipped++; continue; }

      const amount = parseFloat(row["Amount"] || "0") || 0;
      if (amount <= 0) { rowsSkipped++; continue; }

      // Dedup by committee+date+amount+contributor
      const rowKey = `${committee}|${row["Date"]}|${amount}|${row["Contributor"]}`;
      if (seenKeys.has(rowKey)) continue;
      seenKeys.add(rowKey);

      // Match committee to candidate
      let fullName = committeeMatches.get(committee.toLowerCase());
      if (fullName === undefined) {
        fullName = match(committee) ?? null;
        committeeMatches.set(committee.toLowerCase(), fullName ?? "");
      }
      if (!fullName) { rowsSkipped++; continue; }

      const candidateId = candIdByName.get(fullName);
      if (!candidateId) { rowsSkipped++; continue; }

      const bucket = classifyContributor(row["Contributor"] || "", amount);
      const aggKey = `${candidateId}::${bucket}`;
      aggregates.set(aggKey, (aggregates.get(aggKey) ?? 0) + amount);
      matched.add(fullName);
      rowsMatched++;
    }
  }

  console.log(`[nd-cfis] rows_scanned=${rowsScanned} rows_matched=${rowsMatched} rows_skipped=${rowsSkipped}`);
  console.log(`[nd-cfis] candidates_matched=${matched.size}`);

  const upsertRows = Array.from(aggregates.entries()).map(([key, total]) => {
    const [candidateId, bucket] = key.split("::");
    return { candidateId, electionCycle: ELECTION_CYCLE, bucketLabel: bucket as DonorBucketLabel, amountTotal: total };
  });

  console.log(`[nd-cfis] rows_to_upsert=${upsertRows.length}`);

  if (DRY_RUN || upsertRows.length === 0) {
    console.log(`[nd-cfis] dry_run — skipping upsert`);
    upsertRows.slice(0, 10).forEach(r => {
      const name = dbCandidates.find(c => c.id === r.candidateId)?.fullName ?? r.candidateId;
      console.log(`  ${name} | ${r.bucketLabel} | $${r.amountTotal.toFixed(2)}`);
    });
    return;
  }

  let upserted = 0;
  for (const row of upsertRows) {
    await db
      .insert(donorAggregates)
      .values({
        candidateId: row.candidateId,
        electionCycle: row.electionCycle,
        bucketLabel: row.bucketLabel,
        amountTotal: row.amountTotal.toFixed(2),
        source: SOURCE,
        sourceUrl: SOURCE_URL,
        insertedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [donorAggregates.candidateId, donorAggregates.electionCycle, donorAggregates.bucketLabel],
        set: {
          amountTotal: sql`excluded.amount_total`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          insertedAt: sql`excluded.inserted_at`,
        },
      });
    upserted++;
  }

  console.log(`[nd-cfis] complete candidates_matched=${matched.size} rows_upserted=${upserted} dry_run=${DRY_RUN}`);
}

main().catch(err => { console.error(err); process.exit(1); });

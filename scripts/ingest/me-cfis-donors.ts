/**
 * scripts/ingest/me-cfis-donors.ts
 *
 * Maine Campaign Finance Information System (CFIS) donor ingest.
 *
 * Queries the Maine CFIS REST API for all 2024 monetary contributions to
 * state candidate committees, filters for state legislature (Representative
 * or Senator) races, matches candidate names to ME state candidates in our
 * DB by normalized last name, aggregates into donor buckets, and upserts
 * into `donor_aggregates`.
 *
 * Source: Maine Ethics Commission CFIS
 * https://mainecampaignfinance.com/
 *
 * API: POST https://mainecampaignfinance.com/api/Search/TransactionSearchInformation
 * No authentication required. Returns JSON array with TotalRows for pagination.
 *
 * Response fields used:
 *   - Name: candidate committee name (format "Last, First" or "Committee Name")
 *   - ContributorPayeeName: contributor name
 *   - Amount: contribution amount (negative for returned contributions)
 *   - Type: "Monetary (Itemized)" | "Returned Contribution" | "In-Kind (Itemized)" etc.
 *   - TransactionCategoryCode: "MOI" (monetary itemized) | "MOU" (unitemized) | "RC" (returned) | "IKI" (in-kind)
 *   - Employer: contributor employer
 *   - Occupation: contributor occupation
 *   - CanCommOffice: "Representative" | "Senator" (state legislature)
 *   - CamCommJurisdiction: "STATE" for state legislature
 *   - ContributorPayeeType: "Individual", "Business", "PAC" etc.
 *   - RowNumber, TotalRows: pagination
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/me-cfis-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE = "me_cfis_bulk";
const SOURCE_URL = "https://mainecampaignfinance.com/";
const API_URL =
  "https://mainecampaignfinance.com/api/Search/TransactionSearchInformation";
const ELECTION_YEAR = "2024";
const ELECTION_CYCLE = "2024";
const PAGE_SIZE = 200;
const RATE_LIMIT_MS = 100;

// TransactionCategoryCode values for monetary contributions (not returns, in-kind, or loans)
const MONETARY_CODES = new Set(["MOI", "MOU"]);

// CanCommOffice values for state legislature
const STATE_LEGISLATURE_OFFICES = new Set(["Representative", "Senator"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeTransaction {
  Name?: string | null; // Committee/candidate name
  ContributorPayeeName?: string | null;
  Amount?: number | null;
  Type?: string | null;
  TransactionCategoryCode?: string | null;
  Employer?: string | null;
  Occupation?: string | null;
  CanCommOffice?: string | null;
  CamCommJurisdiction?: string | null;
  ContributorPayeeType?: string | null;
  RowNumber?: number | null;
  TotalRows?: number | null;
}

type UnknownRecord = Record<string, unknown>;

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
  rawMetadata: unknown;
}

interface AggValue {
  totalDollars: number;
  donorCount: number;
  meName: string;
}

export type MeCfisIngestCounts = {
  contributionsFetched: number;
  contributionsFiltered: number;
  candidatesMatched: number;
  rowsUpserted: number;
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface IngestConfig {
  dryRun: boolean;
  limit: number | null;
}

function resolveConfig(argv: string[] = process.argv): IngestConfig {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  let limit: number | null = null;
  if (limitIdx !== -1) {
    const raw = argv[limitIdx + 1];
    const parsed = Number.parseInt(raw ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) limit = parsed;
  }
  return { dryRun, limit };
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

function normalizeStr(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Extract last name from ME CFIS Name field.
 * Formats observed:
 *   "Bell, Arthur L" → "Bell" (before comma)
 *   "Hasenfus, Tavis Rock" → "Hasenfus"
 *   "COMMITTEE TO ELECT ..." → try last meaningful word
 */
function extractLastNameFromMeName(meName: string): string {
  const trimmed = meName.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    return normalizeStr(trimmed.substring(0, commaIdx));
  }
  // No comma — try last word
  const parts = trimmed.split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? "");
}

function extractLastNameFromDbName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  return normalizeStr(parts[parts.length - 1] ?? "");
}

// ---------------------------------------------------------------------------
// API fetching
// ---------------------------------------------------------------------------

async function fetchPage(pageNumber: number): Promise<MeTransaction[]> {
  const body = {
    TransactionType: "CON",
    CommitteeType: "01", // Candidate committees (required)
    ElectionYear: ELECTION_YEAR,
    CommitteeName: null,
    ContributorPayeeName: null,
    TransactionBeginDate: null,
    TransactionEndDate: null,
    TransactionAmount: null,
    ValidationRequired: 1,
    ContributorType: null,
    CandidateJurisdictionType: null,
    Jurisdiction: null,
    pageNumber: String(pageNumber),
    pageSize: String(PAGE_SIZE),
    sortDir: "",
    sortedBy: "",
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "voter-choice-ingest/1.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[me-cfis-donors] HTTP ${res.status} on page ${pageNumber}: ${text.slice(0, 200)}`,
    );
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    // API may return an error object
    const msg =
      typeof data === "object" && data !== null
        ? JSON.stringify(data).slice(0, 200)
        : String(data);
    throw new Error(`[me-cfis-donors] unexpected response: ${msg}`);
  }

  return data as MeTransaction[];
}

// ---------------------------------------------------------------------------
// Main ingest logic
// ---------------------------------------------------------------------------

export async function ingestMeCfisDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<MeCfisIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[me-cfis-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load ME state candidates from DB
  console.log("[me-cfis-donors] querying DB for ME state candidates ...");
  const dbCandidatesRaw = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-ME%'`);
  const dbCandidates = dbCandidatesRaw as DbCandidate[];
  console.log(`[me-cfis-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn("[me-cfis-donors] no ME state candidates found in DB");
    return {
      contributionsFetched: 0,
      contributionsFiltered: 0,
      candidatesMatched: 0,
      rowsUpserted: 0,
      dryRun: config.dryRun,
    };
  }

  // Step 2: Build last-name and first-name indices
  const byLastName = new Map<string, DbCandidate[]>();
  const byFirstName = new Map<string, DbCandidate[]>();
  for (const cand of dbCandidates) {
    const parts = cand.fullName.trim().split(/\s+/u).filter(Boolean);
    const lastName = extractLastNameFromDbName(cand.fullName);
    const firstName = normalizeStr(parts[0] ?? "");
    if (lastName) {
      const existing = byLastName.get(lastName) ?? [];
      existing.push(cand);
      byLastName.set(lastName, existing);
    }
    if (firstName && firstName !== lastName) {
      const existing = byFirstName.get(firstName) ?? [];
      existing.push(cand);
      byFirstName.set(firstName, existing);
    }
  }
  console.log(
    `[me-cfis-donors] last_names_indexed=${byLastName.size} first_names_indexed=${byFirstName.size}`,
  );

  // Cache ME name → DB candidate
  const nameCache = new Map<string, DbCandidate | null>();

  function resolveCandidate(meName: string): DbCandidate | null {
    if (nameCache.has(meName)) return nameCache.get(meName) ?? null;

    const lastName = extractLastNameFromMeName(meName);

    // Try last name match first
    const lastMatches = byLastName.get(lastName);
    if (lastMatches && lastMatches.length > 0) {
      if (lastMatches.length === 1) {
        nameCache.set(meName, lastMatches[0] ?? null);
        return lastMatches[0] ?? null;
      }
      // Multiple last-name matches — disambiguate by first name
      const trimmed = meName.trim();
      const commaIdx = trimmed.indexOf(",");
      if (commaIdx !== -1) {
        const afterComma = trimmed.substring(commaIdx + 1).trim();
        const firstToken = normalizeStr(afterComma.split(/\s+/u)[0] ?? "");
        if (firstToken) {
          const firstMatch = lastMatches.find(
            (c) => normalizeStr(c.fullName.split(/\s+/u)[0] ?? "") === firstToken,
          );
          if (firstMatch) {
            nameCache.set(meName, firstMatch);
            return firstMatch;
          }
        }
      }
      nameCache.set(meName, lastMatches[0] ?? null);
      return lastMatches[0] ?? null;
    }

    // Fallback: try first-name match (for single-name committee patterns)
    const firstNameFromMe = normalizeStr(
      meName.trim().split(/\s+/u)[0] ?? "",
    );
    const firstMatches = byFirstName.get(firstNameFromMe);
    if (firstMatches && firstMatches.length === 1) {
      nameCache.set(meName, firstMatches[0] ?? null);
      return firstMatches[0] ?? null;
    }

    nameCache.set(meName, null);
    return null;
  }

  // Step 3: Paginate through ME CFIS API
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  let contributionsFetched = 0;
  let contributionsFiltered = 0;
  let totalRows = 0;
  let pageNumber = 1;

  console.log(`[me-cfis-donors] fetching 2024 ME candidate contributions ...`);

  while (true) {
    const txs = await fetchPage(pageNumber);

    if (txs.length === 0) {
      console.log(
        `[me-cfis-donors] empty page at page=${pageNumber} — done`,
      );
      break;
    }

    // Get total from first record
    if (pageNumber === 1 && txs[0]?.TotalRows) {
      totalRows = txs[0].TotalRows;
      console.log(
        `[me-cfis-donors] total_rows_to_fetch=${totalRows} pages=${Math.ceil(totalRows / PAGE_SIZE)}`,
      );
    }

    contributionsFetched += txs.length;

    for (const tx of txs) {
      // Only monetary contributions (not returns, in-kind, etc.)
      const catCode = (tx.TransactionCategoryCode ?? "").trim();
      if (!MONETARY_CODES.has(catCode)) continue;

      // Only state legislature offices
      const office = (tx.CanCommOffice ?? "").trim();
      if (!STATE_LEGISLATURE_OFFICES.has(office)) continue;

      // Only STATE jurisdiction
      const jurisdiction = (tx.CamCommJurisdiction ?? "").trim();
      if (jurisdiction !== "STATE") continue;

      const amount = tx.Amount ?? 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const meName = (tx.Name ?? "").trim();
      if (!meName) continue;

      const dbCandidate = resolveCandidate(meName);
      if (!dbCandidate) continue;

      contributionsFiltered++;

      // Classify into donor bucket
      const employer = (tx.Employer ?? "").trim();
      const occupation = (tx.Occupation ?? "").trim();
      const contribType = (tx.ContributorPayeeType ?? "").trim();

      let bucket: DonorBucketLabel;

      if (contribType === "Individual") {
        const empBucket = mapEmployerToBucket(employer, occupation);
        if (empBucket === "Self-funded") {
          bucket = "Self-funded";
        } else if (empBucket !== null) {
          bucket = empBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Organization: Business, PAC, Political Party, Candidate
        const contribName = (tx.ContributorPayeeName ?? "").trim();
        const orgBucket =
          mapEmployerToBucket(contribName) ??
          mapEmployerToBucket(employer) ??
          null;
        bucket = orgBucket ?? "Other";
      }

      // Accumulate
      const aggKey = `${dbCandidate.id}|${ELECTION_CYCLE}|${bucket}`;
      const existing = agg.get(aggKey);
      if (existing) {
        existing.totalDollars += amount;
        existing.donorCount += 1;
      } else {
        agg.set(aggKey, { totalDollars: amount, donorCount: 1, meName });
      }

      const matched =
        candidateMatchedNames.get(dbCandidate.id) ?? new Set<string>();
      matched.add(meName);
      candidateMatchedNames.set(dbCandidate.id, matched);
    }

    // Check if we've reached the limit
    if (config.limit !== null && contributionsFetched >= config.limit) {
      console.log(
        `[me-cfis-donors] reached limit=${config.limit} — stopping`,
      );
      break;
    }

    // Check if we've fetched all rows
    if (
      totalRows > 0 &&
      contributionsFetched >= totalRows
    ) {
      console.log(
        `[me-cfis-donors] fetched all ${totalRows} rows — done`,
      );
      break;
    }

    // Next page
    pageNumber++;

    if (RATE_LIMIT_MS > 0) {
      await new Promise<void>((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log(
    `[me-cfis-donors] fetch_complete fetched=${contributionsFetched} state_leg_filtered=${contributionsFiltered} matched_cands=${candidateMatchedNames.size}`,
  );

  // Step 4: Build upsert rows
  const rows: Array<{
    candidateId: string;
    electionCycle: string;
    bucketLabel: string;
    amountTotal: string;
    source: string;
    sourceUrl: string;
    rawMetadata: UnknownRecord;
  }> = [];

  for (const [aggKey, value] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    if (firstPipe === -1 || secondPipe === -1) continue;

    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucket = aggKey.substring(secondPipe + 1);

    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const matchedNames = [...(candidateMatchedNames.get(candidateId) ?? [])];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        meCfisNames: matchedNames,
      },
    });
  }

  console.log(
    `[me-cfis-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[me-cfis-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await db
        .insert(donorAggregates)
        .values(
          chunk.map((r) => ({
            candidateId: r.candidateId,
            electionCycle: r.electionCycle,
            bucketLabel: r.bucketLabel,
            amountTotal: r.amountTotal,
            source: r.source,
            sourceUrl: r.sourceUrl,
            rawMetadata: r.rawMetadata,
            insertedAt: new Date(),
          })),
        )
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
      rowsUpserted += chunk.length;
    }
  }

  const counts: MeCfisIngestCounts = {
    contributionsFetched,
    contributionsFiltered,
    candidatesMatched: candidateMatchedNames.size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[me-cfis-donors] complete",
      `contributions_fetched=${contributionsFetched}`,
      `state_leg_filtered=${contributionsFiltered}`,
      `candidates_matched=${candidateMatchedNames.size}`,
      `rows_upserted=${rowsUpserted}`,
      `dry_run=${config.dryRun}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  ingestMeCfisDonors().catch((error: unknown) => {
    const msg =
      error instanceof Error
        ? error.message.replace(/\s+/gu, " ")
        : "unknown";
    console.error("[me-cfis-donors] failed:", msg);
    process.exitCode = 1;
  });
}

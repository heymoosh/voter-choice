/**
 * scripts/ingest/wi-cfis-donors.ts
 *
 * Wisconsin Campaign Finance Information System (CFIS) donor ingest.
 *
 * Queries the CFIS tRPC API for all 2024 Contribution transactions,
 * filters client-side for State Assembly (officeId=8) and State Senate
 * (officeId=9) races, matches committee names to WI state candidates
 * in our DB by normalized last name, aggregates into donor buckets,
 * and upserts into `donor_aggregates`.
 *
 * Source: Wisconsin Ethics Commission CFIS
 * https://campaignfinance.wi.gov/
 *
 * API: POST/GET https://campaignfinance.wi.gov/api/trpc/publicFrontendApi.getTransactions
 * No authentication required. Returns 50 rows per page.
 * No total count exposed — paginate until empty page.
 *
 * Transaction fields used:
 *   - amount: contribution amount
 *   - date: ISO datetime
 *   - fromOccupationTitle: contributor occupation
 *   - from_entity.name: contributor name
 *   - from_entity.entityType.name: "Individual" | "Registrant" | "Business" | "Depository/Bank"
 *   - createdByEntity.name: committee name (e.g., "Clancy for Assembly")
 *   - createdByEntity.committee.committeeType.name: "State Candidate" etc.
 *   - relatedOffice.id: 8=State Assembly, 9=State Senate
 *
 * Committee name patterns (WI):
 *   "[Last] for Assembly"
 *   "[First] [Last] for Assembly"
 *   "Friends of [Name]"
 *   "[Name] for [District]"
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/wi-cfis-donors.ts [--dry-run] [--limit 50] [--max-pages 200]
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

const SOURCE = "wi_cfis_bulk";
const SOURCE_URL = "https://campaignfinance.wi.gov/";
const BASE_URL =
  "https://campaignfinance.wi.gov/api/trpc/publicFrontendApi.getTransactions";
const ELECTION_CYCLE = "2024";
const DATE_FROM = "2023-01-01"; // WI 2-year cycle: candidates raise in 2023+2024
const DATE_TO = "2024-12-31";
const PAGE_SIZE = 50;
const MAX_PAGES = 1000; // safety cap — override with --max-pages
const RATE_LIMIT_MS = 100; // delay between requests

// Office IDs in WI CFIS that correspond to state legislature
const STATE_LEGISLATURE_OFFICE_IDS = new Set([8, 9]); // 8=State Assembly, 9=State Senate

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WiTransaction {
  amount: number;
  date: string;
  fromOccupationTitle: string | null;
  createdByEntity: {
    name: string;
    committee?: {
      committeeType?: { id: number; name: string };
    };
  };
  from_entity: {
    name: string;
    entityType?: { name: string };
  };
  relatedOffice?: { id: number; name: string } | null;
  relatedBranch?: { id: number; name: string } | null;
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
  committeeName: string;
}

export type WiCfisIngestCounts = {
  pagesScanned: number;
  contributionsScanned: number;
  stateLegContributions: number;
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
  maxPages: number;
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
  const maxPagesIdx = argv.indexOf("--max-pages");
  let maxPages = MAX_PAGES;
  if (maxPagesIdx !== -1) {
    const raw = argv[maxPagesIdx + 1];
    const parsed = Number.parseInt(raw ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) maxPages = parsed;
  }
  return { dryRun, limit, maxPages };
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
 * Extract candidate last-name tokens from a WI committee name.
 * Returns an array of normalized tokens to try, most-likely-last-name first.
 *
 * Patterns:
 *   "[Last] for Assembly"            → ["LAST"]
 *   "[First] [Last] for Assembly"    → ["LAST", "FIRST"]
 *   "Friends of [Name]"              → ["NAME"]
 *   "Committee to Elect [Name]"      → ["NAME"]
 *   "[Name] for Wisconsin"           → ["NAME"] (statewide — filtered out by office)
 */
function extractCandidateTokens(committeeName: string): string[] {
  const upper = normalizeStr(committeeName);

  // Pattern: "FRIENDS OF [Name]"
  const friendsMatch = /^FRIENDS OF (.+)$/u.exec(upper);
  if (friendsMatch) {
    const remainder = (friendsMatch[1] ?? "").trim();
    const tokens = remainder.split(/\s+/u).filter(Boolean);
    // Return last word first (likely surname), then others
    return [...tokens].reverse();
  }

  // Pattern: "COMMITTEE TO ELECT [Name]" or "ELECT [Name]"
  const electMatch = /(?:COMMITTEE TO |^)ELECT (.+)$/u.exec(upper);
  if (electMatch) {
    const remainder = (electMatch[1] ?? "").trim();
    const tokens = remainder.split(/\s+/u).filter(Boolean);
    return [...tokens].reverse();
  }

  // Pattern: "[Name] FOR [Office]"
  const forIdx = upper.indexOf(" FOR ");
  if (forIdx !== -1) {
    const beforeFor = upper.substring(0, forIdx).trim();
    const tokens = beforeFor.split(/\s+/u).filter(Boolean);
    // Return last word first (surname in "First Last for Assembly"),
    // then try others for "Jodi for State Senate" (single first name only)
    return [...tokens].reverse();
  }

  // Fallback: return all words reversed
  return upper.split(/\s+/u).filter(Boolean).reverse();
}

// ---------------------------------------------------------------------------
// API fetching
// ---------------------------------------------------------------------------

async function fetchPage(
  page: number,
  pageSize: number,
): Promise<WiTransaction[]> {
  const input = JSON.stringify({
    json: {
      page,
      pageSize,
      transactionType: [1], // 1 = Contribution/Receipt
      dateFrom: DATE_FROM,
      dateTo: DATE_TO,
    },
  });

  const encoded = encodeURIComponent(input);
  const url = `${BASE_URL}?input=${encoded}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "voter-choice-ingest/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(
      `[wi-cfis-donors] HTTP ${res.status} on page ${page}: ${await res.text().then((t) => t.slice(0, 200))}`,
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  const results = (
    (
      (data as { result?: { data?: { json?: { results?: unknown } } } })
        .result?.data?.json as { results?: unknown }
    )?.results ?? []
  ) as WiTransaction[];

  return results;
}

// ---------------------------------------------------------------------------
// Main ingest logic
// ---------------------------------------------------------------------------

export async function ingestWiCfisDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<WiCfisIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[wi-cfis-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"} maxPages=${config.maxPages}`,
  );

  // Step 1: Load WI state candidates from DB
  console.log("[wi-cfis-donors] querying DB for WI state candidates ...");
  const dbCandidatesRaw = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-WI%'`);
  const dbCandidates = dbCandidatesRaw as DbCandidate[];
  console.log(`[wi-cfis-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn("[wi-cfis-donors] no WI state candidates found in DB");
    return {
      pagesScanned: 0,
      contributionsScanned: 0,
      stateLegContributions: 0,
      candidatesMatched: 0,
      rowsUpserted: 0,
      dryRun: config.dryRun,
    };
  }

  // Step 2: Build last-name AND first-name indices
  const byLastName = new Map<string, DbCandidate[]>();
  const byFirstName = new Map<string, DbCandidate[]>();
  for (const cand of dbCandidates) {
    const parts = cand.fullName.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) continue;
    const lastName = normalizeStr(parts[parts.length - 1] ?? "");
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
    `[wi-cfis-donors] unique_last_names_indexed=${byLastName.size} unique_first_names_indexed=${byFirstName.size}`,
  );

  // Cache committee name → DB candidate
  const committeeCache = new Map<string, DbCandidate | null>();

  function resolveCommittee(
    committeeName: string,
    branchName?: string,
  ): DbCandidate | null {
    if (committeeCache.has(committeeName))
      return committeeCache.get(committeeName) ?? null;

    const tokens = extractCandidateTokens(committeeName);

    // Extract district number from branch name for disambiguation
    // e.g. "State Assembly, District No. 43" → 43
    let branchDistrict: number | null = null;
    let branchChamber: "house" | "senate" | null = null;
    if (branchName) {
      const distMatch = /District No\. (\d+)/u.exec(branchName);
      if (distMatch) branchDistrict = parseInt(distMatch[1] ?? "0", 10);
      if (branchName.includes("Assembly")) branchChamber = "house";
      else if (branchName.includes("Senate")) branchChamber = "senate";
    }

    function pickBest(matches: DbCandidate[]): DbCandidate | null {
      if (matches.length === 0) return null;
      if (matches.length === 1) return matches[0] ?? null;
      // Disambiguate by chamber if available
      if (branchChamber) {
        const chamberKey = `state-WI-${branchChamber}`;
        const chamberMatches = matches.filter((c) =>
          c.jurisdiction.includes(chamberKey),
        );
        if (chamberMatches.length === 1) return chamberMatches[0] ?? null;
      }
      return matches[0] ?? null;
    }

    // Try last-name match first
    for (const token of tokens) {
      const lastMatches = byLastName.get(token);
      if (lastMatches && lastMatches.length > 0) {
        const match = pickBest(lastMatches);
        committeeCache.set(committeeName, match);
        return match;
      }
    }

    // Fallback: try first-name match (for "Jodi for State Senate" → Jodi Emerson)
    for (const token of tokens) {
      const firstMatches = byFirstName.get(token);
      if (firstMatches && firstMatches.length > 0) {
        const match = pickBest(firstMatches);
        committeeCache.set(committeeName, match);
        return match;
      }
    }

    committeeCache.set(committeeName, null);
    return null;
  }

  // Step 3: Paginate through 2023-2024 contributions
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  let pagesScanned = 0;
  let contributionsScanned = 0;
  let stateLegContributions = 0;

  console.log(
    `[wi-cfis-donors] paginating through contributions (max ${config.maxPages} pages) ...`,
  );

  const effectiveMaxPages =
    config.limit !== null ? Math.ceil(config.limit / PAGE_SIZE) : config.maxPages;

  for (let page = 1; page <= effectiveMaxPages; page++) {
    const transactions = await fetchPage(page, PAGE_SIZE);

    if (transactions.length === 0) {
      console.log(
        `[wi-cfis-donors] empty page at page=${page} — done paginating`,
      );
      break;
    }

    pagesScanned++;
    contributionsScanned += transactions.length;

    for (const tx of transactions) {
      // Filter: only state legislature offices
      const officeId = tx.relatedOffice?.id ?? null;
      if (!officeId || !STATE_LEGISLATURE_OFFICE_IDS.has(officeId)) continue;

      stateLegContributions++;

      const amount = tx.amount;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const committeeName = tx.createdByEntity.name ?? "";
      if (!committeeName) continue;

      const branchName = tx.relatedBranch?.name ?? undefined;
      const dbCandidate = resolveCommittee(committeeName, branchName);
      if (!dbCandidate) continue;

      // Classify contributor into bucket
      const fromType = tx.from_entity.entityType?.name ?? "";
      const occupation = tx.fromOccupationTitle ?? "";
      const fromName = tx.from_entity.name ?? "";

      let bucket: DonorBucketLabel;

      if (fromType === "Individual") {
        const occupationBucket = mapEmployerToBucket(occupation);
        if (occupationBucket === "Self-funded") {
          bucket = "Self-funded";
        } else if (occupationBucket !== null) {
          bucket = occupationBucket;
        } else {
          bucket = bucketIndividualByAmount(amount);
        }
      } else {
        // Non-individual: Registrant, Business, Depository/Bank
        const orgBucket =
          mapEmployerToBucket(fromName) ?? mapEmployerToBucket(occupation);
        bucket = orgBucket ?? "Other";
      }

      // Accumulate
      const aggKey = `${dbCandidate.id}|${ELECTION_CYCLE}|${bucket}`;
      const existing = agg.get(aggKey);
      if (existing) {
        existing.totalDollars += amount;
        existing.donorCount += 1;
      } else {
        agg.set(aggKey, {
          totalDollars: amount,
          donorCount: 1,
          committeeName,
        });
      }

      const matched =
        candidateMatchedNames.get(dbCandidate.id) ?? new Set<string>();
      matched.add(committeeName);
      candidateMatchedNames.set(dbCandidate.id, matched);
    }

    if (page % 50 === 0) {
      console.log(
        `[wi-cfis-donors] page=${page} scanned=${contributionsScanned} stateLeg=${stateLegContributions} matched_cands=${candidateMatchedNames.size}`,
      );
    }

    // Rate limit
    if (RATE_LIMIT_MS > 0) {
      await new Promise<void>((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log(
    `[wi-cfis-donors] scan_complete pages=${pagesScanned} scanned=${contributionsScanned} stateLeg=${stateLegContributions} matched_cands=${candidateMatchedNames.size}`,
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

    const matchedNames = [
      ...(candidateMatchedNames.get(candidateId) ?? []),
    ];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        wiCommitteeNames: matchedNames,
      },
    });
  }

  console.log(
    `[wi-cfis-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[wi-cfis-donors] dry-run — skipping upsert of ${rows.length} rows`,
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

  const counts: WiCfisIngestCounts = {
    pagesScanned,
    contributionsScanned,
    stateLegContributions,
    candidatesMatched: candidateMatchedNames.size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[wi-cfis-donors] complete",
      `pages_scanned=${pagesScanned}`,
      `contributions_scanned=${contributionsScanned}`,
      `state_leg=${stateLegContributions}`,
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
  ingestWiCfisDonors().catch((error: unknown) => {
    const msg =
      error instanceof Error
        ? error.message.replace(/\s+/gu, " ")
        : "unknown";
    console.error("[wi-cfis-donors] failed:", msg);
    process.exitCode = 1;
  });
}

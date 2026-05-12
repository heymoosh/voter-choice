/**
 * scripts/ingest/ia-iec-donors.ts
 *
 * Iowa Ethics and Campaign Disclosure Board (IECDB) donor ingest.
 *
 * Queries the Iowa campaign finance Socrata API for all 2024 contributions
 * to State House and State Senate committees, matches committee names to
 * Iowa state candidates in our DB by normalized last name, aggregates into
 * donor buckets, and upserts into `donor_aggregates`.
 *
 * Source: Iowa Ethics and Campaign Disclosure Board via Socrata
 * https://mydata.iowa.gov/resource/smfg-ds7h.json
 *
 * Socrata endpoint fields:
 *   date, committee_cd, committee_type, committee_nm (recipient),
 *   transaction_type, contr_committee_cd, organization_nm (org donor),
 *   first_nm (individual donor first), last_nm (individual donor last),
 *   address_line_1, address_line_2, city, state_cd, zip, amount, check_number
 *
 * Filters applied:
 *   - committee_type IN ("State House", "State Senate")
 *   - transaction_type = "CON"
 *   - date >= "2024-01-01" AND date <= "2024-12-31"
 *
 * Total 2024 IA state leg contributions: ~61,000
 *
 * Note: no employer/occupation field available — individual donor classification
 * falls back to amount-based bucket; org donors use organization_nm.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/ia-iec-donors.ts [--dry-run] [--limit 50]
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

const SOURCE = "ia_iec_bulk";
const SOURCE_URL = "https://mydata.iowa.gov/resource/smfg-ds7h.json";
const ELECTION_CYCLE = "2024";
const DATE_FROM = "2024-01-01";
const DATE_TO = "2024-12-31";
const PAGE_SIZE = 1000;
const RATE_LIMIT_MS = 100;

// Socrata $where clause for state legislature contributions in 2024
const WHERE_CLAUSE = encodeURIComponent(
  `date>='${DATE_FROM}' AND date<='${DATE_TO}' AND (committee_type='State House' OR committee_type='State Senate') AND transaction_type='CON'`,
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IaRow {
  date?: string;
  committee_type?: string;
  committee_nm?: string;
  transaction_type?: string;
  first_nm?: string;
  last_nm?: string;
  organization_nm?: string;
  amount?: string;
  state_cd?: string;
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

export type IaIecIngestCounts = {
  contributionsFetched: number;
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
 * Extract candidate last-name tokens from an Iowa committee name.
 * Iowa patterns:
 *   "Timi Brown-Powers for Iowa" → "BROWNPOWERS" (after norm) → "IOWA" removed → "BROWNPOWERS"
 *   "Friends of [Name]" → name after "of"
 *   "[First] [Last] for Iowa/House/Senate" → last word before "for"
 *   "[Last] for [District]" → last word before "for"
 */
function extractCandidateTokens(committeeName: string): string[] {
  const upper = normalizeStr(committeeName);

  // "FRIENDS OF [Name]"
  const friendsMatch = /^FRIENDS OF (.+)$/u.exec(upper);
  if (friendsMatch) {
    const remainder = (friendsMatch[1] ?? "").trim();
    const tokens = remainder.split(/\s+/u).filter(Boolean);
    return [...tokens].reverse();
  }

  // "[Name] FOR [Office/Iowa/District]"
  const forIdx = upper.indexOf(" FOR ");
  if (forIdx !== -1) {
    const beforeFor = upper.substring(0, forIdx).trim();
    const tokens = beforeFor.split(/\s+/u).filter(Boolean);
    return [...tokens].reverse();
  }

  // Fallback
  return upper.split(/\s+/u).filter(Boolean).reverse();
}

// ---------------------------------------------------------------------------
// API fetching (Socrata)
// ---------------------------------------------------------------------------

async function fetchPage(offset: number, pageSize: number): Promise<IaRow[]> {
  const url = `${SOURCE_URL}?$where=${WHERE_CLAUSE}&$limit=${pageSize}&$offset=${offset}&$order=date+DESC`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "voter-choice-ingest/1.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[ia-iec-donors] HTTP ${res.status} at offset ${offset}: ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as IaRow[];
}

// ---------------------------------------------------------------------------
// Main ingest logic
// ---------------------------------------------------------------------------

export async function ingestIaIecDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<IaIecIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[ia-iec-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load IA state candidates from DB
  console.log("[ia-iec-donors] querying DB for IA state candidates ...");
  const dbCandidatesRaw = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-IA%'`);
  const dbCandidates = dbCandidatesRaw as DbCandidate[];
  console.log(`[ia-iec-donors] db_candidates_found=${dbCandidates.length}`);

  if (dbCandidates.length === 0) {
    console.warn("[ia-iec-donors] no IA state candidates found in DB");
    return {
      contributionsFetched: 0,
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
    `[ia-iec-donors] last_names=${byLastName.size} first_names=${byFirstName.size}`,
  );

  // Cache committee name → DB candidate
  const committeeCache = new Map<string, DbCandidate | null>();

  function resolveCommittee(committeeName: string): DbCandidate | null {
    if (committeeCache.has(committeeName))
      return committeeCache.get(committeeName) ?? null;

    const tokens = extractCandidateTokens(committeeName);

    // Try last-name match
    for (const token of tokens) {
      const lastMatches = byLastName.get(token);
      if (lastMatches && lastMatches.length > 0) {
        const match = lastMatches[0] ?? null;
        committeeCache.set(committeeName, match);
        return match;
      }
    }

    // Fallback: try first-name match
    for (const token of tokens) {
      const firstMatches = byFirstName.get(token);
      if (firstMatches && firstMatches.length === 1) {
        committeeCache.set(committeeName, firstMatches[0] ?? null);
        return firstMatches[0] ?? null;
      }
    }

    committeeCache.set(committeeName, null);
    return null;
  }

  // Step 3: Paginate through IA Socrata API
  const agg = new Map<string, AggValue>();
  const candidateMatchedNames = new Map<string, Set<string>>();
  let contributionsFetched = 0;
  let offset = 0;

  const effectiveLimit = config.limit ?? Infinity;

  console.log(`[ia-iec-donors] fetching 2024 IA state legislature contributions ...`);

  while (contributionsFetched < effectiveLimit) {
    const rows = await fetchPage(
      offset,
      Math.min(PAGE_SIZE, effectiveLimit - contributionsFetched),
    );

    if (rows.length === 0) {
      console.log(`[ia-iec-donors] empty page at offset=${offset} — done`);
      break;
    }

    contributionsFetched += rows.length;

    for (const row of rows) {
      const amount = Number.parseFloat(row.amount ?? "0");
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const committeeName = (row.committee_nm ?? "").trim();
      if (!committeeName) continue;

      const dbCandidate = resolveCommittee(committeeName);
      if (!dbCandidate) continue;

      // Classify into bucket
      const isIndividual = !!(row.last_nm ?? row.first_nm);
      const orgName = (row.organization_nm ?? "").trim();

      let bucket: DonorBucketLabel;

      if (isIndividual) {
        // No employer field available — fall back to amount-based bucket
        bucket = bucketIndividualByAmount(amount);
      } else {
        // Organization contribution
        const orgBucket = mapEmployerToBucket(orgName);
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

    if (contributionsFetched % 10000 === 0 || rows.length < PAGE_SIZE) {
      console.log(
        `[ia-iec-donors] fetched=${contributionsFetched} matched_cands=${candidateMatchedNames.size}`,
      );
    }

    offset += rows.length;

    if (rows.length < PAGE_SIZE) break; // last page

    if (RATE_LIMIT_MS > 0) {
      await new Promise<void>((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log(
    `[ia-iec-donors] fetch_complete fetched=${contributionsFetched} candidates_matched=${candidateMatchedNames.size}`,
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
        iaCommitteeNames: matchedNames,
      },
    });
  }

  console.log(
    `[ia-iec-donors] candidates_matched=${candidateMatchedNames.size} rows_to_upsert=${rows.length}`,
  );

  // Step 5: Upsert (or dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[ia-iec-donors] dry-run — skipping upsert of ${rows.length} rows`,
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

  const counts: IaIecIngestCounts = {
    contributionsFetched,
    candidatesMatched: candidateMatchedNames.size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[ia-iec-donors] complete",
      `contributions_fetched=${contributionsFetched}`,
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
  ingestIaIecDonors().catch((error: unknown) => {
    const msg =
      error instanceof Error
        ? error.message.replace(/\s+/gu, " ")
        : "unknown";
    console.error("[ia-iec-donors] failed:", msg);
    process.exitCode = 1;
  });
}

/**
 * scripts/ingest/federal-donors.ts
 *
 * Phase E — Federal donor ingest from OpenFEC API.
 *
 * For each candidate in the `candidates` table whose jurisdiction is
 * "federal-house" or "federal-senate", fetches FEC campaign finance totals
 * and itemized employer breakdowns, maps them to the canonical donor-bucket
 * vocabulary, and upserts the results into `donor_aggregates`.
 *
 * Source: https://api.open.fec.gov/developers/
 * - No key required for public tier (1 k req/hr); higher with FEC_API_KEY.
 * - Endpoints used:
 *   • GET /candidate/{id}/totals/ — aggregated funding buckets
 *   • GET /candidate/{id}/committees/ — find principal campaign committee
 *   • GET /committee/{id}/schedules/schedule_a/by_employer/ — employer breakdown
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-donors.ts
 *   DATABASE_URL=<neon> FEC_API_KEY=<key> npx tsx scripts/ingest/federal-donors.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-donors.ts --limit 50
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

const FEC_BASE_URL = "https://api.open.fec.gov/v1";
const DEFAULT_LIMIT = 500;
const CHUNK_SIZE = 25;
const INTER_CHUNK_DELAY_MS = 1000;
const FEC_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

export type FederalDonorConfig = {
  fecApiKey?: string;
  electionCycles: string[];
  limit: number;
  fecBaseUrl: string;
};

export type DonorAggregateRow = {
  candidateId: string;
  electionCycle: string;
  bucketLabel: string;
  amountTotal: string; // numeric as string for Drizzle
  source: string;
  sourceUrl: string;
  rawMetadata: Record<string, unknown>;
};

export type FederalDonorCounts = {
  candidatesQueried: number;
  candidatesProcessed: number;
  candidatesSkipped: number;
  rowsUpserted: number;
  apiErrors: number;
};

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalDonorConfig {
  const currentYear = new Date().getFullYear();
  // Election cycles are even years
  const currentCycle = currentYear % 2 === 0 ? currentYear : currentYear + 1;
  const priorCycle = currentCycle - 2;

  return {
    fecApiKey: env.FEC_API_KEY || undefined,
    electionCycles: [String(currentCycle), String(priorCycle)],
    limit:
      parseLimitFlag(argv) ??
      parsePositiveInteger(env.DONOR_LIMIT, DEFAULT_LIMIT),
    fecBaseUrl: trimTrailingSlash(env.FEC_BASE_URL ?? FEC_BASE_URL),
  };
}

// ---------------------------------------------------------------------------
// FEC API fetch helpers
// ---------------------------------------------------------------------------

async function fetchFecJson(
  url: string,
  fetcher: Fetcher,
  apiKey?: string,
): Promise<unknown> {
  const parsed = new URL(url);
  if (apiKey) parsed.searchParams.set("api_key", apiKey);

  const response = await fetcher(parsed.href, {
    headers: { "user-agent": "voter-choice-federal-donor-ingest" },
  });
  if (!response.ok) {
    throw new Error(`FEC HTTP ${response.status} for ${parsed.pathname}`);
  }
  return response.json();
}

/**
 * Fetch all pages of a FEC paginated endpoint. Returns the merged `results`
 * array from all pages.
 */
async function fetchFecAllPages(
  url: string,
  fetcher: Fetcher,
  config: FederalDonorConfig,
  extraParams?: Record<string, string>,
): Promise<UnknownRecord[]> {
  const results: UnknownRecord[] = [];
  let page = 1;

  while (true) {
    const parsed = new URL(url);
    parsed.searchParams.set("per_page", String(FEC_PAGE_SIZE));
    parsed.searchParams.set("page", String(page));
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        parsed.searchParams.set(k, v);
      }
    }

    const json = await fetchFecJson(parsed.href, fetcher, config.fecApiKey);
    const record = asRecord(json);
    const pageResults = getArray(record?.results)
      .map((v) => asRecord(v))
      .filter((v): v is UnknownRecord => Boolean(v));

    results.push(...pageResults);

    const pagination = asRecord(record?.pagination);
    const pages = getNumber(pagination, "pages");
    if (!pages || page >= pages || pageResults.length === 0) break;
    page += 1;
  }

  return results;
}

// ---------------------------------------------------------------------------
// FEC data extraction helpers
// ---------------------------------------------------------------------------

/**
 * Pull the FEC candidate_id from our candidates row.
 * Accepts both camelCase (Drizzle ORM default) and snake_case (raw DB rows).
 * It may be stored as source_id / sourceId or inside raw_metadata.fec.candidate_id.
 */
export function extractFecCandidateId(candidate: UnknownRecord): string | null {
  // Prefer sourceId / source_id which is typically set to the FEC candidate_id
  // for federal candidates ingested via federal-votes.ts.
  // FEC IDs follow the pattern: letter + 8 digits (e.g. H1234567, S0001234).
  const sourceId =
    getString(candidate, "sourceId") ?? getString(candidate, "source_id");
  if (sourceId && /^[A-Z]\d{7,8}$/u.test(sourceId)) return sourceId;

  // Fall back to raw_metadata / rawMetadata → fec.candidate_id
  const raw =
    asRecord(candidate.rawMetadata) ?? asRecord(candidate.raw_metadata);
  const fec = asRecord(raw?.fec);
  const fromMeta = getString(fec, "candidate_id");
  if (fromMeta) return fromMeta;

  // GovTrack metadata may carry bioguide; FEC IDs start with H/S + digits.
  // We cannot reliably derive an FEC ID from a bioguide ID without an API
  // lookup. Return null and let the caller skip gracefully.
  return null;
}

/**
 * Fetch aggregated totals for a candidate from FEC.
 * Returns bucket → amount mappings derived from the totals endpoint.
 */
export async function fetchFecTotals(
  fecCandidateId: string,
  electionCycle: string,
  config: FederalDonorConfig,
  fetcher: Fetcher,
): Promise<Map<DonorBucketLabel, number>> {
  const url = `${config.fecBaseUrl}/candidate/${encodeURIComponent(fecCandidateId)}/totals/`;
  const parsed = new URL(url);
  parsed.searchParams.set("cycle", electionCycle);
  parsed.searchParams.set("per_page", "20");

  const json = await fetchFecJson(parsed.href, fetcher, config.fecApiKey);
  const record = asRecord(json);
  const results = getArray(record?.results)
    .map((v) => asRecord(v))
    .filter((v): v is UnknownRecord => Boolean(v));

  const buckets = new Map<DonorBucketLabel, number>();

  for (const row of results) {
    // Individual contributions (unitemized < $200 and itemized >= $200)
    const smallIndividual =
      getNumber(row, "individual_unitemized_contributions") ?? 0;
    const largeIndividual =
      getNumber(row, "individual_itemized_contributions") ?? 0;
    const pacContributions =
      getNumber(row, "other_political_committee_contributions") ?? 0;
    const partyContributions =
      getNumber(row, "political_party_committee_contributions") ?? 0;
    const candidateContributions =
      getNumber(row, "candidate_contribution") ?? 0;

    accumulate(
      buckets,
      "Small individual donors (under $200)",
      smallIndividual,
    );
    accumulate(buckets, "Large individual donors ($200+)", largeIndividual);
    accumulate(buckets, "Party committees", partyContributions);
    if (candidateContributions > 0) {
      accumulate(buckets, "Self-funded", candidateContributions);
    }

    // PAC contributions are split into issue-aligned and other in Phase F+.
    // For now, put unclassified PAC contributions into "Other".
    if (pacContributions > 0) {
      accumulate(buckets, "Other", pacContributions);
    }
  }

  return buckets;
}

/**
 * Find the principal campaign committee ID for an FEC candidate.
 */
async function fetchPrincipalCommitteeId(
  fecCandidateId: string,
  electionCycle: string,
  config: FederalDonorConfig,
  fetcher: Fetcher,
): Promise<string | null> {
  const url = `${config.fecBaseUrl}/candidate/${encodeURIComponent(fecCandidateId)}/committees/`;
  const parsed = new URL(url);
  parsed.searchParams.set("cycle", electionCycle);
  parsed.searchParams.set("designation", "P"); // P = principal campaign committee
  parsed.searchParams.set("per_page", "5");

  const json = await fetchFecJson(parsed.href, fetcher, config.fecApiKey);
  const record = asRecord(json);
  const results = getArray(record?.results)
    .map((v) => asRecord(v))
    .filter((v): v is UnknownRecord => Boolean(v));

  return getString(results[0], "committee_id");
}

/**
 * Fetch itemized employer contribution breakdown for a committee.
 * Returns a map of bucket → total dollars derived from employer names.
 */
export async function fetchEmployerBuckets(
  committeeId: string,
  electionCycle: string,
  config: FederalDonorConfig,
  fetcher: Fetcher,
): Promise<Map<DonorBucketLabel, number>> {
  const url = `${config.fecBaseUrl}/committee/${encodeURIComponent(committeeId)}/schedules/schedule_a/by_employer/`;
  const rows = await fetchFecAllPages(url, fetcher, config, {
    cycle: electionCycle,
    sort: "-total",
  });

  const buckets = new Map<DonorBucketLabel, number>();

  for (const row of rows) {
    const employer = getString(row, "employer") ?? "";
    const total = getNumber(row, "total") ?? 0;
    if (total <= 0) continue;

    const bucket = mapEmployerToBucket(employer);
    if (bucket) {
      accumulate(buckets, bucket, total);
    } else {
      // Unmatched employer falls through to Other
      accumulate(buckets, "Other", total);
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Per-candidate processing
// ---------------------------------------------------------------------------

/**
 * Process one candidate: fetch FEC totals + employer breakdown, merge into
 * a unified bucket map, and return the rows to upsert.
 */
export async function buildDonorRows(
  candidate: UnknownRecord,
  config: FederalDonorConfig,
  fetcher: Fetcher,
): Promise<DonorAggregateRow[]> {
  const candidateId = getString(candidate, "id");
  if (!candidateId) return [];

  const fecId = extractFecCandidateId(candidate);
  if (!fecId) {
    console.warn(
      `[federal-donors] no_fec_id candidate=${candidateId} — skipping`,
    );
    return [];
  }

  const rows: DonorAggregateRow[] = [];

  for (const cycle of config.electionCycles) {
    try {
      const buckets = new Map<DonorBucketLabel, number>();

      // 1. Aggregated FEC totals
      const totalBuckets = await fetchFecTotals(fecId, cycle, config, fetcher);
      for (const [label, amount] of totalBuckets) {
        accumulate(buckets, label, amount);
      }

      // 2. Employer-level itemized breakdown (requires committee ID)
      try {
        const committeeId = await fetchPrincipalCommitteeId(
          fecId,
          cycle,
          config,
          fetcher,
        );
        if (committeeId) {
          const employerBuckets = await fetchEmployerBuckets(
            committeeId,
            cycle,
            config,
            fetcher,
          );
          // Merge employer buckets (additive with totals)
          for (const [label, amount] of employerBuckets) {
            accumulate(buckets, label, amount);
          }
        }
      } catch (error) {
        console.warn(
          `[federal-donors] employer_fetch_failed candidate=${candidateId} cycle=${cycle} error=${safeErrorMessage(error)}`,
        );
      }

      const sourceUrl = `${config.fecBaseUrl}/candidate/${fecId}/totals/?cycle=${cycle}`;

      for (const [label, amount] of buckets) {
        if (amount <= 0) continue;
        rows.push({
          candidateId,
          electionCycle: cycle,
          bucketLabel: label,
          amountTotal: amount.toFixed(2),
          source: "fec_api",
          sourceUrl,
          rawMetadata: { fecCandidateId: fecId, cycle },
        });
      }
    } catch (error) {
      console.warn(
        `[federal-donors] cycle_failed candidate=${candidateId} cycle=${cycle} error=${safeErrorMessage(error)}`,
      );
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

export async function upsertDonorRows(
  db: DbClient,
  rows: DonorAggregateRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const now = new Date();
  const dbRows = rows.map((row) => ({
    candidateId: row.candidateId,
    electionCycle: row.electionCycle,
    bucketLabel: row.bucketLabel,
    amountTotal: row.amountTotal,
    source: row.source,
    sourceUrl: row.sourceUrl,
    rawMetadata: row.rawMetadata,
    insertedAt: now,
  }));

  await db
    .insert(donorAggregates)
    .values(dbRows)
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

  return dbRows.length;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function ingestFederalDonors({
  db = requireDb(),
  fetcher = fetch,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FederalDonorCounts> {
  const config = resolveConfig(env, argv);

  console.log(
    `[federal-donors] starting cycles=${config.electionCycles.join(",")} limit=${config.limit}`,
  );

  const counts: FederalDonorCounts = {
    candidatesQueried: 0,
    candidatesProcessed: 0,
    candidatesSkipped: 0,
    rowsUpserted: 0,
    apiErrors: 0,
  };

  // Fetch federal candidates from DB
  const federalCandidates = await db
    .select()
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} IN ('federal-house', 'federal-senate')`,
    )
    .limit(config.limit);

  counts.candidatesQueried = federalCandidates.length;
  console.log(
    `[federal-donors] found ${federalCandidates.length} federal candidates`,
  );

  // Process in chunks of 25 with 1-second delay between chunks
  const chunks = chunkArray(federalCandidates as UnknownRecord[], CHUNK_SIZE);

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    console.log(
      `[federal-donors] chunk=${chunkIdx + 1}/${chunks.length} size=${chunk.length}`,
    );

    for (const candidate of chunk) {
      try {
        const rows = await buildDonorRows(candidate, config, fetcher);
        if (rows.length === 0) {
          counts.candidatesSkipped += 1;
          continue;
        }
        const upserted = await upsertDonorRows(db, rows);
        counts.rowsUpserted += upserted;
        counts.candidatesProcessed += 1;
      } catch (error) {
        console.warn(
          `[federal-donors] candidate_error candidate=${getString(candidate, "id")} error=${safeErrorMessage(error)}`,
        );
        counts.apiErrors += 1;
        counts.candidatesSkipped += 1;
      }
    }

    if (chunkIdx < chunks.length - 1) {
      await sleep(INTER_CHUNK_DELAY_MS);
    }
  }

  console.log(
    [
      "[federal-donors] complete",
      `candidates_queried=${counts.candidatesQueried}`,
      `candidates_processed=${counts.candidatesProcessed}`,
      `candidates_skipped=${counts.candidatesSkipped}`,
      `rows_upserted=${counts.rowsUpserted}`,
      `api_errors=${counts.apiErrors}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function accumulate(
  map: Map<DonorBucketLabel, number>,
  key: DonorBucketLabel,
  amount: number,
): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getString(
  record: UnknownRecord | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function getNumber(
  record: UnknownRecord | null | undefined,
  key: string,
): number | null {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/gu, " ");
  return "unknown";
}

function parseLimitFlag(argv: string[]): number | null {
  const idx = argv.indexOf("--limit");
  if (idx === -1) return null;
  const value = argv[idx + 1];
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  ingestFederalDonors().catch((error) => {
    console.error("[federal-donors] failed:", safeErrorMessage(error));
    process.exitCode = 1;
  });
}

// Re-export for tests
export { bucketIndividualByAmount };

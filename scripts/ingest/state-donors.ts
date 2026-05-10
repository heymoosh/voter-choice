/**
 * scripts/ingest/state-donors.ts
 *
 * Phase E — State donor ingest from FollowTheMoney.org API.
 *
 * For each candidate in the `candidates` table whose jurisdiction matches
 * state-XX-house or state-XX-senate, fetches contribution summaries by
 * industry/sector and upserts the results into `donor_aggregates`.
 *
 * Source: https://www.followthemoney.org/research/institutes/api
 * - Free for public use; attribution required.
 * - FOLLOWTHEMONEY_API_KEY is optional for the free tier (higher rate limits
 *   are available with a key). The free tier does not require a key.
 * - Endpoints used:
 *   • GET /api/?mode=summary&amp;t=industry — contribution summary by industry
 *
 * Attribution: Data from FollowTheMoney.org, National Institute on Money in
 * Politics. https://www.followthemoney.org/
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/state-donors.ts
 *   DATABASE_URL=<neon> FOLLOWTHEMONEY_API_KEY=<key> npx tsx scripts/ingest/state-donors.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/state-donors.ts --limit 50
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
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FTM_BASE_URL = "https://api.followthemoney.org";
const DEFAULT_LIMIT = 500;
const CHUNK_SIZE = 25;
const INTER_CHUNK_DELAY_MS = 1000;

// FollowTheMoney NIMSP industry codes mapped to our bucket vocabulary.
// FTM uses a hierarchical industry classification. These map the top-level
// sector codes to our donor-bucket labels.
// Reference: https://www.followthemoney.org/research/institutes/api#industry
const FTM_INDUSTRY_BUCKET_MAP: Record<string, DonorBucketLabel> = {
  // Real estate
  "Real Estate": "Real estate & development",
  "Construction": "Real estate & development",
  // Energy
  "Oil & Gas": "Oil, gas & energy",
  "Energy & Natural Resources": "Oil, gas & energy",
  "Mining": "Oil, gas & energy",
  "Utilities": "Telecom & utilities",
  "Telecommunications": "Telecom & utilities",
  // Healthcare
  "Health": "Healthcare industry",
  "Health Professionals": "Healthcare industry",
  "Hospitals & Nursing Homes": "Healthcare industry",
  "Pharmaceuticals/Health Products": "Pharmaceutical & medical device",
  // Finance
  "Finance, Insurance & Real Estate": "Finance, banking & insurance",
  "Finance": "Finance, banking & insurance",
  "Insurance": "Finance, banking & insurance",
  "Securities & Investment": "Finance, banking & insurance",
  "Commercial Banks": "Finance, banking & insurance",
  // Technology
  "Electronics, Technology & Communications": "Technology",
  "Computer Equipment & Services": "Technology",
  "Internet": "Technology",
  // Legal
  "Lawyers & Lobbyists": "Legal industry",
  "Lawyers/Law Firms": "Legal industry",
  // Agriculture
  "Agriculture": "Agriculture",
  "Livestock": "Agriculture",
  "Crop Production & Basic Processing": "Agriculture",
  // Retail & Hospitality
  "Food & Beverage": "Retail & hospitality",
  "Retail Sales": "Retail & hospitality",
  "Lodging & Tourism": "Retail & hospitality",
  "Restaurants & Drinking Establishments": "Retail & hospitality",
  // Labor unions — FTM groups labor broadly
  "Labor": "Trade unions (non-public-safety)",
  "Public Sector Unions": "Education employees",
  "Building Trade Unions": "Trade unions (non-public-safety)",
  "Industrial Unions": "Trade unions (non-public-safety)",
  "Transportation Unions": "Trade unions (non-public-safety)",
  "Misc Unions": "Trade unions (non-public-safety)",
  // Party & political
  "Democratic/Liberal": "Party committees",
  "Republican/Conservative": "Party committees",
  "Political Party Committees": "Party committees",
  "Party Committees & Party-Connected Organizations": "Party committees",
  // Individual contributions are handled separately via bucketIndividualByAmount
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

export type StateDonorConfig = {
  ftmApiKey?: string;
  electionCycles: string[];
  limit: number;
  ftmBaseUrl: string;
};

export type DonorAggregateRow = {
  candidateId: string;
  electionCycle: string;
  bucketLabel: string;
  amountTotal: string;
  source: string;
  sourceUrl: string;
  rawMetadata: Record<string, unknown>;
};

export type StateDonorCounts = {
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
): StateDonorConfig {
  const currentYear = new Date().getFullYear();
  const currentCycle = currentYear % 2 === 0 ? currentYear : currentYear + 1;
  const priorCycle = currentCycle - 2;

  return {
    ftmApiKey: env.FOLLOWTHEMONEY_API_KEY || undefined,
    electionCycles: [String(currentCycle), String(priorCycle)],
    limit: parseLimitFlag(argv) ?? parsePositiveInteger(env.DONOR_LIMIT, DEFAULT_LIMIT),
    ftmBaseUrl: trimTrailingSlash(env.FTM_BASE_URL ?? FTM_BASE_URL),
  };
}

// ---------------------------------------------------------------------------
// FTM API helpers
// ---------------------------------------------------------------------------

async function fetchFtmJson(
  url: string,
  fetcher: Fetcher,
  apiKey?: string,
): Promise<unknown> {
  const parsed = new URL(url);
  parsed.searchParams.set("output", "json");
  if (apiKey) parsed.searchParams.set("APIKey", apiKey);

  const response = await fetcher(parsed.href, {
    headers: {
      "user-agent": "voter-choice-state-donor-ingest",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`FTM HTTP ${response.status} for ${parsed.pathname}`);
  }
  return response.json();
}

/**
 * Extract the FTM candidate ID from our candidates row.
 * FTM IDs may be stored in raw_metadata.followthemoney.candidate_id.
 */
export function extractFtmCandidateId(
  candidate: UnknownRecord,
): string | null {
  const raw = asRecord(candidate.rawMetadata ?? candidate.raw_metadata);
  const ftm = asRecord(raw?.followthemoney);
  const fromMeta = getString(ftm, "candidate_id");
  if (fromMeta) return fromMeta;

  // Some pipelines store it at raw_metadata.ftm_id
  const ftmId = getString(raw, "ftm_id");
  if (ftmId) return ftmId;

  return null;
}

/**
 * Extract a two-letter state code from a jurisdiction string like "state-TX-house".
 */
export function extractStateFromJurisdiction(jurisdiction: string): string | null {
  const match = /^state-([A-Z]{2})-/u.exec(jurisdiction);
  return match ? match[1] : null;
}

/**
 * Fetch industry contribution summary for a candidate from FTM.
 * Returns a map of bucket label → total dollars.
 *
 * FTM API doc: GET /api/?mode=summary&gro=d-industry&t=industry&y=<year>
 * When we have a FTM candidate ID, we add &cid=<id>.
 * When we don't, we can look up by name + state (less reliable).
 */
export async function fetchFtmIndustryBuckets(
  candidateName: string,
  state: string,
  electionCycle: string,
  config: StateDonorConfig,
  fetcher: Fetcher,
  ftmCandidateId?: string,
): Promise<Map<DonorBucketLabel, number>> {
  const url = new URL(`${config.ftmBaseUrl}/api/`);
  url.searchParams.set("mode", "summary");
  url.searchParams.set("gro", "d-industry");
  url.searchParams.set("t", "industry");
  url.searchParams.set("y", electionCycle);
  url.searchParams.set("s", state);

  if (ftmCandidateId) {
    url.searchParams.set("cid", ftmCandidateId);
  } else {
    // Name-based lookup — less reliable but useful for candidates without stored FTM ID
    url.searchParams.set("can_nam", candidateName);
  }

  const json = await fetchFtmJson(url.href, fetcher, config.ftmApiKey);
  return parseFtmIndustryResponse(json);
}

/**
 * Parse FTM industry summary response into bucket labels → dollar totals.
 */
export function parseFtmIndustryResponse(
  json: unknown,
): Map<DonorBucketLabel, number> {
  const buckets = new Map<DonorBucketLabel, number>();
  const record = asRecord(json);

  // FTM returns { records: [...] } or an array directly
  const records = Array.isArray(json)
    ? (json as unknown[])
    : getArray(record?.records ?? record?.data ?? record?.result);

  for (const item of records) {
    const entry = asRecord(item);
    if (!entry) continue;

    // FTM industry summary fields:
    // industry_name or Industry or sector
    const industryName =
      getString(entry, "industry_name") ??
      getString(entry, "Industry") ??
      getString(entry, "sector") ??
      getString(entry, "Sector") ??
      "";

    // Total amount field names vary by endpoint version
    const total =
      getNumber(entry, "total") ??
      getNumber(entry, "Total") ??
      getNumber(entry, "amount") ??
      getNumber(entry, "Amount") ??
      0;

    if (total <= 0) continue;

    // First try the FTM industry code map
    const mappedBucket = FTM_INDUSTRY_BUCKET_MAP[industryName];
    if (mappedBucket) {
      accumulate(buckets, mappedBucket, total);
      continue;
    }

    // Fall back to keyword matching on the industry name
    const keywordBucket = mapEmployerToBucket(industryName);
    if (keywordBucket) {
      accumulate(buckets, keywordBucket, total);
    } else {
      // Unmatched industry falls through to Other
      accumulate(buckets, "Other", total);
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Per-candidate processing
// ---------------------------------------------------------------------------

export async function buildDonorRows(
  candidate: UnknownRecord,
  config: StateDonorConfig,
  fetcher: Fetcher,
): Promise<DonorAggregateRow[]> {
  const candidateId = getString(candidate, "id");
  const candidateName = getString(candidate, "fullName") ?? getString(candidate, "full_name") ?? "";
  const jurisdiction = getString(candidate, "jurisdiction") ?? "";
  if (!candidateId || !candidateName) return [];

  const state = extractStateFromJurisdiction(jurisdiction);
  if (!state) return [];

  const ftmCandidateId = extractFtmCandidateId(candidate) ?? undefined;
  const rows: DonorAggregateRow[] = [];

  for (const cycle of config.electionCycles) {
    try {
      const buckets = await fetchFtmIndustryBuckets(
        candidateName,
        state,
        cycle,
        config,
        fetcher,
        ftmCandidateId,
      );

      if (buckets.size === 0) continue;

      const sourceUrl = `${config.ftmBaseUrl}/api/?mode=summary&gro=d-industry&t=industry&y=${cycle}&s=${state}`;

      for (const [label, amount] of buckets) {
        if (amount <= 0) continue;
        rows.push({
          candidateId,
          electionCycle: cycle,
          bucketLabel: label,
          amountTotal: amount.toFixed(2),
          source: "followthemoney_api",
          sourceUrl,
          rawMetadata: {
            ftmCandidateId: ftmCandidateId ?? null,
            state,
            cycle,
          },
        });
      }
    } catch (error) {
      console.warn(
        `[state-donors] cycle_failed candidate=${candidateId} cycle=${cycle} error=${safeErrorMessage(error)}`,
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

export async function ingestStateDonors({
  db = requireDb(),
  fetcher = fetch,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<StateDonorCounts> {
  const config = resolveConfig(env, argv);

  console.log(
    `[state-donors] starting cycles=${config.electionCycles.join(",")} limit=${config.limit}`,
  );

  const counts: StateDonorCounts = {
    candidatesQueried: 0,
    candidatesProcessed: 0,
    candidatesSkipped: 0,
    rowsUpserted: 0,
    apiErrors: 0,
  };

  // Fetch state candidates from DB
  const stateCandidates = await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-%'`)
    .limit(config.limit);

  counts.candidatesQueried = stateCandidates.length;
  console.log(`[state-donors] found ${stateCandidates.length} state candidates`);

  const chunks = chunkArray(stateCandidates as UnknownRecord[], CHUNK_SIZE);

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    console.log(
      `[state-donors] chunk=${chunkIdx + 1}/${chunks.length} size=${chunk.length}`,
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
          `[state-donors] candidate_error candidate=${getString(candidate, "id")} error=${safeErrorMessage(error)}`,
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
      "[state-donors] complete",
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
  ingestStateDonors().catch((error) => {
    console.error("[state-donors] failed:", safeErrorMessage(error));
    process.exitCode = 1;
  });
}

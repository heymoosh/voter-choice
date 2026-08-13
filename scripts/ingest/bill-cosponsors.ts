/**
 * scripts/ingest/bill-cosponsors.ts
 *
 * Who put their name on the federal bills we already hold — `bill_cosponsors`
 * (one row per bill × member, role='sponsor'|'cosponsor', with is_original +
 * date_cosponsored). Feeds the collaborator network
 * (src/lib/server/collaborators.ts), which reads this as a bill-participation
 * graph — capturing sponsor↔cosponsor edges, not just cosponsor↔cosponsor.
 *
 * Source: Congress.gov API v3 — two endpoints per bill:
 *   GET /bill/{congress}/{type}/{number}             → the sponsor
 *   GET /bill/{congress}/{type}/{number}/cosponsors  → the cosponsors
 * Same api.data.gov key (CONGRESS_GOV_API_KEY) + base (CONGRESS_GOV_BASE_URL)
 * as the CRS-summary enrichment. Rate limit ~5,000 req/hr on the free tier.
 * The sponsor fetch fails soft (null) so a flaky detail call never drops the
 * bill's cosponsor edges.
 *
 * The backfill is over `bills` rows we already hold. `bills.id` packs identity
 * into a string ("govtrack-hr1234-118") with `source` distinguishing federal
 * (govtrack) from state (openstates) rows — there are no structured
 * congress/type/number columns — so the script parses ids and filters to the
 * federal `govtrack` source before ever calling the API. State bills have no
 * congress.gov counterpart and are skipped.
 *
 * Join basis: Congress.gov returns each cosponsor keyed by bioguideId; we map
 * that to the federal-<BIOGUIDE> candidate-id convention (same as
 * committee-assignments.ts). Cosponsors with no matching `candidates` row
 * (former members, members we don't track) are skipped and counted, never
 * thrown — the FK would reject them anyway.
 *
 * Usage:
 *   … npx tsx --env-file=.env.local scripts/ingest/bill-cosponsors.ts
 *   … scripts/ingest/bill-cosponsors.ts --congress 119
 *   … scripts/ingest/bill-cosponsors.ts --limit 50 --dry-run
 *
 * Idempotency: upsert on (bill_id, candidate_id). Re-runs refresh is_original /
 * date_cosponsored in place.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql, inArray, eq } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, bills, billCosponsors } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api.congress.gov/v3";
const PAGE_LIMIT = 250; // Congress.gov max page size for cosponsors
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

/** Federal bill identity parsed out of a packed `bills.id` string. */
export interface FederalBillIdentity {
  billId: string;
  congress: number;
  /** lowercase, e.g. "hr", "s", "hjres". */
  type: string;
  number: string;
}

/** One cosponsor as flattened from the Congress.gov response. */
export interface FlatCosponsor {
  candidateId: string;
  isOriginal: boolean;
  dateCosponsored: string | null;
}

export interface CosponsorRow {
  billId: string;
  candidateId: string;
  role: "sponsor" | "cosponsor";
  isOriginal: boolean;
  dateCosponsored: string | null;
  source: string;
  sourceUrl: string;
}

export interface BillCosponsorsCounts {
  federalBills: number;
  billsProcessed: number;
  cosponsorsFetched: number;
  sponsorsResolved: number;
  rowsUpserted: number;
  skippedNoCandidate: number;
  billsFailed: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit tested)
// ---------------------------------------------------------------------------

function asRecord(v: unknown): UnknownRecord | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as UnknownRecord)
    : null;
}

function getString(rec: UnknownRecord | null, key: string): string | null {
  const v = rec?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function sanitizeIdPart(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, "");
}

/** Mirror of committee-assignments.ts's candidateIdFromBioguide. */
export function candidateIdFromBioguide(bioguide: string): string {
  return `federal-${sanitizeIdPart(bioguide).toUpperCase()}`;
}

/**
 * Parse a federal `bills.id` ("govtrack-hr1234-118") into its congress/type/
 * number. Returns null for anything that isn't a govtrack federal id (state
 * bills, malformed rows) — the caller filters those out before hitting the API.
 * Mirrors parsePlannedBillId in federal-votes.ts so the two never diverge.
 */
export function parseFederalBillId(id: string): FederalBillIdentity | null {
  const match = /^govtrack-([a-z]+)(\d+)-(\d+)$/u.exec(id);
  if (!match) return null;
  const [, type, number, congress] = match;
  return { billId: id, congress: Number(congress), type, number };
}

/**
 * Human-facing congress.gov cosponsors page for citation (source_url). Distinct
 * from the API URL used to fetch. Falls back to the API-style path for bill
 * types outside the common set rather than guessing wrong.
 */
const BILL_TYPE_PATH: Record<string, string> = {
  hr: "house-bill",
  s: "senate-bill",
  hres: "house-resolution",
  sres: "senate-resolution",
  hjres: "house-joint-resolution",
  sjres: "senate-joint-resolution",
  hconres: "house-concurrent-resolution",
  sconres: "senate-concurrent-resolution",
};

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function congressGovBillUrl(bill: FederalBillIdentity): string {
  const path = BILL_TYPE_PATH[bill.type];
  if (!path) {
    return `https://www.congress.gov/bill/${bill.congress}/${bill.type}/${bill.number}/cosponsors`;
  }
  return `https://www.congress.gov/bill/${ordinal(bill.congress)}-congress/${path}/${bill.number}/cosponsors`;
}

/**
 * Flatten a Congress.gov `cosponsors` array into FlatCosponsor rows. Entries
 * with no bioguideId (rare) are dropped — nothing to join them to. Dedupes by
 * candidate id within a bill (a member can appear twice across cosponsorship
 * withdrawal/re-add history), keeping the earliest sponsorshipDate and OR-ing
 * isOriginalCosponsor.
 */
export function flattenCosponsors(cosponsors: unknown): FlatCosponsor[] {
  if (!Array.isArray(cosponsors)) return [];
  const byCandidate = new Map<string, FlatCosponsor>();
  for (const raw of cosponsors) {
    const rec = asRecord(raw);
    const bioguide = getString(rec, "bioguideId");
    if (!bioguide) continue;
    const candidateId = candidateIdFromBioguide(bioguide);
    const isOriginal = rec?.isOriginalCosponsor === true;
    const dateCosponsored = getString(rec, "sponsorshipDate");
    const existing = byCandidate.get(candidateId);
    if (!existing) {
      byCandidate.set(candidateId, {
        candidateId,
        isOriginal,
        dateCosponsored,
      });
      continue;
    }
    existing.isOriginal = existing.isOriginal || isOriginal;
    if (
      dateCosponsored &&
      (!existing.dateCosponsored || dateCosponsored < existing.dateCosponsored)
    ) {
      existing.dateCosponsored = dateCosponsored;
    }
  }
  return [...byCandidate.values()];
}

/**
 * Extract the sponsor's bioguide from a Congress.gov bill-detail response
 * ({ bill: { sponsors: [{ bioguideId }] } }). Returns null when absent — some
 * older bills carry no structured sponsor. The first sponsor is the primary
 * sponsor (federal bills have exactly one).
 */
export function extractSponsorBioguide(json: unknown): string | null {
  const bill = asRecord(asRecord(json)?.bill);
  const sponsors = bill?.sponsors;
  if (!Array.isArray(sponsors) || sponsors.length === 0) return null;
  return getString(asRecord(sponsors[0]), "bioguideId");
}

export function buildCosponsorRows(
  billId: string,
  flat: FlatCosponsor[],
  knownCandidateIds: Set<string>,
  sourceUrl: string,
  sponsorCandidateId: string | null = null,
): CosponsorRow[] {
  // The sponsor is never also a cosponsor of the same bill; guard anyway so a
  // stray duplicate can't violate the (bill_id, candidate_id) unique key.
  return flat
    .filter(
      (c) =>
        knownCandidateIds.has(c.candidateId) &&
        c.candidateId !== sponsorCandidateId,
    )
    .map((c) => ({
      billId,
      candidateId: c.candidateId,
      role: "cosponsor" as const,
      isOriginal: c.isOriginal,
      dateCosponsored: c.dateCosponsored,
      source: "congress-gov",
      sourceUrl,
    }));
}

/** The sponsor's participation row (role='sponsor'). */
export function buildSponsorRow(
  billId: string,
  sponsorCandidateId: string,
  sourceUrl: string,
): CosponsorRow {
  return {
    billId,
    candidateId: sponsorCandidateId,
    role: "sponsor",
    isOriginal: false,
    dateCosponsored: null,
    source: "congress-gov",
    sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Fetch (backoff mirrors crs-summaries.ts)
// ---------------------------------------------------------------------------

/** Human-facing congress.gov page for the bill (sponsor row source_url). */
function congressGovBillPage(bill: FederalBillIdentity): string {
  return congressGovBillUrl(bill).replace(/\/cosponsors$/, "");
}

function buildBillDetailUrl(
  bill: FederalBillIdentity,
  baseUrl: string,
  apiKey: string | undefined,
): string {
  const url = new URL(
    `${baseUrl}/bill/${bill.congress}/${bill.type}/${bill.number}`,
  );
  url.searchParams.set("format", "json");
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url.href;
}

function buildCosponsorsUrl(
  bill: FederalBillIdentity,
  baseUrl: string,
  apiKey: string | undefined,
  offset: number,
): string {
  const url = new URL(
    `${baseUrl}/bill/${bill.congress}/${bill.type}/${bill.number}/cosponsors`,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url.href;
}

async function fetchJsonWithRetry(
  url: string,
  fetcher: Fetcher,
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetcher(url, {
        headers: { "user-agent": "voter-choice-bill-cosponsors-ingest" },
      });
      if (!res.ok) {
        if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) {
          const waitMs = 2000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    } catch (e) {
      lastErr = e;
      if (
        attempt < MAX_RETRIES &&
        e instanceof Error &&
        /fetch failed|ECONNRESET|ETIMEDOUT/i.test(e.message)
      ) {
        const waitMs = 2000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Fetch all cosponsors for one bill, following pagination. Throws on a
 * non-retryable failure so the caller can count the bill as failed and move on
 * (a single dead bill must not abort the whole backfill).
 */
export async function fetchAllCosponsors(
  bill: FederalBillIdentity,
  baseUrl: string,
  apiKey: string | undefined,
  fetcher: Fetcher,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let offset = 0;
  // Hard page ceiling: no federal bill has >250×40 cosponsors; guards a
  // malformed pagination loop.
  for (let page = 0; page < 40; page++) {
    const url = buildCosponsorsUrl(bill, baseUrl, apiKey, offset);
    const json = await fetchJsonWithRetry(url, fetcher);
    const envelope = asRecord(json);
    const cosponsors = Array.isArray(envelope?.cosponsors)
      ? (envelope!.cosponsors as unknown[])
      : [];
    out.push(...cosponsors);
    if (cosponsors.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }
  return out;
}

/**
 * Fetch the sponsor bioguide for one bill from the bill-detail endpoint.
 * Returns null when the bill has no structured sponsor. Fails soft: a network
 * / API error returns null (the bill's cosponsors are still worth keeping), so
 * a flaky sponsor fetch never drops the rest of the bill.
 */
export async function fetchBillSponsor(
  bill: FederalBillIdentity,
  baseUrl: string,
  apiKey: string | undefined,
  fetcher: Fetcher,
): Promise<string | null> {
  try {
    const url = buildBillDetailUrl(bill, baseUrl, apiKey);
    const json = await fetchJsonWithRetry(url, fetcher);
    return extractSponsorBioguide(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[bill-cosponsors] sponsor_fetch_failed bill=${bill.billId} error=${msg} — cosponsors kept`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface BillCosponsorsOptions {
  congress?: number;
  limit?: number;
  dryRun?: boolean;
  baseUrl?: string;
  apiKey?: string;
}

export async function runBillCosponsorsIngest(
  db: DbClient,
  fetcher: Fetcher,
  opts: BillCosponsorsOptions = {},
): Promise<BillCosponsorsCounts> {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = opts.apiKey;

  // Federal bills only: filter on source, then parse ids to structured
  // identity (and drop anything that doesn't parse as govtrack federal).
  const billRows = await db
    .select({ id: bills.id })
    .from(bills)
    .where(eq(bills.source, "govtrack"));
  let federal = billRows
    .map((r) => parseFederalBillId(r.id))
    .filter((b): b is FederalBillIdentity => b !== null);
  if (opts.congress !== undefined) {
    federal = federal.filter((b) => b.congress === opts.congress);
  }
  const totalFederal = federal.length;
  if (opts.limit !== undefined) federal = federal.slice(0, opts.limit);

  // Known federal candidate ids, for the FK-safe cosponsor filter.
  const candRows = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      inArray(candidates.jurisdiction, ["federal-house", "federal-senate"]),
    );
  const knownCandidateIds = new Set(candRows.map((r) => r.id));

  const counts: BillCosponsorsCounts = {
    federalBills: totalFederal,
    billsProcessed: 0,
    cosponsorsFetched: 0,
    sponsorsResolved: 0,
    rowsUpserted: 0,
    skippedNoCandidate: 0,
    billsFailed: 0,
  };

  for (const bill of federal) {
    // Cosponsors are the load-bearing fetch: a failure here drops the bill.
    // The sponsor fetch runs alongside and fails soft (null), so a flaky
    // detail call never costs us the cosponsor edges.
    let cosponsors: unknown[];
    let sponsorBioguide: string | null;
    try {
      [cosponsors, sponsorBioguide] = await Promise.all([
        fetchAllCosponsors(bill, baseUrl, apiKey, fetcher),
        fetchBillSponsor(bill, baseUrl, apiKey, fetcher),
      ]);
    } catch (err) {
      counts.billsFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[bill-cosponsors] fetch_failed bill=${bill.billId} error=${msg} — skipping`,
      );
      continue;
    }
    counts.billsProcessed++;
    counts.cosponsorsFetched += cosponsors.length;

    // Sponsor row, when the sponsor resolves to a member we track.
    const sponsorCandidateId = sponsorBioguide
      ? candidateIdFromBioguide(sponsorBioguide)
      : null;
    const knownSponsorId =
      sponsorCandidateId && knownCandidateIds.has(sponsorCandidateId)
        ? sponsorCandidateId
        : null;
    if (knownSponsorId) counts.sponsorsResolved++;

    const flat = flattenCosponsors(cosponsors);
    const cosponsorRows = buildCosponsorRows(
      bill.billId,
      flat,
      knownCandidateIds,
      congressGovBillUrl(bill),
      knownSponsorId,
    );
    counts.skippedNoCandidate += flat.length - cosponsorRows.length;
    const rows = knownSponsorId
      ? [
          buildSponsorRow(
            bill.billId,
            knownSponsorId,
            congressGovBillPage(bill),
          ),
          ...cosponsorRows,
        ]
      : cosponsorRows;

    if (!opts.dryRun) {
      for (const row of rows) {
        await db
          .insert(billCosponsors)
          .values(row)
          .onConflictDoUpdate({
            target: [billCosponsors.billId, billCosponsors.candidateId],
            set: {
              role: sql`excluded.role`,
              isOriginal: sql`excluded.is_original`,
              dateCosponsored: sql`excluded.date_cosponsored`,
              source: sql`excluded.source`,
              sourceUrl: sql`excluded.source_url`,
              fetchedAt: sql`now()`,
            },
          });
      }
    }
    counts.rowsUpserted += rows.length;
  }

  return counts;
}

function parseArgs(argv: string[]): {
  congress?: number;
  limit?: number;
  dryRun: boolean;
} {
  const congIdx = argv.indexOf("--congress");
  const cong = congIdx !== -1 ? Number(argv[congIdx + 1]) : NaN;
  const limIdx = argv.indexOf("--limit");
  const lim = limIdx !== -1 ? Number(argv[limIdx + 1]) : NaN;
  return {
    congress: Number.isInteger(cong) ? cong : undefined,
    limit: Number.isInteger(lim) ? lim : undefined,
    dryRun: argv.includes("--dry-run"),
  };
}

async function main(): Promise<void> {
  // Fail fast on a missing key: api.data.gov answers 403 API_KEY_MISSING to
  // every keyless request, which otherwise shows up as a wall of per-bill
  // "HTTP 403 — skipping" lines with nothing actually ingested.
  if (!process.env.CONGRESS_GOV_API_KEY) {
    console.error(
      "[bill-cosponsors] CONGRESS_GOV_API_KEY is not set (.env.local). " +
        "Congress.gov rejects keyless requests with HTTP 403. Free key: " +
        "https://api.congress.gov/sign-up/ — if you DO have the key set and " +
        "still see uniform 403s, the key itself is invalid or disabled.",
    );
    process.exit(1);
  }
  const db = requireDb();
  const { congress, limit, dryRun } = parseArgs(process.argv.slice(2));
  const counts = await runBillCosponsorsIngest(db, fetch, {
    congress,
    limit,
    dryRun,
    baseUrl: process.env.CONGRESS_GOV_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey: process.env.CONGRESS_GOV_API_KEY || undefined,
  });
  console.log(
    `[bill-cosponsors]${dryRun ? " [dry-run]" : ""} done ` +
      `federal_bills=${counts.federalBills} processed=${counts.billsProcessed} ` +
      `cosponsors=${counts.cosponsorsFetched} sponsors=${counts.sponsorsResolved} ` +
      `rows=${counts.rowsUpserted} ` +
      `skipped_no_candidate=${counts.skippedNoCandidate} failed=${counts.billsFailed}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[bill-cosponsors] fatal:", err);
    process.exit(1);
  });
}

/**
 * scripts/ingest/stock-transactions.ts
 *
 * STOCK Act Periodic Transaction Report (PTR) ingest for sitting House/Senate
 * members — populates `member_stock_transactions` (db/migrations/0013).
 *
 * CRITICAL: This script is a SCAFFOLD — documented and runnable, but per the
 * backlog card it MUST NOT BE RUN tonight: no live fetch beyond the manual
 * liveness check noted below, no DB writes. Defaults to `dryRun: true`; a
 * real write requires BOTH DATABASE_URL and an explicit `--live` flag (see
 * "CLI entry point" below) — a higher bar than most ingest scripts here,
 * deliberately, since this one was authored without ever being executed.
 *
 * Sources:
 *   The backlog card named the original community project's S3 buckets
 *   (house-stock-watcher-data.s3-us-west-2.amazonaws.com,
 *   senate-stock-watcher-data.s3-us-west-2.amazonaws.com). A manual liveness
 *   check (HEAD + small ranged GET, 2026-07-02, no bulk download) found both
 *   buckets now return 403 AccessDenied — the buckets are no longer public.
 *   The same two community projects still publish the identical JSON
 *   straight from their GitHub repos, confirmed live via the same minimal
 *   check, so this ingest targets those instead:
 *
 *   • House — https://github.com/TattooedHead/house-stock-watcher-data
 *       GET https://raw.githubusercontent.com/TattooedHead/house-stock-watcher-data/main/data/all_transactions.json
 *       Flat array; one row per transaction. Fields observed:
 *         transaction_date, disclosure_date (both "MM/DD/YYYY"), ticker,
 *         asset_description, asset_type, type ("Purchase" | "Sale" |
 *         "Exchange" | ...), amount ("$1,001 - $15,000" style band),
 *         amount_mid (source-computed midpoint — NOT used here; see
 *         HONESTY CONTRACT on the table), representative (plain name, no
 *         bioguide id), district ("TN07" = state + zero-padded district),
 *         owner, filing_id, source_url (PTR PDF on disclosures-clerk.house.gov).
 *       No bioguide id, so House rows match on (state, district) PLUS a
 *       name cross-check against the seat's incumbent — a seat key alone
 *       would misattribute a departed member's filings to their successor.
 *       See matchHouseCandidate / memberNamesMatch.
 *
 *   • Senate — https://github.com/timothycarambat/senate-stock-watcher-data
 *       GET https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions_for_senators.json
 *       Grouped by filing: { first_name, last_name, office, ptr_link,
 *       date_recieved [sic; disclosure date, "MM/DD/YYYY"], bioguide,
 *       transactions: [{ transaction_date, owner, ticker, asset_description,
 *       asset_type, type ("Purchase" | "Sale (Full)" | "Sale (Partial)" |
 *       "Exchange"), amount, comment, ptr_link }] }. This grouped file (vs
 *       the flatter aggregate/all_transactions.json) is the one used here
 *       because it carries `bioguide` directly — an authoritative match key,
 *       no name fuzzing needed. `ticker` and `asset_description` occasionally
 *       carry embedded HTML (e.g. bond CUSIPs render as
 *       `<div class="text-muted">...</div>`, tickers sometimes wrap in
 *       `<a href=...>`) — stripped by stripHtml below.
 *
 *   Both are community-maintained aggregations of public government
 *   disclosures (House Clerk / Senate eFD). Attribution: "House Stock
 *   Watcher" / "Senate Stock Watcher" data, no LICENSE file published by
 *   either repo as of this check — the underlying facts are public record;
 *   this ingest keeps the per-row official filing_url/ptr_link so every row
 *   is independently verifiable back to the source filing (see
 *   docs on member_stock_transactions honesty contract).
 *
 * INCUMBENTS ONLY: a parsed transaction only becomes a DB row once matched
 * to a `candidates` row with is_incumbent = true. Unmatched rows (unknown
 * member, departed member, challenger-only name collision) are logged and
 * skipped — never inserted, never crash the run (FAIL-OPEN, mirrors
 * congress-press-rationales.ts: a moved/unreachable dataset is logged and
 * skipped, not a fatal error).
 *
 * Usage (when ready to run for real):
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/stock-transactions.ts --live
 *
 * Idempotency: upserts on external_id (composite key; neither source dataset
 * carries a per-row id — see buildExternalId).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql, inArray } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, memberStockTransactions } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOUSE_DATASET_URL =
  "https://raw.githubusercontent.com/TattooedHead/house-stock-watcher-data/main/data/all_transactions.json";
const SENATE_DATASET_URL =
  "https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions_for_senators.json";

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Types — raw source shapes (verbatim JSON field names)
// ---------------------------------------------------------------------------

export interface HouseWatcherRow {
  transaction_date?: string;
  disclosure_date?: string;
  ticker?: string;
  asset_description?: string;
  asset_type?: string;
  type?: string;
  amount?: string;
  representative?: string;
  district?: string;
  owner?: string;
  filing_id?: string;
  source_url?: string;
}

export interface SenateWatcherTransaction {
  transaction_date?: string;
  owner?: string;
  ticker?: string;
  asset_description?: string;
  asset_type?: string;
  type?: string;
  amount?: string;
  comment?: string;
  ptr_link?: string;
}

export interface SenateWatcherFilingGroup {
  first_name?: string;
  last_name?: string;
  office?: string;
  ptr_link?: string;
  date_recieved?: string;
  bioguide?: string;
  transactions?: SenateWatcherTransaction[];
}

// ---------------------------------------------------------------------------
// Types — normalized (DB-shaped, pre-match)
// ---------------------------------------------------------------------------

export type NormalizedTransactionType =
  | "purchase"
  | "sale"
  | "sale_partial"
  | "exchange"
  | "other";

export interface ParsedHouseTransaction {
  chamber: "house";
  representativeName: string | null;
  state: string;
  district: string;
  ticker: string | null;
  assetDescription: string;
  assetType: string | null;
  transactionType: NormalizedTransactionType;
  rawTransactionType: string;
  amountLow: number;
  amountHigh: number | null;
  amountRangeLabel: string;
  transactionDate: string; // ISO
  disclosureDate: string | null; // ISO
  owner: string | null;
  filingUrl: string;
  rawMetadata: UnknownRecord;
}

export interface ParsedSenateTransaction {
  chamber: "senate";
  senatorName: string | null;
  bioguide: string;
  ticker: string | null;
  assetDescription: string;
  assetType: string | null;
  transactionType: NormalizedTransactionType;
  rawTransactionType: string;
  amountLow: number;
  amountHigh: number | null;
  amountRangeLabel: string;
  transactionDate: string; // ISO
  disclosureDate: string | null; // ISO
  owner: string | null;
  filingUrl: string;
  rawMetadata: UnknownRecord;
}

export type ParsedTransaction =
  | ParsedHouseTransaction
  | ParsedSenateTransaction;

export interface StockTransactionRow {
  candidateId: string;
  bioguideId: string | null;
  chamber: "house" | "senate";
  ticker: string | null;
  assetDescription: string;
  assetType: string | null;
  transactionType: NormalizedTransactionType;
  rawTransactionType: string;
  amountLow: string; // numeric column → string for Drizzle
  amountHigh: string | null;
  amountRangeLabel: string;
  transactionDate: string;
  disclosureDate: string | null;
  owner: string | null;
  filingUrl: string;
  sourceDataset: "house_stock_watcher" | "senate_stock_watcher";
  externalId: string;
  rawMetadata: UnknownRecord;
}

export interface BuildCounts {
  read: number;
  malformed: number;
  unmatchedMember: number;
  built: number;
}

// ---------------------------------------------------------------------------
// Pure parsing helpers
// ---------------------------------------------------------------------------

/**
 * "$1,001 - $15,000" → { low: 1001, high: 15000 }. STOCK Act bands are
 * always ranges except the open-ended top band ("Over $50,000,000" /
 * "$50,000,000+"), where high is null. Anything else (blank, prose, garbled
 * text) → null, so the caller treats the row as malformed and skips it —
 * NEVER fabricate a point estimate from an unparsable band.
 */
export function parseAmountRange(
  raw: string | null | undefined,
): { low: number; high: number | null; label: string } | null {
  if (!raw) return null;
  const label = raw.trim();
  if (!label) return null;

  const range = label.match(/^\$?\s*([\d,]+)\s*-\s*\$?\s*([\d,]+)\s*$/);
  if (range) {
    const low = Number(range[1].replace(/,/g, ""));
    const high = Number(range[2].replace(/,/g, ""));
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    if (low <= 0 || high < low) return null;
    return { low, high, label };
  }

  if (/^(?:Over\s+)?\$?[\d,]+\+?$/i.test(label) && /over|\+/i.test(label)) {
    const m = label.match(/([\d,]+)/);
    const low = m ? Number(m[1].replace(/,/g, "")) : NaN;
    if (!Number.isFinite(low) || low <= 0) return null;
    return { low, high: null, label };
  }

  return null;
}

/**
 * "MM/DD/YYYY" → "YYYY-MM-DD". Anything else → null (never guess a date).
 * Validates the date actually exists on the calendar (e.g. rejects
 * "02/30/2026") — a garbled scrape can pass the month/day range check while
 * still being invalid, and Postgres' `date` type rejects it at insert time,
 * which would fail the whole upsert batch rather than just this one row.
 */
export function parseSourceDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Strips embedded HTML tags (the Senate grouped dataset wraps some tickers
 * in `<a href=...>` and some bond descriptions in `<div class="text-muted">`
 * blocks) and NUL bytes (Postgres `text` rejects embedded NUL bytes — seen in
 * the House dataset's garbled asset_description values from PDF scraping).
 */
export function stripHtml(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

/** "--" (both source datasets' "no ticker" sentinel) → null. */
export function normalizeTicker(raw: string | null | undefined): string | null {
  const cleaned = stripHtml(raw);
  if (!cleaned || cleaned === "--") return null;
  return cleaned.toUpperCase();
}

/** Collapses source-specific labels ("Sale (Full)" / "Sale") to one vocabulary. */
export function normalizeTransactionType(raw: string | null | undefined): {
  type: NormalizedTransactionType;
  raw: string;
} {
  const rawLabel = (raw ?? "").trim();
  const lower = rawLabel.toLowerCase();
  if (!lower) return { type: "other", raw: rawLabel || "unknown" };
  if (lower.startsWith("purchase")) return { type: "purchase", raw: rawLabel };
  if (lower.includes("partial")) return { type: "sale_partial", raw: rawLabel };
  if (lower.startsWith("sale")) return { type: "sale", raw: rawLabel };
  if (lower.startsWith("exchange")) return { type: "exchange", raw: rawLabel };
  return { type: "other", raw: rawLabel };
}

/** "TN07" → { state: "TN", district: "07" }. Malformed/missing → null. */
export function parseHouseDistrict(
  raw: string | null | undefined,
): { state: string; district: string } | null {
  if (!raw) return null;
  const m = raw.trim().match(/^([A-Za-z]{2})(\d{2})$/);
  if (!m) return null;
  return { state: m[1].toUpperCase(), district: m[2] };
}

/**
 * Composite dedupe key — neither source dataset carries a per-row id.
 * Collisions (two genuinely distinct transactions with identical
 * ticker/date/type/amount/owner in the same filing) are rare but possible;
 * a later row upserts over an earlier one with the same key. Acceptable for
 * a first pass — a real per-row id would need to come from the House Clerk /
 * Senate eFD source PDFs directly, which this ingest doesn't parse.
 */
export function buildExternalId(parts: {
  sourceDataset: string;
  filingKey: string;
  ticker: string | null;
  assetDescription: string;
  transactionDate: string;
  rawTransactionType: string;
  amountRangeLabel: string;
  owner: string | null;
}): string {
  return [
    parts.sourceDataset,
    parts.filingKey,
    parts.ticker ?? "",
    parts.assetDescription,
    parts.transactionDate,
    parts.rawTransactionType,
    parts.amountRangeLabel,
    parts.owner ?? "",
  ].join("::");
}

// ---------------------------------------------------------------------------
// Row parsing (pure — no DB, no member matching)
// ---------------------------------------------------------------------------

/** Parses one House Stock Watcher row. Returns null when malformed. */
export function parseHouseRow(
  row: HouseWatcherRow,
): ParsedHouseTransaction | null {
  const assetDescription = stripHtml(row.asset_description);
  const filingUrl = (row.source_url ?? "").trim();
  const transactionDate = parseSourceDate(row.transaction_date);
  const district = parseHouseDistrict(row.district);
  const amount = parseAmountRange(row.amount);

  if (
    !assetDescription ||
    !filingUrl ||
    !transactionDate ||
    !district ||
    !amount
  ) {
    return null;
  }

  const { type, raw: rawType } = normalizeTransactionType(row.type);

  return {
    chamber: "house",
    representativeName: stripHtml(row.representative),
    state: district.state,
    district: district.district,
    ticker: normalizeTicker(row.ticker),
    assetDescription,
    assetType: stripHtml(row.asset_type),
    transactionType: type,
    rawTransactionType: rawType,
    amountLow: amount.low,
    amountHigh: amount.high,
    amountRangeLabel: amount.label,
    transactionDate,
    disclosureDate: parseSourceDate(row.disclosure_date),
    owner: stripHtml(row.owner),
    filingUrl,
    rawMetadata: {
      filingId: row.filing_id ?? null,
      representativeName: row.representative ?? null,
      district: row.district ?? null,
    },
  };
}

/**
 * Parses one Senate Stock Watcher filing group into zero or more
 * transactions. A malformed transaction within an otherwise-good filing is
 * skipped individually (returned array omits it) rather than dropping the
 * whole filing.
 */
export function parseSenateFilingGroup(
  group: SenateWatcherFilingGroup,
): ParsedSenateTransaction[] {
  const bioguide = (group.bioguide ?? "").trim().toUpperCase();
  const groupFilingUrl = (group.ptr_link ?? "").trim();
  const disclosureDate = parseSourceDate(group.date_recieved);
  const senatorName = [group.first_name, group.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!bioguide || !Array.isArray(group.transactions)) return [];

  const out: ParsedSenateTransaction[] = [];
  for (const txn of group.transactions) {
    const assetDescription = stripHtml(txn.asset_description);
    const transactionDate = parseSourceDate(txn.transaction_date);
    const amount = parseAmountRange(txn.amount);
    const filingUrl = (txn.ptr_link ?? "").trim() || groupFilingUrl;

    if (!assetDescription || !transactionDate || !amount || !filingUrl) {
      continue;
    }

    const { type, raw: rawType } = normalizeTransactionType(txn.type);

    out.push({
      chamber: "senate",
      senatorName: senatorName || null,
      bioguide,
      ticker: normalizeTicker(txn.ticker),
      assetDescription,
      assetType: stripHtml(txn.asset_type),
      transactionType: type,
      rawTransactionType: rawType,
      amountLow: amount.low,
      amountHigh: amount.high,
      amountRangeLabel: amount.label,
      transactionDate,
      disclosureDate,
      owner: stripHtml(txn.owner),
      filingUrl,
      rawMetadata: {
        comment: txn.comment ?? null,
        senatorName: senatorName || null,
        office: group.office ?? null,
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Member matching (pure — index built from already-loaded candidate rows)
// ---------------------------------------------------------------------------

export interface FederalCandidateRow {
  id: string;
  fullName: string;
  jurisdiction: string;
  state: string | null;
  district: string | null;
  isIncumbent: boolean;
}

export interface HouseSeatCandidate {
  id: string;
  fullName: string;
}

/** Title tokens stripped only from the FRONT of a name ("Hon. Nancy Pelosi",
 *  GovTrack's "Rep./Sen./Del./Com."). Front-only so surname particles like
 *  "Del Rio" survive. */
const NAME_TITLE_TOKENS = new Set([
  "hon",
  "rep",
  "sen",
  "del",
  "com",
  "dr",
  "mr",
  "mrs",
  "ms",
]);

/** Generational suffixes stripped from the END of a name (or a trailing
 *  comma segment). "v" is deliberately excluded — too ambiguous with an
 *  initial. */
const NAME_SUFFIX_TOKENS = new Set(["jr", "sr", "ii", "iii", "iv"]);

/**
 * Normalizes a member name from ANY of the formats seen across our sources
 * into lowercase tokens, given names first, surname last:
 *   • House Stock Watcher: "Hon. Matthew Robert Van Epps"
 *   • GovTrack display (DB fullName): "Rep. Matthew Van Epps [R-TN7]"
 *   • FEC-normalized (DB fullName): "Van Epps, Matthew"
 * Handles "Last, First" reordering, leading titles, trailing suffixes
 * (incl. ", Jr."), diacritics (NFD strip), hyphens (split), apostrophes
 * (removed), and the GovTrack "[party-state]" tag. Returns [] when nothing
 * usable remains.
 */
export function normalizeMemberNameTokens(
  raw: string | null | undefined,
): string[] {
  if (!raw) return [];
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritics → ASCII
    .replace(/\[[^\]]*\]/g, " ") // GovTrack "[D-NJ1]" tag
    .toLowerCase()
    .replace(/'/g, "") // O'Rourke → orourke (both sides)
    .replace(/-/g, " "); // hyphenated names → separate tokens

  const tokenize = (s: string): string[] =>
    s
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  // "Last, First [Middle][, Jr.]" → "First [Middle] Last"; drop trailing
  // comma segments that are purely suffixes.
  const segments = base
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let reordered: string;
  if (segments.length >= 2) {
    const rest = segments
      .slice(1)
      .filter((seg) => !tokenize(seg).every((t) => NAME_SUFFIX_TOKENS.has(t)));
    reordered = [...rest, segments[0]].join(" ");
  } else {
    reordered = base;
  }

  const tokens = tokenize(reordered);
  while (tokens.length > 0 && NAME_TITLE_TOKENS.has(tokens[0])) tokens.shift();
  while (
    tokens.length > 0 &&
    NAME_SUFFIX_TOKENS.has(tokens[tokens.length - 1])
  ) {
    tokens.pop();
  }
  return tokens;
}

/** First-name candidates: the first given token, plus the one after it when
 *  the first is a bare initial ("K. Michael Conaway" → ["k", "michael"]). */
function firstNameCandidates(given: string[]): string[] {
  if (given.length === 0) return [];
  const out = [given[0]];
  if (given[0].length === 1 && given.length > 1) out.push(given[1]);
  return out;
}

function firstNamePairCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  // Bare initial vs full name: "m" ~ "matthew".
  if (a.length === 1 || b.length === 1) return a[0] === b[0];
  // Short-form prefix: "greg" ~ "gregory", "ed" ~ "edward". Irregular
  // nicknames ("bill"/"william") are NOT mapped — a miss is a counted,
  // fail-open skip (unmatchedMember), never a misattribution; add a
  // nickname table only if unmatched counts run high in practice.
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * True when two member-name strings plausibly refer to the same person:
 * surnames (last tokens) must be equal, AND the first given names must be
 * compatible. Requires a given name on BOTH sides — a bare surname is never
 * enough, because seat + surname alone misattributes family successions in
 * the same district (e.g. LA-05's Letlow → Letlow succession in 2021).
 */
export function memberNamesMatch(
  sourceName: string | null | undefined,
  dbFullName: string | null | undefined,
): boolean {
  const a = normalizeMemberNameTokens(sourceName);
  const b = normalizeMemberNameTokens(dbFullName);
  if (a.length < 2 || b.length < 2) return false;
  if (a[a.length - 1] !== b[b.length - 1]) return false;
  const aFirst = firstNameCandidates(a.slice(0, -1));
  const bFirst = firstNameCandidates(b.slice(0, -1));
  return aFirst.some((x) => bFirst.some((y) => firstNamePairCompatible(x, y)));
}

/** Key: "STATE|DD" (zero-padded district) → incumbent {id, fullName}. House only. */
export function buildHouseCandidateIndex(
  rows: FederalCandidateRow[],
): Map<string, HouseSeatCandidate> {
  const index = new Map<string, HouseSeatCandidate>();
  for (const row of rows) {
    if (row.jurisdiction !== "federal-house" || !row.isIncumbent) continue;
    if (!row.state || !row.district) continue;
    index.set(`${row.state.toUpperCase()}|${row.district}`, {
      id: row.id,
      fullName: row.fullName,
    });
  }
  return index;
}

/** Set of federal-senate incumbent candidateIds ("federal-<BIOGUIDE>"). */
export function buildSenateCandidateIdSet(
  rows: FederalCandidateRow[],
): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.jurisdiction !== "federal-senate" || !row.isIncumbent) continue;
    set.add(row.id);
  }
  return set;
}

/**
 * House rows carry only a SEAT key (state+district) plus the member's name —
 * and a seat is not an identity: districts change hands mid-cycle
 * (resignation, death, special election), and the source file is a
 * multi-year archive, so a departed member's old filings would otherwise be
 * attributed to whoever holds the seat NOW. The seat lookup therefore only
 * nominates a candidate; the dataset's `representative` name must ALSO match
 * that candidate's name. Name missing or mismatched → null (counted as
 * unmatchedMember by the caller) — never attribute on seat alone.
 */
export function matchHouseCandidate(
  parsed: ParsedHouseTransaction,
  index: Map<string, HouseSeatCandidate>,
): string | null {
  const seatMatch = index.get(`${parsed.state}|${parsed.district}`);
  if (!seatMatch) return null;
  if (!memberNamesMatch(parsed.representativeName, seatMatch.fullName)) {
    return null;
  }
  return seatMatch.id;
}

/**
 * No name cross-check here, deliberately: `bioguide` is a per-PERSON id from
 * the Biographical Directory of Congress — never reassigned, never a seat
 * key — so the House failure mode (a successor inheriting a departed
 * member's seat key) cannot occur; a departed senator's row simply loses
 * is_incumbent and the lookup misses. The dataset's first_name/last_name
 * come from the same filer record as `bioguide`, so a name check would only
 * re-verify the aggregator against itself while adding nickname false-drops
 * ("Bill" vs "William").
 */
export function matchSenateCandidate(
  parsed: ParsedSenateTransaction,
  idSet: Set<string>,
): string | null {
  const candidateId = `federal-${parsed.bioguide}`;
  return idSet.has(candidateId) ? candidateId : null;
}

// ---------------------------------------------------------------------------
// Row assembly (parse + match → DB-ready rows)
// ---------------------------------------------------------------------------

function toRow(
  parsed: ParsedTransaction,
  candidateId: string,
  sourceDataset: "house_stock_watcher" | "senate_stock_watcher",
): StockTransactionRow {
  const bioguideId =
    parsed.chamber === "senate"
      ? parsed.bioguide
      : (candidateId.match(/^federal-([A-Z0-9]+)$/)?.[1] ?? null);

  return {
    candidateId,
    bioguideId,
    chamber: parsed.chamber,
    ticker: parsed.ticker,
    assetDescription: parsed.assetDescription,
    assetType: parsed.assetType,
    transactionType: parsed.transactionType,
    rawTransactionType: parsed.rawTransactionType,
    amountLow: String(parsed.amountLow),
    amountHigh: parsed.amountHigh === null ? null : String(parsed.amountHigh),
    amountRangeLabel: parsed.amountRangeLabel,
    transactionDate: parsed.transactionDate,
    disclosureDate: parsed.disclosureDate,
    owner: parsed.owner,
    filingUrl: parsed.filingUrl,
    sourceDataset,
    externalId: buildExternalId({
      sourceDataset,
      filingKey: parsed.chamber === "senate" ? parsed.bioguide : candidateId,
      ticker: parsed.ticker,
      assetDescription: parsed.assetDescription,
      transactionDate: parsed.transactionDate,
      rawTransactionType: parsed.rawTransactionType,
      amountRangeLabel: parsed.amountRangeLabel,
      owner: parsed.owner,
    }),
    rawMetadata: parsed.rawMetadata,
  };
}

/** Builds upsert-ready House rows from raw source rows. FAIL-OPEN per row. */
export function buildHouseTransactionRows(
  rawRows: HouseWatcherRow[],
  candidateIndex: Map<string, HouseSeatCandidate>,
): { rows: StockTransactionRow[]; counts: BuildCounts } {
  const counts: BuildCounts = {
    read: 0,
    malformed: 0,
    unmatchedMember: 0,
    built: 0,
  };
  const rows: StockTransactionRow[] = [];

  for (const raw of rawRows) {
    counts.read += 1;
    const parsed = parseHouseRow(raw);
    if (!parsed) {
      counts.malformed += 1;
      continue;
    }
    const candidateId = matchHouseCandidate(parsed, candidateIndex);
    if (!candidateId) {
      counts.unmatchedMember += 1;
      continue;
    }
    rows.push(toRow(parsed, candidateId, "house_stock_watcher"));
    counts.built += 1;
  }

  return { rows, counts };
}

/** Builds upsert-ready Senate rows from raw filing groups. FAIL-OPEN per row. */
export function buildSenateTransactionRows(
  groups: SenateWatcherFilingGroup[],
  candidateIdSet: Set<string>,
): { rows: StockTransactionRow[]; counts: BuildCounts } {
  const counts: BuildCounts = {
    read: 0,
    malformed: 0,
    unmatchedMember: 0,
    built: 0,
  };
  const rows: StockTransactionRow[] = [];

  for (const group of groups) {
    const parsedList = parseSenateFilingGroup(group);
    const rawCount = Array.isArray(group.transactions)
      ? group.transactions.length
      : 0;
    counts.read += rawCount;
    counts.malformed += rawCount - parsedList.length;

    for (const parsed of parsedList) {
      const candidateId = matchSenateCandidate(parsed, candidateIdSet);
      if (!candidateId) {
        counts.unmatchedMember += 1;
        continue;
      }
      rows.push(toRow(parsed, candidateId, "senate_stock_watcher"));
      counts.built += 1;
    }
  }

  return { rows, counts };
}

// ---------------------------------------------------------------------------
// Fetch (fail-open — a moved/unreachable dataset is logged and skipped, not fatal)
// ---------------------------------------------------------------------------

async function fetchJsonArray(
  url: string,
  fetcher: Fetcher,
  label: string,
): Promise<unknown[] | null> {
  try {
    const res = await fetcher(url, {
      headers: { "user-agent": "voter-choice-stock-transactions-ingest" },
    });
    if (!res.ok) {
      console.warn(
        `[stock-transactions] ${label} dataset unavailable: HTTP ${res.status} on ${url} — skipping this chamber, not aborting the run`,
      );
      return null;
    }
    const body = await res.json();
    if (!Array.isArray(body)) {
      console.warn(
        `[stock-transactions] ${label} dataset returned unexpected shape (not an array) — skipping`,
      );
      return null;
    }
    return body;
  } catch (err) {
    console.warn(
      `[stock-transactions] ${label} dataset fetch failed: ${err} — skipping this chamber, not aborting the run`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

async function loadFederalCandidateRows(
  db: DbClient,
): Promise<FederalCandidateRow[]> {
  const rows = await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      jurisdiction: candidates.jurisdiction,
      state: candidates.state,
      district: candidates.district,
      isIncumbent: candidates.isIncumbent,
    })
    .from(candidates)
    .where(
      inArray(candidates.jurisdiction, ["federal-house", "federal-senate"]),
    );
  return rows;
}

export async function upsertStockTransactionRows(
  db: DbClient,
  rows: StockTransactionRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const now = new Date();

  await db
    .insert(memberStockTransactions)
    .values(rows.map((row) => ({ ...row, updatedAt: now })))
    .onConflictDoUpdate({
      target: memberStockTransactions.externalId,
      set: {
        candidateId: sql`excluded.candidate_id`,
        bioguideId: sql`excluded.bioguide_id`,
        chamber: sql`excluded.chamber`,
        ticker: sql`excluded.ticker`,
        assetDescription: sql`excluded.asset_description`,
        assetType: sql`excluded.asset_type`,
        transactionType: sql`excluded.transaction_type`,
        rawTransactionType: sql`excluded.raw_transaction_type`,
        amountLow: sql`excluded.amount_low`,
        amountHigh: sql`excluded.amount_high`,
        amountRangeLabel: sql`excluded.amount_range_label`,
        transactionDate: sql`excluded.transaction_date`,
        disclosureDate: sql`excluded.disclosure_date`,
        owner: sql`excluded.owner`,
        filingUrl: sql`excluded.filing_url`,
        sourceDataset: sql`excluded.source_dataset`,
        rawMetadata: sql`excluded.raw_metadata`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface StockTransactionsCounts {
  house: BuildCounts;
  senate: BuildCounts;
  rowsUpserted: number;
}

export async function ingestStockTransactions({
  db = requireDb(),
  fetcher = fetch,
  dryRun = true,
  houseUrl = HOUSE_DATASET_URL,
  senateUrl = SENATE_DATASET_URL,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  dryRun?: boolean;
  houseUrl?: string;
  senateUrl?: string;
} = {}): Promise<StockTransactionsCounts> {
  const emptyCounts: BuildCounts = {
    read: 0,
    malformed: 0,
    unmatchedMember: 0,
    built: 0,
  };
  const counts: StockTransactionsCounts = {
    house: { ...emptyCounts },
    senate: { ...emptyCounts },
    rowsUpserted: 0,
  };

  const candidateRows = await loadFederalCandidateRows(db);
  const houseIndex = buildHouseCandidateIndex(candidateRows);
  const senateIdSet = buildSenateCandidateIdSet(candidateRows);

  const [houseData, senateData] = await Promise.all([
    fetchJsonArray(houseUrl, fetcher, "House"),
    fetchJsonArray(senateUrl, fetcher, "Senate"),
  ]);

  let allRows: StockTransactionRow[] = [];

  if (houseData) {
    const { rows, counts: houseCounts } = buildHouseTransactionRows(
      houseData as HouseWatcherRow[],
      houseIndex,
    );
    counts.house = houseCounts;
    allRows = allRows.concat(rows);
  }

  if (senateData) {
    const { rows, counts: senateCounts } = buildSenateTransactionRows(
      senateData as SenateWatcherFilingGroup[],
      senateIdSet,
    );
    counts.senate = senateCounts;
    allRows = allRows.concat(rows);
  }

  console.log(
    `[stock-transactions] house: read=${counts.house.read} malformed=${counts.house.malformed} unmatched=${counts.house.unmatchedMember} built=${counts.house.built}`,
  );
  console.log(
    `[stock-transactions] senate: read=${counts.senate.read} malformed=${counts.senate.malformed} unmatched=${counts.senate.unmatchedMember} built=${counts.senate.built}`,
  );

  if (dryRun) {
    console.log(
      `[stock-transactions] DRY RUN — would upsert ${allRows.length} rows (no writes)`,
    );
    return counts;
  }

  counts.rowsUpserted = await upsertStockTransactionRows(db, allRows);
  console.log(`[stock-transactions] upserted ${counts.rowsUpserted} rows`);
  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  // Safety-first default: this script writes to member_stock_transactions
  // only when BOTH DATABASE_URL is set AND --live is passed explicitly.
  const dryRun = !process.argv.includes("--live");
  ingestStockTransactions({ dryRun }).catch((err) => {
    console.error("[stock-transactions] fatal:", err);
    process.exitCode = 1;
  });
}

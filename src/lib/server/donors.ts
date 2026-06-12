/**
 * src/lib/server/donors.ts
 *
 * Drizzle query layer for the donor-coalition lookup endpoint.
 * Aggregates per-candidate, per-cycle bucket-level dollar amounts from
 * the `donor_aggregates` table into a coalition breakdown.
 *
 * This module is server-only. Never import it from client components.
 */

import { eq, and } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { resolveCandidateId } from "./alignment";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DonorBucket {
  /** canonical bucket label (matches donor_aggregates.bucket_label) */
  label: string;
  /** dollars, decimal as JS number */
  amount: number;
  /** 0-100 integer, computed from total (may sum to 99 or 101 due to rounding) */
  percent: number;
  /** Issue-PAC agenda stance relative to the canonical issue, when known. */
  issuePacStance?: "in_favor" | "opposed";
  /** For issue-PAC buckets: short display name (e.g. "PhRMA & Hospital PACs"). */
  displayName?: string;
  /** For issue-PAC buckets: full formal name of the lead organization. */
  fullName?: string;
  /** For issue-PAC buckets: plain-English description of what this PAC advocates. */
  advocates?: string;
  /** For issue-PAC buckets: canonical issue key (more reliable than parsing label). */
  canonicalIssue?: string;
}

export interface DonorCoalitionResult {
  found: true;
  candidateId: string;
  totalRaised: number;
  buckets: DonorBucket[];
  /** donor_aggregates.source, e.g. "fec", "tx-tec" */
  source: string;
  /** first/most-common source_url among rows for this candidate+cycle */
  sourceUrl: string;
  electionCycle: string;
  /**
   * Set when this candidate's 2026 fundraising is attributed to a different-
   * chamber candidacy (e.g. a House member running for Senate). Intended for
   * display as the cycle label: "$2.07M raised · 2026 U.S. Senate campaign".
   */
  chamberSwitchLabel?: string;
}

export interface DonorCoalitionNotFound {
  found: false;
  reason:
    | "candidate_not_resolved"
    | "no_donor_data"
    | "non_legislative_candidate";
}

export type DonorLookupResult = DonorCoalitionResult | DonorCoalitionNotFound;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default election cycle when caller doesn't pass one.
 * Hard-coded to "2026" intentionally (not derived from new Date()) so the
 * default is stable across environments and doesn't roll over at midnight
 * Jan 1 in a way that surprises consumers.
 */
const DEFAULT_ELECTION_CYCLE = "2026";

/**
 * donor_aggregates.source values written by the federal ingests
 * (scripts/ingest/federal-donors.ts → "fec_api",
 * scripts/ingest/federal-sectors-bulk.ts → "fec_bulk"). The sector
 * double-count is federal-only — see SECTOR_LABELS — so the read-time fix is
 * scoped to these sources. Keep byte-identical to the ingests' `source`.
 */
const FEDERAL_DONOR_SOURCES = new Set(["fec_api", "fec_bulk"]);

/** Pick the most frequently occurring string in `values`; ties broken by first occurrence. */
function pickMostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  let bestVal = values[0]!;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      bestVal = v;
    }
  }
  return bestVal;
}

// ---------------------------------------------------------------------------
// Main lookup
// ---------------------------------------------------------------------------

/**
 * Look up the donor coalition for a candidate in a given election cycle.
 *
 * Resolution path:
 *   1. resolveCandidateId(name, jurisdiction) — reuses alignment's matcher.
 *      Non-legislative jurisdictions (e.g. `state-TX-executive`) won't have
 *      any candidates row, so resolution returns null → candidate_not_resolved.
 *   2. Query donor_aggregates for (candidate_id, election_cycle).
 *   3. Aggregate rows into bucket dollar amounts + percent of total.
 *
 * `stateCode` is accepted for contract symmetry with the alignment API and
 * used only as a defensive cross-check against the jurisdiction prefix; the
 * authoritative candidate lookup runs on (name, jurisdiction).
 */
/**
 * Canonical donor-bucket labels that compose the small/large/PAC funding mix.
 * These MUST stay byte-identical to the labels the ingest writes
 * (scripts/ingest/_bucket-mapping.ts → DONOR_BUCKET_LABELS) — the read-time
 * funding-mix aggregation matches on them. Duplicated here (not imported) to
 * respect the src/ ↔ scripts/ boundary.
 */
export const FUNDING_MIX_LABELS = {
  small: "Small individual donors (under $200)",
  large: "Large individual donors ($200+)",
  pac: "PACs",
} as const;

/** True for the totals-derived buckets that compose the funding mix. */
export function isFundingMixBucket(label: string): boolean {
  return (
    label === FUNDING_MIX_LABELS.small ||
    label === FUNDING_MIX_LABELS.large ||
    label === FUNDING_MIX_LABELS.pac
  );
}

/**
 * Industry/sector bucket labels.
 *
 * In the FEDERAL ingest these are an ADDITIVE re-cut of dollars already counted
 * in the individual-donor buckets: federal-donors.ts adds Schedule-A
 * by-employer buckets (fetchEmployerBuckets, mapped via _bucket-mapping.ts) ON
 * TOP of the FEC /totals/ funding-mix, so the sector dollars duplicate the
 * itemized large-individual total. Summing them inflates totalRaised — hence
 * the federal-scoped exclusion in lookupDonorCoalition.
 *
 * In STATE ingests they are DISJOINT money, not a re-cut: each contribution is
 * bucketed exactly once (individuals → funding-mix, organizations → a sector
 * bucket), so state sector dollars are real distinct totals that MUST stay in
 * the headline. That is why the exclusion checks the row source rather than
 * dropping every sector bucket.
 *
 * Mirrors SECTOR_LABELS in scripts/ingest/_coverage-by-layer.ts: the canonical
 * DONOR_BUCKET_LABELS vocabulary minus the funding-mix / Self-funded /
 * Party committees / Other rows. Duplicated here (not imported) to respect the
 * src/ ↔ scripts/ boundary — keep byte-identical to the ingest labels.
 */
const SECTOR_LABELS: ReadonlySet<string> = new Set([
  "Real estate & development",
  "Oil, gas & energy",
  "Healthcare industry",
  "Pharmaceutical & medical device",
  "Finance, banking & insurance",
  "Technology",
  "Legal industry",
  "Agriculture",
  "Telecom & utilities",
  "Retail & hospitality",
  "Trade unions (non-public-safety)",
  "Public safety unions",
  "Education employees",
]);

/** True for industry/sector buckets that re-cut already-counted individual dollars. */
export function isSectorBucket(label: string): boolean {
  return SECTOR_LABELS.has(label);
}

/**
 * True for named issue-aligned PAC buckets, written by the FEC bulk ingest
 * (scripts/ingest/federal-issue-pacs.ts) with a dynamic suffix:
 * "Issue-aligned PACs — <issue>" (see _bucket-mapping.ts IssuePacLabel).
 */
export function isIssuePacBucket(label: string): boolean {
  return label.startsWith("Issue-aligned PACs");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function issuePacStanceFromMetadata(
  rawMetadata: unknown,
): "in_favor" | "opposed" | undefined {
  const metadata = asRecord(rawMetadata);
  const issuePac = asRecord(metadata?.issuePac);
  const stance = issuePac?.stance;
  return stance === "in_favor" || stance === "opposed" ? stance : undefined;
}

function issuePacDisplayFieldsFromMetadata(rawMetadata: unknown): {
  displayName?: string;
  fullName?: string;
  advocates?: string;
  canonicalIssue?: string;
} {
  const metadata = asRecord(rawMetadata);
  const issuePac = asRecord(metadata?.issuePac);
  if (!issuePac) return {};
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : undefined;
  return {
    ...(str(issuePac.displayName)
      ? { displayName: str(issuePac.displayName) }
      : {}),
    ...(str(issuePac.fullName) ? { fullName: str(issuePac.fullName) } : {}),
    ...(str(issuePac.advocates) ? { advocates: str(issuePac.advocates) } : {}),
    ...(str(issuePac.canonicalIssue)
      ? { canonicalIssue: str(issuePac.canonicalIssue) }
      : {}),
  };
}

export async function lookupDonorCoalition(
  candidateName: string,
  stateCode: string,
  jurisdiction: string,
  electionCycle?: string,
): Promise<DonorLookupResult> {
  const cycle = electionCycle?.trim() || DEFAULT_ELECTION_CYCLE;

  // 1. Resolve candidate via the shared alignment matcher. Pass stateCode so
  // the matcher can disambiguate ballot nicknames vs GovTrack formal names
  // (e.g. "Andy Kim" ↔ "Andrew Kim [D-NJ]") by lastname + state.
  const candidateId = await resolveCandidateId(
    candidateName,
    jurisdiction,
    stateCode,
  );
  if (!candidateId) {
    return { found: false, reason: "candidate_not_resolved" };
  }

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    // We resolved a candidate id from a configured DB but somehow lost the
    // connection between calls — treat as no donor data so the chat tool can
    // gracefully fall through rather than throwing.
    return { found: false, reason: "no_donor_data" };
  }

  // 2. Query donor_aggregates for this candidate + cycle.
  let rows = await db
    .select({
      bucketLabel: schema.donorAggregates.bucketLabel,
      amountTotal: schema.donorAggregates.amountTotal,
      source: schema.donorAggregates.source,
      sourceUrl: schema.donorAggregates.sourceUrl,
      rawMetadata: schema.donorAggregates.rawMetadata,
    })
    .from(schema.donorAggregates)
    .where(
      and(
        eq(schema.donorAggregates.candidateId, candidateId),
        eq(schema.donorAggregates.electionCycle, cycle),
      ),
    );

  // 3a. Chamber-switch fallback (federal only).
  //
  // A House member running for Senate (or vice versa) files a NEW FEC
  // candidacy for their target chamber. The FEC attributes all 2026
  // fundraising to that new candidacy — so querying the seat's incumbent
  // House ID either returns nothing (no 2026 rows) or only a legacy
  // total_receipts row (no small/large/PAC breakdown).
  //
  // In either case: check whether the same person has breakdown data under
  // the sibling chamber. If so, use those rows and label the result
  // (e.g. "2026 U.S. Senate campaign") so the voter understands they're
  // seeing money raised to leave this seat.
  let chamberSwitchLabel: string | undefined;
  const needsChamberSwitch =
    rows.length === 0 || !rows.some((r) => isFundingMixBucket(r.bucketLabel));
  if (
    needsChamberSwitch &&
    (jurisdiction === "federal-house" || jurisdiction === "federal-senate")
  ) {
    const siblingJurisdiction =
      jurisdiction === "federal-house" ? "federal-senate" : "federal-house";
    const siblingCandidateId = await resolveCandidateId(
      candidateName,
      siblingJurisdiction,
      stateCode,
    );
    if (siblingCandidateId && siblingCandidateId !== candidateId) {
      const siblingRows = await db
        .select({
          bucketLabel: schema.donorAggregates.bucketLabel,
          amountTotal: schema.donorAggregates.amountTotal,
          source: schema.donorAggregates.source,
          sourceUrl: schema.donorAggregates.sourceUrl,
          rawMetadata: schema.donorAggregates.rawMetadata,
        })
        .from(schema.donorAggregates)
        .where(
          and(
            eq(schema.donorAggregates.candidateId, siblingCandidateId),
            eq(schema.donorAggregates.electionCycle, cycle),
          ),
        );
      if (siblingRows.some((r) => isFundingMixBucket(r.bucketLabel))) {
        rows = siblingRows;
        const chamberName =
          siblingJurisdiction === "federal-senate"
            ? "U.S. Senate"
            : "U.S. House";
        chamberSwitchLabel = `${cycle} ${chamberName} campaign`;
      }
    }
  }

  if (rows.length === 0) {
    return { found: false, reason: "no_donor_data" };
  }

  // 3. Aggregate.
  // amount_total is numeric(15,2) → returned as string by drizzle/neon.
  // Coerce to Number before any arithmetic, otherwise we'd concatenate.
  const rawBuckets: DonorBucket[] = rows.map((r) => ({
    label: r.bucketLabel,
    amount: Number(r.amountTotal),
    percent: 0, // filled in below once we know totalRaised
    ...(isIssuePacBucket(r.bucketLabel)
      ? {
          issuePacStance: issuePacStanceFromMetadata(r.rawMetadata),
          ...issuePacDisplayFieldsFromMetadata(r.rawMetadata),
        }
      : {}),
  }));

  // Per-label source. donor_aggregates is unique on (candidate, cycle, label),
  // so each label maps to exactly one row → one source. Used to scope the
  // federal-only by-employer double-count fix below.
  const sourceByLabel = new Map(rows.map((r) => [r.bucketLabel, r.source]));

  // Non-destructive total_receipts handling: once a candidate has the real
  // small/large/PAC breakdown, drop the stale single "total_receipts" bucket
  // (left by the older ingest) so it neither inflates the total nor shows as a
  // bogus 100% bar. Candidates NOT yet re-ingested keep total_receipts as their
  // fallback — so a partial ingest never strips a candidate's only funding data.
  const hasBreakdown = rawBuckets.some((b) => isFundingMixBucket(b.label));
  const buckets = hasBreakdown
    ? rawBuckets.filter((b) => b.label !== "total_receipts")
    : rawBuckets;

  // federal-donors builds its sector AND "Other" buckets from one Schedule-A
  // by-employer pass (fetchEmployerBuckets: matched employer → sector, unmatched
  // → "Other") and ADDS them on top of the FEC /totals/ funding-mix. Both are
  // therefore a re-cut of the itemized individual dollars already counted in
  // large-individual — so a federal "Other" double-counts exactly like a federal
  // sector (for Jon Bonck TX House 2026 it's the bigger share: $731k "Other" +
  // $130k sectors over a $1.09M /totals/ base → a $1.95M inflated headline).
  //
  // Drop both from the headline, but only for FEDERAL rows that also carry the
  // funding-mix breakdown they re-cut. The guards matter:
  //   • STATE "Other"/sectors are DISJOINT org money — each contribution is
  //     bucketed once (individual → funding-mix, org → sector, unmatched org →
  //     "Other") — so a different source keeps them in the total.
  //   • A federal candidate with no breakdown keeps these as its only funding
  //     signal rather than collapsing to $0.
  const isFederalEmployerRecut = (b: DonorBucket) =>
    hasBreakdown &&
    (isSectorBucket(b.label) || b.label === "Other") &&
    FEDERAL_DONOR_SOURCES.has(sourceByLabel.get(b.label) ?? "");

  // Named issue-PAC buckets are a classified subset of the existing "PACs"
  // funding-mix total. Keep them for display, but do not add them to
  // totalRaised when the base funding mix is present.
  const isNamedIssuePacRecut = (b: DonorBucket) =>
    hasBreakdown && isIssuePacBucket(b.label);

  // totalRaised (and the percent denominator) excludes those double-counted
  // re-cut buckets. The buckets themselves stay in `buckets` for the coalition
  // display; a federal sector/"Other" or issue-PAC bar then reads as its share
  // of real receipts.
  const totalRaised = buckets.reduce(
    (sum, b) =>
      isFederalEmployerRecut(b) || isNamedIssuePacRecut(b)
        ? sum
        : sum + b.amount,
    0,
  );

  for (const b of buckets) {
    b.percent =
      totalRaised > 0 ? Math.round((b.amount / totalRaised) * 100) : 0;
  }

  // Sort buckets by amount descending (largest coalition first).
  buckets.sort((a, b) => b.amount - a.amount);

  // Source: usually identical across rows but pick the most common if not.
  const source = pickMostCommon(rows.map((r) => r.source));
  const sourceUrl = pickMostCommon(rows.map((r) => r.sourceUrl));

  return {
    found: true,
    candidateId,
    totalRaised,
    buckets,
    source,
    sourceUrl,
    electionCycle: cycle,
    ...(chamberSwitchLabel ? { chamberSwitchLabel } : {}),
  };
}

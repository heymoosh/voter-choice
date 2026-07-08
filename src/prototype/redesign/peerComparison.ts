/**
 * src/prototype/redesign/peerComparison.ts
 *
 * "Raised vs. the median" — the money-gap data contract for the redesign.
 *
 * The backend (src/lib/server/chamber-median.ts → race-data.ts) computes one
 * `chamberMedian` (median total_receipts across the chamber/cycle) and hangs it
 * on every candidate in a federal race. This module turns that raw dollar
 * figure — together with the candidate's own `totalRaised` — into the
 * `PeerComparison` object the UI reads (`MedianChip`, the funder-disclosure
 * scale).
 *
 * Honesty rule (NON-NEGOTIABLE, mirrors the attendance `null` case): when there
 * is no usable median baseline, this returns `null` and the UI shows the dollar
 * amount only — never a fabricated baseline, multiple, or scale.
 *
 * `baseline` is locked to `'chamber-median'` but kept as a field for
 * forward-compat (the contract may later support an in-race median for large
 * fields). The label always names the baseline so the comparison stays honest.
 */

export interface PeerComparison {
  /** LOCKED — chamber/office median, not in-race. Kept for forward-compat. */
  baseline: "chamber-median";
  /** Drives the label, e.g. "U.S. House". */
  office: string;
  /** The median baseline in dollars, e.g. 1_400_000. */
  medianRaised: number;
  /** raised / medianRaised, e.g. 3.0. */
  multiple: number;
  /** Election cycle label, e.g. "2025–26". */
  cycle: string;
  /** Provenance for the source line. */
  source: string;
}

/** Reading band derived from the multiple — the UI styles off this. */
export type PeerBand = "above" | "at" | "below";

export const PEER_SOURCE =
  "FEC filings (median of all U.S. House/Senate campaigns this cycle)";

/**
 * Derive the band from a multiple. Thresholds match the design spec:
 *   ≥ 1.15  → "above" (a structural money advantage)
 *   0.85–1.15 → "at"  (≈ the median; a normal-sized campaign)
 *   < 0.85  → "below" (running lean — NOT a verdict on the candidate)
 */
export function peerBand(multiple: number): PeerBand {
  if (multiple >= 1.15) return "above";
  if (multiple < 0.85) return "below";
  return "at";
}

export interface PeerComparisonInput {
  totalRaised: number | undefined | null;
  /** The chamber median in dollars (from race-data); undefined ⇒ no baseline. */
  chamberMedian: number | undefined | null;
  /** "U.S. House" / "U.S. Senate" — drives the label. */
  office: string;
  cycle: string;
  source?: string;
}

/**
 * Build the `PeerComparison` object, or `null` when there is no usable
 * baseline.
 *
 * Returns `null` when:
 *   - the candidate has no positive `totalRaised`, OR
 *   - there is no positive `chamberMedian` baseline (the backend omits it when
 *     fewer than 2 campaigns filed, i.e. the sample is too thin to be honest).
 *
 * Never fabricates a baseline.
 */
export function derivePeerComparison(
  input: PeerComparisonInput,
): PeerComparison | null {
  const { totalRaised, chamberMedian, office, cycle } = input;
  if (typeof totalRaised !== "number" || totalRaised <= 0) return null;
  if (typeof chamberMedian !== "number" || chamberMedian <= 0) return null;

  return {
    baseline: "chamber-median",
    office,
    medianRaised: chamberMedian,
    multiple: totalRaised / chamberMedian,
    cycle,
    source: input.source ?? PEER_SOURCE,
  };
}

// ---------------------------------------------------------------------------
// Presentation helpers — shared by every money-gap surface so the formatting
// never drifts between the chip, the scale, and the head-to-head.
// ---------------------------------------------------------------------------

/** Compact USD: $4.2M / $410K / $95. */
export function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e6)
    return "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}

/** Multiple as a string: 3.0 → "3×", 0.29 → "0.29×". */
export function formatMultiple(m: number): string {
  if (m >= 1) return m.toFixed(1).replace(/\.0$/, "") + "×";
  return m.toFixed(m < 0.1 ? 2 : 1) + "×";
}

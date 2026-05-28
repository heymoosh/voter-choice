/**
 * getPeerComparison — "2.0× more / less raised than Candidate B"
 *
 * Ported from docs/design/2026-redesign/prototype/prototype-shared.jsx.
 * Canonical thresholds used across all money-trail surfaces:
 *   ratio < 0.85 → 'less'
 *   ratio > 1.18 → 'more'
 *   otherwise    → null (too close to claim a difference)
 *
 * NEEDS-KEY: `label` is an English template string
 * ("2.0× more than X" / "2.0× less than X"). Callers may build a
 * localised label from `kind`, `multiplier`, and `peer.aliasOrName`
 * instead of using `label` directly.
 *
 * Note: self-filtering uses `p.total !== total` (exact match), which
 * is intentional fidelity to the prototype — peers that happen to share
 * the exact total are also filtered.
 */

export interface PeerEntry {
  total: number;
  aliasOrName: string;
}

export interface PeerComparisonResult {
  kind: "more" | "less";
  /** Formatted multiplier string, e.g. "2.0". */
  multiplier: string;
  peer: PeerEntry;
  /** NEEDS-KEY: English template, e.g. "2.0× more than Candidate B". */
  label: string;
}

export function getPeerComparison(
  total: number,
  peers: PeerEntry[],
): PeerComparisonResult | null {
  if (typeof total !== "number" || total <= 0) return null;
  if (!peers || peers.length < 2) return null;
  const others = peers.filter((p) => p.total !== total && p.total > 0);
  if (others.length === 0) return null;
  const peer = others.reduce((a, b) => (b.total > a.total ? b : a), others[0]);
  const ratio = total / peer.total;
  if (ratio < 0.85) {
    const multiplier = (1 / ratio).toFixed(1);
    return {
      kind: "less",
      multiplier,
      peer,
      label: `${multiplier}× less than ${peer.aliasOrName}`, // NEEDS-KEY
    };
  }
  if (ratio > 1.18) {
    const multiplier = ratio.toFixed(1);
    return {
      kind: "more",
      multiplier,
      peer,
      label: `${multiplier}× more than ${peer.aliasOrName}`, // NEEDS-KEY
    };
  }
  return null;
}

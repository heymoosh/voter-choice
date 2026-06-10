/**
 * Canonical issue id → human-readable label mapping.
 *
 * Used by the polis API and optionally by the client consensus panel.
 * Expand this list as new canonical issues are introduced in the ballot prompt.
 *
 * Flagged for expansion: add entries here when the prompt's canonical issue
 * vocabulary grows beyond these ~15 initial entries.
 */

export const CANONICAL_ISSUE_LABELS: Record<string, string> = {
  healthcare_affordability: "Healthcare Affordability",
  border_security: "Border Security",
  economy_jobs: "Economy & Jobs",
  education_funding: "Education Funding",
  public_safety: "Public Safety",
  crime_public_safety: "Crime & Public Safety",
  property_taxes: "Property Taxes",
  water_infrastructure: "Water & Infrastructure",
  energy_grid: "Energy Grid",
  reproductive_rights: "Reproductive Rights",
  gun_rights_safety: "Gun Rights & Safety",
  environment_climate: "Environment & Climate",
  election_integrity: "Election Integrity",
  immigration: "Immigration",
  housing_affordability: "Housing Affordability",
  congressional_accountability: "Congressional Accountability",
};

/**
 * Return a human-readable label for a canonical issue id.
 * Falls back to a title-cased version of the id if not found.
 */
export function getIssueLabel(canonicalIssue: string): string {
  return (
    CANONICAL_ISSUE_LABELS[canonicalIssue] ??
    canonicalIssue
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

// ---------------------------------------------------------------------------
// Jurisdiction lean (2026 redesign)
// ---------------------------------------------------------------------------

/** Which level of government primarily moves an issue. */
export type IssueLevel = "federal" | "state" | "both";

/**
 * Per-issue jurisdiction lean — drives the FED/STATE/BOTH priority tags and
 * the "who controls this" routing in the delegation workspace tier headers.
 * Assignments for issues that appear in the design mock
 * (docs/design/2026-redesign/…/redesign2-data.jsx) match it exactly.
 */
export const ISSUE_JURISDICTION_LEAN: Record<string, IssueLevel> = {
  healthcare_affordability: "federal",
  border_security: "federal",
  economy_jobs: "both",
  education_funding: "state",
  public_safety: "state",
  crime_public_safety: "state",
  property_taxes: "state",
  water_infrastructure: "both",
  energy_grid: "both",
  reproductive_rights: "state",
  gun_rights_safety: "both",
  environment_climate: "both",
  election_integrity: "both",
  immigration: "federal",
  housing_affordability: "both",
  congressional_accountability: "both",
};

/** Jurisdiction lean for an issue id; unknown ids lean "both" (never hidden). */
export function getIssueLevel(canonicalIssue: string): IssueLevel {
  return ISSUE_JURISDICTION_LEAN[canonicalIssue] ?? "both";
}

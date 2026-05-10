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

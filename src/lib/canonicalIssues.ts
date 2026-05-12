/**
 * Canonical issue taxonomy for Phase 6.
 * This list is frozen for the experiment — frameworks decide UI presentation, not taxonomy.
 */

export interface CanonicalIssue {
  key: string; // slug used in data-testid and storage keys
  label: string; // English display label
}

export const CANONICAL_ISSUES: readonly CanonicalIssue[] = Object.freeze([
  { key: "economy-jobs", label: "Economy & Jobs" },
  { key: "healthcare", label: "Healthcare" },
  { key: "education", label: "Education" },
  { key: "climate-environment", label: "Climate & Environment" },
  { key: "housing", label: "Housing" },
  { key: "crime-public-safety", label: "Crime & Public Safety" },
  { key: "immigration", label: "Immigration" },
  { key: "reproductive-rights", label: "Reproductive Rights" },
  { key: "civil-rights-equality", label: "Civil Rights & Equality" },
  { key: "gun-policy", label: "Gun Policy" },
  { key: "foreign-policy", label: "Foreign Policy" },
  { key: "voting-rights-democracy", label: "Voting Rights & Democracy" },
]);

/** Map from English label → slug key */
export const LABEL_TO_KEY: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(CANONICAL_ISSUES.map((i) => [i.label, i.key])),
);

/** Map from slug key → English label */
export const KEY_TO_LABEL: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(CANONICAL_ISSUES.map((i) => [i.key, i.label])),
);

/** Returns the canonical keys in default order */
export function defaultIssueOrder(): string[] {
  return CANONICAL_ISSUES.map((i) => i.key);
}

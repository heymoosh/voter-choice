/**
 * Canonical issue taxonomy for Phase 6.
 * This list is frozen for the experiment — do not add, remove, or reorder.
 */

export interface CanonicalIssue {
  key: string; // human-readable key
  slug: string; // URL-safe slug
}

export const CANONICAL_ISSUES: CanonicalIssue[] = [
  { key: "Economy & Jobs", slug: "economy-jobs" },
  { key: "Healthcare", slug: "healthcare" },
  { key: "Education", slug: "education" },
  { key: "Climate & Environment", slug: "climate-environment" },
  { key: "Housing", slug: "housing" },
  { key: "Crime & Public Safety", slug: "crime-public-safety" },
  { key: "Immigration", slug: "immigration" },
  { key: "Reproductive Rights", slug: "reproductive-rights" },
  { key: "Civil Rights & Equality", slug: "civil-rights-equality" },
  { key: "Gun Policy", slug: "gun-policy" },
  { key: "Foreign Policy", slug: "foreign-policy" },
  { key: "Voting Rights & Democracy", slug: "voting-rights-democracy" },
] as const;

/** Map issue key → slug */
export function issueKeyToSlug(key: string): string {
  const issue = CANONICAL_ISSUES.find((i) => i.key === key);
  return issue?.slug ?? key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Map issue slug → key */
export function issueSlugToKey(slug: string): string | undefined {
  return CANONICAL_ISSUES.find((i) => i.slug === slug)?.key;
}

/** Return the top N issue keys from an ordered list. */
export function topPriorities(ordered: string[], n = 3): string[] {
  return ordered.slice(0, n);
}

// ---- Types -----------------------------------------------------------------

export type RankedIssues = {
  ordered: string[]; // canonical issue keys, top priority first
  skipped: boolean;
  timestamp: string; // ISO-8601, browser-local
};

export type ConfirmedConcerns = {
  freeText: string | null;
  confirmedIssues: string[]; // canonical keys the user checked
  skipped: boolean;
};

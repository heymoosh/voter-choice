/**
 * Canonical issue taxonomy for Phase 6.
 * This list is FROZEN for the experiment — do not add, remove, or rename.
 */

export type CanonicalIssue = {
  key: string; // display label (used in prompts)
  slug: string; // kebab-case for data-testid and Redis keys
};

export const CANONICAL_ISSUES: readonly CanonicalIssue[] = Object.freeze([
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
]);

export function slugForIssue(key: string): string {
  const found = CANONICAL_ISSUES.find((i) => i.key === key);
  return found?.slug ?? key.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function issueForSlug(slug: string): string | null {
  const found = CANONICAL_ISSUES.find((i) => i.slug === slug);
  return found?.key ?? null;
}

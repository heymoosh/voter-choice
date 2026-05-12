/**
 * Canonical issue taxonomy for Phase 6 issue ranking and concern disambiguation.
 * This list is frozen for the experiment — frameworks decide UI presentation, not taxonomy.
 */

export type IssueKey =
  | "economy-jobs"
  | "healthcare"
  | "education"
  | "climate-environment"
  | "housing"
  | "crime-public-safety"
  | "immigration"
  | "reproductive-rights"
  | "civil-rights-equality"
  | "gun-policy"
  | "foreign-policy"
  | "voting-rights-democracy";

export interface CanonicalIssue {
  key: IssueKey;
  label: string;
  slug: string;
}

export const CANONICAL_ISSUES: readonly CanonicalIssue[] = Object.freeze([
  { key: "economy-jobs", label: "Economy & Jobs", slug: "economy-jobs" },
  { key: "healthcare", label: "Healthcare", slug: "healthcare" },
  { key: "education", label: "Education", slug: "education" },
  {
    key: "climate-environment",
    label: "Climate & Environment",
    slug: "climate-environment",
  },
  { key: "housing", label: "Housing", slug: "housing" },
  {
    key: "crime-public-safety",
    label: "Crime & Public Safety",
    slug: "crime-public-safety",
  },
  { key: "immigration", label: "Immigration", slug: "immigration" },
  {
    key: "reproductive-rights",
    label: "Reproductive Rights",
    slug: "reproductive-rights",
  },
  {
    key: "civil-rights-equality",
    label: "Civil Rights & Equality",
    slug: "civil-rights-equality",
  },
  { key: "gun-policy", label: "Gun Policy", slug: "gun-policy" },
  { key: "foreign-policy", label: "Foreign Policy", slug: "foreign-policy" },
  {
    key: "voting-rights-democracy",
    label: "Voting Rights & Democracy",
    slug: "voting-rights-democracy",
  },
]);

/**
 * Output type when the user finishes ranking (or skips).
 */
export type RankedIssues = {
  ordered: string[]; // canonical issue keys, top priority first
  skipped: boolean;
  timestamp: string; // ISO-8601, browser-local
};

/**
 * Output type after concern disambiguation.
 */
export type ConfirmedConcerns = {
  freeText: string | null;
  confirmedIssues: string[]; // canonical keys the user checked
  skipped: boolean;
};

/**
 * Returns the top N issues from a RankedIssues object.
 */
export function getTopIssues(ranked: RankedIssues, n = 3): string[] {
  if (ranked.skipped || ranked.ordered.length === 0) return [];
  return ranked.ordered.slice(0, n);
}

/**
 * Returns the label for a given issue key.
 */
export function getIssueLabel(keyOrSlug: string): string {
  const found = CANONICAL_ISSUES.find(
    (i) => i.key === keyOrSlug || i.slug === keyOrSlug,
  );
  return found?.label ?? keyOrSlug;
}

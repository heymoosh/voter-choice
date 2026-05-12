// Canonical issue taxonomy — frozen for this experiment
// DO NOT modify this list during Phase 6 implementation

export interface CanonicalIssue {
  slug: string;
  label: string;
}

export const CANONICAL_ISSUES: readonly CanonicalIssue[] = Object.freeze([
  { slug: "economy-jobs", label: "Economy & Jobs" },
  { slug: "healthcare", label: "Healthcare" },
  { slug: "education", label: "Education" },
  { slug: "climate-environment", label: "Climate & Environment" },
  { slug: "housing", label: "Housing" },
  { slug: "crime-public-safety", label: "Crime & Public Safety" },
  { slug: "immigration", label: "Immigration" },
  { slug: "reproductive-rights", label: "Reproductive Rights" },
  { slug: "civil-rights-equality", label: "Civil Rights & Equality" },
  { slug: "gun-policy", label: "Gun Policy" },
  { slug: "foreign-policy", label: "Foreign Policy" },
  { slug: "voting-rights-democracy", label: "Voting Rights & Democracy" },
]);

export interface RankedIssues {
  ordered: string[]; // canonical issue slugs, top priority first
  skipped: boolean;
  timestamp: string; // ISO-8601, browser-local
}

export interface ConfirmedConcerns {
  primaryIssues: string[]; // canonical issue slugs confirmed by user
  originalText: string; // user's free-text input
  rationale: string; // AI rationale
  skipped: boolean;
}

/** Get the label for a canonical issue slug */
export function getIssueLabel(slug: string): string {
  return CANONICAL_ISSUES.find((i) => i.slug === slug)?.label ?? slug;
}

/** Get the top N ranked issues (labels) from a RankedIssues object */
export function getTopIssues(ranking: RankedIssues, n = 3): string[] {
  if (ranking.skipped) return [];
  return ranking.ordered.slice(0, n).map(getIssueLabel);
}

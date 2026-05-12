/**
 * RankedIssues type and helpers for Phase 6 issue ranking.
 * No client-side persistence — ranking lives in React state only.
 */

export interface RankedIssues {
  ordered: string[]; // canonical issue keys, top priority first
  skipped: boolean;
  timestamp: string; // ISO-8601
}

/** Create a default (unranked/skipped) RankedIssues object */
export function makeSkippedRanking(): RankedIssues {
  return {
    ordered: [],
    skipped: true,
    timestamp: new Date().toISOString(),
  };
}

/** Create a confirmed ranking from an ordered list of issue keys */
export function makeRankedIssues(orderedKeys: string[]): RankedIssues {
  return {
    ordered: orderedKeys,
    skipped: false,
    timestamp: new Date().toISOString(),
  };
}

/** Returns the top-N keys from a RankedIssues (or empty array if skipped) */
export function getTopPriorities(ranking: RankedIssues, n = 3): string[] {
  if (ranking.skipped) return [];
  return ranking.ordered.slice(0, n);
}

/**
 * Build the [VOTER VALUES] structured block for the copy-paste prompt.
 */
export function buildVoterValuesBlock(ranking: RankedIssues): string {
  if (ranking.skipped) return "";
  const top = getTopPriorities(ranking, 3);
  return `[VOTER VALUES]
${JSON.stringify({ rankedIssues: ranking.ordered, topPriorities: top }, null, 2)}
[/VOTER VALUES]`;
}

/**
 * Build the inline ranked-issues context for the chat system prompt.
 */
export function buildRankedIssuesPromptSection(ranking: RankedIssues): string {
  if (ranking.skipped) return "";
  const top = getTopPriorities(ranking, 3);
  return `\n\nVOTER'S RANKED PRIORITIES (most important first):\n${ranking.ordered.map((k, i) => `${i + 1}. ${k}`).join("\n")}\n\nTop 3 key priorities: ${top.join(", ")}`;
}

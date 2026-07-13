// Shared derivation for the voting-history panel's issue groups.
//
// The user's locked issues are ONE list that must read identically on every
// surface that claims to be "your issues" (issue-consistency invariant —
// e2e/redesign-issue-consistency.spec.ts). The overview card and the deep
// card already derive their per-issue rows from the user's (level-scoped)
// list via seatIssueAlignmentRows (delegationData.ts). AllVotesPanel used to
// be the odd one out: it reconstructed its issue groups from whatever
// alignment scores happened to carry contributingVotes — a set derived from
// the MEMBER'S votes, not from the user's list — so its issues could be a
// different set than the card rows sitting behind it (an issue with no
// matched roll-call votes vanished; a scored issue outside the seat's level
// scope could appear). This module gives the panel the same contract as the
// card rows: one group per user issue, in the user's order, labeled with the
// user's own interpretation, with the member's votes JOINED ON — never the
// other way around.
//
// Runtime-dependency-free on purpose (type-only import): consumed by
// src/prototype/VoterChoiceApp.tsx (legacy+shared tree) as well as the
// redesign tree, and keeping this a leaf module makes an import cycle
// through VoterChoiceApp impossible.

import type { UserIssue } from "./delegationData";

export interface ContributingVoteLike {
  billTitle?: string;
  voteCast?: string;
  date?: string;
  narrative?: string;
  source?: { name: string; url: string };
}

export interface AlignmentScoreLike {
  canonicalIssue?: string;
  issueLabel?: string;
  kept?: number;
  total?: number;
  contributingVotes?: ContributingVoteLike[];
}

export interface VoteGroup {
  /** Stable identity for React keys and the panel's per-issue filter chips.
   *  canonicalIssue when mapped; interpretation-derived for custom issues. */
  key: string;
  canonicalIssue: string | null;
  /** The user's own wording — same label source as the card's alignment
   *  rows (seatIssueAlignmentRows uses issue.interpretation too). */
  issueLabel: string;
  kept: number | null;
  total: number | null;
  votes: Array<ContributingVoteLike & { key: string }>;
}

/**
 * One group per user issue — the user's set, order, and labels are preserved
 * unconditionally (conservation); votes join on canonicalIssue. Issues with
 * no matched votes come back with `votes: []` so the panel can show an
 * honest empty state instead of silently dropping them. Scores for issues
 * NOT in `userIssues` are ignored — on a level-scoped seat surface, an
 * out-of-scope issue must be absent everywhere, not just on the card rows.
 */
export function voteGroupsForUserIssues(
  userIssues: Array<Pick<UserIssue, "canonicalIssue" | "interpretation">>,
  scores: AlignmentScoreLike[] | null | undefined,
): VoteGroup[] {
  const scoreList = scores || [];
  return (userIssues || []).map((issue, i) => {
    const score = issue.canonicalIssue
      ? scoreList.find((s) => s.canonicalIssue === issue.canonicalIssue)
      : undefined;
    const key = issue.canonicalIssue || `custom-${i}`;
    return {
      key,
      canonicalIssue: issue.canonicalIssue ?? null,
      issueLabel: issue.interpretation,
      kept: typeof score?.kept === "number" ? score.kept : null,
      total: typeof score?.total === "number" ? score.total : null,
      votes: (score?.contributingVotes || []).map((v, vi) => ({
        ...v,
        key: `${key}-${vi}`,
      })),
    };
  });
}

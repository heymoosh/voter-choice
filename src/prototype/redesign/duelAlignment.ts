/**
 * src/prototype/redesign/duelAlignment.ts
 *
 * Per-issue alignment math for the head-to-head candidate duel (the "Time to
 * replace" flow). Produces, for the incumbent and a selected challenger, a
 * 0–100 percentage PER USER ISSUE so the design's Δ ledger can render
 * incumbent-vs-challenger with an honest delta.
 *
 * Two provenance paths, NEVER blended (the design's locked rule):
 *   - voting_record (roll-call): pct = round(kept / total * 100) per issue.
 *   - web_search (researched): there is NO numeric vote record — only a
 *     directional resolvedStance + a confidence chip. We map the directional
 *     read onto a representative band so the ledger bar can render, and we tag
 *     the row's basis "researched" so the UI never presents it as a vote tally.
 *     Honesty rule (HANDOFF §2d): unclear / missing → null (unknown), never a
 *     fabricated number.
 *
 * All functions are pure over AlignmentScore[] so they unit-test cleanly and
 * reuse the exact shapes RepCard already renders (seat.alignmentEntry.scores
 * for the incumbent, getChallengerResearch().scores for a challenger).
 */

import type { AlignmentScore } from "../realData";
import type { UserIssue } from "./delegationData";

export type AlignBasis = "roll-call" | "researched";

/** A single issue's alignment for one candidate. pct === null ⇒ honest
 *  unknown (thin/no record) — the UI shows "no record", never 0%/a guess. */
export interface IssueAlignment {
  /** 0–100, or null for an honest unknown (no scoreable record). */
  pct: number | null;
  basis: AlignBasis;
}

/**
 * Representative bands for a directional (researched) read. These are NOT a
 * precise score — they exist so the duel bar has a position; the row is always
 * labeled "researched" so the reader knows it's a directional read, not votes.
 */
const RESEARCHED_BAND: Record<string, number | null> = {
  in_favor: 80,
  opposed: 20,
  mixed: 50,
  unclear: null,
};

/** Per-issue percentage for one AlignmentScore (roll-call OR researched). */
export function issueAlignment(
  score: AlignmentScore | undefined,
): IssueAlignment | null {
  if (!score) return null;
  if (score.sourceType === "web_search") {
    const stance = (score.resolvedStance || "").toLowerCase();
    const pct = stance in RESEARCHED_BAND ? RESEARCHED_BAND[stance] : null;
    return { pct, basis: "researched" };
  }
  // voting_record
  if (
    typeof score.kept === "number" &&
    typeof score.total === "number" &&
    score.total > 0
  ) {
    return {
      pct: Math.round((score.kept / score.total) * 100),
      basis: "roll-call",
    };
  }
  return { pct: null, basis: "roll-call" };
}

/** Aggregate alignment across all scoreable rows, 0–100, or null when nothing
 *  is scoreable. Roll-call uses Σkept/Σtotal (vote-weighted, matching
 *  seatAlignmentPct); researched uses the mean of its directional bands. */
export function overallAlignment(scores: AlignmentScore[] | null | undefined): {
  pct: number | null;
  basis: AlignBasis;
} {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { pct: null, basis: "roll-call" };
  }
  const researched = scores.some((s) => s?.sourceType === "web_search");
  if (researched) {
    const bands = scores
      .map((s) => issueAlignment(s)?.pct)
      .filter((p): p is number => typeof p === "number");
    if (bands.length === 0) return { pct: null, basis: "researched" };
    return {
      pct: Math.round(bands.reduce((a, b) => a + b, 0) / bands.length),
      basis: "researched",
    };
  }
  let kept = 0;
  let total = 0;
  for (const s of scores) {
    if (
      s &&
      typeof s.kept === "number" &&
      typeof s.total === "number" &&
      s.total > 0
    ) {
      kept += s.kept;
      total += s.total;
    }
  }
  if (total === 0) return { pct: null, basis: "roll-call" };
  return { pct: Math.round((kept / total) * 100), basis: "roll-call" };
}

export interface LedgerRow {
  canonicalIssue: string | undefined;
  label: string;
  inc: IssueAlignment | null;
  ch: IssueAlignment | null;
  /** challenger − incumbent, or null when either side is unknown. */
  delta: number | null;
}

/** Find an issue's score by canonical id (falling back to label). */
function findScore(
  scores: AlignmentScore[] | null | undefined,
  issue: UserIssue,
): AlignmentScore | undefined {
  if (!Array.isArray(scores)) return undefined;
  if (issue.canonicalIssue) {
    const byId = scores.find((s) => s.canonicalIssue === issue.canonicalIssue);
    if (byId) return byId;
  }
  return scores.find((s) => s.issueLabel === issue.interpretation);
}

/**
 * Build the Δ ledger over the USER'S issues (their order), pairing the
 * incumbent's per-issue alignment against the challenger's. Either side may be
 * null (no record) — the UI renders an honest "no record" state and the delta
 * is suppressed.
 */
export function buildLedger(
  incumbentScores: AlignmentScore[] | null | undefined,
  challengerScores: AlignmentScore[] | null | undefined,
  userIssues: UserIssue[],
): LedgerRow[] {
  return (userIssues || []).map((issue) => {
    const inc = issueAlignment(findScore(incumbentScores, issue));
    const ch = issueAlignment(findScore(challengerScores, issue));
    const delta = inc?.pct != null && ch?.pct != null ? ch.pct - inc.pct : null;
    return {
      canonicalIssue: issue.canonicalIssue,
      label: issue.interpretation,
      inc,
      ch,
      delta,
    };
  });
}

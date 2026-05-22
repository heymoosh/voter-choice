/**
 * Phase 6 — mid-session theme amendment verdict logic.
 *
 * After the user locks an amendment, the theme-amendment prompt returns a
 * per-race old/new score pair. This module decides which races should surface
 * a REVISIT tag, which should HOLD (silent), and which are N/A (propositions
 * have no candidates to re-rank against — props use if-yes/if-no logic that
 * isn't theme-weighted).
 *
 * Pure function — no I/O, no side effects. Lifted out of any JSX so the rules
 * are testable directly. The packet calls these out as load-bearing and
 * non-negotiable:
 *
 *   · "REVISIT" iff (oldScore - newScore) >= 5 AND another candidate in that
 *     race scores STRICTLY higher than the active pick under the new ranking.
 *   · "HOLD" otherwise.
 *   · "N/A" for propositions, regardless of the score deltas.
 *
 * The "strictly higher" part is intentional: an exact tie keeps the verdict
 * as HOLD. Tested in `decide-verdict.test.ts`.
 *
 * See: .ai/work-packets/redesign-phase-6-mid-session-theme-amendment.md
 */

export interface RescoredRace {
  raceId: string;
  raceLabel: string;
  raceType: "choice" | "proposition";
  /** Active pick's score under the OLD theme ranking. */
  oldScore: number;
  /** Active pick's score under the NEW theme ranking. */
  newScore: number;
  /**
   * Post-amendment scores for the other candidates in this race. Empty for
   * propositions (no candidates to rank) and empty in v1 when the runtime
   * lacks per-candidate rescore data — see ChatPanel's amendment handler for
   * the fallback path that uses the prompt's `verdict` hint when this list
   * is empty.
   */
  otherCandidateScores: number[];
}

export type Verdict = "REVISIT" | "HOLD" | "N/A";

export interface VerdictDecision {
  raceId: string;
  raceLabel: string;
  oldScore: number;
  newScore: number;
  verdict: Verdict;
  /** Signed integer change: newScore - oldScore. Negative when dropped. */
  delta: number;
}

/** Drop threshold (points) below which a REVISIT cannot fire. */
const REVISIT_DROP_THRESHOLD = 5;

export function decideVerdict(race: RescoredRace): VerdictDecision {
  const delta = race.newScore - race.oldScore;
  const base = {
    raceId: race.raceId,
    raceLabel: race.raceLabel,
    oldScore: race.oldScore,
    newScore: race.newScore,
    delta,
  };

  if (race.raceType === "proposition") {
    return { ...base, verdict: "N/A" };
  }

  const dropped = race.oldScore - race.newScore;
  const someoneStrictlyHigher = race.otherCandidateScores.some(
    (s) => s > race.newScore,
  );

  if (dropped >= REVISIT_DROP_THRESHOLD && someoneStrictlyHigher) {
    return { ...base, verdict: "REVISIT" };
  }
  return { ...base, verdict: "HOLD" };
}

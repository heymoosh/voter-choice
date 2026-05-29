/**
 * Phase 6 — mid-session theme amendment verdict logic.
 *
 * After the user locks an amendment (a new priority theme), the
 * theme-amendment prompt reports, per decided race, whether the new theme is
 * RELEVANT to that race. This module decides which races should surface a
 * REVISIT tag ("your new priority bears on this race — take another look"),
 * which should HOLD (silent), and which are N/A (propositions use
 * if-yes/if-no logic that isn't theme-weighted).
 *
 * D-1 (acceptance contract, current-app-inventory.md:120): the app takes a
 * deliberate nonpartisan stance — NO aggregate alignment score, NO
 * cross-candidate ranking, NO "best match." So the verdict is a per-issue
 * *relevance* signal only. We never compute a score drop, never compare
 * candidates against each other, and never assert that another candidate is a
 * better choice. The nudge only says the issue the user just flagged shows up
 * in this race.
 *
 * Pure function — no I/O, no side effects. Lifted out of any JSX so the rules
 * are testable directly:
 *
 *   · "N/A"     for propositions, regardless of relevance.
 *   · "REVISIT" when the new theme is relevant to a (candidate) race.
 *   · "HOLD"    otherwise.
 *
 * Tested in `decide-verdict.test.ts`.
 *
 * See: .ai/work-packets/redesign-phase-6-mid-session-theme-amendment.md
 */

export interface RescoredRace {
  raceId: string;
  raceLabel: string;
  raceType: "choice" | "proposition";
  /**
   * Whether the newly added priority theme is relevant to this race — i.e. the
   * issue the user just flagged actually bears on the contest.
   *
   * D-1: this is a per-issue *relevance* signal only. There is no aggregate
   * alignment score, no comparison of candidates against one another, and no
   * claim that some other candidate is a "better match." In v1 the value comes
   * from the amendment prompt's per-race verdict (see ChatPanel's amendment
   * handler), which itself is instructed to judge relevance, not ranking.
   */
  relevantToNewTheme: boolean;
}

export type Verdict = "REVISIT" | "HOLD" | "N/A";

export interface VerdictDecision {
  raceId: string;
  raceLabel: string;
  verdict: Verdict;
}

export function decideVerdict(race: RescoredRace): VerdictDecision {
  const base = {
    raceId: race.raceId,
    raceLabel: race.raceLabel,
  };

  // Propositions have no candidate to revisit against — they use if-yes/if-no
  // logic that isn't theme-weighted.
  if (race.raceType === "proposition") {
    return { ...base, verdict: "N/A" };
  }

  // D-1-compliant: flag a race for REVISIT purely on per-issue relevance —
  // never on a score drop and never on a cross-candidate ranking.
  return { ...base, verdict: race.relevantToNewTheme ? "REVISIT" : "HOLD" };
}

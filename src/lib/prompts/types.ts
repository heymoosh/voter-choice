/**
 * Shared types for the v2 prompt fleet.
 *
 * These shapes are sketches — many of them are consumed by phases that haven't
 * landed yet (Phase 5 party gate emits BallotContext; Phase 6 amend flow
 * triggers RouterTrigger="amend-from-rail"). Defining them here gives
 * downstream phases a stable target without forcing them to land in the same
 * change. See .ai/work-packets/redesign-phase-1-prompt-refactor.md.
 */

/**
 * BallotContext is the shape that Phase 5's state party-gate component
 * emits into the chat route. The gate-table's per-option `ballotTag` field
 * is a free-form string (e.g. "DEM-runoff", "REP-runoff-open", "GENERAL",
 * "UNSURE") so adding a new state never has to widen an enum.
 *
 * PII rule: only state, county, ballotTag, electionDate, electionLabel may
 * reach the model. The serializer at src/lib/state-rules/ballot-context.ts
 * is the chokepoint that enforces this.
 *
 * This shape is re-exported as `SerializableBallotContext` from
 * src/lib/state-rules/ballot-context.ts — the two are intentionally the
 * same; the local copy there ensures the serializer's input contract is
 * frozen independently of any future widening of this prompts-side type.
 */
export interface BallotContext {
  /** Two-letter US state code (e.g. "TX", "CA"). Uppercase. */
  state: string;

  /** County name as resolved by the civic API or zip-based lookup. */
  county?: string;

  /**
   * Ballot tag emitted by the state-rules table on user gate selection.
   * Free-form by design — keys are owned by the rules table.
   */
  ballotTag: string;

  /** ISO date (YYYY-MM-DD) for the election the user is researching. */
  electionDate: string;

  /** Human-readable election label (e.g. "2026 Texas Primary Runoff"). */
  electionLabel: string;
}

/**
 * Theme is the unit of voter priority extracted from free-form cold-open text.
 * Matches the JSON shape returned by the theme-extraction prompt.
 */
export interface Theme {
  /** Short neutral noun phrase (3–7 words). No advocacy verbs, no party labels. */
  name: string;

  /** 1–2 verbatim phrases from the user's message that grounded this theme. */
  quotes: string[];

  /**
   * Canonical issue id mapped from the voter's words (e.g. "insulin keeps
   * going up" → "healthcare_affordability"). The LLM does the language
   * understanding here — mapping free text to a known vocabulary — it does
   * NOT produce any card content. Consumed by the deterministic
   * `/api/race-data` endpoint, which passes it to `lookupAlignment` to score
   * each candidate's voting record against this issue.
   *
   * Optional: a theme whose words don't map cleanly to the canonical
   * vocabulary leaves this unset, and alignment for that issue degrades to
   * "no data" rather than scoring against a wrong issue. Must be one of the
   * ids in `src/lib/canonicalIssues.ts` when present.
   */
  canonicalIssue?: string;

  /**
   * The voter's stance on this issue, used by `lookupAlignment` to decide
   * which votes count as "with" vs "against" the voter. "in_favor"/"opposed"
   * are the FIXED per-issue poles from `poleVocabulary.ts`, NOT "good vs bad".
   *
   * Optional, and deliberately so: for a CONTESTED issue (12 of 16) whose
   * concern is value-only and doesn't pick a side ("I care about guns"), the
   * extraction prompt now OMITS stance rather than guessing — alignment for
   * that issue degrades to an honest no-score instead of being scored against
   * a guessed pole. For a valence_dominant issue an aspirational concern still
   * resolves to "in_favor". The live tool path (chat route → lookupAlignment)
   * treats an absent stance as no-score; do NOT re-introduce an in_favor
   * default for a missing stance on a contested issue.
   */
  stance?: "in_favor" | "opposed";

  /**
   * Optional topic facet beneath `canonicalIssue` (e.g. "drug_prices" under
   * "healthcare_affordability"). Inherits the parent's pole axis — it adds NO
   * new direction, only narrows which votes count. Must be a valid sub-issue
   * for the parent (see `src/lib/alignment/subIssues.ts`); the parser drops it
   * otherwise. Lets scoring prefer facet-specific votes and fall back to the
   * parent issue when sparse.
   */
  subIssue?: string;
}

/**
 * The view the user is currently in. The router uses this (plus RaceType and
 * RouterTrigger) to pick which task prompt to send.
 */
export type RouterView =
  | "cold-open"
  | "workspace-race"
  | "workspace-prop"
  | "amend"
  | "handoff";

/** Whether the active race is a candidate choice or a ballot proposition. */
export type RaceType = "choice" | "proposition";

/**
 * What kicked off the current router call. Some triggers (amend-from-rail,
 * handoff-button, budget-exhausted) override the view-based default; others
 * (user-message) flow through normally.
 */
export type RouterTrigger =
  | "amend-from-rail"
  | "amend-from-chat"
  | "handoff-button"
  | "budget-exhausted"
  | "user-message";

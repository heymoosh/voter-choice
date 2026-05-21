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
 * BallotContext is the shape that Phase 5's state party-gate component will
 * emit into the chat route. Phase 1 defines the surface so the prompt fleet
 * has a typed target; the gate itself ships in Phase 5.
 *
 * NOTE: This is a sketch for Phase 5. Fields may grow (e.g. precinct, ballot
 * issuer) when the party gate spec lands — additions should be backward
 * compatible.
 */
export interface BallotContext {
  /** Two-letter US state code (e.g. "TX", "CA"). Uppercase. */
  state: string;

  /** City name as the user entered it. Only city + state are ever injected. */
  city: string;

  /**
   * Ballot variant for this election. "primary-dem" / "primary-rep" / "primary-open"
   * disambiguate party-specific primaries; "primary" is the generic fallback when
   * party hasn't yet been gated.
   */
  ballotType:
    | "primary"
    | "general"
    | "runoff"
    | "primary-dem"
    | "primary-rep"
    | "primary-open";

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

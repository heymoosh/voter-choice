/**
 * Types for the state-rules lookup (Phase 5 — state party gates).
 *
 * Adding a new state's party-gate behavior is a data change (a row in
 * rules.ts), never code branches inside components. These types lock that
 * discipline: every rule looks the same shape regardless of state.
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

/** The kind of election the gate evaluates against. */
export type ElectionType = "primary" | "runoff" | "general" | "special";

/**
 * High-level category — drives how the gate behaves (with-options vs.
 * registration-driven blocking vs. no gate). Mirrors the design brief §13.
 */
export type StateRuleCategory = "open" | "semi-closed" | "closed" | "top-two";

/** A single option in a multi-choice gate (e.g. TX runoff's 5 lanes). */
export interface GateOption {
  /** Stable id for this option (used as the radio value). */
  id: string;
  /** User-visible label (e.g. "I voted in the Democratic primary."). */
  label: string;
  /**
   * Ballot tag injected into `<ballot_context>` on selection (e.g.
   * "DEM-runoff", "REP-runoff-open", "GENERAL"). Free-form by design —
   * keys are owned by the rules table, not the BallotContext.ballotType
   * enum, so adding a new state doesn't widen any enum.
   */
  ballotTag: string;
  /**
   * If true, this option triggers the AI-clarification flow instead of
   * committing a selection. Used for "I'm not sure" rows.
   */
  clarification?: boolean;
}

/** Statute citation backing the gate rule. Surfaced in the gate UI. */
export interface StateRuleStatute {
  /** Citation code (e.g. "Tex. Elec. Code §172.087"). */
  code: string;
  /** One-sentence factual restatement of the rule (no advocacy). */
  text: string;
  /** Optional canonical URL (state legislature / SOS). */
  url?: string;
}

/**
 * Path shown for unaffiliated voters in closed states (e.g. PA primary).
 * Renders an explicit "you cannot vote this primary" panel with re-reg link.
 */
export interface UnaffiliatedPath {
  /** Explanatory text shown to unaffiliated voters. */
  message: string;
  /** State SOS registration page (canonical URL). */
  reregistrationUrl: string;
  /** Allow "skip primary, show general context" continuation. */
  canSkipToGeneral?: boolean;
}

/**
 * One rule in the table, keyed by `(state, electionType)`. Either
 * `options` (with-choice gate) or `unaffiliatedPath` (registration-driven
 * blocking) — or both, in closed states where registered voters get a
 * party-locked ballot and unaffiliated voters see the graceful blocker.
 */
export interface StateRule {
  /** 2-letter US state code (uppercase). */
  state: string;
  electionType: ElectionType;
  category: StateRuleCategory;
  statute: StateRuleStatute;
  /**
   * Options for the user. Omit (or empty) for closed-state rules where
   * the choice is determined by registration, not user selection.
   */
  options?: GateOption[];
  /**
   * Unaffiliated path for closed states. Present when the rule needs a
   * "you cannot vote this primary" branch.
   */
  unaffiliatedPath?: UnaffiliatedPath;
}

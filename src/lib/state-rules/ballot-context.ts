/**
 * Serializer: BallotContext → `<ballot_context>` tag string for injection
 * into chat system prompts.
 *
 * PII rule (safety header §3): only state, county, ballotTag, electionDate,
 * electionLabel may reach the model. Everything else gets dropped silently —
 * this serializer is the chokepoint. Callers that hand in extra fields by
 * accident still produce a safe output.
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

/**
 * The subset of BallotContext we actually serialize. Kept as a local
 * interface (not imported from src/lib/prompts/types) so that adding new
 * fields to the prompts-side type CANNOT accidentally widen what reaches
 * the model — they have to opt in here explicitly.
 */
export interface SerializableBallotContext {
  /** 2-letter US state code (uppercased on output). */
  state: string;
  /** County name (e.g. "Harris"). Optional. */
  county?: string;
  /** Ballot tag from the gate selection (e.g. "DEM-runoff", "GENERAL"). */
  ballotTag: string;
  /** ISO date (YYYY-MM-DD) for the target election. */
  electionDate: string;
  /** Human-readable election label (e.g. "2026 Texas Primary Runoff"). */
  electionLabel: string;
}

/** Serialize into the canonical `<ballot_context>…</ballot_context>` tag. */
export function serializeBallotContext(ctx: SerializableBallotContext): string {
  const lines: string[] = [];
  const stateUpper = (ctx.state || "").toUpperCase();
  if (stateUpper) lines.push(`  state: ${stateUpper}`);
  if (ctx.county && ctx.county.trim().length > 0) {
    lines.push(`  county: ${ctx.county}`);
  }
  if (ctx.ballotTag) lines.push(`  ballot: ${ctx.ballotTag}`);
  if (ctx.electionDate) lines.push(`  electionDate: ${ctx.electionDate}`);
  if (ctx.electionLabel) lines.push(`  electionLabel: ${ctx.electionLabel}`);
  return `<ballot_context>\n${lines.join("\n")}\n</ballot_context>`;
}

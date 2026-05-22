/**
 * Lookup against the state-rules table. Pure: every state-conditional
 * branch lives in the table, not in this function.
 *
 * Returns null when the (state, electionType) pair has no row — that's
 * the "no gate" sentinel. Callers should treat null as "skip PartyGate
 * and route straight to cold open".
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import { STATE_RULES } from "./rules";
import type { ElectionType, StateRule } from "./types";

/**
 * Look up the rule for a given state + election type. State is normalised
 * to uppercase; everything else matches exactly.
 */
export function getStateRule(
  state: string,
  electionType: ElectionType,
): StateRule | null {
  if (typeof state !== "string" || state.length === 0) return null;
  const normalizedState = state.toUpperCase();
  const match = STATE_RULES.find(
    (rule) =>
      rule.state === normalizedState && rule.electionType === electionType,
  );
  return match ?? null;
}

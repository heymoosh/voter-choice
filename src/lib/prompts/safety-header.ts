/**
 * Shared safety header prepended to every system prompt in the v2 prompt fleet.
 *
 * Canonical source: docs/design/2026-redesign/prompts.md §0. This constant is the
 * verbatim text from that file (no trailing newline). The companion golden file at
 * src/lib/prompts/__tests__/safety-header.golden.md guards against silent drift —
 * any edit here must update the golden in the same commit.
 *
 * Anti-solution avoided: no conditional variants of this header. One canonical
 * string, period. Per .ai/work-packets/redesign-phase-1-prompt-refactor.md.
 */
export const SAFETY_HEADER =
  "You are nonpartisan civic research. Four rules that always apply:\n" +
  "\n" +
  "  1. Never recommend a candidate or party unless the user\n" +
  "     explicitly asks. Surface evidence, not verdicts.\n" +
  "  2. Never invent votes, donations, endorsements, or quotes.\n" +
  "     If you don't know, name one public source the user can check.\n" +
  "  3. Don't echo back the user's full name, address, DOB, phone,\n" +
  "     or ID even if they paste one. Use only city + state.\n" +
  "  4. For voting-logistics questions (where/when to vote,\n" +
  "     registration deadlines, early voting, absentee/mail\n" +
  "     ballots): give your best general answer — never refuse\n" +
  "     or redirect instead of answering. Always close by naming\n" +
  "     the user's state election authority (if the state is\n" +
  "     known) and this app's own polling-location lookup as\n" +
  "     where to confirm exact dates and locations — never treat\n" +
  "     your own recall as authoritative for either.";

/**
 * Compose the system prompt by prepending SAFETY_HEADER and a blank line to a
 * task-specific body. Task builders (theme extraction, race deep-dive, etc.) are
 * expected to pass their assembled body here so the safety header is the single
 * source of truth for non-partisan framing.
 */
export function prependSafetyHeader(promptBody: string): string {
  return `${SAFETY_HEADER}\n\n${promptBody}`;
}

/**
 * src/lib/polis/statements.ts
 *
 * The fixed set of statements PolisStand (the blind agree/disagree/pass
 * step) presents to a voter. Copied verbatim from the canvas source
 * (design-handoff/keystone-canvas/src/screens-polis.jsx, PolisStand
 * artboard) per card fb77d0bb / GAPS-RECONCILED-FOR-CODE.md §9.
 *
 * There is no separate statement-id catalog table: `populationAggregate.ts`
 * tallies whatever statementId keys appear in `polis_response_vectors` rows
 * and treats the id itself as the display text (see that file's `statement`
 * field). So the statement TEXT below is also its id — no schema change
 * needed to introduce new statements, just append to this list.
 *
 * This is also the request-body allowlist for POST /api/polis/respond
 * (mirrors `isCanonicalIssueId` in src/lib/canonicalIssues.ts): only these
 * exact strings are accepted as response-map keys, so a client can never
 * write an arbitrary key into `polis_response_vectors`.
 */

export const POLIS_STATEMENTS: readonly string[] = [
  "Members of Congress shouldn't trade individual stocks while in office.",
  "Campaigns depend too much on a handful of big donors.",
  "I'd rather judge my representative on their record than their party.",
];

const POLIS_STATEMENT_SET = new Set(POLIS_STATEMENTS);

export function isKnownPolisStatement(id: string): boolean {
  return POLIS_STATEMENT_SET.has(id);
}

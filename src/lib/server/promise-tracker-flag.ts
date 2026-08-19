/**
 * src/lib/server/promise-tracker-flag.ts
 *
 * Single source of truth for the Part 5 promise-ledger display gate (rubric
 * §6.4). Rows in `candidate_promises` / `promise_actions` / `promise_verdicts`
 * are written by the extract/link/adjudicate pipeline as soon as they exist —
 * this flag is what keeps them invisible to voters until the ship gate
 * clears: on the pilot state's gold set, κ ≥ 0.70 on the human pair AND the
 * adjudicator matches the agreed human label on ≥ 90% of gold cases with
 * zero kept↔broken polarity flips (`scripts/ingest/_promise-gold-score.ts`).
 * Even a passing score does not flip this on by itself — Muxin signs off
 * regardless of the numbers (rubric §6.4).
 *
 * Design mirrors `./pac-transparency-flag.ts`: the gate lives here so any
 * future reader/route agrees, and the check is always a fresh `process.env`
 * read so `vi.stubEnv()` works in tests without re-importing. Truthiness is
 * STRICT (`=== "true"`) — the same rule as the LAUNCH_* convention in
 * `../launch-flags.ts` — so `PROMISE_TRACKER_ENABLED=false` reads as OFF
 * rather than as a non-empty string. The name stays ad-hoc (not `LAUNCH_*`)
 * to match the plan/rubric text, which names it verbatim.
 *
 * Server-only. Never import from client components.
 */

/**
 * Returns true only when PROMISE_TRACKER_ENABLED is exactly "true".
 * Unset, empty, "false", "1" or anything else is OFF — including in
 * production, where nothing sets it by default.
 */
export function isPromiseTrackerEnabled(): boolean {
  return process.env.PROMISE_TRACKER_ENABLED === "true";
}

/**
 * src/lib/server/billionaire-donor-flag.ts
 *
 * Display gate for billionaire_donor_contributions (db/schema.ts). The
 * matching pipeline (scripts/ingest/billionaire-donor-match.ts) writes rows —
 * including low-confidence, human-review-only matches — as soon as they
 * exist. This flag is what keeps them invisible to voters until a UI/design
 * decision is made about how to present them (deliberately out of scope for
 * the ingest work) and a human has reviewed the low-confidence rows.
 *
 * Design mirrors ./promise-tracker-flag.ts: the gate lives here so any future
 * reader/route agrees, and the check is always a fresh `process.env` read so
 * `vi.stubEnv()` works in tests without re-importing. Truthiness is STRICT
 * (`=== "true"`), same rule as the LAUNCH_* convention in ../launch-flags.ts.
 *
 * Server-only. Never import from client components.
 */

/**
 * Returns true only when BILLIONAIRE_DONOR_MATCH_ENABLED is exactly "true".
 * Unset, empty, "false", "1" or anything else is OFF — including in
 * production, where nothing sets it by default.
 */
export function isBillionaireDonorMatchEnabled(): boolean {
  return process.env.BILLIONAIRE_DONOR_MATCH_ENABLED === "true";
}

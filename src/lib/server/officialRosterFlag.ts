/**
 * src/lib/server/officialRosterFlag.ts
 *
 * Single source of truth for the official-state-roster feature gate.
 *
 * When enabled, `lookupChallengers` (races.ts) sources a contest's candidate
 * SET from `official_roster_candidates` (state Secretary-of-State data)
 * instead of FEC filings, wherever rows exist for that seat — see
 * docs/operations/arizona-vertical-slice-data-check.md. Set
 * OFFICIAL_ROSTER_ENABLED to any non-empty string to enable. Default (unset)
 * is false — zero behavior change.
 *
 * Design: mirrors can-flag.ts — a fresh process.env read on every call so
 * vi.stubEnv() takes effect in tests without re-importing the module.
 *
 * Server-only. Never import from client components.
 */

/**
 * Returns true if official-state-roster sourcing is enabled for this request.
 * True when OFFICIAL_ROSTER_ENABLED is any non-empty string; false otherwise.
 */
export function isOfficialRosterEnabled(): boolean {
  const v = process.env.OFFICIAL_ROSTER_ENABLED;
  return typeof v === "string" && v.length > 0;
}

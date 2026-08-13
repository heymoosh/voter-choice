/**
 * src/lib/server/pac-transparency-flag.ts
 *
 * Single source of truth for the Part 6 PAC-transparency display gate — the
 * ONE flag behind BOTH display blocks:
 *   6a "Top PACs and sponsors"      (src/lib/server/pac-sponsors.ts)
 *   6b "Outside spending about this race" (src/lib/server/outside-spending.ts)
 *
 * Both blocks read tables whose rows are hand-curatable
 * (`pac_committees.status` = auto | verified | rejected). Until a curation
 * pass has been run against real 2026 data, an auto-classified sponsor
 * attribution is a claim we do not want on a voter-facing card — hence
 * default-OFF, flipped deliberately.
 *
 * Design mirrors `./can-flag.ts`: the gate lives here so the route, the read
 * paths and any future surface all agree, and the check is always a fresh
 * `process.env` read so `vi.stubEnv()` works in tests without re-importing.
 * Truthiness is STRICT (`=== "true"`) — the same rule as the LAUNCH_*
 * convention in `../launch-flags.ts` — so `PAC_TRANSPARENCY_ENABLED=false`
 * reads as OFF rather than as a non-empty string. The name stays ad-hoc
 * (not `LAUNCH_*`) to match the existing display gates it sits beside.
 *
 * Server-only. Never import from client components.
 */

/**
 * Returns true only when PAC_TRANSPARENCY_ENABLED is exactly "true".
 * Unset, empty, "false", "1" or anything else is OFF — including in
 * production, where nothing sets it by default.
 */
export function isPacTransparencyEnabled(): boolean {
  return process.env.PAC_TRANSPARENCY_ENABLED === "true";
}

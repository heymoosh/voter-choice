/**
 * src/lib/server/can-flag.ts
 *
 * Single source of truth for the CAN2026 display-side feature gate.
 *
 * CAN2026 curated context (bill narratives, race ratings, donor trails, key-vote
 * prose) is gated until can2026.org attribution terms are confirmed with the
 * maintainer. Set CAN2026_DISPLAY_ENABLED to any non-empty string to enable.
 *
 * Design: the gate lives here so alignment.ts, race-data.ts, and the delegation
 * route all read the same logic. The check is always a fresh process.env read
 * so vi.stubEnv() stubs take effect in tests without re-importing the module.
 *
 * Server-only. Never import from client components.
 */

/**
 * Returns true if CAN2026 curated-context display is enabled for this request.
 * True when CAN2026_DISPLAY_ENABLED is any non-empty string; false otherwise.
 */
export function isCan2026DisplayEnabled(): boolean {
  const v = process.env.CAN2026_DISPLAY_ENABLED;
  return typeof v === "string" && v.length > 0;
}

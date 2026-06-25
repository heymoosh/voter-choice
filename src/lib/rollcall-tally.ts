/**
 * src/lib/rollcall-tally.ts
 *
 * Pure formatting utilities for roll-call tally data.
 * No DB access, no side effects — safe to import from any layer.
 */

/**
 * Format a tally line for display, e.g. "Passed 232–193".
 * Returns null when the required data is unavailable (honest fallback — callers
 * should hide the line rather than show a placeholder).
 *
 * Rules:
 *   - When result AND counts are present: "Passed 232–193"
 *   - When only result is present: "Passed"
 *   - When only counts are present: "232–193"
 *   - When neither: null
 *
 * The en-dash (–) is used instead of a hyphen per typography convention.
 * Present and not-voting counts are omitted from the short label; the raw
 * tally columns remain available in the DB for full-detail views.
 */
export function formatTallyLine(
  result: string | null | undefined,
  yea: number | null | undefined,
  nay: number | null | undefined,
): string | null {
  const hasResult =
    result != null && typeof result === "string" && result.trim() !== "";
  const hasCounts = yea != null && nay != null;

  if (!hasResult && !hasCounts) return null;
  if (hasResult && !hasCounts) return result!.trim();
  if (!hasResult && hasCounts) return `${yea}–${nay}`;
  return `${result!.trim()} ${yea}–${nay}`;
}

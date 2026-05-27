/**
 * Compute "today" as a `YYYY-MM-DD` string in the latest US timezone
 * (Hawaii / UTC-10) so an election stays "upcoming" through end-of-day in
 * the latest US zone.
 *
 * Why not `new Date().toISOString().split("T")[0]`?
 *   That returns a UTC date string. For a US voter on the day of a runoff
 *   (e.g. TX 2026-05-26) the moment local clocks pass 19:00 CDT, UTC is
 *   already 2026-05-27 — so the runoff drops out of `e.date >= today`
 *   filters and the runoff gate stops rendering. The Hawaii-zone string
 *   keeps the runoff "upcoming" until 00:00 HST the next day, which is
 *   after every US polling location has closed.
 *
 * Why `en-CA`?
 *   The `en-CA` locale formats dates as `YYYY-MM-DD` everywhere, which is
 *   the same shape used by `state.elections[].date`. Using it avoids
 *   locale-dependent parsing.
 */
export function getTodayInLatestUsZone(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Pacific/Honolulu",
  });
}

/**
 * src/lib/server/curated-attribution.ts
 *
 * The pieces both PAC display read paths share — `pac-sponsors.ts` (6a) and
 * `outside-spending.ts` (6b) — written once: the researched-attribution
 * field contract (migration 0024) and the committee-display column
 * projection both queries select from `pac_committees`.
 */

import * as schema from "../../../db/schema";

export interface CuratedAttribution {
  /**
   * Human-curated plain-language line: what this committee is about / who is
   * behind it, from cited reporting. Written only through
   * scripts/ingest/_apply-pac-curation.ts. Shown under ANY status, including
   * 'rejected' — rejection suppresses the committee's own filed claim, not
   * our sourced statement. Null = not yet curated.
   */
  curatedSummary: string | null;
  /** Citation for `curatedSummary` — every curated claim links out. */
  curatedSourceUrl: string | null;
}

/**
 * The `pac_committees` columns every display read path needs about a
 * committee: identity, filed claim, curation state, and evidence links.
 * Spread into each query's `.select({...})` beside its own table's columns.
 */
export const PAC_COMMITTEE_DISPLAY_COLUMNS = {
  name: schema.pacCommittees.name,
  connectedOrg: schema.pacCommittees.connectedOrg,
  sector: schema.pacCommittees.sector,
  status: schema.pacCommittees.status,
  evidenceUrl: schema.pacCommittees.evidenceUrl,
  curatedSummary: schema.pacCommittees.curatedSummary,
  curatedSourceUrl: schema.pacCommittees.curatedSourceUrl,
};

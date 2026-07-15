/**
 * src/lib/server/officialRoster.ts
 *
 * Read-only access to `official_roster_candidates` — state Secretary-of-State
 * candidate rosters (e.g. azsos.gov's qualified-for-primary PDF). This is the
 * candidate-SET authority for a contest when OFFICIAL_ROSTER_ENABLED is on
 * and rows exist for that (state, office, district, electionYear) — see
 * docs/operations/arizona-vertical-slice-data-check.md and
 * src/lib/server/officialRosterFlag.ts. A separate importer script owns
 * writes to this table; this module never inserts/updates/deletes.
 *
 * Server-only. Never import from client components.
 */

import { and, eq } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { officialStateRosterProvenance } from "../rosterProvenance";
import type { SeatChallenger } from "./races";

export interface OfficialRosterRow {
  id: string;
  name: string;
  /** Raw source party code (e.g. "AIP", "DEM"); null for write-ins. */
  party: string | null;
  isIncumbent: boolean;
  ballotStatus: string;
  sourceUrl: string;
  retrievedAt: string;
}

/**
 * Cheap existence check: true when ANY official-roster row has been
 * imported for this state, regardless of office/district/year. Never
 * assumes coverage from the state code alone — a state with no imported
 * rows returns false.
 */
export async function hasOfficialRoster(state: string): Promise<boolean> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return false;

  const rows = await db
    .select({ id: schema.officialRosterCandidates.id })
    .from(schema.officialRosterCandidates)
    .where(eq(schema.officialRosterCandidates.state, state.toUpperCase()));

  return rows.length > 0;
}

/**
 * All official-roster rows for one contest (state, office, district, year).
 * `district` is the zero-padded House district string ("01"), or null for
 * a statewide Senate contest.
 *
 * Scopes the query to (state, electionYear) in SQL — same shape as
 * races.ts's FEC query — then narrows to office/district in JS, since a
 * state's whole roster is small and this mirrors the existing convention.
 */
export async function getOfficialRoster(
  state: string,
  office: "house" | "senate",
  district: string | null,
  electionYear: number,
): Promise<OfficialRosterRow[]> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return [];

  const rows = await db
    .select({
      id: schema.officialRosterCandidates.id,
      name: schema.officialRosterCandidates.name,
      party: schema.officialRosterCandidates.party,
      isIncumbent: schema.officialRosterCandidates.isIncumbent,
      ballotStatus: schema.officialRosterCandidates.ballotStatus,
      sourceUrl: schema.officialRosterCandidates.sourceUrl,
      retrievedAt: schema.officialRosterCandidates.retrievedAt,
      office: schema.officialRosterCandidates.office,
      district: schema.officialRosterCandidates.district,
    })
    .from(schema.officialRosterCandidates)
    .where(
      and(
        eq(schema.officialRosterCandidates.state, state.toUpperCase()),
        eq(schema.officialRosterCandidates.electionYear, electionYear),
      ),
    );

  return rows
    .filter((r) => r.office === office && r.district === district)
    .map((r) => ({
      id: r.id,
      name: r.name,
      party: r.party,
      isIncumbent: r.isIncumbent,
      ballotStatus: r.ballotStatus,
      sourceUrl: r.sourceUrl,
      retrievedAt: r.retrievedAt,
    }));
}

/**
 * Whether the current officeholder for this seat is running for
 * re-election in `electionYear`, per the official roster.
 *
 *  - `null`  — no official roster covers this seat (not imported / unknown).
 *  - `true`  — a roster row for this seat is flagged isIncumbent.
 *  - `false` — a roster exists for this seat but no row is flagged incumbent
 *              (the sitting member filed for something else, or isn't
 *              running) — the open-seat case (e.g. AZ-01, AZ-05 2026).
 *
 * `incumbentName` doesn't gate the true/false result — the district filter
 * already scopes the query to a single seat. It's a cheap cross-check only:
 * a mismatch between the roster's incumbent row and our own sitting-member
 * name is logged (a data-quality signal worth investigating), never a
 * reason to withhold the flag.
 */
export async function isIncumbentSeekingReelection(
  state: string,
  office: "house" | "senate",
  district: string | null,
  electionYear: number,
  incumbentName: string,
): Promise<boolean | null> {
  const rows = await getOfficialRoster(state, office, district, electionYear);
  if (rows.length === 0) return null;

  const incumbentRow = rows.find((r) => r.isIncumbent);
  if (!incumbentRow) return false;

  const lastName = incumbentName.trim().split(/\s+/).pop()?.toLowerCase();
  if (lastName && !incumbentRow.name.toLowerCase().includes(lastName)) {
    console.warn(
      `[officialRoster] incumbent name mismatch for ${state}-${office}-${district ?? "statewide"}: ` +
        `roster="${incumbentRow.name}" ours="${incumbentName}"`,
    );
  }
  return true;
}

/**
 * Map an official-roster row to the same SeatChallenger shape
 * lookupChallengers returns, stamped with official-source provenance.
 * `party` stays the raw source code here — races.ts applies the same
 * display-name mapping (partyName) it uses for FEC-sourced challengers, so
 * both paths render friendly party labels consistently.
 *
 * Write-in rows (ballotStatus: "write_in_qualified") map through the same
 * as any other row — nobody is left out — they just carry party: null.
 * totalReceipts is always null: this slice does not attempt a fuzzy
 * name-join to FEC finance rows (official names are sometimes surname-only
 * — see the fixture's KNOWN LIMITATIONS — so a name join risks mismatched
 * pairings; better to honestly omit than guess).
 *
 * A "runoff_pending" row (added building Oklahoma, card d9b1ef86) still
 * renders as a normal challenger — nobody is hidden pending a runoff — but
 * carries `isRunoffPending: true` so the UI can tell the reader their
 * party's nominee isn't decided yet, instead of implying a settled
 * candidacy.
 */
export function officialRosterRowToSeatChallenger(
  row: OfficialRosterRow,
  provenanceContext: { election: string | null; retrievedAt: string },
): SeatChallenger {
  return {
    id: row.id,
    name: row.name,
    party: row.party,
    totalReceipts: null,
    rosterProvenance: officialStateRosterProvenance({
      election: provenanceContext.election,
      retrievedAt: provenanceContext.retrievedAt,
      sourceUrl: row.sourceUrl,
    }),
    isRunoffPending: row.ballotStatus === "runoff_pending",
  };
}

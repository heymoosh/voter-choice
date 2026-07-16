/**
 * src/lib/server/races.ts
 *
 * 2026 challenger lookup for the congress-assessment flow.
 *
 * Reads the FEC roster rows ingested by scripts/ingest/federal-candidates.ts
 * (candidates with structured seat columns: state / district / office /
 * election_year / total_receipts). A "race" is the group key
 * (state, district, office, election_year) — no separate races table.
 *
 * Viability filter (editorial default, tune from telemetry): a filer shows
 * when they raised ≥ $10k OR are top-2 by receipts within their party for
 * the seat. Capped per seat, ranked by receipts. This trims the long tail
 * of paper filers without hiding viable small-money candidates.
 *
 * This module is server-only. Never import it from client components.
 */

import { and, eq } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import {
  fecFinanceOnlyProvenance,
  type RosterProvenance,
} from "../rosterProvenance";
import { isOfficialRosterEnabled } from "./officialRosterFlag";
import {
  getOfficialRoster,
  officialRosterRowToSeatChallenger,
} from "./officialRoster";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeatChallenger {
  id: string;
  name: string;
  /** Reader-facing party name ("Republican"), null when unknown. */
  party: string | null;
  /** Cycle receipts in USD; null when no FEC totals row exists. */
  totalReceipts: number | null;
  /**
   * Candidate rows from this module are FEC campaign-finance evidence only.
   * They are preserved for fundraising context, but are not proof that the
   * person is on a current ballot or selectable as a replacement.
   */
  rosterProvenance: RosterProvenance;
  /**
   * True when this person is one of two finalists in a still-pending
   * primary runoff (official-roster ballotStatus "runoff_pending") — their
   * party's nominee for this seat isn't decided yet. Undefined/false for
   * every other source, including the FEC path (which has no such
   * concept). Never set alongside a promoted "on the ballot" status.
   */
  isRunoffPending?: boolean;
}

export interface SeatChallengers {
  house: SeatChallenger[];
  senate: SeatChallenger[];
}

const VIABILITY_RECEIPTS_FLOOR = 10_000;
const MAX_PER_SEAT = 8;

const PARTY_NAMES: Record<string, string> = {
  REP: "Republican",
  DEM: "Democrat",
  LIB: "Libertarian",
  GRE: "Green",
  IND: "Independent",
  CON: "Constitution",
  NPA: "No Party Affiliation",
  UNK: "Unknown",
  W: "Write-in",
  // State-recognized minor party, seen in Arizona's official roster (AZ
  // vertical slice) — a distinct party under AZ law, not generic "IND".
  AIP: "Arizona Independent Party",
  // State-recognized minor party, seen in Alaska's official roster (AK
  // vertical slice) — a distinct party under AK law, not generic "IND".
  AKP: "Alaskan Party",
  // California's "No Party Preference" ballot designation (California
  // vertical slice) — a distinct legal registration status, not generic
  // "IND".
  NPP: "No Party Preference",
  // California's Peace and Freedom Party (California vertical slice) — a
  // real state-recognized minor party, not generic "IND".
  PF: "Peace and Freedom",
  // Libertarian Party of Florida (Florida vertical slice) — a real
  // state-recognized minor party, not generic "IND".
  LPF: "Libertarian Party of Florida",
  // Florida Forward Party (Florida vertical slice) — a real
  // state-recognized minor party, not generic "IND".
  FFP: "Florida Forward Party",
  // The Kentucky Party (Kentucky vertical slice) — a real
  // state-recognized minor party, not generic "IND".
  KYP: "Kentucky Party",
};

/** Exported so officialRoster.ts's mapper can apply the same display-name
 * mapping the FEC path uses, for consistent rendering across both sources. */
export function partyName(code: string | null): string | null {
  if (!code) return null;
  return PARTY_NAMES[code.toUpperCase()] ?? code;
}

// ---------------------------------------------------------------------------
// Viability filter (exported for tests)
// ---------------------------------------------------------------------------

interface ChallengerRow {
  id: string;
  fullName: string;
  party: string | null;
  totalReceipts: string | null; // numeric comes back as string from Drizzle
}

/**
 * Keep filers that raised ≥ $10k OR are top-2 by receipts within their
 * party; rank by receipts desc; cap at MAX_PER_SEAT.
 */
export function applyViabilityFilter(
  rows: ChallengerRow[],
  provenanceContext: { election: string | null; retrievedAt: string } = {
    election: null,
    retrievedAt: new Date().toISOString(),
  },
): SeatChallenger[] {
  const withReceipts = rows.map((r) => ({
    ...r,
    receipts: r.totalReceipts !== null ? Number(r.totalReceipts) : 0,
  }));

  const rankWithinParty = new Map<string, number>();
  const byParty = new Map<string, typeof withReceipts>();
  for (const r of withReceipts) {
    const key = r.party ?? "?";
    const list = byParty.get(key) ?? [];
    list.push(r);
    byParty.set(key, list);
  }
  for (const list of byParty.values()) {
    list.sort((a, b) => b.receipts - a.receipts);
    list.forEach((r, i) => rankWithinParty.set(r.id, i));
  }

  return withReceipts
    .filter(
      (r) =>
        r.receipts >= VIABILITY_RECEIPTS_FLOOR ||
        (rankWithinParty.get(r.id) ?? 99) < 2,
    )
    .sort((a, b) => b.receipts - a.receipts)
    .slice(0, MAX_PER_SEAT)
    .map((r) => ({
      id: r.id,
      name: r.fullName,
      party: partyName(r.party),
      totalReceipts: r.totalReceipts !== null ? r.receipts : null,
      rosterProvenance: fecFinanceOnlyProvenance(provenanceContext),
    }));
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Challengers filed for the voter's House seat and the state's Senate
 * race(s) in `electionYear`. Returns empty lists when the DB is not
 * configured or the roster hasn't been ingested — callers render nothing.
 *
 * `district` is the Census district number (0 = at-large); null skips the
 * House lookup. Senate filers are statewide — the caller attaches them only
 * to seats actually up in the cycle (onBallot2026).
 */
export async function lookupChallengers(
  stateCode: string,
  district: number | null,
  electionYear = 2026,
): Promise<SeatChallengers> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return { house: [], senate: [] };

  const st = stateCode.toUpperCase();
  const districtKey =
    district !== null ? String(district).padStart(2, "0") : null;
  const provenanceContext = {
    election: `${electionYear} federal cycle`,
    retrievedAt: new Date().toISOString(),
  };

  // Official-state-roster path (flag-gated, additive): when rows exist for
  // this exact (state, office, district, electionYear), they ARE the
  // candidate set for that seat — full set, no viability filtering, the
  // incumbent's own row excluded (already shown as the seat's own card —
  // same contract as the FEC path's isIncumbentFiler exclusion below).
  // Falls through to the unchanged FEC-only path when the flag is off or no
  // official rows cover this exact contest.
  let houseFromOfficialRoster: SeatChallenger[] | null = null;
  let senateFromOfficialRoster: SeatChallenger[] | null = null;
  if (isOfficialRosterEnabled()) {
    if (districtKey !== null) {
      const officialHouseRows = await getOfficialRoster(
        st,
        "house",
        districtKey,
        electionYear,
      );
      if (officialHouseRows.length > 0) {
        houseFromOfficialRoster = officialHouseRows
          .filter((r) => !r.isIncumbent)
          .map((r) => ({
            ...officialRosterRowToSeatChallenger(r, provenanceContext),
            party: partyName(r.party),
          }));
      }
    }
    const officialSenateRows = await getOfficialRoster(
      st,
      "senate",
      null,
      electionYear,
    );
    if (officialSenateRows.length > 0) {
      senateFromOfficialRoster = officialSenateRows
        .filter((r) => !r.isIncumbent)
        .map((r) => ({
          ...officialRosterRowToSeatChallenger(r, provenanceContext),
          party: partyName(r.party),
        }));
    }
  }

  // Both seats covered by the official roster — the FEC query result would
  // go unused, so skip it.
  if (houseFromOfficialRoster !== null && senateFromOfficialRoster !== null) {
    return { house: houseFromOfficialRoster, senate: senateFromOfficialRoster };
  }

  const rows = await db
    .select({
      id: schema.candidates.id,
      fullName: schema.candidates.fullName,
      party: schema.candidates.party,
      office: schema.candidates.office,
      district: schema.candidates.district,
      totalReceipts: schema.candidates.totalReceipts,
      rawMetadata: schema.candidates.rawMetadata,
    })
    .from(schema.candidates)
    .where(
      and(
        eq(schema.candidates.state, st),
        eq(schema.candidates.electionYear, electionYear),
        eq(schema.candidates.isIncumbent, false),
      ),
    );

  // The FEC roster includes the sitting incumbent as a filer for their own
  // seat (incumbent_challenge === "I"). Those whose name didn't match our
  // GovTrack incumbent record land here as is_incumbent=false rows — but the
  // incumbent is already shown as their own seat card, so listing them again
  // would double-list the incumbent (often under a raw FEC name). Drop them.
  const isIncumbentFiler = (r: { rawMetadata: unknown }): boolean => {
    const fec = (r.rawMetadata as { fec?: { incumbent_challenge?: string } })
      ?.fec;
    return fec?.incumbent_challenge === "I";
  };

  const houseRows = rows.filter(
    (r) =>
      r.office === "house" &&
      districtKey !== null &&
      r.district === districtKey &&
      !isIncumbentFiler(r),
  );
  const senateRows = rows.filter(
    (r) => r.office === "senate" && !isIncumbentFiler(r),
  );

  return {
    house:
      houseFromOfficialRoster ??
      applyViabilityFilter(dedupeByName(houseRows), provenanceContext),
    senate:
      senateFromOfficialRoster ??
      applyViabilityFilter(dedupeByName(senateRows), provenanceContext),
  };
}

/**
 * Collapse same-person filers within a seat. A handful of filers register
 * under multiple FEC candidate ids for the same race (e.g. a refiling); the
 * roster returns each as its own row, which would list the name twice. Keep
 * the highest-receipts row per normalized name.
 */
function dedupeByName<
  T extends { fullName: string; totalReceipts: string | null },
>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const key = r.fullName.trim().toLowerCase();
    const existing = best.get(key);
    if (
      !existing ||
      Number(r.totalReceipts ?? 0) > Number(existing.totalReceipts ?? 0)
    ) {
      best.set(key, r);
    }
  }
  return [...best.values()];
}

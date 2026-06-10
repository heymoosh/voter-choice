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
};

function partyName(code: string | null): string | null {
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
export function applyViabilityFilter(rows: ChallengerRow[]): SeatChallenger[] {
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

  const rows = await db
    .select({
      id: schema.candidates.id,
      fullName: schema.candidates.fullName,
      party: schema.candidates.party,
      office: schema.candidates.office,
      district: schema.candidates.district,
      totalReceipts: schema.candidates.totalReceipts,
    })
    .from(schema.candidates)
    .where(
      and(
        eq(schema.candidates.state, st),
        eq(schema.candidates.electionYear, electionYear),
        eq(schema.candidates.isIncumbent, false),
      ),
    );

  const districtKey =
    district !== null ? String(district).padStart(2, "0") : null;

  const houseRows = rows.filter(
    (r) =>
      r.office === "house" &&
      districtKey !== null &&
      r.district === districtKey,
  );
  const senateRows = rows.filter((r) => r.office === "senate");

  return {
    house: applyViabilityFilter(houseRows),
    senate: applyViabilityFilter(senateRows),
  };
}

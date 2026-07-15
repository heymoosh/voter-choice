/**
 * src/lib/server/delegation.ts
 *
 * Resolve a voter's sitting federal delegation — one US House member (by
 * state + congressional district) and two US Senators (by state) — from the
 * `candidates` table (GovTrack-ingested incumbents).
 *
 * District/state/party are parsed from the GovTrack name decoration
 * ("Rep. Frank Pallone [D-NJ6]" / "Sen. Andrew Kim [D-NJ]"), with the raw
 * GovTrack person record in `rawMetadata.govtrack` as a secondary source.
 * Prod data has MIXED decorated/undecorated rows (see resolveCandidateId in
 * alignment.ts), so an unresolvable seat is a first-class honest state
 * (`candidate: null`) — never a guess.
 *
 * This module is server-only. Never import it from client components.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { cleanCandidateName } from "./alignment";
import { lookupMemberStats, type MemberAttendance } from "./member-stats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DelegationCandidate {
  id: string;
  /** Decoration-stripped display name ("Frank Pallone"). */
  name: string;
  party: "Democrat" | "Republican" | "Independent" | null;
  /** e.g. "U.S. Senator since 2015"; null when no office rows exist. */
  priorRole: string | null;
  /**
   * False when an official state roster confirms the sitting member did NOT
   * file for this seat in `electionYear` (e.g. AZ-01/AZ-05 2026 — the
   * incumbent filed for Governor instead). Undefined/null everywhere else —
   * this is only ever set by the route when OFFICIAL_ROSTER_ENABLED covers
   * this seat. Attached by /api/delegation (src/app/api/delegation/route.ts)
   * via officialRoster.ts's isIncumbentSeekingReelection.
   */
  seekingReelection2026?: boolean | null;
}

export interface DelegationSeat {
  seatId: string;
  office: "U.S. House" | "U.S. Senate";
  chamber: "house" | "senate";
  /** "NJ-05" · "WY — At-large" · "New Jersey (statewide)" */
  districtLabel: string;
  /** Blind-mode label ("Your U.S. Representative"). */
  blindLabel: string;
  /** Null when the sitting member couldn't be resolved from our data. */
  candidate: DelegationCandidate | null;
  attendance: MemberAttendance | null;
  /** True when this seat is up in the Nov 2026 general; null = unknown. */
  onBallot2026: boolean | null;
  /** Calendar year of the seat's next general election; null = unknown. */
  nextElectionYear: number | null;
  /**
   * 2026 FEC filers running for this seat (challengers + open-seat
   * candidates). Attached by the /api/delegation route from
   * `lookupChallengers` (src/lib/server/races.ts); absent/empty when the
   * roster isn't ingested or the seat isn't up this cycle.
   */
  challengers?: import("./races").SeatChallenger[];
}

export type DelegationLookupResult =
  | { status: "ok"; seats: DelegationSeat[] }
  | { status: "db_unavailable" };

// ---------------------------------------------------------------------------
// Decoration / metadata parsing
// ---------------------------------------------------------------------------

const PARTY_BY_LETTER: Record<
  string,
  "Democrat" | "Republican" | "Independent"
> = {
  D: "Democrat",
  R: "Republican",
  I: "Independent",
};

export interface MemberFacts {
  state: string | null;
  /** House district number; 0 = at-large; null = unknown / senator. */
  district: number | null;
  party: "Democrat" | "Republican" | "Independent" | null;
}

/**
 * Parse "[D-NJ6]" / "[R-WY0]" / "[I-VT]" from a stored candidate name.
 * Exported for unit testing.
 */
export function parseNameDecoration(raw: string): MemberFacts {
  const m = (raw ?? "").match(/\[([A-Za-z]+)-([A-Za-z]{2})(\d*)\]/u);
  if (!m) return { state: null, district: null, party: null };
  return {
    party: PARTY_BY_LETTER[m[1].toUpperCase()] ?? null,
    state: m[2].toUpperCase(),
    district: m[3] === "" ? null : Number(m[3]),
  };
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as UnknownRecord)
    : null;
}

/** Read state/district/party off the raw GovTrack person record, if present. */
function factsFromMetadata(rawMetadata: unknown): MemberFacts {
  const govtrack = asRecord(asRecord(rawMetadata)?.govtrack);
  if (!govtrack) return { state: null, district: null, party: null };
  // Some captures nest the person record, some are the person record.
  const person = asRecord(govtrack.person) ?? govtrack;

  const stateRaw = person.state;
  const state =
    typeof stateRaw === "string" && /^[A-Za-z]{2}$/.test(stateRaw.trim())
      ? stateRaw.trim().toUpperCase()
      : null;

  const districtRaw = person.district;
  const district =
    typeof districtRaw === "number" && Number.isInteger(districtRaw)
      ? districtRaw
      : null;

  const partyRaw = person.party;
  const party =
    typeof partyRaw === "string"
      ? (PARTY_BY_LETTER[partyRaw.trim().charAt(0).toUpperCase()] ?? null)
      : null;

  return { state, district, party };
}

/**
 * Merge member facts by precedence: member_stats (authoritative GovTrack
 * role-API geography, when ingested) > name decoration > rawMetadata.
 */
function memberFacts(
  fullName: string,
  rawMetadata: unknown,
  stats: { state: string | null; district: number | null } | undefined,
): MemberFacts {
  const fromName = parseNameDecoration(fullName);
  const fromMeta = factsFromMetadata(rawMetadata);
  return {
    state: stats?.state ?? fromName.state ?? fromMeta.state,
    district: stats?.district ?? fromName.district ?? fromMeta.district,
    party: fromName.party ?? fromMeta.party,
  };
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

interface IncumbentRow {
  id: string;
  fullName: string;
  jurisdiction: string;
  facts: MemberFacts;
}

function buildCandidate(
  row: IncumbentRow,
  roleLabel: "U.S. Senator" | "U.S. Representative",
  firstTermYear: number | null,
  coverageFloorYear: number | null,
): DelegationCandidate {
  // "since YYYY" is only claimed when the member's earliest known term
  // starts AFTER our office data's coverage floor. A member sitting at the
  // floor may have served longer (Cornyn reads "since 2023" from a 2023-only
  // ingest) — omit the year rather than understate tenure.
  const sinceIsReliable =
    firstTermYear !== null &&
    (coverageFloorYear === null || firstTermYear > coverageFloorYear);
  return {
    id: row.id,
    name: cleanCandidateName(row.fullName),
    party: row.facts.party,
    priorRole: sinceIsReliable
      ? `${roleLabel} since ${firstTermYear}`
      : roleLabel,
  };
}

function houseDistrictLabel(stateCode: string, district: number): string {
  return district === 0
    ? `${stateCode} — At-large`
    : `${stateCode}-${String(district).padStart(2, "0")}`;
}

/**
 * Pick the sitting House member for (state, district).
 *  - exact parsed-district match wins;
 *  - a state with exactly ONE incumbent row resolves regardless of the row's
 *    (possibly missing) district — covers undecorated at-large rows;
 *  - anything else is honestly unresolved.
 */
function pickHouseMember(
  stateRows: IncumbentRow[],
  district: number,
): IncumbentRow | null {
  const exact = stateRows.filter((r) => r.facts.district === district);
  if (exact.length === 1) return exact[0];
  if (exact.length === 0 && stateRows.length === 1) return stateRows[0];
  return null;
}

/**
 * Resolve the federal delegation for a state (+ House district).
 *
 * `district` may be null (geocoder matched the state but no CD layer) — the
 * House seat is then returned unresolved rather than guessed.
 */
export async function resolveDelegation(
  stateCode: string,
  stateName: string,
  district: number | null,
): Promise<DelegationLookupResult> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return { status: "db_unavailable" };

  const st = stateCode.toUpperCase();

  const rows = await db
    .select({
      id: schema.candidates.id,
      fullName: schema.candidates.fullName,
      jurisdiction: schema.candidates.jurisdiction,
      rawMetadata: schema.candidates.rawMetadata,
    })
    .from(schema.candidates)
    .where(
      and(
        inArray(schema.candidates.jurisdiction, [
          "federal-house",
          "federal-senate",
        ]),
        eq(schema.candidates.isIncumbent, true),
      ),
    );

  // Stats for ALL incumbents (~538 rows max) — provides authoritative
  // state/district facts plus attendance, so it must precede filtering.
  const stats = await lookupMemberStats(rows.map((r) => r.id));

  const incumbents: IncumbentRow[] = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    jurisdiction: r.jurisdiction,
    facts: memberFacts(r.fullName, r.rawMetadata, stats.get(r.id)),
  }));

  const senators = incumbents.filter(
    (r) => r.jurisdiction === "federal-senate" && r.facts.state === st,
  );
  const houseRows = incumbents.filter(
    (r) => r.jurisdiction === "federal-house" && r.facts.state === st,
  );
  const houseMember =
    district !== null ? pickHouseMember(houseRows, district) : null;

  // First-term years (for "since YYYY") from candidate_offices.
  const memberIds = [...senators.map((s) => s.id)];
  if (houseMember) memberIds.push(houseMember.id);

  const firstTermYear = new Map<string, number>();
  let coverageFloorYear: number | null = null;
  if (memberIds.length > 0) {
    const [officeRows, floorRows] = await Promise.all([
      db
        .select({
          candidateId: schema.candidateOffices.candidateId,
          termStart: schema.candidateOffices.termStart,
        })
        .from(schema.candidateOffices)
        .where(inArray(schema.candidateOffices.candidateId, memberIds)),
      // How far back our FEDERAL office data reaches — "since YYYY" claims
      // are only reliable for members whose first term starts after this.
      // (State-legislature office rows reach further back; including them
      // made a 2023-era federal floor look like real tenure data.)
      db
        .select({
          minTermStart: sql<
            string | null
          >`min(${schema.candidateOffices.termStart})`,
        })
        .from(schema.candidateOffices)
        .innerJoin(
          schema.candidates,
          eq(schema.candidateOffices.candidateId, schema.candidates.id),
        )
        .where(
          inArray(schema.candidates.jurisdiction, [
            "federal-house",
            "federal-senate",
          ]),
        ),
    ]);
    for (const office of officeRows) {
      const year = Number(String(office.termStart).slice(0, 4));
      if (!Number.isFinite(year)) continue;
      const prev = firstTermYear.get(office.candidateId);
      if (prev === undefined || year < prev) {
        firstTermYear.set(office.candidateId, year);
      }
    }
    const floorRaw = floorRows[0]?.minTermStart;
    if (floorRaw) {
      const y = Number(String(floorRaw).slice(0, 4));
      if (Number.isFinite(y)) coverageFloorYear = y;
    }
  }

  // Senate seniority: GovTrack's senator_rank when ingested, else earlier
  // first term. Ties break by name so the order is deterministic.
  const rankScore = (r: IncumbentRow): number => {
    const rank = stats.get(r.id)?.senatorRank;
    if (rank === "senior") return 0;
    if (rank === "junior") return 1;
    return 2;
  };
  const rankedSenators = [...senators].sort((a, b) => {
    const ra = rankScore(a);
    const rb = rankScore(b);
    if (ra !== rb) return ra - rb;
    const ya = firstTermYear.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const yb = firstTermYear.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ya !== yb) return ya - yb;
    return a.fullName.localeCompare(b.fullName);
  });

  const seats: DelegationSeat[] = [];

  // House seat first (the design leads Washington with the district seat).
  seats.push({
    seatId:
      district !== null ? `house-${st}-${district}` : `house-${st}-unknown`,
    office: "U.S. House",
    chamber: "house",
    districtLabel: district !== null ? houseDistrictLabel(st, district) : st,
    blindLabel: "Your U.S. Representative",
    candidate: houseMember
      ? buildCandidate(
          houseMember,
          "U.S. Representative",
          firstTermYear.get(houseMember.id) ?? null,
          coverageFloorYear,
        )
      : null,
    attendance: houseMember
      ? (stats.get(houseMember.id)?.attendance ?? null)
      : null,
    // House terms are two years: every seat is up in the 2026 general.
    onBallot2026: true,
    nextElectionYear: 2026,
  });

  const senateBlindLabels =
    rankedSenators.length === 2
      ? ["Your Senior U.S. Senator", "Your Junior U.S. Senator"]
      : ["Your U.S. Senator", "Your U.S. Senator"];

  for (let i = 0; i < 2; i++) {
    const senator = rankedSenators[i] ?? null;
    const senatorStats = senator ? stats.get(senator.id) : undefined;
    seats.push({
      seatId: `senate-${st}-${i === 0 ? "a" : "b"}`,
      office: "U.S. Senate",
      chamber: "senate",
      districtLabel: `${stateName} (statewide)`,
      blindLabel: senateBlindLabels[i],
      candidate: senator
        ? buildCandidate(
            senator,
            "U.S. Senator",
            firstTermYear.get(senator.id) ?? null,
            coverageFloorYear,
          )
        : null,
      attendance: senatorStats?.attendance ?? null,
      onBallot2026: senatorStats?.onBallot2026 ?? null,
      nextElectionYear: senatorStats?.nextElectionYear ?? null,
    });
  }

  return { status: "ok", seats };
}

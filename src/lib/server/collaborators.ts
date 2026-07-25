/**
 * src/lib/server/collaborators.ts
 *
 * Read layer for the collaborator network (Part 4 of
 * DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md). Reads `bill_cosponsors` (written
 * by scripts/ingest/bill-cosponsors.ts) as a bill-participation graph and, for
 * a given sitting member, returns their closest same-party and cross-party
 * collaborators — the members they most often share a bill with, whether as
 * sponsor or cosponsor. Because the sponsor is stored (role='sponsor'), this
 * captures sponsor↔cosponsor edges (the strongest signal), not just
 * cosponsor↔cosponsor.
 *
 * Computed in SQL at request time (a self-join on bill_cosponsors), with no
 * derived/materialized table until it's demonstrably slow — per the plan. The
 * self-join joins on bill_id irrespective of role, so it needs no role logic:
 * any two distinct members on the same bill are collaborators on it.
 *
 * One honest limitation, documented so the surface never overclaims: the
 * shared-bill count is unweighted, so a widely-cosponsored resolution counts
 * the same as a narrow bipartisan bill. It is a rough proxy; the Lugar
 * Center–Georgetown Bipartisan Index is the rigorous external benchmark the UI
 * cites rather than a claim we compute.
 *
 * This module is server-only. Never import it from client components.
 */

import { and, eq, ne, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { cleanCandidateName } from "./alignment";

export type PartyLetter = "D" | "R" | "I";

export interface Collaborator {
  candidateId: string;
  /** Display name — title + "[D-NJ5]" decoration stripped. */
  name: string;
  party: PartyLetter | null;
  /** Bills this collaborator and the member both cosponsored. */
  sharedBills: number;
  /**
   * True when this collaborator has left Congress. ~95 former members appear
   * in the graph legitimately, via 118th-Congress (2023-24) bills they shared
   * with sitting members. The UI labels them rather than dropping them
   * (Muxin, 2026-07-24): omitting them would silently shrink a member's real
   * network, but an unlabelled departed member reads as a current colleague.
   *
   * Sourced from `candidates.is_incumbent`, which scripts/ingest/member-party.ts
   * corrects — before that backfill runs, all 95 are stored is_incumbent=true
   * and render unlabelled (the pre-existing behaviour, never wrong the other
   * way).
   */
  departed: boolean;
}

export interface CollaboratorNetwork {
  sameParty: Collaborator[];
  crossParty: Collaborator[];
}

/** A member to look up, with the party letter used to split same vs cross. */
export interface CollaboratorMember {
  id: string;
  party: PartyLetter | null;
}

const DEFAULT_MIN_SHARED_BILLS = 3;
const DEFAULT_TOP_N = 5;

/**
 * `candidates.party` → D/R/I, or null for a code we won't map.
 *
 * The list is closed on purpose. Mapping an unrecognized code by guessing
 * would put a member in the wrong same-/cross-party bucket, and a wrong bucket
 * is worse than an omission — the same precision-over-recall rule Part 2's
 * resolver follows. So "OTH" and "UNK" (both real values in the table) return
 * null and fall through to the decoration rather than being read as
 * Independent.
 *
 * "DFL" is Minnesota's Democratic-Farmer-Labor and "DNPL" North Dakota's
 * Democratic-NPL — state affiliates whose members are elected and caucus as
 * Democrats, so they are D, not unclassifiable.
 */
function partyFromCode(raw: string | null): PartyLetter | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code) return null;
  if (code === "DFL" || code === "DNPL") return "D";
  if (code.startsWith("DEM") || code === "D") return "D";
  if (code.startsWith("REP") || code === "R") return "R";
  if (code.startsWith("IND") || code === "I") return "I";
  return null;
}

/**
 * DISPLAY party letter — the one the card prints next to a name.
 *
 * Reads `candidates.party` first and the "[D-NJ5]" name decoration only as a
 * fallback. That order matters because the decoration is stale on rows the
 * party backfill has since corrected (Risch was "UNK", the two Minnesota
 * members "DFL"); the column is maintained by
 * scripts/ingest/member-party.ts from unitedstates/congress-legislators, so it
 * is the authoritative field, while the decoration still covers rows that
 * ingest can't reach (no bioguide match).
 *
 * Returns null when neither yields D/R/I — such a collaborator can't be
 * bucketed and is dropped rather than guessed at.
 */
export function partyLetter(
  fullName: string,
  fecParty: string | null,
): PartyLetter | null {
  const fromColumn = partyFromCode(fecParty);
  if (fromColumn) return fromColumn;

  const decoration = /\[([A-Za-z])[A-Za-z]*-/u.exec(fullName ?? "");
  const fromName = decoration?.[1]?.toUpperCase();
  if (fromName === "D" || fromName === "R" || fromName === "I") return fromName;
  return null;
}

/**
 * BUCKETING party letter — who this member functionally works with, used only
 * to split same- from cross-party. Deliberately separate from the display
 * letter above.
 *
 * Three sitting members are elected as Independents but caucus with a major
 * party: Sanders and King (Democrat) and Kiley (Republican). Bucketing them by
 * their elected party made every Republican who frequently co-sponsors with
 * Kiley read as "reaching across the aisle" — the bipartisanship overstatement
 * the Part 4 follow-up set out to fix. Note the original diagnosis was wrong:
 * Kiley's stored "I" is CORRECT, and so was the code reading it; the missing
 * datum was the caucus, not the party.
 *
 * Keeping the two functions apart is what lets the card stay honest on both
 * axes — Kiley still prints as "(I)" while counting toward a Republican's
 * same-party list (Muxin, 2026-07-24). `caucus` is NULL for everyone whose
 * caucus matches their party, so this falls straight through for ~all rows.
 */
export function caucusLetter(
  fullName: string,
  fecParty: string | null,
  caucus: string | null,
): PartyLetter | null {
  return partyFromCode(caucus) ?? partyLetter(fullName, fecParty);
}

/**
 * Closest collaborators for a set of sitting members. Missing members (no
 * cosponsorship data, not ingested, or below the shared-bill threshold) simply
 * don't appear in the map — callers render the honest empty state themselves
 * rather than infer it. DB-not-configured or a query failure degrades to an
 * empty map, never taking down delegation resolution.
 */
export async function lookupCollaborators(
  members: CollaboratorMember[],
  opts: { minSharedBills?: number; topN?: number } = {},
): Promise<Map<string, CollaboratorNetwork>> {
  const result = new Map<string, CollaboratorNetwork>();
  if (members.length === 0) return result;

  const minShared = opts.minSharedBills ?? DEFAULT_MIN_SHARED_BILLS;
  const topN = opts.topN ?? DEFAULT_TOP_N;
  const memberIds = members.map((m) => m.id);
  const partyByMember = new Map(members.map((m) => [m.id, m.party]));

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return result;

  // a = the member side; b = every other member who cosponsored the same bill.
  const a = schema.billCosponsors;
  const b = alias(schema.billCosponsors, "collab");

  let rows;
  try {
    rows = await db
      .select({
        memberId: a.candidateId,
        collaboratorId: b.candidateId,
        collaboratorName: schema.candidates.fullName,
        collaboratorParty: schema.candidates.party,
        collaboratorCaucus: schema.candidates.caucus,
        collaboratorIsIncumbent: schema.candidates.isIncumbent,
        sharedBills: sql<number>`count(distinct ${a.billId})`.mapWith(Number),
      })
      .from(a)
      .innerJoin(
        b,
        and(eq(a.billId, b.billId), ne(a.candidateId, b.candidateId)),
      )
      .innerJoin(schema.candidates, eq(schema.candidates.id, b.candidateId))
      .where(inArray(a.candidateId, memberIds))
      .groupBy(
        a.candidateId,
        b.candidateId,
        schema.candidates.fullName,
        schema.candidates.party,
        schema.candidates.caucus,
        schema.candidates.isIncumbent,
      )
      .having(sql`count(distinct ${a.billId}) >= ${minShared}`);
  } catch (err) {
    console.error("[collaborators] lookup failed (degrading to empty):", err);
    return result;
  }

  // Bucket each member's collaborators into same/cross party, drop any whose
  // own party can't be determined, then take the top N of each by shared count.
  // Two letters per collaborator: `party` is what the card PRINTS, `bucket` is
  // who they caucus with. They differ for exactly three sitting members —
  // see caucusLetter.
  const byMember = new Map<string, BucketedCollaborator[]>();
  for (const row of rows) {
    const party = partyLetter(row.collaboratorName, row.collaboratorParty);
    if (party === null) continue; // unclassifiable — can't bucket
    const list = byMember.get(row.memberId) ?? [];
    list.push({
      candidateId: row.collaboratorId,
      name: cleanCandidateName(row.collaboratorName),
      party,
      sharedBills: row.sharedBills,
      departed: !row.collaboratorIsIncumbent,
      bucket:
        caucusLetter(
          row.collaboratorName,
          row.collaboratorParty,
          row.collaboratorCaucus,
        ) ?? party,
    });
    byMember.set(row.memberId, list);
  }

  // The seat member's own bucketing letter has to follow the same caucus rule,
  // or Kiley's OWN card would file every Republican as cross-party — the same
  // overstatement, mirrored. The caller passes the displayed party; this
  // upgrades it to the caucus where the member has one.
  const memberBucket = await memberBucketLetters(db, memberIds);

  for (const [memberId, collaborators] of byMember) {
    const memberParty =
      memberBucket.get(memberId) ?? partyByMember.get(memberId) ?? null;
    if (memberParty === null) continue; // can't split without the seat's party

    const sorted = [...collaborators].sort((x, y) => {
      if (y.sharedBills !== x.sharedBills) return y.sharedBills - x.sharedBills;
      return x.name.localeCompare(y.name);
    });
    const strip = ({ bucket: _bucket, ...c }: BucketedCollaborator) => c;
    const sameParty = sorted
      .filter((c) => c.bucket === memberParty)
      .slice(0, topN)
      .map(strip);
    const crossParty = sorted
      .filter((c) => c.bucket !== memberParty)
      .slice(0, topN)
      .map(strip);
    if (sameParty.length === 0 && crossParty.length === 0) continue;
    result.set(memberId, { sameParty, crossParty });
  }

  return result;
}

/** Collaborator plus the internal bucketing letter, stripped before return. */
interface BucketedCollaborator extends Collaborator {
  bucket: PartyLetter;
}

/**
 * Caucus-aware bucketing letter for the seat members themselves. Soft-degrades
 * to an empty map on any failure — the caller then falls back to the party it
 * passed in, which is the pre-caucus behaviour and never worse than it.
 */
async function memberBucketLetters(
  db: Exclude<ReturnType<typeof getDb>, typeof DB_NOT_CONFIGURED>,
  memberIds: string[],
): Promise<Map<string, PartyLetter>> {
  const out = new Map<string, PartyLetter>();
  try {
    const rows = await db
      .select({
        id: schema.candidates.id,
        fullName: schema.candidates.fullName,
        party: schema.candidates.party,
        caucus: schema.candidates.caucus,
      })
      .from(schema.candidates)
      .where(inArray(schema.candidates.id, memberIds));
    for (const r of rows) {
      const letter = caucusLetter(r.fullName, r.party, r.caucus);
      if (letter) out.set(r.id, letter);
    }
  } catch (err) {
    console.error("[collaborators] member caucus lookup failed:", err);
  }
  return out;
}

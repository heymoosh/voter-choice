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
 * Party letter for classification. Prefers the "[D-NJ5]" name decoration (the
 * same source delegation.ts uses for the seat member's own party), falling
 * back to the FEC party code on `candidates.party`. Returns null when neither
 * yields D/R/I — such a collaborator can't be bucketed and is dropped.
 */
export function partyLetter(
  fullName: string,
  fecParty: string | null,
): PartyLetter | null {
  const decoration = /\[([A-Za-z])[A-Za-z]*-/u.exec(fullName ?? "");
  const fromName = decoration?.[1]?.toUpperCase();
  if (fromName === "D" || fromName === "R" || fromName === "I") return fromName;

  const code = (fecParty ?? "").trim().toUpperCase();
  if (code.startsWith("DEM") || code === "D") return "D";
  if (code.startsWith("REP") || code === "R") return "R";
  if (code.startsWith("IND") || code === "I") return "I";
  return null;
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
      )
      .having(sql`count(distinct ${a.billId}) >= ${minShared}`);
  } catch (err) {
    console.error("[collaborators] lookup failed (degrading to empty):", err);
    return result;
  }

  // Bucket each member's collaborators into same/cross party, drop any whose
  // own party can't be determined, then take the top N of each by shared count.
  const byMember = new Map<string, Collaborator[]>();
  for (const row of rows) {
    const party = partyLetter(row.collaboratorName, row.collaboratorParty);
    if (party === null) continue; // unclassifiable — can't bucket
    const list = byMember.get(row.memberId) ?? [];
    list.push({
      candidateId: row.collaboratorId,
      name: cleanCandidateName(row.collaboratorName),
      party,
      sharedBills: row.sharedBills,
    });
    byMember.set(row.memberId, list);
  }

  for (const [memberId, collaborators] of byMember) {
    const memberParty = partyByMember.get(memberId) ?? null;
    if (memberParty === null) continue; // can't split without the seat's party

    const sorted = [...collaborators].sort((x, y) => {
      if (y.sharedBills !== x.sharedBills) return y.sharedBills - x.sharedBills;
      return x.name.localeCompare(y.name);
    });
    const sameParty = sorted
      .filter((c) => c.party === memberParty)
      .slice(0, topN);
    const crossParty = sorted
      .filter((c) => c.party !== memberParty)
      .slice(0, topN);
    if (sameParty.length === 0 && crossParty.length === 0) continue;
    result.set(memberId, { sameParty, crossParty });
  }

  return result;
}

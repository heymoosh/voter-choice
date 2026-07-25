/**
 * scripts/ingest/member-party.ts
 *
 * Authoritative party (and sitting/former status) for Members of Congress —
 * Part 4 follow-up, Defect A of docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md.
 *
 * WHY THIS EXISTS. Two gaps in `candidates`, both found by the Part 4
 * collaborator-graph spot-check:
 *
 * 1. NO CAUCUS FIELD. Kevin Kiley kept landing in Republican members' CROSS-
 *    party bucket, overstating their bipartisan reach. The investigation
 *    reversed the original diagnosis: he is genuinely an Independent (this
 *    source's 2025-27 term says `party: Independent, caucus: Republican`, and
 *    our own GovTrack row "[I-CA3]" and FEC row "OTH" independently agree), so
 *    both the stored party and the code reading it were right. What was
 *    missing is who he WORKS with. Three sitting members are affected —
 *    Sanders and King (caucus Democrat) and Kiley (caucus Republican).
 *
 * 2. STALE / THIN PARTY AND INCUMBENCY. `party` carried GovTrack leftovers
 *    ("UNK" for Risch, "DFL" for the two Minnesota members) and was NULL for
 *    every member who has left, while ~96 departed members were still flagged
 *    `is_incumbent = true` — including one who left this month. Both are
 *    answerable from this source's own current/historical split.
 *
 * SOURCE: unitedstates/congress-legislators (CC0 public domain) — the same
 * repo scripts/ingest/committee-assignments.ts already pulls committees from,
 * fetched the same way (GitHub Contents API with
 * `accept: application/vnd.github.raw+json`, never raw.githubusercontent.com):
 *   • legislators-current.yaml     — everyone currently sitting
 *   • legislators-historical.yaml  — everyone who has left
 * Party comes from the member's MOST RECENT term, which is what "their party"
 * means for a name on a 2026 ballot.
 *
 * WHAT IT WRITES — `candidates.party`, `candidates.caucus` and
 * `candidates.is_incumbent` only. It never touches `full_name` (the "[D-NJ5]"
 * decoration is load-bearing for stateFromCandidateName) and never touches
 * `state`/`district` — most former members have those NULL, which is part of
 * why delegation resolution doesn't mistake them for sitting members.
 * Backfilling them would make a departed member match a live seat.
 *
 * `caucus` is stored ONLY when it differs from `party`, and never overwrites
 * `party`: the card must be able to print "Kevin Kiley (I)" while counting him
 * in a Republican's same-party bucket (Muxin, 2026-07-24).
 *
 * JOIN BASIS — identity keys, never a name guess:
 *   • bioguide → `federal-<BIOGUIDE>` (member-stats.ts's convention), and
 *   • every FEC id the source lists → `fec-<FECID>`.
 * A bioguide present in neither file is left alone, rather than inferring
 * "former" from mere absence.
 *
 * PARTY VOCABULARY — normalized to the FEC codes `candidates.party` is
 * documented to hold ("REP" | "DEM" | …), not the source's prose
 * ("Republican"). races.ts groups candidates by the raw column value, so
 * mixing vocabularies there would split one party into two groups.
 *
 * `is_incumbent` is written for `federal-<BIOGUIDE>` rows only. On `fec-` rows
 * that column means "FEC filer incumbency" for a specific race — a different
 * concept this source cannot speak to.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/member-party.ts --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/member-party.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/member-party.ts --current-only
 *
 * Idempotent: re-running writes the same values. Read-only under --dry-run,
 * which reports exactly which rows would change.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { inArray, sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates } from "../../db/schema";

const CURRENT_API_URL =
  "https://api.github.com/repos/unitedstates/congress-legislators/contents/legislators-current.yaml";
const HISTORICAL_API_URL =
  "https://api.github.com/repos/unitedstates/congress-legislators/contents/legislators-historical.yaml";

/** Human-facing citation, distinct from the API URLs used to fetch. */
export const MEMBER_PARTY_SOURCE_URL =
  "https://github.com/unitedstates/congress-legislators";

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

export interface MemberParty {
  bioguide: string;
  /** FEC-vocabulary party code, e.g. "REP" — null when unmappable. */
  party: string | null;
  /**
   * Party this member caucuses with, when the source records one that differs
   * from `party` — null otherwise (the overwhelming majority; no caucus
   * recorded means they caucus with their own party). Only three sitting
   * members have one: Sanders and King (Independent, caucus Democrat) and
   * Kiley (Independent, caucus Republican).
   */
  caucus: string | null;
  /** FEC candidate ids the source lists for this member. */
  fecIds: string[];
  /** True when the member appears in legislators-current.yaml. */
  sitting: boolean;
}

export interface MemberPartyCounts {
  currentFetched: number;
  historicalFetched: number;
  /** Rows whose party value this run changed (or would change). */
  partyUpdated: number;
  /** Rows whose caucus value this run changed (or would change). */
  caucusUpdated: number;
  /** Rows whose is_incumbent this run changed (or would change). */
  incumbencyUpdated: number;
  /** Source members with no `candidates` row to write to. */
  skippedNoCandidate: number;
  /** Source members whose party string we refused to map. */
  skippedUnmappableParty: number;
}

// ---------------------------------------------------------------------------
// Parsing helpers (pure — unit tested)
// ---------------------------------------------------------------------------

function asRecord(v: unknown): UnknownRecord | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as UnknownRecord)
    : null;
}

function getString(rec: UnknownRecord | null, key: string): string | null {
  const v = rec?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function sanitizeIdPart(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, "");
}

/** Mirror of committee-assignments.ts / member-stats.ts's id convention. */
export function candidateIdFromBioguide(bioguide: string): string {
  return `federal-${sanitizeIdPart(bioguide).toUpperCase()}`;
}

export function candidateIdFromFecId(fecId: string): string {
  return `fec-${sanitizeIdPart(fecId).toUpperCase()}`;
}

/**
 * congress-legislators party prose → the FEC party code `candidates.party`
 * holds. Deliberately a closed list: an unrecognized party is reported and
 * skipped rather than guessed, because a WRONG party puts a member in the
 * wrong same-/cross-party bucket, which is worse than leaving the existing
 * value alone (the same precision-over-recall rule Part 2's resolver follows).
 *
 * Minnesota's Democratic-Farmer-Labor and North Dakota's Democratic-NPL are
 * state affiliates of the Democratic Party — their members caucus and are
 * elected as Democrats, so they map to DEM rather than being dropped.
 */
const PARTY_CODE_BY_NAME = new Map<string, string>([
  ["democrat", "DEM"],
  ["democratic", "DEM"],
  ["democratic-farmer-labor", "DEM"],
  ["democratic-npl", "DEM"],
  ["republican", "REP"],
  ["independent", "IND"],
  ["independent democrat", "IND"],
  ["libertarian", "LIB"],
]);

export function partyCodeFromSource(raw: string | null): string | null {
  if (!raw) return null;
  return PARTY_CODE_BY_NAME.get(raw.trim().toLowerCase()) ?? null;
}

/**
 * Flatten one legislators-*.yaml document. Party is taken from the LAST term,
 * which for a current member is the term they are serving now and for a former
 * member is the one they left — in both cases "their party" as a reader means
 * it. Entries with no bioguide are dropped; there is nothing to join them to.
 */
export function flattenLegislators(
  parsed: unknown,
  sitting: boolean,
): MemberParty[] {
  if (!Array.isArray(parsed)) return [];
  const out: MemberParty[] = [];
  for (const raw of parsed) {
    const rec = asRecord(raw);
    const ids = asRecord(rec?.id);
    const bioguide = getString(ids, "bioguide");
    if (!bioguide) continue;

    const terms = Array.isArray(rec?.terms) ? rec.terms : [];
    const lastTerm = asRecord(terms[terms.length - 1]);
    const party = partyCodeFromSource(getString(lastTerm, "party"));
    // Only meaningful when it disagrees with `party`; storing a caucus equal
    // to the party would be noise the read layer has to re-filter anyway.
    const caucusRaw = partyCodeFromSource(getString(lastTerm, "caucus"));
    const caucus = caucusRaw && caucusRaw !== party ? caucusRaw : null;

    const fecRaw = ids?.fec;
    const fecIds = Array.isArray(fecRaw)
      ? fecRaw.filter((f): f is string => typeof f === "string" && !!f.trim())
      : [];

    out.push({ bioguide, party, caucus, fecIds, sitting });
  }
  return out;
}

/**
 * Merge current over historical. A bioguide in both files (a member who left
 * and later returned, or a mid-run source update) is a SITTING member — the
 * current file wins, so `is_incumbent` is never flipped false for someone
 * presently in office.
 */
export function mergeLegislators(
  historical: MemberParty[],
  current: MemberParty[],
): MemberParty[] {
  const byBioguide = new Map<string, MemberParty>();
  for (const m of historical) byBioguide.set(m.bioguide, m);
  for (const m of current) byBioguide.set(m.bioguide, m);
  return [...byBioguide.values()];
}

export interface ExistingCandidate {
  party: string | null;
  caucus: string | null;
  isIncumbent: boolean;
}

export interface PlannedUpdate {
  candidateId: string;
  party: string | null;
  caucus: string | null;
  /** null on `fec-` rows — this source can't speak to FEC filer incumbency. */
  isIncumbent: boolean | null;
}

/**
 * Turn merged source members into the concrete per-row updates, keeping only
 * rows that exist and whose stored value actually differs. Returning the
 * planned diff (rather than blind-upserting everything) is what makes
 * --dry-run able to report the real blast radius.
 */
export function planUpdates(
  members: MemberParty[],
  existing: Map<string, ExistingCandidate>,
): PlannedUpdate[] {
  const out: PlannedUpdate[] = [];
  for (const m of members) {
    if (!m.party) continue; // unmappable — leave the stored value alone

    const federalId = candidateIdFromBioguide(m.bioguide);
    const federalRow = existing.get(federalId);
    if (
      federalRow &&
      (federalRow.party !== m.party ||
        federalRow.caucus !== m.caucus ||
        federalRow.isIncumbent !== m.sitting)
    ) {
      out.push({
        candidateId: federalId,
        party: m.party,
        caucus: m.caucus,
        isIncumbent: m.sitting,
      });
    }

    for (const fecId of m.fecIds) {
      const id = candidateIdFromFecId(fecId);
      const row = existing.get(id);
      if (row && (row.party !== m.party || row.caucus !== m.caucus)) {
        out.push({
          candidateId: id,
          party: m.party,
          caucus: m.caucus,
          isIncumbent: null,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchYaml(url: string, fetcher: Fetcher): Promise<unknown> {
  const res = await fetcher(url, {
    headers: {
      "user-agent": "voter-choice-member-party-ingest",
      accept: "application/vnd.github.raw+json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return yaml.load(await res.text());
}

export async function fetchLegislators(
  fetcher: Fetcher,
  opts: { currentOnly?: boolean } = {},
): Promise<{ current: MemberParty[]; historical: MemberParty[] }> {
  const current = flattenLegislators(
    await fetchYaml(CURRENT_API_URL, fetcher),
    true,
  );
  // legislators-historical.yaml is ~12 MB; fetched second (not in parallel) so
  // a --current-only run never pays for it.
  const historical = opts.currentOnly
    ? []
    : flattenLegislators(await fetchYaml(HISTORICAL_API_URL, fetcher), false);
  return { current, historical };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runMemberPartyIngest(
  db: DbClient,
  fetcher: Fetcher,
  opts: { dryRun?: boolean; currentOnly?: boolean } = {},
): Promise<MemberPartyCounts> {
  const { current, historical } = await fetchLegislators(fetcher, {
    currentOnly: opts.currentOnly,
  });
  console.log(
    `[member-party] fetched ${current.length} current, ${historical.length} historical legislators`,
  );

  const merged = mergeLegislators(historical, current);
  const skippedUnmappableParty = merged.filter((m) => !m.party).length;

  const candidateIds = new Set<string>();
  for (const m of merged) {
    candidateIds.add(candidateIdFromBioguide(m.bioguide));
    for (const f of m.fecIds) candidateIds.add(candidateIdFromFecId(f));
  }

  // Read the current values so the plan is a real diff. Chunked — the id list
  // runs to tens of thousands once historical is included.
  const existing = new Map<string, ExistingCandidate>();
  const idList = [...candidateIds];
  const CHUNK = 2_000;
  for (let i = 0; i < idList.length; i += CHUNK) {
    const rows = await db
      .select({
        id: candidates.id,
        party: candidates.party,
        caucus: candidates.caucus,
        isIncumbent: candidates.isIncumbent,
      })
      .from(candidates)
      .where(inArray(candidates.id, idList.slice(i, i + CHUNK)));
    for (const r of rows)
      existing.set(r.id, {
        party: r.party,
        caucus: r.caucus,
        isIncumbent: r.isIncumbent,
      });
  }

  const updates = planUpdates(merged, existing);
  const partyUpdated = updates.filter(
    (u) => existing.get(u.candidateId)?.party !== u.party,
  ).length;
  const caucusUpdated = updates.filter(
    (u) => (existing.get(u.candidateId)?.caucus ?? null) !== u.caucus,
  ).length;
  const incumbencyUpdated = updates.filter(
    (u) =>
      u.isIncumbent !== null &&
      existing.get(u.candidateId)?.isIncumbent !== u.isIncumbent,
  ).length;
  const skippedNoCandidate = merged.filter(
    (m) => !existing.has(candidateIdFromBioguide(m.bioguide)),
  ).length;

  if (opts.dryRun) {
    for (const u of updates.slice(0, 20)) {
      const before = existing.get(u.candidateId);
      console.log(
        `[member-party] [dry-run] ${u.candidateId}: party ${before?.party ?? "null"} -> ${u.party}` +
          (before?.caucus !== u.caucus
            ? `, caucus ${before?.caucus ?? "null"} -> ${u.caucus ?? "null"}`
            : "") +
          (u.isIncumbent === null
            ? ""
            : `, is_incumbent ${before?.isIncumbent} -> ${u.isIncumbent}`),
      );
    }
    if (updates.length > 20)
      console.log(`[member-party] [dry-run] … ${updates.length - 20} more`);
  } else {
    for (const u of updates) {
      await db
        .update(candidates)
        .set(
          u.isIncumbent === null
            ? { party: u.party, caucus: u.caucus, updatedAt: sql`now()` }
            : {
                party: u.party,
                caucus: u.caucus,
                isIncumbent: u.isIncumbent,
                updatedAt: sql`now()`,
              },
        )
        .where(inArray(candidates.id, [u.candidateId]));
    }
  }

  return {
    currentFetched: current.length,
    historicalFetched: historical.length,
    partyUpdated,
    caucusUpdated,
    incumbencyUpdated,
    skippedNoCandidate,
    skippedUnmappableParty,
  };
}

function parseArgs(argv: string[]): { dryRun: boolean; currentOnly: boolean } {
  return {
    dryRun: argv.includes("--dry-run"),
    currentOnly: argv.includes("--current-only"),
  };
}

async function main(): Promise<void> {
  const db = requireDb();
  const { dryRun, currentOnly } = parseArgs(process.argv.slice(2));
  const counts = await runMemberPartyIngest(db, fetch, { dryRun, currentOnly });
  console.log(
    `[member-party]${dryRun ? " [dry-run]" : ""} done ` +
      `current=${counts.currentFetched} historical=${counts.historicalFetched} ` +
      `party_updated=${counts.partyUpdated} caucus_updated=${counts.caucusUpdated} ` +
      `incumbency_updated=${counts.incumbencyUpdated} ` +
      `skipped_no_candidate=${counts.skippedNoCandidate} ` +
      `skipped_unmappable_party=${counts.skippedUnmappableParty}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[member-party] fatal:", err);
    process.exit(1);
  });
}

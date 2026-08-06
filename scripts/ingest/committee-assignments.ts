/**
 * scripts/ingest/committee-assignments.ts
 *
 * Standing committee assignments for sitting Members of Congress —
 * `committees` (the roster of House/Senate/joint committees and
 * subcommittees) and `committee_memberships` (who sits on which, and at
 * what rank/title — chair/ranking is the actual power lever).
 *
 * Source: unitedstates/congress-legislators (CC0 public domain), fetched via
 * the GitHub Contents API with `accept: application/vnd.github.raw+json` so
 * this ingest never depends on raw.githubusercontent.com:
 *   • committees-current.yaml            — committee/subcommittee roster
 *   • committee-membership-current.yaml  — bioguide-keyed membership per
 *                                           committee/subcommittee thomas_id
 *
 * Bioguide → candidate-id join mirrors member-stats.ts's `federal-<BIOGUIDE>`
 * convention — not member_civic_positions, which is Senate-only and cannot
 * crosswalk the House.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/committee-assignments.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/committee-assignments.ts --congress 119
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/committee-assignments.ts --dry-run
 *
 * Idempotency: committees upsert on thomas_id (PK); memberships upsert on
 * (candidate_id, committee_id, congress). Members/committees with no
 * matching `candidates` row (or, for memberships, no matching committee
 * fetched this run) are skipped and counted, never thrown.
 *
 * Reconciliation: upsert alone can only ever ADD, so a member who leaves a
 * committee would render on their card forever. After a successful run this
 * deletes the memberships for the ingested congress that the source no longer
 * lists (`fetched_at` older than the run) — scoped to that one congress, and
 * skipped entirely when the run resolved implausibly few rows, so a truncated
 * fetch leaves data stale rather than emptying the table.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { sql, and, eq, lt, inArray } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, committees, committeeMemberships } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const COMMITTEES_API_URL =
  "https://api.github.com/repos/unitedstates/congress-legislators/contents/committees-current.yaml";
const MEMBERSHIP_API_URL =
  "https://api.github.com/repos/unitedstates/congress-legislators/contents/committee-membership-current.yaml";

// Human-facing citation links stored in source_url — distinct from the API
// URLs above, which exist only to fetch the raw file inside this ingest.
const COMMITTEES_SOURCE_URL =
  "https://github.com/unitedstates/congress-legislators/blob/main/committees-current.yaml";
const MEMBERSHIP_SOURCE_URL =
  "https://github.com/unitedstates/congress-legislators/blob/main/committee-membership-current.yaml";

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;
type Chamber = "house" | "senate" | "joint";

export interface FlatCommittee {
  thomasId: string;
  name: string;
  chamber: Chamber;
  jurisdiction: string | null;
  parentCommitteeId: string | null;
}

export interface FlatMembership {
  committeeId: string;
  candidateId: string;
  rank: number | null;
  title: string | null;
}

export interface CommitteeRow {
  thomasId: string;
  name: string;
  chamber: string;
  jurisdiction: string | null;
  parentCommitteeId: string | null;
  source: string;
  sourceUrl: string;
}

export interface MembershipRow {
  candidateId: string;
  committeeId: string;
  rank: number | null;
  title: string | null;
  congress: number;
  source: string;
  sourceUrl: string;
}

export interface CommitteeAssignmentsCounts {
  committeesFetched: number;
  committeesUpserted: number;
  membershipsFetched: number;
  membershipsUpserted: number;
  skippedNoCandidate: number;
  skippedNoCommittee: number;
  /**
   * Memberships removed because the source no longer lists them for this
   * congress — a member who left a committee. Upsert alone can only ever add,
   * so without this a stale assignment renders forever. See `prunedSkipped`.
   */
  membershipsDeleted: number;
  /**
   * True when the prune was SKIPPED because this run fetched implausibly few
   * memberships (a truncated or failed YAML fetch). Deleting on that input
   * would empty the table; leaving the rows stale is the safer failure.
   */
  prunedSkipped: boolean;
}

/**
 * Below this many membership rows in a single run, we assume the fetch is
 * broken rather than that Congress dissolved its committees. Real runs return
 * ~3,000 rows (House + Senate, committees + subcommittees); the floor is set
 * two orders of magnitude below that so it only ever catches a broken fetch.
 */
export const MIN_MEMBERSHIPS_FOR_PRUNE = 100;

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

function isChamber(v: string | null): v is Chamber {
  return v === "house" || v === "senate" || v === "joint";
}

/** Mirror of member-stats.ts's candidateIdFromPerson, for a bare bioguide id. */
export function candidateIdFromBioguide(bioguide: string): string {
  return `federal-${sanitizeIdPart(bioguide).toUpperCase()}`;
}

/**
 * Flatten committees-current.yaml into one row per committee AND one row
 * per subcommittee. A subcommittee's thomas_id is its parent's thomas_id
 * plus its own suffix (e.g. "HSAG" + "15" = "HSAG15") — this is exactly how
 * committee-membership-current.yaml keys subcommittee membership, so it must
 * match precisely for the membership join below to resolve.
 */
export function flattenCommittees(parsed: unknown): FlatCommittee[] {
  if (!Array.isArray(parsed)) return [];
  const out: FlatCommittee[] = [];
  for (const raw of parsed) {
    const rec = asRecord(raw);
    const thomasId = getString(rec, "thomas_id");
    const name = getString(rec, "name");
    const chamber = getString(rec, "type");
    if (!thomasId || !name || !isChamber(chamber)) continue;
    out.push({
      thomasId,
      name,
      chamber,
      jurisdiction: getString(rec, "jurisdiction"),
      parentCommitteeId: null,
    });

    const subcommittees = rec?.subcommittees;
    if (!Array.isArray(subcommittees)) continue;
    for (const subRaw of subcommittees) {
      const sub = asRecord(subRaw);
      const subSuffix = getString(sub, "thomas_id");
      const subName = getString(sub, "name");
      if (!subSuffix || !subName) continue;
      out.push({
        thomasId: `${thomasId}${subSuffix}`,
        name: subName,
        chamber,
        jurisdiction: null,
        parentCommitteeId: thomasId,
      });
    }
  }
  return out;
}

/**
 * Flatten committee-membership-current.yaml (an object keyed by
 * committee/subcommittee thomas_id, each value an array of member entries)
 * into a flat list. Entries with no bioguide (rare historical rows) are
 * dropped — there is nothing to join them to.
 */
export function flattenMembership(parsed: unknown): FlatMembership[] {
  const rec = asRecord(parsed);
  if (!rec) return [];
  const out: FlatMembership[] = [];
  for (const [committeeId, entries] of Object.entries(rec)) {
    if (!Array.isArray(entries)) continue;
    for (const entryRaw of entries) {
      const entry = asRecord(entryRaw);
      const bioguide = getString(entry, "bioguide");
      if (!bioguide) continue;
      const rankRaw = entry?.rank;
      const rank =
        typeof rankRaw === "number" && Number.isInteger(rankRaw)
          ? rankRaw
          : null;
      out.push({
        committeeId,
        candidateId: candidateIdFromBioguide(bioguide),
        rank,
        title: getString(entry, "title"),
      });
    }
  }
  return out;
}

export function buildCommitteeRows(
  flat: FlatCommittee[],
  sourceUrl: string,
): CommitteeRow[] {
  return flat.map((c) => ({
    thomasId: c.thomasId,
    name: c.name,
    chamber: c.chamber,
    jurisdiction: c.jurisdiction,
    parentCommitteeId: c.parentCommitteeId,
    source: "congress-legislators",
    sourceUrl,
  }));
}

export function buildMembershipRows(
  flat: FlatMembership[],
  knownCommitteeIds: Set<string>,
  congress: number,
  sourceUrl: string,
): MembershipRow[] {
  return flat
    .filter((m) => knownCommitteeIds.has(m.committeeId))
    .map((m) => ({
      candidateId: m.candidateId,
      committeeId: m.committeeId,
      rank: m.rank,
      title: m.title,
      congress,
      source: "congress-legislators",
      sourceUrl,
    }));
}

/** Same epoch formula as federal-votes.ts's getCurrentCongress. */
export function currentCongress(now: Date = new Date()): number {
  return Math.floor((now.getUTCFullYear() - 1789) / 2) + 1;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchYaml(url: string, fetcher: Fetcher): Promise<unknown> {
  const res = await fetcher(url, {
    headers: {
      "user-agent": "voter-choice-committee-assignments-ingest",
      accept: "application/vnd.github.raw+json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return yaml.load(await res.text());
}

export async function fetchCommittees(
  fetcher: Fetcher,
): Promise<FlatCommittee[]> {
  return flattenCommittees(await fetchYaml(COMMITTEES_API_URL, fetcher));
}

export async function fetchMembership(
  fetcher: Fetcher,
): Promise<FlatMembership[]> {
  return flattenMembership(await fetchYaml(MEMBERSHIP_API_URL, fetcher));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runCommitteeAssignmentsIngest(
  db: DbClient,
  fetcher: Fetcher,
  opts: { congress?: number; dryRun?: boolean } = {},
): Promise<CommitteeAssignmentsCounts> {
  const [flatCommittees, flatMembership] = await Promise.all([
    fetchCommittees(fetcher),
    fetchMembership(fetcher),
  ]);
  console.log(
    `[committee-assignments] fetched ${flatCommittees.length} committees, ${flatMembership.length} membership rows`,
  );

  const congress = opts.congress ?? currentCongress();
  const committeeRows = buildCommitteeRows(
    flatCommittees,
    COMMITTEES_SOURCE_URL,
  );
  const knownCommitteeIds = new Set(committeeRows.map((c) => c.thomasId));

  const existingCandidates = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      inArray(candidates.jurisdiction, ["federal-house", "federal-senate"]),
    );
  const knownCandidateIds = new Set(existingCandidates.map((r) => r.id));

  const membershipRowsAll = buildMembershipRows(
    flatMembership,
    knownCommitteeIds,
    congress,
    MEMBERSHIP_SOURCE_URL,
  );
  const skippedNoCommittee = flatMembership.length - membershipRowsAll.length;
  const membershipRows = membershipRowsAll.filter((m) =>
    knownCandidateIds.has(m.candidateId),
  );
  const skippedNoCandidate = membershipRowsAll.length - membershipRows.length;

  // Taken BEFORE the upsert loop: every row this run touches gets
  // fetched_at = now(), so anything still older than this afterwards is a row
  // the current source no longer lists. That is the prune set.
  const runStart = new Date();

  if (!opts.dryRun) {
    // Parent committees insert before their subcommittees (self-FK on
    // parent_committee_id) — flattenCommittees already orders each parent
    // immediately before its subcommittees, and this loop is sequential.
    for (const row of committeeRows) {
      await db
        .insert(committees)
        .values(row)
        .onConflictDoUpdate({
          target: committees.thomasId,
          set: {
            name: sql`excluded.name`,
            chamber: sql`excluded.chamber`,
            jurisdiction: sql`excluded.jurisdiction`,
            parentCommitteeId: sql`excluded.parent_committee_id`,
            source: sql`excluded.source`,
            sourceUrl: sql`excluded.source_url`,
            updatedAt: sql`now()`,
          },
        });
    }

    for (const row of membershipRows) {
      await db
        .insert(committeeMemberships)
        .values(row)
        .onConflictDoUpdate({
          target: [
            committeeMemberships.candidateId,
            committeeMemberships.committeeId,
            committeeMemberships.congress,
          ],
          set: {
            rank: sql`excluded.rank`,
            title: sql`excluded.title`,
            source: sql`excluded.source`,
            sourceUrl: sql`excluded.source_url`,
            fetchedAt: sql`now()`,
          },
        });
    }
  }

  // Reconcile: drop this congress's memberships the source no longer lists.
  // Scoped to `congress` so a run for the current congress never touches a
  // historical one, and gated on a plausible fetch so a truncated YAML can't
  // empty the table.
  let membershipsDeleted = 0;
  let prunedSkipped = false;
  if (opts.dryRun) {
    prunedSkipped = true;
  } else if (membershipRows.length < MIN_MEMBERSHIPS_FOR_PRUNE) {
    prunedSkipped = true;
    console.warn(
      `[committee-assignments] PRUNE SKIPPED — only ${membershipRows.length} memberships ` +
        `resolved this run (floor ${MIN_MEMBERSHIPS_FOR_PRUNE}). Stale assignments for ` +
        `congress ${congress} were left in place; the fetch is the thing to fix.`,
    );
  } else {
    const deleted = await db
      .delete(committeeMemberships)
      .where(
        and(
          eq(committeeMemberships.congress, congress),
          lt(committeeMemberships.fetchedAt, runStart),
        ),
      )
      .returning({ id: committeeMemberships.id });
    membershipsDeleted = deleted.length;
    if (membershipsDeleted > 0) {
      console.log(
        `[committee-assignments] pruned ${membershipsDeleted} membership row(s) ` +
          `no longer listed for congress ${congress}`,
      );
    }
  }

  return {
    committeesFetched: flatCommittees.length,
    committeesUpserted: committeeRows.length,
    membershipsFetched: flatMembership.length,
    membershipsUpserted: membershipRows.length,
    skippedNoCandidate,
    skippedNoCommittee,
    membershipsDeleted,
    prunedSkipped,
  };
}

function parseArgs(argv: string[]): { congress?: number; dryRun: boolean } {
  const idx = argv.indexOf("--congress");
  const n = idx !== -1 ? Number(argv[idx + 1]) : NaN;
  return {
    congress: Number.isInteger(n) ? n : undefined,
    dryRun: argv.includes("--dry-run"),
  };
}

async function main(): Promise<void> {
  const db = requireDb();
  const { congress, dryRun } = parseArgs(process.argv.slice(2));
  const counts = await runCommitteeAssignmentsIngest(db, fetch, {
    congress,
    dryRun,
  });
  console.log(
    `[committee-assignments]${dryRun ? " [dry-run]" : ""} done ` +
      `committees=${counts.committeesUpserted}/${counts.committeesFetched} ` +
      `memberships=${counts.membershipsUpserted}/${counts.membershipsFetched} ` +
      `pruned=${counts.membershipsDeleted}${counts.prunedSkipped ? " (prune skipped)" : ""} ` +
      `skipped_no_candidate=${counts.skippedNoCandidate} skipped_no_committee=${counts.skippedNoCommittee}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[committee-assignments] fatal:", err);
    process.exit(1);
  });
}

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
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/committee-assignments.ts --preview-prune
 *
 * `--preview-prune` upserts as normal but PRINTS the rows the reconciliation
 * would delete instead of deleting them. Run this once against prod before the
 * scheduled job is trusted to prune unattended — `--dry-run` will not tell you,
 * because it skips the upserts too and so has no prune set to report.
 *
 * Idempotency: committees upsert on thomas_id (PK); memberships upsert on
 * (candidate_id, committee_id, congress). Members/committees with no
 * matching `candidates` row (or, for memberships, no matching committee
 * fetched this run) are skipped and counted, never thrown.
 *
 * Reconciliation: upsert alone can only ever ADD, so a member who leaves a
 * committee would render on their card forever. After a successful run this
 * deletes the memberships for the ingested congress that the source no longer
 * lists — bounded by explicit key (see computePruneScope), scoped to that one
 * congress, and skipped entirely when the run looks incomplete, so a truncated
 * fetch leaves data stale rather than emptying the table.
 *
 * KNOWN LIMITATION, accepted deliberately: two classes of row are never pruned.
 * A committee DISSOLVED (dropped from committees-current.yaml) falls outside
 * `fetchedCommitteeIds`, and a member who left Congress entirely is never
 * refreshed, so neither can be deleted. Both are the price of not being able to
 * tell "gone from the source" from "not fetched this run" — the distinction the
 * whole prune is built around. A dissolved committee can therefore still render
 * on a sitting member's card until someone clears it by hand; a departed
 * member's rows are normally invisible because delegation only resolves
 * `is_incumbent = true`. Fixing the first properly needs committee-lifecycle
 * reconciliation (tombstoning committees, not just memberships), which is a
 * larger change than this ingest.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import yaml from "js-yaml";
import { sql, and, eq, inArray, notInArray } from "drizzle-orm";
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

/** The three explicit bounds the prune deletes within. See computePruneScope. */
export interface PruneScope {
  /** Members whose assignments this run actually refreshed. */
  refreshedMemberIds: string[];
  /** Committees this run actually fetched. */
  fetchedCommitteeIds: string[];
  /** "<candidateId>|<committeeId>" for every membership this run wrote. */
  keptKeys: string[];
}

/**
 * Work out exactly what the prune is allowed to delete.
 *
 * Deleting "anything this run didn't touch" is the obvious implementation and
 * it is wrong three ways, each of which silently destroys real data:
 *
 *  1. A membership the run SKIPPED (no matching `candidates` row, or a
 *     committee absent from committees-current.yaml) was never upserted — it
 *     looks identical to a membership the source dropped. Scoping the delete to
 *     `refreshedMemberIds` × `fetchedCommitteeIds` means a skip leaves the row
 *     alone instead of deleting a seat the member still holds.
 *  2. Timestamps can't carry this. The upserts stamp `fetched_at = now()` —
 *     the DATABASE clock — while any run-start marker we capture here is the
 *     APPLICATION clock. A database even slightly behind the runner makes rows
 *     we just wrote look older than the run and therefore deletable. Keys don't
 *     have that failure mode, so this compares keys.
 *  3. A partially-failed upsert loop leaves some rows written and some not. The
 *     kept-key set is built from the rows we INTENDED to write, so a throw
 *     mid-loop aborts before the delete rather than pruning the remainder.
 *
 * Net effect: the prune only ever removes a committee seat from a member whose
 * record this run successfully refreshed, on a committee this run saw. Anything
 * uncertain stays — stale data is a smaller lie than a member's committee list
 * silently emptying.
 */
export function computePruneScope(
  membershipRows: { candidateId: string; committeeId: string }[],
  knownCommitteeIds: Set<string>,
): PruneScope {
  return {
    refreshedMemberIds: [...new Set(membershipRows.map((m) => m.candidateId))],
    fetchedCommitteeIds: [...knownCommitteeIds],
    keptKeys: membershipRows.map((m) => `${m.candidateId}|${m.committeeId}`),
  };
}

/**
 * Below this many membership rows FROM THE SOURCE, we assume the fetch is
 * broken rather than that Congress dissolved its committees, and skip the prune
 * entirely. Real runs return ~3,000 rows (House + Senate, committees +
 * subcommittees); the floor sits two orders of magnitude below that so it only
 * ever catches a broken fetch.
 *
 * Deliberately measured against the RAW fetched count, not the count surviving
 * the candidate/committee join — a broken join is precisely the case where the
 * filtered number shrinks, so gating on it would let a half-resolved run
 * authorise its own deletions.
 */
export const MIN_MEMBERSHIPS_FOR_PRUNE = 100;

/**
 * Second floor, on DISTINCT MEMBERS whose assignments resolved this run.
 *
 * The raw-row floor above catches a fetch that failed outright. It cannot catch
 * a fetch that succeeded but returned a truncated or malformed payload: 1 real
 * membership plus 99 duplicate or orphan rows clears a 100-ROW floor, and the
 * one member in it would then have their other committees pruned as departures.
 * Requiring ~100 distinct refreshed members closes that — a real run refreshes
 * ~530, and no plausible truncation yields both a full row count and almost no
 * members.
 *
 * Neither floor can detect a payload truncated WITHIN a member (some of their
 * committees present, the rest dropped). Nothing count-based can. That residual
 * is accepted: it needs a source file that is well-formed, full-length, covers
 * hundreds of members, and is still wrong per-member.
 */
export const MIN_MEMBERS_FOR_PRUNE = 100;

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

/**
 * The prune's WHERE clause, built once and shared by the preview and the real
 * delete. They must never diverge — a preview that shows a different row set
 * than the delete removes is worse than no preview at all.
 */
function pruneFilter(congress: number, scope: PruneScope) {
  return and(
    eq(committeeMemberships.congress, congress),
    inArray(committeeMemberships.candidateId, scope.refreshedMemberIds),
    inArray(committeeMemberships.committeeId, scope.fetchedCommitteeIds),
    notInArray(
      sql`${committeeMemberships.candidateId} || '|' || ${committeeMemberships.committeeId}`,
      scope.keptKeys,
    ),
  );
}

export async function runCommitteeAssignmentsIngest(
  db: DbClient,
  fetcher: Fetcher,
  opts: { congress?: number; dryRun?: boolean; previewPrune?: boolean } = {},
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
  // Deletes by EXPLICIT KEY, never by timestamp — see computePruneScope for why
  // each bound exists. The floor is checked against the RAW source row count,
  // not the post-filter one: filtering is exactly what a half-broken join does,
  // so gating on the filtered number would let an incomplete run authorise its
  // own deletions.
  const scope = computePruneScope(membershipRows, knownCommitteeIds);
  let membershipsDeleted = 0;
  let prunedSkipped = false;
  if (opts.previewPrune && !opts.dryRun) {
    // Show what the prune WOULD remove, and remove nothing. The first real run
    // of this delete happens unattended on a Sunday cron, so there has to be a
    // way to look at it first. `--dry-run` can't serve: it skips the upserts
    // too, so nothing is refreshed and the prune set is meaningless.
    const doomed = await db
      .select({
        candidateId: committeeMemberships.candidateId,
        committeeId: committeeMemberships.committeeId,
        title: committeeMemberships.title,
      })
      .from(committeeMemberships)
      .where(pruneFilter(congress, scope));
    prunedSkipped = true;
    console.log(
      `[committee-assignments] PREVIEW — would prune ${doomed.length} membership ` +
        `row(s) for congress ${congress}. Nothing was deleted.`,
    );
    for (const row of doomed) {
      console.log(
        `  would delete: ${row.candidateId} from ${row.committeeId}` +
          `${row.title ? ` (${row.title})` : ""}`,
      );
    }
  } else if (opts.dryRun) {
    prunedSkipped = true;
  } else if (flatMembership.length < MIN_MEMBERSHIPS_FOR_PRUNE) {
    prunedSkipped = true;
    console.warn(
      `[committee-assignments] PRUNE SKIPPED — the source returned only ` +
        `${flatMembership.length} membership rows (floor ${MIN_MEMBERSHIPS_FOR_PRUNE}). ` +
        `Stale assignments for congress ${congress} were left in place; the fetch is ` +
        `the thing to fix.`,
    );
  } else if (scope.refreshedMemberIds.length < MIN_MEMBERS_FOR_PRUNE) {
    prunedSkipped = true;
    console.warn(
      `[committee-assignments] PRUNE SKIPPED — only ` +
        `${scope.refreshedMemberIds.length} distinct members resolved this run ` +
        `(floor ${MIN_MEMBERS_FOR_PRUNE}). A full-length but truncated payload ` +
        `looks like mass departures; leaving congress ${congress} stale instead.`,
    );
  } else {
    const deleted = await db
      .delete(committeeMemberships)
      .where(pruneFilter(congress, scope))
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

function parseArgs(argv: string[]): {
  congress?: number;
  dryRun: boolean;
  previewPrune: boolean;
} {
  const idx = argv.indexOf("--congress");
  const n = idx !== -1 ? Number(argv[idx + 1]) : NaN;
  return {
    congress: Number.isInteger(n) ? n : undefined,
    dryRun: argv.includes("--dry-run"),
    previewPrune: argv.includes("--preview-prune"),
  };
}

async function main(): Promise<void> {
  const db = requireDb();
  const { congress, dryRun, previewPrune } = parseArgs(process.argv.slice(2));
  const counts = await runCommitteeAssignmentsIngest(db, fetch, {
    congress,
    dryRun,
    previewPrune,
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

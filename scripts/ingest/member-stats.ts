/**
 * scripts/ingest/member-stats.ts
 *
 * Per-incumbent GovTrack stats ingest for the `member_stats` table:
 * attendance (missed floor votes this congress), authoritative state /
 * district / senate class & rank, and current term end.
 *
 * Sources (free, keyless):
 *   • GET https://www.govtrack.us/api/v2/role?current=true
 *       — all 538 sitting members: state, district, senator_class,
 *         senator_rank, enddate, person.bioguideid (joins to our
 *         `federal-<BIOGUIDE>` candidate ids).
 *   • https://www.govtrack.us/data/analysis/by-congress/<N>/missedvotes_thiscongress_{h,s}.csv
 *       — GovTrack's own missed-votes analysis, keyed by GovTrack person id
 *         (CSV columns: id,total_votes,missed_votes,percent,percentile).
 *         Per HANDOFF.md this must NEVER be derived from our partial
 *         issue-tagged `votes` table.
 *
 * Chamber medians are computed across the joined members in the same run and
 * stored on every row (drives the good/mid/bad attendance band).
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/member-stats.ts
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/member-stats.ts --congress 119
 *
 * Idempotency: upserts on candidate_id (one row per sitting member).
 * Members with no matching `candidates` row are skipped (logged) — the FK
 * requires the federal-votes ingest to have run first.
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql, inArray } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, memberStats } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const GOVTRACK_ROLE_URL =
  "https://www.govtrack.us/api/v2/role?current=true&limit=600";

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

export interface CurrentRole {
  candidateId: string;
  govtrackPersonId: string | null;
  chamber: "house" | "senate";
  state: string | null;
  district: number | null;
  senatorClass: string | null; // "1" | "2" | "3"
  senatorRank: string | null; // "senior" | "junior"
  currentTermEnd: string | null; // YYYY-MM-DD
  congressNumbers: number[];
}

export interface MissedVotesStat {
  totalVotes: number;
  missedVotes: number;
  percent: number;
}

export interface MemberStatsRow {
  candidateId: string;
  chamber: string;
  state: string | null;
  district: number | null;
  senatorRank: string | null;
  missedVotesPct: string | null;
  votesEligible: string | null;
  chamberMedianPct: string | null;
  currentTermEnd: string | null;
  senateClass: string | null;
  source: string;
  sourceUrl: string;
}

export interface MemberStatsCounts {
  rolesFetched: number;
  rowsUpserted: number;
  skippedNoCandidate: number;
  missingAttendance: number;
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

/** Mirror of federal-votes buildCandidateId for role-API person records. */
export function candidateIdFromPerson(person: UnknownRecord): string | null {
  const bioguide = getString(person, "bioguideid");
  if (bioguide) return `federal-${sanitizeIdPart(bioguide).toUpperCase()}`;
  const personId = govtrackPersonIdFromPerson(person);
  return personId ? `federal-govtrack-${personId}` : null;
}

/** GovTrack person id — explicit `id` field or the trailing digits of `link`. */
export function govtrackPersonIdFromPerson(
  person: UnknownRecord,
): string | null {
  const id = person.id;
  if (typeof id === "number" && Number.isInteger(id)) return String(id);
  if (typeof id === "string" && /^\d+$/.test(id)) return id;
  const link = getString(person, "link");
  const m = link?.match(/\/(\d+)\/?$/);
  return m ? m[1] : null;
}

/** Parse one GovTrack role object into a CurrentRole (null = unusable). */
export function parseRole(role: unknown): CurrentRole | null {
  const rec = asRecord(role);
  const person = asRecord(rec?.person);
  if (!rec || !person) return null;

  const candidateId = candidateIdFromPerson(person);
  if (!candidateId) return null;

  const roleType = getString(rec, "role_type");
  const chamber =
    roleType === "senator"
      ? ("senate" as const)
      : roleType === "representative"
        ? ("house" as const)
        : null;
  if (!chamber) return null; // skip delegates / commissioners

  const districtRaw = rec.district;
  const district =
    typeof districtRaw === "number" && Number.isInteger(districtRaw)
      ? districtRaw
      : null;

  const classRaw = getString(rec, "senator_class");
  const senatorClass = classRaw ? (classRaw.match(/\d/)?.[0] ?? null) : null;

  const congressNumbers = Array.isArray(rec.congress_numbers)
    ? rec.congress_numbers.filter(
        (n): n is number => typeof n === "number" && Number.isInteger(n),
      )
    : [];

  return {
    candidateId,
    govtrackPersonId: govtrackPersonIdFromPerson(person),
    chamber,
    state: getString(rec, "state")?.toUpperCase() ?? null,
    district,
    senatorClass,
    senatorRank: getString(rec, "senator_rank"),
    currentTermEnd: getString(rec, "enddate"),
    congressNumbers,
  };
}

/**
 * Parse a GovTrack missedvotes CSV (id,total_votes,missed_votes,percent,…)
 * into a per-person-id map. No quoted fields in this format.
 */
export function parseMissedVotesCsv(csv: string): Map<string, MissedVotesStat> {
  const out = new Map<string, MissedVotesStat>();
  const lines = csv.split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    if (cols.length < 4) continue;
    const [id, totalVotes, missedVotes, percent] = cols;
    if (!/^\d+$/.test(id)) continue;
    const total = Number(totalVotes);
    const missed = Number(missedVotes);
    const pct = Number(percent);
    if (!Number.isFinite(total) || !Number.isFinite(pct)) continue;
    out.set(id, {
      totalVotes: total,
      missedVotes: Number.isFinite(missed) ? missed : 0,
      percent: pct,
    });
  }
  return out;
}

/** Median of a list (returns null for an empty list), rounded to 2 dp. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(m * 100) / 100;
}

/**
 * Join roles with attendance stats into upsert-ready rows. Members missing
 * from the CSVs (e.g. just sworn in) get null attendance — the UI renders an
 * honest "not tracked yet" state.
 */
export function buildMemberStatsRows(
  roles: CurrentRole[],
  attendanceByPersonId: Map<string, MissedVotesStat>,
  sourceUrl: string,
): MemberStatsRow[] {
  const chamberPcts: Record<"house" | "senate", number[]> = {
    house: [],
    senate: [],
  };
  for (const role of roles) {
    const stat = role.govtrackPersonId
      ? attendanceByPersonId.get(role.govtrackPersonId)
      : undefined;
    if (stat) chamberPcts[role.chamber].push(stat.percent);
  }
  const medians = {
    house: median(chamberPcts.house),
    senate: median(chamberPcts.senate),
  };

  return roles.map((role) => {
    const stat = role.govtrackPersonId
      ? attendanceByPersonId.get(role.govtrackPersonId)
      : undefined;
    const chamberMedian = medians[role.chamber];
    return {
      candidateId: role.candidateId,
      chamber: role.chamber,
      state: role.state,
      district: role.chamber === "house" ? role.district : null,
      senatorRank: role.chamber === "senate" ? role.senatorRank : null,
      missedVotesPct:
        stat !== undefined
          ? (Math.round(stat.percent * 100) / 100).toFixed(2)
          : null,
      votesEligible: stat !== undefined ? String(stat.totalVotes) : null,
      chamberMedianPct:
        stat !== undefined && chamberMedian !== null
          ? chamberMedian.toFixed(2)
          : null,
      currentTermEnd: role.currentTermEnd,
      senateClass: role.chamber === "senate" ? role.senatorClass : null,
      source: "govtrack",
      sourceUrl,
    };
  });
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchJson(url: string, fetcher: Fetcher): Promise<unknown> {
  const res = await fetcher(url, {
    headers: { "user-agent": "voter-choice-member-stats-ingest" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function fetchText(url: string, fetcher: Fetcher): Promise<string> {
  const res = await fetcher(url, {
    headers: { "user-agent": "voter-choice-member-stats-ingest" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.text();
}

export async function fetchCurrentRoles(
  fetcher: Fetcher,
): Promise<CurrentRole[]> {
  const payload = await fetchJson(GOVTRACK_ROLE_URL, fetcher);
  const objects = asRecord(payload)?.objects;
  if (!Array.isArray(objects)) {
    throw new Error("GovTrack role API: unexpected payload shape");
  }
  return objects
    .map((o) => parseRole(o))
    .filter((r): r is CurrentRole => r !== null);
}

function missedVotesUrl(congress: number, chamber: "h" | "s"): string {
  return `https://www.govtrack.us/data/analysis/by-congress/${congress}/missedvotes_thiscongress_${chamber}.csv`;
}

/**
 * The sitting congress is the one EVERY current role serves in. Senators'
 * congress_numbers span their six-year terms (a 2025–2031 term lists 119,
 * 120, 121), so a naive max() lands on a future congress with no analysis
 * files. Intersect across roles; fall back to the House max (House roles
 * only span the current congress), then 119.
 */
export function currentCongressFromRoles(roles: CurrentRole[]): number {
  const withNumbers = roles.filter((r) => r.congressNumbers.length > 0);
  if (withNumbers.length > 0) {
    let shared = new Set(withNumbers[0].congressNumbers);
    for (const role of withNumbers.slice(1)) {
      shared = new Set(role.congressNumbers.filter((n) => shared.has(n)));
      if (shared.size === 0) break;
    }
    if (shared.size > 0) return Math.max(...shared);
  }
  const houseMax = Math.max(
    0,
    ...withNumbers
      .filter((r) => r.chamber === "house")
      .flatMap((r) => r.congressNumbers),
  );
  return houseMax > 0 ? houseMax : 119;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runMemberStatsIngest(
  db: DbClient,
  fetcher: Fetcher,
  congressOverride?: number,
): Promise<MemberStatsCounts> {
  const roles = await fetchCurrentRoles(fetcher);
  console.log(`[member-stats] fetched ${roles.length} current roles`);

  const congress = congressOverride ?? currentCongressFromRoles(roles);

  const [houseCsv, senateCsv] = await Promise.all([
    fetchText(missedVotesUrl(congress, "h"), fetcher),
    fetchText(missedVotesUrl(congress, "s"), fetcher),
  ]);
  const attendance = new Map([
    ...parseMissedVotesCsv(houseCsv),
    ...parseMissedVotesCsv(senateCsv),
  ]);
  console.log(
    `[member-stats] congress=${congress} attendance rows: ${attendance.size}`,
  );

  const rows = buildMemberStatsRows(
    roles,
    attendance,
    `https://www.govtrack.us/data/analysis/by-congress/${congress}/`,
  );

  // FK guard: only upsert rows whose candidate exists.
  const existing = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      inArray(candidates.jurisdiction, ["federal-house", "federal-senate"]),
    );
  const known = new Set(existing.map((r) => r.id));

  const upsertable = rows.filter((r) => known.has(r.candidateId));
  const skipped = rows.length - upsertable.length;
  const missingAttendance = upsertable.filter(
    (r) => r.missedVotesPct === null,
  ).length;

  for (const row of upsertable) {
    await db
      .insert(memberStats)
      .values(row)
      .onConflictDoUpdate({
        target: memberStats.candidateId,
        set: {
          chamber: sql`excluded.chamber`,
          state: sql`excluded.state`,
          district: sql`excluded.district`,
          senatorRank: sql`excluded.senator_rank`,
          missedVotesPct: sql`excluded.missed_votes_pct`,
          votesEligible: sql`excluded.votes_eligible`,
          chamberMedianPct: sql`excluded.chamber_median_pct`,
          currentTermEnd: sql`excluded.current_term_end`,
          senateClass: sql`excluded.senate_class`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          fetchedAt: sql`now()`,
        },
      });
  }

  return {
    rolesFetched: roles.length,
    rowsUpserted: upsertable.length,
    skippedNoCandidate: skipped,
    missingAttendance,
  };
}

function parseArgs(argv: string[]): { congress?: number } {
  const idx = argv.indexOf("--congress");
  if (idx === -1) return {};
  const n = Number(argv[idx + 1]);
  return Number.isInteger(n) ? { congress: n } : {};
}

async function main(): Promise<void> {
  const db = requireDb();
  const { congress } = parseArgs(process.argv.slice(2));
  const counts = await runMemberStatsIngest(db, fetch, congress);
  console.log(
    `[member-stats] done roles=${counts.rolesFetched} upserted=${counts.rowsUpserted} ` +
      `skipped_no_candidate=${counts.skippedNoCandidate} missing_attendance=${counts.missingAttendance}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[member-stats] fatal:", err);
    process.exit(1);
  });
}

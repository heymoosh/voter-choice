/**
 * scripts/ingest/_resolution-miss-report.ts
 *
 * Part 2 step 2 of docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md: turn
 * "this candidate shows no FEC data" into a measured number.
 *
 * 78% of federal candidates have a full donor breakdown, so a federal card
 * reading "no data" is almost always `candidate_not_resolved` — a name-match
 * miss in `resolveCandidateId` — not missing data. This script measures that
 * miss rate offline, before and after a resolver fix.
 *
 * REPLAY CORPUS — `official_roster_candidates`, the hand-transcribed
 * Secretary-of-State rosters covering all 50 states for 2026. Replaying
 * `candidates.full_name` through the resolver would trivially exact-match at
 * tier 1/2 and measure nothing; roster rows spell names the way official
 * sources do ("SUZANNE L. WYNN", "ANTHONY RICHARD SISSINE JR."), independent
 * of the FEC-derived names we store. That difference is exactly what the
 * resolver has to survive.
 *
 * GROUND TRUTH — `official_roster_candidates.our_candidate_id` is empty in
 * production (the crosswalk was never backfilled), so this script derives an
 * independent expectation instead: a roster row has a *plausible counterpart*
 * when some `candidates` row in the same chamber shares its normalized surname
 * and does not contradict its state. That is deliberately looser than the
 * resolver, so it can catch what the resolver misses:
 *
 *   hit              — resolver returned a plausible counterpart.
 *   suspect_mismatch — resolver returned a row that is NOT plausible. A false
 *                      positive shows the WRONG person's donor data, which is
 *                      strictly worse than "no data" — this count must not grow.
 *   miss             — a plausible counterpart exists but the resolver returned
 *                      null. The actionable recall failure.
 *   no_counterpart   — no plausible counterpart; the roster filer has no
 *                      `candidates` row at all. Expected, not a bug.
 *
 * Read-only. Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_resolution-miss-report.ts
 *     [--year 2026] [--state TX] [--limit N] [--show N] [--concurrency N] [--json]
 *
 * Runtime note: `resolveCandidateId` loads every candidate row in the chamber
 * on each call, so this is ~2k round trips to Neon. --concurrency (default 8)
 * keeps a full run to a couple of minutes; --state / --limit narrow it.
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { resolveCandidateId } from "../../src/lib/server/alignment";

// ---------------------------------------------------------------------------
// Name normalization (report-side only — deliberately NOT the resolver's, so
// the two can disagree and that disagreement is what we measure).
// ---------------------------------------------------------------------------

const SUFFIXES = new Set([
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
  "v",
  "md",
  "phd",
  "esq",
  "dds",
  "jd",
]);

const HONORIFICS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "sen",
  "rep",
  "gov",
  "del",
  "com",
  "res",
  "senator",
  "representative",
]);

/** Lowercase, de-accent, drop punctuation, collapse whitespace. */
function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[."'’]/gu, "")
    .replace(/[^a-z0-9\s-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Name tokens with the GovTrack "[D-NJ1]" decoration, honorifics, suffixes and
 * quoted nicknames removed. "Collins, Susan" sortnames are un-flipped first.
 */
function nameTokens(raw: string): string[] {
  let s = raw.replace(/\s*\[[A-Za-z]+-[A-Za-z]{2}\d*\]\s*/gu, " ");
  s = s.replace(/"[^"]*"|“[^”]*”|\([^)]*\)/gu, " ");
  const comma = s.match(/^([^,]+),\s*(.+)$/u);
  if (comma) s = `${comma[2]} ${comma[1]}`;
  return normalize(s)
    .split(" ")
    .filter((t) => t && !HONORIFICS.has(t) && !SUFFIXES.has(t));
}

/**
 * Surname forms a name could plausibly be indexed under. A hyphenated surname
 * yields the joined form plus each half, since official rosters and FEC filings
 * disagree about which half survives ("Ocasio-Cortez" vs "Cortez").
 */
function surnameKeys(raw: string): string[] {
  const toks = nameTokens(raw);
  if (toks.length === 0) return [];
  const last = toks[toks.length - 1];
  const keys = new Set<string>([last]);
  if (last.includes("-")) {
    keys.add(last.replace(/-/gu, ""));
    for (const part of last.split("-")) if (part) keys.add(part);
  }
  return [...keys];
}

function firstToken(raw: string): string {
  return nameTokens(raw)[0] ?? "";
}

// ---------------------------------------------------------------------------
// Corpus + index
// ---------------------------------------------------------------------------

interface RosterRow {
  state: string;
  office: string;
  district: string | null;
  name: string;
}

interface CandidateRow {
  id: string;
  full_name: string;
  state: string | null;
  jurisdiction: string;
}

type Verdict = "hit" | "suspect_mismatch" | "miss" | "no_counterpart";

interface Outcome {
  roster: RosterRow;
  jurisdiction: string;
  resolvedId: string | null;
  resolvedName: string | null;
  plausible: CandidateRow[];
  verdict: Verdict;
  missClass?: string;
}

/**
 * Why a resolvable-looking roster row failed, best guess. Ordered most- to
 * least-specific; only the first matching label is reported.
 *
 * `unrelated_first_name` is the not-a-bug label: the plausible set is matched
 * on surname alone, so two unrelated people who share a surname in the same
 * state land in it. Those rows are why `miss` is an UPPER BOUND on recall
 * failures rather than a defect count.
 */
function classifyMiss(roster: RosterRow, plausible: CandidateRow[]): string {
  const distinctIds = new Set(plausible.map((p) => p.id));
  if (distinctIds.size > 1) return "ambiguous_surname";
  const cand = plausible[0];
  const rToks = nameTokens(roster.name);
  const cToks = nameTokens(cand.full_name);
  const rLast = rToks[rToks.length - 1] ?? "";
  const cLast = cToks[cToks.length - 1] ?? "";
  const rFirst = rToks[0] ?? "";
  const cFirst = cToks[0] ?? "";
  if (rFirst !== cFirst) {
    if (rFirst.length === 1 || cFirst.length === 1) return "first_initial";
    if (rFirst.startsWith(cFirst) || cFirst.startsWith(rFirst))
      return "first_name_prefix";
    return "unrelated_first_name";
  }
  if (rLast !== cLast) return "hyphenated_surname";
  if (/\b(jr|sr|ii|iii|iv)\b/iu.test(`${roster.name} ${cand.full_name}`))
    return "suffix";
  if (rToks.length !== cToks.length) return "middle_name";
  return "other";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) {
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const year = Number(arg("--year") ?? 2026);
  const stateFilter = arg("--state")?.toUpperCase();
  const limit = Number(arg("--limit") ?? 0);
  const show = Number(arg("--show") ?? 12);
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 8));
  const asJson = process.argv.includes("--json");
  const db = requireDb();

  // Roster rows, deduped across primary/general stages — the same person filed
  // for both is one name to resolve, not two.
  const rosterRes = await db.execute(sql`
    SELECT DISTINCT state, office, district, name
    FROM official_roster_candidates
    WHERE election_year = ${year}
      AND office IN ('house', 'senate')
    ORDER BY state, office, district, name
  `);
  let roster = rosterRes.rows as unknown as RosterRow[];
  if (stateFilter) roster = roster.filter((r) => r.state === stateFilter);
  if (limit > 0) roster = roster.slice(0, limit);

  const candRes = await db.execute(sql`
    SELECT id, full_name, state, jurisdiction
    FROM candidates
    WHERE jurisdiction IN ('federal-house', 'federal-senate')
  `);
  const candidates = candRes.rows as unknown as CandidateRow[];
  const byId = new Map(candidates.map((c) => [c.id, c]));

  // surname key + jurisdiction → candidate rows.
  const index = new Map<string, CandidateRow[]>();
  for (const c of candidates) {
    for (const key of surnameKeys(c.full_name)) {
      const k = `${c.jurisdiction}|${key}`;
      const bucket = index.get(k);
      if (bucket) bucket.push(c);
      else index.set(k, [c]);
    }
  }

  /**
   * Candidate rows that could be this roster row. Surname match in the same
   * chamber, with a state that agrees or is unknown — `candidates.state` is
   * populated for ~97% of federal rows, so an explicit disagreement is real.
   */
  const plausibleFor = (r: RosterRow, jurisdiction: string): CandidateRow[] => {
    const seen = new Set<string>();
    const out: CandidateRow[] = [];
    for (const key of surnameKeys(r.name)) {
      for (const c of index.get(`${jurisdiction}|${key}`) ?? []) {
        if (seen.has(c.id)) continue;
        if (c.state && c.state.toUpperCase() !== r.state.toUpperCase())
          continue;
        seen.add(c.id);
        out.push(c);
      }
    }
    return out;
  };

  process.stderr.write(
    `Replaying ${roster.length} roster names (${year}) through resolveCandidateId ` +
      `against ${candidates.length} federal candidates…\n`,
  );

  const outcomes = await mapWithConcurrency(
    roster,
    concurrency,
    async (r): Promise<Outcome> => {
      const jurisdiction = `federal-${r.office}`;
      const plausible = plausibleFor(r, jurisdiction);
      const resolvedId = await resolveCandidateId(
        r.name,
        jurisdiction,
        r.state,
      );
      let verdict: Verdict;
      if (resolvedId) {
        verdict = plausible.some((p) => p.id === resolvedId)
          ? "hit"
          : "suspect_mismatch";
      } else {
        verdict = plausible.length > 0 ? "miss" : "no_counterpart";
      }
      return {
        roster: r,
        jurisdiction,
        resolvedId,
        resolvedName: resolvedId
          ? (byId.get(resolvedId)?.full_name ?? null)
          : null,
        plausible,
        verdict,
        ...(verdict === "miss"
          ? { missClass: classifyMiss(r, plausible) }
          : {}),
      };
    },
  );

  if (asJson) {
    console.log(
      JSON.stringify(
        outcomes.map((o) => ({
          state: o.roster.state,
          office: o.roster.office,
          district: o.roster.district,
          name: o.roster.name,
          verdict: o.verdict,
          missClass: o.missClass ?? null,
          resolved: o.resolvedName,
          plausible: o.plausible.map((p) => p.full_name),
        })),
        null,
        2,
      ),
    );
    return;
  }

  const count = (v: Verdict) => outcomes.filter((o) => o.verdict === v).length;
  const total = outcomes.length;
  const pct = (n: number) => (total > 0 ? Math.round((n * 100) / total) : 0);
  const resolvable = count("hit") + count("miss") + count("suspect_mismatch");

  console.log(`\nResolver miss report — ${year} federal roster names\n`);
  console.log(`corpus:            ${total} roster names`);
  console.log(`  hit:             ${count("hit")} (${pct(count("hit"))}%)`);
  console.log(
    `  miss:            ${count("miss")} (${pct(count("miss"))}%)  ← recall failures`,
  );
  console.log(
    `  suspect_mismatch:${String(count("suspect_mismatch")).padStart(4)} (${pct(count("suspect_mismatch"))}%)  ← WRONG person's data; must not grow`,
  );
  console.log(
    `  no_counterpart:  ${count("no_counterpart")} (${pct(count("no_counterpart"))}%)  (no candidates row exists — expected)`,
  );
  console.log(
    `\nrecall over rows with a plausible counterpart: ` +
      `${count("hit")}/${resolvable} ` +
      `(${resolvable > 0 ? Math.round((count("hit") * 100) / resolvable) : 0}%)\n`,
  );

  const misses = outcomes.filter((o) => o.verdict === "miss");
  const byClass = new Map<string, Outcome[]>();
  for (const m of misses) {
    const k = m.missClass ?? "other";
    const bucket = byClass.get(k);
    if (bucket) bucket.push(m);
    else byClass.set(k, [m]);
  }
  const classes = [...byClass.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  if (classes.length > 0) {
    console.log("miss classes (largest first):");
    for (const [cls, rows] of classes) {
      console.log(`\n  ${cls}: ${rows.length}`);
      for (const o of rows.slice(0, show)) {
        console.log(
          `    ${o.roster.state} ${o.roster.office}${o.roster.district ? `-${o.roster.district}` : ""} ` +
            `"${o.roster.name}"  →  ${o.plausible.map((p) => `"${p.full_name}"`).join(", ")}`,
        );
      }
      if (rows.length > show) console.log(`    … ${rows.length - show} more`);
    }
  }

  const mismatches = outcomes.filter((o) => o.verdict === "suspect_mismatch");
  if (mismatches.length > 0) {
    console.log(`\nsuspect mismatches (resolver picked an implausible row):`);
    for (const o of mismatches.slice(0, show)) {
      console.log(
        `    ${o.roster.state} ${o.roster.office} "${o.roster.name}"  →  resolved "${o.resolvedName}"`,
      );
    }
    if (mismatches.length > show)
      console.log(`    … ${mismatches.length - show} more`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

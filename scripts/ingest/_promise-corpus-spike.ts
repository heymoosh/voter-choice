/**
 * scripts/ingest/_promise-corpus-spike.ts
 *
 * Part 5 step 0 of docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md — the
 * sourcing spike Open Risk #1 asks for BEFORE any promise-ledger schema is
 * committed: "No campaign-site URL list exists in our schema today; sourcing
 * it (Ballotpedia? FEC Form 2?) is unresolved and could gate Part 5 entirely."
 *
 * This script turns that unknown into a measured number for a pilot
 * delegation. For each candidate on a state's 2026 official roster it asks:
 *
 *   1. Do we know who they are?           resolveCandidateId (Part 2 machinery)
 *   2. Do they have an FEC candidate id?  candidates.fec_candidate_id
 *   3. Did their principal campaign committee file a website URL on FEC
 *      Form 1?                            OpenFEC /candidate/{id}/committees
 *                                         + /committee/{id} (`website` field)
 *   4. Does a web archive hold captures of that site inside the cycle
 *      window?  LoC elections web archive FIRST (Memento TimeMap), Wayback
 *      CDX as fallback — see ./web-archives.ts for the 2026-08-16 decision
 *      (IA outages blocked three retrospective runs; LoC is purpose-built
 *      for campaign sites but embargoes access ~1 year after capture, so
 *      current-cycle lookups usually resolve on Wayback anyway)
 *
 * Source choice, deliberate: FEC Form 1 is a FILING — the committee itself
 * declared the URL under its own signature, so it is evidence, not an
 * inference, and it needs no name-matching beyond the fec_candidate_id we
 * already store (same "a filing is evidence" standard Part 6a applies to
 * CONNECTED_ORG). Ballotpedia is NOT queried (licence unconfirmed — Open
 * Risk #2's confirm-before-ingest posture applies to a spike's HTTP calls
 * too). Wikidata P856 (CC0) is the fallback to evaluate only if Form 1
 * coverage disappoints — it needs name-based entity resolution, which is
 * exactly the false-match risk Part 2 exists to control.
 *
 * Output buckets, per roster candidate (first match wins):
 *
 *   unresolved              — resolveCandidateId returned null; no candidates
 *                             row match. Part 2's residual misses land here.
 *   no_fec_id               — resolved, but the row has no fec_candidate_id
 *                             (the known 123-incumbent backfill gap surfaces
 *                             here; see Part 2 executed notes).
 *   fec_api_error           — OpenFEC unreachable / rate-limited after
 *                             retries. Operational, not a coverage fact.
 *   no_principal_committee  — FEC knows the candidate but no designation-P
 *                             committee (common for paper filers / no-raise
 *                             candidacies).
 *   no_website_on_file      — principal committee exists; Form 1 website
 *                             field empty or junk ("none", "n/a").
 *   social_media_only       — Form 1 website is a social profile (Facebook,
 *                             X, Instagram, Linktree…). Counted separately:
 *                             promise extraction from social pages is a
 *                             different (harder) problem than campaign sites,
 *                             and Wayback's coverage of them is poor.
 *   wayback_error           — no LoC canonical AND the Wayback CDX lookup
 *                             failed after retries. Operational.
 *   website_no_captures     — real campaign URL, zero cycle-window captures
 *                             on either archive. Actionable: these are
 *                             Save-Page-Now candidates while the sites are
 *                             still live.
 *   website_archived        — real campaign URL with ≥1 in-window capture
 *                             (LoC or Wayback), including the canonical
 *                             capture the plan's capture policy would pin.
 *                             THE CORPUS-READY BUCKET — the headline number.
 *
 * READ-ONLY: no DB writes, no schema. Networked (OpenFEC + LoC + Wayback),
 * so it runs from a normal dev machine, not the sandboxed session that
 * wrote it.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts
 *     [--state TX|ALL] [--cycle 2026] [--office house|senate|both] [--limit N]
 *     [--concurrency N] [--election-day YYYY-MM-DD] [--from YYYY-MM-DD]
 *     [--skip-wayback] [--json]
 *
 * --state ALL covers every state in one pass (same per-request politeness,
 * just a longer run; the report adds a per-state corpus-ready breakdown).
 * In retrospective mode ALL also INCLUDES members with no state column —
 * the ~80-member seat-backfill gap a single-state filter cannot see.
 *
 * RETROSPECTIVE MODE (--cycle 2022, or any cycle whose election day has
 * passed): the roster switches from official_roster_candidates to that
 * cycle's WINNERS — members whose term started the following Jan 3, from
 * candidate_offices (requires the congress's record backfill, e.g.
 * CONGRESS=118 federal-votes) — identity comes pre-resolved, the capture
 * window defaults to the cycle (Jan 1 of the odd year → that election day),
 * and FEC lookups prefer the committee/website AS FILED for that cycle
 * (/committee/{id}/history/{cycle}). Winner bias is inherent and must be
 * stated on any surface built from it (plan doc honesty note).
 *
 * API key: OpenFEC uses api.data.gov keys — the SAME key infrastructure as
 * CONGRESS_GOV_API_KEY, so that key is tried when FEC_API_KEY is unset, and
 * DEMO_KEY (tightly rate-limited, fine for one small state) is the last
 * resort. Neither archive lookup needs a key.
 *
 * Pilot default is Texas: 38 House districts sits inside the plan's "one
 * state's House delegation (~20-50 members)" pilot band, and the TX roster
 * fixture is the repo's most battle-tested (see
 * scripts/congressional-rosters/tx-official-roster-2026.ts).
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { resolveCandidateId } from "../../src/lib/server/alignment";
import {
  locTimeMapUrl,
  parseMementoTimeMap,
  replayUrl,
  type WebArchiveId,
} from "./web-archives";

type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// URL handling (pure, unit-tested)
// ---------------------------------------------------------------------------

/** Form 1 "website" values that mean "none", as actually seen in filings. */
const JUNK_WEBSITE_VALUES = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "null",
  "no website",
  "not applicable",
  "tbd",
  "http://",
  "https://",
  "http://none",
  "http://n/a",
  "www",
]);

/**
 * Hosts that are social/link-hub profiles rather than campaign sites. A
 * Form 1 URL on one of these still tells us where the campaign lives, but it
 * is bucketed separately — promise extraction and archival both differ.
 */
const SOCIAL_MEDIA_HOSTS = new Set([
  "facebook.com",
  "m.facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "linktr.ee",
  "linkedin.com",
  "threads.net",
  "secure.actblue.com",
  "actblue.com",
  "winred.com",
  "secure.winred.com",
]);

/**
 * Normalize a Form 1 website value to a canonical https URL, or null when the
 * value is empty/junk/not-a-web-URL. Never throws.
 */
export function normalizeCampaignUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (JUNK_WEBSITE_VALUES.has(trimmed.toLowerCase())) return null;
  // A scheme prefix that is not http(s) — "mailto:…", "ftp://…" — is not a
  // campaign site. Checked on the raw string because "mailto:" has no "//",
  // so prepending https:// would smuggle it through as userinfo.
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/iu)?.[1]?.toLowerCase();
  if (scheme && scheme !== "http" && scheme !== "https") return null;
  const withScheme = scheme ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Userinfo means the value was an email address or similar, not a site.
  if (url.username || url.password) return null;
  // A bare TLD-less token ("campaign", "www") is a data-entry artifact.
  if (!url.hostname.includes(".")) return null;
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.search = "";
  let out = url.toString();
  if (out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

/** Host with any leading "www." stripped, for social-host comparison. */
function bareHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return "";
  }
}

export function isSocialMediaUrl(url: string): boolean {
  return SOCIAL_MEDIA_HOSTS.has(bareHost(url));
}

/**
 * The url= value for a CDX query: scheme stripped (Wayback canonicalizes
 * scheme and www away), path kept.
 */
export function cdxUrlKey(url: string): string {
  return url.replace(/^https?:\/\//iu, "");
}

// ---------------------------------------------------------------------------
// OpenFEC response parsing (pure, unit-tested)
// ---------------------------------------------------------------------------

export interface PrincipalCommittee {
  committeeId: string;
  name: string | null;
  /** Most recent cycle the committee shows activity in, when listed. */
  lastCycle: number | null;
  /** Website when the committees listing already carries it. */
  website: string | null;
}

/**
 * From an OpenFEC /candidate/{id}/committees response, pick the principal
 * campaign committee (designation "P"). When `cycle` is given, committees
 * active in THAT cycle are preferred (the retrospective needs the 2022
 * committee, not a successor); within the preferred pool — or when none
 * lists the cycle — the most recently active wins. Returns null when there
 * is no principal committee at all.
 */
export function pickPrincipalCommittee(
  payload: unknown,
  cycle?: number,
): PrincipalCommittee | null {
  const results = (payload as UnknownRecord | null)?.results;
  if (!Array.isArray(results)) return null;
  const principals = results.filter(
    (r): r is UnknownRecord =>
      !!r &&
      typeof r === "object" &&
      (r as UnknownRecord).designation === "P" &&
      typeof (r as UnknownRecord).committee_id === "string",
  );
  if (principals.length === 0) return null;
  const lastCycleOf = (r: UnknownRecord): number => {
    const cycles = r.cycles;
    if (Array.isArray(cycles)) {
      const nums = cycles.filter((c): c is number => typeof c === "number");
      if (nums.length > 0) return Math.max(...nums);
    }
    return typeof r.last_cycle_has_activity === "number"
      ? r.last_cycle_has_activity
      : 0;
  };
  const activeInCycle = cycle
    ? principals.filter(
        (r) => Array.isArray(r.cycles) && r.cycles.includes(cycle),
      )
    : [];
  const pool = activeInCycle.length > 0 ? activeInCycle : principals;
  pool.sort((a, b) => lastCycleOf(b) - lastCycleOf(a));
  const top = pool[0];
  const lastCycle = lastCycleOf(top);
  return {
    committeeId: top.committee_id as string,
    name: typeof top.name === "string" ? top.name : null,
    lastCycle: lastCycle > 0 ? lastCycle : null,
    website: typeof top.website === "string" ? top.website : null,
  };
}

/** The `website` string from an OpenFEC /committee/{id} detail response. */
export function extractCommitteeWebsite(payload: unknown): string | null {
  const results = (payload as UnknownRecord | null)?.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const website = (results[0] as UnknownRecord | null)?.website;
  return typeof website === "string" ? website : null;
}

// ---------------------------------------------------------------------------
// Wayback CDX parsing + canonical-capture policy (pure, unit-tested)
// ---------------------------------------------------------------------------

export interface CdxCapture {
  /** 14-digit Wayback timestamp, e.g. "20260214031500". */
  timestamp: string;
  original: string;
}

/**
 * Parse a CDX `output=json` payload: an array whose first row is the column
 * header. Tolerates the empty response `[]` and malformed rows.
 */
export function parseCdxJson(payload: unknown): CdxCapture[] {
  if (!Array.isArray(payload) || payload.length < 2) return [];
  const header = payload[0];
  if (!Array.isArray(header)) return [];
  const tsIdx = header.indexOf("timestamp");
  const origIdx = header.indexOf("original");
  if (tsIdx < 0 || origIdx < 0) return [];
  const out: CdxCapture[] = [];
  for (const row of payload.slice(1)) {
    if (!Array.isArray(row)) continue;
    const timestamp = row[tsIdx];
    const original = row[origIdx];
    if (typeof timestamp !== "string" || !/^\d{14}$/u.test(timestamp)) continue;
    if (typeof original !== "string") continue;
    out.push({ timestamp, original });
  }
  return out;
}

/** "2026-11-03" → "20261103235959" (inclusive end-of-day cutoff). */
export function toCdxCutoff(isoDate: string): string {
  return `${isoDate.replace(/-/gu, "")}235959`;
}

/**
 * The plan's canonical-capture policy, executable: the LAST capture at or
 * before the cutoff (election day). Pre-election runs therefore pin the
 * latest capture to date; the same call after election day pins the final
 * pre-election capture. Returns null when no capture precedes the cutoff.
 */
export function selectCanonicalCapture(
  captures: CdxCapture[],
  cutoffCompact: string,
): CdxCapture | null {
  let best: CdxCapture | null = null;
  for (const c of captures) {
    if (c.timestamp > cutoffCompact) continue;
    if (!best || c.timestamp > best.timestamp) best = c;
  }
  return best;
}

export function waybackReplayUrl(capture: CdxCapture): string {
  return replayUrl("wayback", capture.timestamp, capture.original);
}

// ---------------------------------------------------------------------------
// Cycle parameterization (pure, unit-tested) — the retrospective ledger runs
// the same spike backward (--cycle 2022; plan doc "Decision 2026-08-13").
// ---------------------------------------------------------------------------

/**
 * The general-election day for a cycle: the first Tuesday after the first
 * Monday in November. 2022 → 11-08, 2024 → 11-05, 2026 → 11-03.
 */
export function generalElectionDay(cycle: number): string {
  const nov1Dow = new Date(Date.UTC(cycle, 10, 1)).getUTCDay(); // 0 = Sunday
  const firstMonday = 1 + ((8 - nov1Dow) % 7);
  const tuesday = firstMonday + 1;
  return `${cycle}-11-${String(tuesday).padStart(2, "0")}`;
}

export interface CycleDefaults {
  /** CDX capture-window end (canonical capture = last at or before this). */
  electionDay: string;
  /** CDX capture-window start: Jan 1 of the odd year opening the cycle. */
  fromDate: string;
}

export function cycleDefaults(cycle: number): CycleDefaults {
  return {
    electionDay: generalElectionDay(cycle),
    fromDate: `${cycle - 1}-01-01`,
  };
}

// ---------------------------------------------------------------------------
// Fail-soft fetch with retry (same posture as crs-summaries.ts)
// ---------------------------------------------------------------------------

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const TIMEOUT_MS = 20_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * GET a URL's body as text with retry on 429/5xx and a hard timeout. Returns
 * null on any terminal failure — one candidate's flaky lookup must never
 * abort the report (crs-summaries.ts's fail-soft rule). When `emptyOn404` is
 * set, a 404 returns "" instead of null: LoC's TimeMap endpoint 404s for a
 * URL it holds no captures of, which is a definitive answer, not an error.
 */
async function fetchTextSoft(
  url: string,
  fetcher: typeof fetch,
  label: string,
  accept: string,
  emptyOn404 = false,
): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept },
      });
      if (response.ok) return await response.text();
      if (emptyOn404 && response.status === 404) return "";
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
        const waitMs = 1000 * 2 ** attempt;
        process.stderr.write(
          `[promise-corpus-spike] retryable ${response.status} ${label} ` +
            `attempt=${attempt + 1}/${MAX_RETRIES + 1} wait_ms=${waitMs}\n`,
        );
        await sleep(waitMs);
        continue;
      }
      process.stderr.write(
        `[promise-corpus-spike] ${label} failed status=${response.status}\n`,
      );
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      process.stderr.write(
        `[promise-corpus-spike] ${label} failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return null;
    }
  }
  return null;
}

/** fetchTextSoft + JSON.parse; a body that fails to parse is a null too. */
async function fetchJsonSoft(
  url: string,
  fetcher: typeof fetch,
  label: string,
): Promise<unknown | null> {
  const body = await fetchTextSoft(url, fetcher, label, "application/json");
  if (body === null) return null;
  try {
    return JSON.parse(body);
  } catch {
    process.stderr.write(
      `[promise-corpus-spike] ${label} returned unparseable JSON\n`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Report plumbing
// ---------------------------------------------------------------------------

export type SpikeBucket =
  | "unresolved"
  | "no_fec_id"
  | "fec_api_error"
  | "no_principal_committee"
  | "no_website_on_file"
  | "social_media_only"
  | "wayback_error"
  | "wayback_skipped"
  | "website_no_captures"
  | "website_archived";

/** Buckets in report order, with the one-line meaning printed beside each. */
export const BUCKET_NOTES: Record<SpikeBucket, string> = {
  website_archived:
    "corpus-ready — URL on file + in-window capture (LoC or Wayback)",
  website_no_captures:
    "URL on file, no capture on either archive — Save-Page-Now candidates",
  social_media_only: "Form 1 site is a social profile — different pipeline",
  no_website_on_file: "principal committee filed no usable website",
  no_principal_committee: "FEC candidate with no designation-P committee",
  no_fec_id: "candidates row lacks fec_candidate_id (known backfill gap)",
  unresolved: "no candidates-row match (Part 2 residual misses)",
  fec_api_error: "OpenFEC lookup failed after retries (operational)",
  wayback_error:
    "no LoC canonical + Wayback CDX failed after retries (operational)",
  wayback_skipped: "URL on file; --skip-wayback left both archives unchecked",
};

export interface SpikeRow {
  state: string;
  office: string;
  district: string | null;
  name: string;
  bucket: SpikeBucket;
  candidateId: string | null;
  fecCandidateId: string | null;
  committeeId: string | null;
  committeeName: string | null;
  website: string | null;
  captureCount: number;
  canonicalCaptureUrl: string | null;
  /** Which archive the canonical capture was pinned on (null until pinned). */
  captureArchive: WebArchiveId | null;
}

export function summarizeBuckets(
  rows: Pick<SpikeRow, "bucket">[],
): Map<SpikeBucket, number> {
  const counts = new Map<SpikeBucket, number>();
  for (const key of Object.keys(BUCKET_NOTES) as SpikeBucket[]) {
    counts.set(key, 0);
  }
  for (const r of rows) counts.set(r.bucket, (counts.get(r.bucket) ?? 0) + 1);
  return counts;
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const OPENFEC_BASE_URL = "https://api.open.fec.gov/v1";

interface RosterRow {
  state: string;
  office: string;
  district: string | null;
  name: string;
  /** Pre-resolved identity — set by the retrospective winners roster. */
  candidateId?: string | null;
  fecCandidateId?: string | null;
}

async function main(): Promise<void> {
  // --cycle (alias: --year) picks the election cycle. A cycle whose election
  // day is already past runs RETROSPECTIVE: the roster is that cycle's
  // WINNERS (members whose term started the following Jan 3 — the only
  // population whose promised term is complete and adjudicable), identity is
  // pre-resolved from the candidates table, and the FEC committee/website
  // lookups prefer what was filed FOR that cycle.
  const cycle = Number(arg("--cycle") ?? arg("--year") ?? 2026);
  // --state ALL runs the whole country in one pass (per-state politeness is
  // unchanged — same serial FEC/archive budget, just a longer run).
  const state = (arg("--state") ?? "TX").toUpperCase();
  const allStates = state === "ALL";
  const office = arg("--office") ?? "house";
  const limit = Number(arg("--limit") ?? 0);
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 4));
  const defaults = cycleDefaults(cycle);
  const electionDay = arg("--election-day") ?? defaults.electionDay;
  const fromDate = arg("--from") ?? defaults.fromDate;
  const skipWayback = process.argv.includes("--skip-wayback");
  const asJson = process.argv.includes("--json");
  const todayIso = new Date().toISOString().slice(0, 10);
  const retrospective = electionDay < todayIso;

  const apiKey =
    process.env.FEC_API_KEY || process.env.CONGRESS_GOV_API_KEY || "DEMO_KEY";
  if (apiKey === "DEMO_KEY") {
    process.stderr.write(
      "[promise-corpus-spike] no FEC_API_KEY / CONGRESS_GOV_API_KEY in env — " +
        "using DEMO_KEY (tightly rate-limited; fine for one state, slowly)\n",
    );
  }

  const db = requireDb();

  const offices =
    office === "both"
      ? ["house", "senate"]
      : [office === "senate" ? "senate" : "house"];
  const jurisdictions = offices.map((o) => `federal-${o}`);

  let roster: RosterRow[];
  if (retrospective) {
    // WINNERS roster: members whose term started the Jan 3 after the cycle's
    // election (candidate_offices rows written by the votes ingest). Honesty
    // note (plan doc): this population is winner-biased by construction —
    // the retrospective ledger covers incumbents' prior-term promises only.
    const termStart = `${cycle + 1}-01-03`;
    const winnersRes = await db.execute(sql`
      SELECT DISTINCT c.state,
             REPLACE(o.jurisdiction, 'federal-', '') AS office,
             c.district,
             c.full_name AS name,
             c.id AS candidate_id,
             c.fec_candidate_id
      FROM candidates c
      JOIN candidate_offices o ON o.candidate_id = c.id
      WHERE o.term_start = ${termStart}
        AND o.jurisdiction IN (${sql.join(
          jurisdictions.map((j) => sql`${j}`),
          sql`, `,
        )})
        ${allStates ? sql`` : sql`AND c.state = ${state}`}
      ORDER BY state, office, district, name
    `);
    roster = (winnersRes.rows as unknown as RosterRow[]).map((r) => ({
      ...r,
      // --state ALL includes never-seat-backfilled members whose state is
      // NULL; keep the report legible for them.
      state: r.state ?? "??",
      candidateId: (r as unknown as { candidate_id: string }).candidate_id,
      fecCandidateId: (r as unknown as { fec_candidate_id: string | null })
        .fec_candidate_id,
    }));

    // Members without seat columns (state NULL — rows created by the votes
    // ingest and never touched by the roster/incumbent backfills) are
    // invisible to a single-state filter. --state ALL INCLUDES them (the
    // filter is gone), which closes the ~80-member retrospective gap; for a
    // single state, count them so the miss stays explicit.
    if (!allStates) {
      const missingRes = await db.execute(sql`
        SELECT COUNT(*) AS n
        FROM candidates c
        JOIN candidate_offices o ON o.candidate_id = c.id
        WHERE o.term_start = ${termStart}
          AND o.jurisdiction IN (${sql.join(
            jurisdictions.map((j) => sql`${j}`),
            sql`, `,
          )})
          AND c.state IS NULL
      `);
      const missing = Number(
        (missingRes.rows[0] as { n?: unknown } | undefined)?.n ?? 0,
      );
      if (missing > 0) {
        process.stderr.write(
          `[promise-corpus-spike] note: ${missing} ${termStart}-term members have no state ` +
            "column (never seat-backfilled) and are invisible to the --state filter " +
            "(--state ALL includes them).\n",
        );
      }
    }
  } else {
    const rosterRes = await db.execute(sql`
      SELECT DISTINCT state, office, district, name
      FROM official_roster_candidates
      WHERE election_year = ${cycle}
        ${allStates ? sql`` : sql`AND state = ${state}`}
        AND office IN (${sql.join(
          offices.map((o) => sql`${o}`),
          sql`, `,
        )})
      ORDER BY state, office, district, name
    `);
    roster = rosterRes.rows as unknown as RosterRow[];
  }
  if (limit > 0) roster = roster.slice(0, limit);
  if (roster.length === 0) {
    console.error(
      retrospective
        ? `No ${cycle + 1}-01-03-term members for ${state} (${offices.join("/")}) — ` +
            `has the ${cycle === 2022 ? "118th" : "matching"}-Congress record backfill run, ` +
            "and do those candidates have seat columns?"
        : `No ${cycle} roster rows for ${state} (${offices.join("/")}) — ` +
            "is the state's official roster ingested?",
    );
    process.exit(1);
  }

  const candRes = await db.execute(sql`
    SELECT id, fec_candidate_id
    FROM candidates
    WHERE jurisdiction IN ('federal-house', 'federal-senate')
  `);
  const fecIdByCandidate = new Map(
    (
      candRes.rows as unknown as {
        id: string;
        fec_candidate_id: string | null;
      }[]
    ).map((c) => [c.id, c.fec_candidate_id]),
  );

  process.stderr.write(
    `Spiking promise-corpus sourcing for ${roster.length} ${state} ${cycle} ` +
      `${retrospective ? "WINNERS (retrospective)" : "roster candidates"} ` +
      `(${offices.join("/")}; captures ${fromDate}..${electionDay})…\n`,
  );

  const cdxCutoff = toCdxCutoff(electionDay);
  const cdxFrom = fromDate.replace(/-/gu, "");

  // Shared across workers: after the first terminal LoC failure the rest of
  // the run skips LoC entirely (Cloudflare-challenge / outage posture).
  let locUnreachable = false;

  const rows = await mapWithConcurrency(
    roster,
    concurrency,
    async (r): Promise<SpikeRow> => {
      const base: SpikeRow = {
        state: r.state,
        office: r.office,
        district: r.district,
        name: r.name,
        bucket: "unresolved",
        candidateId: null,
        fecCandidateId: null,
        committeeId: null,
        committeeName: null,
        website: null,
        captureCount: 0,
        canonicalCaptureUrl: null,
        captureArchive: null,
      };

      const jurisdiction = `federal-${r.office}`;
      // The winners roster arrives pre-resolved; the official roster goes
      // through Part 2's resolver as before.
      const candidateId =
        r.candidateId ??
        (await resolveCandidateId(r.name, jurisdiction, r.state));
      if (!candidateId) return base;
      base.candidateId = candidateId;

      const fecCandidateId =
        r.fecCandidateId ?? fecIdByCandidate.get(candidateId) ?? null;
      if (!fecCandidateId) return { ...base, bucket: "no_fec_id" };
      base.fecCandidateId = fecCandidateId;

      const committeesPayload = await fetchJsonSoft(
        `${OPENFEC_BASE_URL}/candidate/${encodeURIComponent(fecCandidateId)}/committees/` +
          `?api_key=${apiKey}&per_page=100`,
        fetch,
        `openfec committees ${fecCandidateId}`,
      );
      if (committeesPayload === null)
        return { ...base, bucket: "fec_api_error" };

      const principal = pickPrincipalCommittee(committeesPayload, cycle);
      if (!principal) return { ...base, bucket: "no_principal_committee" };
      base.committeeId = principal.committeeId;
      base.committeeName = principal.name;

      let rawWebsite: string | null = null;
      if (retrospective) {
        // Prefer the website AS FILED for the cycle: /committee/{id}/history/
        // {cycle} is the Form 1 snapshot of that era. Best-effort — a miss
        // (endpoint flake, field absent) falls through to the current
        // filing, whose old captures Wayback may still hold.
        const historyPayload = await fetchJsonSoft(
          `${OPENFEC_BASE_URL}/committee/${encodeURIComponent(principal.committeeId)}/history/` +
            `${cycle}/?api_key=${apiKey}`,
          fetch,
          `openfec committee history ${principal.committeeId}/${cycle}`,
        );
        if (historyPayload !== null) {
          rawWebsite = extractCommitteeWebsite(historyPayload);
        }
      }
      if (!normalizeCampaignUrl(rawWebsite)) rawWebsite = principal.website;
      if (!normalizeCampaignUrl(rawWebsite)) {
        const detailPayload = await fetchJsonSoft(
          `${OPENFEC_BASE_URL}/committee/${encodeURIComponent(principal.committeeId)}/` +
            `?api_key=${apiKey}`,
          fetch,
          `openfec committee ${principal.committeeId}`,
        );
        if (detailPayload === null) return { ...base, bucket: "fec_api_error" };
        rawWebsite = extractCommitteeWebsite(detailPayload);
      }

      const website = normalizeCampaignUrl(rawWebsite);
      if (!website) return { ...base, bucket: "no_website_on_file" };
      base.website = website;

      if (isSocialMediaUrl(website)) {
        return { ...base, bucket: "social_media_only" };
      }

      if (skipWayback) return { ...base, bucket: "wayback_skipped" };

      // LoC elections web archive FIRST (2026-08-16 decision: purpose-built
      // for campaign sites, stable .gov infra — Wayback's outages blocked
      // three retrospective runs). Two known ways this yields nothing:
      // LoC access is embargoed ~1 year after capture (current-cycle sites
      // fall through to Wayback), and — 2026-08-17 live finding — the
      // replay host sits behind a Cloudflare bot challenge that scripts
      // cannot pass, which the circuit breaker below turns into a single
      // skip instead of a per-site retry storm. When LoC is unreachable,
      // self-hosted snapshots (promise-site-snapshot.ts) are the primary
      // capture path for live sites.
      let timeMapBody: string | null = null;
      if (!locUnreachable) {
        timeMapBody = await fetchTextSoft(
          locTimeMapUrl(website),
          fetch,
          `loc timemap ${website}`,
          "application/link-format",
          true,
        );
        if (timeMapBody === null && !locUnreachable) {
          locUnreachable = true;
          process.stderr.write(
            "[promise-corpus-spike] loc unreachable (bot challenge / outage?) — " +
              "skipping LoC for the rest of this run\n",
          );
        }
      }
      if (timeMapBody !== null) {
        const locAll = parseMementoTimeMap(timeMapBody);
        const locInWindow = locAll.filter(
          (c) => c.timestamp >= `${cdxFrom}000000` && c.timestamp <= cdxCutoff,
        );
        const locCanonical = selectCanonicalCapture(locInWindow, cdxCutoff);
        if (locCanonical) {
          base.captureCount = locInWindow.length;
          base.canonicalCaptureUrl = replayUrl(
            "loc",
            locCanonical.timestamp,
            locCanonical.original,
          );
          base.captureArchive = "loc";
          return { ...base, bucket: "website_archived" };
        }
        // Never fall through silently: an all-quiet run where every site
        // lands on Wayback should be readable as "LoC had nothing", not
        // mistaken for LoC never being asked (2026-08-17 first live run).
        process.stderr.write(
          `[promise-corpus-spike] loc: no in-window capture for ${website} ` +
            `(${locAll.length} total, ${locInWindow.length} in-window) — falling back to Wayback\n`,
        );
      }

      // Wayback CDX fallback. A wayback_error bucket now means BOTH archives
      // came up empty-handed operationally (LoC errored or had no in-window
      // capture, AND the CDX lookup failed).
      const cdxPayload = await fetchJsonSoft(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxUrlKey(website))}` +
          `&output=json&from=${cdxFrom}&to=${cdxCutoff.slice(0, 8)}` +
          `&filter=statuscode:200&collapse=timestamp:8&limit=500`,
        fetch,
        `wayback cdx ${website}`,
      );
      if (cdxPayload === null) return { ...base, bucket: "wayback_error" };

      const captures = parseCdxJson(cdxPayload);
      base.captureCount = captures.length;
      const canonical = selectCanonicalCapture(captures, cdxCutoff);
      if (!canonical) return { ...base, bucket: "website_no_captures" };
      base.canonicalCaptureUrl = waybackReplayUrl(canonical);
      base.captureArchive = "wayback";
      return { ...base, bucket: "website_archived" };
    },
  );

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const counts = summarizeBuckets(rows);
  const total = rows.length;
  const pct = (n: number) => (total > 0 ? Math.round((n * 100) / total) : 0);

  console.log(
    `\nPromise-corpus sourcing spike — ${state} ${cycle}` +
      `${retrospective ? " RETROSPECTIVE (winners only)" : ""} (${offices.join("/")})\n`,
  );
  console.log(
    `corpus: ${total} ${retrospective ? "cycle winners" : "roster candidates"}\n`,
  );
  for (const [bucket, note] of Object.entries(BUCKET_NOTES) as [
    SpikeBucket,
    string,
  ][]) {
    const n = counts.get(bucket) ?? 0;
    if (n === 0) continue;
    console.log(
      `  ${bucket.padEnd(24)} ${String(n).padStart(3)} (${String(pct(n)).padStart(2)}%)  ${note}`,
    );
  }

  if (allStates) {
    const byState = new Map<string, { archived: number; total: number }>();
    for (const r of rows) {
      const key = r.state || "??";
      const v = byState.get(key) ?? { archived: 0, total: 0 };
      v.total++;
      if (r.bucket === "website_archived") v.archived++;
      byState.set(key, v);
    }
    console.log("per-state corpus-ready:");
    for (const [st, v] of [...byState.entries()].sort()) {
      console.log(`  ${st.padEnd(2)}  ${v.archived}/${v.total}`);
    }
    console.log("");
  }

  const archived = rows.filter((r) => r.bucket === "website_archived");
  const withUrl = rows.filter((r) => r.website !== null);
  console.log(
    `\ncampaign URL on file (any kind): ${withUrl.length}/${total} (${pct(withUrl.length)}%)`,
  );
  console.log(
    `corpus-ready (URL + capture):    ${archived.length}/${total} (${pct(archived.length)}%)\n`,
  );

  const show = (bucket: SpikeBucket, fmt: (r: SpikeRow) => string) => {
    const subset = rows.filter((r) => r.bucket === bucket);
    if (subset.length === 0) return;
    console.log(`${bucket}:`);
    for (const r of subset) console.log(`  ${fmt(r)}`);
    console.log("");
  };
  const seat = (r: SpikeRow) =>
    `${r.state} ${r.office}${r.district ? `-${r.district}` : ""}`;
  show(
    "website_archived",
    (r) =>
      `${seat(r)} "${r.name}" → ${r.website} ` +
      `(${r.captureCount} ${r.captureArchive ?? "?"} captures; canonical ${r.canonicalCaptureUrl})`,
  );
  show(
    "website_no_captures",
    (r) => `${seat(r)} "${r.name}" → ${r.website}  ← Save-Page-Now candidate`,
  );
  show("social_media_only", (r) => `${seat(r)} "${r.name}" → ${r.website}`);
  show("unresolved", (r) => `${seat(r)} "${r.name}"`);
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[promise-corpus-spike] fatal:", err);
    process.exit(1);
  });
}

/**
 * scripts/ingest/federal-candidates.ts
 *
 * FEC 2026 federal candidate roster ingest (Phase D — challenger coverage).
 *
 * Pulls every statutory 2026 House + Senate filer from the OpenFEC API and:
 *  1. BACKFILLS structured seat columns (party/state/district/office/
 *     fec_candidate_id) on our EXISTING federal incumbent rows, matching by
 *     raw_metadata fec.candidate_id or by the "[R-AL4]" name decoration.
 *  2. UPSERTS every filer we don't already have as a new `fec-<candidate_id>`
 *     candidate row (challengers, open-seat candidates), with cycle receipts
 *     from /candidates/totals/ for viability ranking.
 *
 * A "race" is derivable by grouping candidates on
 * (state, district, office, election_year) — no separate races table yet.
 *
 * Source: https://api.open.fec.gov/developers/
 *  • GET /candidates/         — roster (election_year, office, status filters)
 *  • GET /candidates/totals/  — per-candidate cycle receipts
 *
 * Usage:
 *   DATABASE_URL=<neon> FEC_API_KEY=<key> npx tsx scripts/ingest/federal-candidates.ts
 *   ... federal-candidates.ts --year 2026 --dry-run     # no writes, report only
 *   ... federal-candidates.ts --limit 200               # cap roster rows (smoke)
 *
 * Idempotent: challenger rows upsert on id (`fec-<candidate_id>`); incumbent
 * backfill only fills structured columns (never touches name/jurisdiction).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates } from "../../db/schema";

// ---------------------------------------------------------------------------
// Constants / types
// ---------------------------------------------------------------------------

const FEC_BASE_URL = "https://api.open.fec.gov/v1";
const FEC_PAGE_SIZE = 100;
const DEMO_KEY_DELAY_MS = 1200;

type Fetcher = typeof fetch;

export type FederalCandidatesConfig = {
  fecApiKey: string;
  electionYear: number;
  limit: number | null;
  dryRun: boolean;
  fecBaseUrl: string;
};

/** Normalized roster row parsed from GET /candidates/. */
export type FecRosterRow = {
  fecCandidateId: string;
  /** "First Last" display name normalized from FEC "LAST, FIRST". */
  fullName: string;
  /** Verbatim FEC name, kept for audit. */
  fecName: string;
  party: string | null; // verbatim FEC code ("REP" | "DEM" | …)
  state: string | null;
  district: string | null; // zero-padded for house ("07", at-large "00"); null for senate
  office: "house" | "senate";
  incumbentChallenge: string | null; // "I" | "C" | "O" | null
};

export type IngestCounts = {
  rosterRows: number;
  receiptsMatched: number;
  incumbentsBackfilled: number;
  challengersUpserted: number;
  unmatchedIncumbentFilers: number;
  skipped: number;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalCandidatesConfig {
  const yearFlag = argv.indexOf("--year");
  const limitFlag = argv.indexOf("--limit");
  return {
    fecApiKey: env.FEC_API_KEY ?? "DEMO_KEY",
    electionYear:
      yearFlag >= 0 ? parseInt(argv[yearFlag + 1] ?? "2026", 10) : 2026,
    limit: limitFlag >= 0 ? parseInt(argv[limitFlag + 1] ?? "0", 10) : null,
    dryRun: argv.includes("--dry-run"),
    fecBaseUrl: env.FEC_BASE_URL ?? FEC_BASE_URL,
  };
}

// ---------------------------------------------------------------------------
// Helpers (exported for tests)
// ---------------------------------------------------------------------------

/** "ADERHOLT, ROBERT B. MR." → "Robert B. Aderholt". Keeps suffix-free. */
export function normalizeFecName(fecName: string): string {
  const stripHonorific = (s: string) =>
    s.replace(/\s+\b(mr|mrs|ms|dr|jr|sr|ii|iii|iv)\b\.?\s*$/i, "").trim();
  const cleaned = fecName.trim();
  const comma = cleaned.indexOf(",");
  const reordered =
    comma >= 0
      ? `${stripHonorific(cleaned.slice(comma + 1))} ${cleaned.slice(0, comma).trim()}`
      : cleaned;
  return stripHonorific(reordered)
    .toLowerCase()
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
        .join("-"),
    )
    .join(" ");
}

/** FEC district → our convention: house zero-padded 2-digit; senate null. */
export function normalizeDistrict(
  office: "house" | "senate",
  district: unknown,
): string | null {
  if (office === "senate") return null;
  const raw = String(district ?? "").trim();
  if (!raw || !/^\d+$/.test(raw)) return "00";
  return raw.padStart(2, "0");
}

/** Parse one GET /candidates/ result into a roster row (null = skip). */
export function parseRosterResult(
  r: Record<string, unknown>,
): FecRosterRow | null {
  const id = typeof r.candidate_id === "string" ? r.candidate_id : null;
  const name = typeof r.name === "string" ? r.name : null;
  const officeCode = r.office;
  if (!id || !name || (officeCode !== "H" && officeCode !== "S")) return null;
  const office = officeCode === "H" ? "house" : "senate";
  return {
    fecCandidateId: id,
    fullName: normalizeFecName(name),
    fecName: name,
    party: typeof r.party === "string" ? r.party : null,
    state: typeof r.state === "string" ? r.state.toUpperCase() : null,
    district: normalizeDistrict(office, r.district),
    office,
    incumbentChallenge:
      typeof r.incumbent_challenge === "string" ? r.incumbent_challenge : null,
  };
}

/** Extract state/district/party from incumbent name decorations like
 *  "Rep. Robert Aderholt [R-AL4]" / "Sen. Tammy Baldwin [D-WI]". */
export function parseIncumbentDecoration(fullName: string): {
  party: string | null;
  state: string | null;
  district: string | null;
} {
  const m = fullName.match(/\[([A-Z])-([A-Z]{2})(\d{1,2})?\]/);
  if (!m) return { party: null, state: null, district: null };
  return {
    party: m[1] === "R" ? "REP" : m[1] === "D" ? "DEM" : m[1],
    state: m[2],
    district: m[3] ? m[3].padStart(2, "0") : null,
  };
}

function extractFecIdFromMetadata(rawMetadata: unknown): string | null {
  if (!rawMetadata || typeof rawMetadata !== "object") return null;
  const fec = (rawMetadata as Record<string, unknown>).fec;
  if (!fec || typeof fec !== "object") return null;
  const id = (fec as Record<string, unknown>).candidate_id;
  return typeof id === "string" && id ? id : null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// FEC fetchers
// ---------------------------------------------------------------------------

async function fetchPaged(
  path: string,
  params: Record<string, string | string[]>,
  config: FederalCandidatesConfig,
  fetcher: Fetcher,
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let page = 1;
  // FEC caps per_page at 100; pages is reported in pagination metadata.
  for (;;) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => search.append(k, x));
      else search.set(k, v);
    }
    search.set("api_key", config.fecApiKey);
    search.set("per_page", String(FEC_PAGE_SIZE));
    search.set("page", String(page));
    const url = `${config.fecBaseUrl}${path}?${search}`;
    const res = await fetcher(url);
    if (!res.ok) {
      throw new Error(`FEC ${path} page=${page} HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      results?: Record<string, unknown>[];
      pagination?: { pages?: number };
    };
    results.push(...(body.results ?? []));
    const pages = body.pagination?.pages ?? page;
    if (page >= pages) break;
    if (config.limit !== null && results.length >= config.limit) break;
    page += 1;
    if (config.fecApiKey === "DEMO_KEY") await sleep(DEMO_KEY_DELAY_MS);
  }
  return config.limit !== null ? results.slice(0, config.limit) : results;
}

export async function fetchRoster(
  config: FederalCandidatesConfig,
  fetcher: Fetcher = fetch,
): Promise<FecRosterRow[]> {
  const raw = await fetchPaged(
    "/candidates/",
    {
      election_year: String(config.electionYear),
      office: ["H", "S"],
      candidate_status: "C",
      sort: "name",
    },
    config,
    fetcher,
  );
  const rows: FecRosterRow[] = [];
  for (const r of raw) {
    const parsed = parseRosterResult(r);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

/** candidate_id → cycle receipts (USD). */
export async function fetchReceipts(
  config: FederalCandidatesConfig,
  fetcher: Fetcher = fetch,
): Promise<Map<string, number>> {
  const raw = await fetchPaged(
    "/candidates/totals/",
    {
      election_year: String(config.electionYear),
      cycle: String(config.electionYear),
      office: ["H", "S"],
      election_full: "true",
    },
    config,
    fetcher,
  );
  const map = new Map<string, number>();
  for (const r of raw) {
    const id = typeof r.candidate_id === "string" ? r.candidate_id : null;
    const receipts = typeof r.receipts === "number" ? r.receipts : null;
    if (id && receipts !== null) map.set(id, receipts);
  }
  return map;
}

// ---------------------------------------------------------------------------
// DB phases
// ---------------------------------------------------------------------------

type ExistingFederalRow = {
  id: string;
  fullName: string;
  jurisdiction: string;
  isIncumbent: boolean;
  fecCandidateId: string | null;
  rawMetadata: unknown;
};

async function loadExistingFederal(
  db: DbClient,
): Promise<ExistingFederalRow[]> {
  return await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      jurisdiction: candidates.jurisdiction,
      isIncumbent: candidates.isIncumbent,
      fecCandidateId: candidates.fecCandidateId,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} IN ('federal-house', 'federal-senate')`,
    );
}

/** Backfill structured seat columns on existing incumbent rows. Returns the
 *  set of FEC ids now claimed by existing rows. */
async function backfillIncumbents(
  db: DbClient,
  existing: ExistingFederalRow[],
  roster: FecRosterRow[],
  receipts: Map<string, number>,
  config: FederalCandidatesConfig,
  counts: IngestCounts,
): Promise<Set<string>> {
  const rosterById = new Map(roster.map((r) => [r.fecCandidateId, r]));
  const claimed = new Set<string>();

  for (const row of existing) {
    const fecId =
      row.fecCandidateId ?? extractFecIdFromMetadata(row.rawMetadata);
    if (fecId) claimed.add(fecId);

    const decoration = parseIncumbentDecoration(row.fullName);
    const rosterRow = fecId ? rosterById.get(fecId) : undefined;
    const office = row.jurisdiction === "federal-senate" ? "senate" : "house";
    const onBallot = Boolean(rosterRow);

    const party = rosterRow?.party ?? decoration.party;
    const state = rosterRow?.state ?? decoration.state;
    const district =
      office === "senate" ? null : (rosterRow?.district ?? decoration.district);
    const totalReceipts = fecId ? (receipts.get(fecId) ?? null) : null;

    if (!party && !state && !fecId) {
      counts.skipped += 1;
      continue;
    }

    if (!config.dryRun) {
      await db
        .update(candidates)
        .set({
          party: party ?? null,
          state: state ?? null,
          district,
          office,
          // electionYear marks "filed for this cycle" — only set when the
          // incumbent actually appears in the cycle's FEC roster.
          electionYear: onBallot ? config.electionYear : null,
          fecCandidateId: fecId ?? null,
          totalReceipts:
            totalReceipts !== null ? totalReceipts.toFixed(2) : null,
          updatedAt: new Date(),
        })
        .where(sql`${candidates.id} = ${row.id}`);
    }
    counts.incumbentsBackfilled += 1;
  }

  return claimed;
}

/** Upsert roster filers not already represented as challenger rows. */
async function upsertChallengers(
  db: DbClient,
  roster: FecRosterRow[],
  receipts: Map<string, number>,
  claimed: Set<string>,
  config: FederalCandidatesConfig,
  counts: IngestCounts,
): Promise<void> {
  const now = new Date();
  const rows = [];
  for (const r of roster) {
    if (claimed.has(r.fecCandidateId)) continue; // already an incumbent row
    const isIncumbentFiler = r.incumbentChallenge === "I";
    if (isIncumbentFiler) counts.unmatchedIncumbentFilers += 1;
    rows.push({
      id: `fec-${r.fecCandidateId}`,
      fullName: r.fullName,
      sourceId: r.fecCandidateId,
      jurisdiction: r.office === "senate" ? "federal-senate" : "federal-house",
      // FEC marks them incumbent for the seat; we keep isIncumbent=false for
      // rows we couldn't match to a sitting-member record (no voting record
      // to score) and flag them for manual review instead.
      isIncumbent: false,
      party: r.party,
      state: r.state,
      district: r.district,
      office: r.office,
      electionYear: config.electionYear,
      fecCandidateId: r.fecCandidateId,
      totalReceipts: (receipts.get(r.fecCandidateId) ?? 0).toFixed(2),
      rawMetadata: {
        source: "fec_roster",
        fec: {
          candidate_id: r.fecCandidateId,
          name: r.fecName,
          incumbent_challenge: r.incumbentChallenge,
          election_year: config.electionYear,
        },
        ...(isIncumbentFiler ? { unmatchedIncumbentFiler: true } : {}),
      },
      insertedAt: now,
      updatedAt: now,
    });
  }

  if (config.dryRun) {
    counts.challengersUpserted = rows.length;
    return;
  }

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(candidates)
      .values(chunk)
      .onConflictDoUpdate({
        target: candidates.id,
        set: {
          fullName: sql`excluded.full_name`,
          party: sql`excluded.party`,
          state: sql`excluded.state`,
          district: sql`excluded.district`,
          office: sql`excluded.office`,
          electionYear: sql`excluded.election_year`,
          fecCandidateId: sql`excluded.fec_candidate_id`,
          totalReceipts: sql`excluded.total_receipts`,
          rawMetadata: sql`excluded.raw_metadata`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    counts.challengersUpserted += chunk.length;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function ingestFederalCandidates({
  db = requireDb(),
  fetcher = fetch,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<IngestCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `[federal-candidates] starting year=${config.electionYear} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  const counts: IngestCounts = {
    rosterRows: 0,
    receiptsMatched: 0,
    incumbentsBackfilled: 0,
    challengersUpserted: 0,
    unmatchedIncumbentFilers: 0,
    skipped: 0,
  };

  const roster = await fetchRoster(config, fetcher);
  counts.rosterRows = roster.length;
  console.log(`[federal-candidates] roster rows=${roster.length}`);

  const receipts = await fetchReceipts(config, fetcher);
  counts.receiptsMatched = receipts.size;
  console.log(`[federal-candidates] receipts rows=${receipts.size}`);

  const existing = await loadExistingFederal(db);
  console.log(`[federal-candidates] existing federal rows=${existing.length}`);

  const claimed = await backfillIncumbents(
    db,
    existing,
    roster,
    receipts,
    config,
    counts,
  );
  await upsertChallengers(db, roster, receipts, claimed, config, counts);

  console.log(
    `[federal-candidates] done roster=${counts.rosterRows} receipts=${counts.receiptsMatched} ` +
      `incumbentsBackfilled=${counts.incumbentsBackfilled} challengersUpserted=${counts.challengersUpserted} ` +
      `unmatchedIncumbentFilers=${counts.unmatchedIncumbentFilers} skipped=${counts.skipped}` +
      (config.dryRun ? " (DRY RUN — no writes)" : ""),
  );
  return counts;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  ingestFederalCandidates().catch((err) => {
    console.error("[federal-candidates] fatal:", err);
    process.exit(1);
  });
}

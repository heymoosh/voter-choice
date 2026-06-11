/**
 * scripts/ingest/fec-ids-from-bulk.ts
 *
 * Offline FEC candidate-ID backfill from FEC bulk files.
 *
 * Replaces the throttled per-candidate name search in fix-federal-fec-ids.ts:
 * for every row in `candidates` with jurisdiction 'federal-house' /
 * 'federal-senate' that lacks an FEC candidate ID, match it against the FEC
 * candidate master (cn) bulk file by seat + surname (with first-name,
 * incumbency, and receipts tiebreaks) and write the resolved ID.
 *
 * Multiple cn cycles are read because Senate classes not up until 2028/2030
 * are absent from cn26 alone. Receipts (weball) are used ONLY to pick among
 * multiple CAND_IDs that clearly belong to the same person; genuinely
 * different people stay ambiguous and are never written.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/fec-ids-from-bulk.ts --cycle 2026
 *   ... --cn-cycles 2026,2028,2030
 *   ... --weball-zip /tmp/weball26.zip --data-dir /tmp/fec-bulk
 *   ... --skip-download --dry-run --limit 50
 *
 * FEC formats (pipe-delimited, headerless):
 * - cn: https://www.fec.gov/campaign-finance-data/candidate-master-file-description/
 * - weball: https://www.fec.gov/campaign-finance-data/all-candidates-file-description/
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { eq, or } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates } from "../../db/schema";
import {
  DEFAULT_FEC_BULK_DIR,
  asRecord,
  emptyToNull,
  ensureBulkZip,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
} from "./_fec-bulk";
import {
  extractFecCandidateId,
  lastNameFromGovTrackName,
  stateFromGovTrackName,
} from "./federal-donors";

const LOG_PREFIX = "[fec-ids-from-bulk]";

const DEFAULT_CYCLE = "2026";
const DEFAULT_CN_CYCLES = "2026,2028,2030";

/** Suffix/honorific tokens stripped during name normalization. */
const SUFFIX_TOKENS = new Set([
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
  "mr",
  "mrs",
  "ms",
  "dr",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FecIdsFromBulkConfig {
  cycle: string;
  /** cn cycles to read, primary cycle first when present. */
  cnCycles: string[];
  weballZipPath: string | null;
  dataDir: string;
  skipDownload: boolean;
  dryRun: boolean;
  limit: number | null;
}

/** One row of the FEC candidate master (cn) file, offices H/S only. */
export interface CnCandidate {
  candId: string;
  name: string;
  party: string | null;
  electionYear: number | null;
  state: string;
  office: "H" | "S";
  /** "" for senate; zero-padded 2-digit for house ("00" = at-large). */
  district: string;
  /** CAND_ICI: "I" | "C" | "O" or "". */
  ici: string;
  status: string;
}

/** Subset of a `candidates` row that the matcher needs. */
export interface MatchableRow {
  fullName: string;
  jurisdiction: string;
  isIncumbent: boolean;
  state: string | null;
  district: string | null;
  office: string | null;
}

export type MatchResult =
  | { kind: "matched"; candId: string; cnName: string }
  | { kind: "ambiguous"; candidates: CnCandidate[] }
  | { kind: "unmatched"; reason: string };

export interface FecIdsFromBulkCounts {
  scanned: number;
  alreadyHadId: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  updated: number;
  dryRun: boolean;
}

interface OurCandidateRow extends MatchableRow {
  id: string;
  sourceId: string | null;
  fecCandidateId: string | null;
  rawMetadata: unknown;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FecIdsFromBulkConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  if (!/^\d{4}$/u.test(cycle)) {
    throw new Error(`Invalid --cycle value: ${cycle}`);
  }

  const cnCyclesRaw = parseValueFlag(argv, "--cn-cycles") ?? DEFAULT_CN_CYCLES;
  const cnCycleList = [
    ...new Set(
      cnCyclesRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (cnCycleList.length === 0) {
    throw new Error("--cn-cycles requires at least one cycle");
  }
  for (const cnCycle of cnCycleList) {
    if (!/^\d{4}$/u.test(cnCycle)) {
      throw new Error(`Invalid --cn-cycles entry: ${cnCycle}`);
    }
  }
  // Primary cycle first so its cn rows win the per-CAND_ID dedupe.
  const cnCycles = cnCycleList.includes(cycle)
    ? [cycle, ...cnCycleList.filter((cnCycle) => cnCycle !== cycle)]
    : cnCycleList;

  const dataDir = resolve(
    parseValueFlag(argv, "--data-dir") ??
      env.FEC_BULK_DIR ??
      DEFAULT_FEC_BULK_DIR,
  );

  return {
    cycle,
    cnCycles,
    weballZipPath: parseValueFlag(argv, "--weball-zip"),
    dataDir,
    skipDownload: argv.includes("--skip-download"),
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
  };
}

// ---------------------------------------------------------------------------
// Bulk-line parsing (indices hardcoded per FEC layout; unit-tested)
// ---------------------------------------------------------------------------

/** Zero-pad a House district to 2 digits; missing/at-large → "00". */
function normalizeHouseDistrict(district: string | null | undefined): string {
  const digits = (district ?? "").replace(/\D/gu, "");
  return digits ? digits.padStart(2, "0").slice(-2) : "00";
}

/**
 * Parse one cn (candidate master) line. Returns null for presidential rows
 * (CAND_OFFICE "P") and malformed lines.
 */
export function parseCandidateMasterLine(line: string): CnCandidate | null {
  const fields = line.trimEnd().split("|");
  const candId = (fields[0] ?? "").trim().toUpperCase();
  const name = (fields[1] ?? "").trim();
  const office = (fields[5] ?? "").trim().toUpperCase();
  if (!candId || !name) return null;
  if (office !== "H" && office !== "S") return null;

  const electionYear = Number.parseInt((fields[3] ?? "").trim(), 10);
  return {
    candId,
    name,
    party: emptyToNull(fields[2]),
    electionYear: Number.isInteger(electionYear) ? electionYear : null,
    state: (fields[4] ?? "").trim().toUpperCase(),
    office,
    district: office === "S" ? "" : normalizeHouseDistrict(fields[6]),
    ici: emptyToNull(fields[7])?.toUpperCase() ?? "",
    status: emptyToNull(fields[8])?.toUpperCase() ?? "",
  };
}

/** Parse one weball (all-candidate financial summary) line. */
export function parseWeballLine(
  line: string,
): { candId: string; receipts: number } | null {
  const fields = line.trimEnd().split("|");
  const candId = (fields[0] ?? "").trim().toUpperCase();
  const receipts = Number.parseFloat((fields[5] ?? "").trim());
  if (!candId || !Number.isFinite(receipts)) return null;
  return { candId, receipts };
}

// ---------------------------------------------------------------------------
// Name / seat normalization
// ---------------------------------------------------------------------------

function cleanNameToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z-]/gu, "");
}

function isSuffixToken(token: string): boolean {
  return SUFFIX_TOKENS.has(cleanNameToken(token));
}

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/u).filter(Boolean);
}

/**
 * Surname key from an FEC "LAST, FIRST MIDDLE" name: text before the first
 * comma, suffix tokens stripped, final token, lowercase, [a-z-] only.
 * "WASSERMAN SCHULTZ, DEBBIE" → "schultz"; "SMITH JR, JAMES" → "smith".
 */
export function fecSurnameKey(candName: string): string {
  const surnamePart = candName.split(",")[0] ?? "";
  const tokens = tokenize(surnamePart).filter((token) => !isSuffixToken(token));
  return cleanNameToken(tokens[tokens.length - 1] ?? "");
}

/**
 * First given-name token from an FEC "LAST, FIRST MIDDLE" name, honorifics
 * and suffixes stripped; null when absent (no comma / no given names).
 */
export function fecFirstKey(candName: string): string | null {
  const commaIndex = candName.indexOf(",");
  if (commaIndex === -1) return null;
  const tokens = tokenize(candName.slice(commaIndex + 1)).filter(
    (token) => !isSuffixToken(token),
  );
  const first = tokens[0] ? cleanNameToken(tokens[0]) : "";
  return first || null;
}

/** "Rep. Robert Aderholt [R-AL4]" → "Robert Aderholt". */
function stripGovTrackDecoration(name: string): string {
  return name
    .replace(/^(Rep\.|Sen\.|Del\.|Com\.)\s+/iu, "")
    .replace(/\s*\[.*\]\s*$/u, "")
    .trim();
}

/** Surname key for one of OUR candidate rows, normalized like fecSurnameKey. */
export function ourSurnameKey(row: Pick<MatchableRow, "fullName">): string {
  const lastName = lastNameFromGovTrackName(row.fullName);
  if (!isSuffixToken(lastName)) {
    const key = cleanNameToken(lastName);
    if (key) return key;
  }
  // Trailing suffix ("John Smith Jr.") — strip suffixes, take the final token.
  const tokens = tokenize(stripGovTrackDecoration(row.fullName)).filter(
    (token) => !isSuffixToken(token),
  );
  return cleanNameToken(tokens[tokens.length - 1] ?? "");
}

/** First given-name key for one of OUR candidate rows; null when absent. */
export function ourFirstKey(
  row: Pick<MatchableRow, "fullName">,
): string | null {
  const tokens = tokenize(stripGovTrackDecoration(row.fullName)).filter(
    (token) => !isSuffixToken(token),
  );
  const first = tokens[0] ? cleanNameToken(tokens[0]) : "";
  return first || null;
}

/** "H:TX:07" / "S:NJ:" — district "" for senate, zero-padded for house. */
export function seatKey(seat: {
  office: "H" | "S";
  state: string;
  district: string;
}): string {
  return `${seat.office}:${seat.state}:${seat.district}`;
}

/**
 * Seat for one of OUR rows: office from row.office falling back to
 * jurisdiction; state from row.state falling back to the GovTrack name tag;
 * district "" for senate, zero-padded for house. Null when the state (or
 * office) cannot be determined.
 */
export function ourSeat(
  row: Pick<
    MatchableRow,
    "fullName" | "jurisdiction" | "state" | "district" | "office"
  >,
): { office: "H" | "S"; state: string; district: string } | null {
  const office =
    row.office === "house"
      ? "H"
      : row.office === "senate"
        ? "S"
        : row.jurisdiction === "federal-house"
          ? "H"
          : row.jurisdiction === "federal-senate"
            ? "S"
            : null;
  if (!office) return null;

  const state =
    (row.state ?? "").trim().toUpperCase() ||
    stateFromGovTrackName(row.fullName);
  if (!state) return null;

  const district = office === "S" ? "" : normalizeHouseDistrict(row.district);
  return { office, state, district };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Index key for a cn candidate: `${seatKey}:${surnameKey}`. */
export function cnIndexKey(candidate: CnCandidate): string | null {
  const surname = fecSurnameKey(candidate.name);
  if (!surname || !candidate.state) return null;
  return `${seatKey(candidate)}:${surname}`;
}

export function buildCnIndex(
  cnCandidates: Iterable<CnCandidate>,
): Map<string, CnCandidate[]> {
  const index = new Map<string, CnCandidate[]>();
  for (const candidate of cnCandidates) {
    const key = cnIndexKey(candidate);
    if (!key) continue;
    const bucket = index.get(key);
    if (bucket) {
      bucket.push(candidate);
    } else {
      index.set(key, [candidate]);
    }
  }
  return index;
}

function fecPersonKey(candidate: CnCandidate): string {
  return `${fecSurnameKey(candidate.name)}:${fecFirstKey(candidate.name) ?? ""}`;
}

/**
 * Match one of OUR rows against the cn index.
 *
 * Cascade: seat+surname lookup → prefer primary-cycle subset → exact
 * first-name narrowing → unique first-initial → incumbent ICI tiebreak →
 * same-person highest-receipts tiebreak (the only receipts use) →
 * otherwise ambiguous (never guess).
 */
export function matchCandidate(
  ourRow: MatchableRow,
  cnIndex: Map<string, CnCandidate[]>,
  weballReceipts: Map<string, number>,
  primaryCycle: string,
): MatchResult {
  const seat = ourSeat(ourRow);
  if (!seat) return { kind: "unmatched", reason: "no_state" };

  const surname = ourSurnameKey(ourRow);
  if (!surname) return { kind: "unmatched", reason: "no_surname" };

  let pool = cnIndex.get(`${seatKey(seat)}:${surname}`) ?? [];
  if (pool.length === 0) {
    return { kind: "unmatched", reason: "no_cn_candidates" };
  }

  // 1. Prefer the primary-cycle subset when non-empty.
  const primaryYear = Number.parseInt(primaryCycle, 10);
  const primarySubset = pool.filter(
    (candidate) => candidate.electionYear === primaryYear,
  );
  if (primarySubset.length > 0) pool = primarySubset;

  // 2. Exactly one candidate at the key.
  if (pool.length === 1) return matched(pool[0]!);

  // 3. Narrow by exact first name, then unique first initial.
  let remaining = pool;
  const ourFirst = ourFirstKey(ourRow);
  if (ourFirst) {
    const exact = remaining.filter(
      (candidate) => fecFirstKey(candidate.name) === ourFirst,
    );
    if (exact.length === 1) return matched(exact[0]!);
    if (exact.length > 1) {
      remaining = exact;
    } else {
      const initial = remaining.filter(
        (candidate) => (fecFirstKey(candidate.name) ?? "")[0] === ourFirst[0],
      );
      if (initial.length === 1) return matched(initial[0]!);
      if (initial.length > 1) remaining = initial;
    }
  }

  // 4. Incumbent tiebreak on CAND_ICI.
  if (remaining.length > 1 && ourRow.isIncumbent) {
    const incumbents = remaining.filter((candidate) => candidate.ici === "I");
    if (incumbents.length === 1) return matched(incumbents[0]!);
    if (incumbents.length > 1) remaining = incumbents;
  }

  if (remaining.length === 1) return matched(remaining[0]!);

  // 5. Same person under multiple CAND_IDs → highest weball receipts.
  const personKeys = new Set(remaining.map(fecPersonKey));
  if (personKeys.size === 1) {
    const best = [...remaining].sort(
      (a, b) =>
        (weballReceipts.get(b.candId) ?? 0) -
        (weballReceipts.get(a.candId) ?? 0),
    )[0]!;
    return matched(best);
  }

  // 6. Genuinely different people — never guess.
  return { kind: "ambiguous", candidates: remaining };
}

function matched(candidate: CnCandidate): MatchResult {
  return { kind: "matched", candId: candidate.candId, cnName: candidate.name };
}

// ---------------------------------------------------------------------------
// Bulk-file loading
// ---------------------------------------------------------------------------

async function loadCnCandidates(
  config: FecIdsFromBulkConfig,
): Promise<Map<string, CnCandidate>> {
  // Dedupe by CAND_ID across cycle files; cnCycles is ordered primary-first,
  // so the primary cycle's row wins when duplicated.
  const byCandId = new Map<string, CnCandidate>();
  for (const cnCycle of config.cnCycles) {
    let zipPath: string;
    try {
      zipPath = await ensureBulkZip({
        cycle: cnCycle,
        prefix: "cn",
        dataDir: config.dataDir,
        skipDownload: config.skipDownload,
        logPrefix: LOG_PREFIX,
      });
    } catch (error) {
      // Future-cycle cn files (e.g. cn28/cn30) may not be published yet. The
      // primary cycle's file already lists off-cycle sitting senators with
      // their future CAND_ELECTION_YR, so a missing secondary file is
      // survivable; a missing primary file is not.
      if (cnCycle === config.cycle) throw error;
      console.warn(
        `${LOG_PREFIX} cn cycle=${cnCycle} unavailable, skipping (${error instanceof Error ? error.message : error})`,
      );
      continue;
    }
    let parsed = 0;
    console.log(`${LOG_PREFIX} streaming candidate master ${zipPath}`);
    await streamZipLines(
      zipPath,
      (line) => {
        const candidate = parseCandidateMasterLine(line);
        if (!candidate) return;
        parsed += 1;
        if (!byCandId.has(candidate.candId)) {
          byCandId.set(candidate.candId, candidate);
        }
      },
      LOG_PREFIX,
    );
    console.log(
      `${LOG_PREFIX} cn cycle=${cnCycle} parsed=${parsed} total_unique=${byCandId.size}`,
    );
  }
  return byCandId;
}

async function loadWeballReceipts(
  config: FecIdsFromBulkConfig,
): Promise<Map<string, number>> {
  const zipPath = await ensureBulkZip({
    cycle: config.cycle,
    prefix: "weball",
    dataDir: config.dataDir,
    explicitPath: config.weballZipPath,
    skipDownload: config.skipDownload,
    logPrefix: LOG_PREFIX,
  });
  const receipts = new Map<string, number>();
  console.log(`${LOG_PREFIX} streaming weball ${zipPath}`);
  await streamZipLines(
    zipPath,
    (line) => {
      const row = parseWeballLine(line);
      if (row) receipts.set(row.candId, row.receipts);
    },
    LOG_PREFIX,
  );
  console.log(`${LOG_PREFIX} weball candidates=${receipts.size}`);
  return receipts;
}

// ---------------------------------------------------------------------------
// DB write
// ---------------------------------------------------------------------------

async function writeFecId(
  db: DbClient,
  row: OurCandidateRow,
  candId: string,
  cnName: string,
  cycle: string,
): Promise<void> {
  // Spread-merge raw_metadata so sibling keys are preserved (same pattern as
  // fix-federal-fec-ids.ts).
  const meta = asRecord(row.rawMetadata) ?? {};
  const merged = {
    ...meta,
    fec: {
      ...(asRecord(meta.fec) ?? {}),
      candidate_id: candId,
      match: {
        method: "bulk_cn",
        cycle,
        fecName: cnName,
        matchedAt: new Date().toISOString(),
      },
    },
  };

  await db
    .update(candidates)
    .set({
      fecCandidateId: candId,
      rawMetadata: merged,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, row.id));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function ingestFecIdsFromBulk({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FecIdsFromBulkCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `${LOG_PREFIX} starting cycle=${config.cycle} cnCycles=${config.cnCycles.join(",")} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  const cnById = await loadCnCandidates(config);
  const cnIndex = buildCnIndex(cnById.values());
  const weballReceipts = await loadWeballReceipts(config);

  const rows = (await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      sourceId: candidates.sourceId,
      jurisdiction: candidates.jurisdiction,
      isIncumbent: candidates.isIncumbent,
      state: candidates.state,
      district: candidates.district,
      office: candidates.office,
      fecCandidateId: candidates.fecCandidateId,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates)
    .where(
      or(
        eq(candidates.jurisdiction, "federal-house"),
        eq(candidates.jurisdiction, "federal-senate"),
      ),
    )) as OurCandidateRow[];

  const counts: FecIdsFromBulkCounts = {
    scanned: 0,
    alreadyHadId: 0,
    matched: 0,
    ambiguous: 0,
    unmatched: 0,
    updated: 0,
    dryRun: config.dryRun,
  };
  let processed = 0;

  for (const row of rows) {
    counts.scanned += 1;

    if (extractFecCandidateId(row as unknown as Record<string, unknown>)) {
      counts.alreadyHadId += 1;
      continue;
    }

    if (config.limit !== null && processed >= config.limit) break;
    processed += 1;

    const seat = ourSeat(row);
    const seatLabel = seat ? seatKey(seat) : "?";
    const result = matchCandidate(row, cnIndex, weballReceipts, config.cycle);

    if (result.kind === "matched") {
      counts.matched += 1;
      if (config.dryRun) {
        console.log(
          `${LOG_PREFIX} would-write candidate=${row.id} fec_id=${result.candId} (${result.cnName})`,
        );
      } else {
        await writeFecId(db, row, result.candId, result.cnName, config.cycle);
        counts.updated += 1;
      }
    } else if (result.kind === "ambiguous") {
      counts.ambiguous += 1;
      const competing = result.candidates
        .map((candidate) => `${candidate.candId}/${candidate.name}`)
        .join(", ");
      console.log(
        `${LOG_PREFIX} ambiguous candidate=${row.id} name="${row.fullName}" seat=${seatLabel} candidates=[${competing}]`,
      );
    } else {
      counts.unmatched += 1;
      console.log(
        `${LOG_PREFIX} unmatched candidate=${row.id} name="${row.fullName}" seat=${seatLabel} reason=${result.reason}`,
      );
    }
  }

  console.log(
    [
      `${LOG_PREFIX} complete`,
      `scanned=${counts.scanned}`,
      `already_had_id=${counts.alreadyHadId}`,
      `matched=${counts.matched}`,
      `ambiguous=${counts.ambiguous}`,
      `unmatched=${counts.unmatched}`,
      `updated=${counts.updated}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestFecIdsFromBulk().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

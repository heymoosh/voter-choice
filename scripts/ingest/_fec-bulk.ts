/**
 * scripts/ingest/_fec-bulk.ts
 *
 * Shared helpers for ingests that read FEC bulk-download files
 * (https://www.fec.gov/data/browse-data/?tab=bulk-data).
 *
 * Bulk files are pipe-delimited and headerless; the column header CSVs ship
 * separately on fec.gov, so each consumer hardcodes (and unit-tests) its
 * field indices. Zips are cached in DEFAULT_FEC_BULK_DIR and streamed via
 * `unzip -p` without inflating to disk.
 *
 * Extracted from federal-issue-pacs.ts so fec-ids-from-bulk.ts and
 * federal-sectors-bulk.ts can reuse the same download/stream/upsert path.
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { desc, sql } from "drizzle-orm";
import type { DbClient } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";

type UnknownRecord = Record<string, unknown>;

const execFileAsync = promisify(execFile);

export const FEC_BULK_BASE_URL = "https://www.fec.gov/files/bulk-downloads";
export const FEC_BULK_SOURCE = "fec_bulk";
export const DEFAULT_FEC_BULK_DIR = "/tmp/voter-choice-fec-bulk";
export const UPSERT_CHUNK_SIZE = 100;
export const FUNDING_MIX_BUCKET_LABELS = [
  "Small individual donors (under $200)",
  "Large individual donors ($200+)",
  "PACs",
] as const;

export interface DonorAggregateRow {
  candidateId: string;
  electionCycle: string;
  bucketLabel: string;
  amountTotal: string;
  source: string;
  sourceUrl: string;
  rawMetadata: Record<string, unknown>;
}

export interface CandidateFecRow {
  id: string;
  sourceId: string | null;
  fecCandidateId: string | null;
  rawMetadata: unknown;
}

/** "https://www.fec.gov/files/bulk-downloads/2026/indiv26.zip" etc. */
export function bulkZipUrl(cycle: string, prefix: string): string {
  return `${FEC_BULK_BASE_URL}/${cycle}/${prefix}${cycle.slice(2)}.zip`;
}

/**
 * Resolve the local path for a bulk zip (honoring an explicit override) and
 * download it if missing. Returns the local path.
 */
export async function ensureBulkZip({
  cycle,
  prefix,
  dataDir,
  explicitPath,
  skipDownload,
  logPrefix,
}: {
  cycle: string;
  prefix: string;
  dataDir: string;
  explicitPath?: string | null;
  skipDownload?: boolean;
  logPrefix: string;
}): Promise<string> {
  const destination = resolve(
    explicitPath ?? `${dataDir}/${prefix}${cycle.slice(2)}.zip`,
  );
  if (!skipDownload) {
    await mkdir(dataDir, { recursive: true });
    await downloadIfMissing(bulkZipUrl(cycle, prefix), destination, logPrefix);
  }
  return destination;
}

export async function downloadIfMissing(
  url: string,
  destination: string,
  logPrefix: string,
): Promise<void> {
  if (existsSync(destination)) {
    console.log(`${logPrefix} using existing ${destination}`);
    return;
  }

  console.log(`${logPrefix} downloading ${url} -> ${destination}`);
  const response = await fetch(url, {
    headers: { "user-agent": "voter-choice-fec-bulk-ingest" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  await pipeline(
    Readable.fromWeb(
      response.body as unknown as NodeReadableStream<Uint8Array>,
    ),
    createWriteStream(destination),
  );
}

export async function resolveZipEntry(zipPath: string): Promise<string> {
  const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath]);
  const entries = stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const textEntry = entries.find((entry) => /\.txt$/iu.test(entry));
  const firstEntry = textEntry ?? entries[0];
  if (!firstEntry) throw new Error(`No entries found in ${zipPath}`);
  return firstEntry;
}

export function openZipEntry(
  zipPath: string,
  entryPath: string,
  logPrefix: string,
): Readable {
  const child = spawn("unzip", ["-p", zipPath, entryPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    if (msg) console.warn(`${logPrefix} unzip stderr: ${msg}`);
  });

  return child.stdout as unknown as Readable;
}

/**
 * Stream the lines of a bulk zip's text entry. Return `false` from `onLine`
 * to stop early (e.g. --limit).
 */
export async function streamZipLines(
  zipPath: string,
  onLine: (line: string) => boolean | void,
  logPrefix: string,
): Promise<void> {
  const entryPath = await resolveZipEntry(zipPath);
  const stream = openZipEntry(zipPath, entryPath, logPrefix);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let stopped = false;

  return new Promise((resolvePromise, reject) => {
    rl.on("line", (line) => {
      if (stopped || !line.trim()) return;
      const shouldContinue = onLine(line);
      if (shouldContinue === false) {
        stopped = true;
        rl.close();
        stream.destroy();
      }
    });
    rl.on("close", () => resolvePromise());
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

/**
 * Stream the lines of a plain (uncompressed) bulk file. Mirrors
 * `streamZipLines` for the FEC bulk files that ship as a bare CSV rather than
 * a pipe-delimited zip — the independent-expenditure (Schedule E) file is the
 * one such file we consume (see federal-independent-expenditures.ts). Return
 * `false` from `onLine` to stop early (e.g. --limit).
 */
export async function streamTextFileLines(
  filePath: string,
  onLine: (line: string) => boolean | void,
  logPrefix: string,
): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`${logPrefix} missing input file: ${filePath}`);
  }
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let stopped = false;

  return new Promise((resolvePromise, reject) => {
    rl.on("line", (line) => {
      if (stopped) return;
      const shouldContinue = onLine(line);
      if (shouldContinue === false) {
        stopped = true;
        rl.close();
        stream.destroy();
      }
    });
    rl.on("close", () => resolvePromise());
    rl.on("error", reject);
    stream.on("error", reject);
  });
}

/**
 * Map FEC candidate id → our candidates.id, scoped to federal candidates that
 * already have a funding-mix row for the cycle. The scoping is deliberate:
 * derived buckets (sectors, issue PACs) are re-cuts of the funding mix and
 * must never become the only — and therefore headline — funding data on a
 * breakdown-less candidate.
 */
export async function loadFederalCandidateMapWithFundingMix(
  db: DbClient,
  cycle: string,
): Promise<Map<string, string>> {
  const fundingMixBucketList = sql.join(
    FUNDING_MIX_BUCKET_LABELS.map((label) => sql`${label}`),
    sql`, `,
  );
  const rows = (await db
    .select({
      id: candidates.id,
      sourceId: candidates.sourceId,
      fecCandidateId: candidates.fecCandidateId,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} IN ('federal-house', 'federal-senate')
        AND EXISTS (
          SELECT 1 FROM donor_aggregates funding_mix
          WHERE funding_mix.candidate_id = ${candidates.id}
            AND funding_mix.election_cycle = ${cycle}
            AND funding_mix.bucket_label IN (${fundingMixBucketList})
        )`,
    )) as CandidateFecRow[];

  const map = new Map<string, string>();
  for (const row of rows) {
    for (const fecId of fecCandidateIdsForRow(row)) {
      if (!map.has(fecId)) map.set(fecId, row.id);
    }
  }
  return map;
}

/**
 * Map FEC candidate id → our candidates.id for EVERY tracked federal
 * candidate with a resolvable FEC id — unlike
 * loadFederalCandidateMapWithFundingMix, not scoped to candidates that
 * already have a funding-mix row. Use this when the caller is not deriving a
 * re-cut of the funding mix (e.g. billionaire-donor-match.ts, which persists
 * raw matched contributions rather than a bucket total that could clobber a
 * funding-mix row at the same unique key).
 *
 * RESOLUTION IS DETERMINISTIC, AND FUNDING-MIX-FIRST WHEN GIVEN A CYCLE.
 * One FEC id can sit on more than one candidate row — a rendered row and a
 * voteless duplicate, the same duplicate class that once mis-resolved House
 * alignment onto a seat with no votes. Resolution is first-wins, so with no
 * ORDER BY the winner was whatever Postgres happened to return that run, and
 * a later run could silently move a candidate's stored rows onto the
 * duplicate while the rows written on the earlier one stayed behind. Rows are
 * therefore ordered funding-mix-carrying first (when `cycle` is passed), then
 * by candidate id: the winner is reproducible across runs, and for a caller
 * that passes a cycle it is the row the funding mix lives on — the attribution
 * guarantee the old funding-mix ingest scoping used to provide for free.
 * `resolveFecCandidateMap` warns on every id that matched more than one row.
 */
export async function loadFederalCandidateMap(
  db: DbClient,
  cycle?: string,
): Promise<Map<string, string>> {
  const fundingMixFirst = cycle
    ? [
        desc(sql`EXISTS (
          SELECT 1 FROM donor_aggregates funding_mix
          WHERE funding_mix.candidate_id = ${candidates.id}
            AND funding_mix.election_cycle = ${cycle}
            AND funding_mix.bucket_label IN (${sql.join(
              FUNDING_MIX_BUCKET_LABELS.map((label) => sql`${label}`),
              sql`, `,
            )})
        )`),
      ]
    : [];
  const rows = (await db
    .select({
      id: candidates.id,
      sourceId: candidates.sourceId,
      fecCandidateId: candidates.fecCandidateId,
      rawMetadata: candidates.rawMetadata,
    })
    .from(candidates)
    .where(
      sql`${candidates.jurisdiction} IN ('federal-house', 'federal-senate')`,
    )
    .orderBy(...fundingMixFirst, candidates.id)) as CandidateFecRow[];

  return resolveFecCandidateMap(rows);
}

/**
 * First-wins FEC-id → candidate-id resolution over rows the caller has
 * already ordered by preference, warning whenever one FEC id matched more
 * than one candidate row so the ambiguity stops being silent. Exported for
 * tests; callers should go through `loadFederalCandidateMap`.
 */
export function resolveFecCandidateMap(
  rows: CandidateFecRow[],
): Map<string, string> {
  const candidatesByFecId = new Map<string, string[]>();
  for (const row of rows) {
    for (const fecId of fecCandidateIdsForRow(row)) {
      const ids = candidatesByFecId.get(fecId) ?? [];
      if (!ids.includes(row.id)) ids.push(row.id);
      candidatesByFecId.set(fecId, ids);
    }
  }

  const map = new Map<string, string>();
  for (const [fecId, ids] of candidatesByFecId) {
    map.set(fecId, ids[0]);
    if (ids.length > 1) {
      console.warn(
        `[fec-bulk] FEC id ${fecId} resolves to ${ids.length} candidate rows; ` +
          `attributing to ${ids[0]} (also matched: ${ids.slice(1).join(", ")})`,
      );
    }
  }
  return map;
}

export function fecCandidateIdsForRow(row: CandidateFecRow): string[] {
  const ids = new Set<string>();
  if (row.fecCandidateId) ids.add(row.fecCandidateId.trim().toUpperCase());
  if (row.sourceId && looksLikeFecCandidateId(row.sourceId)) {
    ids.add(row.sourceId.trim().toUpperCase());
  }

  const raw = asRecord(row.rawMetadata);
  const fec = asRecord(raw?.fec);
  const metadataId = getString(fec, "candidate_id");
  if (metadataId) ids.add(metadataId.trim().toUpperCase());

  return [...ids].filter(looksLikeFecCandidateId);
}

export function looksLikeFecCandidateId(value: string): boolean {
  return /^[A-Z][A-Z0-9]{7,8}$/u.test(value.trim());
}

export async function upsertDonorAggregateRows(
  db: DbClient,
  rows: DonorAggregateRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  let total = 0;
  const now = new Date();
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    const dbRows = chunk.map((row) => ({
      candidateId: row.candidateId,
      electionCycle: row.electionCycle,
      bucketLabel: row.bucketLabel,
      amountTotal: row.amountTotal,
      source: row.source,
      sourceUrl: row.sourceUrl,
      rawMetadata: row.rawMetadata,
      insertedAt: now,
    }));

    await db
      .insert(donorAggregates)
      .values(dbRows)
      .onConflictDoUpdate({
        target: [
          donorAggregates.candidateId,
          donorAggregates.electionCycle,
          donorAggregates.bucketLabel,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          rawMetadata: sql`excluded.raw_metadata`,
          insertedAt: sql`excluded.inserted_at`,
        },
      });

    total += dbRows.length;
  }

  return total;
}

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

export function getString(
  record: UnknownRecord | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function parseValueFlag(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

export function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Build "YYYY-MM-DD" from calendar parts, or null when they do not describe a
 * real day. FEC bulk files do contain impossible dates (e.g. "02312026",
 * "13/45/2026"); a naive range check on month/day alone would still emit a
 * date Postgres rejects at insert time, failing the whole upsert chunk.
 * Roundtripping through Date.UTC and comparing back catches that — Date.UTC
 * normalizes Feb 31 -> Mar 3, so a mismatch means the input was invalid.
 *
 * Shared because two ingests parse dates out of these files in different wire
 * formats (MMDDYYYY in billionaire-donor-match.ts, MM/DD/YYYY in
 * federal-candidate-summary-bulk.ts) but need identical calendar validation.
 */
export function isoDateFromParts(
  year: number,
  month: number,
  day: number,
): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

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
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { sql } from "drizzle-orm";
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

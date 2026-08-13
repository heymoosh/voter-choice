/**
 * scripts/ingest/federal-independent-expenditures.ts
 *
 * Part 6b — super-PAC independent expenditures (FEC Schedule E).
 *
 * Reads the FEC independent-expenditure bulk file for a cycle, keeps only the
 * itemized expenditures aimed at candidates we track, and upserts per
 * spender committee × candidate × cycle × support/oppose totals into
 * `independent_expenditures` (migration 0023). Spender committees are
 * registered in the existing `pac_committees` table (migration 0022) using
 * Part 6a's own classification and upsert functions — imported, never copied —
 * so committee identity, sponsor (CONNECTED_ORG), sector, evidence URL and the
 * verified/rejected status guard live in exactly one place.
 *
 * ---------------------------------------------------------------------------
 * THE NON-NEGOTIABLE DISPLAY RULE (plan doc, Part 6b)
 * ---------------------------------------------------------------------------
 * Outside spending is NOT the candidate's money and legally cannot be
 * coordinated with the campaign. It must render as its own "Outside spending
 * about this race" block — spent FOR and spent AGAINST — and must never be
 * summed into the funding mix, into totalRaised, or into each other. This
 * ingest therefore:
 *   - never touches `donor_aggregates` (it does not even import it);
 *   - writes support and oppose as separate rows, keyed apart by the table's
 *     unique constraint, so there is nowhere to store a netted number.
 * `scripts/ingest/independent-expenditure-isolation.test.ts` enforces both.
 *
 * ---------------------------------------------------------------------------
 * WHICH FEC FILE — AND THE UNVERIFIED ASSUMPTION IN IT
 * ---------------------------------------------------------------------------
 * The per-cycle FTP-style zips that `_fec-bulk.ts` fetches (cn/cm/ccl/pas2/
 * indiv/oth/oppexp) contain NO Schedule E data. `oppexp` is OPERATING
 * expenditures — a committee's own rent/payroll/ads spending — and is the
 * wrong file. Itemized independent expenditures ship as a separate,
 * header-bearing CSV on the FEC bulk-download page:
 *
 *     https://www.fec.gov/files/bulk-downloads/independent_expenditure_<cycle>.csv
 *
 * That is this script's default URL, and it is the keyless bulk path (no API
 * key, unlike OpenFEC `/schedules/schedule_e/`). ASSUMPTION FLAG: the exact
 * URL and column names could NOT be verified live — fec.gov is blocked by this
 * container's egress proxy — so both were written from the FEC's published
 * independent-expenditure file description. Two mitigations:
 *   1. `--ie-url` and `--ie-csv` override the URL / local path, so a wrong
 *      default costs one flag, not a rewrite.
 *   2. Columns are resolved BY NAME from the file's own header row, with the
 *      documented aliases below, and the run FAILS LOUDLY (echoing the header
 *      it actually saw) if a load-bearing column is missing. Nothing is read
 *      positionally and nothing is guessed. Verify on the first --dry-run.
 *
 * Data rules, from the file's semantics:
 *   - amount = EXP_AMO (the per-filing expenditure), never AGG_AMO (the
 *     filer's running aggregate) — summing AGG_AMO multiply-counts.
 *   - SUP_OPP "S" → support, "O" → oppose. Anything else is counted and
 *     skipped, never guessed into a direction.
 *   - Amended filings: a row whose FILE_NUM appears as some other row's
 *     PREV_FILE_NUM has been superseded and is dropped, so an amendment does
 *     not double-count. (A no-op if the FEC already excludes superseded rows.)
 *
 * Candidate resolution matches the sibling ingests exactly:
 * `loadFederalCandidateMapWithFundingMix`. Rows for FEC candidate ids we
 * cannot resolve are counted and the largest are logged — never dropped
 * silently.
 *
 * Idempotent: upserts on (committee, candidate, cycle, support_oppose) so
 * re-runs replace recomputed totals. Kill and restart freely.
 *
 * Usage — --dry-run FIRST, always:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-independent-expenditures.ts --cycle 2026 --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-independent-expenditures.ts --cycle 2026
 *   Flags: --limit N (IE rows), --data-dir, --ie-csv, --ie-url, --cm-zip,
 *          --skip-download, --dry-run
 *
 * FEC formats:
 * - Independent expenditures: https://www.fec.gov/campaign-finance-data/independent-expenditure-file-description/
 * - Committee master: https://www.fec.gov/campaign-finance-data/committee-master-file-description/
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { independentExpenditures } from "../../db/schema";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_BASE_URL,
  FEC_BULK_SOURCE,
  UPSERT_CHUNK_SIZE,
  downloadIfMissing,
  loadFederalCandidateMapWithFundingMix,
  parsePositiveInteger,
  parseValueFlag,
  streamTextFileLines,
  streamZipLines,
} from "./_fec-bulk";
import { parseCommitteeMasterLine } from "./federal-issue-pacs";
import {
  buildCommitteeRow,
  evidenceUrlForCommittee,
  upsertCommittees,
  type CommitteeRowToUpsert,
} from "./federal-pac-sponsors";

const LOG_PREFIX = "[federal-independent-expenditures]";

const DEFAULT_CYCLE = "2026";

// ---------------------------------------------------------------------------
// Support / oppose — two figures, never one
// ---------------------------------------------------------------------------

/**
 * The only two directions an independent expenditure can have. Kept as a
 * frozen pair because the plan's rule is structural: support and oppose are
 * separate figures and must never be summed or netted into a third value.
 */
export const SUPPORT_OPPOSE_VALUES = ["support", "oppose"] as const;
export type SupportOppose = (typeof SUPPORT_OPPOSE_VALUES)[number];

/**
 * Map the FEC SUP_OPP field. "S"/"O" are the documented codes; the browse-UI
 * export spells them out. Anything else returns null — the row is counted as
 * unmapped and skipped, never guessed into a direction.
 */
export function parseSupportOppose(raw: string | null): SupportOppose | null {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "S" || value === "SUPPORT") return "support";
  if (value === "O" || value === "OPPOSE") return "oppose";
  return null;
}

// ---------------------------------------------------------------------------
// CSV reading (streaming, quote-aware)
// ---------------------------------------------------------------------------

/**
 * Split one complete CSV record into fields. Handles quoted fields containing
 * commas, doubled quotes ("" → "), and embedded newlines (the caller joins
 * continuation lines before calling — see `isCompleteCsvRecord`). The FEC's
 * purpose/payee columns carry commas, so positional splitting on "," is wrong.
 */
export function splitCsvRecord(record: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < record.length; i += 1) {
    const ch = record[i];
    if (inQuotes) {
      if (ch === '"') {
        if (record[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * A CSV record is complete when its quotes balance. An unbalanced line is a
 * quoted field with an embedded newline; the caller appends the next line.
 */
export function isCompleteCsvRecord(record: string): boolean {
  let quotes = 0;
  for (const ch of record) if (ch === '"') quotes += 1;
  return quotes % 2 === 0;
}

/**
 * Reassemble CSV records from a line stream. Returns the completed record, or
 * null while a quoted field is still open across a newline — the FEC's purpose
 * strings occasionally contain one, and splitting there would shear a row in
 * half and mis-attribute money.
 */
export function createCsvRecordAssembler(): (line: string) => string | null {
  let pending = "";
  return (line: string) => {
    pending = pending.length > 0 ? `${pending}\n${line}` : line;
    if (!isCompleteCsvRecord(pending)) return null;
    const record = pending;
    pending = "";
    return record;
  };
}

// ---------------------------------------------------------------------------
// Header resolution — by name, with documented aliases, fail loudly
// ---------------------------------------------------------------------------

/**
 * Column names we accept for each field we read, in the FEC's own vocabulary.
 * First entry is the bulk file's documented name; the rest are the names the
 * same field carries in the fec.gov browse-UI CSV export, so a file downloaded
 * from either surface works. Nothing is read positionally.
 */
export const IE_COLUMN_ALIASES = {
  candidateFecId: ["cand_id", "candidate_id"],
  spenderCommitteeId: ["spe_id", "committee_id", "spender_id"],
  spenderName: ["spe_nam", "committee_name", "spender_name"],
  amount: ["exp_amo", "expenditure_amount", "exp_amount"],
  supportOppose: ["sup_opp", "support_oppose_indicator", "support_oppose"],
  fileNumber: ["file_num", "fil_num", "filing_number"],
  previousFileNumber: ["prev_file_num", "previous_file_number"],
  expenditureDate: ["exp_dat", "expenditure_date"],
} as const;

export type IeColumnKey = keyof typeof IE_COLUMN_ALIASES;

/**
 * Without these four there is no ingest: who spent, on whom, how much, and
 * for or against. A file missing any of them is the wrong file (or a changed
 * format) and must stop the run rather than produce plausible-looking money.
 */
export const REQUIRED_IE_COLUMNS: readonly IeColumnKey[] = [
  "candidateFecId",
  "spenderCommitteeId",
  "amount",
  "supportOppose",
] as const;

export type IeColumnIndex = Partial<Record<IeColumnKey, number>>;

function normalizeHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^﻿/u, "")
    .replace(/[\s-]+/gu, "_");
}

/**
 * Resolve the header row to column indices. Throws — echoing the header the
 * file actually carried — when a required column is absent, because the
 * alternative is guessing at a column layout we could not verify live.
 */
export function resolveIeColumns(headerFields: string[]): IeColumnIndex {
  const byName = new Map<string, number>();
  headerFields.forEach((raw, index) => {
    const name = normalizeHeaderName(raw);
    if (name && !byName.has(name)) byName.set(name, index);
  });

  const columns: IeColumnIndex = {};
  for (const key of Object.keys(IE_COLUMN_ALIASES) as IeColumnKey[]) {
    for (const alias of IE_COLUMN_ALIASES[key]) {
      const index = byName.get(alias);
      if (index !== undefined) {
        columns[key] = index;
        break;
      }
    }
  }

  const missing = REQUIRED_IE_COLUMNS.filter(
    (key) => columns[key] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `${LOG_PREFIX} unexpected independent-expenditure header: missing required ` +
        `column(s) ${missing.map((key) => IE_COLUMN_ALIASES[key][0]).join(", ")}. ` +
        `Header seen: ${headerFields.map((f) => f.trim()).join(", ")}. ` +
        `Confirm the file is the FEC independent-expenditure (Schedule E) bulk ` +
        `CSV — oppexp is OPERATING expenditures and is the wrong file.`,
    );
  }
  return columns;
}

// ---------------------------------------------------------------------------
// Row parsing (pure)
// ---------------------------------------------------------------------------

export interface IeExpenditureRow {
  candidateFecId: string;
  spenderCommitteeId: string;
  spenderName: string | null;
  /** EXP_AMO — the per-filing amount, never the running AGG_AMO. */
  amount: number;
  supportOppose: SupportOppose;
  fileNumber: string | null;
  previousFileNumber: string | null;
}

function fieldAt(fields: string[], index: number | undefined): string | null {
  if (index === undefined) return null;
  const value = (fields[index] ?? "").trim();
  return value.length > 0 ? value : null;
}

/**
 * Parse one itemized Schedule E record. Returns null (the caller counts the
 * reason) for rows missing an id, carrying an unusable amount, or carrying a
 * support/oppose flag we do not recognise.
 */
export function parseIeRecord(
  fields: string[],
  columns: IeColumnIndex,
): IeExpenditureRow | null {
  const candidateFecId = (
    fieldAt(fields, columns.candidateFecId) ?? ""
  ).toUpperCase();
  const spenderCommitteeId = (
    fieldAt(fields, columns.spenderCommitteeId) ?? ""
  ).toUpperCase();
  if (!candidateFecId || !spenderCommitteeId) return null;

  const supportOppose = parseSupportOppose(
    fieldAt(fields, columns.supportOppose),
  );
  if (!supportOppose) return null;

  const amount = Number.parseFloat(
    (fieldAt(fields, columns.amount) ?? "").replace(/[$,]/gu, ""),
  );
  // Negative rows exist as filer corrections; they are dropped rather than
  // netted, matching the sibling ingests' positive-amount contract.
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    candidateFecId,
    spenderCommitteeId,
    spenderName: fieldAt(fields, columns.spenderName),
    amount,
    supportOppose,
    fileNumber: fieldAt(fields, columns.fileNumber),
    previousFileNumber: fieldAt(fields, columns.previousFileNumber),
  };
}

// ---------------------------------------------------------------------------
// Aggregation (pure)
// ---------------------------------------------------------------------------

export interface IeAggregate {
  committeeId: string;
  candidateId: string;
  supportOppose: SupportOppose;
  amountTotal: number;
  expenditureCount: number;
}

/**
 * The aggregation key. `supportOppose` is part of it on purpose: for and
 * against never collapse into one bucket.
 */
export function ieKey(
  committeeId: string,
  candidateId: string,
  supportOppose: SupportOppose,
): string {
  return `${committeeId}|${candidateId}|${supportOppose}`;
}

/** File numbers superseded by an amendment (some row's PREV_FILE_NUM). */
export function supersededFileNumbers(
  rows: readonly IeExpenditureRow[],
): Set<string> {
  const superseded = new Set<string>();
  for (const row of rows) {
    if (row.previousFileNumber) superseded.add(row.previousFileNumber);
  }
  return superseded;
}

export interface IeAggregationResult {
  pairs: Map<string, IeAggregate>;
  matchedRows: number;
  supersededRowsDropped: number;
  unresolvedCandidateRows: number;
  /** FEC candidate id → IE dollars we could not attribute to any candidate. */
  unresolvedAmountByFecId: Map<string, number>;
}

/**
 * Aggregate parsed rows per committee × candidate × direction. Rows whose FEC
 * candidate id does not resolve are counted and their dollars tallied per id
 * so the run can report the size of the miss — the resolution-miss handling
 * the sibling ingests use, never a silent drop.
 */
export function aggregateIeRows(
  rows: readonly IeExpenditureRow[],
  candidateByFecId: Map<string, string>,
): IeAggregationResult {
  const superseded = supersededFileNumbers(rows);
  const pairs = new Map<string, IeAggregate>();
  let matchedRows = 0;
  let supersededRowsDropped = 0;
  let unresolvedCandidateRows = 0;
  const unresolvedAmountByFecId = new Map<string, number>();

  for (const row of rows) {
    if (row.fileNumber && superseded.has(row.fileNumber)) {
      supersededRowsDropped += 1;
      continue;
    }
    const candidateId = candidateByFecId.get(row.candidateFecId);
    if (!candidateId) {
      unresolvedCandidateRows += 1;
      unresolvedAmountByFecId.set(
        row.candidateFecId,
        (unresolvedAmountByFecId.get(row.candidateFecId) ?? 0) + row.amount,
      );
      continue;
    }
    matchedRows += 1;
    const key = ieKey(row.spenderCommitteeId, candidateId, row.supportOppose);
    const aggregate = pairs.get(key) ?? {
      committeeId: row.spenderCommitteeId,
      candidateId,
      supportOppose: row.supportOppose,
      amountTotal: 0,
      expenditureCount: 0,
    };
    aggregate.amountTotal += row.amount;
    aggregate.expenditureCount += 1;
    pairs.set(key, aggregate);
  }

  return {
    pairs,
    matchedRows,
    supersededRowsDropped,
    unresolvedCandidateRows,
    unresolvedAmountByFecId,
  };
}

export interface IeRowToUpsert {
  committeeId: string;
  candidateId: string;
  electionCycle: string;
  supportOppose: SupportOppose;
  amountTotal: string;
  expenditureCount: number;
  source: string;
  sourceUrl: string;
}

export function buildIeRows(
  pairs: Map<string, IeAggregate>,
  cycle: string,
  sourceUrl: string,
): IeRowToUpsert[] {
  return [...pairs.values()]
    .filter((p) => p.amountTotal > 0)
    .map((p) => ({
      committeeId: p.committeeId,
      candidateId: p.candidateId,
      electionCycle: cycle,
      supportOppose: p.supportOppose,
      amountTotal: p.amountTotal.toFixed(2),
      expenditureCount: p.expenditureCount,
      source: FEC_BULK_SOURCE,
      sourceUrl,
    }))
    .sort(
      (a, b) =>
        a.committeeId.localeCompare(b.committeeId) ||
        a.candidateId.localeCompare(b.candidateId) ||
        a.supportOppose.localeCompare(b.supportOppose),
    );
}

/**
 * Spender committees to register in pac_committees. Committee-master entries
 * go through Part 6a's `buildCommitteeRow` (same sponsor/sector inference);
 * spenders absent from the master — Form 5 filers exist that the master does
 * not carry — fall back to the IE file's own spender name with NO sector,
 * because we have no filing to classify from.
 *
 * Unlike Part 6a's `pac_candidate_contributions`, no attributability filter is
 * applied: party committees and non-connected super PACs make real independent
 * expenditures, and there is no double-representation risk because none of
 * this money is inside the funding mix.
 */
export function buildSpenderCommitteeRows({
  spenderIds,
  master,
  spenderNames,
  cycle,
}: {
  spenderIds: Iterable<string>;
  master: Map<string, NonNullable<ReturnType<typeof parseCommitteeMasterLine>>>;
  spenderNames: Map<string, string>;
  cycle: string;
}): { rows: CommitteeRowToUpsert[]; spendersMissingFromMaster: number } {
  const rows: CommitteeRowToUpsert[] = [];
  let spendersMissingFromMaster = 0;
  for (const committeeId of [...spenderIds].sort()) {
    const info = master.get(committeeId);
    if (info) {
      rows.push(buildCommitteeRow(info, cycle));
      continue;
    }
    spendersMissingFromMaster += 1;
    rows.push({
      committeeId,
      name: spenderNames.get(committeeId) ?? committeeId,
      designation: null,
      committeeType: null,
      orgType: null,
      connectedOrg: null,
      sector: null,
      classificationMethod: null,
      evidenceUrl: evidenceUrlForCommittee(committeeId),
      lastSeenCycle: cycle,
    });
  }
  return { rows, spendersMissingFromMaster };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface FederalIeConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  ieCsvPath: string;
  ieCsvUrl: string;
  committeeMasterZipPath: string;
  skipDownload: boolean;
}

/** Default bulk location of the Schedule E file — see the module header. */
export function independentExpenditureCsvUrl(cycle: string): string {
  return `${FEC_BULK_BASE_URL}/independent_expenditure_${cycle}.csv`;
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalIeConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  if (!/^\d{4}$/u.test(cycle)) {
    throw new Error(`Invalid --cycle value: ${cycle}`);
  }
  const dataDir = resolve(
    parseValueFlag(argv, "--data-dir") ??
      env.FEC_BULK_DIR ??
      DEFAULT_FEC_BULK_DIR,
  );
  return {
    cycle,
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
    dataDir,
    ieCsvPath: resolve(
      parseValueFlag(argv, "--ie-csv") ??
        `${dataDir}/independent_expenditure_${cycle}.csv`,
    ),
    ieCsvUrl:
      parseValueFlag(argv, "--ie-url") ?? independentExpenditureCsvUrl(cycle),
    committeeMasterZipPath: resolve(
      parseValueFlag(argv, "--cm-zip") ?? `${dataDir}/cm${cycle.slice(2)}.zip`,
    ),
    skipDownload: argv.includes("--skip-download"),
  };
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

async function upsertIndependentExpenditures(
  db: DbClient,
  rows: IeRowToUpsert[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await db
      .insert(independentExpenditures)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          independentExpenditures.committeeId,
          independentExpenditures.candidateId,
          independentExpenditures.electionCycle,
          independentExpenditures.supportOppose,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          expenditureCount: sql`excluded.expenditure_count`,
          sourceUrl: sql`excluded.source_url`,
          updatedAt: sql`now()`,
        },
      });
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface FederalIeCounts {
  committeesInMaster: number;
  candidatesLoaded: number;
  ieRowsScanned: number;
  ieRowsParsed: number;
  unmappedSupportOpposeRows: number;
  supersededRowsDropped: number;
  matchedRows: number;
  unresolvedCandidateRows: number;
  spendersWithExpenditures: number;
  spendersMissingFromMaster: number;
  supportRows: number;
  opposeRows: number;
  /** Reported separately, on purpose — support and oppose are never summed. */
  supportAmount: number;
  opposeAmount: number;
  committeesUpserted: number;
  expenditureRowsUpserted: number;
  dryRun: boolean;
}

export async function ingestFederalIndependentExpenditures({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FederalIeCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `${LOG_PREFIX} starting cycle=${config.cycle} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!config.skipDownload) {
    await mkdir(config.dataDir, { recursive: true });
    await downloadIfMissing(config.ieCsvUrl, config.ieCsvPath, LOG_PREFIX);
    await downloadIfMissing(
      `${FEC_BULK_BASE_URL}/${config.cycle}/cm${config.cycle.slice(2)}.zip`,
      config.committeeMasterZipPath,
      LOG_PREFIX,
    );
  }

  // Committee master: spender attribution (sponsor + industry) for 6a's table.
  const master = new Map<
    string,
    NonNullable<ReturnType<typeof parseCommitteeMasterLine>>
  >();
  console.log(
    `${LOG_PREFIX} streaming committee master ${config.committeeMasterZipPath}`,
  );
  await streamZipLines(
    config.committeeMasterZipPath,
    (line) => {
      const committee = parseCommitteeMasterLine(line);
      if (!committee) return;
      master.set(committee.committeeId, committee);
    },
    LOG_PREFIX,
  );

  const candidateByFecId = await loadFederalCandidateMapWithFundingMix(
    db,
    config.cycle,
  );

  // Stream the Schedule E CSV. Columns resolve from the header by name; a
  // missing required column throws (see resolveIeColumns).
  let columns: IeColumnIndex | null = null;
  const nextRecord = createCsvRecordAssembler();
  const parsedRows: IeExpenditureRow[] = [];
  const spenderNames = new Map<string, string>();
  let ieRowsScanned = 0;
  let unmappedSupportOpposeRows = 0;

  /** Why a record failed to parse — an unreadable direction is worth counting. */
  const noteUnparsedRecord = (fields: string[], cols: IeColumnIndex): void => {
    if (parseSupportOppose(fieldAt(fields, cols.supportOppose)) === null) {
      unmappedSupportOpposeRows += 1;
    }
  };

  /** First spender name wins; used only for spenders absent from the master. */
  const rememberSpenderName = (row: IeExpenditureRow): void => {
    if (row.spenderName && !spenderNames.has(row.spenderCommitteeId)) {
      spenderNames.set(row.spenderCommitteeId, row.spenderName);
    }
  };

  console.log(`${LOG_PREFIX} streaming Schedule E ${config.ieCsvPath}`);
  await streamTextFileLines(
    config.ieCsvPath,
    (line) => {
      // A quoted field may contain a newline; wait for the record to close.
      const record = nextRecord(line);
      if (record === null || record.trim().length === 0) return;

      if (columns === null) {
        columns = resolveIeColumns(splitCsvRecord(record));
        console.log(
          `${LOG_PREFIX} header ok — resolved columns ${Object.keys(columns).join(", ")}`,
        );
        return;
      }

      if (config.limit !== null && ieRowsScanned >= config.limit) return false;
      ieRowsScanned += 1;
      if (ieRowsScanned % 250_000 === 0) {
        console.log(
          `${LOG_PREFIX} ie_rows=${ieRowsScanned.toLocaleString()} parsed=${parsedRows.length.toLocaleString()}`,
        );
      }

      const fields = splitCsvRecord(record);
      const row = parseIeRecord(fields, columns);
      if (!row) {
        noteUnparsedRecord(fields, columns);
        return;
      }
      parsedRows.push(row);
      rememberSpenderName(row);
      return true;
    },
    LOG_PREFIX,
  );

  if (columns === null) {
    throw new Error(
      `${LOG_PREFIX} no header row found in ${config.ieCsvPath} — is the file empty or not a CSV?`,
    );
  }

  const aggregation = aggregateIeRows(parsedRows, candidateByFecId);
  const ieRows = buildIeRows(aggregation.pairs, config.cycle, config.ieCsvUrl);

  const spenderIds = new Set(ieRows.map((r) => r.committeeId));
  const { rows: committeeRows, spendersMissingFromMaster } =
    buildSpenderCommitteeRows({
      spenderIds,
      master,
      spenderNames,
      cycle: config.cycle,
    });

  const supportRows = ieRows.filter((r) => r.supportOppose === "support");
  const opposeRows = ieRows.filter((r) => r.supportOppose === "oppose");
  const sumAmounts = (rows: IeRowToUpsert[]): number =>
    rows.reduce((total, row) => total + Number(row.amountTotal), 0);

  if (config.dryRun) {
    for (const direction of SUPPORT_OPPOSE_VALUES) {
      const top = ieRows
        .filter((r) => r.supportOppose === direction)
        .sort((a, b) => Number(b.amountTotal) - Number(a.amountTotal))
        .slice(0, 10);
      for (const row of top) {
        const committee = committeeRows.find(
          (c) => c.committeeId === row.committeeId,
        );
        console.log(
          `${LOG_PREFIX} dry-run top-${direction} spender=${row.committeeId} "${committee?.name}" ` +
            `sponsor="${committee?.connectedOrg ?? "(none filed)"}" sector=${committee?.sector ?? "(unclassified)"} ` +
            `candidate=${row.candidateId} amount=$${Number(row.amountTotal).toLocaleString()}`,
        );
      }
    }
    const topMisses = [...aggregation.unresolvedAmountByFecId.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [fecId, amount] of topMisses) {
      console.log(
        `${LOG_PREFIX} dry-run unresolved-candidate fec_id=${fecId} amount=$${amount.toLocaleString()}`,
      );
    }
  }

  const committeesUpserted = await upsertCommittees(
    db,
    committeeRows,
    config.dryRun,
  );
  const expenditureRowsUpserted = await upsertIndependentExpenditures(
    db,
    ieRows,
    config.dryRun,
  );

  const counts: FederalIeCounts = {
    committeesInMaster: master.size,
    candidatesLoaded: candidateByFecId.size,
    ieRowsScanned,
    ieRowsParsed: parsedRows.length,
    unmappedSupportOpposeRows,
    supersededRowsDropped: aggregation.supersededRowsDropped,
    matchedRows: aggregation.matchedRows,
    unresolvedCandidateRows: aggregation.unresolvedCandidateRows,
    spendersWithExpenditures: spenderIds.size,
    spendersMissingFromMaster,
    supportRows: supportRows.length,
    opposeRows: opposeRows.length,
    supportAmount: sumAmounts(supportRows),
    opposeAmount: sumAmounts(opposeRows),
    committeesUpserted,
    expenditureRowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      `${LOG_PREFIX} complete`,
      `committees_in_master=${counts.committeesInMaster}`,
      `fec_candidate_ids=${counts.candidatesLoaded}`,
      `ie_rows=${counts.ieRowsScanned}`,
      `parsed_rows=${counts.ieRowsParsed}`,
      `unmapped_sup_opp=${counts.unmappedSupportOpposeRows}`,
      `superseded_dropped=${counts.supersededRowsDropped}`,
      `matched_rows=${counts.matchedRows}`,
      `unresolved_candidate_rows=${counts.unresolvedCandidateRows}`,
      `spenders=${counts.spendersWithExpenditures}`,
      `spenders_missing_from_master=${counts.spendersMissingFromMaster}`,
      // Two figures, printed apart — never a single "outside spending" total.
      `support_rows=${counts.supportRows} support_amount=$${counts.supportAmount.toLocaleString()}`,
      `oppose_rows=${counts.opposeRows} oppose_amount=$${counts.opposeAmount.toLocaleString()}`,
      `committees_upserted=${counts.committeesUpserted}${counts.dryRun ? " (dry-run)" : ""}`,
      `ie_rows_upserted=${counts.expenditureRowsUpserted}${counts.dryRun ? " (dry-run)" : ""}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestFederalIndependentExpenditures().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

/**
 * scripts/ingest/federal-sectors-bulk.ts
 *
 * Per-candidate industry-sector donor buckets for FEDERAL candidates from the
 * FEC `indiv` bulk file (every itemized individual contribution, with
 * EMPLOYER/OCCUPATION fields). Replaces the per-candidate
 * `/schedules/schedule_a/by_employer/` API loop in federal-donors.ts that was
 * never run at scale: one streaming pass over indiv + the ccl
 * candidate-committee linkage file, aggregated in memory (bounded at roughly
 * 3k candidates x 14 labels) and upserted into donor_aggregates.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-sectors-bulk.ts --cycle 2026
 *   ... --dry-run
 *   ... --limit 1000000
 *   ... --data-dir /tmp/fec-bulk --skip-download
 *   ... --indiv-zip /tmp/indiv26.zip --ccl-zip /tmp/ccl26.zip
 *
 * Notes:
 * - Scoped to candidates that already have a funding-mix row for the cycle
 *   (loadFederalCandidateMapWithFundingMix): sector buckets are re-cuts of the
 *   funding mix and must never be a candidate's only funding data.
 * - Refunds (transaction types 20Y/21Y/22Y) are DROPPED rather than netted
 *   against the positive contributions, so sector totals are slightly
 *   overstated. Netting refunds is a follow-up.
 * - Earmarked conduit flows: "15E" itemizations (the real donor, with their
 *   real employer) are kept regardless of memo code; the conduit's own lump
 *   rows are excluded by the committee prefilter, the entity-type filter, and
 *   a defensive ACTBLUE/WINRED contributor-name guard.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { requireDb, type DbClient } from "../../db/client";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_SOURCE,
  FUNDING_MIX_BUCKET_LABELS,
  type DonorAggregateRow,
  bulkZipUrl,
  emptyToNull,
  ensureBulkZip,
  loadFederalCandidateMapWithFundingMix,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
  upsertDonorAggregateRows,
} from "./_fec-bulk";
import {
  DONOR_BUCKET_LABELS,
  mapEmployerToBucket,
  type DonorBucketLabel,
} from "./_bucket-mapping";

export type { DonorAggregateRow };

const LOG_PREFIX = "[federal-sectors-bulk]";

const DEFAULT_CYCLE = "2026";

const PROGRESS_LOG_INTERVAL = 5_000_000;

/**
 * Transaction-type whitelist. Excludes by omission:
 * - "15C" candidate self-contributions — already the Self-funded funding-mix
 *   bucket; counting them here would classify the candidate's own employer as
 *   a sector.
 * - refunds "20Y"/"21Y"/"22Y" (dropped, not netted — see header note).
 * - soft money "10"/"11", "24T", and "30"/"31"/"32" convention/headquarters
 *   account receipts.
 */
const KEPT_TRANSACTION_TYPES = new Set(["15", "15E"]);

/**
 * Keep individual itemizations ("IND") plus blank entity types (common in
 * older/poorly coded filings). PAC/ORG/COM entity types are the recipient
 * committee's lump "from ACTBLUE" style rows and are dropped.
 */
const KEPT_ENTITY_TYPES = new Set(["IND", ""]);

/**
 * Defensive guard against mis-filed conduit lumps with ENTITY_TP=IND —
 * prevents "everyone works at ActBlue".
 */
const CONDUIT_NAME_PATTERN = /^(ACTBLUE|WINRED)\b/iu;

/**
 * Non-employer placeholder values (compared case-insensitively after trim).
 * Rows with these employers are counted as skippedNonEmployer — NOT added to
 * "Other" — because they carry no industry signal.
 *
 * Deliberate choices:
 * - "STUDENT" and "HOMEMAKER" are skipped: they are occupations, not
 *   employers, and carry no industry-sector signal.
 * - "SELF-EMPLOYED"/"SELF EMPLOYED" are NOT in this set: mapEmployerToBucket
 *   has an explicit self-employed rule, so those rows must flow through the
 *   mapper (they classify as "Self-funded", which resolveSectorBucket folds
 *   to "Other"). Bare "SELF" is also kept for consistency — it falls through
 *   the mapper to "Other" the same way.
 */
const NON_EMPLOYER_VALUES = new Set([
  "RETIRED",
  "NOT EMPLOYED",
  "UNEMPLOYED",
  "NONE",
  "N/A",
  "NA",
  "INFORMATION REQUESTED",
  "INFORMATION REQUESTED PER BEST EFFORTS",
  "HOMEMAKER",
  "STUDENT",
]);

/**
 * Labels a sector upsert must never emit: the funding-mix totals buckets plus
 * "Self-funded" and "Party committees". A sector row shares the
 * (candidate, cycle, label) unique key with funding-mix rows, so emitting one
 * of these labels would clobber a totals-derived funding-mix row. Anything the
 * employer mapper resolves to one of these is folded to "Other".
 */
const DISALLOWED_OUTPUT_LABELS = new Set<DonorBucketLabel>([
  ...FUNDING_MIX_BUCKET_LABELS,
  "Self-funded",
  "Party committees",
]);

/**
 * The 13 industry-sector labels, derived from the canonical bucket vocabulary
 * rather than hardcoded: everything that is not a funding-mix label,
 * "Self-funded", "Party committees", or "Other".
 */
export const SECTOR_BUCKET_LABELS: DonorBucketLabel[] =
  DONOR_BUCKET_LABELS.filter(
    (label) => label !== "Other" && !DISALLOWED_OUTPUT_LABELS.has(label),
  );

export interface FederalSectorsBulkConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  indivZipPath: string | null;
  cclZipPath: string | null;
  skipDownload: boolean;
}

export interface CclLinkageRow {
  candidateFecId: string;
  committeeId: string;
  committeeDesignation: string | null;
}

export interface IndivContributionRow {
  committeeId: string;
  transactionType: string;
  entityType: string;
  contributorName: string;
  employer: string;
  occupation: string;
  transactionAmount: number;
  memoCode: string | null;
}

export interface SectorAggregate {
  candidateId: string;
  electionCycle: string;
  bucketLabel: DonorBucketLabel;
  amountTotal: number;
  transactionCount: number;
  transactionTypes: Record<string, number>;
}

export interface FederalSectorsBulkCounts {
  candidatesLoaded: number;
  committeesMapped: number;
  linesScanned: number;
  committeeMatchedRows: number;
  keptRows: number;
  skippedNonEmployerRows: number;
  skippedNonEmployerAmount: number;
  aggregateRowsBuilt: number;
  candidatesCovered: number;
  rowsUpserted: number;
  dryRun: boolean;
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalSectorsBulkConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  if (!/^\d{4}$/u.test(cycle)) {
    throw new Error(`Invalid --cycle value: ${cycle}`);
  }

  const dataDir = resolve(
    parseValueFlag(argv, "--data-dir") ??
      env.FEC_BULK_DIR ??
      DEFAULT_FEC_BULK_DIR,
  );
  const indivZipFlag = parseValueFlag(argv, "--indiv-zip");
  const cclZipFlag = parseValueFlag(argv, "--ccl-zip");

  return {
    cycle,
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
    dataDir,
    indivZipPath: indivZipFlag ? resolve(indivZipFlag) : null,
    cclZipPath: cclZipFlag ? resolve(cclZipFlag) : null,
    skipDownload: argv.includes("--skip-download"),
  };
}

/**
 * Parse one ccl (candidate-committee linkage) line. 7 pipe-delimited fields:
 * [0] CAND_ID, [1] CAND_ELECTION_YR, [2] FEC_ELECTION_YR, [3] CMTE_ID,
 * [4] CMTE_TP, [5] CMTE_DSGN, [6] LINKAGE_ID.
 */
export function parseCclLine(line: string): CclLinkageRow | null {
  const fields = line.trimEnd().split("|");
  const candidateFecId = (fields[0] ?? "").trim().toUpperCase();
  const committeeId = (fields[3] ?? "").trim().toUpperCase();
  if (!candidateFecId || !committeeId) return null;

  const designation = emptyToNull(fields[5]);
  return {
    candidateFecId,
    committeeId,
    committeeDesignation: designation ? designation.toUpperCase() : null,
  };
}

/**
 * "P" = principal campaign committee — parity with the API path's
 * designation:"P" filter in federal-donors.ts. "A" (authorized) and "J"
 * (joint fundraiser) linkages are dropped.
 */
export function isPrincipalCampaignCommittee(row: CclLinkageRow): boolean {
  return row.committeeDesignation === "P";
}

/**
 * Parse one indiv (individual contributions) line. 21 pipe-delimited fields:
 * [0] CMTE_ID, [1] AMNDT_IND, [2] RPT_TP, [3] TRANSACTION_PGI,
 * [4] IMAGE_NUM, [5] TRANSACTION_TP, [6] ENTITY_TP, [7] NAME, [8] CITY,
 * [9] STATE, [10] ZIP_CODE, [11] EMPLOYER, [12] OCCUPATION,
 * [13] TRANSACTION_DT, [14] TRANSACTION_AMT, [15] OTHER_ID, [16] TRAN_ID,
 * [17] FILE_NUM, [18] MEMO_CD, [19] MEMO_TEXT, [20] SUB_ID.
 *
 * The amount is parsed but not validated here (it may be NaN/zero/negative);
 * shouldKeepContribution applies the amount filter.
 */
export function parseIndivContributionLine(
  line: string,
): IndivContributionRow | null {
  const fields = line.trimEnd().split("|");
  const committeeId = (fields[0] ?? "").trim().toUpperCase();
  const transactionType = (fields[5] ?? "").trim().toUpperCase();
  if (!committeeId || !transactionType) return null;

  return {
    committeeId,
    transactionType,
    entityType: (fields[6] ?? "").trim().toUpperCase(),
    contributorName: (fields[7] ?? "").trim(),
    employer: (fields[11] ?? "").trim(),
    occupation: (fields[12] ?? "").trim(),
    transactionAmount: Number.parseFloat((fields[14] ?? "").trim()),
    memoCode: emptyToNull(fields[18]),
  };
}

/**
 * The filter truth table (excluding the committee-map prefilter):
 * - TRANSACTION_TP must be "15" or "15E" (see KEPT_TRANSACTION_TYPES).
 * - ENTITY_TP must be "IND" or blank (see KEPT_ENTITY_TYPES).
 * - Memo rule: "15" with MEMO_CD "X" is a reattribution/JFC informational
 *   duplicate — skipped. "15E" (earmarked through a conduit) is KEPT
 *   regardless of memo code: the earmark itemization carries the real donor's
 *   employer, and its conduit parent line is already excluded by the
 *   prefilter/entity filters. This is the earmark double-count fix.
 * - Contributor names starting with ACTBLUE/WINRED are skipped (conduit
 *   lumps mis-filed as individuals).
 * - TRANSACTION_AMT must parse to a finite number > 0.
 */
export function shouldKeepContribution(row: IndivContributionRow): boolean {
  if (!KEPT_TRANSACTION_TYPES.has(row.transactionType)) return false;
  if (!KEPT_ENTITY_TYPES.has(row.entityType)) return false;
  if (row.transactionType === "15" && row.memoCode?.toUpperCase() === "X") {
    return false;
  }
  if (CONDUIT_NAME_PATTERN.test(row.contributorName)) return false;
  if (!Number.isFinite(row.transactionAmount) || row.transactionAmount <= 0) {
    return false;
  }
  return true;
}

/**
 * True when the employer field is empty or a non-employer placeholder
 * (case-insensitive). These rows are counted as skippedNonEmployer rather
 * than bucketed into "Other".
 */
export function isNonEmployerValue(employer: string): boolean {
  const normalized = employer.trim().toUpperCase();
  return !normalized || NON_EMPLOYER_VALUES.has(normalized);
}

/**
 * Map an employer (and occupation, which mapEmployerToBucket currently
 * accepts but ignores) to an allowed sector output label. Unmatched employers
 * and any funding-mix/"Self-funded"/"Party committees" classification fold to
 * "Other" so a sector upsert can never clobber a totals-derived funding-mix
 * row at the same (candidate, cycle, label) unique key.
 */
export function resolveSectorBucket(
  employer: string,
  occupation?: string,
): DonorBucketLabel {
  const bucket = mapEmployerToBucket(employer, occupation);
  if (!bucket || DISALLOWED_OUTPUT_LABELS.has(bucket)) return "Other";
  return bucket;
}

export function aggregateContribution({
  aggregates,
  row,
  candidateId,
  cycle,
  bucket,
}: {
  aggregates: Map<string, SectorAggregate>;
  row: IndivContributionRow;
  candidateId: string;
  cycle: string;
  bucket: DonorBucketLabel;
}): void {
  const key = [candidateId, cycle, bucket].join("|");
  const aggregate =
    aggregates.get(key) ??
    ({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: 0,
      transactionCount: 0,
      transactionTypes: {},
    } satisfies SectorAggregate);

  aggregate.amountTotal += row.transactionAmount;
  aggregate.transactionCount += 1;
  aggregate.transactionTypes[row.transactionType] =
    (aggregate.transactionTypes[row.transactionType] ?? 0) + 1;
  aggregates.set(key, aggregate);
}

export function buildSectorRows(
  aggregates: Map<string, SectorAggregate>,
  sourceUrl: string,
): DonorAggregateRow[] {
  return [...aggregates.values()]
    .filter((aggregate) => aggregate.amountTotal > 0)
    .map((aggregate) => ({
      candidateId: aggregate.candidateId,
      electionCycle: aggregate.electionCycle,
      bucketLabel: aggregate.bucketLabel,
      amountTotal: aggregate.amountTotal.toFixed(2),
      source: FEC_BULK_SOURCE,
      sourceUrl,
      rawMetadata: {
        generator: "federal-sectors-bulk",
        transactionCount: aggregate.transactionCount,
        transactionTypes: aggregate.transactionTypes,
      },
    }))
    .sort((a, b) => {
      const byCandidate = a.candidateId.localeCompare(b.candidateId);
      if (byCandidate !== 0) return byCandidate;
      return a.bucketLabel.localeCompare(b.bucketLabel);
    });
}

/**
 * Stream the ccl file and build Map<CMTE_ID, ourCandidateId>, keeping only
 * principal campaign committees whose candidate is in the funding-mix-scoped
 * candidate map.
 */
async function loadCommitteeCandidateMap(
  cclZipPath: string,
  candidateByFecId: Map<string, string>,
): Promise<Map<string, string>> {
  const committeeToCandidate = new Map<string, string>();
  console.log(`${LOG_PREFIX} streaming ccl ${cclZipPath}`);

  await streamZipLines(
    cclZipPath,
    (line) => {
      const row = parseCclLine(line);
      if (!row || !isPrincipalCampaignCommittee(row)) return;
      const candidateId = candidateByFecId.get(row.candidateFecId);
      if (!candidateId) return;
      if (!committeeToCandidate.has(row.committeeId)) {
        committeeToCandidate.set(row.committeeId, candidateId);
      }
    },
    LOG_PREFIX,
  );

  return committeeToCandidate;
}

async function aggregateIndivRows({
  config,
  indivZipPath,
  committeeToCandidate,
}: {
  config: FederalSectorsBulkConfig;
  indivZipPath: string;
  committeeToCandidate: Map<string, string>;
}): Promise<{
  aggregates: Map<string, SectorAggregate>;
  linesScanned: number;
  committeeMatchedRows: number;
  keptRows: number;
  skippedNonEmployerRows: number;
  skippedNonEmployerAmount: number;
}> {
  const aggregates = new Map<string, SectorAggregate>();
  let linesScanned = 0;
  let committeeMatchedRows = 0;
  let keptRows = 0;
  let skippedNonEmployerRows = 0;
  let skippedNonEmployerAmount = 0;

  console.log(`${LOG_PREFIX} streaming indiv ${indivZipPath}`);
  await streamZipLines(
    indivZipPath,
    (line) => {
      if (config.limit !== null && linesScanned >= config.limit) return false;
      linesScanned += 1;
      if (linesScanned % PROGRESS_LOG_INTERVAL === 0) {
        console.log(
          `${LOG_PREFIX} indiv_lines=${linesScanned.toLocaleString()} matched=${committeeMatchedRows.toLocaleString()} kept=${keptRows.toLocaleString()}`,
        );
      }

      // Cheap prefilter before any full split: the leading CMTE_ID column.
      // Misses (the vast majority of the file — conduit-filed ActBlue/WinRed
      // records and committees outside our candidate scope) skip the parse.
      const pipeIndex = line.indexOf("|");
      if (pipeIndex === -1) return;
      const candidateId = committeeToCandidate.get(line.slice(0, pipeIndex));
      if (!candidateId) return;
      committeeMatchedRows += 1;

      const row = parseIndivContributionLine(line);
      if (!row || !shouldKeepContribution(row)) return;
      keptRows += 1;

      if (isNonEmployerValue(row.employer)) {
        skippedNonEmployerRows += 1;
        skippedNonEmployerAmount += row.transactionAmount;
        return;
      }

      const bucket = resolveSectorBucket(row.employer, row.occupation);
      aggregateContribution({
        aggregates,
        row,
        candidateId,
        cycle: config.cycle,
        bucket,
      });
      return true;
    },
    LOG_PREFIX,
  );

  return {
    aggregates,
    linesScanned,
    committeeMatchedRows,
    keptRows,
    skippedNonEmployerRows,
    skippedNonEmployerAmount,
  };
}

export async function ingestFederalSectorsBulk({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FederalSectorsBulkCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `${LOG_PREFIX} starting cycle=${config.cycle} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  const cclZipPath = await ensureBulkZip({
    cycle: config.cycle,
    prefix: "ccl",
    dataDir: config.dataDir,
    explicitPath: config.cclZipPath,
    skipDownload: config.skipDownload,
    logPrefix: LOG_PREFIX,
  });
  const indivZipPath = await ensureBulkZip({
    cycle: config.cycle,
    prefix: "indiv",
    dataDir: config.dataDir,
    explicitPath: config.indivZipPath,
    skipDownload: config.skipDownload,
    logPrefix: LOG_PREFIX,
  });

  const candidateByFecId = await loadFederalCandidateMapWithFundingMix(
    db,
    config.cycle,
  );
  const committeeToCandidate = await loadCommitteeCandidateMap(
    cclZipPath,
    candidateByFecId,
  );
  console.log(
    `${LOG_PREFIX} fec_candidate_ids=${candidateByFecId.size} principal_committees=${committeeToCandidate.size}`,
  );

  const aggregateResult = await aggregateIndivRows({
    config,
    indivZipPath,
    committeeToCandidate,
  });
  const sourceUrl = bulkZipUrl(config.cycle, "indiv");
  const rows = buildSectorRows(aggregateResult.aggregates, sourceUrl);

  if (config.dryRun) {
    for (const row of rows.slice(0, 20)) {
      console.log(
        `${LOG_PREFIX} dry-run row candidate=${row.candidateId} cycle=${row.electionCycle} bucket="${row.bucketLabel}" amount=$${Number(row.amountTotal).toLocaleString()}`,
      );
    }
    if (rows.length > 20) {
      console.log(
        `${LOG_PREFIX} dry-run omitted ${rows.length - 20} additional rows from preview log`,
      );
    }
  }

  const rowsUpserted = config.dryRun
    ? 0
    : await upsertDonorAggregateRows(db, rows);
  const counts: FederalSectorsBulkCounts = {
    candidatesLoaded: candidateByFecId.size,
    committeesMapped: committeeToCandidate.size,
    linesScanned: aggregateResult.linesScanned,
    committeeMatchedRows: aggregateResult.committeeMatchedRows,
    keptRows: aggregateResult.keptRows,
    skippedNonEmployerRows: aggregateResult.skippedNonEmployerRows,
    skippedNonEmployerAmount: Number(
      aggregateResult.skippedNonEmployerAmount.toFixed(2),
    ),
    aggregateRowsBuilt: rows.length,
    candidatesCovered: new Set(rows.map((row) => row.candidateId)).size,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      `${LOG_PREFIX} complete`,
      `fec_candidate_ids=${counts.candidatesLoaded}`,
      `principal_committees=${counts.committeesMapped}`,
      `lines_scanned=${counts.linesScanned}`,
      `committee_matched_rows=${counts.committeeMatchedRows}`,
      `kept_rows=${counts.keptRows}`,
      `skipped_non_employer_rows=${counts.skippedNonEmployerRows}`,
      `skipped_non_employer_amount=$${counts.skippedNonEmployerAmount.toLocaleString()}`,
      `aggregate_rows=${counts.aggregateRowsBuilt}`,
      `candidates_covered=${counts.candidatesCovered}`,
      `rows_upserted=${counts.rowsUpserted}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestFederalSectorsBulk().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

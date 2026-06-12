/**
 * scripts/ingest/federal-issue-pacs.ts
 *
 * Named issue-PAC ingest from FEC bulk files.
 *
 * Reads the FEC PAS2 file (committee-to-candidate transactions) and committee
 * master file for a cycle, classifies known issue-oriented PACs, and upserts
 * them as dynamic donor_aggregates buckets:
 *
 *   "Issue-aligned PACs — <canonicalIssue>"
 *
 * These rows are a named subset of the existing "PACs" funding-mix bucket.
 * They are for display and alignment context only; the read path must not add
 * them to totalRaised.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-issue-pacs.ts --cycle 2026
 *   ... --dry-run
 *   ... --pas2-zip /tmp/pas226.zip --cm-zip /tmp/cm26.zip
 *
 * FEC formats:
 * - PAS2 columns: https://www.fec.gov/campaign-finance-data/contributions-committees-candidates-file-description/
 * - Committee master columns: https://www.fec.gov/campaign-finance-data/committee-master-file-description/
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_BASE_URL,
  FEC_BULK_SOURCE,
  FUNDING_MIX_BUCKET_LABELS,
  type DonorAggregateRow,
  downloadIfMissing,
  emptyToNull,
  loadFederalCandidateMapWithFundingMix,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
  upsertDonorAggregateRows,
} from "./_fec-bulk";
import {
  classifyPacCommittee,
  ISSUE_PAC_LABEL_PREFIX,
  type IssuePacStance,
} from "./_pac-issue-mapping";

export type { DonorAggregateRow };

const LOG_PREFIX = "[federal-issue-pacs]";

const DEFAULT_CYCLE = "2026";

const DIRECT_CONTRIBUTION_TRANSACTION_TYPES = new Set(["24K", "24P", "24Z"]);

export interface FederalIssuePacConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  pas2ZipPath: string;
  committeeMasterZipPath: string;
  skipDownload: boolean;
}

interface CommitteeInfo {
  committeeId: string;
  name: string;
  designation: string | null;
  type: string | null;
  organizationType: string | null;
  connectedOrganization: string | null;
}

export interface Pas2ContributionRow {
  committeeId: string;
  committeeName: string | null;
  transactionType: string;
  transactionAmount: number;
  candidateFecId: string;
  transactionDate: string | null;
  transactionId: string | null;
  fileNumber: string | null;
  memoCode: string | null;
  subId: string | null;
}

interface CommitteeAggregate {
  name: string;
  stance: IssuePacStance;
  amountTotal: number;
  transactionCount: number;
  ruleNames: Set<string>;
}

export interface IssuePacAggregate {
  candidateId: string;
  electionCycle: string;
  canonicalIssue: string;
  ruleName: string;
  displayName: string;
  fullName?: string;
  advocates?: string;
  stances: Set<IssuePacStance>;
  amountTotal: number;
  transactionCount: number;
  committees: Map<string, CommitteeAggregate>;
}

export interface FederalIssuePacCounts {
  committeesLoaded: number;
  candidatesLoaded: number;
  pas2RowsScanned: number;
  directContributionRows: number;
  matchedCandidateRows: number;
  classifiedRows: number;
  aggregateRowsBuilt: number;
  staleRowsDeleted: number;
  rowsUpserted: number;
  dryRun: boolean;
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalIssuePacConfig {
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  if (!/^\d{4}$/u.test(cycle)) {
    throw new Error(`Invalid --cycle value: ${cycle}`);
  }

  const dataDir = resolve(
    parseValueFlag(argv, "--data-dir") ??
      env.FEC_BULK_DIR ??
      DEFAULT_FEC_BULK_DIR,
  );
  const cycleSuffix = cycle.slice(2);
  const pas2ZipPath = resolve(
    parseValueFlag(argv, "--pas2-zip") ?? `${dataDir}/pas2${cycleSuffix}.zip`,
  );
  const committeeMasterZipPath = resolve(
    parseValueFlag(argv, "--cm-zip") ?? `${dataDir}/cm${cycleSuffix}.zip`,
  );

  return {
    cycle,
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
    dataDir,
    pas2ZipPath,
    committeeMasterZipPath,
    skipDownload: argv.includes("--skip-download"),
  };
}

export function parseCommitteeMasterLine(line: string): CommitteeInfo | null {
  const fields = line.trimEnd().split("|");
  const committeeId = (fields[0] ?? "").trim().toUpperCase();
  const name = (fields[1] ?? "").trim();
  if (!committeeId || !name) return null;

  return {
    committeeId,
    name,
    designation: emptyToNull(fields[8]),
    type: emptyToNull(fields[9]),
    organizationType: emptyToNull(fields[12]),
    connectedOrganization: emptyToNull(fields[13]),
  };
}

export function parsePas2ContributionLine(
  line: string,
): Pas2ContributionRow | null {
  const fields = line.trimEnd().split("|");
  const committeeId = (fields[0] ?? "").trim().toUpperCase();
  const transactionType = (fields[5] ?? "").trim().toUpperCase();
  const amount = Number.parseFloat((fields[14] ?? "").trim());
  const candidateFecId = (fields[16] ?? "").trim().toUpperCase();
  if (!committeeId || !transactionType || !candidateFecId) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    committeeId,
    committeeName: emptyToNull(fields[7]),
    transactionType,
    transactionAmount: amount,
    candidateFecId,
    transactionDate: emptyToNull(fields[13]),
    transactionId: emptyToNull(fields[17]),
    fileNumber: emptyToNull(fields[18]),
    memoCode: emptyToNull(fields[19]),
    subId: emptyToNull(fields[21]),
  };
}

export function isDirectPacContribution(row: Pas2ContributionRow): boolean {
  return DIRECT_CONTRIBUTION_TRANSACTION_TYPES.has(row.transactionType);
}

export function aggregateIssuePacContribution({
  aggregates,
  row,
  committee,
  candidateId,
  cycle,
}: {
  aggregates: Map<string, IssuePacAggregate>;
  row: Pas2ContributionRow;
  committee: CommitteeInfo | null;
  candidateId: string;
  cycle: string;
}): boolean {
  const committeeName = committee?.name ?? row.committeeName ?? "";
  const classification = classifyPacCommittee(row.committeeId, committeeName);
  if (!classification) return false;

  const aggregateKey = [
    candidateId,
    cycle,
    classification.canonicalIssue,
    classification.ruleName,
  ].join("|");
  const aggregate =
    aggregates.get(aggregateKey) ??
    ({
      candidateId,
      electionCycle: cycle,
      canonicalIssue: classification.canonicalIssue,
      ruleName: classification.ruleName,
      displayName: classification.displayName,
      ...(classification.fullName ? { fullName: classification.fullName } : {}),
      ...(classification.advocates
        ? { advocates: classification.advocates }
        : {}),
      stances: new Set<IssuePacStance>(),
      amountTotal: 0,
      transactionCount: 0,
      committees: new Map(),
    } satisfies IssuePacAggregate);

  aggregate.stances.add(classification.stance);
  aggregate.amountTotal += row.transactionAmount;
  aggregate.transactionCount += 1;

  const committeeAggregate: CommitteeAggregate = aggregate.committees.get(
    row.committeeId,
  ) ?? {
    name: committeeName || row.committeeId,
    stance: classification.stance,
    amountTotal: 0,
    transactionCount: 0,
    ruleNames: new Set<string>(),
  };
  committeeAggregate.amountTotal += row.transactionAmount;
  committeeAggregate.transactionCount += 1;
  committeeAggregate.ruleNames.add(classification.ruleName);
  aggregate.committees.set(row.committeeId, committeeAggregate);
  aggregates.set(aggregateKey, aggregate);
  return true;
}

export function buildIssuePacRows(
  aggregates: Map<string, IssuePacAggregate>,
  sourceUrl: string,
): DonorAggregateRow[] {
  return [...aggregates.values()]
    .filter((aggregate) => aggregate.amountTotal > 0)
    .map((aggregate) => ({
      candidateId: aggregate.candidateId,
      electionCycle: aggregate.electionCycle,
      // Format: "Issue-aligned PACs — <canonicalIssue> — <ruleName>"
      // Still satisfies IssuePacLabel (starts with prefix) and LIKE filter.
      bucketLabel: `${ISSUE_PAC_LABEL_PREFIX}${aggregate.canonicalIssue} — ${aggregate.ruleName}`,
      amountTotal: aggregate.amountTotal.toFixed(2),
      source: FEC_BULK_SOURCE,
      sourceUrl,
      rawMetadata: {
        issuePac: {
          canonicalIssue: aggregate.canonicalIssue,
          ruleName: aggregate.ruleName,
          displayName: aggregate.displayName,
          ...(aggregate.fullName ? { fullName: aggregate.fullName } : {}),
          ...(aggregate.advocates ? { advocates: aggregate.advocates } : {}),
          stance: aggregateStance(aggregate),
        },
        transactionCount: aggregate.transactionCount,
        committees: [...aggregate.committees.entries()]
          .map(([committeeId, committee]) => ({
            committeeId,
            name: committee.name,
            stance: committee.stance,
            amountTotal: Number(committee.amountTotal.toFixed(2)),
            transactionCount: committee.transactionCount,
            ruleNames: [...committee.ruleNames].sort(),
          }))
          .sort((a, b) => b.amountTotal - a.amountTotal),
      },
    }))
    .sort((a, b) => {
      const byCandidate = a.candidateId.localeCompare(b.candidateId);
      if (byCandidate !== 0) return byCandidate;
      return a.bucketLabel.localeCompare(b.bucketLabel);
    });
}

function aggregateStance(aggregate: IssuePacAggregate): IssuePacStance {
  const stances = [...aggregate.stances];
  return stances.length === 1 ? stances[0]! : "mixed";
}

async function ensureBulkZipFiles(
  config: FederalIssuePacConfig,
): Promise<void> {
  if (config.skipDownload) return;

  await mkdir(config.dataDir, { recursive: true });
  const suffix = config.cycle.slice(2);
  await downloadIfMissing(
    `${FEC_BULK_BASE_URL}/${config.cycle}/pas2${suffix}.zip`,
    config.pas2ZipPath,
    LOG_PREFIX,
  );
  await downloadIfMissing(
    `${FEC_BULK_BASE_URL}/${config.cycle}/cm${suffix}.zip`,
    config.committeeMasterZipPath,
    LOG_PREFIX,
  );
}

async function loadCommitteeMaster(
  zipPath: string,
): Promise<Map<string, CommitteeInfo>> {
  const committees = new Map<string, CommitteeInfo>();
  console.log(`[federal-issue-pacs] streaming committee master ${zipPath}`);

  await streamZipLines(
    zipPath,
    (line) => {
      const committee = parseCommitteeMasterLine(line);
      if (!committee) return;
      committees.set(committee.committeeId, committee);
    },
    LOG_PREFIX,
  );

  return committees;
}

async function deleteIssuePacRowsWithoutFundingMix(
  db: DbClient,
  cycle: string,
): Promise<number> {
  const fundingMixBucketList = sql.join(
    FUNDING_MIX_BUCKET_LABELS.map((label) => sql`${label}`),
    sql`, `,
  );
  const result = await db.execute(sql`
    DELETE FROM donor_aggregates issue_pac
    WHERE issue_pac.election_cycle = ${cycle}
      AND issue_pac.bucket_label LIKE 'Issue-aligned PACs — %'
      AND NOT EXISTS (
        SELECT 1 FROM donor_aggregates funding_mix
        WHERE funding_mix.candidate_id = issue_pac.candidate_id
          AND funding_mix.election_cycle = issue_pac.election_cycle
          AND funding_mix.bucket_label IN (${fundingMixBucketList})
      )
    RETURNING issue_pac.id
  `);
  return result.rows.length;
}

async function aggregatePas2Rows({
  config,
  committees,
  candidateByFecId,
}: {
  config: FederalIssuePacConfig;
  committees: Map<string, CommitteeInfo>;
  candidateByFecId: Map<string, string>;
}): Promise<{
  aggregates: Map<string, IssuePacAggregate>;
  pas2RowsScanned: number;
  directContributionRows: number;
  matchedCandidateRows: number;
  classifiedRows: number;
}> {
  const aggregates = new Map<string, IssuePacAggregate>();
  let pas2RowsScanned = 0;
  let directContributionRows = 0;
  let matchedCandidateRows = 0;
  let classifiedRows = 0;

  console.log(`[federal-issue-pacs] streaming PAS2 ${config.pas2ZipPath}`);
  await streamZipLines(
    config.pas2ZipPath,
    (line) => {
      if (config.limit !== null && pas2RowsScanned >= config.limit)
        return false;
      pas2RowsScanned += 1;
      if (pas2RowsScanned % 500_000 === 0) {
        console.log(
          `[federal-issue-pacs] pas2_rows=${pas2RowsScanned.toLocaleString()} classified=${classifiedRows}`,
        );
      }

      const row = parsePas2ContributionLine(line);
      if (!row) return;
      if (!isDirectPacContribution(row)) return;
      directContributionRows += 1;

      const candidateId = candidateByFecId.get(row.candidateFecId);
      if (!candidateId) return;
      matchedCandidateRows += 1;

      const committee = committees.get(row.committeeId) ?? null;
      const classified = aggregateIssuePacContribution({
        aggregates,
        row,
        committee,
        candidateId,
        cycle: config.cycle,
      });
      if (classified) classifiedRows += 1;
      return true;
    },
    LOG_PREFIX,
  );

  return {
    aggregates,
    pas2RowsScanned,
    directContributionRows,
    matchedCandidateRows,
    classifiedRows,
  };
}

export async function ingestFederalIssuePacs({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FederalIssuePacCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `[federal-issue-pacs] starting cycle=${config.cycle} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  await ensureBulkZipFiles(config);
  const committees = await loadCommitteeMaster(config.committeeMasterZipPath);
  const candidateByFecId = await loadFederalCandidateMapWithFundingMix(
    db,
    config.cycle,
  );

  const aggregateResult = await aggregatePas2Rows({
    config,
    committees,
    candidateByFecId,
  });
  const sourceUrl = `${FEC_BULK_BASE_URL}/${config.cycle}/pas2${config.cycle.slice(2)}.zip`;
  const rows = buildIssuePacRows(aggregateResult.aggregates, sourceUrl);

  if (config.dryRun) {
    for (const row of rows.slice(0, 20)) {
      console.log(
        `[federal-issue-pacs] dry-run row candidate=${row.candidateId} cycle=${row.electionCycle} bucket="${row.bucketLabel}" amount=$${Number(row.amountTotal).toLocaleString()}`,
      );
    }
    if (rows.length > 20) {
      console.log(
        `[federal-issue-pacs] dry-run omitted ${rows.length - 20} additional rows from preview log`,
      );
    }
  }

  const staleRowsDeleted = config.dryRun
    ? 0
    : await deleteIssuePacRowsWithoutFundingMix(db, config.cycle);
  if (staleRowsDeleted > 0) {
    console.log(
      `[federal-issue-pacs] deleted stale issue-PAC rows without funding mix=${staleRowsDeleted}`,
    );
  }

  const rowsUpserted = config.dryRun
    ? 0
    : await upsertDonorAggregateRows(db, rows);
  const counts: FederalIssuePacCounts = {
    committeesLoaded: committees.size,
    candidatesLoaded: candidateByFecId.size,
    pas2RowsScanned: aggregateResult.pas2RowsScanned,
    directContributionRows: aggregateResult.directContributionRows,
    matchedCandidateRows: aggregateResult.matchedCandidateRows,
    classifiedRows: aggregateResult.classifiedRows,
    aggregateRowsBuilt: rows.length,
    staleRowsDeleted,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[federal-issue-pacs] complete",
      `committees=${counts.committeesLoaded}`,
      `fec_candidate_ids=${counts.candidatesLoaded}`,
      `pas2_rows=${counts.pas2RowsScanned}`,
      `direct_rows=${counts.directContributionRows}`,
      `matched_candidate_rows=${counts.matchedCandidateRows}`,
      `classified_rows=${counts.classifiedRows}`,
      `aggregate_rows=${counts.aggregateRowsBuilt}`,
      `stale_rows_deleted=${counts.staleRowsDeleted}`,
      `rows_upserted=${counts.rowsUpserted}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestFederalIssuePacs().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

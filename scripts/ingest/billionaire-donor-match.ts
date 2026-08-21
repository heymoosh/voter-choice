/**
 * scripts/ingest/billionaire-donor-match.ts
 *
 * Matches itemized individual FEC contributions (Schedule A / the `indiv`
 * bulk file) against BILLIONAIRE_SEED (scripts/ingest/_billionaire-seed.ts),
 * for both:
 *   - direct contributions to a candidate's own principal campaign committee
 *     (committeeType='candidate', capped ~$3,300/cycle by law), and
 *   - contributions to a Super PAC / outside-spending committee
 *     (committeeType='pac') — scoped to committees that already have an
 *     independent_expenditures row this cycle (Part 6b), so we only look at
 *     PACs actually spending on races we track. Which candidates a matched
 *     PAC spent FOR/AGAINST is NOT computed here — it's already in
 *     independent_expenditures, joined on committeeId at read time. This
 *     script never attributes one donor's dollars to a specific race a PAC
 *     later spent on; see the table header in db/schema.ts.
 *
 * One streaming pass over `indiv`, reusing the parsing/filtering already
 * proven in federal-sectors-bulk.ts (parseIndivContributionLine,
 * shouldKeepContribution) rather than re-implementing them. A name match
 * against the seed list is required; the employer field only adjusts
 * confidence (high/medium/low) — it can never turn a match into a non-match,
 * and a low-confidence near-miss is still recorded, never silently dropped.
 * See _billionaire-seed.ts's module header for the full matching rationale.
 *
 * Usage — --dry-run FIRST, always:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/billionaire-donor-match.ts --cycle 2026 --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/billionaire-donor-match.ts --cycle 2026
 *   Flags: --limit N (indiv lines), --data-dir, --indiv-zip, --ccl-zip,
 *          --skip-download, --dry-run
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import {
  billionaireDonorContributions,
  independentExpenditures,
} from "../../db/schema";
import {
  BILLIONAIRE_SEED,
  buildBillionaireIndex,
  matchBillionaire,
  scoreMatchConfidence,
  type BillionaireIndex,
  type MatchConfidence,
} from "./_billionaire-seed";
import {
  isPrincipalCampaignCommittee,
  parseCclLine,
  parseIndivContributionLine,
  shouldKeepContribution,
} from "./federal-sectors-bulk";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_SOURCE,
  UPSERT_CHUNK_SIZE,
  bulkZipUrl,
  ensureBulkZip,
  isoDateFromParts,
  loadFederalCandidateMap,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
} from "./_fec-bulk";

export type { MatchConfidence };

const LOG_PREFIX = "[billionaire-donor-match]";

const DEFAULT_CYCLE = "2026";

const PROGRESS_LOG_INTERVAL = 5_000_000;

export interface BillionaireDonorMatchConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  indivZipPath: string | null;
  cclZipPath: string | null;
  skipDownload: boolean;
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): BillionaireDonorMatchConfig {
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
 * MMDDYYYY (FEC TRANSACTION_DT) -> "YYYY-MM-DD", or null if unparseable OR
 * not a real calendar date. The calendar validation lives in
 * `isoDateFromParts` (_fec-bulk.ts) because the candidate-summary ingest
 * needs the identical check on a different wire format; its docblock explains
 * why a month/day range check alone is not enough.
 */
export function parseFecDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d{8}$/u.test(trimmed)) return null;
  return isoDateFromParts(
    Number(trimmed.slice(4, 8)),
    Number(trimmed.slice(0, 2)),
    Number(trimmed.slice(2, 4)),
  );
}

export type CommitteeType = "candidate" | "pac";

export interface MatchedCommittee {
  type: CommitteeType;
  candidateId: string | null;
}

/**
 * Stream the ccl file and build Map<CMTE_ID, candidateId> for principal
 * campaign committees whose candidate we track (unscoped — see
 * loadFederalCandidateMap).
 */
export async function loadCandidateCommitteeMap(
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

/** Committees with at least one independent_expenditures row this cycle. */
export async function loadActivePacCommitteeIds(
  db: DbClient,
  cycle: string,
): Promise<Set<string>> {
  const rows = (await db
    .selectDistinct({ committeeId: independentExpenditures.committeeId })
    .from(independentExpenditures)
    .where(sql`${independentExpenditures.electionCycle} = ${cycle}`)) as {
    committeeId: string;
  }[];
  return new Set(rows.map((r) => r.committeeId));
}

/** Resolve which of the two tracked committee sets a CMTE_ID belongs to. */
export function resolveCommittee(
  committeeId: string,
  candidateCommittees: Map<string, string>,
  pacCommittees: Set<string>,
): MatchedCommittee | null {
  const candidateId = candidateCommittees.get(committeeId);
  if (candidateId) return { type: "candidate", candidateId };
  if (pacCommittees.has(committeeId)) return { type: "pac", candidateId: null };
  return null;
}

export interface MatchedContributionRow {
  billionaireKey: string;
  billionaireName: string;
  committeeId: string;
  committeeType: CommitteeType;
  candidateId: string | null;
  electionCycle: string;
  amount: string;
  contributionDate: string | null;
  donorNameRaw: string;
  donorCity: string | null;
  donorState: string | null;
  donorEmployer: string | null;
  donorOccupation: string | null;
  matchConfidence: MatchConfidence;
  matchSignals: string;
  fecSubId: string;
  source: string;
  sourceUrl: string;
}

export interface MatchScanResult {
  rows: MatchedContributionRow[];
  linesScanned: number;
  committeeMatchedRows: number;
  keptRows: number;
  nameMatchedRows: number;
}

async function scanIndivForMatches({
  indivZipPath,
  candidateCommittees,
  pacCommittees,
  billionaireIndex,
  cycle,
  sourceUrl,
  limit,
}: {
  indivZipPath: string;
  candidateCommittees: Map<string, string>;
  pacCommittees: Set<string>;
  billionaireIndex: BillionaireIndex;
  cycle: string;
  sourceUrl: string;
  limit: number | null;
}): Promise<MatchScanResult> {
  const rows: MatchedContributionRow[] = [];
  const seenSubIds = new Set<string>();
  let linesScanned = 0;
  let committeeMatchedRows = 0;
  let keptRows = 0;
  let nameMatchedRows = 0;

  console.log(`${LOG_PREFIX} streaming indiv ${indivZipPath}`);
  await streamZipLines(
    indivZipPath,
    (line) => {
      if (limit !== null && linesScanned >= limit) return false;
      linesScanned += 1;
      if (linesScanned % PROGRESS_LOG_INTERVAL === 0) {
        console.log(
          `${LOG_PREFIX} indiv_lines=${linesScanned.toLocaleString()} committee_matched=${committeeMatchedRows.toLocaleString()} name_matched=${nameMatchedRows.toLocaleString()}`,
        );
      }

      const pipeIndex = line.indexOf("|");
      if (pipeIndex === -1) return;
      const committee = resolveCommittee(
        line.slice(0, pipeIndex),
        candidateCommittees,
        pacCommittees,
      );
      if (!committee) return;
      committeeMatchedRows += 1;

      const row = parseIndivContributionLine(line);
      if (!row || !shouldKeepContribution(row)) return;
      keptRows += 1;

      const billionaires = matchBillionaire(
        billionaireIndex,
        row.contributorName,
      );
      if (billionaires.length === 0) return;
      nameMatchedRows += 1;

      if (!row.subId || seenSubIds.has(row.subId)) return;
      seenSubIds.add(row.subId);

      for (const billionaire of billionaires) {
        const { confidence, signals } = scoreMatchConfidence(
          billionaire,
          row.employer,
        );
        rows.push({
          billionaireKey: billionaire.key,
          billionaireName: billionaire.name,
          committeeId: line.slice(0, pipeIndex),
          committeeType: committee.type,
          candidateId: committee.candidateId,
          electionCycle: cycle,
          amount: row.transactionAmount.toFixed(2),
          contributionDate: parseFecDate(row.transactionDate),
          donorNameRaw: row.contributorName,
          donorCity: row.city || null,
          donorState: row.state || null,
          donorEmployer: row.employer || null,
          donorOccupation: row.occupation || null,
          matchConfidence: confidence,
          matchSignals: signals,
          fecSubId: row.subId,
          source: FEC_BULK_SOURCE,
          sourceUrl,
        });
      }
      return true;
    },
    LOG_PREFIX,
  );

  return {
    rows,
    linesScanned,
    committeeMatchedRows,
    keptRows,
    nameMatchedRows,
  };
}

export async function upsertBillionaireDonorRows(
  db: DbClient,
  rows: MatchedContributionRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await db
      .insert(billionaireDonorContributions)
      .values(chunk)
      .onConflictDoUpdate({
        target: [billionaireDonorContributions.fecSubId],
        set: {
          amount: sql`excluded.amount`,
          matchConfidence: sql`excluded.match_confidence`,
          matchSignals: sql`excluded.match_signals`,
        },
      });
    total += chunk.length;
  }
  return total;
}

export interface BillionaireDonorMatchCounts {
  billionairesInSeed: number;
  candidatesLoaded: number;
  candidateCommittees: number;
  activePacCommittees: number;
  linesScanned: number;
  committeeMatchedRows: number;
  keptRows: number;
  nameMatchedRows: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  rowsUpserted: number;
  dryRun: boolean;
}

export async function ingestBillionaireDonorMatch({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<BillionaireDonorMatchCounts> {
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

  const candidateByFecId = await loadFederalCandidateMap(db);
  const candidateCommittees = await loadCandidateCommitteeMap(
    cclZipPath,
    candidateByFecId,
  );
  const activePacCommittees = await loadActivePacCommitteeIds(db, config.cycle);
  console.log(
    `${LOG_PREFIX} candidates=${candidateByFecId.size} candidate_committees=${candidateCommittees.size} active_pac_committees=${activePacCommittees.size}`,
  );

  const billionaireIndex = buildBillionaireIndex();
  const sourceUrl = bulkZipUrl(config.cycle, "indiv");
  const scan = await scanIndivForMatches({
    indivZipPath,
    candidateCommittees,
    pacCommittees: activePacCommittees,
    billionaireIndex,
    cycle: config.cycle,
    sourceUrl,
    limit: config.limit,
  });

  if (config.dryRun || scan.rows.length > 0) {
    for (const row of scan.rows.slice(0, 50)) {
      console.log(
        `${LOG_PREFIX} match billionaire="${row.billionaireName}" confidence=${row.matchConfidence} ` +
          `committee=${row.committeeId} (${row.committeeType}) candidate=${row.candidateId ?? "(n/a — pac)"} ` +
          `amount=$${Number(row.amount).toLocaleString()} donor="${row.donorNameRaw}" employer="${row.donorEmployer ?? ""}"`,
      );
    }
    if (scan.rows.length > 50) {
      console.log(
        `${LOG_PREFIX} ...and ${scan.rows.length - 50} more matches (see DB after a non-dry-run)`,
      );
    }
  }

  const rowsUpserted = config.dryRun
    ? 0
    : await upsertBillionaireDonorRows(db, scan.rows);

  const counts: BillionaireDonorMatchCounts = {
    billionairesInSeed: BILLIONAIRE_SEED.length,
    candidatesLoaded: candidateByFecId.size,
    candidateCommittees: candidateCommittees.size,
    activePacCommittees: activePacCommittees.size,
    linesScanned: scan.linesScanned,
    committeeMatchedRows: scan.committeeMatchedRows,
    keptRows: scan.keptRows,
    nameMatchedRows: scan.nameMatchedRows,
    highConfidence: scan.rows.filter((r) => r.matchConfidence === "high")
      .length,
    mediumConfidence: scan.rows.filter((r) => r.matchConfidence === "medium")
      .length,
    lowConfidence: scan.rows.filter((r) => r.matchConfidence === "low").length,
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      `${LOG_PREFIX} complete`,
      `billionaires_in_seed=${counts.billionairesInSeed}`,
      `fec_candidate_ids=${counts.candidatesLoaded}`,
      `candidate_committees=${counts.candidateCommittees}`,
      `active_pac_committees=${counts.activePacCommittees}`,
      `lines_scanned=${counts.linesScanned}`,
      `committee_matched_rows=${counts.committeeMatchedRows}`,
      `kept_rows=${counts.keptRows}`,
      `name_matched_rows=${counts.nameMatchedRows}`,
      `high=${counts.highConfidence} medium=${counts.mediumConfidence} low=${counts.lowConfidence}`,
      `rows_upserted=${counts.rowsUpserted}${counts.dryRun ? " (dry-run)" : ""}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestBillionaireDonorMatch().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

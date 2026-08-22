/**
 * scripts/ingest/federal-pac-sponsors.ts
 *
 * Part 6a — PAC money attributed to sponsor + industry.
 *
 * Reads the FEC PAS2 file (committee-to-candidate transactions) and committee
 * master file for a cycle and populates the two Part 6a tables (migration
 * 0022):
 *
 *   pac_committees              — every committee that gave directly to one
 *                                 of our funding-mix candidates: name,
 *                                 declared sponsor (CONNECTED_ORG — a filing,
 *                                 i.e. evidence), our sector inference with
 *                                 provenance + status, and the fec.gov
 *                                 evidence link.
 *   pac_candidate_contributions — per committee × candidate × cycle totals of
 *                                 DIRECT contributions (24K/24P/24Z only, the
 *                                 same money already inside the "PACs"
 *                                 funding-mix bucket).
 *
 * This is the honest answer to "which corporations support this candidate":
 * corporate-sponsored-PAC money attributed to the sponsor. It is a named
 * breakdown of an existing bucket — read paths must NEVER add these amounts
 * to totalRaised or any funding-mix total (double-count).
 *
 * SECTOR CLASSIFICATION (the one inference; everything else is verbatim FEC):
 *   1. CONNECTED_ORG keyword match against the shared donor-bucket vocabulary
 *      (scripts/ingest/_bucket-mapping.ts — one vocabulary for individual-
 *      employer sectors and PAC-sponsor sectors, per the plan).
 *   2. ORG_TP = "L" (the committee's own "labor organization" declaration):
 *      committee NAME keywords pick between the union/education buckets;
 *      otherwise defaults to "Trade unions (non-public-safety)".
 *   3. Anything else: sector NULL — honestly unclassified, never guessed.
 *      Committee-NAME keyword matching for corporate PACs is deliberately NOT
 *      done (an ideological PAC named "Americans for Energy Independence" is
 *      not the energy industry) — the plan classifies by CONNECTED_ORG +
 *      ORG_TP only.
 *   Every inference records `classification_method`; rows a human marks
 *   'verified'/'rejected' are never reclassified by re-runs (status guard in
 *   the upsert).
 *
 * Idempotent: pac_committees upserts on the FEC committee id;
 * pac_candidate_contributions upserts on (committee, candidate, cycle) so
 * re-runs replace recomputed totals. Kill and restart freely.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-pac-sponsors.ts --cycle 2026 --dry-run
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/federal-pac-sponsors.ts --cycle 2026
 *   Flags: --limit N (pas2 rows), --data-dir, --pas2-zip, --cm-zip,
 *          --skip-download, --dry-run
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { pacCandidateContributions, pacCommittees } from "../../db/schema";
import { classifyPacSponsor } from "../../src/lib/pacSponsorClass";
import {
  DEFAULT_FEC_BULK_DIR,
  FEC_BULK_BASE_URL,
  FEC_BULK_SOURCE,
  UPSERT_CHUNK_SIZE,
  downloadIfMissing,
  loadFederalCandidateMap,
  parsePositiveInteger,
  parseValueFlag,
  streamZipLines,
} from "./_fec-bulk";
import {
  isDirectPacContribution,
  parseCommitteeMasterLine,
  parsePas2ContributionLine,
} from "./federal-issue-pacs";
import { mapEmployerToBucket, type DonorBucketLabel } from "./_bucket-mapping";

const LOG_PREFIX = "[federal-pac-sponsors]";

const DEFAULT_CYCLE = "2026";

/**
 * Buckets a PAC sponsor may classify into. Deliberately excludes the
 * non-industry buckets: "Self-funded", the individual-donor buckets, "PACs"
 * itself, "Other", and "Party committees" (party money is already its own
 * funding-mix bucket — classifying a party-connected committee here would
 * double-represent it).
 */
export const SPONSOR_SECTOR_ALLOWLIST: ReadonlySet<DonorBucketLabel> = new Set([
  "Real estate & development",
  "Oil, gas & energy",
  "Healthcare industry",
  "Pharmaceutical & medical device",
  "Finance, banking & insurance",
  "Technology",
  "Legal industry",
  "Agriculture",
  "Telecom & utilities",
  "Retail & hospitality",
  "Trade unions (non-public-safety)",
  "Public safety unions",
  "Education employees",
] as DonorBucketLabel[]);

const LABOR_NAME_BUCKETS: ReadonlySet<DonorBucketLabel> = new Set([
  "Trade unions (non-public-safety)",
  "Public safety unions",
  "Education employees",
] as DonorBucketLabel[]);

export interface SponsorClassification {
  sector: DonorBucketLabel | null;
  /** Provenance recorded on the row; null when unclassified. */
  method: string | null;
}

/**
 * The one inference this ingest makes. See the module header for the rules;
 * anything not confidently classifiable stays NULL (never guessed).
 */
export function classifySponsorSector(committee: {
  name: string;
  organizationType: string | null;
  connectedOrganization: string | null;
}): SponsorClassification {
  if (committee.connectedOrganization) {
    const sector = mapEmployerToBucket(committee.connectedOrganization);
    if (sector && SPONSOR_SECTOR_ALLOWLIST.has(sector)) {
      return { sector, method: "connected-org-keyword-v1" };
    }
  }

  if ((committee.organizationType ?? "").toUpperCase() === "L") {
    const byName = mapEmployerToBucket(committee.name);
    if (byName && LABOR_NAME_BUCKETS.has(byName)) {
      return { sector: byName, method: "org-type-labor-name-keyword-v1" };
    }
    // The committee's own filing says "labor organization"; the generic
    // union bucket is the filing's claim, not a keyword guess.
    return {
      sector: "Trade unions (non-public-safety)",
      method: "org-type-labor-default-v1",
    };
  }

  return { sector: null, method: null };
}

/** The fec.gov page where the CONNECTED_ORG filing is visible. */
export function evidenceUrlForCommittee(committeeId: string): string {
  return `https://www.fec.gov/data/committee/${committeeId}/`;
}

/** FEC CMTE_TP codes for candidate committees (House/Senate/Presidential). */
const CANDIDATE_COMMITTEE_TYPES = new Set(["H", "S", "P"]);
/** FEC CMTE_TP codes for party committees. */
const PARTY_COMMITTEE_TYPES = new Set(["X", "Y", "Z"]);
/**
 * FEC CMTE_DSGN codes excluded from PAC attribution: A (authorized by a
 * candidate), P (principal campaign committee), J (joint fundraising —
 * "Victory Fund" transfer vehicles).
 */
const NON_PAC_DESIGNATIONS = new Set(["A", "P", "J"]);

/**
 * Whether a committee is genuinely a PAC for attribution purposes — decided
 * from the committee's OWN filed type/designation codes, not inference.
 * Excludes (2026-08-13 first dry-run lesson: the top "PAC contributions"
 * were candidate-to-candidate transfers and the NRSC):
 *   - candidate committees (CMTE_TP H/S/P) — a House campaign transferring
 *     to the same person's Senate campaign is not PAC support;
 *   - party committees (CMTE_TP X/Y/Z) — party money is already its own
 *     funding-mix bucket (double-representation);
 *   - authorized / principal / joint-fundraising designations (A/P/J) —
 *     the candidate's own or shared fundraising vehicles.
 *   - committees absent from the committee master — we cannot verify what
 *     they are, and precision beats recall here (logged, not stored).
 * What remains — corporate, labor, trade, membership, and leadership PACs —
 * is the money this table exists to name.
 */
export function isAttributablePacCommittee(
  info: {
    type: string | null;
    designation: string | null;
  } | null,
): boolean {
  if (!info) return false;
  const type = (info.type ?? "").trim().toUpperCase();
  const designation = (info.designation ?? "").trim().toUpperCase();
  if (CANDIDATE_COMMITTEE_TYPES.has(type)) return false;
  if (PARTY_COMMITTEE_TYPES.has(type)) return false;
  if (NON_PAC_DESIGNATIONS.has(designation)) return false;
  return true;
}

/**
 * FEC files carry literal placeholder strings in CONNECTED_ORG ("NONE",
 * "N/A"); normalize them to null so the table never displays a sponsor
 * called "NONE".
 */
export function normalizeConnectedOrg(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "NONE" || upper === "N/A" || upper === "NA") return null;
  return trimmed;
}

// ---------------------------------------------------------------------------
// Aggregation (pure)
// ---------------------------------------------------------------------------

export interface CommitteeRowToUpsert {
  committeeId: string;
  name: string;
  designation: string | null;
  committeeType: string | null;
  orgType: string | null;
  connectedOrg: string | null;
  sector: string | null;
  classificationMethod: string | null;
  evidenceUrl: string;
  lastSeenCycle: string;
}

export interface ContributionRowToUpsert {
  committeeId: string;
  candidateId: string;
  electionCycle: string;
  amountTotal: string;
  transactionCount: number;
  source: string;
  sourceUrl: string;
}

/**
 * Build the pac_committees row for a committee-master entry: normalize the
 * declared sponsor, run the one inference, attach the evidence link. Shared
 * with the Part 6b independent-expenditure ingest, which attributes its
 * spenders through the same table (never a second committee identity store).
 */
export function buildCommitteeRow(
  info: {
    committeeId: string;
    name: string;
    designation: string | null;
    type: string | null;
    organizationType: string | null;
    connectedOrganization: string | null;
  },
  cycle: string,
): CommitteeRowToUpsert {
  const connectedOrg = normalizeConnectedOrg(info.connectedOrganization);
  const classification = classifySponsorSector({
    name: info.name,
    organizationType: info.organizationType,
    connectedOrganization: connectedOrg,
  });
  return {
    committeeId: info.committeeId,
    name: info.name,
    designation: info.designation,
    committeeType: info.type,
    orgType: info.organizationType,
    connectedOrg,
    sector: classification.sector,
    classificationMethod: classification.method,
    evidenceUrl: evidenceUrlForCommittee(info.committeeId),
    lastSeenCycle: cycle,
  };
}

export interface PairAggregate {
  committeeId: string;
  candidateId: string;
  amountTotal: number;
  transactionCount: number;
}

export function pairKey(committeeId: string, candidateId: string): string {
  return `${committeeId}|${candidateId}`;
}

export function buildContributionRows(
  pairs: Map<string, PairAggregate>,
  cycle: string,
  sourceUrl: string,
): ContributionRowToUpsert[] {
  return [...pairs.values()]
    .filter((p) => p.amountTotal > 0)
    .map((p) => ({
      committeeId: p.committeeId,
      candidateId: p.candidateId,
      electionCycle: cycle,
      amountTotal: p.amountTotal.toFixed(2),
      transactionCount: p.transactionCount,
      source: FEC_BULK_SOURCE,
      sourceUrl,
    }))
    .sort(
      (a, b) =>
        a.committeeId.localeCompare(b.committeeId) ||
        a.candidateId.localeCompare(b.candidateId),
    );
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface FederalPacSponsorsConfig {
  cycle: string;
  dryRun: boolean;
  limit: number | null;
  dataDir: string;
  pas2ZipPath: string;
  committeeMasterZipPath: string;
  skipDownload: boolean;
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): FederalPacSponsorsConfig {
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
  return {
    cycle,
    dryRun: argv.includes("--dry-run"),
    limit: parsePositiveInteger(parseValueFlag(argv, "--limit")),
    dataDir,
    pas2ZipPath: resolve(
      parseValueFlag(argv, "--pas2-zip") ?? `${dataDir}/pas2${cycleSuffix}.zip`,
    ),
    committeeMasterZipPath: resolve(
      parseValueFlag(argv, "--cm-zip") ?? `${dataDir}/cm${cycleSuffix}.zip`,
    ),
    skipDownload: argv.includes("--skip-download"),
  };
}

// ---------------------------------------------------------------------------
// DB upserts
// ---------------------------------------------------------------------------

/**
 * Upsert pac_committees rows. Exported so the Part 6b independent-expenditure
 * ingest can register its spender committees through the same path (one
 * committee identity store, one status guard) instead of copying it.
 */
export async function upsertCommittees(
  db: DbClient,
  rows: CommitteeRowToUpsert[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await db
      .insert(pacCommittees)
      .values(
        chunk.map((r) => ({
          committeeId: r.committeeId,
          name: r.name,
          designation: r.designation,
          committeeType: r.committeeType,
          orgType: r.orgType,
          connectedOrg: r.connectedOrg,
          sector: r.sector,
          classificationMethod: r.classificationMethod,
          // Sponsor class is a pure function of the four filed fields above,
          // so it is recomputed on every pass (src/lib/pacSponsorClass.ts).
          ...(() => {
            const { sponsorClass, method } = classifyPacSponsor(r);
            return { sponsorClass, sponsorClassMethod: method };
          })(),
          evidenceUrl: r.evidenceUrl,
          lastSeenCycle: r.lastSeenCycle,
        })),
      )
      .onConflictDoUpdate({
        target: pacCommittees.committeeId,
        set: {
          name: sql`excluded.name`,
          designation: sql`excluded.designation`,
          committeeType: sql`excluded.committee_type`,
          orgType: sql`excluded.org_type`,
          connectedOrg: sql`excluded.connected_org`,
          // status guard: only 'auto' rows may be reclassified by a re-run.
          // 'verified'/'rejected' are human decisions and keep their sector.
          sector: sql`CASE WHEN ${pacCommittees.status} = 'auto' THEN excluded.sector ELSE ${pacCommittees.sector} END`,
          classificationMethod: sql`CASE WHEN ${pacCommittees.status} = 'auto' THEN excluded.classification_method ELSE ${pacCommittees.classificationMethod} END`,
          // Sponsor class is derived from the filed fields, so a re-run may
          // always refresh it — EXCEPT where a human wrote it by hand.
          sponsorClass: sql`CASE WHEN ${pacCommittees.sponsorClassMethod} = 'human' THEN ${pacCommittees.sponsorClass} ELSE excluded.sponsor_class END`,
          sponsorClassMethod: sql`CASE WHEN ${pacCommittees.sponsorClassMethod} = 'human' THEN ${pacCommittees.sponsorClassMethod} ELSE excluded.sponsor_class_method END`,
          evidenceUrl: sql`excluded.evidence_url`,
          lastSeenCycle: sql`excluded.last_seen_cycle`,
          updatedAt: sql`now()`,
        },
      });
  }
  return rows.length;
}

async function upsertContributions(
  db: DbClient,
  rows: ContributionRowToUpsert[],
  dryRun: boolean,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    await db
      .insert(pacCandidateContributions)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          pacCandidateContributions.committeeId,
          pacCandidateContributions.candidateId,
          pacCandidateContributions.electionCycle,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          transactionCount: sql`excluded.transaction_count`,
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

export interface FederalPacSponsorsCounts {
  committeesInMaster: number;
  candidatesLoaded: number;
  pas2RowsScanned: number;
  directContributionRows: number;
  matchedCandidateRows: number;
  nonPacRowsSkipped: number;
  committeesWithContributions: number;
  committeesClassified: number;
  contributionRowsBuilt: number;
  committeesUpserted: number;
  contributionsUpserted: number;
  dryRun: boolean;
}

export async function ingestFederalPacSponsors({
  db = requireDb(),
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<FederalPacSponsorsCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `${LOG_PREFIX} starting cycle=${config.cycle} dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  if (!config.skipDownload) {
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

  // Committee master: id → parsed info (reuses federal-issue-pacs' parser).
  const committees = new Map<
    string,
    ReturnType<typeof parseCommitteeMasterLine> & object
  >();
  console.log(
    `${LOG_PREFIX} streaming committee master ${config.committeeMasterZipPath}`,
  );
  await streamZipLines(
    config.committeeMasterZipPath,
    (line) => {
      const committee = parseCommitteeMasterLine(line);
      if (!committee) return;
      committees.set(committee.committeeId, committee);
    },
    LOG_PREFIX,
  );

  // EVERY tracked federal candidate, not just those that already carry a
  // funding-mix row. The old funding-mix scoping was a DISPLAY safeguard
  // wearing an ingest costume: it kept "Top PACs" from becoming the only —
  // and therefore headline — funding figure on a breakdown-less candidate.
  // That safeguard now lives where it belongs, as an explicit funding-mix
  // gate in the read path (src/lib/server/pac-sponsors.ts), so the visible
  // behaviour is unchanged while the stored data stops being lopsided.
  //
  // Why the stored data has to be complete: the corporate-PAC claim is an
  // ABSENCE claim ("no corporate PAC money"), and an absence claim can only
  // be made from complete evidence. A challenger whose PAC contributions we
  // never ingested is indistinguishable from one who took none, so scoping
  // the ingest silently converted "we didn't look" into "nothing there".
  // Reading every candidate keeps unknown as unknown.
  //
  // The cycle is passed so that an FEC id sitting on both a rendered
  // candidate row and a voteless duplicate resolves to the row that carries
  // the funding mix — deterministically, every run. Dropping the ingest's
  // funding-mix scoping dropped that attribution guarantee with it; the
  // loader's ordering is what puts it back.
  const candidateByFecId = await loadFederalCandidateMap(db, config.cycle);

  // Stream PAS2, aggregating per (committee, candidate) pair.
  const pairs = new Map<string, PairAggregate>();
  let pas2RowsScanned = 0;
  let directContributionRows = 0;
  let matchedCandidateRows = 0;
  let nonPacRowsSkipped = 0;
  console.log(`${LOG_PREFIX} streaming PAS2 ${config.pas2ZipPath}`);
  await streamZipLines(
    config.pas2ZipPath,
    (line) => {
      if (config.limit !== null && pas2RowsScanned >= config.limit)
        return false;
      pas2RowsScanned += 1;
      if (pas2RowsScanned % 500_000 === 0) {
        console.log(
          `${LOG_PREFIX} pas2_rows=${pas2RowsScanned.toLocaleString()} pairs=${pairs.size}`,
        );
      }
      const row = parsePas2ContributionLine(line);
      if (!row) return;
      if (!isDirectPacContribution(row)) return;
      directContributionRows += 1;
      const candidateId = candidateByFecId.get(row.candidateFecId);
      if (!candidateId) return;
      matchedCandidateRows += 1;

      // The committee's own filed type/designation decides whether this is
      // PAC money at all (candidate transfers, party committees, and joint
      // fundraising vehicles are not).
      if (
        !isAttributablePacCommittee(committees.get(row.committeeId) ?? null)
      ) {
        nonPacRowsSkipped += 1;
        return;
      }

      const key = pairKey(row.committeeId, candidateId);
      const pair = pairs.get(key) ?? {
        committeeId: row.committeeId,
        candidateId,
        amountTotal: 0,
        transactionCount: 0,
      };
      pair.amountTotal += row.transactionAmount;
      pair.transactionCount += 1;
      pairs.set(key, pair);
      return true;
    },
    LOG_PREFIX,
  );

  // Committee rows: only committees that actually gave to our candidates.
  const contributingIds = new Set(
    [...pairs.values()].map((p) => p.committeeId),
  );
  const committeeRows: CommitteeRowToUpsert[] = [];
  let committeesClassified = 0;
  for (const committeeId of [...contributingIds].sort()) {
    // Present by construction: pairs only accumulate for committees that
    // passed isAttributablePacCommittee, which requires a master entry.
    const info = committees.get(committeeId);
    if (!info) continue;
    const row = buildCommitteeRow(info, config.cycle);
    if (row.sector) committeesClassified += 1;
    committeeRows.push(row);
  }

  const sourceUrl = `${FEC_BULK_BASE_URL}/${config.cycle}/pas2${config.cycle.slice(2)}.zip`;
  const contributionRows = buildContributionRows(
    pairs,
    config.cycle,
    sourceUrl,
  );

  if (config.dryRun) {
    const top = [...contributionRows]
      .sort((a, b) => Number(b.amountTotal) - Number(a.amountTotal))
      .slice(0, 20);
    for (const row of top) {
      const committee = committeeRows.find(
        (c) => c.committeeId === row.committeeId,
      );
      console.log(
        `${LOG_PREFIX} dry-run top committee=${row.committeeId} "${committee?.name}" ` +
          `sponsor="${committee?.connectedOrg ?? "(none filed)"}" sector=${committee?.sector ?? "(unclassified)"} ` +
          `candidate=${row.candidateId} amount=$${Number(row.amountTotal).toLocaleString()}`,
      );
    }
  }

  const committeesUpserted = await upsertCommittees(
    db,
    committeeRows,
    config.dryRun,
  );
  const contributionsUpserted = await upsertContributions(
    db,
    contributionRows,
    config.dryRun,
  );

  const counts: FederalPacSponsorsCounts = {
    committeesInMaster: committees.size,
    candidatesLoaded: candidateByFecId.size,
    pas2RowsScanned,
    directContributionRows,
    matchedCandidateRows,
    nonPacRowsSkipped,
    committeesWithContributions: contributingIds.size,
    committeesClassified,
    contributionRowsBuilt: contributionRows.length,
    committeesUpserted,
    contributionsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      `${LOG_PREFIX} complete`,
      `committees_in_master=${counts.committeesInMaster}`,
      `fec_candidate_ids=${counts.candidatesLoaded}`,
      `pas2_rows=${counts.pas2RowsScanned}`,
      `direct_rows=${counts.directContributionRows}`,
      `matched_candidate_rows=${counts.matchedCandidateRows}`,
      `non_pac_rows_skipped=${counts.nonPacRowsSkipped}`,
      `committees_with_contributions=${counts.committeesWithContributions}`,
      `committees_classified=${counts.committeesClassified}`,
      `contribution_rows=${counts.contributionRowsBuilt}`,
      `committees_upserted=${counts.committeesUpserted}${counts.dryRun ? " (dry-run)" : ""}`,
      `contributions_upserted=${counts.contributionsUpserted}${counts.dryRun ? " (dry-run)" : ""}`,
    ].join(" "),
  );

  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  ingestFederalPacSponsors().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

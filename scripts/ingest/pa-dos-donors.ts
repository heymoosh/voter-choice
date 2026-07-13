/**
 * scripts/ingest/pa-dos-donors.ts
 *
 * Pennsylvania state donor ingest from PA Department of State bulk campaign
 * finance data.
 *
 * Reads /tmp/PA_2024.zip, streams filer and contribution files directly via
 * `unzip -p` (no full extraction needed), matches PA filers to our PA state
 * candidates by last name, aggregates 2024 contributions into donor buckets,
 * and upserts into `donor_aggregates`.
 *
 * Source: PA Department of State Campaign Finance Data
 * https://www.pa.gov/agencies/dos/resources/voting-and-elections-resources/campaign-finance-data
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/pa-dos-donors.ts [--dry-run] [--limit 50]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import * as readline from "node:readline";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { year: YEAR } = resolveConfig();
const ZIP_PATH = `/tmp/PA_${YEAR}.zip`;
const FILER_ENTRY = `${YEAR}/filer_${YEAR}.txt`;
const CONTRIB_ENTRY = `${YEAR}/contrib_${YEAR}.txt`;
const ELECTION_CYCLE = YEAR;
const SOURCE = "pa_dos_bulk";
const SOURCE_URL =
  "https://www.pa.gov/agencies/dos/resources/voting-and-elections-resources/campaign-finance-data";

// PA FILERTYPE codes — contributions flow through campaign committees (type 2)
const COMMITTEE_FILERTYPE = "2";

// PA OFFICE codes for state legislature
const STATE_OFFICES = new Set(["STH", "STS"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

interface PaFilerInfo {
  filerId: string;
  filerName: string;
  filerNameLast: string;
  office: string;
  district: string;
}

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
  rawMetadata: unknown;
}

interface AggValue {
  totalDollars: number;
  donorCount: number;
  filerId: string;
  office: string;
}

interface DonorAggregateRow {
  candidateId: string;
  electionCycle: string;
  bucketLabel: string;
  amountTotal: string;
  source: string;
  sourceUrl: string;
  rawMetadata: UnknownRecord;
}

export type PaIngestCounts = {
  paFilersLoaded: number;
  dbCandidatesQueried: number;
  candidatesMatched: number;
  contribsFiltered: number;
  rowsUpserted: number;
  dryRun: boolean;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface IngestConfig {
  dryRun: boolean;
  limit: number | null;
  year: string;
}

function resolveConfig(argv: string[] = process.argv): IngestConfig {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  const yearIdx = argv.indexOf("--year");
  let limit: number | null = null;
  if (limitIdx !== -1) {
    const raw = argv[limitIdx + 1];
    const parsed = Number.parseInt(raw ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0) limit = parsed;
  }
  const year = yearIdx !== -1 ? (argv[yearIdx + 1] ?? "2024") : "2024";
  return { dryRun, limit, year };
}

// ---------------------------------------------------------------------------
// CSV parser — handles double-quoted fields with embedded commas / escaped quotes
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// Stream a ZIP entry line-by-line via `unzip -p`
// ---------------------------------------------------------------------------

async function streamZipEntry(
  zipPath: string,
  entry: string,
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("unzip", ["-p", zipPath, entry], { stdio: ["ignore", "pipe", "pipe"] });
    const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });

    let headers: string[] | null = null;
    let errOutput = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      errOutput += chunk.toString();
    });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const fields = parseCsvLine(trimmed);

      if (headers === null) {
        headers = fields;
        return;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = fields[i] ?? "";
      }
      onRow(row);
    });

    rl.on("close", () => resolve());
    rl.on("error", reject);

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`unzip exited with code ${code}: ${errOutput.trim()}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

// Words to skip when tokenizing PA committee names (generic non-name words)
const COMMITTEE_SKIP_WORDS = new Set([
  "friends", "citizens", "committee", "for", "of", "to", "elect", "by",
  "vote", "pa", "pennsylvania", "state", "senate", "house", "assembly",
  "district", "campaign", "fund", "pac", "change", "team", "people",
  "neighbors", "be", "the", "and", "freedom", "families",
]);

/**
 * Extract candidate name tokens from a PA campaign committee name (FILERTYPE=2).
 * PA committee names use many formats:
 *   "LAST, FIRST FRIENDS OF"      → [last]
 *   "FRIENDS OF [First] [Last]"   → [last]
 *   "CITIZENS FOR [First] [Last]" → [last]
 *   "[First] [Last] FOR PA"       → [last]
 *   "COMMITTEE TO ELECT [Name]"   → [last]
 *   "CAMPAIGN FUND FOR [Name]"    → [last]
 * Returns all candidate-name tokens to try against the last-name index.
 */
function extractCommitteeTokens(committeeName: string): string[] {
  const trimmed = committeeName.trim();
  // "LAST, FIRST ..." → definitive last name before comma
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1) {
    const last = normalizeName(trimmed.substring(0, commaIdx));
    return last ? [last] : [];
  }
  // Tokenize, skip generic words, return all candidate-word candidates
  const words = trimmed.toUpperCase().match(/[A-Z]+/gu) ?? [];
  return words
    .map((w) => normalizeName(w))
    .filter((w) => w.length > 2 && !COMMITTEE_SKIP_WORDS.has(w));
}

/**
 * Extract last name from a candidate name (DB format: "First [Middle] Last").
 */
function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u);
  return normalizeName(parts[parts.length - 1] ?? fullName);
}

// ---------------------------------------------------------------------------
// Step 1: Load PA filers
// ---------------------------------------------------------------------------

async function loadPaFilers(): Promise<{
  byId: Map<string, PaFilerInfo>;
  byLastName: Map<string, PaFilerInfo[]>;
}> {
  const byId = new Map<string, PaFilerInfo>();
  const byLastName = new Map<string, PaFilerInfo[]>();

  console.log(`[pa-dos-donors] streaming ${FILER_ENTRY} from ZIP ...`);

  await streamZipEntry(ZIP_PATH, FILER_ENTRY, (row) => {
    // columns: CampaignfinanceID[0], FILERID[1], EYEAR[2], SubmittedDate[3],
    //          CYCLE[4], AMMEND[5], TERMINATE[6], FILERTYPE[7], FILERNAME[8],
    //          OFFICE[9], DISTRICT[10], ...
    // Contributions are filed by campaign committees (FILERTYPE=2), not by
    // individual candidates (FILERTYPE=1). Only type-2 FilerIDs appear in
    // contrib_2024.txt, so we must index committees rather than candidates.
    const filerType = (row["FILERTYPE"] ?? "").replace(/^"|"$/g, "").trim();
    if (filerType !== COMMITTEE_FILERTYPE) return;

    const office = (row["OFFICE"] ?? "").replace(/^"|"$/g, "").trim().toUpperCase();
    if (!STATE_OFFICES.has(office)) return;

    const filerId = (row["FILERID"] ?? "").replace(/^"|"$/g, "").trim();
    if (!filerId) return;

    const filerName = (row["FILERNAME"] ?? "").replace(/^"|"$/g, "").trim();

    const info: PaFilerInfo = {
      filerId,
      filerName,
      filerNameLast: "", // not used for committees — we index by tokens below
      office,
      district: (row["DISTRICT"] ?? "").replace(/^"|"$/g, "").trim(),
    };

    byId.set(filerId, info);

    // Index each candidate-name token from the committee name
    for (const token of extractCommitteeTokens(filerName)) {
      const existing = byLastName.get(token) ?? [];
      existing.push(info);
      byLastName.set(token, existing);
    }
  });

  return { byId, byLastName };
}

// ---------------------------------------------------------------------------
// Step 2: Query DB candidates (PA state)
// ---------------------------------------------------------------------------

async function loadDbCandidates(
  db: DbClient,
  limit: number | null,
): Promise<DbCandidate[]> {
  const query = db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} LIKE 'state-PA%'`);

  if (limit !== null) {
    const rows = await query.limit(limit);
    return rows as DbCandidate[];
  }
  const rows = await query;
  return rows as DbCandidate[];
}

// ---------------------------------------------------------------------------
// Step 3: Match DB candidates to PA filers by last name
// ---------------------------------------------------------------------------

function matchCandidatesToFilers(
  dbCandidates: DbCandidate[],
  byLastName: Map<string, PaFilerInfo[]>,
): Map<string, PaFilerInfo[]> {
  const candidateToFilers = new Map<string, PaFilerInfo[]>();

  for (const candidate of dbCandidates) {
    const lastName = extractLastName(candidate.fullName);
    const filers = byLastName.get(lastName);
    if (filers && filers.length > 0) {
      candidateToFilers.set(candidate.id, filers);
    }
  }

  return candidateToFilers;
}

// ---------------------------------------------------------------------------
// Step 4: Build filerID → candidateId map
// ---------------------------------------------------------------------------

function buildFilerToCandidateMap(
  candidateToFilers: Map<string, PaFilerInfo[]>,
): Map<string, string> {
  const filerToCandidate = new Map<string, string>();
  for (const [candidateId, filers] of candidateToFilers) {
    for (const filer of filers) {
      filerToCandidate.set(filer.filerId, candidateId);
    }
  }
  return filerToCandidate;
}

// ---------------------------------------------------------------------------
// Step 5: Stream contributions and aggregate
// ---------------------------------------------------------------------------

async function aggregateContributions(
  filerToCandidate: Map<string, string>,
  filerById: Map<string, PaFilerInfo>,
): Promise<Map<string, AggValue>> {
  // Key: "<candidateId>|<cycle>|<bucket>"
  const agg = new Map<string, AggValue>();
  let contribsFiltered = 0;
  let linesRead = 0;

  console.log(`[pa-dos-donors] streaming ${CONTRIB_ENTRY} from ZIP ...`);

  await streamZipEntry(ZIP_PATH, CONTRIB_ENTRY, (row) => {
    linesRead++;
    if (linesRead % 500_000 === 0) {
      console.log(
        `[pa-dos-donors] lines_read=${linesRead} matched_so_far=${contribsFiltered}`,
      );
    }

    // columns: CampaignFinanceID[0], FilerID[1], EYEAR[2], SubmittedDate[3],
    //          CYCLE[4], Section[5], CONTRIBUTOR[6], ADDRESS1[7], ADDRESS2[8],
    //          CITY[9], STATE[10], ZIPCODE[11], OCCUPATION[12], ENAME[13],
    //          EADDRESS1[14], EADDRESS2[15], ECITY[16], ESTATE[17], EZIPCODE[18],
    //          CONTDATE1[19], CONTAMT1[20], CONTDATE2[21], CONTAMT2[22],
    //          CONTDATE3[23], CONTAMT3[24], CONTDESC[25]
    const filerId = (row["FilerID"] ?? "").replace(/^"|"$/g, "").trim();
    if (!filerToCandidate.has(filerId)) return;

    const eyear = (row["EYEAR"] ?? "").trim();
    if (eyear !== ELECTION_CYCLE) return;

    const amtRaw = row["CONTAMT1"] ?? "";
    const amount = Number.parseFloat(amtRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const candidateId = filerToCandidate.get(filerId)!;
    const filerInfo = filerById.get(filerId);

    // Classify contribution by employer / amount
    const employer = (row["ENAME"] ?? "").trim();
    const occupation = (row["OCCUPATION"] ?? "").trim();

    let bucket: DonorBucketLabel;
    if (employer) {
      const employerBucket = mapEmployerToBucket(employer, occupation);
      bucket = employerBucket ?? bucketIndividualByAmount(amount);
    } else {
      bucket = bucketIndividualByAmount(amount);
    }

    const aggKey = `${candidateId}|${ELECTION_CYCLE}|${bucket}`;
    const existing = agg.get(aggKey);
    if (existing) {
      existing.totalDollars += amount;
      existing.donorCount += 1;
    } else {
      agg.set(aggKey, {
        totalDollars: amount,
        donorCount: 1,
        filerId,
        office: filerInfo?.office ?? "",
      });
    }

    contribsFiltered++;
  });

  console.log(
    `[pa-dos-donors] finished streaming: lines_read=${linesRead} matched_contributions=${contribsFiltered}`,
  );

  return agg;
}

// ---------------------------------------------------------------------------
// Step 6: Build upsert rows from aggregation map
// ---------------------------------------------------------------------------

function buildUpsertRows(
  agg: Map<string, AggValue>,
  candidateToFilers: Map<string, PaFilerInfo[]>,
): DonorAggregateRow[] {
  const rows: DonorAggregateRow[] = [];

  for (const [aggKey, value] of agg) {
    const [candidateId, cycle, bucket] = aggKey.split("|");
    if (!candidateId || !cycle || !bucket) continue;
    if (value.totalDollars <= 0) continue;

    const filersForCandidate = candidateToFilers.get(candidateId) ?? [];

    rows.push({
      candidateId,
      electionCycle: cycle,
      bucketLabel: bucket,
      amountTotal: value.totalDollars.toFixed(2),
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      rawMetadata: {
        donorCount: value.donorCount,
        filerId: value.filerId,
        office: value.office,
        paFilerNames: filersForCandidate.map((f) => f.filerName),
      },
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Step 7: Upsert into donor_aggregates
// ---------------------------------------------------------------------------

async function upsertRows(
  db: DbClient,
  rows: DonorAggregateRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const CHUNK_SIZE = 100;
  let total = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const dbRows = chunk.map((row) => ({
      candidateId: row.candidateId,
      electionCycle: row.electionCycle,
      bucketLabel: row.bucketLabel,
      amountTotal: row.amountTotal,
      source: row.source,
      sourceUrl: row.sourceUrl,
      rawMetadata: row.rawMetadata,
      insertedAt: new Date(),
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function ingestPaDonors({
  db = requireDb(),
  argv = process.argv,
}: {
  db?: DbClient;
  argv?: string[];
} = {}): Promise<PaIngestCounts> {
  const config = resolveConfig(argv);

  console.log(
    `[pa-dos-donors] starting dryRun=${config.dryRun} limit=${config.limit ?? "none"}`,
  );

  // Step 1: Load PA filers from ZIP
  const { byId: filerById, byLastName } = await loadPaFilers();
  console.log(
    `[pa-dos-donors] pa_state_filers=${filerById.size} unique_last_names=${byLastName.size}`,
  );

  // Step 2: Load DB candidates (PA state only)
  console.log(`[pa-dos-donors] querying DB for PA state candidates ...`);
  const dbCandidates = await loadDbCandidates(db, config.limit);
  console.log(`[pa-dos-donors] db_candidates_found=${dbCandidates.length}`);

  // Step 3 & 4: Match candidates to filers
  const candidateToFilers = matchCandidatesToFilers(dbCandidates, byLastName);
  const filerToCandidate = buildFilerToCandidateMap(candidateToFilers);
  console.log(
    `[pa-dos-donors] candidates_matched=${candidateToFilers.size} filer_ids_matched=${filerToCandidate.size}`,
  );

  if (filerToCandidate.size === 0) {
    console.warn(
      `[pa-dos-donors] no filer matches found — check candidate last names against PA filer names`,
    );
  }

  // Step 5: Stream contributions and aggregate
  const agg = await aggregateContributions(filerToCandidate, filerById);

  // Step 6: Build upsert rows
  const rows = buildUpsertRows(agg, candidateToFilers);
  console.log(`[pa-dos-donors] rows_to_upsert=${rows.length}`);

  // Step 7: Upsert (or skip in dry-run)
  let rowsUpserted = 0;
  if (config.dryRun) {
    console.log(
      `[pa-dos-donors] dry-run — skipping upsert of ${rows.length} rows`,
    );
    for (const row of rows.slice(0, 5)) {
      console.log(
        `  [dry-run] candidate=${row.candidateId} cycle=${row.electionCycle} bucket=${row.bucketLabel} amount=${row.amountTotal}`,
      );
    }
  } else {
    rowsUpserted = await upsertRows(db, rows);
  }

  const counts: PaIngestCounts = {
    paFilersLoaded: filerById.size,
    dbCandidatesQueried: dbCandidates.length,
    candidatesMatched: candidateToFilers.size,
    contribsFiltered: rows.reduce(
      (sum, r) =>
        sum + ((r.rawMetadata as { donorCount?: number }).donorCount ?? 0),
      0,
    ),
    rowsUpserted,
    dryRun: config.dryRun,
  };

  console.log(
    [
      "[pa-dos-donors] complete",
      `pa_filers=${counts.paFilersLoaded}`,
      `db_candidates=${counts.dbCandidatesQueried}`,
      `matched=${counts.candidatesMatched}`,
      `matched_contributions=${counts.contribsFiltered}`,
      `rows_upserted=${counts.rowsUpserted}`,
      `dry_run=${counts.dryRun}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  ingestPaDonors().catch((error) => {
    const msg =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    console.error("[pa-dos-donors] failed:", msg);
    process.exitCode = 1;
  });
}

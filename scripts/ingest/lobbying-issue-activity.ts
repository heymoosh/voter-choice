/**
 * scripts/ingest/lobbying-issue-activity.ts
 *
 * LDA LD-2 quarterly lobbying-activity ingest — populates
 * `lobbying_issue_activity` (db/migrations/0014) from the lda.gov REST API.
 *
 * NOT MEMBER-KEYED, DELIBERATELY: per docs/research/civic-orgs-lobbying-spike.md,
 * LD-2 filings disclose only the chamber(s) contacted, never an individual
 * Member of Congress. Only SENATE / HOUSE OF REPRESENTATIVES government
 * entities are kept; agency-only contacts (e.g. "DEPARTMENT OF AGRICULTURE")
 * are out of scope for this card and skipped.
 *
 * Source: https://lda.gov/api/v1/filings/ — public REST API, anonymous
 * access allowed (15 req/min). Response shape confirmed live 2026-07-10:
 * `GET https://lda.gov/api/v1/filings/?filing_year=2026&filing_period=third_quarter`
 * returns `{ count, next, previous, results: [...] }`, each result carrying
 * `filing_uuid`, `filing_type`, `filing_year`, `filing_period`,
 * `filing_document_url`, `income`, `expenses`, `registrant.name`,
 * `client.{name,general_description,state}`, and
 * `lobbying_activities[].{general_issue_code, general_issue_code_display,
 * description, government_entities[].name}`.
 *
 * License: LDA.gov API Terms of Service require citing the access date and
 * prohibit misrepresenting the data; no non-commercial or no-redistribution
 * restriction (unlike OpenSecrets' aggregated view of the same filings).
 *
 * Usage:
 *   npx tsx scripts/ingest/lobbying-issue-activity.ts --year 2026 --period third_quarter
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/lobbying-issue-activity.ts --year 2026 --period third_quarter --live
 *
 * `--period` must be one of: first_quarter | second_quarter | third_quarter |
 * fourth_quarter (LD-2 quarters). Defaults to dry run; a real write requires
 * BOTH DATABASE_URL and --live, same convention as stock-transactions.ts.
 *
 * Idempotency: upserts on external_id (filing_uuid + issue area + chamber —
 * see buildLobbyingExternalId).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { lobbyingIssueActivity } from "../../db/schema";

const LDA_API_BASE = "https://lda.gov/api/v1/filings/";
const MAX_PAGES = 200; // safety cap — one quarter tops out well under this

export const VALID_FILING_PERIODS = [
  "first_quarter",
  "second_quarter",
  "third_quarter",
  "fourth_quarter",
] as const;
export type FilingPeriod = (typeof VALID_FILING_PERIODS)[number];

type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Types — raw source shapes (verbatim lda.gov JSON field names)
// ---------------------------------------------------------------------------

export interface LdaGovernmentEntity {
  id?: number;
  name?: string;
}

export interface LdaLobbyingActivity {
  general_issue_code?: string;
  general_issue_code_display?: string;
  description?: string;
  government_entities?: LdaGovernmentEntity[];
}

export interface LdaClient {
  name?: string;
  general_description?: string | null;
  state?: string | null;
}

export interface LdaRegistrant {
  name?: string;
}

export interface LdaFiling {
  filing_uuid?: string;
  filing_type?: string;
  filing_year?: number;
  filing_period?: string;
  filing_document_url?: string;
  income?: string | null;
  expenses?: string | null;
  registrant?: LdaRegistrant;
  client?: LdaClient;
  lobbying_activities?: LdaLobbyingActivity[];
}

export interface LdaFilingsResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: LdaFiling[];
}

// ---------------------------------------------------------------------------
// Types — normalized (DB-shaped)
// ---------------------------------------------------------------------------

export interface LobbyingIssueActivityRow {
  filingUuid: string;
  filingType: string;
  filingYear: number;
  filingPeriod: string;
  registrantName: string;
  clientName: string;
  clientDescription: string | null;
  clientState: string | null;
  issueAreaCode: string;
  issueAreaLabel: string;
  specificIssues: string | null;
  chamber: "house" | "senate";
  incomeAmount: string | null; // numeric column → string for Drizzle
  expensesAmount: string | null;
  filingUrl: string;
  sourceDataset: "lda_gov";
  externalId: string;
  rawMetadata: UnknownRecord;
}

export interface BuildCounts {
  filingsRead: number;
  activitiesRead: number;
  skippedNoChamber: number;
  skippedMalformed: number;
  built: number;
}

// ---------------------------------------------------------------------------
// Pure parsing helpers
// ---------------------------------------------------------------------------

/** lda.gov government_entities carry chambers AND agencies in one list — this
 *  card is chamber-only; agency-only contacts are out of scope and skipped. */
const CHAMBER_BY_ENTITY_NAME: Record<string, "house" | "senate"> = {
  "HOUSE OF REPRESENTATIVES": "house",
  SENATE: "senate",
};

/** True when `raw` is a well-formed absolute http(s) URL — same contract as
 *  stock-transactions.ts: reject rather than store a link nobody can follow. */
export function isValidFilingUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/** "10000.00" → "10000.00" (validated numeric string) or null. lda.gov sends
 *  amounts as decimal strings already; never fabricate a value when absent
 *  or unparsable. */
export function normalizeAmount(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return trimmed;
}

/**
 * Idempotency key: one row per (filing, issue area, chamber). If a filing
 * lists the same issue area + chamber more than once across separate
 * lobbying_activities entries (rare but possible), a later row upserts over
 * an earlier one with the same key — same fail-open convention as
 * stock-transactions.ts' buildExternalId.
 */
export function buildLobbyingExternalId(parts: {
  filingUuid: string;
  issueAreaCode: string;
  chamber: string;
}): string {
  return ["lda_gov", parts.filingUuid, parts.issueAreaCode, parts.chamber].join(
    "::",
  );
}

/**
 * Parses one lda.gov filing into zero or more issue-activity rows — one per
 * (lobbying activity, chamber) pair, filtered to House/Senate government
 * entities only. A malformed filing (missing uuid/registrant/client/url)
 * yields zero rows; a malformed individual activity is skipped without
 * dropping the filing's other activities.
 */
export function parseFiling(filing: LdaFiling): {
  rows: LobbyingIssueActivityRow[];
  activitiesRead: number;
  skippedNoChamber: number;
  skippedMalformed: number;
} {
  const empty = {
    rows: [] as LobbyingIssueActivityRow[],
    activitiesRead: 0,
    skippedNoChamber: 0,
    skippedMalformed: 0,
  };

  const filingUuid = (filing.filing_uuid ?? "").trim();
  const filingType = (filing.filing_type ?? "").trim();
  const filingYear = filing.filing_year;
  const filingPeriod = (filing.filing_period ?? "").trim();
  const registrantName = (filing.registrant?.name ?? "").trim();
  const clientName = (filing.client?.name ?? "").trim();
  const filingUrl = (filing.filing_document_url ?? "").trim();

  if (
    !filingUuid ||
    !filingType ||
    !filingYear ||
    !filingPeriod ||
    !registrantName ||
    !clientName ||
    !isValidFilingUrl(filingUrl)
  ) {
    return empty;
  }

  const clientDescription = filing.client?.general_description?.trim() || null;
  const clientState = filing.client?.state?.trim() || null;
  const incomeAmount = normalizeAmount(filing.income);
  const expensesAmount = normalizeAmount(filing.expenses);

  const activities = Array.isArray(filing.lobbying_activities)
    ? filing.lobbying_activities
    : [];

  const rows: LobbyingIssueActivityRow[] = [];
  let skippedNoChamber = 0;
  let skippedMalformed = 0;

  for (const activity of activities) {
    const issueAreaCode = (activity.general_issue_code ?? "").trim();
    const issueAreaLabel = (activity.general_issue_code_display ?? "").trim();
    if (!issueAreaCode || !issueAreaLabel) {
      skippedMalformed += 1;
      continue;
    }
    const specificIssues = activity.description?.trim() || null;

    const entities = Array.isArray(activity.government_entities)
      ? activity.government_entities
      : [];
    const chambers = new Set<"house" | "senate">();
    for (const entity of entities) {
      const chamber = CHAMBER_BY_ENTITY_NAME[(entity.name ?? "").trim()];
      if (chamber) chambers.add(chamber);
    }

    if (chambers.size === 0) {
      skippedNoChamber += 1;
      continue;
    }

    for (const chamber of chambers) {
      rows.push({
        filingUuid,
        filingType,
        filingYear,
        filingPeriod,
        registrantName,
        clientName,
        clientDescription,
        clientState,
        issueAreaCode,
        issueAreaLabel,
        specificIssues,
        chamber,
        incomeAmount,
        expensesAmount,
        filingUrl,
        sourceDataset: "lda_gov",
        externalId: buildLobbyingExternalId({
          filingUuid,
          issueAreaCode,
          chamber,
        }),
        rawMetadata: {
          filingTypeDisplay: filing.filing_type ?? null,
          filingPeriodDisplay: filing.filing_period ?? null,
        },
      });
    }
  }

  return {
    rows,
    activitiesRead: activities.length,
    skippedNoChamber,
    skippedMalformed,
  };
}

// ---------------------------------------------------------------------------
// Fetch (fail-open, paginated — an unreachable/malformed page stops
// pagination but does not discard rows already built)
// ---------------------------------------------------------------------------

async function fetchAllFilings(
  filingYear: number,
  filingPeriod: FilingPeriod,
  fetcher: Fetcher,
): Promise<LdaFiling[]> {
  const filings: LdaFiling[] = [];
  let url: string | null =
    `${LDA_API_BASE}?filing_year=${filingYear}&filing_period=${filingPeriod}&page_size=100`;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    pages += 1;
    let res: Response;
    try {
      res = await fetcher(url, {
        headers: {
          accept: "application/json",
          "user-agent": "voter-choice-lobbying-issue-activity-ingest",
        },
      });
    } catch (err) {
      console.warn(
        `[lobbying-issue-activity] fetch failed on page ${pages}: ${err} — stopping pagination, keeping ${filings.length} filings read so far`,
      );
      break;
    }
    if (!res.ok) {
      console.warn(
        `[lobbying-issue-activity] HTTP ${res.status} on page ${pages} (${url}) — stopping pagination, keeping ${filings.length} filings read so far`,
      );
      break;
    }
    const body = (await res.json()) as LdaFilingsResponse;
    if (Array.isArray(body.results)) {
      filings.push(...body.results);
    }
    url = body.next ?? null;
  }

  if (pages >= MAX_PAGES) {
    console.warn(
      `[lobbying-issue-activity] hit MAX_PAGES=${MAX_PAGES} safety cap — result set may be incomplete`,
    );
  }

  return filings;
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

export async function upsertLobbyingIssueActivityRows(
  db: DbClient,
  rows: LobbyingIssueActivityRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const now = new Date();

  await db
    .insert(lobbyingIssueActivity)
    .values(rows.map((row) => ({ ...row, updatedAt: now })))
    .onConflictDoUpdate({
      target: lobbyingIssueActivity.externalId,
      set: {
        filingType: sql`excluded.filing_type`,
        filingYear: sql`excluded.filing_year`,
        filingPeriod: sql`excluded.filing_period`,
        registrantName: sql`excluded.registrant_name`,
        clientName: sql`excluded.client_name`,
        clientDescription: sql`excluded.client_description`,
        clientState: sql`excluded.client_state`,
        issueAreaLabel: sql`excluded.issue_area_label`,
        specificIssues: sql`excluded.specific_issues`,
        incomeAmount: sql`excluded.income_amount`,
        expensesAmount: sql`excluded.expenses_amount`,
        filingUrl: sql`excluded.filing_url`,
        sourceDataset: sql`excluded.source_dataset`,
        rawMetadata: sql`excluded.raw_metadata`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  return rows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface LobbyingIssueActivityCounts extends BuildCounts {
  rowsUpserted: number;
}

export async function ingestLobbyingIssueActivity({
  db = requireDb(),
  fetcher = fetch,
  dryRun = true,
  filingYear,
  filingPeriod,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  dryRun?: boolean;
  filingYear: number;
  filingPeriod: FilingPeriod;
}): Promise<LobbyingIssueActivityCounts> {
  const counts: LobbyingIssueActivityCounts = {
    filingsRead: 0,
    activitiesRead: 0,
    skippedNoChamber: 0,
    skippedMalformed: 0,
    built: 0,
    rowsUpserted: 0,
  };

  const filings = await fetchAllFilings(filingYear, filingPeriod, fetcher);
  counts.filingsRead = filings.length;

  let allRows: LobbyingIssueActivityRow[] = [];
  for (const filing of filings) {
    const parsed = parseFiling(filing);
    counts.activitiesRead += parsed.activitiesRead;
    counts.skippedNoChamber += parsed.skippedNoChamber;
    counts.skippedMalformed += parsed.skippedMalformed;
    counts.built += parsed.rows.length;
    allRows = allRows.concat(parsed.rows);
  }

  console.log(
    `[lobbying-issue-activity] filings=${counts.filingsRead} activities=${counts.activitiesRead} skippedNoChamber=${counts.skippedNoChamber} skippedMalformed=${counts.skippedMalformed} built=${counts.built}`,
  );

  if (dryRun) {
    console.log(
      `[lobbying-issue-activity] DRY RUN — would upsert ${allRows.length} rows (no writes)`,
    );
    return counts;
  }

  counts.rowsUpserted = await upsertLobbyingIssueActivityRows(db, allRows);
  console.log(`[lobbying-issue-activity] upserted ${counts.rowsUpserted} rows`);
  return counts;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

function parseCliArgs(argv: string[]): {
  filingYear: number;
  filingPeriod: FilingPeriod;
  live: boolean;
} {
  const yearFlag = argv.indexOf("--year");
  const periodFlag = argv.indexOf("--period");
  const filingYear =
    yearFlag !== -1 ? Number(argv[yearFlag + 1]) : new Date().getFullYear();
  const periodRaw = periodFlag !== -1 ? argv[periodFlag + 1] : undefined;

  if (!periodRaw || !VALID_FILING_PERIODS.includes(periodRaw as FilingPeriod)) {
    throw new Error(
      `--period is required and must be one of: ${VALID_FILING_PERIODS.join(", ")}`,
    );
  }
  if (!Number.isFinite(filingYear)) {
    throw new Error("--year must be a number, e.g. --year 2026");
  }

  return {
    filingYear,
    filingPeriod: periodRaw as FilingPeriod,
    live: argv.includes("--live"),
  };
}

if (isCliExecution()) {
  const { filingYear, filingPeriod, live } = parseCliArgs(process.argv);
  // Safety-first default: this script writes to lobbying_issue_activity only
  // when --live is passed explicitly (mirrors stock-transactions.ts).
  ingestLobbyingIssueActivity({
    dryRun: !live,
    filingYear,
    filingPeriod,
  }).catch((err) => {
    console.error("[lobbying-issue-activity] fatal:", err);
    process.exitCode = 1;
  });
}

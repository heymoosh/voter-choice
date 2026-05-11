/**
 * OpenStates state legislative vote ingest.
 *
 * Usage:
 *   STATE=TX DATABASE_URL=<neon-connection-string> OPENSTATES_API_KEY=<key> \
 *     npx tsx scripts/ingest/state-votes.ts
 */

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { bills, candidateOffices, candidates, votes } from "../../db/schema";

export type NormalizedStateVoteCast =
  | "yea"
  | "nay"
  | "present"
  | "absent"
  | "not_voting";

type StateChamber = "house" | "senate";
type StateJurisdiction = `state-${string}-${StateChamber}`;
type Fetcher = typeof fetch;
type UnknownRecord = Record<string, unknown>;

type CandidateRow = typeof candidates.$inferInsert;
type CandidateOfficeRow = typeof candidateOffices.$inferInsert;
type BillRow = typeof bills.$inferInsert;
type VoteRow = typeof votes.$inferInsert;

export type RuntimeConfig = {
  state: string;
  jurisdictionId: string;
  openStatesBaseUrl: string;
  openStatesApiKey: string;
  perPage: number;
  sessionCount: number;
  explicitSessionIds: string[];
  maxBills?: number;
};

export type OpenStatesSession = {
  id: string;
  name?: string;
  identifier?: string;
  classification: string[];
  startDate?: string;
  endDate?: string;
  active: boolean;
};

export type PlannedStateRows = {
  candidates: Map<string, CandidateRow>;
  candidateOffices: Map<string, CandidateOfficeRow>;
  bills: Map<string, BillRow>;
  votes: Map<string, VoteRow>;
  counts: {
    sessionsSelected: number;
    billsSeen: number;
    billRowsPlanned: number;
    voteEventsSeen: number;
    skippedNoBillId: number;
    skippedNoVoteDate: number;
    skippedNoVoteOption: number;
    skippedNoVoter: number;
    skippedUnresolvedChamber: number;
    voteRowsPlanned: number;
  };
};

export const ALL_STATE_ABBREVIATIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

export const CANARY_STATE_ABBREVIATIONS = [
  "TX",
  "CA",
  "NY",
  "FL",
  "GA",
  "NC",
] as const;

export function normalizeStateVoteCast(
  value: unknown,
): NormalizedStateVoteCast | null {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["aye", "yes", "yea", "y", "for", "pass"].includes(normalized)) {
    return "yea";
  }
  if (["nay", "no", "n", "against", "fail"].includes(normalized)) {
    return "nay";
  }
  if (
    ["present", "present voting", "abstain", "abstaining"].includes(normalized)
  ) {
    return "present";
  }
  if (["absent", "excused"].includes(normalized)) {
    return "absent";
  }
  if (
    ["not voting", "not voted", "did not vote", "didnt vote", "other"].includes(
      normalized,
    )
  ) {
    return "not_voting";
  }

  return null;
}

export function buildStateJurisdictionId(state: string): string {
  const normalized = normalizeStateAbbreviation(state);
  return `ocd-jurisdiction/country:us/state:${normalized.toLowerCase()}/government`;
}

export function buildOpenStatesCandidateId(person: unknown): string | null {
  const record = asRecord(person);
  if (!record) return null;

  const id = getString(record, "id") ?? getString(record, "openstates_id");
  return id ? `openstates-${sanitizeIdPart(id)}` : null;
}

export function buildOpenStatesBillId(bill: unknown): string | null {
  const record = asRecord(bill);
  const id = getString(record, "id");
  return id ? `openstates-${sanitizeIdPart(id)}` : null;
}

export function classifyStateJurisdiction(
  state: string,
  ...sources: unknown[]
): StateJurisdiction | null {
  for (const source of sources) {
    const chamber = classifyChamber(source);
    if (chamber) return `state-${normalizeStateAbbreviation(state)}-${chamber}`;
  }
  return null;
}

export function selectOpenStatesSessions(
  jurisdictionJson: unknown,
  options: {
    explicitSessionIds?: string[];
    sessionCount?: number;
    now?: Date;
  } = {},
): OpenStatesSession[] {
  const explicitSessionIds = options.explicitSessionIds ?? [];
  if (explicitSessionIds.length > 0) {
    return explicitSessionIds.map((id) => ({
      id,
      identifier: id,
      classification: [],
      active: false,
    }));
  }

  const sessionCount = Math.max(1, options.sessionCount ?? 2);
  const now = options.now ?? new Date();
  const sessions = extractOpenStatesSessions(jurisdictionJson);
  const regularSessions = sessions.filter(isRegularSession);
  const activeSessions = regularSessions.filter((session) =>
    isActiveSession(session, now),
  );
  const inactiveSessions = regularSessions.filter(
    (session) => !activeSessions.includes(session),
  );

  const selected = uniqueSessions([
    ...sortSessionsDescending(activeSessions),
    ...sortSessionsDescending(inactiveSessions),
  ]);

  return selected.slice(0, sessionCount);
}

export function createEmptyStatePlan(): PlannedStateRows {
  return {
    candidates: new Map(),
    candidateOffices: new Map(),
    bills: new Map(),
    votes: new Map(),
    counts: {
      sessionsSelected: 0,
      billsSeen: 0,
      billRowsPlanned: 0,
      voteEventsSeen: 0,
      skippedNoBillId: 0,
      skippedNoVoteDate: 0,
      skippedNoVoteOption: 0,
      skippedNoVoter: 0,
      skippedUnresolvedChamber: 0,
      voteRowsPlanned: 0,
    },
  };
}

export function planOpenStatesBill(
  billJson: unknown,
  options: { state: string; session?: OpenStatesSession },
): PlannedStateRows {
  const plan = createEmptyStatePlan();
  plan.counts.billsSeen = 1;

  const bill = asRecord(billJson);
  const billId = buildOpenStatesBillId(bill);
  if (!bill || !billId) {
    plan.counts.skippedNoBillId = 1;
    return plan;
  }

  const voteEvents = getArray(bill.votes)
    .map((value) => asRecord(value))
    .filter((value): value is UnknownRecord => Boolean(value));
  const billJurisdiction = resolveBillJurisdiction(
    options.state,
    bill,
    voteEvents,
  );

  for (const voteEvent of voteEvents) {
    plan.counts.voteEventsSeen += 1;
    planVoteEvent(plan, {
      bill,
      billId,
      voteEvent,
      state: options.state,
      session: options.session,
    });
  }

  const plannedJurisdiction =
    billJurisdiction ?? firstPlannedStateJurisdiction(plan);
  if (plan.votes.size > 0 && plannedJurisdiction) {
    plan.bills.set(
      billId,
      buildBillRow(billId, bill, plannedJurisdiction, options.session),
    );
  }

  plan.counts.billRowsPlanned = plan.bills.size;
  plan.counts.voteRowsPlanned = plan.votes.size;
  return plan;
}

export function mergeStatePlans(
  target: PlannedStateRows,
  incoming: PlannedStateRows,
): PlannedStateRows {
  for (const [id, row] of incoming.candidates) target.candidates.set(id, row);
  for (const [id, row] of incoming.candidateOffices) {
    target.candidateOffices.set(id, row);
  }
  for (const [id, row] of incoming.bills) target.bills.set(id, row);
  for (const row of incoming.votes.values()) setLatestVote(target.votes, row);

  target.counts.sessionsSelected += incoming.counts.sessionsSelected;
  target.counts.billsSeen += incoming.counts.billsSeen;
  target.counts.billRowsPlanned = target.bills.size;
  target.counts.voteEventsSeen += incoming.counts.voteEventsSeen;
  target.counts.skippedNoBillId += incoming.counts.skippedNoBillId;
  target.counts.skippedNoVoteDate += incoming.counts.skippedNoVoteDate;
  target.counts.skippedNoVoteOption += incoming.counts.skippedNoVoteOption;
  target.counts.skippedNoVoter += incoming.counts.skippedNoVoter;
  target.counts.skippedUnresolvedChamber +=
    incoming.counts.skippedUnresolvedChamber;
  target.counts.voteRowsPlanned = target.votes.size;

  return target;
}

export function resolveRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const state = normalizeStateAbbreviation(requireEnv(env, "STATE"));
  const apiKey = requireEnv(env, "OPENSTATES_API_KEY");

  // OpenStates /bills endpoint enforces max_per_page=20 and returns HTTP 400 if exceeded.
  const OPENSTATES_MAX_PER_PAGE = 20;
  return {
    state,
    jurisdictionId: buildStateJurisdictionId(state),
    openStatesBaseUrl: trimTrailingSlash(
      env.OPENSTATES_BASE_URL ?? "https://v3.openstates.org",
    ),
    openStatesApiKey: apiKey,
    perPage: Math.min(
      parsePositiveInteger(env.OPENSTATES_PER_PAGE, OPENSTATES_MAX_PER_PAGE),
      OPENSTATES_MAX_PER_PAGE,
    ),
    sessionCount: parsePositiveInteger(env.OPENSTATES_SESSION_COUNT, 2),
    explicitSessionIds: parseList(env.OPENSTATES_SESSION_IDS),
    maxBills: parseOptionalPositiveInteger(env.OPENSTATES_MAX_BILLS),
  };
}

export async function ingestStateVotes({
  db = requireDb(),
  fetcher = fetch,
  env = process.env,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<PlannedStateRows> {
  const config = resolveRuntimeConfig(env);
  console.log(
    `[state-votes:${config.state}] starting jurisdiction=${config.jurisdictionId}`,
  );

  const jurisdictionJson = await fetchOpenStatesJson(
    `/jurisdictions/${encodeURIComponent(config.jurisdictionId)}`,
    config,
    fetcher,
    { include: "legislative_sessions" },
  );
  const sessions = selectOpenStatesSessions(jurisdictionJson, {
    explicitSessionIds: config.explicitSessionIds,
    sessionCount: config.sessionCount,
  });
  const plan = createEmptyStatePlan();
  plan.counts.sessionsSelected = sessions.length;

  console.log(
    `[state-votes:${config.state}] sessions=${sessions.map((session) => session.id).join(",") || "none"}`,
  );

  for (const session of sessions) {
    for await (const bill of fetchOpenStatesBills(
      config,
      session.id,
      fetcher,
    )) {
      mergeStatePlans(
        plan,
        planOpenStatesBill(bill, { state: config.state, session }),
      );
    }
  }

  await writeStatePlan(db, plan);
  console.log(
    [
      `[state-votes:${config.state}] complete`,
      `sessions=${plan.counts.sessionsSelected}`,
      `bills_seen=${plan.counts.billsSeen}`,
      `bill_rows=${plan.bills.size}`,
      `vote_events=${plan.counts.voteEventsSeen}`,
      `candidates=${plan.candidates.size}`,
      `offices=${plan.candidateOffices.size}`,
      `votes=${plan.votes.size}`,
      `skipped_no_bill=${plan.counts.skippedNoBillId}`,
      `skipped_no_date=${plan.counts.skippedNoVoteDate}`,
      `skipped_no_option=${plan.counts.skippedNoVoteOption}`,
      `skipped_no_voter=${plan.counts.skippedNoVoter}`,
      `skipped_no_chamber=${plan.counts.skippedUnresolvedChamber}`,
    ].join(" "),
  );

  return plan;
}

async function* fetchOpenStatesBills(
  config: RuntimeConfig,
  sessionId: string,
  fetcher: Fetcher,
): AsyncGenerator<UnknownRecord> {
  let page = 1;
  let yielded = 0;

  while (true) {
    const json = await fetchOpenStatesJson("/bills", config, fetcher, {
      jurisdiction: config.jurisdictionId,
      session: sessionId,
      include: "votes",
      page: String(page),
      per_page: String(config.perPage),
    });
    const results = extractResults(json);
    for (const result of results) {
      if (config.maxBills && yielded >= config.maxBills) return;
      yielded += 1;
      yield result;
    }

    if (!hasNextPage(json, page, results.length, config.perPage)) break;
    page += 1;
  }
}

async function fetchOpenStatesJson(
  path: string,
  config: RuntimeConfig,
  fetcher: Fetcher,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(`${config.openStatesBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  if (path === "/bills") {
    url.searchParams.append("include", "sources");
    url.searchParams.append("include", "abstracts");
  }

  const response = await fetcher(url.href, {
    headers: {
      "user-agent": "voter-choice-state-ingest",
      "X-API-KEY": config.openStatesApiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`OpenStates HTTP ${response.status}`);
  }
  return response.json();
}

async function writeStatePlan(
  db: DbClient,
  plan: PlannedStateRows,
): Promise<void> {
  const batchSize = 500;
  const now = new Date();
  const candidateRows = [...plan.candidates.values()].map((row) => ({
    ...row,
    updatedAt: now,
  }));
  const officeRows = [...plan.candidateOffices.values()];
  const billRows = [...plan.bills.values()].map((row) => ({
    ...row,
    updatedAt: now,
  }));
  const voteRows = [...plan.votes.values()];

  for (const batch of chunkRows(candidateRows, batchSize)) {
    await db
      .insert(candidates)
      .values(batch)
      .onConflictDoUpdate({
        target: candidates.id,
        set: {
          fullName: sql`excluded.full_name`,
          sourceId: sql`excluded.source_id`,
          jurisdiction: sql`excluded.jurisdiction`,
          isIncumbent: sql`excluded.is_incumbent`,
          rawMetadata: sql`excluded.raw_metadata`,
          updatedAt: now,
        },
      });
  }

  for (const batch of chunkRows(officeRows, batchSize)) {
    await db
      .insert(candidateOffices)
      .values(batch)
      .onConflictDoUpdate({
        target: candidateOffices.id,
        set: {
          candidateId: sql`excluded.candidate_id`,
          officeLabel: sql`excluded.office_label`,
          jurisdiction: sql`excluded.jurisdiction`,
          termStart: sql`excluded.term_start`,
          termEnd: sql`excluded.term_end`,
          sourceUrl: sql`excluded.source_url`,
        },
      });
  }

  for (const batch of chunkRows(billRows, batchSize)) {
    await db
      .insert(bills)
      .values(batch)
      .onConflictDoUpdate({
        target: bills.id,
        set: {
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          jurisdiction: sql`excluded.jurisdiction`,
          introducedDate: sql`excluded.introduced_date`,
          rawMetadata: sql`excluded.raw_metadata`,
          updatedAt: now,
        },
      });
  }

  for (const batch of chunkRows(voteRows, batchSize)) {
    await db
      .insert(votes)
      .values(batch)
      .onConflictDoUpdate({
        target: [votes.billId, votes.candidateId],
        set: {
          voteCast: sql`excluded.vote_cast`,
          voteDate: sql`excluded.vote_date`,
          sourceUrl: sql`excluded.source_url`,
          rawMetadata: sql`excluded.raw_metadata`,
        },
        setWhere: sql`excluded.vote_date >= ${votes.voteDate}`,
      });
  }
}

function planVoteEvent(
  plan: PlannedStateRows,
  {
    bill,
    billId,
    voteEvent,
    state,
    session,
  }: {
    bill: UnknownRecord;
    billId: string;
    voteEvent: UnknownRecord;
    state: string;
    session?: OpenStatesSession;
  },
) {
  const voteDate = normalizeDate(getString(voteEvent, "start_date"));
  if (!voteDate) {
    plan.counts.skippedNoVoteDate += getPersonVotes(voteEvent).length || 1;
    return;
  }

  const eventJurisdiction = classifyStateJurisdiction(
    state,
    asRecord(voteEvent.organization),
    asRecord(bill.from_organization),
  );
  const sourceUrl =
    getSourceUrl(voteEvent) ??
    getSourceUrl(bill) ??
    getString(bill, "openstates_url");

  for (const personVote of getPersonVotes(voteEvent)) {
    const voteCast = normalizeStateVoteCast(getString(personVote, "option"));
    if (!voteCast) {
      plan.counts.skippedNoVoteOption += 1;
      continue;
    }

    const voter = asRecord(personVote.voter);
    const candidateId = buildOpenStatesCandidateId(voter);
    if (!voter || !candidateId) {
      plan.counts.skippedNoVoter += 1;
      continue;
    }

    const jurisdiction =
      eventJurisdiction ??
      classifyStateJurisdiction(state, asRecord(voter.current_role));
    if (!jurisdiction) {
      plan.counts.skippedUnresolvedChamber += 1;
      continue;
    }

    const office = buildOfficeRow({
      candidateId,
      jurisdiction,
      state,
      sourceUrl: sourceUrl ?? getString(bill, "openstates_url") ?? "",
      session,
      voteDate,
    });

    plan.candidates.set(
      candidateId,
      buildCandidateRow(candidateId, voter, jurisdiction),
    );
    plan.candidateOffices.set(office.id!, office);
    setLatestVote(
      plan.votes,
      buildVoteRow({
        billId,
        candidateId,
        voteCast,
        voteDate,
        sourceUrl: sourceUrl ?? getString(bill, "openstates_url") ?? "",
        bill,
        voteEvent,
        personVote,
      }),
    );
  }
}

function buildBillRow(
  billId: string,
  bill: UnknownRecord,
  jurisdiction: StateJurisdiction,
  session?: OpenStatesSession,
): BillRow {
  const abstracts = getArray(bill.abstracts);
  const firstAbstract = asRecord(abstracts[0]);
  const subject = getArray(bill.subject)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join("; ");
  const summary =
    getString(firstAbstract, "abstract") ??
    getString(firstAbstract, "note") ??
    (subject || undefined);

  return {
    id: billId,
    title:
      getString(bill, "title") ??
      getString(bill, "identifier") ??
      "Untitled state bill",
    summary,
    source: "openstates",
    sourceUrl: getString(bill, "openstates_url") ?? getSourceUrl(bill) ?? "",
    jurisdiction,
    introducedDate: normalizeDate(getString(bill, "first_action_date")),
    rawMetadata: stripUndefined({
      openstates: {
        id: getString(bill, "id"),
        session: getString(bill, "session"),
        jurisdiction: bill.jurisdiction,
        fromOrganization: bill.from_organization,
        identifier: getString(bill, "identifier"),
        subject: bill.subject,
        abstracts: bill.abstracts,
        sources: bill.sources,
        sessionMetadata: session,
      },
    }),
  };
}

function buildCandidateRow(
  candidateId: string,
  voter: UnknownRecord,
  jurisdiction: StateJurisdiction,
): CandidateRow {
  return {
    id: candidateId,
    fullName:
      getString(voter, "name") ??
      getString(voter, "sort_name") ??
      "Unknown state legislator",
    sourceId: getString(voter, "id") ?? candidateId,
    jurisdiction,
    isIncumbent: true,
    rawMetadata: stripUndefined({ openstates: voter }),
  };
}

function buildOfficeRow({
  candidateId,
  jurisdiction,
  state,
  sourceUrl,
  session,
  voteDate,
}: {
  candidateId: string;
  jurisdiction: StateJurisdiction;
  state: string;
  sourceUrl: string;
  session?: OpenStatesSession;
  voteDate: string;
}): CandidateOfficeRow {
  const chamber = jurisdiction.endsWith("-senate") ? "Senate" : "House";
  const termStart = session?.startDate ?? `${voteDate.slice(0, 4)}-01-01`;
  const id = deterministicUuid(
    `${candidateId}:${jurisdiction}:${termStart}:${session?.id ?? "unknown"}`,
  );

  return {
    id,
    candidateId,
    officeLabel: `${normalizeStateAbbreviation(state)} ${chamber}`,
    jurisdiction,
    termStart,
    termEnd: session?.endDate,
    sourceUrl,
  };
}

function buildVoteRow({
  billId,
  candidateId,
  voteCast,
  voteDate,
  sourceUrl,
  bill,
  voteEvent,
  personVote,
}: {
  billId: string;
  candidateId: string;
  voteCast: NormalizedStateVoteCast;
  voteDate: string;
  sourceUrl: string;
  bill: UnknownRecord;
  voteEvent: UnknownRecord;
  personVote: UnknownRecord;
}): VoteRow {
  return {
    billId,
    candidateId,
    voteCast,
    voteDate,
    sourceUrl,
    rawMetadata: stripUndefined({
      openstates: {
        bill: {
          id: getString(bill, "id"),
          identifier: getString(bill, "identifier"),
          session: getString(bill, "session"),
        },
        voteEvent: stripVoteEventForMetadata(voteEvent),
        personVote,
      },
    }),
  };
}

function resolveBillJurisdiction(
  state: string,
  bill: UnknownRecord,
  voteEvents: UnknownRecord[],
): StateJurisdiction | null {
  return classifyStateJurisdiction(
    state,
    asRecord(bill.from_organization),
    ...voteEvents.map((voteEvent) => asRecord(voteEvent.organization)),
  );
}

function firstPlannedStateJurisdiction(
  plan: PlannedStateRows,
): StateJurisdiction | null {
  for (const candidate of plan.candidates.values()) {
    if (isStateJurisdiction(candidate.jurisdiction)) {
      return candidate.jurisdiction;
    }
  }
  return null;
}

function isStateJurisdiction(value: string): value is StateJurisdiction {
  return /^state-[A-Z]{2}-(house|senate)$/u.test(value);
}

function getPersonVotes(voteEvent: UnknownRecord): UnknownRecord[] {
  return getArray(voteEvent.votes)
    .map((value) => asRecord(value))
    .filter((value): value is UnknownRecord => Boolean(value));
}

function classifyChamber(source: unknown): StateChamber | null {
  const record = asRecord(source);
  if (!record) return null;

  const candidates = [
    getString(record, "classification"),
    getString(record, "org_classification"),
    getString(record, "name"),
    getString(record, "title"),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => /\b(upper|senate|senator)\b/u.test(value))) {
    return "senate";
  }
  if (
    candidates.some((value) =>
      /\b(lower|house|assembly|delegate|representative)\b/u.test(value),
    )
  ) {
    return "house";
  }
  return null;
}

function extractOpenStatesSessions(
  jurisdictionJson: unknown,
): OpenStatesSession[] {
  const record = asRecord(jurisdictionJson);
  const jurisdiction =
    asRecord(record?.jurisdiction) ?? asRecord(record?.result) ?? record;
  const sessions = getArray(
    jurisdiction?.legislative_sessions ?? jurisdiction?.legislativeSessions,
  );

  return sessions
    .map((value) => asRecord(value))
    .filter((value): value is UnknownRecord => Boolean(value))
    .flatMap((session) => {
      const id = getString(session, "id") ?? getString(session, "identifier");
      if (!id) return [];
      return [
        {
          id,
          name: getString(session, "name") ?? undefined,
          identifier: getString(session, "identifier") ?? undefined,
          classification: extractClassification(session),
          startDate: normalizeDate(getString(session, "start_date")),
          endDate: normalizeDate(getString(session, "end_date")),
          active: getBoolean(session, "active") ?? false,
        },
      ];
    });
}

function extractClassification(session: UnknownRecord): string[] {
  const classification = session.classification;
  if (Array.isArray(classification)) {
    return classification
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase());
  }
  const single = getString(session, "classification");
  return single ? [single.toLowerCase()] : [];
}

function isRegularSession(session: OpenStatesSession): boolean {
  if (session.classification.length === 0) return true;
  return session.classification.some((value) =>
    /\b(primary|regular)\b/u.test(value),
  );
}

function isActiveSession(session: OpenStatesSession, now: Date): boolean {
  if (session.active) return true;
  const start = session.startDate ? Date.parse(session.startDate) : null;
  const end = session.endDate ? Date.parse(session.endDate) : null;
  const current = now.getTime();
  return Boolean(
    start && current >= start && (!end || current <= end + 24 * 60 * 60 * 1000),
  );
}

function sortSessionsDescending(
  sessions: OpenStatesSession[],
): OpenStatesSession[] {
  return [...sessions].sort((left, right) => {
    return sessionSortValue(right) - sessionSortValue(left);
  });
}

function sessionSortValue(session: OpenStatesSession): number {
  const direct = Date.parse(session.endDate ?? session.startDate ?? "");
  if (!Number.isNaN(direct)) return direct;
  const numeric = Number.parseInt(
    session.identifier ?? session.name ?? session.id,
    10,
  );
  return Number.isInteger(numeric) ? numeric : 0;
}

function uniqueSessions(sessions: OpenStatesSession[]): OpenStatesSession[] {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}

function extractResults(json: unknown): UnknownRecord[] {
  if (Array.isArray(json)) {
    return json
      .map((value) => asRecord(value))
      .filter((value): value is UnknownRecord => Boolean(value));
  }

  const record = asRecord(json);
  const results = getArray(record?.results ?? record?.data);
  return results
    .map((value) => asRecord(value))
    .filter((value): value is UnknownRecord => Boolean(value));
}

function hasNextPage(
  json: unknown,
  currentPage: number,
  resultCount: number,
  perPage: number,
): boolean {
  const pagination = asRecord(asRecord(json)?.pagination);
  const maxPage =
    getNumber(pagination, "max_page") ??
    getNumber(pagination, "maxPage") ??
    getNumber(pagination, "total_pages");
  if (maxPage) return currentPage < maxPage;

  const total =
    getNumber(pagination, "total_items") ?? getNumber(pagination, "total");
  if (total) return currentPage * perPage < total;

  return resultCount >= perPage;
}

function setLatestVote(voteMap: Map<string, VoteRow>, voteRow: VoteRow) {
  const key = `${voteRow.billId}|${voteRow.candidateId}`;
  const existing = voteMap.get(key);
  if (!existing || voteRow.voteDate >= existing.voteDate) {
    voteMap.set(key, voteRow);
  }
}

function getSourceUrl(record: UnknownRecord): string | null {
  const source = getArray(record.sources)
    .map((value) => asRecord(value))
    .find((value): value is UnknownRecord => Boolean(getString(value, "url")));
  return getString(source, "url");
}

function stripVoteEventForMetadata(voteEvent: UnknownRecord): UnknownRecord {
  const { votes: _votes, ...rest } = voteEvent;
  return rest;
}

function normalizeStateAbbreviation(state: string): string {
  const normalized = state.trim().toUpperCase();
  if (!/^[A-Z]{2}$/u.test(normalized)) {
    throw new Error("STATE must be a two-letter state abbreviation.");
  }
  return normalized;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`${key} is required for state vote ingest.`);
  return value;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalPositiveInteger(
  value: string | undefined,
): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const direct = /^\d{4}-\d{2}-\d{2}/u.exec(value);
  if (direct) return direct[0];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function deterministicUuid(input: string): string {
  const hash = createHash("sha1").update(input).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function sanitizeIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function getString(
  record: UnknownRecord | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getNumber(
  record: UnknownRecord | null | undefined,
  key: string,
): number | null {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

function getBoolean(
  record: UnknownRecord | null | undefined,
  key: string,
): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size));
  }
  return batches;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function stripUndefined<T extends UnknownRecord>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/gu, " ");
  return "unknown";
}

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  ingestStateVotes().catch((error) => {
    console.error("[state-votes] failed:", safeErrorMessage(error));
    process.exitCode = 1;
  });
}

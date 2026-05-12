import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { bills, candidateOffices, candidates, votes } from "../../db/schema";
import {
  ALL_STATE_ABBREVIATIONS,
  type NormalizedStateVoteCast,
} from "./state-votes";

type StateChamber = "house" | "senate";
type StateJurisdiction = `state-${string}-${StateChamber}`;

type CandidateRow = typeof candidates.$inferInsert;
type CandidateOfficeRow = typeof candidateOffices.$inferInsert;
type BillRow = typeof bills.$inferInsert;
type VoteRow = typeof votes.$inferInsert;

type StateSummary = {
  state: string;
  candidates: number;
  bills: number;
  votes: number;
};

type DumpSession = {
  id: string;
  identifier: string;
  start_date: string | null;
  end_date: string | null;
};

type DumpJurisdiction = {
  id: string;
  name: string;
};

type DumpPerson = {
  id: string;
  name: string;
  primary_party: string | null;
};

type DumpOrganization = {
  id: string;
  classification: string;
};

type DumpBill = {
  id: string;
  identifier: string;
  title: string;
  classification: string[] | string | null;
  first_action_date: string | null;
  abstract: string | null;
  session_id: string | null;
};

type DumpVoteEvent = {
  id: string;
  bill_id: string;
  start_date: string | null;
  organization_id: string;
};

type DumpPersonVote = {
  vote_event_id: string;
  option: string;
  voter_id: string | null;
  person_id: string | null;
};

type StateAccum = {
  candidates: Map<string, CandidateRow>;
  offices: Map<string, CandidateOfficeRow>;
  bills: Map<string, BillRow>;
  votes: Map<string, VoteRow>;
};

function newAccum(): StateAccum {
  return {
    candidates: new Map(),
    offices: new Map(),
    bills: new Map(),
    votes: new Map(),
  };
}

function normalizeVoteCast(option: string): NormalizedStateVoteCast {
  const normalized = option.trim().toLowerCase();
  if (["yes", "yea"].includes(normalized)) return "yea";
  if (["no", "nay"].includes(normalized)) return "nay";
  if (normalized === "present") return "present";
  return "not_voting";
}

function extractStateAbbreviation(jurisdictionId: string): string | null {
  const match = /\/state:([a-z]{2})\//u.exec(jurisdictionId);
  if (!match) return null;
  return match[1].toUpperCase();
}

function buildCandidateId(personId: string): string {
  return `openstates-${sanitizeIdPart(personId)}`;
}

function buildBillId(billId: string): string {
  return `openstates-${sanitizeIdPart(billId)}`;
}

function sanitizeIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
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

function normalizeDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^\d{4}-\d{2}-\d{2}/u.exec(value);
  if (match) return match[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function chamberFromClassification(
  classification: string,
): StateChamber | null {
  if (classification === "upper") return "senate";
  if (classification === "lower") return "house";
  return null;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }
  return batches;
}

async function writeCandidates(
  db: DbClient,
  rows: CandidateRow[],
  now: Date,
): Promise<void> {
  for (const batch of chunkRows(
    rows.map((r) => ({ ...r, updatedAt: now })),
    500,
  )) {
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
}

async function writeOffices(
  db: DbClient,
  rows: CandidateOfficeRow[],
): Promise<void> {
  for (const batch of chunkRows(rows, 500)) {
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
}

async function writeBills(
  db: DbClient,
  rows: BillRow[],
  now: Date,
): Promise<void> {
  for (const batch of chunkRows(
    rows.map((r) => ({ ...r, updatedAt: now })),
    500,
  )) {
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
}

async function writeVotes(db: DbClient, rows: VoteRow[]): Promise<void> {
  for (const batch of chunkRows(rows, 500)) {
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

async function flushAccum(db: DbClient, accum: StateAccum): Promise<void> {
  if (
    accum.candidates.size === 0 &&
    accum.bills.size === 0 &&
    accum.votes.size === 0
  ) {
    return;
  }
  const now = new Date();
  await writeCandidates(db, [...accum.candidates.values()], now);
  await writeOffices(db, [...accum.offices.values()]);
  await writeBills(db, [...accum.bills.values()], now);
  await writeVotes(db, [...accum.votes.values()]);
}

function buildOfficeRow(
  candidateId: string,
  rawPersonId: string,
  eventJurisdiction: StateJurisdiction,
  state: string,
  termStart: string,
  session: DumpSession | null,
): CandidateOfficeRow {
  const officeId = deterministicUuid(
    `${candidateId}:${eventJurisdiction}:${termStart}:${session?.id ?? "unknown"}`,
  );
  const chamber = eventJurisdiction.endsWith("-senate") ? "Senate" : "House";
  return {
    id: officeId,
    candidateId,
    officeLabel: `${state} ${chamber}`,
    jurisdiction: eventJurisdiction,
    termStart,
    termEnd: session?.end_date
      ? (normalizeDate(session.end_date) ?? undefined)
      : undefined,
    sourceUrl: `https://openstates.org/person/${rawPersonId}/`,
  };
}

function recordPersonVote(
  accum: StateAccum,
  {
    pv,
    bill,
    billId,
    voteDate,
    eventJurisdiction,
    voteEventId,
    personMap,
    sessionForBill,
    state,
  }: {
    pv: DumpPersonVote;
    bill: DumpBill;
    billId: string;
    voteDate: string;
    eventJurisdiction: StateJurisdiction;
    voteEventId: string;
    personMap: Map<string, DumpPerson>;
    sessionForBill: DumpSession | null;
    state: string;
  },
): void {
  const resolvedPersonId = pv.person_id ?? pv.voter_id;
  if (!resolvedPersonId) return;

  const person = personMap.get(resolvedPersonId);
  if (!person) return;

  const candidateId = buildCandidateId(resolvedPersonId);
  const voteCast = normalizeVoteCast(pv.option);
  const termStart =
    normalizeDate(sessionForBill?.start_date) ??
    `${voteDate.slice(0, 4)}-01-01`;

  accum.candidates.set(candidateId, {
    id: candidateId,
    fullName: person.name,
    sourceId: resolvedPersonId,
    jurisdiction: eventJurisdiction,
    isIncumbent: true,
    rawMetadata: {
      openstates: { id: resolvedPersonId, primary_party: person.primary_party },
    },
  });

  const officeRow = buildOfficeRow(
    candidateId,
    resolvedPersonId,
    eventJurisdiction,
    state,
    termStart,
    sessionForBill,
  );
  accum.offices.set(officeRow.id!, officeRow);

  const voteKey = `${billId}|${candidateId}`;
  const voteRow: VoteRow = {
    billId,
    candidateId,
    voteCast,
    voteDate,
    sourceUrl: `https://openstates.org/bills/${bill.id}/`,
    rawMetadata: {
      openstates: {
        bill: { id: bill.id, identifier: bill.identifier },
        voteEventId,
        option: pv.option,
      },
    },
  };
  const existing = accum.votes.get(voteKey);
  if (!existing || voteDate >= existing.voteDate) {
    accum.votes.set(voteKey, voteRow);
  }
}

function processBillVoteEvent(
  accum: StateAccum,
  {
    ve,
    bill,
    billId,
    orgMap,
    personVoteMap,
    personMap,
    sessionForBill,
    state,
  }: {
    ve: DumpVoteEvent;
    bill: DumpBill;
    billId: string;
    orgMap: Map<string, DumpOrganization>;
    personVoteMap: Map<string, DumpPersonVote[]>;
    personMap: Map<string, DumpPerson>;
    sessionForBill: DumpSession | null;
    state: string;
  },
): StateJurisdiction | null {
  const voteDate = normalizeDate(ve.start_date);
  if (!voteDate) return null;

  const org = orgMap.get(ve.organization_id);
  const chamber = org ? chamberFromClassification(org.classification) : null;
  const eventJurisdiction: StateJurisdiction | null = chamber
    ? `state-${state}-${chamber}`
    : null;

  if (!eventJurisdiction) return null;

  const personVotes = personVoteMap.get(ve.id) ?? [];
  for (const pv of personVotes) {
    recordPersonVote(accum, {
      pv,
      bill,
      billId,
      voteDate,
      eventJurisdiction,
      voteEventId: ve.id,
      personMap,
      sessionForBill,
      state,
    });
  }

  return eventJurisdiction;
}

type BillContext = {
  billId: string;
  sessionForBill: DumpSession | null;
};

function resolveBillContext(
  bill: DumpBill,
  sessionMap: Map<string, DumpSession>,
): BillContext {
  const sessionForBill = bill.session_id
    ? (sessionMap.get(bill.session_id) ?? null)
    : null;
  return {
    billId: buildBillId(bill.id),
    sessionForBill,
  };
}

function buildBillRow(
  bill: DumpBill,
  billId: string,
  jurisdiction: StateJurisdiction,
): BillRow {
  return {
    id: billId,
    title: bill.title || bill.identifier || "Untitled state bill",
    summary: bill.abstract ?? undefined,
    source: "openstates",
    sourceUrl: `https://openstates.org/bills/${bill.id}/`,
    jurisdiction,
    introducedDate: normalizeDate(bill.first_action_date),
    rawMetadata: {
      openstates: {
        id: bill.id,
        identifier: bill.identifier,
        classification: bill.classification,
        session_id: bill.session_id,
      },
    },
  };
}

function processBill(
  accum: StateAccum,
  {
    bill,
    voteEvents,
    orgMap,
    personVoteMap,
    personMap,
    sessionMap,
    state,
  }: {
    bill: DumpBill;
    voteEvents: DumpVoteEvent[];
    orgMap: Map<string, DumpOrganization>;
    personVoteMap: Map<string, DumpPersonVote[]>;
    personMap: Map<string, DumpPerson>;
    sessionMap: Map<string, DumpSession>;
    state: string;
  },
): void {
  if (voteEvents.length === 0) return;

  const ctx = resolveBillContext(bill, sessionMap);
  let resolvedJurisdiction: StateJurisdiction | null = null;
  const votesBefore = accum.votes.size;

  for (const ve of voteEvents) {
    const eventJurisdiction = processBillVoteEvent(accum, {
      ve,
      bill,
      billId: ctx.billId,
      orgMap,
      personVoteMap,
      personMap,
      sessionForBill: ctx.sessionForBill,
      state,
    });
    if (eventJurisdiction && !resolvedJurisdiction) {
      resolvedJurisdiction = eventJurisdiction;
    }
  }

  if (accum.votes.size > votesBefore && resolvedJurisdiction) {
    accum.bills.set(
      ctx.billId,
      buildBillRow(bill, ctx.billId, resolvedJurisdiction),
    );
  }
}

async function loadPersonVotes(
  pool: Pool,
  voteEventIds: string[],
): Promise<Map<string, DumpPersonVote[]>> {
  const personVoteMap = new Map<string, DumpPersonVote[]>();
  if (voteEventIds.length === 0) return personVoteMap;

  const pvBatchSize = 1000;
  for (let i = 0; i < voteEventIds.length; i += pvBatchSize) {
    const batchIds = voteEventIds.slice(i, i + pvBatchSize);
    const pvRes = await pool.query<DumpPersonVote>(
      `SELECT pv.vote_event_id, pv.option,
              pv.voter_id,
              p.id AS person_id
       FROM opencivicdata_personvote pv
       LEFT JOIN opencivicdata_person p ON p.id = pv.voter_id
       WHERE pv.vote_event_id = ANY($1)`,
      [batchIds],
    );
    for (const pv of pvRes.rows) {
      const list = personVoteMap.get(pv.vote_event_id) ?? [];
      list.push(pv);
      personVoteMap.set(pv.vote_event_id, list);
    }
  }
  return personVoteMap;
}

async function ingestState(
  state: string,
  jurisdiction: DumpJurisdiction,
  pool: Pool,
  db: DbClient,
): Promise<StateSummary> {
  const sessionLimit = Number(process.env.SESSION_LIMIT ?? "2");
  const sessionsRes = await pool.query<DumpSession>(
    `SELECT id, identifier, start_date, end_date
     FROM opencivicdata_legislativesession
     WHERE jurisdiction_id = $1
     ORDER BY start_date DESC NULLS LAST
     LIMIT $2`,
    [jurisdiction.id, sessionLimit],
  );
  const sessions = sessionsRes.rows;
  const sessionIds = sessions.map((s) => s.id);
  const sessionMap = new Map<string, DumpSession>(
    sessions.map((s) => [s.id, s]),
  );

  if (sessionIds.length === 0) {
    console.log(`[${state}] candidates=0 bills=0 votes=0`);
    return { state, candidates: 0, bills: 0, votes: 0 };
  }

  const personsRes = await pool.query<DumpPerson>(
    `SELECT id, name, primary_party
     FROM opencivicdata_person
     WHERE current_jurisdiction_id = $1
       AND current_role IS NOT NULL`,
    [jurisdiction.id],
  );
  const personMap = new Map<string, DumpPerson>(
    personsRes.rows.map((p) => [p.id, p]),
  );

  const orgsRes = await pool.query<DumpOrganization>(
    `SELECT id, classification FROM opencivicdata_organization
     WHERE jurisdiction_id = $1`,
    [jurisdiction.id],
  );
  const orgMap = new Map<string, DumpOrganization>(
    orgsRes.rows.map((o) => [o.id, o]),
  );

  const billsRes = await pool.query<DumpBill>(
    `SELECT b.id, b.identifier, b.title, b.classification,
            b.first_action_date,
            ba.abstract,
            b.legislative_session_id AS session_id
     FROM opencivicdata_bill b
     LEFT JOIN LATERAL (
       SELECT abstract FROM opencivicdata_billabstract
       WHERE bill_id = b.id
       ORDER BY note LIMIT 1
     ) ba ON true
     WHERE b.legislative_session_id = ANY($1)`,
    [sessionIds],
  );

  const voteEventsRes = await pool.query<DumpVoteEvent>(
    `SELECT id, bill_id, start_date, organization_id
     FROM opencivicdata_voteevent
     WHERE legislative_session_id = ANY($1)`,
    [sessionIds],
  );

  const voteEventMap = new Map<string, DumpVoteEvent[]>();
  const allVoteEventIds: string[] = [];
  for (const ve of voteEventsRes.rows) {
    const list = voteEventMap.get(ve.bill_id) ?? [];
    list.push(ve);
    voteEventMap.set(ve.bill_id, list);
    allVoteEventIds.push(ve.id);
  }

  const personVoteMap = await loadPersonVotes(pool, allVoteEventIds);

  const accum = newAccum();
  for (const bill of billsRes.rows) {
    processBill(accum, {
      bill,
      voteEvents: voteEventMap.get(bill.id) ?? [],
      orgMap,
      personVoteMap,
      personMap,
      sessionMap,
      state,
    });
  }

  await flushAccum(db, accum);

  const summary: StateSummary = {
    state,
    candidates: accum.candidates.size,
    bills: accum.bills.size,
    votes: accum.votes.size,
  };
  console.log(
    `[${state}] candidates=${summary.candidates} bills=${summary.bills} votes=${summary.votes}`,
  );
  return summary;
}

async function loadJurisdictions(
  pool: Pool,
  targetStates: readonly string[],
): Promise<DumpJurisdiction[]> {
  const likeConditions = targetStates
    .map((s) => `id LIKE '%/state:${s.toLowerCase()}/%'`)
    .join(" OR ");
  const res = await pool.query<DumpJurisdiction>(
    `SELECT id, name
     FROM opencivicdata_jurisdiction
     WHERE classification = 'state'
       AND (${likeConditions})`,
  );
  return res.rows;
}

async function ingestFromDump(): Promise<void> {
  const localUrl = requireEnv("LOCAL_OPENSTATES_URL");
  const db = requireDb();

  const stateFilter = process.env.STATE?.trim().toUpperCase() ?? null;
  const targetStates: readonly string[] = stateFilter
    ? [stateFilter]
    : ALL_STATE_ABBREVIATIONS;

  const pool = new Pool({ connectionString: localUrl, max: 3 });

  const jurisdictions = await loadJurisdictions(pool, targetStates);
  const summaries: StateSummary[] = [];

  for (const jurisdiction of jurisdictions) {
    const state = extractStateAbbreviation(jurisdiction.id);
    if (
      !state ||
      !(ALL_STATE_ABBREVIATIONS as readonly string[]).includes(state)
    ) {
      continue;
    }

    try {
      const summary = await ingestState(state, jurisdiction, pool, db);
      summaries.push(summary);
    } catch (error) {
      console.error(`[${state}] error: ${safeErrorMessage(error)}`);
    }
  }

  await pool.end();
  printSummaryTable(summaries);
}

function printSummaryTable(summaries: StateSummary[]): void {
  const header = "| state | candidates | bills | votes |";
  const separator = "|-------|-----------|-------|-------|";
  const totals = summaries.reduce(
    (acc, s) => ({
      candidates: acc.candidates + s.candidates,
      bills: acc.bills + s.bills,
      votes: acc.votes + s.votes,
    }),
    { candidates: 0, bills: 0, votes: 0 },
  );

  console.log("");
  console.log(header);
  console.log(separator);
  for (const s of summaries) {
    console.log(`| ${s.state} | ${s.candidates} | ${s.bills} | ${s.votes} |`);
  }
  console.log(separator);
  console.log(
    `| **TOTAL** | **${totals.candidates}** | **${totals.bills}** | **${totals.votes}** |`,
  );
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required.`);
  return value;
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
  ingestFromDump().catch((error) => {
    console.error("[state-votes-from-dump] failed:", safeErrorMessage(error));
    process.exitCode = 1;
  });
}

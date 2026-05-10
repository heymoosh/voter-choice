/**
 * Federal roll-call ingest from GovTrack bulk JSON.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> npx tsx scripts/ingest/federal-votes.ts
 */

import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { bills, candidateOffices, candidates, votes } from "../../db/schema";

export type NormalizedVoteCast =
  | "yea"
  | "nay"
  | "present"
  | "absent"
  | "not_voting";

type ChamberCode = "h" | "s";
type FederalJurisdiction = "federal-house" | "federal-senate";
type Fetcher = typeof fetch;

type UnknownRecord = Record<string, unknown>;

type CandidateRow = typeof candidates.$inferInsert;
type CandidateOfficeRow = typeof candidateOffices.$inferInsert;
type BillRow = typeof bills.$inferInsert;
type VoteRow = typeof votes.$inferInsert;

export type PlannedFederalRows = {
  candidates: Map<string, CandidateRow>;
  candidateOffices: Map<string, CandidateOfficeRow>;
  bills: Map<string, BillRow>;
  votes: Map<string, VoteRow>;
  counts: {
    rollCallsSeen: number;
    billRollCalls: number;
    skippedNonBillRollCalls: number;
    skippedMalformedVotes: number;
    voteRowsPlanned: number;
  };
};

export type RuntimeConfig = {
  congresses: number[];
  govtrackBaseUrl: string;
  congressGovBaseUrl: string;
  congressGovApiKey?: string;
  pageSize: number;
};

type BillIdentity = {
  id: string;
  congress: number;
  type: string;
  number: string;
};

type VoteEntry = {
  label: string;
  member: UnknownRecord;
};

type BillEnrichment = {
  title?: string;
  summary?: string;
  introducedDate?: string;
  policyArea?: string;
  raw: UnknownRecord;
};

export function normalizeVoteCast(value: unknown): NormalizedVoteCast | null {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const trimmed = raw.trim();
  if (trimmed === "+") return "yea";
  if (trimmed === "-") return "nay";

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  if (["+", "aye", "yea", "yes", "y", "for"].includes(normalized)) {
    return "yea";
  }
  if (["-", "nay", "no", "n", "against"].includes(normalized)) {
    return "nay";
  }
  if (["p", "present", "present voting"].includes(normalized)) {
    return "present";
  }
  if (["absent", "excused"].includes(normalized)) {
    return "absent";
  }
  if (
    ["0", "not voting", "not voted", "did not vote", "didnt vote"].includes(
      normalized,
    )
  ) {
    return "not_voting";
  }

  return null;
}

export function buildCandidateId(member: unknown): string | null {
  const record = asRecord(member);
  if (!record) return null;

  const bioguide = findNestedString(record, [
    "bioguide",
    "bioguide_id",
    "bioguideid",
    "bioguideId",
  ]);
  if (bioguide) return `federal-${sanitizeIdPart(bioguide).toUpperCase()}`;

  const fallback = findNestedString(record, [
    "govtrack_id",
    "govtrackId",
    "id",
  ]);
  if (!fallback) return null;

  return `federal-govtrack-${sanitizeIdPart(fallback)}`;
}

export function buildGovTrackBillId(bill: unknown): string | null {
  const identity = extractBillIdentity(asRecord(bill), undefined);
  return identity?.id ?? null;
}

export function createEmptyPlan(): PlannedFederalRows {
  return {
    candidates: new Map(),
    candidateOffices: new Map(),
    bills: new Map(),
    votes: new Map(),
    counts: {
      rollCallsSeen: 0,
      billRollCalls: 0,
      skippedNonBillRollCalls: 0,
      skippedMalformedVotes: 0,
      voteRowsPlanned: 0,
    },
  };
}

export function planGovTrackVote(
  voteJson: unknown,
  options: { dataUrl: string },
): PlannedFederalRows {
  const plan = createEmptyPlan();
  plan.counts.rollCallsSeen = 1;

  const vote = asRecord(voteJson);
  if (!vote) {
    plan.counts.skippedNonBillRollCalls = 1;
    return plan;
  }

  const billIdentity = extractBillIdentity(extractBillRecord(vote), vote);
  if (!billIdentity) {
    plan.counts.skippedNonBillRollCalls = 1;
    return plan;
  }

  const chamber = extractChamber(vote, options.dataUrl);
  const jurisdiction = chamberToJurisdiction(chamber);
  const voteDate = extractVoteDate(vote);
  const sourceUrl = getString(vote, "source_url") ?? options.dataUrl;
  const billRecord = extractBillRecord(vote);

  plan.counts.billRollCalls = 1;
  plan.bills.set(
    billIdentity.id,
    buildBillRow(billIdentity, billRecord, vote, sourceUrl, jurisdiction),
  );

  for (const entry of extractVoteEntries(vote)) {
    const voteCast = normalizeVoteCast(entry.label);
    const candidateId = buildCandidateId(entry.member);
    if (!voteCast || !candidateId) {
      plan.counts.skippedMalformedVotes += 1;
      continue;
    }

    const candidate = buildCandidateRow(
      candidateId,
      entry.member,
      jurisdiction,
    );
    const office = buildOfficeRow(
      candidateId,
      jurisdiction,
      chamber,
      billIdentity.congress,
      sourceUrl,
    );
    const voteRow = buildVoteRow({
      billId: billIdentity.id,
      candidateId,
      voteCast,
      voteDate,
      sourceUrl,
      vote,
      member: entry.member,
      rollCallDataUrl: options.dataUrl,
    });

    plan.candidates.set(candidateId, candidate);
    plan.candidateOffices.set(office.id!, office);
    setLatestVote(plan.votes, voteRow);
  }

  plan.counts.voteRowsPlanned = plan.votes.size;
  return plan;
}

export function mergeFederalPlans(
  target: PlannedFederalRows,
  incoming: PlannedFederalRows,
): PlannedFederalRows {
  for (const [id, row] of incoming.candidates) target.candidates.set(id, row);
  for (const [id, row] of incoming.candidateOffices) {
    target.candidateOffices.set(id, row);
  }
  for (const [id, row] of incoming.bills) target.bills.set(id, row);
  for (const row of incoming.votes.values()) setLatestVote(target.votes, row);

  target.counts.rollCallsSeen += incoming.counts.rollCallsSeen;
  target.counts.billRollCalls += incoming.counts.billRollCalls;
  target.counts.skippedNonBillRollCalls +=
    incoming.counts.skippedNonBillRollCalls;
  target.counts.skippedMalformedVotes += incoming.counts.skippedMalformedVotes;
  target.counts.voteRowsPlanned = target.votes.size;

  return target;
}

export function resolveRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
): RuntimeConfig {
  const currentCongress = getCurrentCongress(now);
  const congresses = parseCongressList(env.CONGRESS);
  const baseCongress = congresses[0] ?? currentCongress;
  const backfillCount = parseNonNegativeInteger(env.BACKFILL_CONGRESSES, 1);

  return {
    congresses:
      congresses.length > 0
        ? congresses
        : Array.from({ length: backfillCount + 1 }, (_, index) => {
            return baseCongress - index;
          }),
    govtrackBaseUrl: trimTrailingSlash(
      env.GOVTRACK_BASE_URL ?? "https://www.govtrack.us/api/v2",
    ),
    congressGovBaseUrl: trimTrailingSlash(
      env.CONGRESS_GOV_BASE_URL ?? "https://api.congress.gov/v3",
    ),
    congressGovApiKey: env.CONGRESS_GOV_API_KEY || undefined,
    pageSize: parsePositiveInteger(env.GOVTRACK_PAGE_SIZE, 600),
  };
}

export async function ingestFederalVotes({
  db = requireDb(),
  fetcher = fetch,
  env = process.env,
}: {
  db?: DbClient;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<PlannedFederalRows> {
  const config = resolveRuntimeConfig(env);
  console.log(
    `[federal-votes] starting congresses=${config.congresses.join(",")}`,
  );

  const plan = createEmptyPlan();

  for await (const voteJson of fetchGovTrackVoteJsons(config, fetcher)) {
    const dataUrl =
      getString(asRecord(voteJson), "link") ?? `${config.govtrackBaseUrl}/vote`;
    mergeFederalPlans(plan, planGovTrackVote(voteJson, { dataUrl }));
  }

  const enrichmentFailures = await enrichBills(plan, config, fetcher);
  await writeFederalPlan(db, plan);

  console.log(
    [
      "[federal-votes] complete",
      `roll_calls=${plan.counts.rollCallsSeen}`,
      `bill_roll_calls=${plan.counts.billRollCalls}`,
      `skipped_non_bill=${plan.counts.skippedNonBillRollCalls}`,
      `skipped_malformed_votes=${plan.counts.skippedMalformedVotes}`,
      `candidates=${plan.candidates.size}`,
      `offices=${plan.candidateOffices.size}`,
      `bills=${plan.bills.size}`,
      `votes=${plan.votes.size}`,
      `congressgov_failures=${enrichmentFailures}`,
    ].join(" "),
  );

  return plan;
}

async function* fetchGovTrackVoteJsons(
  config: RuntimeConfig,
  fetcher: Fetcher,
): AsyncGenerator<UnknownRecord> {
  let listPagesFetched = 0;
  let voterPagesFetched = 0;
  let billRollCalls = 0;

  for (const congress of config.congresses) {
    for (const vote of await fetchGovTrackVotePage(congress, config, fetcher)) {
      listPagesFetched += 1;
      if (!extractBillRecord(vote)) {
        yield vote;
        continue;
      }

      billRollCalls += 1;
      const votersResult = await fetchGovTrackVotersForVote(
        vote,
        config,
        fetcher,
      );
      voterPagesFetched += votersResult.pagesFetched;

      yield {
        ...vote,
        source_url: getString(vote, "source_url") ?? getString(vote, "link"),
        voters: votersResult.voters,
      };
    }
  }

  console.log(
    `[federal-votes] govtrack_vote_records=${listPagesFetched} bill_roll_calls=${billRollCalls} skipped_non_bill=${listPagesFetched - billRollCalls} govtrack_voter_pages=${voterPagesFetched}`,
  );
}

async function fetchGovTrackVotePage(
  congress: number,
  config: RuntimeConfig,
  fetcher: Fetcher,
): Promise<UnknownRecord[]> {
  const votes: UnknownRecord[] = [];
  let offset = 0;

  while (true) {
    const url = withGovTrackParams(`${config.govtrackBaseUrl}/vote`, {
      congress: String(congress),
      limit: String(config.pageSize),
      offset: String(offset),
      order_by: "created",
    });
    const page = asRecord(await fetchJson(url, fetcher));
    const objects = getArray(page?.objects)
      .map((value) => asRecord(value))
      .filter((value): value is UnknownRecord => Boolean(value));

    votes.push(...objects);

    const meta = asRecord(page?.meta);
    const totalCount = getNumber(meta, "total_count") ?? votes.length;
    offset += objects.length;

    if (objects.length === 0 || offset >= totalCount) {
      break;
    }
  }

  return votes;
}

async function fetchGovTrackVotersForVote(
  vote: UnknownRecord,
  config: RuntimeConfig,
  fetcher: Fetcher,
): Promise<{ voters: Record<string, UnknownRecord>; pagesFetched: number }> {
  const created = getString(vote, "created");
  const link = getString(vote, "link");
  if (!created || !link) return { voters: {}, pagesFetched: 0 };

  const voters: Record<string, UnknownRecord> = {};
  let offset = 0;
  let pagesFetched = 0;

  while (true) {
    const url = withGovTrackParams(`${config.govtrackBaseUrl}/vote_voter`, {
      created,
      limit: String(config.pageSize),
      offset: String(offset),
    });
    const page = asRecord(await fetchJson(url, fetcher));
    pagesFetched += 1;
    const pageObjects = getArray(page?.objects)
      .map((value) => asRecord(value))
      .filter((value): value is UnknownRecord => Boolean(value));
    const matchingObjects = pageObjects.filter((value) => {
      const voterVote = asRecord(value.vote);
      return getString(voterVote, "link") === link;
    });

    for (const object of matchingObjects) {
      const key =
        getString(asRecord(object.person), "bioguideid") ??
        getString(asRecord(object.person), "link") ??
        `${offset}-${Object.keys(voters).length}`;
      voters[key] = object;
    }

    const meta = asRecord(page?.meta);
    const totalCount =
      getNumber(meta, "total_count") ?? offset + pageObjects.length;
    offset += config.pageSize;

    if (pageObjects.length === 0 || offset >= totalCount) {
      break;
    }
  }

  return { voters, pagesFetched };
}

async function enrichBills(
  plan: PlannedFederalRows,
  config: RuntimeConfig,
  fetcher: Fetcher,
): Promise<number> {
  if (!config.congressGovApiKey) return 0;

  let failures = 0;
  for (const [billId, bill] of plan.bills) {
    const identity = parsePlannedBillId(billId);
    if (!identity) continue;

    try {
      const enrichment = await fetchCongressGovBillEnrichment(
        identity,
        config,
        fetcher,
      );
      if (enrichment) {
        plan.bills.set(billId, mergeBillEnrichment(bill, enrichment));
      }
    } catch (error) {
      failures += 1;
      console.warn(
        `[federal-votes] congressgov_enrichment_failed bill=${billId} error=${safeErrorMessage(error)}`,
      );
    }
  }
  return failures;
}

async function fetchCongressGovBillEnrichment(
  bill: BillIdentity,
  config: RuntimeConfig,
  fetcher: Fetcher,
): Promise<BillEnrichment | null> {
  const basePath = `${config.congressGovBaseUrl}/bill/${bill.congress}/${bill.type}/${bill.number}`;
  const billUrl = withCongressGovParams(basePath, config.congressGovApiKey);
  const summaryUrl = withCongressGovParams(
    `${basePath}/summaries`,
    config.congressGovApiKey,
  );
  const billJson = await fetchJson(billUrl, fetcher);
  const summaryJson = await fetchJson(summaryUrl, fetcher).catch(() => null);
  return parseCongressGovEnrichment(billJson, summaryJson);
}

function parseCongressGovEnrichment(
  billJson: unknown,
  summaryJson: unknown,
): BillEnrichment | null {
  const billEnvelope = asRecord(billJson);
  const bill = asRecord(billEnvelope?.bill);
  if (!bill) return null;

  const policyArea = asRecord(bill.policyArea);
  const summary = firstRecord(getArray(asRecord(summaryJson)?.summaries));

  return {
    title: getString(bill, "title") ?? undefined,
    introducedDate: normalizeDate(getString(bill, "introducedDate")),
    policyArea: getString(policyArea, "name") ?? undefined,
    summary: getString(summary, "text") ?? undefined,
    raw: {
      bill: stripUndefined({
        congressGovType: getString(bill, "type"),
        latestAction: bill.latestAction,
        policyArea: policyArea ? { name: getString(policyArea, "name") } : null,
      }),
      summary: summary
        ? stripUndefined({
            actionDate: getString(summary, "actionDate"),
            actionDesc: getString(summary, "actionDesc"),
            updateDate: getString(summary, "updateDate"),
          })
        : null,
    },
  };
}

function mergeBillEnrichment(
  bill: BillRow,
  enrichment: BillEnrichment,
): BillRow {
  const raw = asRecord(bill.rawMetadata) ?? {};
  return {
    ...bill,
    title: enrichment.title ?? bill.title,
    summary: enrichment.summary ?? bill.summary,
    introducedDate: enrichment.introducedDate ?? bill.introducedDate,
    rawMetadata: stripUndefined({
      ...raw,
      congressGov: enrichment.raw,
      policyArea: enrichment.policyArea,
    }),
  };
}

async function writeFederalPlan(
  db: DbClient,
  plan: PlannedFederalRows,
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

function buildBillRow(
  bill: BillIdentity,
  billRecord: UnknownRecord | null,
  vote: UnknownRecord,
  sourceUrl: string,
  jurisdiction: FederalJurisdiction,
): BillRow {
  const title =
    getString(billRecord, "title") ??
    getString(vote, "subject") ??
    getString(vote, "question") ??
    `${bill.type.toUpperCase()} ${bill.number}`;

  return {
    id: bill.id,
    title,
    summary: getString(billRecord, "summary"),
    source: "govtrack",
    sourceUrl: getString(billRecord, "link") ?? sourceUrl,
    jurisdiction,
    introducedDate: normalizeDate(getString(billRecord, "introduced_date")),
    rawMetadata: stripUndefined({
      govtrack: {
        bill: billRecord,
        vote: stripRollCallForBillMetadata(vote),
      },
    }),
  };
}

function buildCandidateRow(
  id: string,
  member: UnknownRecord,
  jurisdiction: FederalJurisdiction,
): CandidateRow {
  const sourceId =
    findNestedString(member, [
      "bioguide",
      "bioguide_id",
      "bioguideid",
      "bioguideId",
      "govtrack_id",
      "govtrackId",
      "id",
    ]) ?? id;

  return {
    id,
    fullName: getMemberName(member),
    sourceId,
    jurisdiction,
    isIncumbent: true,
    rawMetadata: stripUndefined({ govtrack: member }),
  };
}

function buildOfficeRow(
  candidateId: string,
  jurisdiction: FederalJurisdiction,
  chamber: ChamberCode,
  congress: number,
  sourceUrl: string,
): CandidateOfficeRow {
  const officeLabel = chamber === "s" ? "U.S. Senate" : "U.S. House";
  const term = congressionalSessionDates(congress);
  const id = deterministicUuid(
    `${candidateId}:${jurisdiction}:${officeLabel}:${term.termStart}`,
  );

  return {
    id,
    candidateId,
    officeLabel,
    jurisdiction,
    termStart: term.termStart,
    termEnd: term.termEnd,
    sourceUrl,
  };
}

function buildVoteRow({
  billId,
  candidateId,
  voteCast,
  voteDate,
  sourceUrl,
  vote,
  member,
  rollCallDataUrl,
}: {
  billId: string;
  candidateId: string;
  voteCast: NormalizedVoteCast;
  voteDate: string;
  sourceUrl: string;
  vote: UnknownRecord;
  member: UnknownRecord;
  rollCallDataUrl: string;
}): VoteRow {
  return {
    billId,
    candidateId,
    voteCast,
    voteDate,
    sourceUrl,
    rawMetadata: stripUndefined({
      govtrack: {
        rollCall: stripRollCallForVoteMetadata(vote),
        member,
        dataUrl: rollCallDataUrl,
      },
    }),
  };
}

function extractVoteEntries(vote: UnknownRecord): VoteEntry[] {
  const groupedVotes = asRecord(vote.votes);
  if (groupedVotes) return extractGroupedVoteEntries(groupedVotes);

  const voters = asRecord(vote.voters);
  if (!voters) return [];

  return Object.values(voters)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is UnknownRecord => Boolean(entry))
    .flatMap((entry) => {
      const option = asRecord(entry.option);
      const label =
        getString(option, "key") ??
        getString(option, "value") ??
        getString(option, "label");
      const member = asRecord(entry.person) ?? entry;
      return label ? [{ label, member }] : [];
    });
}

function extractGroupedVoteEntries(groupedVotes: UnknownRecord): VoteEntry[] {
  const entries: VoteEntry[] = [];
  for (const [label, value] of Object.entries(groupedVotes)) {
    const members = Array.isArray(value)
      ? value
      : getArray(asRecord(value)?.members ?? asRecord(value)?.people);

    for (const member of members) {
      const memberRecord = asRecord(member);
      if (memberRecord) entries.push({ label, member: memberRecord });
    }
  }
  return entries;
}

function extractBillRecord(vote: UnknownRecord): UnknownRecord | null {
  return asRecord(vote.bill) ?? asRecord(vote.related_bill);
}

function extractBillIdentity(
  bill: UnknownRecord | null,
  vote: UnknownRecord | undefined,
): BillIdentity | null {
  if (!bill) return null;

  const congress = getNumber(bill, "congress") ?? getNumber(vote, "congress");
  const type = normalizeBillType(
    getString(bill, "type") ??
      getString(bill, "bill_type") ??
      getString(bill, "display_number"),
  );
  const number = normalizeBillNumber(getString(bill, "number"));
  if (!congress || !type || !number) return null;

  return {
    id: `govtrack-${type}${number}-${congress}`,
    congress,
    type,
    number,
  };
}

function parsePlannedBillId(id: string): BillIdentity | null {
  const match = /^govtrack-([a-z]+)(\d+)-(\d+)$/u.exec(id);
  if (!match) return null;
  const [, type, number, congress] = match;
  return {
    id,
    congress: Number(congress),
    type,
    number,
  };
}

function setLatestVote(voteMap: Map<string, VoteRow>, voteRow: VoteRow) {
  const key = `${voteRow.billId}|${voteRow.candidateId}`;
  const existing = voteMap.get(key);
  if (!existing || voteRow.voteDate >= existing.voteDate) {
    voteMap.set(key, voteRow);
  }
}

function extractChamber(vote: UnknownRecord, dataUrl: string): ChamberCode {
  const chamber = getString(vote, "chamber")?.toLowerCase();
  if (chamber?.startsWith("s")) return "s";
  if (chamber?.startsWith("h")) return "h";
  return /\/s\d+\/data\.json$/u.test(dataUrl) ? "s" : "h";
}

function chamberToJurisdiction(chamber: ChamberCode): FederalJurisdiction {
  return chamber === "s" ? "federal-senate" : "federal-house";
}

function extractVoteDate(vote: UnknownRecord): string {
  return (
    normalizeDate(getString(vote, "date")) ??
    normalizeDate(getString(vote, "created")) ??
    normalizeDate(getString(vote, "updated_at")) ??
    new Date().toISOString().slice(0, 10)
  );
}

function getMemberName(member: UnknownRecord): string {
  return (
    findNestedString(member, [
      "display_name",
      "full_name",
      "name",
      "sort_name",
      "lastname",
    ]) ?? "Unknown federal legislator"
  );
}

function stripRollCallForBillMetadata(vote: UnknownRecord): UnknownRecord {
  const { votes: _votes, voters: _voters, ...rest } = vote;
  return rest;
}

function stripRollCallForVoteMetadata(vote: UnknownRecord): UnknownRecord {
  const { votes: _votes, voters: _voters, ...rest } = vote;
  return rest;
}

function withCongressGovParams(
  url: string,
  apiKey: string | undefined,
): string {
  const parsed = new URL(url);
  parsed.searchParams.set("format", "json");
  if (apiKey) parsed.searchParams.set("api_key", apiKey);
  return parsed.href;
}

async function fetchJson(url: string, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { "user-agent": "voter-choice-federal-ingest" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function congressionalSessionDates(congress: number): {
  termStart: string;
  termEnd: string;
} {
  const startYear = 1789 + (congress - 1) * 2;
  return {
    termStart: `${startYear}-01-03`,
    termEnd: `${startYear + 2}-01-03`,
  };
}

function getCurrentCongress(now = new Date()): number {
  return Math.floor((now.getUTCFullYear() - 1789) / 2) + 1;
}

function parseCongressList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((part) => Number.isInteger(part) && part > 0);
}

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBillType(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[^a-z]/gu, "");
  const mapped: Record<string, string> = {
    hr: "hr",
    housebill: "hr",
    s: "s",
    senatebill: "s",
    hres: "hres",
    houseresolution: "hres",
    sres: "sres",
    senateresolution: "sres",
    hjres: "hjres",
    housejointresolution: "hjres",
    sjres: "sjres",
    senatejointresolution: "sjres",
    hconres: "hconres",
    houseconcurrentresolution: "hconres",
    sconres: "sconres",
    senateconcurrentresolution: "sconres",
  };
  return mapped[normalized] ?? (normalized || null);
}

function normalizeBillNumber(value: string | null): string | null {
  return value?.replace(/\D/gu, "") || null;
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
    .replace(/[^a-zA-Z0-9]+/gu, "")
    .toLowerCase();
}

function findNestedString(
  record: UnknownRecord,
  keys: string[],
): string | null {
  for (const key of keys) {
    const direct = getString(record, key);
    if (direct) return direct;
  }

  const person = asRecord(record.person);
  if (!person) return null;

  for (const key of keys) {
    const nested = getString(person, key);
    if (nested) return nested;
  }

  return null;
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

function firstRecord(values: unknown[]): UnknownRecord | null {
  for (const value of values) {
    const record = asRecord(value);
    if (record) return record;
  }
  return null;
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

function withGovTrackParams(
  url: string,
  params: Record<string, string>,
): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.href;
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
  ingestFederalVotes().catch((error) => {
    console.error("[federal-votes] failed:", safeErrorMessage(error));
    process.exitCode = 1;
  });
}

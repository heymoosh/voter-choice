/**
 * Exact congressional contest calendar oracle.
 *
 * This deliberately models only calendar evidence and expected contests. It
 * never reads voter-logistics data, infers a date from FEC data, or fetches a
 * live source. Collection and roster ingestion are later cards.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type CongressionalOffice =
  | "house"
  | "senate"
  | "delegate"
  | "resident_commissioner";
export type ElectionKind = "regular" | "special";
export type ElectionStage = "primary" | "convention" | "runoff" | "general";

/**
 * The stable identity of one exact contest stage. Election date and trigger
 * state are intentionally absent: both can change without creating a new
 * contest.
 */
export type ContestIdentity = {
  cycle: number;
  jurisdiction: string;
  office: CongressionalOffice;
  district?: string;
  senateSeat?: string;
  electionKind: ElectionKind;
  stage: ElectionStage;
  partyLane?: string;
  conditionalEventId?: string;
  conditionalEventTriggered?: boolean;
};

export type CalendarEvidence = {
  kind: "state_election_authority" | "fec_calendar_signal";
  authorityName: string;
  url: string;
  retrievedAt: string;
  checksum: string;
  publishedAt?: string;
  effectiveAt?: string;
};

export type CalendarRevision = {
  id: string;
  identity: ContestIdentity;
  electionDate: string;
  source: CalendarEvidence;
  /** Required to replace an already-authoritative state date. */
  supersedesRevisionId?: string;
};

export type CalendarReviewItem = {
  kind: "fec_state_date_conflict" | "state_authority_conflict";
  revisionId: string;
  currentStateRevisionId?: string;
  message: string;
};

export type CalendarContest = {
  id: string;
  identity: ContestIdentity;
  /** The authoritative state date, never a date inferred from FEC. */
  electionDate: string;
  authoritativeStateRevisionId: string;
  stateRevisions: CalendarRevision[];
  fecSignals: CalendarRevision[];
  calendarReviewRequired: boolean;
  reviewItems: CalendarReviewItem[];
};

export type CalendarFixture = {
  year: number;
  revisions: CalendarRevision[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function normalizeIdentity(identity: ContestIdentity): ContestIdentity {
  const normalized: ContestIdentity = {
    ...identity,
    jurisdiction: requiredString(
      identity.jurisdiction,
      "identity.jurisdiction",
    ).toUpperCase(),
    district: identity.district?.padStart(2, "0"),
    senateSeat: identity.senateSeat?.trim(),
    partyLane: identity.partyLane?.trim().toUpperCase(),
    conditionalEventId: identity.conditionalEventId?.trim(),
  };
  if (!Number.isInteger(normalized.cycle) || normalized.cycle < 1788) {
    throw new Error("identity.cycle must be a valid election year");
  }
  if (normalized.office === "house" && !normalized.district) {
    throw new Error("house contests require identity.district");
  }
  if (normalized.office === "senate" && !normalized.senateSeat) {
    throw new Error("senate contests require identity.senateSeat");
  }
  if (normalized.conditionalEventTriggered && !normalized.conditionalEventId) {
    throw new Error(
      "triggered conditional contests require conditionalEventId",
    );
  }
  return normalized;
}

function normalizeRevision(revision: CalendarRevision): CalendarRevision {
  const normalized: CalendarRevision = {
    ...revision,
    id: requiredString(revision.id, "revision.id"),
    identity: normalizeIdentity(revision.identity),
    electionDate: requiredString(
      revision.electionDate,
      "revision.electionDate",
    ),
    source: {
      ...revision.source,
      authorityName: requiredString(
        revision.source.authorityName,
        "source.authorityName",
      ),
      url: requiredString(revision.source.url, "source.url"),
      retrievedAt: requiredString(
        revision.source.retrievedAt,
        "source.retrievedAt",
      ),
      checksum: requiredString(revision.source.checksum, "source.checksum"),
    },
  };
  if (!DATE.test(normalized.electionDate)) {
    throw new Error("revision.electionDate must be YYYY-MM-DD");
  }
  return normalized;
}

/** A deterministic contest key that explicitly excludes the mutable date. */
export function stableContestId(identity: ContestIdentity): string {
  const value = normalizeIdentity(identity);
  return [
    value.cycle,
    value.jurisdiction,
    value.office,
    value.district ?? "",
    value.senateSeat ?? "",
    value.electionKind,
    value.stage,
    value.partyLane ?? "",
    value.conditionalEventId ?? "",
  ].join("|");
}

function cloneRevision(revision: CalendarRevision): CalendarRevision {
  return {
    ...revision,
    identity: { ...revision.identity },
    source: { ...revision.source },
  };
}

function cloneContest(contest: CalendarContest): CalendarContest {
  return {
    ...contest,
    identity: { ...contest.identity },
    stateRevisions: contest.stateRevisions.map(cloneRevision),
    fecSignals: contest.fecSignals.map(cloneRevision),
    reviewItems: contest.reviewItems.map((item) => ({ ...item })),
  };
}

/**
 * In-memory oracle used by later persistence/ingestion work. A state source
 * may revise its own current revision only by explicitly superseding it. FEC
 * records are retained as change signals and can only open review.
 */
export class CalendarOracle {
  private readonly contests = new Map<string, CalendarContest>();
  /** FEC signals may arrive before state evidence, but never create a contest. */
  private readonly pendingFecSignals = new Map<string, CalendarRevision[]>();

  static fromRevisions(revisions: readonly CalendarRevision[]): CalendarOracle {
    const oracle = new CalendarOracle();
    for (const revision of revisions) oracle.applyRevision(revision);
    return oracle;
  }

  applyRevision(input: CalendarRevision): CalendarContest | undefined {
    const revision = normalizeRevision(input);
    const id = stableContestId(revision.identity);
    const existing = this.contests.get(id);

    if (revision.source.kind === "fec_calendar_signal") {
      if (!existing) {
        // FEC has no authority to create an expected ballot contest.
        const signals = this.pendingFecSignals.get(id) ?? [];
        signals.push(cloneRevision(revision));
        this.pendingFecSignals.set(id, signals);
        return undefined;
      }
      this.attachFecSignal(existing, revision);
      return cloneContest(existing);
    }

    if (!existing) {
      const contest: CalendarContest = {
        id,
        identity: { ...revision.identity },
        electionDate: revision.electionDate,
        authoritativeStateRevisionId: revision.id,
        stateRevisions: [cloneRevision(revision)],
        fecSignals: [],
        calendarReviewRequired: false,
        reviewItems: [],
      };
      this.contests.set(id, contest);
      for (const signal of this.pendingFecSignals.get(id) ?? []) {
        this.attachFecSignal(contest, signal);
      }
      this.pendingFecSignals.delete(id);
      return cloneContest(contest);
    }

    const current = this.authoritativeStateRevision(existing);
    existing.stateRevisions.push(cloneRevision(revision));
    if (!current || current.electionDate === revision.electionDate) {
      existing.electionDate = revision.electionDate;
      existing.identity = { ...revision.identity };
      existing.authoritativeStateRevisionId = revision.id;
      return cloneContest(existing);
    }
    if (revision.supersedesRevisionId === current.id) {
      existing.electionDate = revision.electionDate;
      existing.identity = { ...revision.identity };
      existing.authoritativeStateRevisionId = revision.id;
      return cloneContest(existing);
    }

    existing.calendarReviewRequired = true;
    existing.reviewItems.push({
      kind: "state_authority_conflict",
      revisionId: revision.id,
      currentStateRevisionId: current.id,
      message: `State evidence ${revision.id} changes ${current.electionDate} without superseding ${current.id}`,
    });
    return cloneContest(existing);
  }

  contest(identity: ContestIdentity): CalendarContest | undefined {
    const contest = this.contests.get(stableContestId(identity));
    return contest && cloneContest(contest);
  }

  /** Conditional contests become expected only after their official trigger. */
  expectedContests(): CalendarContest[] {
    return [...this.contests.values()]
      .filter((contest) => contest.identity.conditionalEventTriggered !== false)
      .map(cloneContest);
  }

  private attachFecSignal(
    contest: CalendarContest,
    revision: CalendarRevision,
  ): void {
    contest.fecSignals.push(cloneRevision(revision));
    if (contest.electionDate !== revision.electionDate) {
      contest.calendarReviewRequired = true;
      contest.reviewItems.push({
        kind: "fec_state_date_conflict",
        revisionId: revision.id,
        currentStateRevisionId: contest.authoritativeStateRevisionId,
        message: `FEC signal ${revision.electionDate} differs from state authority ${contest.electionDate}`,
      });
    }
  }

  private authoritativeStateRevision(
    contest: CalendarContest,
  ): CalendarRevision | undefined {
    return contest.stateRevisions.find(
      (revision) => revision.id === contest.authoritativeStateRevisionId,
    );
  }
}

/** Missing-contest checks intentionally ignore an untriggered conditional event. */
export function expectedContestsMissingFrom(
  oracle: CalendarOracle,
  observedContestIds: Iterable<string>,
): string[] {
  const observed = new Set(observedContestIds);
  return oracle
    .expectedContests()
    .map((contest) => contest.id)
    .filter((id) => !observed.has(id));
}

const fixturesDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/congressional-calendar",
);

/** Loads only checked-in test fixtures; this command performs no live collection. */
export function loadCalendarFixture(name: string): CalendarFixture {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("invalid fixture name");
  const path = resolve(fixturesDirectory, `${name}.json`);
  const raw = JSON.parse(
    readFileSync(path, "utf8"),
  ) as Partial<CalendarFixture>;
  if (
    typeof raw.year !== "number" ||
    !Number.isInteger(raw.year) ||
    !Array.isArray(raw.revisions)
  ) {
    throw new Error(`invalid calendar fixture: ${name}`);
  }
  return {
    year: raw.year,
    revisions: raw.revisions.map((revision) => normalizeRevision(revision)),
  };
}

export function verifyCalendarFixture(
  year: number,
  fixtureName: string,
): {
  fixture: string;
  year: number;
  expectedContestIds: string[];
  reviewRequiredContestIds: string[];
} {
  const fixture = loadCalendarFixture(fixtureName);
  if (fixture.year !== year) {
    throw new Error(
      `fixture ${fixtureName} is for ${fixture.year}, not ${year}`,
    );
  }
  const oracle = CalendarOracle.fromRevisions(fixture.revisions);
  const expected = oracle.expectedContests();
  const reviewRequiredContestIds = expected
    .filter((contest) => contest.calendarReviewRequired)
    .map((contest) => contest.id);
  if (reviewRequiredContestIds.length > 0) {
    throw new Error(
      `calendar review required: ${reviewRequiredContestIds.join(", ")}`,
    );
  }
  return {
    fixture: fixtureName,
    year,
    expectedContestIds: expected.map((contest) => contest.id),
    reviewRequiredContestIds,
  };
}

function parseFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function runCli(): void {
  const fixture = parseFlag(process.argv, "--fixture");
  const yearValue = parseFlag(process.argv, "--year");
  const year = Number(yearValue);
  if (!fixture || !Number.isInteger(year)) {
    throw new Error("usage: --year <year> --fixture <fixture-name>");
  }
  const result = verifyCalendarFixture(year, fixture);
  console.log(
    `verified ${result.fixture}: ${result.expectedContestIds.length} expected exact contests for ${result.year}`,
  );
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  runCli();
}

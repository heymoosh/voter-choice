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
      existing.fecSignals.push(cloneRevision(revision));
      this.reconcileContest(existing);
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
      contest.fecSignals.push(
        ...(this.pendingFecSignals.get(id) ?? []).map(cloneRevision),
      );
      this.pendingFecSignals.delete(id);
      this.reconcileContest(contest);
      return cloneContest(contest);
    }

    const sameId = existing.stateRevisions.find(
      (candidate) => candidate.id === revision.id,
    );
    if (!sameId) existing.stateRevisions.push(cloneRevision(revision));
    this.reconcileContest(existing);
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

  /** Rebuild the authority graph so arrival order cannot choose a date. */
  private reconcileContest(contest: CalendarContest): void {
    const { authoritative, reviews } = this.resolveStateRevisionGraph(contest);
    contest.electionDate = authoritative.electionDate;
    contest.identity = { ...authoritative.identity };
    contest.authoritativeStateRevisionId = authoritative.id;

    for (const signal of contest.fecSignals) {
      if (signal.electionDate !== contest.electionDate) {
        reviews.push({
          kind: "fec_state_date_conflict",
          revisionId: signal.id,
          currentStateRevisionId: contest.authoritativeStateRevisionId,
          message: `FEC signal ${signal.electionDate} differs from state authority ${contest.electionDate}`,
        });
      }
    }
    contest.reviewItems = reviews;
    contest.calendarReviewRequired = reviews.length > 0;
  }

  private resolveStateRevisionGraph(contest: CalendarContest): {
    authoritative: CalendarRevision;
    reviews: CalendarReviewItem[];
  } {
    const revisions = contest.stateRevisions;
    const byId = new Map(revisions.map((revision) => [revision.id, revision]));
    const reviews: CalendarReviewItem[] = [];
    const roots = revisions
      .filter((revision) => !revision.supersedesRevisionId)
      .sort(compareRevisions);
    let authoritative = roots[0] ?? [...revisions].sort(compareRevisions)[0];
    if (!authoritative) throw new Error("contest must retain state evidence");

    for (const root of roots.slice(1)) {
      reviews.push({
        kind: "state_authority_conflict",
        revisionId: root.id,
        currentStateRevisionId: authoritative.id,
        message: `State evidence ${root.id} is a non-idempotent replacement without an explicit successor`,
      });
    }

    for (const revision of revisions.filter(
      (candidate) => candidate.supersedesRevisionId,
    )) {
      const predecessor = byId.get(revision.supersedesRevisionId!);
      if (!predecessor || !isLaterRevision(revision, predecessor)) {
        reviews.push({
          kind: "state_authority_conflict",
          revisionId: revision.id,
          currentStateRevisionId: predecessor?.id,
          message: !predecessor
            ? `State evidence ${revision.id} names an unavailable predecessor ${revision.supersedesRevisionId}`
            : `State evidence ${revision.id} does not have a later published/effective timestamp than ${predecessor.id}`,
        });
      }
    }

    for (;;) {
      const successors = revisions
        .filter(
          (revision) =>
            revision.supersedesRevisionId === authoritative.id &&
            isLaterRevision(revision, authoritative),
        )
        .sort(compareRevisions);
      if (successors.length === 0) break;
      if (successors.length > 1) {
        for (const successor of successors) {
          reviews.push({
            kind: "state_authority_conflict",
            revisionId: successor.id,
            currentStateRevisionId: authoritative.id,
            message: `State evidence branches from ${authoritative.id}; review is required before choosing a successor`,
          });
        }
        break;
      }
      authoritative = successors[0];
    }

    return { authoritative, reviews };
  }
}

function revisionTimestamp(revision: CalendarRevision): number | undefined {
  const value = revision.source.effectiveAt ?? revision.source.publishedAt;
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function compareRevisions(a: CalendarRevision, b: CalendarRevision): number {
  const aTime = revisionTimestamp(a) ?? Number.POSITIVE_INFINITY;
  const bTime = revisionTimestamp(b) ?? Number.POSITIVE_INFINITY;
  return aTime - bTime || a.id.localeCompare(b.id);
}

function isLaterRevision(
  successor: CalendarRevision,
  predecessor: CalendarRevision,
): boolean {
  const successorTime = revisionTimestamp(successor);
  const predecessorTime = revisionTimestamp(predecessor);
  return (
    successorTime !== undefined &&
    predecessorTime !== undefined &&
    successorTime > predecessorTime
  );
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

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CalendarOracle,
  expectedContestsMissingFrom,
  loadCalendarFixture,
  stableContestId,
  type CalendarRevision,
} from "./congressional-calendar";

const oracleModule = resolve(
  process.cwd(),
  "scripts/ingest/congressional-calendar.ts",
);

describe("congressional calendar oracle", () => {
  it("provides an exact-contest calendar oracle instead of using state logistics data", () => {
    expect(existsSync(oracleModule)).toBe(true);
  });

  it("keeps Alabama's district-specific 2026 primary dates as exact contests", () => {
    const fixture = loadCalendarFixture("al-split");
    const oracle = CalendarOracle.fromRevisions(fixture.revisions);
    const datesByContest = new Map(
      oracle
        .expectedContests()
        .map((contest) => [
          `${contest.identity.office}:${contest.identity.district ?? contest.identity.senateSeat}`,
          contest.electionDate,
        ]),
    );

    expect(datesByContest.get("senate:class-2")).toBe("2026-05-19");
    expect(datesByContest.get("house:03")).toBe("2026-05-19");
    expect(datesByContest.get("house:04")).toBe("2026-05-19");
    expect(datesByContest.get("house:05")).toBe("2026-05-19");
    expect(datesByContest.get("house:01")).toBe("2026-08-11");
    expect(datesByContest.get("house:02")).toBe("2026-08-11");
    expect(datesByContest.get("house:06")).toBe("2026-08-11");
    expect(datesByContest.get("house:07")).toBe("2026-08-11");
  });

  it("preserves contest identity while retaining an effective-dated state revision", () => {
    const oracle = new CalendarOracle();
    const original = stateRevision("2026-05-12", "al-primary-v1");
    const revised = stateRevision("2026-05-19", "al-primary-v2", original.id);

    oracle.applyRevision(original);
    oracle.applyRevision(revised);

    const current = oracle.contest(original.identity);
    expect(stableContestId(original.identity)).toBe(
      stableContestId(revised.identity),
    );
    expect(current?.electionDate).toBe("2026-05-19");
    expect(current?.stateRevisions.map((revision) => revision.id)).toEqual([
      "al-primary-v1",
      "al-primary-v2",
    ]);
  });

  it("turns an FEC/state date conflict into review without overwriting state authority", () => {
    const oracle = new CalendarOracle();
    const state = stateRevision("2026-05-19", "al-state");
    oracle.applyRevision(state);
    oracle.applyRevision({
      ...state,
      id: "al-fec-signal",
      source: {
        kind: "fec_calendar_signal",
        authorityName: "Federal Election Commission",
        url: "https://www.fec.gov/example",
        retrievedAt: "2026-01-02T00:00:00.000Z",
        checksum: "fec-sha256",
      },
      electionDate: "2026-08-11",
    });

    const contest = oracle.contest(state.identity);
    expect(contest?.electionDate).toBe("2026-05-19");
    expect(contest?.calendarReviewRequired).toBe(true);
    expect(contest?.reviewItems).toEqual([
      expect.objectContaining({ kind: "fec_state_date_conflict" }),
    ]);
  });

  it("keeps an earlier FEC signal for review when state authority arrives later", () => {
    const oracle = new CalendarOracle();
    const state = stateRevision("2026-05-19", "al-state-late");
    oracle.applyRevision({
      ...state,
      id: "al-fec-early-signal",
      source: {
        kind: "fec_calendar_signal",
        authorityName: "Federal Election Commission",
        url: "https://www.fec.gov/example",
        retrievedAt: "2026-01-01T00:00:00.000Z",
        checksum: "fec-early-sha256",
      },
      electionDate: "2026-08-11",
    });
    oracle.applyRevision(state);

    const contest = oracle.contest(state.identity);
    expect(contest?.electionDate).toBe("2026-05-19");
    expect(contest?.calendarReviewRequired).toBe(true);
    expect(contest?.reviewItems).toEqual([
      expect.objectContaining({ kind: "fec_state_date_conflict" }),
    ]);
  });

  it("does not let an unresolved state conflict displace the revision a later correction supersedes", () => {
    const oracle = new CalendarOracle();
    const original = stateRevision("2026-05-19", "al-state-original");
    const conflicting = stateRevision("2026-08-11", "al-state-conflict");
    const corrected = stateRevision(
      "2026-06-02",
      "al-state-corrected",
      original.id,
    );

    oracle.applyRevision(original);
    oracle.applyRevision(conflicting);
    oracle.applyRevision(corrected);

    expect(oracle.contest(original.identity)).toEqual(
      expect.objectContaining({
        electionDate: "2026-06-02",
        authoritativeStateRevisionId: "al-state-corrected",
        calendarReviewRequired: true,
      }),
    );
  });

  it("separates regular and special contests and distinct Senate seats", () => {
    const regular = stateRevision("2026-11-03", "senate-regular", undefined, {
      office: "senate",
      senateSeat: "class-2",
      electionKind: "regular",
      stage: "general",
    });
    const special = stateRevision("2026-11-03", "senate-special", undefined, {
      office: "senate",
      senateSeat: "class-3-unexpired",
      electionKind: "special",
      stage: "general",
    });

    expect(stableContestId(regular.identity)).not.toBe(
      stableContestId(special.identity),
    );
  });

  it("does not report an untriggered conditional runoff as missing", () => {
    const oracle = new CalendarOracle();
    const primary = stateRevision("2026-03-03", "primary");
    const conditionalRunoff = stateRevision(
      "2026-05-12",
      "possible-runoff",
      undefined,
      {
        stage: "runoff",
        conditionalEventId: "al-house-1-runoff",
        conditionalEventTriggered: false,
      },
    );
    oracle.applyRevision(primary);
    oracle.applyRevision(conditionalRunoff);

    expect(
      expectedContestsMissingFrom(oracle, [stableContestId(primary.identity)]),
    ).toEqual([]);
  });

  it("makes a conditional runoff expected when official evidence records its trigger", () => {
    const oracle = new CalendarOracle();
    const pending = stateRevision("2026-05-12", "runoff-pending", undefined, {
      stage: "runoff",
      conditionalEventId: "al-house-1-runoff",
      conditionalEventTriggered: false,
    });
    const triggered = stateRevision(
      "2026-05-12",
      "runoff-triggered",
      undefined,
      {
        stage: "runoff",
        conditionalEventId: "al-house-1-runoff",
        conditionalEventTriggered: true,
      },
    );

    oracle.applyRevision(pending);
    oracle.applyRevision(triggered);

    expect(oracle.expectedContests().map((contest) => contest.id)).toEqual([
      stableContestId(triggered.identity),
    ]);
  });

  it("does not read state logistics JSON as calendar authority", () => {
    expect(readFileSync(oracleModule, "utf8")).not.toContain("src/data/states");
  });
});

function stateRevision(
  electionDate: string,
  id: string,
  supersedesRevisionId?: string,
  identity: Partial<CalendarRevision["identity"]> = {},
): CalendarRevision {
  return {
    id,
    identity: {
      cycle: 2026,
      jurisdiction: "AL",
      office: "house",
      district: "01",
      electionKind: "regular",
      stage: "primary",
      ...identity,
    },
    electionDate,
    source: {
      kind: "state_election_authority",
      authorityName: "Alabama Secretary of State",
      url: "https://www.sos.alabama.gov/example",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      checksum: `${id}-sha256`,
    },
    supersedesRevisionId,
  };
}

import { describe, expect, it } from "vitest";
import {
  CalendarOracle,
  type CalendarRevision,
} from "../../scripts/ingest/congressional-calendar";
import {
  F03_REHEARSAL_JURISDICTIONS,
  f03CongressionalSourceInventory,
} from "../../scripts/congressional-rosters/f03-source-inventory";
import {
  F05_REHEARSAL_CALENDAR_REVISIONS,
  f05ExactContestSourceCoverage,
  validateF03ExactContestSourceCoverage,
} from "../../scripts/congressional-rosters/f05-exact-contest-source-coverage";

function validateCoverage(
  oracle: CalendarOracle,
  coverage: unknown,
): { errors: string[] } {
  return validateF03ExactContestSourceCoverage(oracle, coverage);
}

describe("F05 exact F03 contest-to-source coverage", () => {
  it("validates the checked-in F05 calendar and seven-jurisdiction source matrix", () => {
    const result = validateF03ExactContestSourceCoverage(
      CalendarOracle.fromRevisions(F05_REHEARSAL_CALENDAR_REVISIONS),
      f05ExactContestSourceCoverage,
    );

    expect(result.errors).toEqual([]);
  });

  it("rejects a path that omits Texas's required party lane", async () => {
    const coverage = completeCoverage();
    const texasDemocraticPrimary = coverage.records.find(
      (record) => record.sourceId === "tx-house-07-dem-primary-official-source",
    )!;
    delete (texasDemocraticPrimary.contest as { partyLane?: string }).partyLane;

    const result = await validateCoverage(rehearsalOracle(), coverage);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "party lane does not match an expected F02 contest",
        ),
      ]),
    );
  });

  it.each([
    ["district", "al-house-01-official-source", "district", undefined],
    [
      "Senate seat",
      "al-senate-class-2-official-source",
      "senateSeat",
      undefined,
    ],
    ["election kind", "al-house-01-official-source", "electionKind", "special"],
    [
      "effective election date",
      "al-house-01-official-source",
      "effectiveElectionDate",
      "2026-08-12",
    ],
    ["stage", "al-house-01-official-source", "stage", "general"],
    [
      "party lane",
      "tx-house-07-rep-primary-official-source",
      "partyLane",
      "NONPARTISAN",
    ],
  ])(
    "rejects a missing or incorrect exact %s",
    async (_, sourceId, field, value) => {
      const coverage = completeCoverage();
      const record = coverage.records.find(
        (candidate) => candidate.sourceId === sourceId,
      )!;
      if (value === undefined)
        delete (record.contest as Record<string, unknown>)[field];
      else (record.contest as Record<string, unknown>)[field] = value;

      const result = await validateCoverage(rehearsalOracle(), coverage);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("does not match an expected F02 contest"),
        ]),
      );
    },
  );

  it("rejects calendar-review-required, mismatched, and unknown contest claims", async () => {
    const reviewOracle = rehearsalOracle();
    const revised = revision(
      "al-house-01-fec-conflict",
      {
        jurisdiction: "AL",
        office: "house",
        district: "01",
        electionKind: "regular",
        stage: "primary",
      },
      "2026-05-19",
    );
    revised.source.kind = "fec_calendar_signal";
    reviewOracle.applyRevision(revised);

    const reviewCoverage = completeCoverage();
    const mismatchedCoverage = completeCoverage();
    (
      mismatchedCoverage.records.find(
        (record) => record.sourceId === "al-house-03-official-source",
      )!.contest as Record<string, unknown>
    ).effectiveElectionDate = "2026-05-20";
    const unknownCoverage = completeCoverage();
    (
      unknownCoverage.records.find(
        (record) => record.sourceId === "al-house-03-official-source",
      )!.contest as Record<string, unknown>
    ).district = "99";

    await expectError(reviewOracle, reviewCoverage, "calendar review required");
    await expectError(
      rehearsalOracle(),
      mismatchedCoverage,
      "effective election date does not match an expected F02 contest",
    );
    await expectError(
      rehearsalOracle(),
      unknownCoverage,
      "does not match an expected F02 contest",
    );
  });

  it("allows multiple source IDs for one contest but rejects a duplicate sourceId and exact scope", async () => {
    const twoSources = completeCoverage();
    twoSources.records.push({
      ...twoSources.records[0],
      sourceId: "al-house-01-secondary-official-source",
      contest: {
        ...(twoSources.records[0].contest as Record<string, unknown>),
      },
    });
    expect(
      (await validateCoverage(rehearsalOracle(), twoSources)).errors,
    ).toEqual([]);

    const duplicate = completeCoverage();
    duplicate.records.push({
      ...duplicate.records[0],
      contest: { ...(duplicate.records[0].contest as Record<string, unknown>) },
    });
    await expectError(
      rehearsalOracle(),
      duplicate,
      "duplicate sourceId and exact contest scope",
    );
  });

  it("requires every exact path to refine its matching F03 official-source record", async () => {
    const missingInventorySource = completeCoverage();
    delete missingInventorySource.records[0].f03InventorySourceId;
    await expectError(
      rehearsalOracle(),
      missingInventorySource,
      "f03InventorySourceId is required",
    );

    const unknownInventorySource = completeCoverage();
    unknownInventorySource.records[0].f03InventorySourceId = "invented-source";
    await expectError(
      rehearsalOracle(),
      unknownInventorySource,
      "is not an F03 official-source record",
    );

    const wrongJurisdictionInventorySource = completeCoverage();
    wrongJurisdictionInventorySource.records.find(
      (record) => record.sourceId === "tx-house-07-dem-primary-official-source",
    )!.f03InventorySourceId = "al-2026-election-information";
    await expectError(
      rehearsalOracle(),
      wrongJurisdictionInventorySource,
      "must match the exact contest jurisdiction",
    );
  });

  it("does not promote a manual path before its controlling official artifact validates", async () => {
    const coverage = completeCoverage();
    coverage.records.find(
      (record) => record.sourceId === "tx-house-07-dem-primary-official-source",
    )!.promotionState = "exact_official_source_path";

    await expectError(
      rehearsalOracle(),
      coverage,
      "manual official evidence cannot be promoted before its controlling artifact validates",
    );
  });

  it("requires every non-review F03 contest to have a path or explicit non-promotable state", async () => {
    const incomplete = completeCoverage();
    incomplete.records = incomplete.records.filter(
      (record) => record.sourceId !== "ca-house-12-primary-official-source",
    );

    await expectError(
      rehearsalOracle(),
      incomplete,
      "Missing exact F03 source path or explicit non-promotable state",
    );
  });

  it("does not require Louisiana's conditional runoff until F02 records its trigger", async () => {
    expect(
      (await validateCoverage(rehearsalOracle(), completeCoverage())).errors,
    ).toEqual([]);

    const pending = revision(
      "la-house-06-runoff",
      {
        jurisdiction: "LA",
        office: "house",
        district: "06",
        electionKind: "regular",
        stage: "runoff",
        partyLane: "NONPARTISAN",
        conditionalEventId: "la-house-06-runoff",
        conditionalEventTriggered: false,
      },
      "2026-12-12",
    );
    pending.source.effectiveAt = "2026-07-13T00:00:00.000Z";
    const confirmed = {
      ...pending,
      id: "la-house-06-runoff-triggered",
      supersedesRevisionId: pending.id,
      identity: { ...pending.identity, conditionalEventTriggered: true },
      source: { ...pending.source, effectiveAt: "2026-07-14T00:00:00.000Z" },
    };
    const triggered = CalendarOracle.fromRevisions([pending, confirmed]);

    await expectError(
      triggered,
      completeCoverage(),
      "Missing exact F03 source path or explicit non-promotable state",
    );
  });

  it("requires Puerto Rico's explicit no-applicable-2026 state without changing F01's aggregate one-record contract", async () => {
    const missingPuertoRico = completeCoverage();
    missingPuertoRico.jurisdictionStates = [];
    await expectError(
      rehearsalOracle(),
      missingPuertoRico,
      "Missing explicit no-applicable-2026 state for F03 jurisdiction PR",
    );

    expect(f03CongressionalSourceInventory.records).toHaveLength(
      F03_REHEARSAL_JURISDICTIONS.length,
    );
    expect(
      new Set(
        f03CongressionalSourceInventory.records.map(
          (record) => record.jurisdiction,
        ),
      ).size,
    ).toBe(F03_REHEARSAL_JURISDICTIONS.length);
  });
});

async function expectError(
  oracle: CalendarOracle,
  coverage: unknown,
  message: string,
): Promise<void> {
  expect((await validateCoverage(oracle, coverage)).errors).toEqual(
    expect.arrayContaining([expect.stringContaining(message)]),
  );
}

function rehearsalOracle(): CalendarOracle {
  return CalendarOracle.fromRevisions([
    revision(
      "al-house-01",
      {
        jurisdiction: "AL",
        office: "house",
        district: "01",
        electionKind: "regular",
        stage: "primary",
      },
      "2026-08-11",
    ),
    revision(
      "al-house-03",
      {
        jurisdiction: "AL",
        office: "house",
        district: "03",
        electionKind: "regular",
        stage: "primary",
      },
      "2026-05-19",
    ),
    revision(
      "al-senate-class-2",
      {
        jurisdiction: "AL",
        office: "senate",
        senateSeat: "class-2",
        electionKind: "regular",
        stage: "primary",
      },
      "2026-05-19",
    ),
    revision(
      "tx-house-07-dem-primary",
      {
        jurisdiction: "TX",
        office: "house",
        district: "07",
        electionKind: "regular",
        stage: "primary",
        partyLane: "DEM",
      },
      "2026-03-03",
    ),
    revision(
      "tx-house-07-rep-primary",
      {
        jurisdiction: "TX",
        office: "house",
        district: "07",
        electionKind: "regular",
        stage: "primary",
        partyLane: "REP",
      },
      "2026-03-03",
    ),
    revision(
      "ca-house-12-primary",
      {
        jurisdiction: "CA",
        office: "house",
        district: "12",
        electionKind: "regular",
        stage: "primary",
        partyLane: "NONPARTISAN",
      },
      "2026-06-02",
    ),
    revision(
      "ak-house-at-large-general",
      {
        jurisdiction: "AK",
        office: "house",
        district: "AL",
        electionKind: "regular",
        stage: "general",
        partyLane: "NONPARTISAN",
      },
      "2026-11-03",
    ),
    revision(
      "dc-delegate-general",
      {
        jurisdiction: "DC",
        office: "delegate",
        electionKind: "regular",
        stage: "general",
        partyLane: "NONPARTISAN",
      },
      "2026-11-03",
    ),
    revision(
      "la-house-06-general",
      {
        jurisdiction: "LA",
        office: "house",
        district: "06",
        electionKind: "regular",
        stage: "general",
        partyLane: "NONPARTISAN",
      },
      "2026-11-03",
    ),
    revision(
      "la-house-06-runoff",
      {
        jurisdiction: "LA",
        office: "house",
        district: "06",
        electionKind: "regular",
        stage: "runoff",
        partyLane: "NONPARTISAN",
        conditionalEventId: "la-house-06-runoff",
        conditionalEventTriggered: false,
      },
      "2026-12-12",
    ),
  ]);
}

function completeCoverage(): {
  schemaVersion: 1;
  cycle: 2026;
  records: Array<Record<string, unknown>>;
  jurisdictionStates: Array<Record<string, unknown>>;
} {
  const paths = rehearsalOracle()
    .expectedContests()
    .map((contest) => ({
      sourceId: sourceIdFor(contest.id),
      f03InventorySourceId: f03SourceIdFor(contest.identity.jurisdiction),
      contest: {
        ...contest.identity,
        effectiveElectionDate: contest.electionDate,
      },
      promotionState:
        contest.identity.jurisdiction === "AL"
          ? "exact_official_source_path"
          : "manual_review_required",
    }));
  return {
    schemaVersion: 1,
    cycle: 2026,
    records: paths,
    jurisdictionStates: [
      {
        jurisdiction: "PR",
        cycle: 2026,
        state: "no_applicable_2026_contest",
      },
    ],
  };
}

function f03SourceIdFor(jurisdiction: string): string {
  const sourceIds: Record<string, string> = {
    AL: "al-2026-election-information",
    TX: "tx-2026-march-primary-listing",
    CA: "ca-2026-primary-congress-notice",
    AK: "ak-2026-final-candidate-list",
    DC: "dc-2026-elections",
    LA: "la-2026-candidate-inquiry",
  };
  return sourceIds[jurisdiction] ?? `unexpected-${jurisdiction}`;
}

function sourceIdFor(contestId: string): string {
  const sourceIds: Record<string, string> = {
    "2026|AL|house|01||regular|primary||": "al-house-01-official-source",
    "2026|AL|house|03||regular|primary||": "al-house-03-official-source",
    "2026|AL|senate||class-2|regular|primary||":
      "al-senate-class-2-official-source",
    "2026|TX|house|07||regular|primary|DEM|":
      "tx-house-07-dem-primary-official-source",
    "2026|TX|house|07||regular|primary|REP|":
      "tx-house-07-rep-primary-official-source",
    "2026|CA|house|12||regular|primary|NONPARTISAN|":
      "ca-house-12-primary-official-source",
    "2026|AK|house|AL||regular|general|NONPARTISAN|":
      "ak-house-at-large-general-official-source",
    "2026|DC|delegate|||regular|general|NONPARTISAN|":
      "dc-delegate-general-official-source",
    "2026|LA|house|06||regular|general|NONPARTISAN|":
      "la-house-06-general-official-source",
  };
  return sourceIds[contestId] ?? `unexpected-${contestId}`;
}

function revision(
  id: string,
  identity: Omit<CalendarRevision["identity"], "cycle">,
  electionDate: string,
): CalendarRevision {
  return {
    id,
    identity: { cycle: 2026, ...identity },
    electionDate,
    source: {
      kind: "state_election_authority",
      authorityName: "fixture authority",
      url: "https://elections.example.test/calendar",
      retrievedAt: "2026-07-13T00:00:00.000Z",
      checksum: id,
    },
  };
}

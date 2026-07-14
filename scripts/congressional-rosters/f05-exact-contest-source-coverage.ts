/**
 * F05's exact-contest overlay for the deliberately aggregate F03 inventory.
 *
 * F01/F03 retain one operational source-inventory record per jurisdiction.
 * This overlay is intentionally separate: it says which exact F02 calendar
 * contests a source path can cover, without retrieving, parsing, or promoting
 * any roster evidence (those concerns belong to F06/F07).
 */
import {
  CalendarOracle,
  type CalendarContest,
  type CalendarRevision,
  type CongressionalOffice,
  type ElectionKind,
  type ElectionStage,
} from "../ingest/congressional-calendar";
import {
  F03_REHEARSAL_JURISDICTIONS,
  f03CongressionalSourceInventory,
  type F03RehearsalJurisdiction,
} from "./f03-source-inventory";

export type ExactContestPromotionState =
  | "exact_official_source_path"
  | "manual_review_required"
  | "official_roster_not_yet_published"
  | "blocked";

export type ExactContestScope = {
  cycle: number;
  jurisdiction: F03RehearsalJurisdiction;
  office: CongressionalOffice;
  district?: string;
  senateSeat?: string;
  electionKind: ElectionKind;
  stage: ElectionStage;
  partyLane?: string;
  conditionalEventId?: string;
  effectiveElectionDate: string;
};

export type F03ExactContestSourcePath = {
  /**
   * Identifier for this exact source path. It may differ by contest even when
   * one aggregate F03 inventory record is the authority for several paths.
   */
  sourceId: string;
  /** The F03 jurisdiction-level official-source record this path refines. */
  f03InventorySourceId: string;
  contest: ExactContestScope;
  /** Non-promotable states are explicit coverage, never silent omissions. */
  promotionState: ExactContestPromotionState;
};

export type F03NoApplicable2026State = {
  jurisdiction: F03RehearsalJurisdiction;
  cycle: 2026;
  state: "no_applicable_2026_contest";
};

export type F03ExactContestSourceCoverage = {
  schemaVersion: 1;
  cycle: 2026;
  records: F03ExactContestSourcePath[];
  /** Required only where F02 has no F03 contest for that jurisdiction. */
  jurisdictionStates: F03NoApplicable2026State[];
};

export type F03ExactContestSourceCoverageValidation = {
  errors: string[];
  coveredContestIds: string[];
  nonPromotableContestIds: string[];
};

const PROMOTION_STATES: readonly ExactContestPromotionState[] = [
  "exact_official_source_path",
  "manual_review_required",
  "official_roster_not_yet_published",
  "blocked",
];
const OFFICES: readonly CongressionalOffice[] = [
  "house",
  "senate",
  "delegate",
  "resident_commissioner",
];
const KINDS: readonly ElectionKind[] = ["regular", "special"];
const STAGES: readonly ElectionStage[] = [
  "primary",
  "convention",
  "runoff",
  "general",
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value) || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isF03Jurisdiction(value: unknown): value is F03RehearsalJurisdiction {
  return (
    typeof value === "string" &&
    F03_REHEARSAL_JURISDICTIONS.includes(value as F03RehearsalJurisdiction)
  );
}

function scopeKey(scope: Record<string, unknown>): string {
  return [
    scope.cycle,
    scope.jurisdiction,
    scope.office,
    scope.district ?? "",
    scope.senateSeat ?? "",
    scope.electionKind,
    scope.stage,
    scope.partyLane ?? "",
    scope.conditionalEventId ?? "",
    scope.effectiveElectionDate,
  ].join("|");
}

function contestScopeKey(contest: CalendarContest): string {
  return scopeKey({
    ...contest.identity,
    effectiveElectionDate: contest.electionDate,
  });
}

function sameScope(
  scope: Record<string, unknown>,
  contest: CalendarContest,
): boolean {
  return scopeKey(scope) === contestScopeKey(contest);
}

function mismatchField(
  scope: Record<string, unknown>,
  expected: CalendarContest[],
): string {
  const fields: Array<[key: string, label: string]> = [
    ["jurisdiction", "jurisdiction"],
    ["office", "office"],
    ["district", "district"],
    ["senateSeat", "Senate seat"],
    ["electionKind", "election kind"],
    ["stage", "stage"],
    ["partyLane", "party lane"],
    ["conditionalEventId", "conditional event"],
    ["effectiveElectionDate", "effective election date"],
  ];
  const best = expected
    .map((contest) => ({
      contest,
      differences: fields.filter(
        ([field]) =>
          (scope[field] ?? undefined) !==
          ((field === "effectiveElectionDate"
            ? contest.electionDate
            : contest.identity[field as keyof typeof contest.identity]) ??
            undefined),
      ),
    }))
    .sort((a, b) => a.differences.length - b.differences.length)[0];
  return best?.differences[0]?.[1] ?? "exact scope";
}

function pathLabel(path: Record<string, unknown>, index: number): string {
  return isNonEmptyString(path.sourceId)
    ? `Source ${path.sourceId}`
    : `Source path ${index + 1}`;
}

function validateScopeShape(
  scope: unknown,
  label: string,
  errors: string[],
): scope is Record<string, unknown> {
  if (!isRecord(scope)) {
    errors.push(`${label}: exact contest scope is required.`);
    return false;
  }
  if (!Number.isInteger(scope.cycle) || scope.cycle !== 2026)
    errors.push(`${label}: contest.cycle must be 2026.`);
  if (!isF03Jurisdiction(scope.jurisdiction))
    errors.push(`${label}: contest.jurisdiction must be an F03 jurisdiction.`);
  if (!hasValue(OFFICES, scope.office))
    errors.push(`${label}: contest.office is invalid.`);
  if (!hasValue(KINDS, scope.electionKind))
    errors.push(`${label}: contest.electionKind is invalid.`);
  if (!hasValue(STAGES, scope.stage))
    errors.push(`${label}: contest.stage is invalid.`);
  if (!isIsoDate(scope.effectiveElectionDate))
    errors.push(`${label}: contest.effectiveElectionDate must be an ISO date.`);
  if (scope.office === "house" && !isNonEmptyString(scope.district))
    errors.push(`${label}: house contest scope requires district.`);
  if (scope.office === "senate" && !isNonEmptyString(scope.senateSeat))
    errors.push(`${label}: Senate contest scope requires senateSeat.`);
  return true;
}

/**
 * Join the F03-only source-path overlay to F02's authoritative oracle.
 * Aggregate F01/F03 `offices`/`dates`/`stages` fields are deliberately never
 * read here, so they cannot accidentally establish contest coverage.
 */
export function validateF03ExactContestSourceCoverage(
  oracle: CalendarOracle,
  coverage: unknown,
): F03ExactContestSourceCoverageValidation {
  const errors: string[] = [];
  const validByContest = new Map<string, ExactContestPromotionState[]>();
  if (!isRecord(coverage))
    return {
      errors: ["F05 exact coverage must be an object."],
      coveredContestIds: [],
      nonPromotableContestIds: [],
    };
  if (coverage.schemaVersion !== 1)
    errors.push("F05 exact coverage schemaVersion must be 1.");
  if (coverage.cycle !== 2026)
    errors.push("F05 exact coverage cycle must be 2026.");
  if (!Array.isArray(coverage.records)) {
    errors.push("F05 exact coverage records must be an array.");
  }

  const expected = oracle
    .expectedContests()
    .filter((contest) => isF03Jurisdiction(contest.identity.jurisdiction));
  const nonReviewExpected = expected.filter(
    (contest) => !contest.calendarReviewRequired,
  );
  const f03InventoryById = new Map(
    f03CongressionalSourceInventory.records.map((record) => [
      record.sourceId,
      record,
    ]),
  );
  const seenSourceScopes = new Set<string>();

  if (Array.isArray(coverage.records)) {
    coverage.records.forEach((path, index) => {
      if (!isRecord(path)) {
        errors.push(`Source path ${index + 1} must be an object.`);
        return;
      }
      const label = pathLabel(path, index);
      const sourceId = path.sourceId;
      const f03InventorySourceId = path.f03InventorySourceId;
      const scope = path.contest;
      const promotionState = path.promotionState;
      if (!isNonEmptyString(sourceId))
        errors.push(`${label}: sourceId is required.`);
      if (!isNonEmptyString(f03InventorySourceId)) {
        errors.push(`${label}: f03InventorySourceId is required.`);
      }
      const scopeValid = validateScopeShape(scope, label, errors);
      if (!hasValue(PROMOTION_STATES, promotionState))
        errors.push(`${label}: promotionState is invalid or unknown.`);
      if (
        !scopeValid ||
        !isNonEmptyString(sourceId) ||
        !isNonEmptyString(f03InventorySourceId) ||
        !hasValue(PROMOTION_STATES, promotionState)
      ) {
        return;
      }

      const inventoryRecord = f03InventoryById.get(f03InventorySourceId);
      if (!inventoryRecord) {
        errors.push(
          `${label}: f03InventorySourceId is not an F03 official-source record.`,
        );
        return;
      }
      if (inventoryRecord.jurisdiction !== scope.jurisdiction) {
        errors.push(
          `${label}: f03InventorySourceId must match the exact contest jurisdiction.`,
        );
        return;
      }
      const manualEvidence = inventoryRecord.evidence.manualImport;
      if (
        promotionState === "exact_official_source_path" &&
        manualEvidence &&
        manualEvidence.officialArtifactValidated !== true
      ) {
        errors.push(
          `${label}: manual official evidence cannot be promoted before its controlling artifact validates.`,
        );
        return;
      }
      const duplicateKey = `${sourceId}|${scopeKey(scope)}`;
      if (seenSourceScopes.has(duplicateKey)) {
        errors.push(`${label}: duplicate sourceId and exact contest scope.`);
        return;
      }
      seenSourceScopes.add(duplicateKey);

      const exactExpected = expected.find((contest) =>
        sameScope(scope, contest),
      );
      if (exactExpected?.calendarReviewRequired) {
        errors.push(
          `${label}: calendar review required for exact F02 contest ${exactExpected.id}.`,
        );
        return;
      }
      if (!exactExpected) {
        const sameIdentityDifferentDate = expected.find((contest) => {
          const withoutDate = { ...scope };
          delete withoutDate.effectiveElectionDate;
          const expectedWithoutDate = {
            ...contest.identity,
            effectiveElectionDate: undefined,
          };
          return (
            scopeKey({ ...withoutDate, effectiveElectionDate: "" }) ===
            scopeKey(expectedWithoutDate)
          );
        });
        const field = mismatchField(scope, expected);
        if (sameIdentityDifferentDate) {
          errors.push(
            `${label}: effective election date does not match an expected F02 contest.`,
          );
        } else if (
          !expected.some(
            (contest) => contest.identity.jurisdiction === scope.jurisdiction,
          )
        ) {
          errors.push(`${label}: claims an unknown F02 contest.`);
        } else {
          errors.push(
            `${label}: ${field} does not match an expected F02 contest.`,
          );
        }
        return;
      }
      const states = validByContest.get(exactExpected.id) ?? [];
      states.push(promotionState);
      validByContest.set(exactExpected.id, states);
    });
  }

  const noApplicable = new Set<F03RehearsalJurisdiction>();
  if (!Array.isArray(coverage.jurisdictionStates)) {
    errors.push("F05 jurisdictionStates must be an array.");
  } else {
    coverage.jurisdictionStates.forEach((state, index) => {
      if (!isRecord(state)) {
        errors.push(`Jurisdiction state ${index + 1} must be an object.`);
        return;
      }
      if (!isF03Jurisdiction(state.jurisdiction)) {
        errors.push(
          `Jurisdiction state ${index + 1}: jurisdiction must be an F03 jurisdiction.`,
        );
        return;
      }
      if (
        state.cycle !== 2026 ||
        state.state !== "no_applicable_2026_contest"
      ) {
        errors.push(
          `Jurisdiction state ${state.jurisdiction}: must explicitly be no_applicable_2026_contest for cycle 2026.`,
        );
        return;
      }
      if (noApplicable.has(state.jurisdiction)) {
        errors.push(
          `Jurisdiction state ${state.jurisdiction}: duplicate no-applicable-2026 state.`,
        );
        return;
      }
      if (
        expected.some(
          (contest) => contest.identity.jurisdiction === state.jurisdiction,
        )
      ) {
        errors.push(
          `Jurisdiction state ${state.jurisdiction}: cannot claim no applicable 2026 contest while F02 has a contest.`,
        );
        return;
      }
      noApplicable.add(state.jurisdiction);
    });
  }

  for (const contest of nonReviewExpected) {
    if (!validByContest.has(contest.id)) {
      errors.push(
        `Missing exact F03 source path or explicit non-promotable state for expected contest ${contest.id}.`,
      );
    }
  }
  for (const jurisdiction of F03_REHEARSAL_JURISDICTIONS) {
    if (
      !expected.some(
        (contest) => contest.identity.jurisdiction === jurisdiction,
      ) &&
      !noApplicable.has(jurisdiction)
    ) {
      errors.push(
        `Missing explicit no-applicable-2026 state for F03 jurisdiction ${jurisdiction}.`,
      );
    }
  }

  const coveredContestIds = [...validByContest.keys()];
  return {
    errors,
    coveredContestIds,
    nonPromotableContestIds: coveredContestIds.filter((id) =>
      (validByContest.get(id) ?? []).some(
        (state) => state !== "exact_official_source_path",
      ),
    ),
  };
}

const reviewedAt = "2026-07-13T00:00:00.000Z";

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
      authorityName: "F05 checked-in rehearsal fixture",
      url: "https://elections.example.test/f05-calendar-fixture",
      retrievedAt: reviewedAt,
      checksum: id,
    },
  };
}

/** Checked-in F02-shaped fixture; this verifier performs no live retrieval. */
export const F05_REHEARSAL_CALENDAR_REVISIONS: CalendarRevision[] = [
  revision(
    "al-house-01-primary",
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
    "al-house-03-primary",
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
    "al-senate-class-2-primary",
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
];

export const f05ExactContestSourceCoverage: F03ExactContestSourceCoverage = {
  schemaVersion: 1,
  cycle: 2026,
  records: CalendarOracle.fromRevisions(F05_REHEARSAL_CALENDAR_REVISIONS)
    .expectedContests()
    .map((contest) => ({
      sourceId: `f05-${contest.id}-official-path`,
      f03InventorySourceId: f03CongressionalSourceInventory.records.find(
        (record) => record.jurisdiction === contest.identity.jurisdiction,
      )!.sourceId,
      contest: {
        ...contest.identity,
        jurisdiction: contest.identity.jurisdiction as F03RehearsalJurisdiction,
        effectiveElectionDate: contest.electionDate,
      },
      promotionState:
        contest.identity.jurisdiction === "AL"
          ? "exact_official_source_path"
          : contest.identity.jurisdiction === "LA"
            ? "official_roster_not_yet_published"
            : "manual_review_required",
    })),
  jurisdictionStates: [
    { jurisdiction: "PR", cycle: 2026, state: "no_applicable_2026_contest" },
  ],
};

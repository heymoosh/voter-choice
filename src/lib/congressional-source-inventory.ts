/**
 * Contract for the repository's official-source inventory. This describes
 * source research only; it does not retrieve, parse, or promote a roster.
 *
 * The responsible state, district, or territorial election authority is the
 * roster authority. The FEC state-election-office directory may be retained
 * as a discovery aid, but is never authoritative roster evidence.
 */
export const CONGRESSIONAL_JURISDICTIONS = [
  "AK",
  "AL",
  "AR",
  "AS",
  "AZ",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "GU",
  "HI",
  "IA",
  "ID",
  "IL",
  "IN",
  "KS",
  "KY",
  "LA",
  "MA",
  "MD",
  "ME",
  "MI",
  "MN",
  "MO",
  "MP",
  "MS",
  "MT",
  "NC",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NM",
  "NV",
  "NY",
  "OH",
  "OK",
  "OR",
  "PA",
  "PR",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "VI",
  "VT",
  "WA",
  "WI",
  "WV",
  "WY",
] as const;

export type CongressionalJurisdiction =
  (typeof CONGRESSIONAL_JURISDICTIONS)[number];
export type CoverageState =
  | "automatable"
  | "manual_official_import"
  | "official_roster_not_yet_published"
  | "blocked";

type AuthorityRole =
  | "state_election_authority"
  | "district_election_authority"
  | "territorial_election_authority";

export interface CongressionalSourceInventoryRecord {
  schemaVersion: 1;
  sourceId: string;
  jurisdiction: CongressionalJurisdiction;
  authority: {
    name: string;
    role: AuthorityRole;
    url: string;
  };
  officialLandingPage: string;
  calendarSource: string;
  candidatePublicationSource: string;
  sourceRole:
    | "calendar_seed"
    | "calendar_authority"
    | "filing_list"
    | "qualified_or_certified_roster"
    | "sample_ballot"
    | "secondary_check";
  contestScope: {
    offices: Array<"house" | "senate" | "delegate" | "resident_commissioner">;
    electionDates: string[];
    stages: Array<"primary" | "convention" | "runoff" | "general">;
  };
  sourceFormat:
    "csv" | "xlsx" | "json" | "xml" | "html" | "pdf" | "portal" | "manual";
  parserFamily:
    | "csv"
    | "xlsx"
    | "json"
    | "xml"
    | "html_table"
    | "text_pdf"
    | "rendered_portal"
    | "manual_official_import"
    | "not_applicable";
  updateCadence: "daily" | "weekly" | "event_driven" | "manual";
  activeWindow: string;
  accessConstraints: string[];
  fallbackManualImportProcedure: string;
  lastVerifiedAt: string;
  reviewedBy: string;
  coverageState: CoverageState;
  discoverySources?: Array<{
    provider: "fec_state_election_office_directory";
    role: "discovery_only";
    url: string;
  }>;
}

export interface CongressionalSourceInventory {
  schemaVersion: 1;
  cycle: number;
  records: CongressionalSourceInventoryRecord[];
}

export interface CongressionalSourceInventoryValidation {
  errors: string[];
  coveredJurisdictions: CongressionalJurisdiction[];
  coverageStates: CoverageState[];
}

const COVERAGE_STATES: CoverageState[] = [
  "automatable",
  "blocked",
  "manual_official_import",
  "official_roster_not_yet_published",
];

const AUTHORITY_ROLES: AuthorityRole[] = [
  "state_election_authority",
  "district_election_authority",
  "territorial_election_authority",
];

const SOURCE_ROLES = [
  "calendar_seed",
  "calendar_authority",
  "filing_list",
  "qualified_or_certified_roster",
  "sample_ballot",
  "secondary_check",
];

const SOURCE_FORMATS = [
  "csv",
  "xlsx",
  "json",
  "xml",
  "html",
  "pdf",
  "portal",
  "manual",
];
const PARSER_FAMILIES = [
  "csv",
  "xlsx",
  "json",
  "xml",
  "html_table",
  "text_pdf",
  "rendered_portal",
  "manual_official_import",
  "not_applicable",
];
const UPDATE_CADENCES = ["daily", "weekly", "event_driven", "manual"];
const OFFICES = ["house", "senate", "delegate", "resident_commissioner"];
const STAGES = ["primary", "convention", "runoff", "general"];

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

function hasNonEmptyStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
  );
}

function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    isIsoDate(value.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isActiveWindow(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const [start, end, ...rest] = value.split("/");
  if (rest.length > 0 || !isIsoDate(start) || !isIsoDate(end)) return false;
  return start <= end;
}

function isFecUrl(value: unknown): boolean {
  if (!isHttpsUrl(value)) return false;
  return (
    new URL(value).hostname === "fec.gov" ||
    new URL(value).hostname.endsWith(".fec.gov")
  );
}

function validateRequiredUrl(
  record: Record<string, unknown>,
  field:
    "officialLandingPage" | "calendarSource" | "candidatePublicationSource",
  label: string,
  errors: string[],
): void {
  const value = record[field];
  if (!isHttpsUrl(value)) {
    errors.push(`${label}: ${field} must be an HTTPS URL.`);
  } else if (isFecUrl(value)) {
    errors.push(
      `${label}: ${field} cannot use FEC as roster authority; FEC is discovery-only.`,
    );
  }
}

function validateAuthority(
  authority: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(authority)) {
    errors.push(`${label}: authority is required.`);
    return;
  }
  if (!isNonEmptyString(authority.name))
    errors.push(`${label}: authority.name is required.`);
  if (!hasValue(AUTHORITY_ROLES, authority.role)) {
    errors.push(
      `${label}: authority.role must name the responsible state, district, or territorial election authority; FEC is discovery-only.`,
    );
  }
  if (!isHttpsUrl(authority.url)) {
    errors.push(`${label}: authority.url must be an HTTPS URL.`);
  } else if (isFecUrl(authority.url)) {
    errors.push(
      `${label}: authority.url cannot use FEC as roster authority; FEC is discovery-only.`,
    );
  }
}

function validateContestScope(
  contestScope: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(contestScope)) {
    errors.push(`${label}: contestScope is required.`);
    return;
  }
  if (
    !hasNonEmptyStrings(contestScope.offices) ||
    !contestScope.offices.every((office) => OFFICES.includes(office))
  ) {
    errors.push(
      `${label}: contestScope.offices must contain supported offices.`,
    );
  }
  if (
    !hasNonEmptyStrings(contestScope.electionDates) ||
    !contestScope.electionDates.every(isIsoDate)
  ) {
    errors.push(`${label}: contestScope.electionDates must contain ISO dates.`);
  }
  if (
    !hasNonEmptyStrings(contestScope.stages) ||
    !contestScope.stages.every((stage) => STAGES.includes(stage))
  ) {
    errors.push(`${label}: contestScope.stages must contain supported stages.`);
  }
}

function validateSourceConfiguration(
  record: Record<string, unknown>,
  label: string,
  errors: string[],
): void {
  if (!hasValue(SOURCE_FORMATS, record.sourceFormat))
    errors.push(`${label}: sourceFormat is invalid.`);
  if (!hasValue(PARSER_FAMILIES, record.parserFamily))
    errors.push(`${label}: parserFamily is invalid.`);
  if (!hasValue(UPDATE_CADENCES, record.updateCadence))
    errors.push(`${label}: updateCadence is invalid.`);
}

function validateOperationalMetadata(
  record: Record<string, unknown>,
  label: string,
  errors: string[],
): void {
  if (!isActiveWindow(record.activeWindow))
    errors.push(`${label}: activeWindow must be an inclusive ISO date range.`);
  if (
    !Array.isArray(record.accessConstraints) ||
    !record.accessConstraints.every(isNonEmptyString)
  )
    errors.push(`${label}: accessConstraints must be an array of strings.`);
  if (!isNonEmptyString(record.fallbackManualImportProcedure))
    errors.push(`${label}: fallbackManualImportProcedure is required.`);
  if (!isIsoTimestamp(record.lastVerifiedAt))
    errors.push(`${label}: lastVerifiedAt must be an ISO timestamp.`);
  if (!isNonEmptyString(record.reviewedBy))
    errors.push(`${label}: reviewedBy is required.`);
  if (!hasValue(COVERAGE_STATES, record.coverageState))
    errors.push(`${label}: coverageState is invalid.`);
}

function validateRecord(
  record: unknown,
  index: number,
  errors: string[],
): CongressionalJurisdiction | null {
  if (!isRecord(record)) {
    errors.push(`Record ${index + 1} must be an object.`);
    return null;
  }

  const label = isNonEmptyString(record.jurisdiction)
    ? record.jurisdiction
    : `record ${index + 1}`;
  if (record.schemaVersion !== 1)
    errors.push(`${label}: schemaVersion must be 1.`);
  if (!isNonEmptyString(record.sourceId))
    errors.push(`${label}: sourceId is required.`);
  if (!hasValue(CONGRESSIONAL_JURISDICTIONS, record.jurisdiction)) {
    errors.push(
      `Unknown congressional jurisdiction ${String(record.jurisdiction)}.`,
    );
  }

  validateAuthority(record.authority, label, errors);
  validateRequiredUrl(record, "officialLandingPage", label, errors);
  validateRequiredUrl(record, "calendarSource", label, errors);
  validateRequiredUrl(record, "candidatePublicationSource", label, errors);
  if (!hasValue(SOURCE_ROLES, record.sourceRole))
    errors.push(`${label}: sourceRole is invalid.`);
  validateContestScope(record.contestScope, label, errors);
  validateSourceConfiguration(record, label, errors);
  validateOperationalMetadata(record, label, errors);

  return hasValue(CONGRESSIONAL_JURISDICTIONS, record.jurisdiction)
    ? record.jurisdiction
    : null;
}

function validateCongressionalSourceInventoryForJurisdictions(
  inventory: unknown,
  expectedJurisdictions: readonly CongressionalJurisdiction[],
  options: {
    missingPrefix?: string;
    outOfScopePrefix?: string;
    rejectDuplicates?: boolean;
  } = {},
): CongressionalSourceInventoryValidation {
  const errors: string[] = [];
  const covered = new Set<CongressionalJurisdiction>();
  const coverageStates = new Set<CoverageState>();
  const missingPrefix =
    options.missingPrefix ?? "Missing inventory record for jurisdiction";
  const outOfScopePrefix =
    options.outOfScopePrefix ?? "Inventory contains out-of-scope jurisdiction";

  if (!isRecord(inventory)) {
    return {
      errors: ["Congressional source inventory must be an object."],
      coveredJurisdictions: [],
      coverageStates: [],
    };
  }
  if (inventory.schemaVersion !== 1)
    errors.push("Inventory schemaVersion must be 1.");
  if (
    typeof inventory.cycle !== "number" ||
    !Number.isInteger(inventory.cycle) ||
    inventory.cycle < 1
  ) {
    errors.push("Inventory cycle must be a positive integer.");
  }
  if (!Array.isArray(inventory.records)) {
    return {
      errors: [...errors, "Inventory records must be an array."],
      coveredJurisdictions: [],
      coverageStates: [],
    };
  }

  inventory.records.forEach((record, index) => {
    const jurisdiction = validateRecord(record, index, errors);
    if (jurisdiction) {
      if (
        options.outOfScopePrefix &&
        !expectedJurisdictions.includes(jurisdiction)
      ) {
        errors.push(`${outOfScopePrefix} ${jurisdiction}.`);
      } else if (options.rejectDuplicates && covered.has(jurisdiction)) {
        errors.push(
          `Duplicate inventory record for jurisdiction ${jurisdiction}.`,
        );
      } else {
        covered.add(jurisdiction);
      }
    }
    if (isRecord(record) && hasValue(COVERAGE_STATES, record.coverageState))
      coverageStates.add(record.coverageState);
  });

  for (const jurisdiction of expectedJurisdictions) {
    if (!covered.has(jurisdiction))
      errors.push(`${missingPrefix} ${jurisdiction}.`);
  }

  return {
    errors,
    coveredJurisdictions: expectedJurisdictions.filter((jurisdiction) =>
      covered.has(jurisdiction),
    ),
    coverageStates: COVERAGE_STATES.filter((state) =>
      coverageStates.has(state),
    ),
  };
}

/**
 * Validate a deliberately bounded inventory slice. This is for rehearsal and
 * rollout gates; the national validator below retains its all-jurisdiction
 * contract for F01.
 */
export function validateCongressionalSourceInventoryScope(
  inventory: unknown,
  expectedJurisdictions: readonly CongressionalJurisdiction[],
  options: {
    missingPrefix?: string;
    outOfScopePrefix?: string;
  } = {},
): CongressionalSourceInventoryValidation {
  return validateCongressionalSourceInventoryForJurisdictions(
    inventory,
    expectedJurisdictions,
    { ...options, rejectDuplicates: true },
  );
}

export function validateCongressionalSourceInventory(
  inventory: unknown,
): CongressionalSourceInventoryValidation {
  return validateCongressionalSourceInventoryForJurisdictions(
    inventory,
    CONGRESSIONAL_JURISDICTIONS,
  );
}

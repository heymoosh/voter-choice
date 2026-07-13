import type {
  CongressionalJurisdiction,
  CongressionalSourceInventoryRecord,
  CoverageState,
} from "../../src/lib/congressional-source-inventory";
import { validateCongressionalSourceInventoryScope } from "../../src/lib/congressional-source-inventory";

export const F03_REHEARSAL_JURISDICTIONS = [
  "AL",
  "TX",
  "CA",
  "DC",
  "AK",
  "LA",
  "PR",
] as const satisfies readonly CongressionalJurisdiction[];

export type F03RehearsalJurisdiction =
  (typeof F03_REHEARSAL_JURISDICTIONS)[number];

type CandidateAvailability =
  | "qualified_or_certified"
  | "manual_review_required"
  | "not_published"
  | "blocked";
type SourceObservation =
  | "qualified_or_certified_roster"
  | "filing_list_only"
  | "manual_official_import"
  | "not_published"
  | "challenge_or_error"
  | "access_blocked";

export interface F03SourceEvidence {
  sourceObservation: SourceObservation;
  candidateAvailability: CandidateAvailability;
  verifiedAt: string;
  evidenceUrl: string;
  evidenceSummary: string;
}

export interface F03CongressionalSourceInventoryRecord
  extends CongressionalSourceInventoryRecord {
  jurisdiction: F03RehearsalJurisdiction;
  evidence: F03SourceEvidence;
}

export interface F03CongressionalSourceInventory {
  schemaVersion: 1;
  cycle: 2026;
  records: F03CongressionalSourceInventoryRecord[];
}

export interface F03CongressionalSourceInventoryValidation {
  errors: string[];
  coveredJurisdictions: F03RehearsalJurisdiction[];
  coverageStates: CoverageState[];
}

const reviewedAt = "2026-07-13T00:00:00.000Z";

export const f03CongressionalSourceInventory: F03CongressionalSourceInventory =
  {
    schemaVersion: 1,
    cycle: 2026,
    records: [
      {
        schemaVersion: 1,
        sourceId: "al-2026-election-information",
        jurisdiction: "AL",
        authority: {
          name: "Alabama Secretary of State",
          role: "state_election_authority",
          url: "https://www.sos.alabama.gov/alabama-votes",
        },
        officialLandingPage:
          "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026",
        calendarSource:
          "https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections",
        candidatePublicationSource:
          "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026",
        sourceRole: "qualified_or_certified_roster",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: [
            "2026-05-19",
            "2026-06-16",
            "2026-08-11",
            "2026-11-03",
          ],
          stages: ["primary", "runoff", "general"],
        },
        sourceFormat: "html",
        parserFamily: "html_table",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-12-31",
        accessConstraints: [
          "Follow the state-published certification links; do not infer availability from filing guidance.",
        ],
        fallbackManualImportProcedure:
          "Download the current state certification or sample ballot and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "automatable",
        evidence: {
          sourceObservation: "qualified_or_certified_roster",
          candidateAvailability: "qualified_or_certified",
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026",
          evidenceSummary:
            "The state 2026 election page publishes state certifications for the May primary, June runoff, August congressional special primary, and November general election.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "tx-2026-march-primary-listing",
        jurisdiction: "TX",
        authority: {
          name: "Texas Secretary of State",
          role: "state_election_authority",
          url: "https://www.sos.texas.gov/elections/",
        },
        officialLandingPage:
          "https://www.sos.texas.gov/elections/laws/2026marchprimaryelection332026.shtml",
        calendarSource:
          "https://www.sos.texas.gov/elections/laws/2026marchprimaryelection332026.shtml",
        candidatePublicationSource:
          "https://www.sos.texas.gov/elections/laws/2026marchprimaryelection332026.shtml",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-03-03", "2026-05-26"],
          stages: ["primary", "runoff"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The Secretary of State page links to a hosted candidate-listing portal; a filing listing is not ballot-certification evidence.",
        ],
        fallbackManualImportProcedure:
          "Obtain the exact current official ballot or certification for the contest and send it through the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.sos.texas.gov/elections/laws/2026marchprimaryelection332026.shtml",
          evidenceSummary:
            "The state page labels the linked record as Candidate Listing Information; this rehearsal intentionally treats that filing-stage listing as insufficient for qualified/certified availability.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "ca-2026-primary-congress-notice",
        jurisdiction: "CA",
        authority: {
          name: "California Secretary of State",
          role: "state_election_authority",
          url: "https://www.sos.ca.gov/elections",
        },
        officialLandingPage:
          "https://www.sos.ca.gov/elections/upcoming-elections/primary-election-june-2-2026",
        calendarSource:
          "https://www.sos.ca.gov/elections/upcoming-elections/primary-election-june-2-2026",
        candidatePublicationSource:
          "https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-06-02", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "pdf",
        parserFamily: "text_pdf",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The official Notice to Candidates is a filing notice and is retained only as a discovery/review artifact, never as general-election availability proof.",
        ],
        fallbackManualImportProcedure:
          "Use the current certified list or official sample ballot for the exact contest and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf",
          evidenceSummary:
            "The state-hosted PDF is a Notice to Candidates for the June primary, so it cannot establish a qualified/certified upcoming-contest roster.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "dc-2026-elections",
        jurisdiction: "DC",
        authority: {
          name: "District of Columbia Board of Elections",
          role: "district_election_authority",
          url: "https://www.dcboe.org/",
        },
        officialLandingPage: "https://www.dcboe.org/elections/2026-elections",
        calendarSource:
          "https://www.dcboe.org/getmedia/4d04f4a1-fb2a-4f8a-809f-d3f708f232df/2026-General-Election-Calendar-Version-08072025.pdf",
        candidatePublicationSource:
          "https://www.dcboe.org/elections/2026-elections",
        sourceRole: "secondary_check",
        contestScope: {
          offices: ["delegate"],
          electionDates: ["2026-06-16", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "manual_official_import",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-12-31",
        accessConstraints: [
          "DCBOE directs voters to the 2026 elections page for the current candidate list; preserve an exact official artifact for review rather than treating the landing page alone as a roster.",
        ],
        fallbackManualImportProcedure:
          "Download the exact Delegate candidate list or sample ballot from DCBOE and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "manual_official_import",
          candidateAvailability: "manual_review_required",
          verifiedAt: reviewedAt,
          evidenceUrl: "https://www.dcboe.org/elections/2026-elections",
          evidenceSummary:
            "DCBOE's official April notice says the June primary includes Delegate and directs readers to the 2026 elections page for the current candidate list; this record remains manual until that exact artifact is captured.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "ak-2026-final-candidate-list",
        jurisdiction: "AK",
        authority: {
          name: "Alaska Division of Elections",
          role: "state_election_authority",
          url: "https://www.elections.alaska.gov/",
        },
        officialLandingPage: "https://www.elections.alaska.gov/candidates/",
        calendarSource: "https://www.elections.alaska.gov/candidates/",
        candidatePublicationSource:
          "https://www.elections.alaska.gov/candidates/?election=26prim",
        sourceRole: "qualified_or_certified_roster",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-08-18", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "html",
        parserFamily: "html_table",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The official final candidate list is subject to active ballot-eligibility challenge/review; do not automate promotion until a reviewer captures the controlling resolution.",
        ],
        fallbackManualImportProcedure:
          "Capture the current official candidate list and any controlling challenge resolution, then submit both to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "challenge_or_error",
          candidateAvailability: "manual_review_required",
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.elections.alaska.gov/wp-content/uploads/2026/06/Final-Determination-6.15.2026-DOE.pdf",
          evidenceSummary:
            "The Division's June 15 final determination documents a ballot-eligibility dispute; availability remains review-required even though the candidate page labels its list final.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "la-2026-candidate-inquiry",
        jurisdiction: "LA",
        authority: {
          name: "Louisiana Secretary of State",
          role: "state_election_authority",
          url: "https://www.sos.la.gov/electionsandvoting",
        },
        officialLandingPage:
          "https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103",
        calendarSource:
          "https://www.sos.la.gov/elections-voting/how-candidates-are-elected",
        candidatePublicationSource:
          "https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103",
        sourceRole: "calendar_authority",
        contestScope: {
          offices: ["house"],
          electionDates: ["2026-11-03", "2026-12-12"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "daily",
        activeWindow: "2026-01-01/2026-12-12",
        accessConstraints: [
          "As of July 13, 2026, Candidate Inquiry exposes the November election selector but not a congressional candidate roster; Louisiana qualifying begins July 29. Do not infer a qualified roster from the portal shell.",
        ],
        fallbackManualImportProcedure:
          "Wait for the post-qualifying official Candidate Inquiry results or a state sample ballot, then submit the exact artifact to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "official_roster_not_yet_published",
        evidence: {
          sourceObservation: "not_published",
          candidateAvailability: "not_published",
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103",
          evidenceSummary:
            "As of July 13, the Secretary of State Candidate Inquiry exposes the November 3 election selector but no congressional candidates. Louisiana qualifying begins July 29, so no qualified/certified roster is yet published for automation.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "pr-2028-cee-landing",
        jurisdiction: "PR",
        authority: {
          name: "Puerto Rico State Elections Commission",
          role: "territorial_election_authority",
          url: "https://ww2.ceepur.org/",
        },
        officialLandingPage: "https://ww2.ceepur.org/",
        calendarSource: "https://ww2.ceepur.org/",
        candidatePublicationSource: "https://ww2.ceepur.org/",
        sourceRole: "calendar_authority",
        contestScope: {
          offices: ["resident_commissioner"],
          electionDates: ["2028-11-07"],
          stages: ["general"],
        },
        sourceFormat: "html",
        parserFamily: "not_applicable",
        updateCadence: "manual",
        activeWindow: "2026-07-13/2028-11-07",
        accessConstraints: [
          "The official landing page currently links to 2028 general-election guidance but does not publish a Resident Commissioner candidate roster; do not infer names from filing-intention systems.",
        ],
        fallbackManualImportProcedure:
          "Wait for a current CEE certified roster or obtain an official published artifact for manual review.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "F03 official-source rehearsal",
        coverageState: "official_roster_not_yet_published",
        evidence: {
          sourceObservation: "not_published",
          candidateAvailability: "not_published",
          verifiedAt: reviewedAt,
          evidenceUrl: "https://ww2.ceepur.org/",
          evidenceSummary:
            "The official CEE landing page shows 2028 general-election guidance and a candidacy-intention system, not a current certified Resident Commissioner roster.",
        },
      },
    ],
  };

export function validateF03CongressionalSourceInventory(
  inventory: unknown,
): F03CongressionalSourceInventoryValidation {
  const result = validateCongressionalSourceInventoryScope(
    inventory,
    F03_REHEARSAL_JURISDICTIONS,
    {
      missingPrefix: "Missing F03 rehearsal inventory record for jurisdiction",
      outOfScopePrefix: "F03 rehearsal contains out-of-scope jurisdiction",
    },
  );

  if (!isRecord(inventory) || !Array.isArray(inventory.records))
    return toF03Validation(result);

  for (const record of inventory.records) {
    if (!isRecord(record)) continue;
    const label =
      typeof record.jurisdiction === "string" ? record.jurisdiction : "record";
    const evidence = record.evidence;
    if (!isRecord(evidence)) {
      result.errors.push(`${label}: evidence is required.`);
      continue;
    }
    const observation = evidence.sourceObservation;
    const availability = evidence.candidateAvailability;
    if (!SOURCE_OBSERVATIONS.includes(observation as SourceObservation)) {
      result.errors.push(
        `${label}: evidence.sourceObservation is invalid; unknown is not allowed.`,
      );
    }
    if (
      !CANDIDATE_AVAILABILITY.includes(availability as CandidateAvailability)
    ) {
      result.errors.push(
        `${label}: evidence.candidateAvailability is invalid; unknown is not allowed.`,
      );
    }
    if (!isHttpsUrl(evidence.evidenceUrl))
      result.errors.push(
        `${label}: evidence.evidenceUrl must be an HTTPS URL.`,
      );
    if (!isNonEmptyString(evidence.evidenceSummary))
      result.errors.push(`${label}: evidence.evidenceSummary is required.`);
    if (!isIsoTimestamp(evidence.verifiedAt))
      result.errors.push(
        `${label}: evidence.verifiedAt must be an ISO timestamp.`,
      );

    if (
      observation === "filing_list_only" &&
      availability === "qualified_or_certified"
    ) {
      result.errors.push(
        `${label}: filing_list_only evidence can never establish qualified_or_certified availability.`,
      );
    }
    if (
      observation === "challenge_or_error" &&
      record.coverageState !== "manual_official_import"
    ) {
      result.errors.push(
        `${label}: challenge_or_error evidence requires manual_official_import coverage.`,
      );
    }
    if (
      observation === "challenge_or_error" &&
      availability !== "manual_review_required"
    ) {
      result.errors.push(
        `${label}: challenge_or_error evidence requires manual_review_required availability.`,
      );
    }
    if (
      observation === "not_published" &&
      (record.coverageState !== "official_roster_not_yet_published" ||
        availability !== "not_published")
    ) {
      result.errors.push(
        `${label}: not_published evidence requires official_roster_not_yet_published coverage and not_published availability.`,
      );
    }
    if (
      observation === "access_blocked" &&
      (record.coverageState !== "blocked" || availability !== "blocked")
    ) {
      result.errors.push(
        `${label}: access_blocked evidence requires blocked coverage and blocked availability.`,
      );
    }
    if (
      record.coverageState === "automatable" &&
      (observation !== "qualified_or_certified_roster" ||
        availability !== "qualified_or_certified" ||
        (record.sourceRole !== "qualified_or_certified_roster" &&
          record.sourceRole !== "sample_ballot"))
    ) {
      result.errors.push(
        `${label}: automatable coverage requires an official qualified/certified roster or sample ballot.`,
      );
    }
  }

  return toF03Validation(result);
}

function toF03Validation(
  result: ReturnType<typeof validateCongressionalSourceInventoryScope>,
): F03CongressionalSourceInventoryValidation {
  return {
    ...result,
    coveredJurisdictions: result.coveredJurisdictions.filter(
      (jurisdiction): jurisdiction is F03RehearsalJurisdiction =>
        F03_REHEARSAL_JURISDICTIONS.includes(
          jurisdiction as F03RehearsalJurisdiction,
        ),
    ),
  };
}

const SOURCE_OBSERVATIONS: SourceObservation[] = [
  "qualified_or_certified_roster",
  "filing_list_only",
  "manual_official_import",
  "not_published",
  "challenge_or_error",
  "access_blocked",
];
const CANDIDATE_AVAILABILITY: CandidateAvailability[] = [
  "qualified_or_certified",
  "manual_review_required",
  "not_published",
  "blocked",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

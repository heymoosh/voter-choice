import type {
  CongressionalJurisdiction,
  CongressionalSourceInventoryRecord,
  CoverageState,
} from "../../src/lib/congressional-source-inventory";
import { validateCongressionalSourceInventoryScope } from "../../src/lib/congressional-source-inventory";

/**
 * I06: national source inventory for HI, ID, IL, IN, IA, KS, KY. Built on the
 * F01/F03/F07 shared official-source-inventory contract; mirrors F03's
 * evidence-layer structure and validator rather than factoring out shared
 * logic, matching how F03/F05/F06/F07 are each self-contained.
 */
export const I06_JURISDICTIONS = [
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
] as const satisfies readonly CongressionalJurisdiction[];

export type I06Jurisdiction = (typeof I06_JURISDICTIONS)[number];

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
type RetrievalResult = "success" | "technical_failure" | "legal_challenge";
type SourceFormat =
  | "csv"
  | "xlsx"
  | "json"
  | "xml"
  | "html"
  | "pdf"
  | "portal"
  | "manual";
type ParserFamily =
  | "csv"
  | "xlsx"
  | "json"
  | "xml"
  | "html_table"
  | "text_pdf"
  | "rendered_portal"
  | "manual_official_import"
  | "not_applicable";
type SourceRole =
  | "calendar_seed"
  | "calendar_authority"
  | "filing_list"
  | "qualified_or_certified_roster"
  | "sample_ballot"
  | "secondary_check";

export interface I06ManualImportControls {
  controllingArtifactRef: string;
  manualOwner: string;
  manualDueAt: string;
  calendarTrigger: string;
  nonFilingReplacementArtifact: string;
  officialArtifactValidated: boolean;
}

export interface I06SourceEvidence {
  sourceObservation: SourceObservation;
  candidateAvailability: CandidateAvailability;
  retrievalResult: RetrievalResult;
  successfulConfiguredChannelCheck: boolean;
  artifactReference: string;
  checksum: string;
  retrievedAt: string;
  publishedAt: string;
  effectiveAt: string;
  verifiedAt: string;
  evidenceUrl: string;
  evidenceSummary: string;
  manualImport?: I06ManualImportControls;
}

export interface I06CongressionalSourceInventoryRecord
  extends CongressionalSourceInventoryRecord {
  jurisdiction: I06Jurisdiction;
  evidence: I06SourceEvidence;
}

export interface I06CongressionalSourceInventory {
  schemaVersion: 1;
  cycle: 2026;
  records: I06CongressionalSourceInventoryRecord[];
}

export interface I06CongressionalSourceInventoryValidation {
  errors: string[];
  coveredJurisdictions: I06Jurisdiction[];
  coverageStates: CoverageState[];
}

const reviewedAt = "2026-07-14T00:00:00.000Z";

export const i06CongressionalSourceInventory: I06CongressionalSourceInventory =
  {
    schemaVersion: 1,
    cycle: 2026,
    records: [
      {
        schemaVersion: 1,
        sourceId: "hi-2026-candidate-reports",
        jurisdiction: "HI",
        authority: {
          name: "Hawaii Office of Elections",
          role: "state_election_authority",
          url: "https://elections.hawaii.gov/",
        },
        officialLandingPage: "https://elections.hawaii.gov/",
        calendarSource:
          "https://elections.hawaii.gov/candidates/candidate-filing/",
        candidatePublicationSource:
          "https://elections.hawaii.gov/candidates/candidate-reports/",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house"],
          electionDates: ["2026-08-08", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "html",
        parserFamily: "html_table",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The Candidate Reports page lists candidates who filed nomination papers, not a certified post-primary roster; treat as filing evidence pending manual capture of the certified/qualified artifact.",
          "The regular filing deadline was June 2, 2026 4:30pm HST; a separate Senate District 18 vacancy filing window closed September 4, 2026 4:30pm HST and must not be conflated with the regular congressional filing period.",
        ],
        fallbackManualImportProcedure:
          "Download the current Candidate Reports export or the state's official sample ballot and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/HI/hi-2026-candidate-reports.html",
          checksum:
            "sha256:40d833c360db8ade06a61cd3951b3d8b3c68b5a93f0f2607c81228b6887792be",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://elections.hawaii.gov/candidates/candidate-reports/",
          evidenceSummary:
            "The Office of Elections' Candidate Reports page (confirmed retrievable 2026-07-14, marked last updated July 6, 2026) lists candidates who filed nomination papers; it is a filing-stage report rather than a certified post-primary roster, so availability remains manual-review-required pending the certified artifact.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/HI/hi-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "Office of Elections post-primary certified candidate list publication (after the August 8, 2026 primary)",
            nonFilingReplacementArtifact:
              "Hawaii Office of Elections certified candidate list or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "id-2026-candidate-filing-portal",
        jurisdiction: "ID",
        authority: {
          name: "Idaho Secretary of State",
          role: "state_election_authority",
          url: "https://sos.idaho.gov/elections-division/",
        },
        officialLandingPage: "https://sos.idaho.gov/elections-division/",
        calendarSource: "https://voteidaho.gov/candidate-filing/",
        candidatePublicationSource: "https://run.voteidaho.gov/search",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-05-19", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The Elections Division page does not host the roster directly; it redirects to the run.voteidaho.gov/search portal (ReFrame Candidate Filing Portal), whose live search-result contents were not independently captured during this review.",
          "Regular candidate-filing windows closed February 27, 2026 and March 13, 2026; do not treat filing-closure alone as evidence of a certified roster.",
        ],
        fallbackManualImportProcedure:
          "Search the run.voteidaho.gov/search portal for the exact contest, capture the current export, and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/ID/id-2026-candidate-filing-portal.html",
          checksum:
            "sha256:9f12ac8c8c5f6bf4448df39bc46d2a23e85f88c1db1fe06c37ae4bcdea29bb5d",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl: "https://voteidaho.gov/candidate-filing/",
          evidenceSummary:
            "Idaho's candidate-filing guidance page (confirmed retrievable 2026-07-14) states the regular filing windows closed in February/March 2026 and directs users to the run.voteidaho.gov/search Candidate Filing Portal for filed candidates; the portal's live contents were not independently captured, so this remains a manual-review filing-list source rather than a captured certified roster.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/ID/id-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "Idaho Secretary of State post-primary certified candidate list publication",
            nonFilingReplacementArtifact:
              "Idaho Secretary of State certified candidate list or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "il-2026-candidates-filed",
        jurisdiction: "IL",
        authority: {
          name: "Illinois State Board of Elections",
          role: "state_election_authority",
          url: "https://elections.il.gov/",
        },
        officialLandingPage: "https://elections.il.gov/",
        calendarSource: "https://elections.il.gov/",
        candidatePublicationSource:
          "https://elections.il.gov/ElectionOperations/CandidatesFiled.aspx",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-03-17", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "html",
        parserFamily: "not_applicable",
        updateCadence: "manual",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "Automated retrieval of elections.il.gov returned HTTP 403 Forbidden on every attempted path (landing page, RunningForOffice.aspx, ElectionOperations/CandidatesFiled.aspx, ElectionOperations/CandidateFilingsWithISBE.aspx) on 2026-07-14, including a repeat attempt; search-engine indexing confirms the CandidatesFiled.aspx page exists for both the March 17, 2026 primary and the November 3, 2026 general election, but no artifact could be captured through the configured retrieval channel.",
          "Do not treat search-engine snippets as a substitute for a captured official artifact; a human must retrieve the page directly (e.g., via a standard browser session) before any promotion.",
        ],
        fallbackManualImportProcedure:
          "Manually browse to the Illinois State Board of Elections CandidatesFiled.aspx page from a standard browser, capture the current export, and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "blocked",
        evidence: {
          sourceObservation: "access_blocked",
          candidateAvailability: "blocked",
          retrievalResult: "technical_failure",
          successfulConfiguredChannelCheck: false,
          artifactReference:
            "private://official-artifacts/2026/IL/il-2026-candidates-filed-access-log.txt",
          checksum:
            "sha256:075af9e03ce663cde0df331d30f192b3f1c621b82c4065416412c45c1974f71a",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://elections.il.gov/ElectionOperations/CandidatesFiled.aspx",
          evidenceSummary:
            "Direct retrieval of elections.il.gov returned HTTP 403 Forbidden on four distinct paths on 2026-07-14 (repeated on the CandidatesFiled.aspx path with the same result). Search-engine indexing confirms the State Board of Elections publishes a CandidatesFiled.aspx page covering both the March 17, 2026 primary (already held) and the November 3, 2026 general election, but no artifact could be captured through the configured channel.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "in-2026-candidate-information",
        jurisdiction: "IN",
        authority: {
          name: "Indiana Secretary of State — Election Division",
          role: "state_election_authority",
          url: "https://www.in.gov/sos/elections/",
        },
        officialLandingPage: "https://www.in.gov/sos/elections/",
        calendarSource:
          "https://www.in.gov/sos/elections/candidate-information/",
        candidatePublicationSource:
          "https://www.in.gov/sos/elections/candidate-information/",
        sourceRole: "qualified_or_certified_roster",
        contestScope: {
          offices: ["house"],
          electionDates: ["2026-05-05", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "xlsx",
        parserFamily: "xlsx",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The Election Division publishes a pre-primary '2026 Primary Candidate List' and a post-primary '2026 General Election Candidate List' as separate Excel exports; only the general-election export, dated after the May 5, 2026 primary, may be treated as the qualified/certified congressional roster.",
          "Confirm the export's as-of date before each automated run; do not reuse a cached primary-stage export as general-election evidence.",
        ],
        fallbackManualImportProcedure:
          "Download the current General Election Candidate List Excel export from the Election Division's Candidate Information page and submit it to the normal review path if automation is unavailable.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "automatable",
        evidence: {
          sourceObservation: "qualified_or_certified_roster",
          candidateAvailability: "qualified_or_certified",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/IN/in-2026-general-election-candidate-list.xlsx",
          checksum:
            "sha256:f11cc0901e995349d8944971a3f9d3378a0ee21ae924f8f2bb0f5771a3355776",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.in.gov/sos/elections/candidate-information/",
          evidenceSummary:
            "The Election Division's Candidate Information page (confirmed retrievable 2026-07-14) publishes distinct '2026 Primary Candidate List' and '2026 General Election Candidate List' Excel exports; the general-election export, published after the May 5, 2026 primary, is treated as the qualified/certified congressional roster for automation.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "ia-2026-candidate-filings",
        jurisdiction: "IA",
        authority: {
          name: "Iowa Secretary of State",
          role: "state_election_authority",
          url: "https://sos.iowa.gov/",
        },
        officialLandingPage: "https://sos.iowa.gov/",
        calendarSource: "https://sos.iowa.gov/elections/general-election",
        candidatePublicationSource:
          "https://sos.iowa.gov/news-resources/complete-list-state-and-federal-candidate-filings",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-06-02", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "html",
        parserFamily: "not_applicable",
        updateCadence: "manual",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "Automated retrieval of sos.iowa.gov consistently returned HTTP 403 across four distinct paths (voters/candidates, news-resources/complete-list-state-and-federal-candidate-filings, elections/pdf/candidates/gencandguide.pdf, general-election) on 2026-07-14, including a repeat attempt; search-engine indexing confirms the pages exist (e.g., 'Complete List of State and Federal Candidate Filings' and dated primary/general candidate guides) but no artifact could be captured through the configured retrieval channel.",
          "Do not treat search-engine snippets as a substitute for a captured official artifact; a human must retrieve the page directly before any promotion.",
        ],
        fallbackManualImportProcedure:
          "Manually browse to the Iowa Secretary of State's Complete List of State and Federal Candidate Filings page from a standard browser, capture the artifact, and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "blocked",
        evidence: {
          sourceObservation: "access_blocked",
          candidateAvailability: "blocked",
          retrievalResult: "technical_failure",
          successfulConfiguredChannelCheck: false,
          artifactReference:
            "private://official-artifacts/2026/IA/ia-2026-candidate-filings-access-log.txt",
          checksum:
            "sha256:a5c8cac89b90b78747e31db9afb1e37c8aaf0dfbdc1f9f991d09adfa92babeb3",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://sos.iowa.gov/news-resources/complete-list-state-and-federal-candidate-filings",
          evidenceSummary:
            "Every attempted retrieval of sos.iowa.gov (four distinct official paths, one repeated) returned HTTP 403 Forbidden on 2026-07-14; the Complete List of State and Federal Candidate Filings page and dated primary/general candidate guides are confirmed to exist via search-engine indexing, but no artifact could be captured through the configured channel.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "ks-2026-candidate-list",
        jurisdiction: "KS",
        authority: {
          name: "Kansas Secretary of State",
          role: "state_election_authority",
          url: "https://sos.ks.gov/elections/elections.html",
        },
        officialLandingPage: "https://sos.ks.gov/elections/elections.html",
        calendarSource:
          "https://sos.ks.gov/elections/important-election-dates.html",
        candidatePublicationSource:
          "https://sos.ks.gov/elections/candidates.html",
        sourceRole: "secondary_check",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-08-04", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "manual_official_import",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "Automated retrieval of the specific candidate-list path (elections_upcoming_candidate.aspx) returned HTTP 403 on 2026-07-14 (attempted twice); the Secretary of State's own June 1, 2026 press release confirms an unofficial roster transitioned to official status on June 15, 2026, but this record remains manual until that exact artifact is captured directly.",
          "Do not infer roster content from the press release narrative alone; capture the actual candidate-list export.",
        ],
        fallbackManualImportProcedure:
          "Manually browse to the Candidate List page from a standard browser, capture the current export, and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "manual_official_import",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/KS/ks-2026-candidates-hub.html",
          checksum:
            "sha256:fc3e0d3841f3729e973729f02f154185a21e3e677eb865d575f9bf62b9c9de53",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl: "https://sos.ks.gov/elections/candidates.html",
          evidenceSummary:
            "The Secretary of State's Candidates hub page (confirmed retrievable 2026-07-14) links to the Candidate Information and Candidate List pages; a June 1, 2026 Secretary of State press release (also confirmed retrievable) states a candidate roster available under the Candidates section transitioned from unofficial to official status on June 15, 2026. The deeper Candidate List path (elections_upcoming_candidate.aspx) itself returned HTTP 403 on direct automated retrieval, so the exact current artifact remains uncaptured pending manual review.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/KS/ks-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "Candidate List page (elections_upcoming_candidate.aspx) becomes retrievable to the configured channel, or manual capture",
            nonFilingReplacementArtifact:
              "Kansas Secretary of State candidate list export or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "ky-2026-candidate-filings-portal",
        jurisdiction: "KY",
        authority: {
          name: "Kentucky Secretary of State — Candidate Filings",
          role: "state_election_authority",
          url: "https://web.sos.ky.gov/CandidateFilings/",
        },
        officialLandingPage: "https://web.sos.ky.gov/CandidateFilings/",
        calendarSource:
          "https://elect.ky.gov/Resources/Documents/2026%20Election%20Calendar.pdf",
        candidatePublicationSource: "https://web.sos.ky.gov/CandidateFilings/",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-05-19", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The searchable-by-office Candidate Filings portal (confirmed retrievable 2026-07-14) lists filed candidates including 'US Senator' and 'US Representative' categories; it documents filings rather than an explicitly certified post-primary roster, so treat as filing evidence pending manual capture of a certified artifact.",
          "The regular candidate filing period closed around January 9, 2026, well before the May 19, 2026 primary; do not conflate the filing-closure date with a certified general-election roster date.",
        ],
        fallbackManualImportProcedure:
          "Search the Candidate Filings portal for the exact contest, capture the current export, and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I06 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/KY/ky-2026-candidate-filings-portal.html",
          checksum:
            "sha256:e8709e3c29298c03afde8cda99d8f51ea7145a92b8b372dd37d4f8fe740ff63f",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl: "https://web.sos.ky.gov/CandidateFilings/",
          evidenceSummary:
            "The Secretary of State's Candidate Filings portal (confirmed retrievable 2026-07-14) is a searchable-by-office filings database covering US Senator, US Representative, and downballot races; it is a filings listing rather than an explicitly certified post-primary roster, so it is treated as filing evidence pending manual capture of the certified artifact.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/KY/ky-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "Kentucky State Board of Elections certified general-election candidate list or sample-ballot publication",
            nonFilingReplacementArtifact:
              "Kentucky State Board of Elections certified candidate list or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
    ],
  };

export function validateI06CongressionalSourceInventory(
  inventory: unknown,
): I06CongressionalSourceInventoryValidation {
  const result = validateCongressionalSourceInventoryScope(
    inventory,
    I06_JURISDICTIONS,
    {
      missingPrefix: "Missing I06 inventory record for jurisdiction",
      outOfScopePrefix: "I06 inventory contains out-of-scope jurisdiction",
    },
  );

  if (!isRecord(inventory) || !Array.isArray(inventory.records))
    return toI06Validation(result);

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
    const retrievalResult = evidence.retrievalResult;
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
    if (!RETRIEVAL_RESULTS.includes(retrievalResult as RetrievalResult)) {
      result.errors.push(
        `${label}: evidence.retrievalResult must distinguish success, technical_failure, or legal_challenge.`,
      );
    }
    if (typeof evidence.successfulConfiguredChannelCheck !== "boolean") {
      result.errors.push(
        `${label}: evidence.successfulConfiguredChannelCheck must be a boolean.`,
      );
    }
    if (!isNonEmptyString(evidence.artifactReference))
      result.errors.push(`${label}: evidence.artifactReference is required.`);
    if (!isSha256Checksum(evidence.checksum))
      result.errors.push(
        `${label}: evidence.checksum must be a SHA-256 checksum.`,
      );
    for (const field of [
      "retrievedAt",
      "publishedAt",
      "effectiveAt",
    ] as const) {
      if (!isIsoTimestamp(evidence[field]))
        result.errors.push(
          `${label}: evidence.${field} must be an ISO timestamp.`,
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
      observation === "challenge_or_error" &&
      retrievalResult !== "legal_challenge"
    ) {
      result.errors.push(
        `${label}: challenge_or_error evidence requires a legal_challenge retrieval result.`,
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
      observation === "not_published" &&
      (retrievalResult !== "success" ||
        evidence.successfulConfiguredChannelCheck !== true)
    ) {
      result.errors.push(
        `${label}: not_published evidence requires a successful configured-channel check.`,
      );
    }
    if (retrievalResult === "technical_failure") {
      if (observation === "not_published") {
        result.errors.push(
          `${label}: a technical source failure can never become not_published.`,
        );
      }
      if (record.coverageState !== "blocked" || availability !== "blocked") {
        result.errors.push(
          `${label}: technical_failure requires blocked coverage and blocked availability.`,
        );
      }
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

    const requiresManualControls =
      record.coverageState === "manual_official_import" ||
      observation === "filing_list_only" ||
      observation === "manual_official_import" ||
      observation === "challenge_or_error";
    if (requiresManualControls) {
      validateManualImportControls(evidence.manualImport, label, result.errors);
      if (
        isRecord(evidence.manualImport) &&
        evidence.manualImport.officialArtifactValidated !== true &&
        (record.coverageState === "automatable" ||
          availability === "qualified_or_certified")
      ) {
        result.errors.push(
          `${label}: manual evidence cannot be complete or promotable until its official artifact validates.`,
        );
      }
    }

    validateSemanticCombinationInvariants(
      record,
      observation,
      availability,
      label,
      result.errors,
    );
  }

  return toI06Validation(result);
}

function toI06Validation(
  result: ReturnType<typeof validateCongressionalSourceInventoryScope>,
): I06CongressionalSourceInventoryValidation {
  return {
    ...result,
    coveredJurisdictions: result.coveredJurisdictions.filter(
      (jurisdiction): jurisdiction is I06Jurisdiction =>
        I06_JURISDICTIONS.includes(jurisdiction as I06Jurisdiction),
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
const RETRIEVAL_RESULTS: RetrievalResult[] = [
  "success",
  "technical_failure",
  "legal_challenge",
];

const SUPPORTED_FORMAT_PARSERS: Record<SourceFormat, ParserFamily[]> = {
  csv: ["csv"],
  xlsx: ["xlsx"],
  json: ["json"],
  xml: ["xml"],
  html: ["html_table"],
  pdf: ["text_pdf"],
  portal: ["rendered_portal", "manual_official_import"],
  manual: ["manual_official_import"],
};

const CALENDAR_OR_FILING_ROLES: SourceRole[] = [
  "calendar_seed",
  "calendar_authority",
  "filing_list",
];

function validateManualImportControls(
  controls: unknown,
  label: string,
  errors: string[],
): void {
  if (!isRecord(controls)) {
    errors.push(`${label}: manual import controls are required.`);
    return;
  }
  for (const field of [
    "controllingArtifactRef",
    "manualOwner",
    "calendarTrigger",
    "nonFilingReplacementArtifact",
  ] as const) {
    if (!isNonEmptyString(controls[field]))
      errors.push(`${label}: manual import ${field} is required.`);
  }
  if (!isIsoTimestamp(controls.manualDueAt))
    errors.push(`${label}: manual import manualDueAt is required.`);
  if (typeof controls.officialArtifactValidated !== "boolean")
    errors.push(
      `${label}: manual import officialArtifactValidated must be a boolean.`,
    );
}

function validateSemanticCombinationInvariants(
  record: Record<string, unknown>,
  observation: unknown,
  availability: unknown,
  label: string,
  errors: string[],
): void {
  const sourceRole = record.sourceRole;
  const sourceFormat = record.sourceFormat;
  const parserFamily = record.parserFamily;
  const coverageState = record.coverageState;

  if (parserFamily === "not_applicable") {
    if (
      coverageState !== "official_roster_not_yet_published" &&
      coverageState !== "blocked"
    ) {
      errors.push(
        `${label}: a not_applicable parserFamily requires official_roster_not_yet_published or blocked coverage.`,
      );
    }
  } else if (
    isNonEmptyString(sourceFormat) &&
    isNonEmptyString(parserFamily) &&
    Object.prototype.hasOwnProperty.call(SUPPORTED_FORMAT_PARSERS, sourceFormat)
  ) {
    const allowed =
      SUPPORTED_FORMAT_PARSERS[
        sourceFormat as keyof typeof SUPPORTED_FORMAT_PARSERS
      ];
    if (!allowed.includes(parserFamily as ParserFamily)) {
      errors.push(
        `${label}: sourceFormat ${sourceFormat} cannot use parserFamily ${parserFamily}.`,
      );
    }
  }

  if (
    isNonEmptyString(sourceRole) &&
    CALENDAR_OR_FILING_ROLES.includes(sourceRole as SourceRole)
  ) {
    if (coverageState === "automatable") {
      errors.push(
        `${label}: a calendar-only or filing sourceRole (${sourceRole}) can never establish automatable coverage.`,
      );
    }
    if (availability === "qualified_or_certified") {
      errors.push(
        `${label}: a calendar-only or filing sourceRole (${sourceRole}) can never establish qualified_or_certified availability.`,
      );
    }
    if (observation === "qualified_or_certified_roster") {
      errors.push(
        `${label}: a calendar-only or filing sourceRole (${sourceRole}) can never claim a qualified_or_certified_roster observation.`,
      );
    }
  }

  if (
    sourceRole === "filing_list" &&
    coverageState === "official_roster_not_yet_published"
  ) {
    errors.push(
      `${label}: a filing_list source has already retrieved a filing and cannot claim official_roster_not_yet_published.`,
    );
  }

  if (
    coverageState === "manual_official_import" &&
    availability !== "manual_review_required"
  ) {
    errors.push(
      `${label}: manual_official_import coverage must keep candidateAvailability manual_review_required.`,
    );
  }

  if (
    coverageState === "official_roster_not_yet_published" &&
    availability !== "not_published"
  ) {
    errors.push(
      `${label}: official_roster_not_yet_published coverage must keep candidateAvailability not_published.`,
    );
  }
}

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

function isSha256Checksum(value: unknown): value is string {
  return isNonEmptyString(value) && /^sha256:[a-f0-9]{64}$/i.test(value);
}

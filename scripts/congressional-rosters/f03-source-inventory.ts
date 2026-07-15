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

export interface F03ManualImportControls {
  /** Retained official artifact that controls the attended import. */
  controllingArtifactRef: string;
  /** Named operational owner for the attended queue item. */
  manualOwner: string;
  /** Timestamp by which the next attended check is due. */
  manualDueAt: string;
  /** Calendar or publication event that causes the next check. */
  calendarTrigger: string;
  /** Official non-filing artifact that may replace the filing-only source. */
  nonFilingReplacementArtifact: string;
  /** Only a validated official artifact may make a manual path promotable. */
  officialArtifactValidated: boolean;
}

export interface F03SourceEvidence {
  sourceObservation: SourceObservation;
  candidateAvailability: CandidateAvailability;
  /** Capture outcome, deliberately separate from legal challenge evidence. */
  retrievalResult: RetrievalResult;
  /** The configured official publication channel was checked successfully. */
  successfulConfiguredChannelCheck: boolean;
  /** Immutable retained artifact/reference used to reproduce this observation. */
  artifactReference: string;
  checksum: string;
  retrievedAt: string;
  publishedAt: string;
  effectiveAt: string;
  verifiedAt: string;
  evidenceUrl: string;
  evidenceSummary: string;
  manualImport?: F03ManualImportControls;
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/AL/al-2026-election-information.html",
          checksum:
            "sha256:895954430d72a4f0f2ad6062c4650973b052611ada71554c5bde00dd2d27736a",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026",
          evidenceSummary:
            "The state 2026 election page publishes state certifications for the May primary, June runoff, August congressional special primary, and November general election.",
        },
      },
      {
        // sourceFormat/parserFamily below only classify the CATEGORY of
        // problem (a JS-rendered portal). The fine-grained navigation
        // mechanics actually needed to work through it — Civix's specific
        // filter sequence, its unreliable incumbency signals, the lack of a
        // published general-election bucket, the virtualized results list —
        // are written up in nationwide-congressional-roster-plan.md's
        // "Civix portal operational playbook" section (added building the
        // TX vertical slice, card 8530a468). Check there before re-deriving
        // this from scratch for another Civix-vended state.
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/TX/tx-2026-march-primary-listing.html",
          checksum:
            "sha256:c1e9912b42c4133602bccf7dfcc7aebc378064c134910153f544f342961519eb",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.sos.texas.gov/elections/laws/2026marchprimaryelection332026.shtml",
          evidenceSummary:
            "The state page labels the linked record as Candidate Listing Information; this rehearsal intentionally treats that filing-stage listing as insufficient for qualified/certified availability.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/TX/tx-primary-controlling-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-20T00:00:00.000Z",
            calendarTrigger: "state certification or sample-ballot publication",
            nonFilingReplacementArtifact:
              "Texas Secretary of State certified ballot or official sample ballot",
            officialArtifactValidated: false,
          },
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/CA/ca-2026-primary-congress-notice.pdf",
          checksum:
            "sha256:3c82f31af98ae2595938e6b516e199c0d2762ecae5f92ab8122aee20beeb9f69",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf",
          evidenceSummary:
            "The state-hosted PDF is a Notice to Candidates for the June primary, so it cannot establish a qualified/certified upcoming-contest roster.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/CA/ca-primary-controlling-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-20T00:00:00.000Z",
            calendarTrigger: "certified list or sample-ballot publication",
            nonFilingReplacementArtifact:
              "California Secretary of State certified list or official sample ballot",
            officialArtifactValidated: false,
          },
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/DC/dc-2026-elections-landing.html",
          checksum:
            "sha256:949876f30022242d86e47c00143b0b65aae1ca4caa5f0b7a130ee2953102014a",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl: "https://www.dcboe.org/elections/2026-elections",
          evidenceSummary:
            "DCBOE's official April notice says the June primary includes Delegate and directs readers to the 2026 elections page for the current candidate list; this record remains manual until that exact artifact is captured.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/DC/dc-delegate-controlling-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-20T00:00:00.000Z",
            calendarTrigger: "DCBOE Delegate candidate-list publication",
            nonFilingReplacementArtifact:
              "DCBOE Delegate candidate list or official sample ballot",
            officialArtifactValidated: false,
          },
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
          retrievalResult: "legal_challenge",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/AK/ak-final-determination-6.15.2026.pdf",
          checksum:
            "sha256:f9d803da3533518793dc571447b6e6217346ab6ce80dd23f119c6f0e51f84a91",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.elections.alaska.gov/wp-content/uploads/2026/06/Final-Determination-6.15.2026-DOE.pdf",
          evidenceSummary:
            "The Division's June 15 final determination documents a ballot-eligibility dispute; availability remains review-required even though the candidate page labels its list final.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/AK/ak-controlling-challenge-resolution.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-20T00:00:00.000Z",
            calendarTrigger: "ballot-eligibility challenge resolution",
            nonFilingReplacementArtifact:
              "Alaska Division of Elections final controlling candidate list",
            officialArtifactValidated: false,
          },
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/LA/la-2026-candidate-inquiry.html",
          checksum:
            "sha256:492e8c0f20c65e5b3ecaf4276a6a8ebe3652e7680ffa0fc45d75d1def15637e0",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
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
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/PR/pr-2028-cee-landing.html",
          checksum:
            "sha256:58bcf8487625a8cd578a40cb8e7631cc38eb12e181e7c9c2278a6a35d51309ef",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
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
const RETRIEVAL_RESULTS: RetrievalResult[] = [
  "success",
  "technical_failure",
  "legal_challenge",
];

/**
 * F07 semantic-combination invariants. These enforce which parser family a
 * source format may use, and which source roles/coverage states/observations
 * may never combine, per the F04 rehearsal review's blocking finding #3
 * (docs/operations/f04-seven-jurisdiction-rehearsal-review-2026-07-13.md).
 */
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

/**
 * A calendar-only or filing-only source role can never itself be the basis
 * for a qualified/certified roster claim, regardless of what any other field
 * on the record says.
 */
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

/**
 * F07: enforce valid source-role, format, parser-family, observation,
 * availability, and coverage-state combinations. Filing and calendar-only
 * evidence can never establish qualified/certified availability through any
 * field combination, and manual/not-yet-published coverage states must keep
 * their evidence honest and explicit rather than silently promotable.
 */
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

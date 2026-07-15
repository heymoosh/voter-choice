import type {
  CongressionalJurisdiction,
  CongressionalSourceInventoryRecord,
  CoverageState,
} from "../../src/lib/congressional-source-inventory";
import { validateCongressionalSourceInventoryScope } from "../../src/lib/congressional-source-inventory";

/**
 * I11: national source inventory for WV, WI, WY, AS, GU, MP, VI. Built on the
 * F01/F03/F07 shared official-source-inventory contract; mirrors F03/I06's
 * evidence-layer structure and validator rather than factoring out shared
 * logic, matching how F03/F05/F06/I06 are each self-contained.
 */
export const I11_JURISDICTIONS = [
  "WV",
  "WI",
  "WY",
  "AS",
  "GU",
  "MP",
  "VI",
] as const satisfies readonly CongressionalJurisdiction[];

export type I11Jurisdiction = (typeof I11_JURISDICTIONS)[number];

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

export interface I11ManualImportControls {
  controllingArtifactRef: string;
  manualOwner: string;
  manualDueAt: string;
  calendarTrigger: string;
  nonFilingReplacementArtifact: string;
  officialArtifactValidated: boolean;
}

export interface I11SourceEvidence {
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
  manualImport?: I11ManualImportControls;
}

export interface I11CongressionalSourceInventoryRecord
  extends CongressionalSourceInventoryRecord {
  jurisdiction: I11Jurisdiction;
  evidence: I11SourceEvidence;
}

export interface I11CongressionalSourceInventory {
  schemaVersion: 1;
  cycle: 2026;
  records: I11CongressionalSourceInventoryRecord[];
}

export interface I11CongressionalSourceInventoryValidation {
  errors: string[];
  coveredJurisdictions: I11Jurisdiction[];
  coverageStates: CoverageState[];
}

const reviewedAt = "2026-07-14T00:00:00.000Z";

export const i11CongressionalSourceInventory: I11CongressionalSourceInventory =
  {
    schemaVersion: 1,
    cycle: 2026,
    records: [
      {
        schemaVersion: 1,
        sourceId: "wv-2026-candidates-portal",
        jurisdiction: "WV",
        authority: {
          name: "West Virginia Secretary of State's Office, Elections Division",
          role: "state_election_authority",
          url: "https://sos.wv.gov/elections",
        },
        officialLandingPage: "https://sos.wv.gov/elections",
        calendarSource: "https://sos.wv.gov/media/467/download?inline=",
        candidatePublicationSource: "https://candidates.wvsos.gov/",
        sourceRole: "calendar_authority",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-05-12", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "candidates.wvsos.gov (the 2026 candidate portal) returns only a bare 'Candidates' page heading with no populated table, links, or data when fetched programmatically; likely a JS-rendered SPA whose dynamic content did not render, or a portal not yet populated for the general-election cycle.",
          "No public API for either the legacy apps.sos.wv.gov candidate-search tool or the newer candidates.wvsos.gov portal; both are human-facing rendered portals only.",
          "The legacy apps.sos.wv.gov/elections/candidate-search/ tool only offers historical years (2012-2024) and link-outs to candidates.wvsos.gov for 2026 rather than hosting 2026 data itself.",
        ],
        fallbackManualImportProcedure:
          "Wait for candidates.wvsos.gov to populate the 2026 general-election candidate list, or obtain the Secretary of State's county-transmitted candidate certification, and submit the exact artifact to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "official_roster_not_yet_published",
        evidence: {
          sourceObservation: "not_published",
          candidateAvailability: "not_published",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/WV/wv-2026-candidates-portal.html",
          checksum:
            "sha256:64b71fbc52907fff695247ed625acf67da2314083a3990bad45fa9118fcecb03",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl: "https://candidates.wvsos.gov/",
          evidenceSummary:
            "The official 2026 Elections Calendar (revised July 10, 2026) confirms both U.S. Senate and U.S. House seats are on the November 3, 2026 general-election ballot, with the SoS's deadline to certify/transmit the general-election candidate list to county clerks (~Aug 24, 2026) not yet passed. The candidates.wvsos.gov portal, the configured official candidate-publication channel, loaded successfully (no access wall, no error) but returned only a bare heading with zero populated candidate rows as of this check, consistent with the general-election roster not yet being published.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "wi-2026-ballot-access-report",
        jurisdiction: "WI",
        authority: {
          name: "Wisconsin Elections Commission (WEC)",
          role: "state_election_authority",
          url: "https://elections.wi.gov/",
        },
        officialLandingPage: "https://elections.wi.gov/2026",
        calendarSource:
          "https://elections.wi.gov/sites/default/files/documents/2026_2027%20Election%20Calendar_0.pdf",
        candidatePublicationSource:
          "https://elections.wi.gov/sites/default/files/documents/D.%20Ballot%20Access%20Report%206.9.2026.pdf",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house"],
          electionDates: ["2026-08-11", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "pdf",
        parserFamily: "text_pdf",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "The WEC's Drupal-rendered HTML pages (elections.wi.gov/, /2026, /candidates, /elections, /candidate-tracking-reports) return HTTP 403 Forbidden to automated fetch, a WAF/bot-block on the CMS layer; the static PDF documents under sites/default/files/documents/ remain directly fetchable.",
          "A plausible-looking generic filename (Candidates%20Tracking%20By%20Office.pdf) resolved to stale 2022-cycle content, not the 2026 cycle; the exact 2026 URL for the full 'Candidates Tracking By Office' roster could not be located, so filenames must be sourced from a live index rather than guessed.",
          "No API; documents are PDFs requiring text extraction (no CSV/JSON/XML export observed).",
        ],
        fallbackManualImportProcedure:
          "Locate the current 2026 'Candidates Tracking By Office' report or a post-primary certified roster from the WEC's document index and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/WI/wi-2026-ballot-access-report.pdf",
          checksum:
            "sha256:626c45a653f57b7bf82bbd361597fec99b569c40c2d79609cb9ea28403c7e1c9",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://elections.wi.gov/sites/default/files/documents/D.%20Ballot%20Access%20Report%206.9.2026.pdf",
          evidenceSummary:
            "The WEC's official 'Ballot Access Report' memo, dated 6/9/2026, states 393 candidates applied for 129 state and federal offices ahead of the June 1, 2026 nomination-paper deadline and explicitly discusses 'Representative in Congress, District 7' (a 72-hour filing extension and ballot-status challenges). This is a filing-status memo, not the WEC's own full per-district roster export ('Candidates Tracking By Office'), whose exact 2026 URL could not be located, so availability remains manual-review-required pending capture of that exact artifact.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/WI/wi-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "WEC publication of the 2026 'Candidates Tracking By Office' report or a post-primary certified roster",
            nonFilingReplacementArtifact:
              "Wisconsin Elections Commission Candidates Tracking By Office report or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "wy-2026-primary-candidate-roster",
        jurisdiction: "WY",
        authority: {
          name: "Wyoming Secretary of State, Elections Division",
          role: "state_election_authority",
          url: "https://sos.wyo.gov/elections/",
        },
        officialLandingPage: "https://sos.wyo.gov/elections/",
        calendarSource:
          "https://sos.wyo.gov/Elections/Docs/2026/2026_Key_Election_Dates.pdf",
        candidatePublicationSource:
          "https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf",
        sourceRole: "filing_list",
        contestScope: {
          offices: ["house", "senate"],
          electionDates: ["2026-08-18", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "pdf",
        parserFamily: "text_pdf",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "No API or structured data feed (CSV/JSON) observed; all official data is distributed as PDF documents.",
          "PDFs use compressed/embedded-font content streams that generic text extractors initially fail to parse; local download plus dedicated PDF text extraction is required to read them reliably.",
          "No login wall, CAPTCHA, or rate limiting observed on sos.wyo.gov.",
        ],
        fallbackManualImportProcedure:
          "Download the current official candidate roster PDF (or the post-primary certified list once published) and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "filing_list_only",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/WY/wy-2026-primary-candidate-roster.pdf",
          checksum:
            "sha256:2bdf954b79bf478ac983c3daa92c4d49cc9bda64572644681e995e1074a87b0c",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf",
          evidenceSummary:
            "The official 24-page '2026 Primary Election Candidate Roster' PDF (dated June 30, 2026) lists all filed candidates by office and party, confirming full slates under United States Senator and United States Representative, each with filing dates between May 14 and May 29, 2026. This is the pre-primary filing roster (the August 18, 2026 primary has not yet occurred), not a post-primary certified/qualified list, so availability remains manual-review-required.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/WY/wy-controlling-general-roster.pdf",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "Wyoming Secretary of State post-primary certified candidate list publication (after the August 18, 2026 primary)",
            nonFilingReplacementArtifact:
              "Wyoming Secretary of State certified general-election candidate list or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "as-2026-candidates-information",
        jurisdiction: "AS",
        authority: {
          name: "American Samoa Election Office (Office of the Election Commissioner)",
          role: "territorial_election_authority",
          url: "https://www.aselectionoffice.gov/",
        },
        officialLandingPage: "https://www.aselectionoffice.gov/",
        calendarSource: "https://www.aselectionoffice.gov/calendar",
        candidatePublicationSource:
          "https://www.aselectionoffice.gov/candidates-information",
        sourceRole: "calendar_authority",
        contestScope: {
          offices: ["delegate"],
          electionDates: ["2026-11-03"],
          stages: ["general"],
        },
        sourceFormat: "portal",
        parserFamily: "rendered_portal",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "No CAPTCHA or login wall observed on any page fetched; no robots.txt block encountered.",
          "The 2026 election calendar is embedded as a downloadable file on the /calendar page rather than rendered as page HTML/table; the fetch tool could not extract the underlying href, so specific 2026 dates beyond the September 1 filing deadline are corroborated only via secondary/federal sources (FEC.gov, news), not machine-verified directly against the official PDF text.",
          "No API; site is a small government CMS with plain informational pages, not structured/tabular data.",
        ],
        fallbackManualImportProcedure:
          "Wait for the Election Office to publish the Delegate candidate roster following the September 1, 2026 filing deadline, or obtain the office's own election-calendar PDF directly, and submit the exact artifact to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "official_roster_not_yet_published",
        evidence: {
          sourceObservation: "not_published",
          candidateAvailability: "not_published",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/AS/as-2026-candidates-information.html",
          checksum:
            "sha256:1d8ec4757ddd680b1b9b7018e22d1d601f124da667f172b7f2cd740ec877a099",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.aselectionoffice.gov/candidates-information",
          evidenceSummary:
            "The American Samoa Election Office's official candidates-information page loaded successfully (real content, no access wall) and shows only procedural filing instructions (qualifications, nomination-petition requirements, September 1, 2026 filing deadline, filing fees) for Delegate to the U.S. House and other territorial offices; no actual candidate roster or filed-candidate list has been published yet, which is expected this far ahead of the single general election (no primary stage for this seat).",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "gu-2026-candidate-roster-spreadsheet",
        jurisdiction: "GU",
        authority: {
          name: "Guam Election Commission (Kumision Ileksion Guåhan)",
          role: "territorial_election_authority",
          url: "https://gec.guam.gov/",
        },
        officialLandingPage: "https://gec.guam.gov/",
        calendarSource: "https://gec.guam.gov/2026-important-dates/",
        candidatePublicationSource: "https://gec.guam.gov/2026-election-info/",
        sourceRole: "secondary_check",
        contestScope: {
          offices: ["delegate"],
          electionDates: ["2026-08-01", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "portal",
        parserFamily: "manual_official_import",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "gec.guam.gov's TLS certificate has an incomplete chain (missing intermediate cert); strict TLS clients fail with 'unable to get local issuer certificate'. Content is retrievable by working around the chain issue; this is a server misconfiguration, not a genuine access block.",
          "The actual candidate roster is not hosted on gec.guam.gov itself; the official '2026 Election Info' page links out to a Google Sheets/Drive 'sharing' URL rather than a file on the .gov domain. No login was required to view or export it, but it is a revocable share link, not a stable government API or dataset URL.",
          "No robots.txt block or CAPTCHA/rate-limiting encountered; no open-data API found on the GEC site.",
        ],
        fallbackManualImportProcedure:
          "Capture the current export of the official candidate-roster spreadsheet linked from the GEC's 2026 election-info page (or a GEC-published PDF equivalent if the linked spreadsheet becomes inaccessible) and submit it to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "manual_official_import",
        evidence: {
          sourceObservation: "manual_official_import",
          candidateAvailability: "manual_review_required",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/GU/gu-2026-candidate-roster-spreadsheet.csv",
          checksum:
            "sha256:96e9a593cecae180f85d71a1e5a12dfbc6a9bc966abf8381c1f9de506969d288",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://docs.google.com/spreadsheets/d/1MWrmgNyaz-lxfndjcjvr9Fu_O6PvT83M/export?format=csv",
          evidenceSummary:
            "The Guam Election Commission's official page (https://gec.guam.gov/2026-election-info/) confirms the 2026 primary is August 1 and the general is November 3, and links to a live, publicly viewable Google Sheets roster titled '2026 Elections Candidate Information'. Verified by CSV export, that roster already lists real, named candidates for 'Congressional Delegate' (James C. Moylan, R; Alicia Anne Garrido Limtiaco, D). Because the roster is hosted off the .gov domain on a revocable share link rather than a stable government dataset URL or API, availability is treated as manual-review-required pending each check's re-verification of that link.",
          manualImport: {
            controllingArtifactRef:
              "private://official-artifacts/2026/GU/gu-controlling-candidate-roster.csv",
            manualOwner: "congressional-roster-operations",
            manualDueAt: "2026-07-28T00:00:00.000Z",
            calendarTrigger:
              "GEC re-publication of the candidate roster on a stable .gov-hosted artifact, or manual re-verification of the linked spreadsheet",
            nonFilingReplacementArtifact:
              "Guam Election Commission candidate roster export or official sample ballot",
            officialArtifactValidated: false,
          },
        },
      },
      {
        schemaVersion: 1,
        sourceId: "mp-2026-candidate-financial-disclosure",
        jurisdiction: "MP",
        authority: {
          name: "Commonwealth Election Commission (CNMI)",
          role: "territorial_election_authority",
          url: "https://www.votecnmi.gov.mp/",
        },
        officialLandingPage: "https://www.votecnmi.gov.mp/",
        calendarSource:
          "https://votecnmi.gov.mp/downloads/2026/2026_GE_Important_Dates.pdf",
        candidatePublicationSource:
          "https://www.votecnmi.gov.mp/candidate/campaign-statement-of-account/candidate-financial-disclosure.php",
        sourceRole: "secondary_check",
        contestScope: {
          offices: ["delegate"],
          electionDates: ["2026-11-03"],
          stages: ["general"],
        },
        sourceFormat: "html",
        parserFamily: "html_table",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "No CAPTCHA or login wall encountered on the landing page, the 2026 Important Dates PDF, the Candidate Financial Disclosure page, or the Candidates' Pamphlet PDF.",
          "No public API; all data is delivered as static PDFs (calendar, pamphlet, forms) or a Joomla-CMS-rendered HTML listing page (financial disclosure archive).",
          "A direct guess at a '/candidates' URL returned HTTP 404; there is no dedicated 2026 candidate-roster page yet, only the Candidate Financial Disclosure archive.",
        ],
        fallbackManualImportProcedure:
          "Wait for the Commonwealth Election Commission to publish 2026 entries on the Candidate Financial Disclosure page (or an equivalent post-filing roster) following the August 5, 2026 nominating-petition deadline, and submit the exact artifact to the normal review path.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "official_roster_not_yet_published",
        evidence: {
          sourceObservation: "not_published",
          candidateAvailability: "not_published",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/MP/mp-2026-candidate-financial-disclosure.html",
          checksum:
            "sha256:69cf7bf161e17cb5d6c48961d93a161c952d97914032b089c61e11f2ca610f3e",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://www.votecnmi.gov.mp/candidate/campaign-statement-of-account/candidate-financial-disclosure.php",
          evidenceSummary:
            "CEC's Candidate Financial Disclosure page (confirmed retrievable) lists disclosure-document counts by year for 2024, 2022, 2020 and earlier cycles but has no 2026 entries yet, consistent with the nominating-petition filing window (July 6-August 5, 2026) still being open. CNMI holds no primary; candidates qualify directly for the November 3, 2026 general-election ballot via nominating petition, so no candidate roster is published yet at the configured official channel.",
        },
      },
      {
        schemaVersion: 1,
        sourceId: "vi-2026-primary-candidate-listing",
        jurisdiction: "VI",
        authority: {
          name: "Office of the Supervisor of Elections, Elections System of the Virgin Islands (ESVI)",
          role: "territorial_election_authority",
          url: "https://vivote.gov/",
        },
        officialLandingPage: "https://vivote.gov/",
        calendarSource:
          "https://vivote.gov/wp-content/uploads/2026/06/2026-Elections-Calendar-Amended-06.10.2026-1.pdf",
        candidatePublicationSource:
          "https://vivote.gov/wp-content/uploads/2026/06/2026-Listing-of-Candidates-For-Primary-Election-OFFICIAL-June-17-2026.pdf",
        sourceRole: "qualified_or_certified_roster",
        contestScope: {
          offices: ["delegate"],
          electionDates: ["2026-08-01", "2026-11-03"],
          stages: ["primary", "general"],
        },
        sourceFormat: "pdf",
        parserFamily: "text_pdf",
        updateCadence: "event_driven",
        activeWindow: "2026-01-01/2026-11-03",
        accessConstraints: [
          "No CAPTCHA or login wall encountered on the landing page, the elections calendar PDF, or the certified candidate-listing PDF.",
          "No public API; all data is delivered as static PDFs attached to WordPress press-release posts.",
          "Candidate rosters are split by voting district (St. Croix vs. St. Thomas/St. John) rather than published as a single unified roster; this record captures the St. Thomas/St. John district PDF, which contains the Delegate race.",
        ],
        fallbackManualImportProcedure:
          "Download the current certified candidate listing (or the post-primary general-election listing once published) from vivote.gov and submit it to the normal review path if automation is unavailable.",
        lastVerifiedAt: reviewedAt,
        reviewedBy: "I11 official-source inventory",
        coverageState: "automatable",
        evidence: {
          sourceObservation: "qualified_or_certified_roster",
          candidateAvailability: "qualified_or_certified",
          retrievalResult: "success",
          successfulConfiguredChannelCheck: true,
          artifactReference:
            "private://official-artifacts/2026/VI/vi-2026-primary-candidate-listing.pdf",
          checksum:
            "sha256:56336ecb8426530d859688a4e0a3a7f75dc29f2fefb27fcb49eb0859d5789368",
          retrievedAt: reviewedAt,
          publishedAt: reviewedAt,
          effectiveAt: reviewedAt,
          verifiedAt: reviewedAt,
          evidenceUrl:
            "https://vivote.gov/wp-content/uploads/2026/06/2026-Listing-of-Candidates-For-Primary-Election-OFFICIAL-June-17-2026.pdf",
          evidenceSummary:
            "The official June 17, 2026 certified candidate listing (certified by the Supervisor of Elections under 18 V.I.C. §420, St. Thomas/St. John district) lists two Democratic candidates for 'Delegate to Congress': Delia Smith and Janelle K. Sarauw, both filed May 19, 2026. This is a statutorily certified roster published well ahead of the August 1, 2026 primary and November 3, 2026 general election, confirming a non-voting Delegate seat (not a Senate or voting House seat).",
        },
      },
    ],
  };

export function validateI11CongressionalSourceInventory(
  inventory: unknown,
): I11CongressionalSourceInventoryValidation {
  const result = validateCongressionalSourceInventoryScope(
    inventory,
    I11_JURISDICTIONS,
    {
      missingPrefix: "Missing I11 inventory record for jurisdiction",
      outOfScopePrefix: "I11 inventory contains out-of-scope jurisdiction",
    },
  );

  if (!isRecord(inventory) || !Array.isArray(inventory.records))
    return toI11Validation(result);

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

  return toI11Validation(result);
}

function toI11Validation(
  result: ReturnType<typeof validateCongressionalSourceInventoryScope>,
): I11CongressionalSourceInventoryValidation {
  return {
    ...result,
    coveredJurisdictions: result.coveredJurisdictions.filter(
      (jurisdiction): jurisdiction is I11Jurisdiction =>
        I11_JURISDICTIONS.includes(jurisdiction as I11Jurisdiction),
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

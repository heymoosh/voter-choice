/**
 * scripts/congressional-rosters/vt-official-roster-2026.ts
 *
 * Vermont's 2026 official congressional roster — hand-transcribed from the
 * Vermont Secretary of State's own live candidate-filing exports (not FEC
 * filings). Built through the same manual official-source pipeline as
 * Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado, California, Arkansas,
 * and Delaware, epic c5a813bb; this is Vermont's build.
 *
 * VERMONT-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/vermont-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Vermont's source is NOT Civix and NOT a PDF/static-HTML page like AZ —
 *     it's two live XLSX spreadsheet exports linked from the SoS's
 *     "General Election Candidates" page. `WebFetch` returns HTTP 403 on
 *     the sos.vermont.gov landing page itself (bot-blocked), so the page's
 *     download links were found via `mcp__claude-in-chrome__*` browser
 *     navigation; the two `.xlsx` files, hosted on a *different* domain
 *     (`outside.vermont.gov`), also don't render usefully through
 *     `WebFetch` (returns garbled binary), so they were downloaded via
 *     direct browser navigation (Chrome auto-downloads a non-renderable
 *     file type) and parsed locally with `openpyxl`.
 *   - Vermont's 2026 primary (August 11, 2026) is still upcoming at
 *     transcription time (2026-07-16) — same "upcoming primary" pattern as
 *     Arizona/Delaware's builds, so `VT_STAGE = "primary"`.
 *   - **No 2026 US Senate contest** — Vermont's two Senate seats
 *     (Sanders, Class I, won 2024, next up 2030; Welch, Class III, won
 *     2022, next up 2028) are both mid-term; confirmed by the complete
 *     absence of any federal "SENATOR" contest row in either official
 *     export (only "STATE SENATOR" rows appear, a distinct non-federal
 *     office). No `VT_SENATE_ROSTER_2026` export exists for this reason.
 *   - The primary-qualified export (`2026_statewide_primary_qualified_
 *     candidates.xlsx`) is split into per-party sheets (DEMOCRATIC,
 *     PROGRESSIVE, REPUBLICAN); the general-qualified export
 *     (`2026_general_election_qualified_candidates.xlsx`) is a single
 *     sheet. **This split works differently from Delaware's** (flagged per
 *     the plan doc's "no universal approach across states" note): DE's own
 *     general-list page held major-party candidates who were unopposed
 *     within their own primary (a "graduated past the primary" signal).
 *     Vermont's general-qualified export instead holds ONLY independent
 *     and minor-party filers who nominate through a wholly separate,
 *     non-primary legal pathway (petition/party-committee nomination
 *     direct to the general ballot) — Rep. Balint, though the sole
 *     Democratic filer for the US House seat (unopposed within her party),
 *     does NOT appear on the general-qualified export at all, only on the
 *     primary-qualified export's DEMOCRATIC sheet. Recorded here as
 *     `qualified_for_primary_ballot`, following the official source's own
 *     categorization faithfully rather than inferring DE's "unopposed →
 *     general" convention to a source that doesn't itself draw that line.
 *   - The Republican primary for the US House seat is contested (Mark
 *     Coester and Gerald Malloy both filed) — nominee undetermined at
 *     transcription time; both recorded `qualified_for_primary_ballot`,
 *     neither promoted to `qualified_for_general_ballot`.
 *   - Adam Ortiz (Independent) appears only on the general-qualified
 *     export, whose title ("qualified_candidates", present tense) and
 *     column header ("Financial Disclosure", filed) indicate the SoS has
 *     already verified his petition-signature sufficiency and consent
 *     forms — a *stronger* signal than Texas's "Declarations of Intent"
 *     PDF (a pre-verification filing stage, which is why TX used
 *     `declared_general_ballot_intent`). Recorded here as
 *     `qualified_for_general_ballot`, trusting the VT source's own
 *     "qualified" terminology over reflexively reusing the TX precedent.
 *   - No Progressive Party filer for the US House seat — the PROGRESSIVE
 *     sheet's `REPRESENTATIVE TO CONGRESS` rows are empty. No new party
 *     code needed; every confirmed federal filer is `DEM`, `REP`, or
 *     Vermont's generic `IND` (the xlsx's own "INDEPENDENT" party label
 *     maps directly onto the existing FEC-derived `IND` code, unlike
 *     AK/CA/FL's own state-specific minor-party labels that needed new
 *     codes).
 *
 * Sources:
 *   - https://sos.vermont.gov/elections/election-info-resources/candidates
 *     (VT SoS "General Election Candidates" landing page — links to both
 *     XLSX exports below; browser-rendered, `WebFetch` 403s on it directly)
 *   - https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_statewide_primary_qualified_candidates.xlsx
 *     (VT SoS "2026 Primary Election Candidate Listing," DEMOCRATIC/
 *     PROGRESSIVE/REPUBLICAN sheets, embedded "Last Updated: 7/14/2026" —
 *     every major-party candidate who filed for the August 11, 2026
 *     primary, contested or not)
 *   - https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_general_election_qualified_candidates.xlsx
 *     (VT SoS "2026 General Election Candidate Listing," embedded
 *     "Last Updated: 7/14/2026" — independent and minor-party candidates
 *     already qualified for the November 3, 2026 general ballot directly,
 *     bypassing the primary)
 *   - https://outside.vermont.gov/dept/sos/Elections_Division/town_clerks_local_elections/election_procedure/elections_calendar.pdf
 *     (VT SoS official "2026 Elections Calendar," v1.2, July 1, 2026 —
 *     governing dates cited in the data-check doc)
 *   - https://www.house.gov/representatives (incumbency cross-check only —
 *     "By State and District" table confirms Becca Balint (D) as VT's
 *     sole sitting at-large Representative)
 *
 * Coverage: VT's single at-large US House district. No US Senate contest
 * exists in the 2026 cycle (see note above) — intentionally no
 * `VT_SENATE_ROSTER_2026` export.
 *
 * KNOWN LIMITATIONS:
 *   - Names recorded exactly as printed in the official exports ("Name On
 *     Ballot" column); not cross-checked against a third document beyond
 *     the house.gov incumbency check above.
 *   - The Republican primary nominee is undetermined until the primary is
 *     held and certified — see the dated follow-up card for the recheck
 *     date.
 *   - Both source exports carry an internal "Last Updated: 7/14/2026"
 *     stamp two days before this build's own transcription date
 *     (2026-07-16); no indication either export is stale, but a future
 *     recheck should re-fetch rather than assume this snapshot still
 *     holds.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const VT_STATE = "VT";
export const VT_ELECTION_YEAR = 2026;
// Vermont's August 11, 2026 primary is still upcoming at transcription time
// (2026-07-16) — mirrors Arizona/Delaware's upcoming-primary builds.
export const VT_STAGE = "primary" as const;
// At-large House seat — zero-padded "00", matching races.ts's zero-pad of a
// numeric district of 0 (same convention as Alaska/Delaware's
// AK_HOUSE_DISTRICT / DE_HOUSE_DISTRICT).
export const VT_HOUSE_DISTRICT = "00";
export const VT_HOUSE_SOURCE_URLS = [
  "https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_statewide_primary_qualified_candidates.xlsx",
  "https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_general_election_qualified_candidates.xlsx",
];
export const VT_RETRIEVED_AT = "2026-07-16";

export const VT_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // Primary-qualified export, DEMOCRATIC sheet — sole Democratic filer.
  // Unopposed within her own party, but the official source itself still
  // categorizes her as primary-stage (see docblock note above on why this
  // differs from Delaware's "unopposed -> general" convention). Incumbent,
  // cross-checked against house.gov's "By State and District" table.
  {
    district: VT_HOUSE_DISTRICT,
    name: "Becca Balint",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Primary-qualified export, REPUBLICAN sheet — contested primary, nominee
  // not yet determined.
  {
    district: VT_HOUSE_DISTRICT,
    name: "Mark Coester",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: VT_HOUSE_DISTRICT,
    name: "Gerald Malloy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // General-qualified export — independent filer, already verified
  // qualified for the November general ballot (see docblock note on why
  // this uses qualified_for_general_ballot rather than
  // declared_general_ballot_intent).
  {
    district: VT_HOUSE_DISTRICT,
    name: "Adam Ortiz",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

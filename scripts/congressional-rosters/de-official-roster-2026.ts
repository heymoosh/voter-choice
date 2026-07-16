/**
 * scripts/congressional-rosters/de-official-roster-2026.ts
 *
 * Delaware's 2026 official congressional roster — hand-transcribed from the
 * Delaware Department of Elections' own candidate-list pages (not FEC
 * filings). Built through the same manual official-source pipeline as
 * Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado, California, and
 * Arkansas, epic c5a813bb; this is Delaware's build.
 *
 * DELAWARE-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/delaware-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Delaware's source is a static HTML site (not Civix, not a PDF) —
 *     `WebFetch` works directly, no browser automation needed. Structurally
 *     closest to Alaska: one at-large US House seat + one US Senate contest.
 *   - Major-party candidate filing closed at noon on Tuesday, July 14, 2026;
 *     the September 15, 2026 primary is still upcoming at transcription time
 *     (2026-07-15) — same "upcoming primary" pattern as Arizona's original
 *     build, so `DE_STAGE = "primary"` and every contested-primary row below
 *     is `qualified_for_primary_ballot` (no nominee guessed).
 *   - The site splits candidates across TWO pages, which drives the
 *     ballot-status split in this fixture: the "primary" list
 *     (`prim_fcddt_2026.html`) holds every candidate in a *contested*
 *     party primary; the "general" list (`genl_fcddt_2026.html`) holds
 *     candidates who go straight to the general ballot with no primary
 *     opponent. Sarah McBride (D, House) appears ONLY on the general list
 *     (unopposed within her own party) — she is the sole Democratic House
 *     filer, so she is recorded `qualified_for_general_ballot` rather than
 *     `qualified_for_primary_ballot`. No Senate candidate appears on the
 *     general list — every Senate filer (both parties) is in a contested
 *     primary, so all six Senate rows below are primary-stage.
 *   - Both pages were fetched twice (independently, minutes apart) and
 *     returned identical candidate sets each time — treated as the current,
 *     stable filing list as of the last-updated timestamp on each page
 *     (7/14/2026, 7:56 PM for the primary list).
 *   - **Residual discrepancy, not resolved by this fixture:** a general web
 *     search surfaced a secondary/aggregator snippet naming a fourth
 *     Republican House filer, "Donyale Hall," not present in either the
 *     primary or general official DoE page (checked twice). Per the SAFETY
 *     rule against treating an aggregator as a primary source, this fixture
 *     follows the official DoE page and does NOT include a Hall row — flagged
 *     here in case a future recheck (see the dated follow-up card) finds she
 *     filed and was missing from the DoE listing at transcription time, or
 *     that the aggregator snippet was simply wrong/stale.
 *   - **Withdrawal window is still open at transcription time:** candidates
 *     may withdraw without forfeiting their filing fee until 4:30 p.m.,
 *     Friday, July 17, 2026 (2 days after this build) — see the dated
 *     follow-up card; any row below could still be withdrawn.
 *   - No independent/minor-party candidate appears on either page for House
 *     or Senate as of transcription time — no new party code needed; every
 *     confirmed filer is `DEM` or `REP`.
 *
 * Sources:
 *   - https://elections.delaware.gov/candidates/candidatelist/prim_fcddt_2026.html
 *     (DE Dept. of Elections "Primary Election Candidates," last updated
 *     7/14/2026 7:56 PM — every candidate in a contested party primary)
 *   - https://elections.delaware.gov/candidates/candidatelist/genl_fcddt_2026.html
 *     (DE Dept. of Elections "General Election Candidates," last updated
 *     7/14/2026 — candidates with no primary opponent, going straight to the
 *     November 3, 2026 general ballot)
 *   - https://elections.delaware.gov/public/calendar/pdfs/2026ElectionCalendar.pdf
 *     (DE Dept. of Elections official "2026 State of Delaware Election
 *     Calendar," Ver. 12/11/2025 — governing dates cited in the data-check
 *     doc)
 *   - https://www.senate.gov/senators/senators-contact.htm (incumbency
 *     cross-check only — confirms Chris Coons as one of DE's two sitting
 *     Senators)
 *   - https://mcbride.house.gov/ (incumbency cross-check only — an official
 *     house.gov-domain source confirming Sarah McBride as DE's sitting
 *     at-large Representative; the Clerk's MemberData.xml feed used for
 *     prior states returned HTTP 403 this session, so this domain-verified
 *     alternative was used instead)
 *
 * Coverage: DE's single at-large US House district + the 2026 US Senate
 * contest (Coons's 6-year seat; DE's other Senate seat, Blunt Rochester's,
 * is not up until 2030 — confirmed absent from the Schedule of Elections
 * table, which lists only one "U.S. Senator 6 Year Term" row for 2026).
 *
 * KNOWN LIMITATIONS:
 *   - The "Donyale Hall" discrepancy above is unresolved — not included as a
 *     row, flagged for the dated follow-up recheck.
 *   - Names recorded exactly as printed on the official pages; not
 *     cross-checked against a third document beyond the incumbency checks
 *     above.
 *   - No `declared_general_ballot_intent` rows — Delaware's independent
 *     petition/declaration deadline (September 1, 2026) had not passed at
 *     transcription time, and no independent filer appeared on either page.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const DE_STATE = "DE";
export const DE_ELECTION_YEAR = 2026;
// Delaware's September 15, 2026 primary is still upcoming at transcription
// time (2026-07-15) — mirrors Arizona's original upcoming-primary build.
export const DE_STAGE = "primary" as const;
// At-large House seat — zero-padded "00", matching races.ts's zero-pad of a
// numeric district of 0 (same convention as Alaska's AK_HOUSE_DISTRICT).
export const DE_HOUSE_DISTRICT = "00";
export const DE_HOUSE_SOURCE_URLS = [
  "https://elections.delaware.gov/candidates/candidatelist/genl_fcddt_2026.html",
  "https://elections.delaware.gov/candidates/candidatelist/prim_fcddt_2026.html",
];
export const DE_SENATE_SOURCE_URLS = [
  "https://elections.delaware.gov/candidates/candidatelist/prim_fcddt_2026.html",
];
export const DE_RETRIEVED_AT = "2026-07-15";

export const DE_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // General list — unopposed within her own party, straight to the general
  // ballot. Incumbent, cross-checked against mcbride.house.gov.
  {
    district: DE_HOUSE_DISTRICT,
    name: "Sarah McBride",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Primary list — contested Republican primary, nominee not yet determined.
  {
    district: DE_HOUSE_DISTRICT,
    name: 'Joseph "Dr. Joe" Arminio',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: DE_HOUSE_DISTRICT,
    name: "Earl Cooper",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: DE_HOUSE_DISTRICT,
    name: "Lee Murphy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: DE_HOUSE_DISTRICT,
    name: "John J. Whalen",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

export const DE_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Contested Democratic primary — incumbent Chris Coons is one of four
  // filers; cross-checked against senate.gov as a sitting DE Senator.
  {
    district: null,
    name: "Jeff Appelhans",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Chris Coons",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "E. No-Trump Hansen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Mary Louve",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Contested Republican primary.
  {
    district: null,
    name: 'Michael "Dr. Mike" Katz',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "John Shulli",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

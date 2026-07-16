/**
 * scripts/congressional-rosters/ri-official-roster-2026.ts
 *
 * Rhode Island's 2026 official congressional roster — hand-transcribed from
 * the RI Department of State's own "Declared Candidates Report" (not FEC
 * filings). Built through the same manual official-source pipeline as
 * Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado, California, Arkansas,
 * and Delaware, epic c5a813bb; this is Rhode Island's build.
 *
 * RHODE-ISLAND-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/rhode-island-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - RI's official source is a custom RI Department of State "Voter
 *     Information Center" portal (`vote.sos.ri.gov`) — NOT Civix
 *     (`*.civixapps.com`), so the plan doc's Civix playbook doesn't apply.
 *   - The `CandidateSearch` page itself 403s on a plain fetch (same as a
 *     Civix portal), but the page's own "Declared Candidates Report
 *     (Available in excel)" link resolves to a directly-fetchable static
 *     export — `https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx`
 *     — no browser session, no auth, plain `curl` works. One statewide sheet
 *     (`CandidateElection`, ~3200 rows) covers every office; filtered to
 *     `OFFICE` in {`SENATOR IN CONGRESS`, `REPRESENTATIVE IN CONGRESS
 *     DISTRICT 1`, `REPRESENTATIVE IN CONGRESS DISTRICT 2`} for the 12 rows
 *     below. `DECLARATION` was `Valid` for all 12 — no invalid/pending
 *     filings among the federal rows.
 *   - **Unopposed-primary rule (RIGL § 17-15-11, confirmed via Justia):**
 *     Rhode Island does not hold a primary in a race with no intra-party
 *     contest — an unopposed filer's name is omitted from the primary
 *     ballot and printed directly on the general-election ballot instead.
 *     Applied by grouping the export's rows by (office, party): McKay (R,
 *     Senate), Amo (D, District 1), and Keenan (R, District 1) are each
 *     their party's sole federal primary filer for their contest, so each
 *     is `qualified_for_general_ballot` even though the source's own
 *     `ELECTION DATE - NAME` column lists their filing under the September 9
 *     primary (that column records which election cycle the Declaration of
 *     Candidacy was filed for, not final ballot placement — RI's single
 *     unified list doesn't pre-split contested/uncontested the way
 *     Delaware's two separate pages did). Reed/Burbridge/Munoz (D, Senate),
 *     Magaziner/Dickinson (D, District 2), and Skoly/Mellor (R, District 2)
 *     are genuinely contested, so each stays `qualified_for_primary_ballot`.
 *     No runoff system exists for RI federal primaries (plurality wins), so
 *     `runoff_pending` never applies here regardless of contest size.
 *   - Bahry (Independent, Senate) and DeSouza (Independent, District 1) filed
 *     directly under the `11/03/2026 - STATEWIDE GENERAL ELECTION` track in
 *     the export (not the primary track) — recorded `declared_general_ballot_intent`,
 *     since the export's own `NEED N.P.: Yes` / `ON E.B: No` columns show
 *     their nomination-papers signature verification was still pending as of
 *     retrieval, not yet a final general-ballot certification.
 *   - **Roster is a same-day snapshot of RI's own certify-nomination-papers
 *     deadline:** retrieved 2026-07-16, which the state's own 2026 Election
 *     Calendar lists as "Deadline to certify nomination papers" for federal
 *     and state offices. The export's own ballot-placement columns (`ON
 *     P.B`, `B.P.N`, `ON E.B`, `B.P.E`) were blank/`No` for every row at
 *     retrieval — consistent with the calendar, since the ballot-placement
 *     lottery for both the primary and general ballots doesn't run until
 *     July 17, 2026 at 5:00 p.m., one day after this snapshot. See the
 *     data-check doc for the full list of still-governing dates and the
 *     dated follow-up card opened for the post-lottery/post-objections
 *     recheck.
 *   - No independent/minor-party filer needed a new party code — Bahry and
 *     DeSouza both use the existing generic `IND`.
 *   - Incumbency cross-checked against independent official sources, never
 *     this app's FEC-derived table: `senate.gov`'s official
 *     "Contacting U.S. Senators" state list (confirms Reed as RI's Class II
 *     senator, the seat up in 2026 — Whitehouse's Class I seat is not).
 *     `house.gov/representatives`'s "By State and District" tab (a long
 *     single page that lazy-loads on scroll — same quirk the Civix playbook
 *     documents for Texas — had to scroll to the Rhode Island section before
 *     its rows populated) confirms Amo (District 1) and Magaziner
 *     (District 2), both Democrats.
 *
 * Sources:
 *   - https://vote.sos.ri.gov/Candidates/CandidateSearch (RI Dept. of State
 *     "Candidates in Upcoming Elections" portal page, linking to the export
 *     below)
 *   - https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx (RI
 *     Dept. of State "Declared Candidates Report," retrieved 2026-07-16 —
 *     primary transcription source for all 12 federal rows below)
 *   - https://vote.sos.ri.gov/Forms/Elections/Guides/2026ElecCal.pdf (RI
 *     Dept. of State official "2026 Election Calendar" guide — governing
 *     dates cited in the data-check doc)
 *   - https://law.justia.com/codes/rhode-island/title-17/chapter-17-15/section-17-15-11/
 *     (RIGL § 17-15-11, "Dispensation with primary when no contest" — legal
 *     basis for the unopposed-primary-to-general promotion above)
 *   - https://www.senate.gov/senators/senators-contact.htm (incumbency
 *     cross-check only — confirms Jack Reed as RI's sitting Class II Senator)
 *   - https://www.house.gov/representatives (incumbency cross-check only —
 *     "By State and District" tab confirms Gabe Amo (District 1) and Seth
 *     Magaziner (District 2) as RI's sitting Representatives)
 *
 * Coverage: RI's 2 US House districts (District 1, District 2) + the 2026 US
 * Senate contest (Reed's Class II seat; Whitehouse's Class I seat is not up
 * until 2030 — confirmed absent from the export, which has no second
 * `SENATOR IN CONGRESS` row for a different class/cycle).
 *
 * KNOWN LIMITATIONS:
 *   - Retrieved on RI's own certify-nomination-papers deadline (2026-07-16);
 *     the July 17 ballot-placement lottery, July 17 withdrawal deadline, and
 *     July 20 objections-decision deadline are all still ahead — see the
 *     dated follow-up card for the required recheck.
 *   - Names recorded exactly as printed in the official export; not
 *     cross-checked against a third document beyond the incumbency checks
 *     above.
 *   - No `runoff_pending` rows — RI federal primaries have no runoff.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const RI_STATE = "RI";
export const RI_ELECTION_YEAR = 2026;
// Rhode Island's September 9, 2026 primary is still upcoming at
// transcription time (2026-07-16).
export const RI_STAGE = "primary" as const;
export const RI_HOUSE_DISTRICT_1 = "01";
export const RI_HOUSE_DISTRICT_2 = "02";
export const RI_HOUSE_SOURCE_URLS = [
  "https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx",
  "https://vote.sos.ri.gov/Candidates/CandidateSearch",
];
export const RI_SENATE_SOURCE_URLS = [
  "https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx",
  "https://vote.sos.ri.gov/Candidates/CandidateSearch",
];
export const RI_RETRIEVED_AT = "2026-07-16";

export const RI_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 1 — sole Democratic filer, unopposed primary (RIGL
  // § 17-15-11) → straight to the general ballot. Incumbent, confirmed via
  // house.gov's "By State and District" tab.
  {
    district: RI_HOUSE_DISTRICT_1,
    name: "Gabe Amo",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 1 — sole Republican filer, unopposed primary → general ballot.
  {
    district: RI_HOUSE_DISTRICT_1,
    name: "Kellie Keenan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 1 — Independent, filed directly for the general-election track;
  // nomination-papers signature verification still pending at retrieval.
  {
    district: RI_HOUSE_DISTRICT_1,
    name: "Pedro DeSouza",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 2 — contested Democratic primary. Incumbent, confirmed via
  // house.gov.
  {
    district: RI_HOUSE_DISTRICT_2,
    name: "Seth Magaziner",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: RI_HOUSE_DISTRICT_2,
    name: "Spencer Dickinson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // District 2 — contested Republican primary.
  {
    district: RI_HOUSE_DISTRICT_2,
    name: "Stephen Skoly",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: RI_HOUSE_DISTRICT_2,
    name: "Victor Mellor",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

export const RI_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Contested Democratic primary — incumbent Jack Reed is one of three
  // filers; cross-checked against senate.gov as RI's sitting Class II
  // Senator.
  {
    district: null,
    name: "John F. Reed",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Connor Burbridge",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Luis Daniel Munoz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Sole Republican filer, unopposed primary (RIGL § 17-15-11) → general
  // ballot.
  {
    district: null,
    name: "Raymond McKay",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent, filed directly for the general-election track; nomination-
  // papers signature verification still pending at retrieval.
  {
    district: null,
    name: "Michael Bahry",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

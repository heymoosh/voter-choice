/**
 * scripts/congressional-rosters/hi-official-roster-2026.ts
 *
 * Hawaii's 2026 official congressional roster for the November 3, 2026
 * general election — covers both US House districts (I and II). Hawaii has
 * NO US Senate contest in 2026 (Brian Schatz's seat runs through 2029,
 * Mazie Hirono's through 2031 — confirmed three independent ways, see
 * below), so this fixture is house-only, mirroring CT/CA's shape. Built
 * through the same manual official-source pipeline as Arizona, Texas,
 * Oklahoma, Alabama, Alaska, Colorado, Connecticut, California, Arkansas,
 * Delaware, and Florida, epic c5a813bb; this is Hawaii's build (card
 * "[P0] Import + verify official roster: Hawaii (HI)").
 *
 * HAWAII-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/hawaii-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Hawaii's official candidate-filing system is a
 *     Telerik-RadGrid-based ASP.NET WebForms application ("OLVR" — Online
 *     Voter Registration / candidate filing — at olvr.hawaii.gov), reached
 *     via elections.hawaii.gov/candidates/candidate-reports/'s single
 *     "Candidate Report" link. It is a genuinely different mechanical
 *     shape from every prior state: ALL 2026 candidate filings across
 *     EVERY office (federal, state, county, OHA) live in one 411-row grid
 *     (`CandidateFiling.aspx?elid=94`), not split by office/contest via URL
 *     parameter. `WebFetch`/`curl` only ever returned the first ~15-50 rows
 *     depending on the grid's current page size — this build used
 *     `mcp__claude-in-chrome__*` browser automation, ultimately driving the
 *     grid's own Telerik client-side API directly
 *     (`$find('ctl00_cphFooter_rdgSearch').get_masterTableView().set_pageSize(500)`)
 *     to force all 411 rows into the DOM at once, then read them with a
 *     targeted `javascript_tool` DOM query rather than relying on the
 *     text-only filter textboxes in the UI (which proved unreliable to
 *     drive via scripted click+type — see the data-check doc for the full
 *     story). This is a materially different mechanical trap from the
 *     Civix "single-select filter, no all-districts query" trap the plan
 *     doc documents, worth its own playbook note for a future Telerik-grid
 *     state.
 *   - **CRITICAL, HAWAII-SPECIFIC FINDING: "Issued" vs "Filed" status.**
 *     Every row in the grid carries an "Issued" date (when the candidate
 *     requested/received a blank nomination paper) and, separately, a
 *     "Filed" date (when they returned the completed, signed paper with
 *     the filing fee). A row with an Issued date but NO Filed date carries
 *     Status = "Issued" and is NOT an actual candidate — they picked up
 *     papers but never completed the filing, and (per the June 2, 2026,
 *     4:30pm filing deadline, already passed at this build's 2026-07-15
 *     retrieval) never will. Only rows with BOTH an Issued date and a
 *     Filed date, Status = "In Primary", represent real qualified
 *     candidates. This is a wholly new distinction not seen in any prior
 *     state's source (AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL all published
 *     already-filed candidate lists with no separate "picked up but never
 *     returned papers" bucket) — getting this wrong would have
 *     substantially overstated Hawaii's candidate set: of the 28 total
 *     rows across both congressional districts, 13 were "Issued"-only and
 *     excluded entirely from this fixture (they never became candidates),
 *     leaving 15 real filed candidates (8 in District I, 7 in District
 *     II). Two names each appear TWICE in the "Issued"-only bucket, once
 *     per party (Ku Lono "Bobby" Cuadra filed applications as both
 *     Libertarian and Republican in EACH district; Joshua P.K. Gisa filed
 *     applications as both Democratic and Republican in District I) —
 *     identical mailing address/phone/email confirm these are the same
 *     person requesting papers under two party labels, never completing
 *     either. Excluded from this fixture along with every other
 *     Issued-only row.
 *   - **Confirmed via the grid's own Status column, "In Primary" does NOT
 *     mean "contested."** Hawaii holds a primary for every partisan
 *     congressional filer regardless of how many candidates their party
 *     fielded — CD1's sole Republican filer (Adriel C. Lam) and CD2's sole
 *     Republican filer (Brenton Awa) both carry Status = "In Primary," the
 *     same as a genuinely multi-candidate primary. (The grid DOES have a
 *     distinct "In General" status that skips the primary outright, but it
 *     is used ONLY for Hawaii's nonpartisan county-council/OHA-trustee
 *     races — "NONPARTISAN SPECIAL" party rows — never for a partisan
 *     congressional filer, confirmed by checking every "In General" row in
 *     the full 411-row dataset.) Per the SAFETY rule against inferring
 *     ahead of what the official source itself certifies, every filed
 *     congressional row here — including the two solo-Republican
 *     filers — is recorded `qualified_for_primary_ballot`, not promoted to
 *     `qualified_for_general_ballot`, matching exactly what the official
 *     source's own Status column says.
 *   - **No US Senate contest in 2026** — confirmed three independent ways:
 *     (1) the OLVR grid's full 411-row dataset contains zero rows whose
 *     Contest column matches "SENATE"/"SENATOR"/"U.S." combined with
 *     "SENAT" (only "STATE SENATOR, DIST n" rows, a state-legislative
 *     office, out of this card's scope); (2) elections.hawaii.gov's own
 *     "Contest Schedule" page
 *     (https://elections.hawaii.gov/voting/contest-schedule/) lists "U.S.
 *     House of Representatives" under its 2026 federal section but "U.S
 *     Senate" only under the 2028 section; (3) independent web research
 *     confirms Sen. Brian Schatz's term runs through January 2029 (elected
 *     2022) and Sen. Mazie Hirono's runs through January 2031 (re-elected
 *     2024) — neither seat is up in 2026.
 *   - **NONPARTISAN maps to the existing `NPA` code**, following the
 *     Alaska precedent exactly: Hawaii's OLVR grid literally labels these
 *     filers' party as "NONPARTISAN" (not a declared-independent
 *     candidacy in the TX/OK "IND" sense), the same situation AK's
 *     "Nonpartisan"/"Undeclared" filers collapse into `NPA` for. No new
 *     party code needed. Green Party filer Jordan S. Conley uses the
 *     existing `GRE` code (already used by AK/AZ/CA/CT fixtures). No
 *     Libertarian candidate actually FILED in either district (Cuadra's
 *     LIB applications were Issued-only, excluded per above), so `LIB` is
 *     unused in this fixture despite being requested.
 *   - **Incumbency cross-checked against two independent house.gov-domain
 *     sources, never guessed from the OLVR grid** (which carries no
 *     incumbency signal at all — unlike every prior state's portal, this
 *     one doesn't even attempt to flag sitting members): `case.house.gov`
 *     confirms Ed Case as HI-01's sitting Representative; `tokuda.house.gov`
 *     confirms Jill N. Tokuda as HI-02's sitting Representative. (The
 *     Clerk's directory and `house.gov/representatives` both returned HTTP
 *     403 to a direct fetch this session, the same failure DE's build hit —
 *     these two member-domain sites were used instead, consistent with
 *     DE's `mcbride.house.gov` fallback.) Both are filed for re-election
 *     (Status = "In Primary" in their own party's contested primary) and
 *     recorded `isIncumbent: true` here.
 *   - **Withdrawal deadline (standing per-state requirement):** HRS §11-117
 *     sets Hawaii's pre-filing-deadline withdrawal cutoff at 4:30pm on the
 *     fourth business day before the close of filing — May 27, 2026, 4:30pm
 *     for this cycle — already passed at transcription time and, unlike
 *     DE's/AK's post-filing withdrawal windows, falls BEFORE the June 2
 *     filing deadline, so it does not bound any open risk against this
 *     fixture's already-filed rows. A candidate can still withdraw AFTER
 *     filing under the same statute (triggering HRS §11-118's party-vacancy
 *     process); no further named deadline for that was found in this
 *     build's sources — same open-ended risk every prior state's fixture
 *     carries. See the data-check doc's "Governing calendar dates" section.
 *
 * Sources:
 *   - https://elections.hawaii.gov/candidates/candidate-reports/ (landing
 *     page confirming the filing deadline had passed and linking to the
 *     live report, last updated July 6, 2026, retrieved 2026-07-15)
 *   - https://olvr.hawaii.gov/Controls/CandidateFiling.aspx?elid=94 (the
 *     Office of Elections' 2026 Candidate Report — all 411 filings across
 *     every 2026 office, retrieved live via browser automation 2026-07-15;
 *     28 rows scoped to "U.S. REPRESENTATIVE, DIST I" / "DIST II")
 *   - https://elections.hawaii.gov/voting/contest-schedule/ (confirms which
 *     federal offices are up in 2026 vs. 2028 — no US Senate in 2026)
 *   - https://elections.hawaii.gov/candidates/candidate-filing/ (official
 *     "Become a Candidate" page — filing/objection deadlines, retrieved
 *     2026-07-15, last updated by the state July 1, 2026)
 *   - https://elections.hawaii.gov/resources/election-objections/ (official
 *     primary/general election-contest deadlines — the practical
 *     results-become-final dates, retrieved 2026-07-15)
 *   - https://case.house.gov/ (incumbency cross-check only — confirms Ed
 *     Case as HI-01's sitting Representative)
 *   - https://tokuda.house.gov/ (incumbency cross-check only — confirms
 *     Jill N. Tokuda as HI-02's sitting Representative)
 *
 * Coverage: both HI US House districts (I and II). No US Senate contest
 * exists in 2026 — see above. Every filed congressional candidate is
 * `qualified_for_primary_ballot`; no `runoff_pending` rows (Hawaii's
 * primary is a plurality-decided single round with no runoff mechanism —
 * confirmed via the Candidate's Manual / election-objections page, neither
 * of which mentions a runoff for federal office).
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the "In Primary" filed-candidate set as of
 *     2026-07-15. The August 8, 2026 primary is still in the future — every
 *     contested-primary row (including the two technically-solo-per-party
 *     Republican filers) remains undetermined until the primary-election
 *     objection window closes August 24, 2026, 4:30pm — see the dated
 *     re-check card opened alongside this build.
 *   - The 13 "Issued"-only rows (picked up nomination papers, never filed)
 *     are deliberately excluded, not merely unlabeled — see the "Issued vs
 *     Filed" note above. If the OLVR grid's own historical data is ever
 *     found to be wrong (e.g. a Filed date that failed to render), a
 *     future recheck should re-verify against the live grid, not assume
 *     this fixture's exclusions are permanent.
 *   - A filed candidate can still withdraw; Hawaii's OLVR grid has a
 *     distinct "Withdrawn" status (seen elsewhere in the 411-row dataset,
 *     not in either congressional district as of this build) that a
 *     future recheck should watch for.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const HI_STATE = "HI";
export const HI_ELECTION_YEAR = 2026;
// Hawaii's Aug 8, 2026 primary is still in the future at transcription time
// (2026-07-15) — every filed congressional candidate is
// qualified_for_primary_ballot, no nominee guessed.
export const HI_STAGE = "primary" as const;
export const HI_HOUSE_SOURCE_URLS = [
  "https://olvr.hawaii.gov/Controls/CandidateFiling.aspx?elid=94",
];
export const HI_RETRIEVED_AT = "2026-07-15";

export const HI_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Ed Case (DEM, incumbent). 8 filed candidates; 8
  // additional Issued-only applications (Belatti, Burd, Cuadra x2, Frazier,
  // Gisa x2, Woodrow) excluded — never filed, see docblock.
  {
    district: "01",
    name: "Nathan M. Berning",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jennifer Booker",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Ed Case",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jordan S. Conley",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Ben Fatula",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jarrett K. Keohokalole",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: 'Nicholas "Nick" Kiswanto',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Adriel C. Lam",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 02 — Jill N. Tokuda (DEM, incumbent). 7 filed candidates; 5
  // additional Issued-only applications (Cuadra x2, Curtis, Lucas-Tadeo,
  // Martin) excluded — never filed, see docblock.
  {
    district: "02",
    name: "Brenton Awa",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Kirill Basin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Edward A. Codelia",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Greg Guithues",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Steven King",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Randall Terry",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Jill N. Tokuda",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

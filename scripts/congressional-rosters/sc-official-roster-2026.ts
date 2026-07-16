/**
 * scripts/congressional-rosters/sc-official-roster-2026.ts
 *
 * South Carolina's 2026 official congressional roster for the November 3,
 * 2026 general election — covers all 7 US House districts and the 2026 US
 * Senate race (Lindsey Graham's Class 2 seat). Built through the same manual
 * official-source pipeline as Arizona (card 637c2583), Texas, Oklahoma,
 * Alabama, Alaska, Colorado, Connecticut, California, Arkansas, Delaware,
 * Florida, Hawaii, Louisiana, Maine, Indiana, Georgia, Iowa, Kansas, Idaho,
 * Maryland, and Kentucky, epic c5a813bb; this is South Carolina's build (card
 * "[P0] Import + verify official roster: South Carolina (SC)").
 *
 * SOUTH-CAROLINA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/south-carolina-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. South Carolina's official candidate source is the SC
 *     Election Commission's own VREMS candidate-tracking portal at
 *     vrems.scvotes.sc.gov (`Candidate/SelectElection` -> pick Election Type
 *     "Statewide Primaries and General Elections", Year 2026, then the
 *     autocomplete "Election Name" field -> "11/3/2026 Statewide General
 *     Election" -> `Candidate/CandidateSearch?electionId=22596`). This is a
 *     conventional server-rendered ASP.NET page, not a Civix SPA — no
 *     `*.civixapps.com` URL, no rendered-portal navigation gotchas.
 *   - Unlike Texas's Civix portal, VREMS lets "Office" be queried with NO
 *     district filter — selecting "U.S. House of Representatives" and
 *     clicking Search returns all 7 districts' candidates in one query (48
 *     rows total this cycle); "U.S. Senate" similarly returns the entire
 *     statewide field (13 rows) in one query. Setting "entries per page" to
 *     100 puts the whole result set on one page — no virtualized-scroll or
 *     pagination-scripting gotcha like Texas's Election Night Results page.
 *   - VREMS's own "Candidate Status" column is the single most useful signal
 *     this build used: since South Carolina's June 9, 2026 primary and June
 *     23, 2026 runoff have both already occurred (build/retrieval date
 *     2026-07-16), every candidate row already carries a determined status —
 *     "Active" (survived to the Nov 3 general ballot) or "Defeated In
 *     Primary" (eliminated). This fixture includes ONLY the "Active" rows;
 *     "Defeated In Primary" filers are correctly excluded (no ballotStatus
 *     value represents a primary loser, matching every other post-primary
 *     state's build). No party in this cycle needed a *runoff* to determine
 *     its nominee among the 7 House districts.
 *   - TWO HOUSE SEATS ARE OPEN (no incumbent running): SC-1 (Nancy Mace) and
 *     SC-5 (Ralph Norman) both ran for SC Governor in 2026 instead of
 *     seeking House re-election (both lost that primary — Rollcall, "Nancy
 *     Mace and Ralph Norman lose bids for governor in South Carolina," 2026-
 *     06-09) — confirmed by their total ABSENCE from VREMS's House candidate
 *     list (not merely a missing incumbency flag; they filed for Governor,
 *     not U.S. House, so no House row exists for either name at all).
 *     Incumbency for the remaining 5 districts was cross-checked
 *     independently against house.gov's own "By State and District" member
 *     directory (https://www.house.gov/representatives, South Carolina
 *     section, fetched live via browser session 2026-07-16): confirms Joe
 *     Wilson (SC-2), Sheri Biggs (SC-3), William Timmons (SC-4), Jim Clyburn
 *     (SC-6), and Russell Fry (SC-7) as the sitting incumbents (each appears
 *     `isIncumbent: true` below), and separately confirms Mace and Norman
 *     still hold SC-1/SC-5 in the current Congress despite not seeking
 *     House re-election — consistent with, not contradicting, their absence
 *     from VREMS's 2026 candidate list. None of SC-1/SC-5's active
 *     general-ballot candidates are incumbents.
 *   - THE SENATE RACE HAS A SITTING NOMINEE WHO DIED AFTER WINNING HIS OWN
 *     PRIMARY. Sen. Lindsey Graham (R) won the June 9 Republican primary but
 *     died before the general election — VREMS records his row as
 *     `Deceased After Primary`. Per S.C. Code of Laws § 7-11-55, because
 *     Graham's seat had opposition in the general election, this triggers a
 *     brand-new, Republican-only special filing period and special primary
 *     to select the actual November 3, 2026 general-ballot nominee — NOT a
 *     party-committee appointment of a replacement nominee. Confirmed via
 *     the SC Election Commission's own press release
 *     (scvotes.gov/u-s-senate-special-republican-party-filing-primary/,
 *     posted 2026-07-13):
 *       - Candidate filing opens: noon, Tuesday, July 21, 2026
 *       - Candidate filing closes: noon, Tuesday, July 28, 2026
 *       - Statewide Special Primary: Tuesday, August 11, 2026
 *       - Statewide Special Primary Runoff (if necessary): Tuesday, August
 *         25, 2026
 *       - "The nominee resulting from this special filing and primary will
 *         be a candidate on the November 3, 2026 General Election Ballot."
 *     As of this build's retrieval date (2026-07-16), filing has not even
 *     OPENED yet — there is no candidate name to record for the Republican
 *     side of this race at all (not an undetermined-runoff-between-two-
 *     finalists situation like `runoff_pending` models; there are zero
 *     filed candidates to name). Per this codebase's existing precedent for
 *     a comparable no-candidates-yet gap (Louisiana's House fixture omission,
 *     see `official-roster.ts`'s own comment there), the correct and safety-
 *     conforming choice — confirmed by reviewing how `races.ts` consumes
 *     these rows (`getOfficialRoster`'s senate fallback is all-or-nothing
 *     per office: once ANY senate row exists for a state, the fixture
 *     becomes the sole source of truth for that seat, silently replacing FEC
 *     data with no per-party completeness check) — is to OMIT any
 *     Republican row for SC's Senate race entirely, rather than inventing a
 *     placeholder or misusing `runoff_pending` for a contest that doesn't
 *     have a real already-filed finalist name. Governor Henry McMaster
 *     separately named an interim appointee to hold the seat through the
 *     remainder of Graham's term — that appointment is unrelated to, and
 *     does not determine, the 2026 general-election nominee, so it is not
 *     recorded here. This is the single biggest open item in this build —
 *     see the dated `NOT BEFORE` follow-up card and Known Gaps below.
 *   - The Democratic, Libertarian, and Constitution Party Senate candidates
 *     are already-determined general-ballot nominees (VREMS: `Active`),
 *     unaffected by the Republican vacancy.
 *   - FOUR OF SOUTH CAROLINA'S 9 SC-CERTIFIED MINOR PARTIES FIELDED
 *     GENERAL-BALLOT CANDIDATES THIS CYCLE: the Alliance Party (`SCA`,
 *     SC-1's Margo Ellis and SC-6's Joseph Oddo), the Constitution Party
 *     (`SCC`, Senate's Mark Hackett), the South Carolina Forward Party
 *     (`SCF`, SC-5's Andy Kaplan), and the South Carolina Workers Party
 *     (`SCW`, SC-2's Dayna Alane Smith) — confirmed against
 *     scvotes.gov/candidates/certified-political-parties-of-south-carolina/,
 *     the SC Election Commission's own list of all 9 certified parties
 *     (Alliance, Constitution, Democratic, Green, Forward, Labor,
 *     Libertarian, Republican, United Citizens); see `types.ts` for the new
 *     `SCA`/`SCC`/`SCF`/`SCW` codes added for this build, each distinct from
 *     any same-named party code already added for another state (mirroring
 *     how Florida's `FFP` and Idaho's `CST` are each that state's own
 *     legally distinct chapter, not shared codes).
 *   - No independent/petition-signature candidate appears in either the
 *     House or Senate list as of this build (VREMS's "Petition" party option
 *     had zero matching federal rows) — but South Carolina's own 2026
 *     election calendar (scvotes.gov's official PDF) lists July 15, 2026,
 *     noon, as the deadline to SUBMIT a petition for a name to be placed on
 *     the general ballot, with August 17, 2026, noon, as the deadline to
 *     CHECK and CERTIFY those petitions (and to certify party candidates
 *     generally). Since certification is not until August 17, VREMS's
 *     current snapshot may not yet reflect a petition candidate who
 *     submitted by July 15 but isn't certified yet — this fixture's House/
 *     Senate coverage (outside the known Senate GOP vacancy) should be
 *     treated as accurate-as-of-primary-and-runoff but not yet
 *     FINAL/CERTIFIED. See Known Gaps and the dated follow-up card.
 *   - No write-in candidates appear in either candidate list (South
 *     Carolina write-in filing is a distinct, separately-tracked process not
 *     covered by this page — out of scope, matching prior states' treatment
 *     of write-ins as not printed on the ballot).
 *
 * Sources:
 *   - https://vrems.scvotes.sc.gov/Candidate/SelectElection (VREMS election
 *     picker — Election Type "Statewide Primaries and General Elections",
 *     Year 2026, Election Name "11/3/2026 Statewide General Election")
 *   - https://vrems.scvotes.sc.gov/Candidate/CandidateSearch?electionId=22596
 *     (Candidate Listing — Office "U.S. House of Representatives" and
 *     separately "U.S. Senate", both queried with entries-per-page set to
 *     100, retrieved live via browser session, 2026-07-16)
 *   - https://scvotes.gov/u-s-senate-special-republican-party-filing-primary/
 *     (SC Election Commission's official press release, posted 2026-07-13,
 *     on the S.C. Code § 7-11-55 special Republican filing/primary process
 *     triggered by Sen. Graham's death)
 *   - https://scvotes.gov/wp-content/uploads/2026/01/2026-Election-Calendar-Draft-scVOTES_.pdf
 *     (official 2026 election calendar — primary/runoff dates, candidate-
 *     withdrawal deadlines, petition-certification deadline)
 *   - https://scvotes.gov/candidates/certified-political-parties-of-south-carolina/
 *     (SC Election Commission's official list of the state's 9 certified
 *     political parties — confirms Alliance/Constitution/Forward/Workers as
 *     real certified parties, not ad hoc labels)
 *   - https://www.house.gov/representatives (South Carolina section, "By
 *     State and District" — incumbency cross-check only, fetched live via
 *     browser session 2026-07-16; corroborated by Rollcall's 2026-06-09
 *     reporting confirming Mace (SC-1) and Norman (SC-5) each ran for
 *     Governor instead of House re-election)
 *
 * Coverage: all 7 US House districts + the US Senate race (4 determined
 * general-ballot nominee rows recorded for Senate; the Republican Senate
 * nomination is intentionally NOT recorded — see above and Known Gaps).
 *
 * KNOWN LIMITATIONS:
 *   - The Republican nominee for U.S. Senate is completely undetermined as
 *     of this build (2026-07-16) — S.C. Code § 7-11-55 special filing opens
 *     July 21, 2026, special primary is August 11, 2026, with a possible
 *     runoff August 25, 2026. See the dated `NOT BEFORE` follow-up card.
 *   - House/Senate coverage outside the Senate GOP vacancy reflects VREMS's
 *     post-primary/post-runoff snapshot but is not yet CERTIFIED — South
 *     Carolina's own calendar sets August 17, 2026, noon, as the deadline to
 *     certify petition and party candidates for the general ballot. A
 *     petition candidate who submitted by the July 15 deadline but isn't yet
 *     certified could still appear.
 *   - South Carolina's candidate-withdrawal deadline for the General
 *     Election ballot is September 4, 2026, 5:00 p.m. — any of this
 *     fixture's `qualified_for_general_ballot` rows could still withdraw
 *     before then.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const SC_STATE = "SC";
export const SC_ELECTION_YEAR = 2026;
// South Carolina's June 9, 2026 primary and June 23, 2026 runoff have both
// already occurred; every row below is a determined general-ballot nominee
// EXCEPT the Republican U.S. Senate nomination, which is entirely open
// pending the S.C. Code § 7-11-55 special filing/primary process (see
// docblock). "general" reflects the House slate and the non-Republican
// Senate nominees; the Senate GOP seat itself remains unresolved.
export const SC_STAGE = "general" as const;
export const SC_HOUSE_SOURCE_URLS = [
  "https://vrems.scvotes.sc.gov/Candidate/CandidateSearch?electionId=22596",
];
export const SC_SENATE_SOURCE_URLS = [
  "https://vrems.scvotes.sc.gov/Candidate/CandidateSearch?electionId=22596",
  "https://scvotes.gov/u-s-senate-special-republican-party-filing-primary/",
];
export const SC_RETRIEVED_AT = "2026-07-16";

export const SC_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — open seat (incumbent Nancy Mace ran for Governor instead
  // of re-election, and lost that primary). 4-way general: Republican,
  // Democratic, Alliance, and Libertarian nominees.
  {
    district: "01",
    name: "Jenny Costa Honeycutt",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Nancy Lacore",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Margo Ellis",
    party: "SCA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Bill Reeside",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — incumbent Joe Wilson (R) seeking re-election.
  {
    district: "02",
    name: "Joe Wilson",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Zyon Khalifa",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Dayna Alane Smith",
    party: "SCW",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — incumbent Sheri Biggs (R) seeking re-election.
  {
    district: "03",
    name: "Sheri Biggs",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Eunice Lehmacher",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Brian Corriea",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — incumbent William Timmons (R) seeking re-election.
  {
    district: "04",
    name: "William Timmons",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Courtney McClain",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Jessica Ethridge",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 — open seat (incumbent Ralph Norman ran for Governor
  // instead of re-election, and lost that primary). 3-way general:
  // Republican, Democratic, and South Carolina Forward Party nominees.
  {
    district: "05",
    name: "Wes Climer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Mallory Dittmer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Andy Kaplan",
    party: "SCF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 — incumbent Jim Clyburn (D) seeking re-election.
  {
    district: "06",
    name: "James E Jim Clyburn",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "John Peterson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Joseph Oddo",
    party: "SCA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — incumbent Russell Fry (R) seeking re-election. Only 2
  // general-ballot candidates this cycle (no third-party/independent filer).
  {
    district: "07",
    name: "Russell Fry",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "John Gregory Vincent",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// U.S. SENATE — Lindsey Graham (R), the sitting incumbent, won his own
// primary but died before the general election (VREMS: "Deceased After
// Primary"). Per S.C. Code § 7-11-55, this triggers a brand-new Republican-
// only special filing period (opens 2026-07-21) and special primary
// (2026-08-11, runoff 2026-08-25 if necessary) to pick the actual November 3
// general-ballot nominee. As of this build (2026-07-16), filing has not even
// opened — there is no Republican candidate name to record. See the
// docblock's SAFETY discussion for why this Republican slot is deliberately
// OMITTED (not represented with `runoff_pending` or any placeholder), and the
// dated `NOT BEFORE` follow-up card that must re-check this race.
export const SC_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Annie Andrews",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Jason Elliot Brenkus",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Mark Hackett",
    party: "SCC",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Kasie Whitener",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
];

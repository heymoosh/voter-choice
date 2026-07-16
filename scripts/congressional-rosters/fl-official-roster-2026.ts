/**
 * scripts/congressional-rosters/fl-official-roster-2026.ts
 *
 * Florida's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 28 US House districts and the 2026 US
 * Senate special election. Built through the same manual official-source
 * pipeline as Arizona (card 637c2583), Texas (card 8530a468), Oklahoma
 * (card d9b1ef86), Alabama, Alaska, Colorado, Connecticut, California, and
 * Arkansas, epic c5a813bb; this is Florida's build (card "[P0] Import +
 * verify official roster: Florida (FL)").
 *
 * FLORIDA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/florida-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix — Florida's official candidate-tracking system is a legacy
 *     server-rendered ASP application at dos.elections.myflorida.com/candidates/,
 *     structurally the simplest source seen in this track so far: every US
 *     House candidate (all 28 districts) is returned in ONE static HTML page
 *     (`CanList.asp?elecid=20261103-GEN&OfficeCode=USR`), and every US Senate
 *     candidate in ONE more (`...&OfficeCode=USS`). No JS rendering, no
 *     browser automation needed. `WebFetch` alone works, though this build
 *     used `curl` (fetching raw HTML directly, then parsing with Python's
 *     BeautifulSoup) for exact, error-free candidate-by-candidate
 *     transcription across ~196 rows — see the operational-navigation
 *     section in the data-check doc for why a scripted parse was used
 *     instead of hand-transcription at this volume, mirroring TX/CO's use of
 *     scripted extraction at similar scale.
 *   - FL_STAGE = "primary": Florida's Aug 18, 2026 primary is still in the
 *     future as of this fixture's transcription (2026-07-15); many House
 *     districts and the Senate race have genuinely contested primaries with
 *     undetermined nominees. The candidate-qualifying deadline (House: noon,
 *     June 12, 2026; Senate: April 24, 2026) has already passed, so the full
 *     qualified-candidate set is known and closed — no further candidates
 *     can be added this cycle, only the primary's outcome remains open.
 *   - CRITICAL FINDING — Florida underwent mid-decade congressional
 *     redistricting for the 2026 cycle: Gov. DeSantis signed a new
 *     congressional map into law May 4, 2026 (upheld by the Florida Supreme
 *     Court against a Fair Districts Amendment challenge), redrawing
 *     district lines and, for several seats, district NUMBERS, particularly
 *     in Central Florida, Tampa, and South Florida. This makes matching
 *     "district N on the official candidate portal" to "district N's
 *     current sitting member per house.gov" unreliable by number alone —
 *     the same structural lesson TX's Al Green case established (a sitting
 *     member can appear on the ballot under a different district number
 *     than the one they currently hold), generalized here beyond just
 *     Civix-vended states. Incumbency was cross-checked by NAME, not
 *     district number: every one of Florida's 28 currently sitting US
 *     Representatives (per house.gov's member directory, fetched directly
 *     via `curl` — WebFetch works too but a direct fetch was used for a
 *     clean, greppable text dump) was searched for by surname across the
 *     ENTIRE 2026 candidate list (all districts), not just their prior
 *     district. This surfaced three corrections to the portal's own
 *     `*Incumbent` marker:
 *     (1) Lois Frankel (sitting member, formerly CD22) filed in the new
 *     CD23; the portal's CD23 listing does not tag her incumbent, but she IS
 *     a sitting member seeking re-election under the new lines — confirmed
 *     via Florida Phoenix and WLRN reporting on her CD23 candidacy. Marked
 *     `isIncumbent: true` here, correcting the portal's omission.
 *     (2) Jared Moskowitz (sitting member, formerly CD23) filed in the new
 *     CD25; the portal's CD25 listing does not tag him incumbent, but he IS
 *     a sitting member seeking re-election under the new lines — confirmed
 *     via Florida Phoenix, WLRN, and local10.com reporting on his CD25
 *     candidacy. Marked `isIncumbent: true` here, correcting the portal's
 *     omission.
 *     (3) Debbie Wasserman Schultz (sitting member, formerly CD25) filed in
 *     the new CD20; the portal's CD20 listing does not tag her incumbent,
 *     but she IS a sitting member seeking re-election under the new lines —
 *     confirmed via cbs12.com, The Hill, and Washington Examiner reporting on
 *     her CD20 candidacy. Marked `isIncumbent: true` here, correcting the
 *     portal's omission.
 *   - A FOURTH finding went the OPPOSITE direction — the portal's own tag
 *     overclaims incumbency: Sheila Cherfilus-McCormick IS tagged
 *     `*Incumbent` on the portal's CD20 listing (the same new district
 *     Wasserman Schultz filed in, so both are 2026 CD20 Democratic primary
 *     candidates), but she resigned from the 119th Congress on 2026-04-21,
 *     minutes before a House Ethics Committee vote to consider her expulsion
 *     (the Committee had found her guilty of 25 ethics violations related to
 *     misuse of federal relief funds) — independently confirmed via NBC
 *     News, CBS News, NPR, and CNN reporting. She is a 2026 candidate
 *     seeking to reclaim the seat, but is NOT a currently sitting member of
 *     Congress; the portal's tag is stale (does not reflect her post-
 *     qualifying resignation). Marked `isIncumbent: false` here, correcting
 *     the portal's stale tag — the SAFETY rule against trusting an
 *     unreliable in-portal incumbency signal applies just as much to a
 *     "stale after the fact" case as to Civix's own district-mismatch case.
 *     No separate special election was called for the resulting CD20
 *     vacancy — checked dos.fl.gov's own special-elections page directly
 *     (2026-07-15), which lists only state-legislative specials, none for
 *     CD20 — so the seat is simply open through the regular Aug 18 primary /
 *     Nov 3 general, decided alongside every other 2026 House race.
 *   - CD20 is therefore a genuine two-sitting-member primary: Wasserman
 *     Schultz and Cherfilus-McCormick (a former member seeking to return)
 *     both run in the same Democratic primary, alongside four other
 *     Democratic challengers, one Independent (Kedner Maxime, unopposed in
 *     his ballot line), and three Republicans.
 *   - CD10 (Maxwell Frost, DEM) is uniquely marked `Unopposed` on ALL THREE
 *     of the portal's status/primary/general columns — no other candidate,
 *     of any party, filed for this seat at all. Under Florida law (no
 *     opposition of any kind, not even a write-in), no primary or general
 *     election is held for this contest; Frost is elected without a ballot
 *     appearing. Recorded here as `qualified_for_general_ballot`,
 *     `isIncumbent: true` — he holds the seat outright for the next term.
 *   - New party codes added to `types.ts` for this build, confirmed directly
 *     against dos.fl.gov's official political-parties list (not guessed
 *     from context): `LPF` = Libertarian Party of Florida; `FFP` = Florida
 *     Forward Party. Florida's own `IND` code corresponds to the
 *     "Independent Party of Florida," a real state-recognized minor party
 *     under Florida law (distinct from a generic declared-independent
 *     filer, the sense TX/OK's `IND` rows use) — reusing the existing `IND`
 *     value is still correct since both render identically via
 *     `races.ts`'s `PARTY_NAMES` map, but this is a real party, not a
 *     generic-independent placeholder, noted here per the plan doc's
 *     instruction to confirm each code's meaning before reuse.
 *   - Write-in candidates (`WRI` in the portal's party column, 9 rows) are
 *     recorded with `party: null` and `ballotStatus: "write_in_qualified"`,
 *     matching the AZ/OK precedent — the portal does not publish a write-in
 *     filer's party affiliation (write-ins qualify without a primary or
 *     party nomination under Florida law), so no party code is guessed.
 *   - INCUMBENCY was cross-checked against two independent official sources,
 *     never guessed from the portal's own signals or this app's FEC-derived
 *     `candidates` table: (1) house.gov's "By State and District" member
 *     directory (fetched via `curl`, a single large alphabetical-by-surname
 *     page) for the House side; (2) senate.gov's senator directory for the
 *     Senate side, further corroborated by direct reporting confirming
 *     Ashley Moody's Jan 21, 2025 appointment to Rubio's vacated seat and her
 *     2026 special-election candidacy to complete his term (through 2029).
 *   - The US Senate race is a SPECIAL ELECTION, not a regular-cycle race:
 *     Rubio's seat (Class III, term through 2029) became vacant when he
 *     resigned to become U.S. Secretary of State in January 2025; Gov.
 *     DeSantis appointed then-Attorney General Ashley Moody to fill the
 *     vacancy, and the winner of this Nov 3, 2026 special election (same
 *     Aug 18 primary / Nov 3 general dates as the regular House cycle) will
 *     serve the remainder of Rubio's term. Moody is a genuine sitting
 *     incumbent (confirmed via senate.gov + reporting), running in a
 *     contested Republican primary (Gleason, Perry, Rivera also filed)
 *     alongside a contested Democratic primary (Nixon, Vindman) and an NPA
 *     filer (Gillespie, who — like all NPA candidates on this ballot —
 *     qualifies straight to the general with no party primary).
 *
 * Sources:
 *   - https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USR
 *     (Florida Division of Elections Candidate Tracking System — all 28 US
 *     House candidates for the 2026 general election cycle, retrieved via
 *     direct HTTP fetch 2026-07-15)
 *   - https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USS
 *     (same system — all 7 US Senate special-election candidates, retrieved
 *     2026-07-15)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check, retrieved 2026-07-15)
 *   - https://www.senate.gov/senators/index.htm (senator directory,
 *     incumbency cross-check, retrieved 2026-07-15)
 *   - https://dos.fl.gov/elections/candidates-committees/political-parties/
 *     (official party-code legend — confirms LPF/FFP meanings)
 *   - https://dos.fl.gov/elections/for-voters/special-elections/ (confirms
 *     no separate CD20 special election was called)
 *   - https://files.floridados.gov/media/708841/2025-2026-election-dates-activities-calendar-binder1-20250204-pm.pdf
 *     (official election-dates calendar)
 *
 * Coverage: all 28 US House districts + the 2026 US Senate special election.
 * Contested-primary candidates are `qualified_for_primary_ballot`;
 * uncontested/`Unopposed` filers (sole candidate for their party, or an NPA/
 * minor-party filer who bypasses the primary system entirely) are
 * `qualified_for_general_ballot`; write-ins are `write_in_qualified`. No
 * `runoff_pending` rows — Florida abolished the congressional second
 * primary; nominees are decided by plurality on Aug 18.
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the qualified-candidate list as of 2026-07-15.
 *     Aug 18, 2026 primary results are NOT yet reflected — every contested
 *     race's `qualified_for_primary_ballot` rows remain undetermined until
 *     certification; see the dated re-check card opened alongside this
 *     build.
 *   - A qualified candidate can still withdraw before the primary; this
 *     fixture does not capture any withdrawal occurring after 2026-07-15.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const FL_STATE = "FL";
export const FL_ELECTION_YEAR = 2026;
// Florida's Aug 18, 2026 primary is still in the future at transcription
// time (2026-07-15) — most contested seats have undetermined nominees. See
// docblock for the CD10 (Frost) and CD20 (two sitting members) exceptions.
export const FL_STAGE = "primary" as const;
export const FL_HOUSE_SOURCE_URLS = [
  "https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USR",
];
export const FL_SENATE_SOURCE_URLS = [
  "https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USS",
];
export const FL_RETRIEVED_AT = "2026-07-15";

export const FL_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Jimmy Patronis (REP, incumbent)
  {
    district: "01",
    name: "Douglas Chico",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Tyler L. Davis",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "John Frankman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jimmy Patronis",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Gay Valimont",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — open seat / no incumbent in this contest
  {
    district: "02",
    name: "Yen Bailey",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Brice Barnes",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Amanda Marie Green",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Keith Gross",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Lee Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Nick Lewis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Luke Murphy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Jim Norton",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Evan Power",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Austin Rogers",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Audie Rowell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Nicholas Zateslo",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 03 — Kat Cammack (REP, incumbent)
  {
    district: "03",
    name: "Troy Albers",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Kat Cammack",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Seth Harp",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "George Hubac",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Mike Klein",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Tom Wells",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 04 — Aaron Bean (REP, incumbent)
  {
    district: "04",
    name: "Aaron Bean",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "LaShonda \"L.J.\" Holloway",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Michael Kirwan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Brit Robinson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Todd Schaefer",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Mike Sell",
    party: "FFP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 05 — John H. Rutherford (REP, incumbent)
  {
    district: "05",
    name: "Rachel Grage",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Alex Hazen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Mark Heggestad",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Mark Kaye",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "John H. Rutherford",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "William Lintag Upham",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 06 — Randy Fine (REP, incumbent)
  {
    district: "06",
    name: "Manuel P. Asensio",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Aaron Baker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Dan Bilzerian",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Robert David Cooper II",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Randy Fine",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Charles Gambaro",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Michael Gist",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Steve Morgan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Ronnie \"Ron\" Murchinson-Rivera",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Andrew Parrott",
    party: "LPF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Alec Pavlik",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "06",
    name: "Eric Yonce",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 07 — Cory Lee Mills (REP, incumbent)
  {
    district: "07",
    name: "Bale Dalton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Christopher Dennison",
    party: "LPF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Ryan Elijah",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Alan Grayson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Michael Don Johnson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Marialana Kinter",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Cory Lee Mills",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Sarah Ulrich",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 08 — Mike Haridopolos (REP, incumbent)
  {
    district: "08",
    name: "Mike Haridopolos",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Jennifer Jenkins",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 09 — Darren Soto (DEM, incumbent)
  {
    district: "09",
    name: "Ben Butler",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Marcus Carter",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Thomas E. Chalifoux Jr.",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Dan Green",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Jorge Martinez",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Steve Rance",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Darren Soto",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Justin Story",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 10 — Maxwell Alejandro Frost (DEM, incumbent)
  {
    district: "10",
    name: "Maxwell Alejandro Frost",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 11 — open seat / no incumbent in this contest
  {
    district: "11",
    name: "Carey Baker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Ralph Groves",
    party: "LPF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Ivette Palomo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "James Pericola",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Nizam Razack",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Joe Strada",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Royal Webster",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Tim Wilkins",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Dan Williams",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 12 — Gus Michael Bilirakis (REP, incumbent)
  {
    district: "12",
    name: "Gus Michael Bilirakis",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Darren McAuley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "Kimberly Overman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "Branden Scrivener",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 13 — Anna Paulina Luna (REP, incumbent)
  {
    district: "13",
    name: "Tony D'Arrigo",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Leela Gray",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "John William Liccione",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "Anna Paulina Luna",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Brandt Robinson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 14 — Kathy Castor (DEM, incumbent)
  {
    district: "14",
    name: "Mike Beltran",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Kathy Castor",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Salomon Hernandez Sr.",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "14",
    name: "Brian Lambert",
    party: "LPF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Michael Marcel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "John Peters",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Robert \"Rocky\" Rochford",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Gavriel E. Soriano",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Kevin M. Steele",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Ergin \"Batman\" Tek",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Bea Valenti",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Keith Varian",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 15 — Laurel Lee (REP, incumbent)
  {
    district: "15",
    name: "Angie Boone",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "15",
    name: "Christopher Irizarry",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "15",
    name: "Laurel Lee",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Robert People",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 16 — open seat / no incumbent in this contest
  {
    district: "16",
    name: "Mark Davis",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Sydney Gruters",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Jon Harris",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Kelly Kirschner",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Tamika Lyles",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Glenn Pearson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Ed Pope",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Jan Schneider",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Eddie Speir",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 17 — Greg Steube (REP, incumbent)
  {
    district: "17",
    name: "Matthew Montavon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "17",
    name: "Michael J. Quirk",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Allen L. Spence Jr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "17",
    name: "Greg Steube",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 18 — Scott Franklin (REP, incumbent)
  {
    district: "18",
    name: "Scott Franklin",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "18",
    name: "Curtis Gibson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "18",
    name: "Deva Simmons",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 19 — open seat / no incumbent in this contest
  {
    district: "19",
    name: "Victor Arias",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Greg \"Tex\" Bukowski",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Madison Cawthorn",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Chris Collins",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Seth Haskin",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "19",
    name: "Ola Hawatmeh",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Catalina Lauf",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Robert M. Neeld",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Jim Oberweis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Mike Pedersen",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Howard Sapp",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Linda J. Sawyer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Jim Schwartzel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "John Strand",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Alexandra Zakhvatayev",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 20 — Debbie Wasserman Schultz (DEM, incumbent)
  {
    district: "20",
    name: "Brent Andersen",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Luther \"UncleLuke\" Campbell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Sheila Cherfilus-McCormick",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Dale V.C. Holness",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Lateresa \"LA\" Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Rod Joseph",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Elijah Manley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Kedner Maxime",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "20",
    name: "Carla Spalding",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Debbie Wasserman Schultz",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 21 — Brian Mast (REP, incumbent)
  {
    district: "21",
    name: "Alexander Cooke",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "21",
    name: "David Fabrikant",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "21",
    name: "James T. Martin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "21",
    name: "Brian Mast",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "21",
    name: "Bernard Taylor",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 22 — open seat / no incumbent in this contest
  {
    district: "22",
    name: "Casey Askar",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "David Burck",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Michael Carbonara",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Pia Dandiya",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Kaysia Earley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Richard Evans",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Terri Hasdorff",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Belinda Keiser",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Michael Thompson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 23 — Lois Frankel (DEM, incumbent)
  {
    district: "23",
    name: "Deborah Adeimy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Paola Branda",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Victoria Doyle",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Lois Frankel",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Mark Piper",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 24 — open seat / no incumbent in this contest
  {
    district: "24",
    name: "Te Mayonna Brown",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "24",
    name: "Andy Daro",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "24",
    name: "Marshall L. Davis Sr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Oliver G. Gilbert III",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Patricia Gonzalez",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "24",
    name: "Shevrin \"Shev\" Jones",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Kendrick Meek",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Rudolph Moise",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Jean Monestime",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Roderick Vereen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 25 — Jared Moskowitz (DEM, incumbent)
  {
    district: "25",
    name: "Dan Franzese",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Michaelangelo Hamilton",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "25",
    name: "Raven Harrison",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Peter Jassenoff",
    party: "LPF",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "25",
    name: "Joseph \"Joe\" Kaufman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Oliver Adams Larkin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "George R. Moraitis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Jared Moskowitz",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Scott Singer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 26 — Mario Diaz-Balart (REP, incumbent)
  {
    district: "26",
    name: "Mario Diaz-Balart",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "26",
    name: "Nicole Locklin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "26",
    name: "Deborah Ann Meidinger Hosey",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 27 — Maria Elvira Salazar (REP, incumbent)
  {
    district: "27",
    name: "V. Michael Arias",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "27",
    name: "Robin Peguero",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "27",
    name: "Eliott Rodriguez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "27",
    name: "Maria Elvira Salazar",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 28 — Carlos A. Gimenez (REP, incumbent)
  {
    district: "28",
    name: "Phil \"Felipe\" Ehr",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "28",
    name: "Carlos A. Gimenez",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "28",
    name: "Eddy Rojas",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

];

export const FL_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Neil J. Gillespie",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Chris Gleason",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Ashley Moody",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Angie Nixon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Neelam Taneja Perry",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Ernest \"Ernie\" Rivera",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Alex Vindman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

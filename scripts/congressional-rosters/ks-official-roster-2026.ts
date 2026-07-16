/**
 * scripts/congressional-rosters/ks-official-roster-2026.ts
 *
 * Kansas's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 4 US House districts and the 2026 US
 * Senate race (Roger Marshall's Class 2 seat). Built through the same
 * manual official-source pipeline as Arizona (card 637c2583), Texas (card
 * 8530a468), Oklahoma, Alabama, Alaska, Colorado, Connecticut, California,
 * Arkansas, Delaware, Florida, and Hawaii, epic c5a813bb; this is Kansas's
 * build (card "[P0] Import + verify official roster: Kansas (KS)").
 *
 * KANSAS-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/kansas-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix — Kansas's official candidate list is a legacy ASP.NET
 *     WebForms page at sos.ks.gov (`elections_upcoming_candidate.aspx`),
 *     reached from the candidates hub (candidates.html). The card's I06
 *     rehearsal had flagged that the deeper Candidate List path returned
 *     HTTP 403 on automated (non-browser) fetch; confirmed again this
 *     session — `WebFetch` 403s, but a live `mcp__claude-in-chrome__*`
 *     browser session loads the page normally. The 403 is a bot-detection
 *     wall on the automated-fetch path, not evidence the page is broken or
 *     stale.
 *   - The page renders one native `<select>` ("Choose an election:") with
 *     every election back to 2002; picking a value and clicking Submit
 *     POSTs back the corresponding candidate table (ASP.NET WebForms
 *     postback, not a bookmarkable query string — appending `?election=36`
 *     to the URL does NOT work, confirmed by trying it). A genuine
 *     mechanical gotcha for future browser-automation sessions: on this
 *     macOS Chrome build, arrow keys (`Up`/`Down`) sent to the closed
 *     `<select>` did NOT change its value, and single-character
 *     typeahead only advances one option per keypress (unreliable to
 *     count through 28 options). The reliable path was
 *     `mcp__claude-in-chrome__form_input` — set the select's value
 *     directly by its option value ("35" = 2026 Primary, "36" = 2026
 *     General, confirmed via `read_page`'s option list) — then click
 *     Submit.
 *   - KANSAS DOES NOT CANCEL AN UNCONTESTED PRIMARY: unlike the 14 states
 *     that omit an unopposed candidate's name and skip straight to
 *     treating them as nominated (Florida among them — see FL's CD10/Frost
 *     case), Kansas requires every Democratic/Republican filer to appear
 *     on and go through the August 4, 2026 primary regardless of
 *     opposition — confirmed via K.S.A. 25-306a/25-306b (both statutes
 *     assume every nominee is printed on and decided by an actual primary
 *     ballot, with no unopposed-cancellation provision), corroborated by
 *     Ballotpedia's "Primary election cancellations" comparison (Kansas is
 *     NOT among the 14 listed states) and by Ballotpedia's "Primary
 *     elections in Kansas" page ("the winner of a primary election is the
 *     candidate who receives the greatest number of votes cast for that
 *     office"). Concretely: KS-2's sole Democratic filer, Don Coover, is
 *     recorded here as `qualified_for_primary_ballot`, NOT
 *     `qualified_for_general_ballot` — his nomination is not yet official
 *     until the primary is held and canvassed, even though he faces no
 *     opponent.
 *   - KANSAS HAS NO PRIMARY RUNOFF: the official 2026 election calendar
 *     (sos.ks.gov/elections/important-election-dates.html) goes directly
 *     from the August 4 primary to the September 1 State Board of
 *     Canvassers certification to the November 3 general — no runoff date
 *     of any kind. Every contested Democratic/Republican primary race
 *     below therefore uses `qualified_for_primary_ballot` (mirrors
 *     Florida's convention for its own no-runoff, still-pending primary),
 *     not `runoff_pending` — `runoff_pending` is reserved for a race
 *     that's down to two known finalists awaiting an actual runoff vote
 *     (Oklahoma's original use) or a still-pending SPECIAL primary
 *     (Alabama's stretched reuse); Kansas's is a still-pending REGULAR
 *     first-round primary with no runoff mechanism at all, so
 *     `qualified_for_primary_ballot` is the accurate fit, not a reuse.
 *   - LIBERTARIAN CANDIDATES BYPASS THE PRIMARY ENTIRELY: per the
 *     candidates.html hub's own text, "Candidates of other recognized
 *     Kansas political parties (currently Libertarian and United Kansas)
 *     do not run in the primary and are nominated for the general
 *     election by party caucus or convention" — confirmed structurally:
 *     every Libertarian federal filer appears ONLY in the "2026 General"
 *     candidate list (not the "2026 Primary" list at all), so their
 *     nomination is already final. Recorded here as
 *     `qualified_for_general_ballot`. One Libertarian filed for Senate
 *     (David C Graham) and one for each of the 4 House districts (Steven
 *     Jacob D1, John Hauer D2, Steven A Hohe D3, Drew Cranmer D4). No
 *     United Kansas party federal filer was found (that party's sole 2026
 *     General filer, Scott E. Morgan, ran for Secretary of State, a state
 *     office — confirmed absent from the federal rows, not merely
 *     unresearched).
 *   - INDEPENDENT CANDIDATES: NONE found in either candidate list as of
 *     this build's retrieval date (2026-07-15) — but per K.S.A. 25-303,
 *     Kansas's independent-nomination-petition deadline is noon the day
 *     before the primary (August 3, 2026), a full two months after the
 *     June 1 party-candidate filing deadline. **This roster's independent-
 *     candidate coverage is NOT yet closed/final** — a future filer could
 *     still appear between this build's retrieval date and August 3,
 *     2026. See the dated re-check card opened alongside this build (must
 *     re-pull the candidate list after August 3 to catch any late
 *     independent filer, in addition to the already-required post-primary
 *     and post-canvass re-checks).
 *   - INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from this app's FEC-derived `candidates`
 *     table: (1) house.gov's "By State and District" member directory
 *     (Kansas section, fetched 2026-07-15) confirms the sitting delegation
 *     is Mann (KS-1, R), Schmidt (KS-2, R), Davids (KS-3, D), Estes (KS-4,
 *     R) — matches this fixture's `isIncumbent` rows exactly, no
 *     correction needed; (2) senate.gov's senator-contact directory
 *     confirms Roger Marshall (R-KS) as the sitting senator running for
 *     re-election.
 *   - No write-in candidates appear in either candidate list (Kansas
 *     write-in filing is a distinct, separately-tracked process not
 *     covered by this page — out of scope, matching prior states'
 *     treatment of write-ins as not printed on the ballot).
 *
 * Sources:
 *   - https://sos.ks.gov/elections/candidates.html (candidates hub —
 *     confirms the non-primary nomination path for Libertarian/United
 *     Kansas and the independent-petition requirement)
 *   - https://sos.ks.gov/elections/elections_upcoming_candidate.aspx
 *     (Candidate Lists page — "Choose an election:" dropdown selected to
 *     "2026 Primary" [value 35] for the Democratic/Republican primary
 *     filers, and to "2026 General" [value 36] for the Libertarian/United
 *     Kansas general filers; both retrieved live via browser session,
 *     2026-07-15)
 *   - https://sos.ks.gov/elections/important-election-dates.html (official
 *     2026 election calendar — filing deadline, primary date, canvass
 *     dates)
 *   - https://ksrevisor.gov/statutes/chapters/ch25/025_003_0006a.html
 *     (K.S.A. 25-306a — pre-primary withdrawal deadline, same as the
 *     candidate-filing deadline)
 *   - https://ksrevisor.gov/statutes/chapters/ch25/025_003_0006b.html
 *     (K.S.A. 25-306b — post-primary nominee withdrawal: permitted only
 *     for severe medical hardship or non-Kansas residency, and only if
 *     received by the Secretary of State on or before September 1, 2026)
 *   - https://ksrevisor.gov/statutes/chapters/ch25/025_003_0003.html
 *     (K.S.A. 25-303 — independent nomination petitions; noon the day
 *     before the primary, i.e. August 3, 2026, for 2026)
 *   - https://www.house.gov/representatives (119th Congress Kansas
 *     delegation, "By State and District" — incumbency cross-check only)
 *   - https://www.senate.gov/senators/senators-contact.htm (incumbency
 *     cross-check only)
 *
 * Coverage: all 4 US House districts + the US Senate race.
 * Contested-primary Democratic/Republican filers are
 * `qualified_for_primary_ballot` (nomination undetermined until the August
 * 4, 2026 primary is canvassed); Libertarian filers, which bypass the
 * primary entirely, are `qualified_for_general_ballot`. No `runoff_pending`
 * rows — Kansas has no primary runoff.
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the qualified-candidate list as of 2026-07-15.
 *     The August 4, 2026 primary's outcome is NOT yet reflected — every
 *     `qualified_for_primary_ballot` row remains undetermined until the
 *     State Board of Canvassers certifies results (by September 1, 2026 at
 *     the latest); see the dated re-check card opened alongside this
 *     build.
 *   - Independent-candidate coverage is provisional, not closed — Kansas's
 *     independent-petition deadline (noon, August 3, 2026) is still in the
 *     future as of this retrieval; see the dedicated note above and the
 *     dated re-check card.
 *   - A qualified primary candidate can still be withdrawn before the
 *     primary under K.S.A. 25-306a's deadline (same as the filing
 *     deadline, already passed as of this build) or a nominee after the
 *     primary under 25-306b's narrow medical-hardship/non-residency
 *     exception (through September 1, 2026); this fixture does not
 *     capture any withdrawal occurring after 2026-07-15.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const KS_STATE = "KS";
export const KS_ELECTION_YEAR = 2026;
// Kansas's Aug 4, 2026 primary is still in the future at transcription time
// (2026-07-15) — every contested Democratic/Republican primary race has an
// undetermined nominee. See docblock for the Libertarian (bypasses primary)
// and independent-petition-still-open exceptions.
export const KS_STAGE = "primary" as const;
export const KS_HOUSE_SOURCE_URLS = [
  "https://sos.ks.gov/elections/elections_upcoming_candidate.aspx",
];
export const KS_SENATE_SOURCE_URLS = [
  "https://sos.ks.gov/elections/elections_upcoming_candidate.aspx",
];
export const KS_RETRIEVED_AT = "2026-07-15";

export const KS_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — incumbent Tracey Mann (R) seeking re-election, contested
  // Republican primary against Craig Musser; contested Democratic primary
  // between Colin McRoberts and Lauren Reinhold. Steven Jacob (Libertarian)
  // bypasses the primary, already the general-ballot nominee.
  {
    district: "01",
    name: "Colin McRoberts",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Lauren Reinhold",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Tracey Mann",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Craig Musser",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Steven Jacob",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — incumbent Derek Schmidt (R) seeking re-election,
  // contested Republican primary against Chad E Young. Don Coover is the
  // SOLE Democratic filer, but Kansas does not cancel an uncontested
  // primary (see docblock) — still qualified_for_primary_ballot, not yet
  // the determined nominee. John Hauer (Libertarian) bypasses the primary.
  {
    district: "02",
    name: "Don Coover",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Derek Schmidt",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Chad E Young",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "John Hauer",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — incumbent Sharice L. Davids (D) seeking re-election,
  // contested Democratic primary against Sarah Preu; contested Republican
  // primary between Eric Jenkins and Chase LaPorte. Steven A Hohe
  // (Libertarian) bypasses the primary.
  {
    district: "03",
    name: "Sharice L. Davids",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Sarah Preu",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Eric Jenkins",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Chase LaPorte",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Steven A Hohe",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — incumbent Ron Estes (R) seeking re-election, contested
  // Republican primary against Frank A. McCollum; contested 4-way
  // Democratic primary (Carmichael, Epley, Gilbert, Tyndell). Drew Cranmer
  // (Libertarian) bypasses the primary.
  {
    district: "04",
    name: "Chris Carmichael",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Cole Epley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Ryan Gilbert",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Katy Tyndell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Ron Estes",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Frank A. McCollum",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Drew Cranmer",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const KS_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Incumbent Roger Marshall (R, Class 2 seat) seeking re-election,
  // contested Republican primary against Pond Naramore. Contested 11-way
  // Democratic primary. David C Graham (Libertarian) bypasses the primary.
  {
    district: null,
    name: "Damon Anderson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Christy Davis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Adam Hamilton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Jason Hart",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Kevin Latz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Erik Murray",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Sandy Spidel Neumann",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Anne Parelkar",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Patrick C. Schmidt",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: 'Michael "Mike" Soetaert',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Noah Taylor",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Roger Marshall",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Pond Naramore",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "David C Graham",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

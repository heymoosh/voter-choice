/**
 * scripts/congressional-rosters/tn-official-roster-2026.ts
 *
 * Tennessee's 2026 official congressional roster for the August 6, 2026
 * PRIMARY (this is a pre-primary build, like Arizona's — the primary was
 * still upcoming at transcription time, 2026-07-16) — covers all 9 US House
 * districts and the US Senate race. Built through the same manual
 * official-source pipeline as AZ/TX/OK/AL (epic c5a813bb); this is
 * Tennessee's build (card carrying the "[P0] Import + verify official
 * roster: Tennessee (TN)" title).
 *
 * TENNESSEE-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/tennessee-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Tennessee's official candidate source is its own Secretary of State
 *     site (sos.tn.gov / sos-prod.tnsosgovfiles.com) — NOT Civix-vended;
 *     the Civix portal playbook in the nationwide roster plan doc does not
 *     apply here.
 *   - sos.tn.gov itself 403s a plain fetch (WAF, not an access-control
 *     wall); the candidate-list PDFs live on a separate asset host
 *     (sos-prod.tnsosgovfiles.com) which returns the file to a normal
 *     request as long as a realistic browser User-Agent header is sent —
 *     no actual JS-rendering/browser-automation was required once that was
 *     found, just curl with `-A "Mozilla/5.0 ..."`. Both PDFs are native
 *     text (confirmed via pdfinfo/pdftotext page-by-page — every page
 *     returned >2000 chars, no scanned/blank pages).
 *   - REDISTRICTING: Tennessee's General Assembly adopted revised
 *     congressional district boundaries in a Second Extraordinary Session
 *     in May 2026, opening a SPECIAL congressional-only re-qualifying
 *     period (candidates could change districts or file fresh) that ran
 *     through noon on Friday, May 15, 2026 — with the withdrawal deadline
 *     set to the SAME day/time, so the House candidate list was final
 *     immediately as of May 15 (confirmed via the SoS's own press
 *     release, "Notice of Revised Congressional Districts and Special
 *     Qualifying Period," and its May 15 follow-up press release).
 *     Political parties then had until noon Sunday, May 17, 2026 to make
 *     bona fide determinations; the published USHouseCandidates_2026.pdf
 *     (file mod-date 2026-05-29) postdates that, so it already reflects
 *     the fully bona-fide-checked list — no separate pending-determination
 *     risk remains. District NUMBERING was preserved across the redraw
 *     (only boundaries changed) — confirmed by matching each sitting
 *     incumbent's surname to the SAME district number in both the new
 *     candidate list and house.gov's current (pre-redraw) directory.
 *   - The US Senate list is a separate, non-redistricting-affected filing
 *     covered by Tennessee's regular August-primary qualifying calendar
 *     (deadline March 10, 2026 noon; general withdrawal deadline March 17,
 *     2026 noon — both already passed, no redistricting wrinkle for
 *     Senate).
 *   - STAGE: `TN_STAGE = "primary"` — Tennessee's August 6, 2026 primary
 *     determines each party's nominee; it was still in the future as of
 *     this fixture's retrieval date (2026-07-16). Every Republican and
 *     Democratic filer below is recorded `qualified_for_primary_ballot`,
 *     never `qualified_for_general_ballot` — no nomination is guessed.
 *   - INDEPENDENT (no-party) CANDIDATES: Tennessee independents do not
 *     appear on the primary ballot at all — TN Code Ann. § 2-5-101 requires
 *     an independent candidate for an office that has a primary to file
 *     their nominating petition (25+ registered-voter signatures) by the
 *     SAME deadline as party primary candidates, but that petition
 *     qualifies them directly for the NOVEMBER GENERAL ballot, not for any
 *     primary contest — Tennessee holds no primary round for independents.
 *     The official candidate list's own disclaimer states it excludes
 *     anyone who "did not have enough signatures," confirming every listed
 *     independent's petition was already signature-verified as of
 *     publication (2026-05-29 for House, list dated with a 3/10/2026
 *     "Filed"/"Signatures Approved? Yes" column for Senate) — unlike CO's
 *     or OK's fixtures, where independent/petition status was still
 *     unconfirmed or pending at build time (recorded there as the more
 *     conservative `declared_general_ballot_intent`). Tennessee's
 *     independents are therefore recorded as `qualified_for_general_ballot`
 *     — their qualification IS their final November ballot status, already
 *     confirmed, with no primary stage to pass through.
 *   - No statutory congressional primary runoff exists in Tennessee (a
 *     plurality winner takes each party's nomination outright) — no
 *     `runoff_pending` rows in this fixture.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the candidate-list PDF or this app's own FEC-derived
 *     `candidates` table:
 *     (1) house.gov's "By State and District" directory (Tennessee
 *     section) confirms the sitting delegation: Harshbarger (1st),
 *     Burchett (2nd), Fleischmann (3rd), DesJarlais (4th), Ogles (5th),
 *     Rose (6th), Van Epps (7th), Kustoff (8th), Cohen (9th) — all
 *     Republican except Cohen (D).
 *     (2) Independent news reporting (Nashville Banner, NewsChannel5's
 *     2026 district-by-district candidate guide) confirms: Rep. John Rose
 *     (6th) is NOT seeking re-election — running for Governor instead, so
 *     TN-6 is an open seat (matches: no incumbent surname appears among
 *     the TN-6 filers). Rep. Steve Cohen (9th) has DECIDED NOT TO RUN for
 *     re-election, leaving TN-9 an open seat (matches: Cohen is absent
 *     from the TN-9 filer list, confirmed missing, not omitted by
 *     transcription). Rep. Mark Green (7th) resigned July 20, 2025; a
 *     December 2, 2025 special election (Rollcall, Nashville Banner,
 *     Ballotpedia News) elected Matt Van Epps, sworn in December 4, 2025 —
 *     Van Epps is the sitting TN-7 incumbent seeking a full term, filing
 *     unopposed in his own primary.
 *   - senate.gov's Tennessee state page (senate.gov/states/TN/intro.htm)
 *     confirms Bill Hagerty (R) is a sitting Tennessee senator — the seat
 *     up in 2026 (Sen. Marsha Blackburn's seat is not up until 2031) —
 *     and Hagerty is the first (Republican) filer on the official Senate
 *     candidate list, seeking re-election.
 *
 * Sources:
 *   - https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USHouseCandidates_2026.pdf
 *     (TN Secretary of State's official candidate list, US House, all 9
 *     redrawn districts, published 2026-05-29 — post-redistricting,
 *     post-bona-fide-determination)
 *   - https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USSenate_2026.pdf
 *     (TN Secretary of State's official candidate list, US Senate,
 *     qualifying deadline 2026-03-10)
 *   - https://sos.tn.gov/elections/2026-candidate-lists (landing page
 *     linking both lists, PDF + Excel)
 *   - https://sos.tn.gov/announcements/2026-congressional-redistricting
 *     (redistricting notice)
 *   - https://sos.tn.gov/newsroom/press-releases/notice-of-revised-congressional-districts-and-special-qualifying-period
 *     and https://sos.tn.gov/newsroom/press-releases/secretary-of-states-office-announces-list-of-congressional-candidates-as-of
 *     (special congressional qualifying/withdrawal period notices)
 *   - https://www.house.gov/representatives ("By State and District",
 *     Tennessee section — incumbency cross-check only, not a candidate
 *     source)
 *   - https://www.senate.gov/states/TN/intro.htm (Tennessee's current
 *     senators — incumbency cross-check only)
 *
 * Coverage: all 9 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Every Republican/Democratic nomination is undetermined pending the
 *     August 6, 2026 primary — this fixture will need a follow-up update
 *     once that primary is certified (see the dated re-check card).
 *   - Independent candidates are recorded `qualified_for_general_ballot`
 *     per the reasoning above (TN's own list already reflects verified
 *     signatures); if a future re-check finds this assumption wrong for
 *     any filer, correct it there.
 *   - Names/cities are recorded as they appear in the official PDFs; not
 *     independently re-verified against a third document beyond the
 *     incumbency cross-checks above.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const TN_STATE = "TN";
export const TN_ELECTION_YEAR = 2026;
export const TN_STAGE = "primary" as const;
export const TN_HOUSE_SOURCE_URLS = [
  "https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USHouseCandidates_2026.pdf",
];
export const TN_SENATE_SOURCE_URLS = [
  "https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USSenate_2026.pdf",
];
export const TN_RETRIEVED_AT = "2026-07-16";

// TN-6 (Rose running for Governor instead) and TN-9 (Cohen not running) are
// open seats — no incumbent filed for re-election in either district.
export const TN_OPEN_SEAT_DISTRICTS = ["06", "09"];

export const TN_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Harshbarger (incumbent) seeking re-election.
  {
    district: "01",
    name: "Diana Harshbarger",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Kristi Burke",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Hernan H. Garcia",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "David S. Kerr, Jr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Joshua Ray Ashburn",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Richard G. Baker",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Chris Campbell",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Billy Cody",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Tyler Brice Mitchell McClain",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Burchett (incumbent) seeking re-election.
  {
    district: "02",
    name: "Tim Burchett",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Michaela Barnett",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Bruce Fine",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Adam Heimerman",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — Fleischmann (incumbent) seeking re-election.
  {
    district: "03",
    name: "Chuck Fleischmann",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Anna Golladay",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Bryan Martin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Dean Arnold",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Jean Howard-Hill",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Rodney Joe King",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Donnie Lynn Ownby",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Edward John Roland",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — DesJarlais (incumbent) seeking re-election; faces 3
  // Republican primary challengers.
  {
    district: "04",
    name: "Thomas E. Davis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Scott DesJarlais",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Joshua James",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Harold \"Rocky\" Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Victoria Broderick",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Mike Cortese",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Cliff Huffman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Tim Lanier",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Joyce E. Neal",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jacob Kristopher Anders",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Clay Faircloth",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 — Ogles (incumbent) seeking re-election; faces 1
  // Republican primary challenger.
  {
    district: "05",
    name: "Charlie Hatcher",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Andy Ogles",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Yolanda Cooper-Sutton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "DeVante R. Hill",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Rachel Hurley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Carrie Ann Iacomini",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Chaz Molder",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "James A. Johnson",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Micheál (Me-Haul) O’Leary",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 — OPEN SEAT: incumbent Rose is running for Governor
  // instead; no incumbent among these filers.
  {
    district: "06",
    name: "Natisha Brooks",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Johnny Garrett",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Jon Henry",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Van Hilleary",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Lore Bergman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Mike Croley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Christopher Martin Finley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Miriam Leibowitz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Chaney Mosley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Christopher B. Monday",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Angus Purdy",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — Van Epps (incumbent, won the Dec. 2, 2025 special
  // election succeeding Mark Green) seeking a full term, unopposed in his
  // own primary.
  {
    district: "07",
    name: "Matt Van Epps",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Darden Copeland",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Vincent Dixie",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Saletta Holloway",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Joshua Warren Sales",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Andrew J. Koontz",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Lowell Reynolds",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 08 — Kustoff (incumbent) seeking re-election.
  {
    district: "08",
    name: "David Kustoff",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Dewey Gordon Bryan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Jordan D. Hinders",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Heidi Kuhn",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Leonard Perkins",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Adam D. Austill",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Wendell \"Wells\" Blankenship",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Antonio Futch",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Pamela Jeanine \"P.\" Moses",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Horace Taylor",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Henry J. Ward, III",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 09 — OPEN SEAT: incumbent Cohen decided not to seek
  // re-election; no incumbent among these filers (confirmed absent, not
  // omitted).
  {
    district: "09",
    name: "Charlotte Bergmann",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Brent Taylor",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Jeremy Thompson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Todd Warner",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "M. LaTroy A-Williams",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "London Lamar",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Justin J. Pearson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Jim Torino",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Dennis Clark",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Michelle Davis Head",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const TN_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Hagerty (incumbent) seeking re-election.
  {
    district: null,
    name: "Bill Hagerty",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Marquita Bradshaw",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Maria Brewer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Kevin Lee McCants",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Civil Miller-Watkins",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Diana Onyejiaka",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Tharon Chandler",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Andrew Gerena",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Jeremy Dean Hearn",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Robert Jones",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "James William Macon III",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Yoshi D. Matthews",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "David Sutman, Jr.",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Catherine Barcel \"Barcy\" Whitson",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

/**
 * scripts/congressional-rosters/ky-official-roster-2026.ts
 *
 * Kentucky's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 6 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), and
 * Alabama (epic c5a813bb); this is Kentucky's build.
 *
 * KENTUCKY-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/kentucky-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Kentucky's official candidate source, https://web.sos.ky.gov/CandidateFilings/,
 *     is NOT Civix-vended (web.sos.ky.gov, not *.civixapps.com) - the I06
 *     rehearsal's "rendered_portal" flag turned out to describe a plain
 *     server-rendered ASP.NET page, not a JS SPA: no browser automation was
 *     needed, every office/district link is a real, directly-navigable
 *     `Default.aspx?id=N` / `Default.aspx?office=N&district=N` URL, and the
 *     full candidate table for an office renders in one page load (unlike
 *     TX's Civix portal or OK's derivation-from-results-portal pattern).
 *   - CRITICAL: this portal's "Election" selector offers exactly ONE
 *     election, "2026 General Election" (id=87) - there is no separate
 *     "2026 Primary Election" entry to derive a nominee from. The listed
 *     candidates ARE already the settled post-primary GENERAL-ballot
 *     filers: every contested district shows exactly one Republican and
 *     one Democratic filer (never two of the same party), and this was
 *     independently confirmed for the one district with a real primary
 *     upset (KY-4: sitting Rep. Thomas Massie lost the May 19, 2026
 *     Republican primary to Trump-endorsed Ed Gallrein - the most
 *     expensive US House primary in American history at the time - and
 *     Gallrein, not Massie, is the only Republican filer for KY-4 on this
 *     list). No runoff derivation was needed anywhere - Kentucky has no
 *     runoff primary for federal office (KRS 118.425: plurality wins).
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the filing list or this app's FEC-derived
 *     `candidates` table:
 *     (1) house.gov's "By State and District" directory (Kentucky
 *     section, confirmed 2026-07-15) lists the sitting delegation as
 *     Comer (KY-1), Guthrie (KY-2), McGarvey (KY-3), Massie (KY-4),
 *     Rogers (KY-5), Barr (KY-6).
 *     (2) senate.gov's Kentucky state page confirms the sitting senators
 *     are Mitch McConnell and Rand Paul; McConnell holds the Class II
 *     seat up in 2026 (his 2025 retirement announcement is why he is
 *     absent from every Senate filer below - an OPEN SEAT, not an
 *     incumbent-defends race).
 *   - TWO open seats, for two different reasons - neither guessed, both
 *     independently confirmed:
 *     - KY-4: Massie is NOT absent by choice - he ran for re-election and
 *       LOST his own primary to Ed Gallrein (confirmed via web search
 *       cross-referencing NBC News/Ballotpedia primary-night coverage,
 *       2026-07-15). Gallrein is recorded as a non-incumbent nominee.
 *     - KY-6: Barr (sitting KY-6 Representative) filed for US SENATE
 *       instead of re-election to his House seat - confirmed absent from
 *       every KY-6 filer, confirmed present as a Senate Republican filer.
 *       KY-6's Republican nominee (Ralph Alvarado) is recorded as a
 *       non-incumbent.
 *   - US SENATE is a fully open seat: McConnell (sitting) did not file for
 *     any 2026 office; all four Senate filers (Barr, Booker, Murphy,
 *     Campbell) are recorded as non-incumbent.
 *   - "Kentucky Party" is a real, state-recognized minor party - it
 *     appears in the SoS portal's own official Party Affiliation filter
 *     list alongside Republican/Democratic/Independent/Libertarian/etc.,
 *     distinct from generic IND (added building Kentucky, mirroring the
 *     AIP/AKP/NPP/PF/LPF/FFP precedent for a state's own recognized minor
 *     party). Party code: "KYP".
 *   - INDEPENDENT candidates (party "Independent" on the portal, not a
 *     recognized minor party) file by petition (KRS 118.315: 400
 *     signatures for a US House district). Per KRS 118.315(4), the
 *     Secretary of State's sufficiency examination happens AFTER filing
 *     (candidates are notified of defects within 24 hours) - the source
 *     read this session did not confirm every listed independent's
 *     petition had cleared that examination as of retrieval. Consistent
 *     with the AZ/TX/OK/AL fixtures' conservative posture, independents
 *     here are recorded as "declared_general_ballot_intent" rather than
 *     "qualified_for_general_ballot". "Kentucky Party" and "Libertarian
 *     Party" filers, by contrast, are recognized ballot-qualified
 *     parties (like OK's Libertarian nominee) - their nominees are
 *     recorded as "qualified_for_general_ballot".
 *   - WRITE-IN candidates (Murphy - Senate; Wilson - KY-5; Quigley - KY-6)
 *     filed a declaration of intent to be a write-in candidate (KRS
 *     117.265(2), due by August 24, 2026 - all three filed well before
 *     that deadline). Recorded as "write_in_qualified" with party: null,
 *     matching AZ's existing write-in convention.
 *   - No Green Party, Constitution Party, or other minor-party filer for
 *     any US House or Senate seat this cycle - not omitted, verified
 *     absent from the official filing list (checked by Party Affiliation
 *     filter and by reading every row of both office listings in full).
 *
 * Sources:
 *   - https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=4
 *     (Kentucky Secretary of State's official 2026 General Election
 *     candidate filing list - US Representative, all 6 districts)
 *   - https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=3
 *     (Kentucky Secretary of State's official 2026 General Election
 *     candidate filing list - US Senator)
 *   - https://www.house.gov/representatives (119th Congress Kentucky
 *     delegation, "By State and District" - incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://www.senate.gov/states/KY/intro.htm (Kentucky's current
 *     senators - incumbency cross-check only)
 *   - https://elect.ky.gov/Resources/Documents/2026%20Election%20Calendar%20Final%20Version%2010_6_2025.pdf
 *     (State Board of Elections' official 2026 election calendar - filing
 *     deadlines and certification dates, see the data-check doc)
 *
 * Coverage: all 6 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Independent filers' petition-sufficiency status as of this list's
 *     retrieval is unconfirmed from the official sources read this
 *     session (KRS 118.315(4) examination happens post-filing) - recorded
 *     as "declared_general_ballot_intent" (see above), an open item
 *     flagged for Muxin same as AZ's/TX's/OK's/AL's equivalent gaps.
 *   - Two dates still govern this roster going forward, per the plan
 *     doc's standing calendar-date requirement - see
 *     docs/operations/kentucky-vertical-slice-data-check.md for the full
 *     citations and the dated follow-up cards opened for each:
 *     August 11, 2026 (vacancy-fill petition deadline, KRS 118.375(2))
 *     and August 24, 2026 (write-in declaration deadline + Secretary of
 *     State's final certification to county clerks, KRS 117.265(2) /
 *     KRS 118.215(1)(b)).
 *   - Kentucky has NO fixed statutory candidate-withdrawal deadline date
 *     (unlike Oklahoma's April 7 cutoff) - KRS 118.212 allows withdrawal
 *     at any point up to the election; the only date-bound consequence is
 *     whether the county clerk can post the required polling-place notice
 *     at least 5 days before the election. See the data-check doc.
 *   - Names are recorded as they appear in the official filing list; not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const KY_STATE = "KY";
export const KY_ELECTION_YEAR = 2026;
export const KY_STAGE = "general" as const;
export const KY_HOUSE_SOURCE_URLS = [
  "https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=4",
];
export const KY_SENATE_SOURCE_URLS = [
  "https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=3",
];
export const KY_RETRIEVED_AT = "2026-07-15";

// Two open seats, for two different reasons - see the docblock above.
// KY-4: sitting Rep. Massie lost his own Republican primary to Gallrein.
// KY-6: sitting Rep. Barr filed for US Senate instead of re-election.
export const KY_OPEN_SEAT_DISTRICTS = ["04", "06"];

export const KY_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 - Comer (incumbent) filed for re-election unopposed in the
  // Republican primary; Williams is the Democratic nominee.
  {
    district: "01",
    name: 'John "Drew" Williams',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "James R. Comer",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 - Guthrie (incumbent) is the Republican nominee; Wingfield
  // is the Democratic nominee; Loecken filed as an independent.
  {
    district: "02",
    name: "Megan Wingfield",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "S. Brett Guthrie",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Thomas A. Loecken",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 03 - McGarvey (incumbent) is the Democratic nominee;
  // Rodriguez is the Republican nominee.
  {
    district: "03",
    name: "Morgan McGarvey",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Maria Teresa Rodriguez",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 - OPEN SEAT: sitting Rep. Thomas Massie lost the May 19,
  // 2026 Republican primary to Trump-endorsed Ed Gallrein (confirmed via
  // NBC News/Ballotpedia primary-night coverage) - Massie is not on this
  // roster at all. Strange is the Democratic nominee; Ahmad and Todd filed
  // for recognized minor parties.
  {
    district: "04",
    name: "Melissa Claire Strange",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Ed Gallrein",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Mohammad Wael Ahmad",
    party: "KYP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Jeremy Todd",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 - Rogers (incumbent) is the Republican nominee; Pillersdorf
  // is the Democratic nominee; Wilson filed as a declared write-in;
  // Serrano and Wein both filed as independents.
  {
    district: "05",
    name: "Hal Rogers",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Ned Pillersdorf",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Billy Ray Wilson",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "05",
    name: "Gerardo Serrano",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "05",
    name: "Mikel Wein",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 06 - OPEN SEAT: sitting Rep. Andy Barr filed for US Senate
  // instead of re-election to this seat (see the Senate roster below).
  // Alvarado is the Republican nominee; Dembo is the Democratic nominee;
  // Bowman filed as an independent; Lynch filed for a recognized minor
  // party; Quigley filed as a declared write-in.
  {
    district: "06",
    name: "Ralph Alvarado",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Zach Dembo",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Jay J Bowman",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "06",
    name: "Pete Lynch",
    party: "KYP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Robert Quigley",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
];

export const KY_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: the sitting senator (Mitch McConnell, R) announced in 2025
  // he would not seek re-election and did not file for any 2026 office -
  // no incumbent below. Barr is the sitting KY-6 Representative, not a
  // sitting Senator - recorded as non-incumbent for this contest.
  {
    district: null,
    name: "Andy Barr",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Charles Booker",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Thomas Michael Murphy",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: null,
    name: "Christopher Campbell",
    party: "KYP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

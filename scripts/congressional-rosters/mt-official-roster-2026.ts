/**
 * scripts/congressional-rosters/mt-official-roster-2026.ts
 *
 * Montana's 2026 official congressional roster for the November 3, 2026
 * general election - covers both US House districts (01 "Western District",
 * 02 "Eastern District") and the US Senate race. Built through the same
 * manual official-source pipeline as Arizona (card 637c2583), Texas (card
 * 8530a468), Oklahoma (card d9b1ef86), and the rest of epic c5a813bb; this
 * is Montana's build ("[P0] Import + verify official roster: Montana (MT)").
 *
 * MONTANA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/montana-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Montana's official source is NOT Civix-vended (sosmt.gov /
 *     candidatefiling.mt.gov / electionresults.mt.gov, not *.civixapps.com)
 *     - the Civix portal playbook in the nationwide roster plan doc does not
 *     apply here.
 *   - `sosmt.gov` itself 403s on a plain fetch (needs a real browser
 *     session/referer, same symptom as several prior states), but TWO other
 *     official mt.gov subdomains that sosmt.gov links out to do NOT 403 and
 *     rendered cleanly as plain server-rendered HTML on a single page load,
 *     with no JS SPA / virtualized scroll / per-district filter form:
 *       - `candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928`
 *         - the Secretary of State's live "FEDERAL PRIMARY 2026 Candidate
 *         List" - every filer for every federal office, grouped by
 *         office/party, each carrying an explicit status
 *         (NOMINATED / FILED / Withdrawn / PENDING PETITION). This is a
 *         materially better source than a static filing-period PDF because
 *         it already reflects post-primary status, not just who filed in
 *         February.
 *       - `electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY` - the
 *         Secretary of State's official June 2, 2026 primary results, full
 *         statewide vote totals per candidate per race, one page load.
 *   - Montana's primary already happened (June 2, 2026) by the time this was
 *     built (mid-July), so nominees were read directly from the candidate
 *     filing system's own "NOMINATED" status field, cross-checked against
 *     the results portal's raw vote totals (both sources agree on every
 *     nominee - see the data-check doc for the full candidate-by-candidate
 *     comparison).
 *   - MONTANA HAS NO PRIMARY RUNOFF MECHANISM (confirmed via
 *     src/data/states/MT.json's `runoffRules.hasRunoff: false`, and every
 *     contested primary below resolved with a clear NOMINATED status - no
 *     race was closer than a clean plurality). Every nomination in this
 *     fixture is fully determined; no `runoff_pending` rows are needed.
 *   - TWO OPEN SEATS, both confirmed via a real, non-obvious incumbency
 *     finding, never guessed: sitting Senator Steve Daines (Class II seat,
 *     elected 2014, re-elected 2020) withdrew from the Republican primary
 *     minutes before the March 4, 2026 filing deadline and endorsed Kurt
 *     Alme, who filed the same day and later won the Republican primary
 *     outright (76.1%) - Daines does not appear anywhere in the Senate
 *     candidate filings. Sitting Representative Ryan Zinke (MT-01) announced
 *     March 2, 2026 he would not seek re-election - he does not appear
 *     anywhere in the MT-01 candidate filings either (not the House field,
 *     not the Senate field). MT-02's incumbent, Troy Downing, DID file for
 *     re-election and was the sole Republican filer in his own district
 *     (unopposed in the primary) - the only seat of the three where the
 *     sitting officeholder is seeking re-election.
 *   - INCUMBENCY was cross-checked against official/quasi-official sources,
 *     never guessed from the filing system or the results portal:
 *     (1) Troy Downing's current MT-02 service confirmed via
 *     congress.gov/member/troy-downing/D000634 and GovTrack
 *     (govtrack.us/congress/members/troy_downing/457000) - "Representative
 *     for Montana's 2nd Congressional District" since January 3, 2025.
 *     (2) Ryan Zinke's retirement (not seeking re-election to MT-01)
 *     confirmed via GovTrack (govtrack.us/congress/members/ryan_zinke/412640)
 *     and multiple independent news outlets (Daily Montanan, NBC Montana,
 *     Ballotpedia), consistent with his total absence from every 2026
 *     congressional filing.
 *     (3) Steve Daines's non-candidacy for his own Senate seat (Class II,
 *     the seat on the 2026 ballot) confirmed via GovTrack
 *     (govtrack.us/congress/members/steve_daines/412549, "Senator for
 *     Montana [...] 2015-2026") and multiple independent news outlets
 *     (Axios, Washington Post, Fox News), consistent with his total absence
 *     from the Senate candidate filings.
 *     `senate.gov/states/MT/intro.htm` was also fetched directly and
 *     confirms Montana's two sitting senators are Daines and Tim Sheehy
 *     (Sheehy holds the OTHER seat, Class I, not up in 2026 - out of scope
 *     for this fixture).
 *     This app's own FEC-derived `candidates` table was deliberately never
 *     used for any of this cross-check.
 *   - Independent candidates: Montana requires an independent
 *     House/Senate candidate to submit a nominating petition (4% of the
 *     votes cast for the winner of that office's previous election - 13,327
 *     signatures for Senate, 6,742 for MT-01, 7,274 for MT-02) to county
 *     election offices by May 26, 2026. The Secretary of State's office
 *     publicly certified, and this build independently confirmed via the
 *     candidate filing system's own status field, that exactly TWO of the
 *     THREE 2026 independent congressional filers actually met their
 *     signature threshold and are certified for the November ballot: Seth
 *     Bodnar (Senate) and Michael D Eisenhauer (MT-02) - both recorded
 *     `qualified_for_general_ballot`, a stronger status than AZ/TX/OK's
 *     independents warranted, because Montana's own certification (not just
 *     a filed declaration) is already public. The third, Kimberly A Persico
 *     (MT-01), publicly and explicitly did NOT meet her signature threshold
 *     (562 of 6,742 required, per county-accepted counts) and is NOT on the
 *     November ballot - she is deliberately EXCLUDED from this fixture
 *     entirely (not recorded with any status), the same treatment OK gave a
 *     primary candidate who lost: a real filer who does not appear on the
 *     final ballot is omitted, not guessed into a "declared intent" row.
 *   - No Green Party or Constitution Party candidate filed for any Montana
 *     congressional seat in 2026 - verified absent from the candidate filing
 *     system's full federal-office listing, not merely omitted.
 *
 * Sources:
 *   - https://candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928
 *     (Secretary of State's live 2026 federal candidate filing/status list -
 *     every filer, by office/party, with NOMINATED/FILED/Withdrawn/PENDING
 *     PETITION status)
 *   - https://electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY
 *     (Secretary of State's official June 2, 2026 primary election results -
 *     statewide vote totals per candidate per federal race)
 *   - https://congress.gov/member/troy-downing/D000634 and
 *     https://www.govtrack.us/congress/members/troy_downing/457000
 *     (MT-02 incumbency cross-check only)
 *   - https://www.govtrack.us/congress/members/ryan_zinke/412640 (MT-01
 *     retirement cross-check only)
 *   - https://www.govtrack.us/congress/members/steve_daines/412549 and
 *     https://www.senate.gov/states/MT/intro.htm (Senate incumbency
 *     cross-check only)
 *
 * Coverage: both US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Montana's candidate-withdrawal deadline (August 5, 2026, 5:00 p.m. -
 *     MCA 13-1-403(1)/(3)) and ballot-content certification deadline
 *     (August 20, 2026 - MCA 13-12-201, "seventy-five days before a general
 *     election") are both still in the future as of this fixture's
 *     retrieval date (2026-07-15) - see the epic's dated re-check card for
 *     this state. Nothing in this fixture is guessed past either date; a
 *     nominee recorded here could, in principle, still withdraw before
 *     August 5.
 *   - Names are recorded as they appear in the official candidate filing
 *     system; not independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MT_STATE = "MT";
export const MT_ELECTION_YEAR = 2026;
export const MT_STAGE = "general" as const;
export const MT_HOUSE_SOURCE_URLS = [
  "https://candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928",
  "https://electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY",
];
export const MT_SENATE_SOURCE_URLS = [
  "https://candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928",
  "https://electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY",
];
export const MT_RETRIEVED_AT = "2026-07-15";

// District 01 (Western District) is an open seat: sitting Representative
// Ryan Zinke announced March 2, 2026 he would not seek re-election, and does
// not appear anywhere in the 2026 congressional filings. District 02
// (Eastern District) is unaffected - incumbent Troy Downing filed for and
// won re-nomination unopposed.
export const MT_OPEN_SEAT_DISTRICTS = ["01"];

export const MT_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 (Western) — open seat (Zinke not seeking re-election).
  // Flint won the Republican primary by plurality (41,170 / 82,212, 50.08%
  // of a 4-candidate field); Forstag won the Democratic primary by
  // plurality (26,276 / 70,228, 37.42% of a 4-candidate field, no runoff —
  // Montana has no runoff mechanism); Sheedy was the sole Libertarian
  // filer, automatic nominee. Persico (IND) did not meet her 6,742-signature
  // petition threshold (562 accepted) and is not on the ballot — omitted.
  {
    district: "01",
    name: "Aaron Flint",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Sam Forstag",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Nick Sheedy",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 (Eastern) — incumbent Troy Downing (R) sole primary filer,
  // automatic nominee, running for re-election. Miller won the Democratic
  // primary by majority (24,033 / 43,276, 55.53% of a 3-candidate field);
  // McCracken was the sole Libertarian filer, automatic nominee. Eisenhauer
  // (IND) met his 7,274-signature petition threshold and was certified by
  // the Secretary of State — recorded qualified_for_general_ballot, not
  // merely declared.
  {
    district: "02",
    name: "Troy Downing",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Brian J Miller",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Patrick McCracken",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Michael D Eisenhauer",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const MT_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: sitting Senator Steve Daines withdrew from the Republican
  // primary minutes before the March 4, 2026 filing deadline and endorsed
  // Alme — no incumbent below. Alme won the Republican primary by majority
  // (128,716 / 169,062, 76.1% of a 3-candidate field); Bankhead won the
  // Democratic primary by plurality (48,772 / 111,743, 43.65% of a
  // 5-candidate field, no runoff); Austin won the Libertarian primary by
  // plurality (1,819 vs. Jandron's 1,592). Bodnar (IND) met his
  // 13,327-signature petition threshold and was certified by the Secretary
  // of State — recorded qualified_for_general_ballot, not merely declared.
  {
    district: null,
    name: "Kurt Alme",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Alani Bankhead",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Kyle Austin",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Seth Bodnar",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

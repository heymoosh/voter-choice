/**
 * scripts/congressional-rosters/la-official-roster-2026.ts
 *
 * Louisiana's 2026 official congressional roster — hand-transcribed from the
 * Louisiana Secretary of State's own Candidate Inquiry portal
 * (voterportal.sos.la.gov), not FEC filings. Built through the same manual
 * official-source pipeline as Arizona, Texas, Oklahoma, Alabama, Alaska,
 * Colorado, California, Arkansas, Delaware, Connecticut, and Florida, epic
 * `c5a813bb`; this is Louisiana's build.
 *
 * LOUISIANA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/louisiana-vertical-slice-data-check.md for the full
 * operational-navigation writeup and governing-date list):
 *
 *   - Louisiana's 2026 congressional election system is SPLIT by office,
 *     following the 2024 Legislature's closed-primary enactment plus Act 7
 *     of the 2026 Regular Session (which carved U.S. Representative back
 *     OUT of the closed-primary system for this cycle only):
 *       - U.S. SENATE ran a closed party primary (May 16, 2026) + runoff
 *         (June 27, 2026); both are in the past as of transcription time
 *         (2026-07-15), so the Nov 3, 2026 general nominees are DETERMINED.
 *       - U.S. HOUSE (all 6 districts) instead uses Louisiana's open
 *         ("jungle") primary format on Nov 3, 2026 (all candidates on one
 *         ballot regardless of party; top two advance to a Dec 12, 2026
 *         runoff if no majority) — but candidate QUALIFYING for this
 *         specific open-primary cycle had NOT YET OPENED at transcription
 *         time. The official qualifying period is August 5-7, 2026 (source:
 *         https://www.sos.la.gov/elections-voting/election-dates); a
 *         nominating-petition path closed July 9, 2026 (already past) but
 *         produced zero visible qualifiers as of this build.
 *   - Portal is NOT Civix-vended (custom LA SoS system, not
 *     *.civixapps.com) — needs a rendered browser session (WebFetch on the
 *     bare URL returns the unrendered SPA shell with no data), but has no
 *     Civix-specific mechanics otherwise. See the operational-navigation
 *     section of the data-check doc for the click sequence.
 *   - Live-checked the portal's own Nov 3, 2026 election-date view
 *     (`CandidateInquiry?electionDate=20261103`) with every office selected
 *     and "View Candidates" run: all 6 "U. S. Representative, Nth
 *     Congressional District" sections returned literally "No candidates."
 *     This is the ground truth this fixture follows — Louisiana's House
 *     delegation therefore has **NO fixture rows below and is NOT
 *     registered in FIXTURES for the "house" office** (see
 *     scripts/ingest/official-roster.ts). Per races.ts's designed fallback
 *     (getOfficialRoster returning zero rows for an exact
 *     state/office/district/year leaves that seat on the pre-existing
 *     FEC-derived path untouched), omitting House entirely is the correct,
 *     honest way to represent "nobody has qualified yet" — there is no
 *     override to make. This is NOT the same situation as OK's
 *     `runoff_pending` (two known finalists, undetermined winner); here
 *     there are zero known candidates, so no per-seat row exists to tag.
 *     A dated follow-up card (opened per the epic's NOT-BEFORE-DATE-GATE
 *     convention) re-runs this build after the Aug 5-7, 2026 qualifying
 *     period closes to populate the House roster for real.
 *   - Well-known names (e.g. Steve Scalise, Mike Johnson, Clay Higgins, Troy
 *     Carter, Cleo Fields) DO appear on the portal's 5/16/2026 election-date
 *     view under "U. S. Representative, Nth Congressional District -
 *     [Party]" — but those are stale, Feb-2026-dated filings for the
 *     ORIGINAL closed-party-primary process that Act 7 later superseded for
 *     House races specifically. They are NOT valid Nov 3 open-primary
 *     qualifiers and are deliberately NOT transcribed into this fixture —
 *     the live Nov 3 view (the actually-governing election date for House)
 *     is the only source of truth used here, and it shows no one has
 *     re-qualified under the new rules yet.
 *   - **U.S. SENATE cross-check finding (real, non-obvious, verified against
 *     two independent sources beyond the portal — Washington Post and
 *     NBC News/Ballotpedia coverage of the May 16 primary and June 27
 *     runoff):** incumbent Sen. Bill Cassidy (R) LOST renomination — he
 *     placed third in the May 16 primary (24.8%) behind Julia Letlow
 *     (44.8%) and John Fleming (28.3%), then Letlow won the June 27 runoff
 *     over Fleming (56.9%). Cassidy is NOT one of the two names on the
 *     Nov 3, 2026 general-ballot Senate section of the portal. Julia
 *     Letlow — Louisiana's sitting U.S. Representative for the 5th
 *     Congressional District, per letlow.house.gov — is the Republican
 *     nominee for SENATE, a different seat than the one she currently
 *     holds. Per SAFETY's rule against guessing incumbency from an
 *     in-portal signal, this was cross-checked against senate.gov's own
 *     senator list (confirms Cassidy, not Letlow, as a sitting LA Senator)
 *     — so BOTH Nov 3 Senate rows below are correctly `isIncumbent: false`;
 *     neither general-ballot candidate is the incumbent for this seat.
 *   - No independent/minor-party Senate filer appeared in the portal's Nov 3
 *     general-ballot Senate section — exactly the Democratic and Republican
 *     nominees are listed, nothing else.
 *
 * Sources:
 *   - https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103
 *     (LA SoS Candidate Inquiry, Nov 3, 2026 election date, "Statewide/
 *     Multi-Parish" tab, all offices selected — live-rendered via browser
 *     automation, retrieved 2026-07-15; the operative source for both the
 *     Senate roster and the confirmed-empty House roster)
 *   - https://www.sos.la.gov/elections-voting/election-dates (LA SoS
 *     "Election Dates" page — Aug 5-7, 2026 House qualifying period, July 9,
 *     2026 nominating-petition deadline, Nov 3 / Dec 12 election structure)
 *   - https://www.washingtonpost.com/elections/2026/06/27/letlow-wins-louisiana-senate-runoff-succeed-cassidy-who-lost-his-primary/
 *     (Senate runoff result cross-check, secondary source)
 *   - https://www.nbcnews.com/politics/2026-election/live-blog/louisiana-election-bill-cassidy-live-updates-rcna344986
 *     (Senate primary result cross-check, secondary source)
 *   - https://www.senate.gov/senators/senators-contact.htm (incumbency
 *     cross-check only — confirms Cassidy, not Letlow, as a sitting LA
 *     Senator)
 *   - https://letlow.house.gov/ (incumbency cross-check only — confirms
 *     Julia Letlow's current office is U.S. House, not Senate)
 *
 * Coverage: Louisiana's 2026 US Senate contest (Cassidy's Class 2 seat) —
 * general-ballot nominees, fully determined. All 6 US House districts are
 * deliberately NOT covered by this fixture — qualifying has not yet
 * happened; see above.
 *
 * KNOWN LIMITATIONS:
 *   - House roster is empty by design (see above), not a transcription gap.
 *   - Names recorded exactly as printed on the official portal; not
 *     cross-checked against a third document beyond the Senate incumbency
 *     checks above.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const LA_STATE = "LA";
export const LA_OFFICE = "senate" as const;
export const LA_ELECTION_YEAR = 2026;
// Senate primary (5/16) and runoff (6/27) are both in the past as of
// transcription time (2026-07-15) — the Nov 3 general-ballot nominees are
// determined. (House is not registered in FIXTURES at all — see docblock.)
export const LA_STAGE = "general" as const;
export const LA_SENATE_SOURCE_URLS = [
  "https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103",
];
export const LA_RETRIEVED_AT = "2026-07-15";

export const LA_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Democratic nominee — sole Democrat on the Nov 3 general-ballot Senate
  // section (won the May 16/June 27 primary process; no runoff detail
  // needed here since the portal's Nov 3 view is itself the authoritative
  // general-ballot lineup).
  {
    district: null,
    name: '"Jamie" Davis',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Republican nominee — won the June 27, 2026 runoff over John Fleming
  // after incumbent Bill Cassidy placed third in the May 16 primary.
  // Currently LA's sitting U.S. Representative for the 5th District, NOT
  // the incumbent for this Senate seat — see docblock cross-check.
  {
    district: null,
    name: "Julia Letlow",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

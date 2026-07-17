/**
 * scripts/congressional-rosters/wv-official-roster-2026.ts
 *
 * West Virginia's 2026 official congressional roster for the November 3,
 * 2026 general election - covers both US House districts and the US
 * Senate race. Built through the same manual official-source pipeline as
 * Arizona (card 637c2583), Texas (card 8530a468), Oklahoma (card
 * d9b1ef86), and Alabama (epic c5a813bb); this is West Virginia's build
 * (card "[P0] Import + verify official roster: West Virginia (WV)").
 *
 * WEST VIRGINIA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/west-virginia-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - West Virginia's official candidate source is candidates.wvsos.gov, a
 *     WVSOS-branded candidate-lookup tool - NOT Civix-vended (no
 *     *.civixapps.com host, no "Powered by gocivix.com" footer, no
 *     "IvisCbpUi"/"::Civix Election Night Results::" page markers), so the
 *     Civix portal playbook does not apply here.
 *   - This card's own ORIGIN note flagged a stale caveat from an earlier
 *     I11 source-inventory rehearsal: at that time the portal loaded but
 *     showed zero populated candidate rows. Re-checked live at this
 *     build's retrieval date (2026-07-16): the portal is now fully
 *     populated (235 total candidates across all WV offices for the 2026
 *     General Election). The caveat no longer applies.
 *   - UNLIKE Arizona/Texas/Oklahoma's PRE-primary candidate-filing
 *     documents (which required deriving the general-ballot nominee from
 *     primary/runoff results), candidates.wvsos.gov's "Regular Candidates"
 *     listing is explicitly titled "2026 General Election" and already
 *     reflects the POST-primary nominee set: West Virginia's primary was
 *     held May 12, 2026 (already passed at retrieval time), and exactly
 *     one Democratic and one Republican filer appears per federal seat -
 *     no contested-primary derivation was needed.
 *   - MINOR-PARTY / UNAFFILIATED BALLOT STATUS: West Virginia has no
 *     convention-based minor-party nomination path (searched the official
 *     2026 Elections Calendar PDF for "convention" / "recognized party" /
 *     "minor party" - no hits). Every non-major-party federal candidate
 *     goes through the SAME nominating-certificate/petition process under
 *     W. Va. Code §§ 3-5-23, 3-5-24, governed by the "No Party
 *     Organization/Unaffiliated Candidates" deadline - August 3, 2026 (the
 *     statutory August 1 deadline falls on a Saturday in 2026, so it rolls
 *     to the next business day per W. Va. Code § 2-2-2). At this
 *     fixture's retrieval date (2026-07-16), that filing window was still
 *     OPEN, and the Secretary of State's CERTIFIED list of general-election
 *     candidates isn't transmitted to county clerks until August 24, 2026
 *     (71st day before the election, W. Va. Code § 3-5-18) - the portal
 *     itself exposes no separate "sufficient"/"certified" flag
 *     distinguishing an accepted filing from a certified one. Per the same
 *     conservative posture Colorado's UAF petition candidates used (filed
 *     but not yet certified-sufficient => declared_general_ballot_intent,
 *     never guessed as qualified), S. Marshall Wilson (Constitution Party,
 *     US Senate) is recorded as "declared_general_ballot_intent", not
 *     "qualified_for_general_ballot".
 *   - PARTY CODE: Wilson's party is recorded as "CONSTITUTION" by the
 *     portal. Reused the existing "CST" code (added building Idaho, "the
 *     Constitution Party of Idaho") rather than minting a new WV-specific
 *     code - CST already represents the national Constitution Party's
 *     state-level ballot presence generically, and West Virginia's
 *     Constitution Party is the same national party.
 *   - WRITE-IN: candidates.wvsos.gov's separate "Write-In Candidates" tab
 *     (https://candidates.wvsos.gov/write-in) lists exactly one federal
 *     write-in filer: Rio Phillips (US Senate, "No Party Affiliation",
 *     filed 06/05/2026). Recorded with party: null and ballotStatus
 *     "write_in_qualified", matching the AZ/FL/OK precedent - the party
 *     label a write-in files under is not preserved as a real party
 *     affiliation.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the candidate portal or the app's own FEC table:
 *     (1) house.gov's "By State and District" directory (West Virginia
 *     section) confirms the sitting House delegation is Carol Miller
 *     (WV-1, miller.house.gov) and Riley Moore (WV-2,
 *     rileymoore.house.gov) - both match their party-portal filings
 *     exactly, both running for re-election, no open seat.
 *     (2) senate.gov's West Virginia state page confirms Shelley Moore
 *     Capito (R) is a sitting senator and is the Republican Senate filer
 *     on the portal - she is running for re-election, no open seat. West
 *     Virginia's other senator, James C. Justice (R), is not on the 2026
 *     ballot (different Senate class) and is out of scope for this
 *     fixture.
 *   - No runoff mechanism exists in West Virginia election law for
 *     congressional races (not found anywhere in the official 2026
 *     Elections Calendar), and West Virginia's May 12, 2026 primary has
 *     already occurred - every federal nomination here is DETERMINED. No
 *     "runoff_pending" rows in this fixture.
 *
 * Sources:
 *   - https://candidates.wvsos.gov/regular (WVSOS's official 2026 General
 *     Election "Regular Candidates" listing - candidate set + party +
 *     filing date, by office; 235 total candidates all offices, 7 federal)
 *   - https://candidates.wvsos.gov/write-in (WVSOS's official 2026 General
 *     Election "Write-In Candidates" listing - 1 federal write-in filer)
 *   - https://www.house.gov/representatives ("By State and District",
 *     West Virginia section - incumbency cross-check only, not a
 *     candidate-roster source)
 *   - https://www.senate.gov/states/WV/intro.htm (West Virginia's current
 *     senators - incumbency cross-check only)
 *   - https://sos.wv.gov/media/467/download (official 2026 Elections
 *     Calendar PDF - governing dates: minor-party/unaffiliated nominating
 *     petition deadline, SoS certified-list transmittal date, general
 *     election withdrawal deadline)
 *
 * Coverage: both US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - S. Marshall Wilson's (Constitution, US Senate) petition-signature
 *     sufficiency has not been certified by the Secretary of State as of
 *     this fixture's retrieval date (see MINOR-PARTY / UNAFFILIATED
 *     BALLOT STATUS above) - recorded as "declared_general_ballot_intent",
 *     an open item flagged for Muxin same as prior states' equivalent
 *     petition-pending gaps. A re-check after the August 24, 2026 SoS
 *     certified-list transmittal date is warranted.
 *   - Names are recorded as they appear in the official candidate portal;
 *     not independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const WV_STATE = "WV";
export const WV_ELECTION_YEAR = 2026;
export const WV_STAGE = "general" as const;
export const WV_HOUSE_SOURCE_URLS = ["https://candidates.wvsos.gov/regular"];
export const WV_SENATE_SOURCE_URLS = [
  "https://candidates.wvsos.gov/regular",
  "https://candidates.wvsos.gov/write-in",
];
export const WV_RETRIEVED_AT = "2026-07-16";

export const WV_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Miller (incumbent) confirmed via house.gov; George is
  // the sole Democratic filer (already the party's general-ballot
  // nominee, no primary derivation needed).
  {
    district: "01",
    name: "VINCE GEORGE",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "CAROL MILLER",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Moore (incumbent) confirmed via house.gov; Parsi is the
  // sole Democratic filer.
  {
    district: "02",
    name: "ACE PARSI",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "RILEY MOORE",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const WV_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Wilson's nominating-petition sufficiency is not yet certified by the
  // SoS at retrieval time — see KNOWN LIMITATIONS above. Not promoted to
  // qualified_for_general_ballot.
  {
    district: null,
    name: "S. MARSHALL WILSON",
    party: "CST",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "RACHEL FETTY ANDERSON",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Capito (incumbent) confirmed via senate.gov — sitting senator running
  // for re-election, no open seat.
  {
    district: null,
    name: "SHELLEY MOORE CAPITO",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Sole federal write-in filer — party not preserved (see WRITE-IN note
  // above).
  {
    district: null,
    name: "RIO PHILLIPS",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
];

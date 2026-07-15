/**
 * scripts/congressional-rosters/ak-official-roster-2026.ts
 *
 * Alaska's 2026 official congressional roster for the November 3, 2026
 * general election — covers the single at-large US House seat and the
 * 2026 US Senate race. Built through the same manual official-source
 * pipeline as Arizona (card 637c2583), Texas (card 8530a468), and Oklahoma
 * (card d9b1ef86), epic c5a813bb; this is Alaska's build.
 *
 * ALASKA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/alaska-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Alaska's official candidate source is a single server-rendered HTML
 *     page (https://www.elections.alaska.gov/candidates/?election=26prim),
 *     NOT Civix — confirms the F03 rehearsal's sourceFormat: "html" /
 *     parserFamily: "html_table" finding. There is no JS SPA, no
 *     virtualized scroll, no per-district query needed: every office
 *     (Governor, US Senate, US Representative, state Senate, state House)
 *     is listed on one page, grouped by office heading.
 *   - RESOLVED DISCREPANCY (per the card's explicit instruction to check,
 *     not assume): the ORIGIN note's
 *     ".../Final-Determination-6.15.2026-DOE.pdf" is NOT the candidate-list
 *     source — it is a June 15, 2026 Division of Elections ruling in a
 *     SPECIFIC ballot-eligibility dispute over one US Senate filer, Daniel
 *     J. Sullivan Jr. of Petersburg (found to have filed under a
 *     confusingly similar name to incumbent Sen. Dan S. Sullivan). That
 *     ruling was overturned on appeal — Alaska Superior Court (June 26,
 *     2026) and the Alaska Supreme Court (June 29, 2026) both ordered the
 *     Division to put him on the ballot. The live candidate-list HTML
 *     already reflects the final, court-ordered outcome: "Sullivan, Daniel
 *     J. Jr." appears as "(Registered Republican) (Certified)", not
 *     excluded. This fixture follows the live, current-as-of-retrieval HTML
 *     roster, not the superseded PDF the ORIGIN note pointed at.
 *   - Alaska has used a nonpartisan top-four primary + ranked-choice
 *     general election since Ballot Measure 2 (2020): every candidate for
 *     an office, regardless of party or "Nonpartisan"/"Undeclared"
 *     registration, runs in ONE combined primary; the top four advance to
 *     a ranked-choice general. The Aug 18, 2026 primary had NOT yet
 *     occurred as of this fixture's retrieval (2026-07-15) — filing closed
 *     June 1, 2026 and the Division's "(Certified)" tag means qualified for
 *     THAT primary ballot, not a determined general-election nominee.
 *   - ballotStatus judgment call (the card's own open question — "does AK
 *     need runoff_pending or something else?"): NO new status was needed,
 *     and "runoff_pending" does NOT apply here. That status means two
 *     already-decided primary finalists awaiting a runoff between just
 *     them (Oklahoma's case) — Alaska's situation is structurally the SAME
 *     as Arizona's own pre-primary build (AZ_STAGE = "primary"): the
 *     primary itself hasn't happened yet, so EVERY certified filer gets
 *     "qualified_for_primary_ballot", full stop. Promoting anyone to
 *     "qualified_for_general_ballot" now would be guessing which four
 *     candidates the Aug 18 top-four primary will advance — exactly what
 *     the plan doc's SAFETY rule forbids. No write-in filers appear on this
 *     list yet (Alaska's write-in process is a later, separate filing
 *     window closer to the election).
 *   - District/office wiring judgment call: the card's own drafted shape
 *     said to use `district: null` for Alaska's at-large House seat "like a
 *     statewide/Senate seat." That is WRONG for how the code actually
 *     works — races.ts's lookupChallengers takes a numeric `district`
 *     (Census convention: 0 = at-large, confirmed by
 *     src/app/api/delegation/route.ts's isNonVotingArea check treating
 *     district === 0 as a real, voting at-large seat, not a non-voting
 *     territory) and zero-pads it to a district KEY string before calling
 *     getOfficialRoster — so district 0 becomes districtKey "00", not
 *     null. This exact convention is already tested for Wyoming's own
 *     at-large FEC rows (races.test.ts, "zero-pads the district key
 *     (at-large = 00)"). A `district: null` House row here would silently
 *     never match that lookup and the whole House side of this vertical
 *     slice would render nothing. This fixture uses `district: "00"` for
 *     every House row instead — Senate stays `district: null` (statewide,
 *     no House-style district key at all), matching the existing TX/OK
 *     Senate rows and the 0016 NULLS NOT DISTINCT fix.
 *   - Party-code judgment calls (two new codes added to
 *     scripts/congressional-rosters/types.ts, mirroring how AZ's "AIP" was
 *     added): (1) "NPA" ("No Party Affiliation") for filers whose Division
 *     of Elections registration reads "Nonpartisan" or "Undeclared" — both
 *     collapse to this single existing FEC-side code (already mapped in
 *     races.ts's PARTY_NAMES) rather than inventing two near-duplicate
 *     codes for a distinction this app has no other use for. (2) "AKP" for
 *     "Registered Alaskan Party" (Earl "Skip" Southworth, US Senate) — a
 *     real state-recognized minor party under Alaska law, not a generic
 *     independent, mirroring the AIP precedent exactly.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the candidate list's own "(Incumbent)" tag or from this
 *     app's own FEC-derived `candidates` table: (1) house.gov /
 *     clerk.house.gov confirm Nicholas J. Begich III (R) is Alaska's
 *     sitting at-large Representative, serving since January 2025. (2)
 *     senate.gov's "States in the Senate" page confirms Alaska's Class II
 *     Senate seat (the one up in 2026) is held by Dan Sullivan (R); the
 *     state's other seat, Class III (Murkowski), is not up until 2028 —
 *     matching the card's own background note. Both cross-checks agree
 *     with the candidate list's own "(Incumbent)" tags for Begich and Dan
 *     S. Sullivan — no discrepancy found.
 *   - Live-source access note: elections.alaska.gov's TLS certificate chain
 *     is missing an intermediate cert ("unable to get local issuer
 *     certificate" — confirmed via `curl -v`, reproducible outside any
 *     tool sandbox), which blocks WebFetch and a normal Chrome navigation
 *     outright. Retrieval used two independent, cross-checked reads: a
 *     Wayback Machine snapshot (2026-07-11, `web.archive.org`, valid TLS)
 *     and a direct `curl -sk` (TLS verification bypassed for this one
 *     read-only GET only) straight to the live page on 2026-07-15 —
 *     candidate-by-candidate identical between the two, giving high
 *     confidence the transcription below is both accurate and current.
 *   - Independent/write-in candidates: Alaska's filing process folds every
 *     candidate — party-registered, "Nonpartisan," or "Undeclared" — into
 *     the SAME single certified list for the SAME nonpartisan primary;
 *     there is no separate later-stage "declaration of intent" document
 *     like Texas's, and no distinct independent track like Oklahoma's.
 *   - No Constitution Party filer for either federal seat this cycle
 *     (checked — not omitted, verified absent from both office sections).
 *
 * Sources:
 *   - https://www.elections.alaska.gov/candidates/?election=26prim
 *     (Division of Elections' live, continuously-updated 2026 primary
 *     candidate list — "Page last updated July 10, 2026" at last retrieval;
 *     the US SENATOR and UNITED STATES REPRESENTATIVE sections are this
 *     fixture's source of record)
 *   - https://www.elections.alaska.gov/candidates/ (landing page — election
 *     picker / search form, not itself a candidate list)
 *
 * Coverage: the single at-large US House seat + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Every row here is "qualified_for_primary_ballot" — the Aug 18, 2026
 *     top-four nonpartisan primary determines which four candidates per
 *     office advance to the Nov 3 ranked-choice general. This fixture will
 *     need a follow-up update once that primary is certified (see the
 *     epic's own standing note about the AZ/TX/OK precedent for this kind
 *     of update).
 *   - "Nonpartisan"/"Undeclared" filers are recorded as party "NPA" (see
 *     judgment call above) rather than preserving the raw distinction
 *     between the two labels — an intentional simplification, not a
 *     transcription gap.
 *   - Two Senate filers share strikingly similar names by design of the
 *     litigated dispute (incumbent "Dan S. Sullivan" and "Daniel J.
 *     Sullivan Jr.") — both are real, separately certified candidates per
 *     the Alaska Supreme Court's ruling; this is not a transcription
 *     duplicate.
 *   - Write-in filers, if any qualify closer to the election, are not yet
 *     reflected — none appeared on the list as of retrieval.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const AK_STATE = "AK";
export const AK_ELECTION_YEAR = 2026;
// Alaska's Aug 18, 2026 top-four primary had not yet occurred at
// transcription time (2026-07-15) — see the docblock's ballotStatus
// judgment-call note. Every row here is a primary-ballot filer.
export const AK_STAGE = "primary" as const;
export const AK_HOUSE_SOURCE_URLS = [
  "https://www.elections.alaska.gov/candidates/?election=26prim",
  "https://www.elections.alaska.gov/candidates/",
];
export const AK_SENATE_SOURCE_URLS = [
  "https://www.elections.alaska.gov/candidates/?election=26prim",
  "https://www.elections.alaska.gov/candidates/",
];
export const AK_RETRIEVED_AT = "2026-07-15";

// Alaska's US House is a single at-large seat — races.ts's lookupChallengers
// zero-pads a numeric district of 0 to districtKey "00" (see docblock's
// district/office wiring judgment call); every House row uses this district
// key, never null.
export const AK_HOUSE_DISTRICT = "00";

export const AK_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: AK_HOUSE_DISTRICT,
    name: "DAVID R. AMBROSE II",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "NICK BEGICH",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "LADY DONNA DUTCHESS",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "JOHN E. FODDRILL SR.",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "EDDIE GOLDFARB",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "ERIC HAFNER",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "BILL HILL",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: 'JAMES C. "JIM" MCDERMOTT',
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "YAQUELIN REYNOSO",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "DAVID RICHEY",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "MELANIE A. SALAZAR",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "MATT SCHULTZ",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "CLAY STRICKLAND",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: "JOHN B. WILLIAMS",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: AK_HOUSE_DISTRICT,
    name: 'MATTHEW "BRONCO" WILLIAMS',
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Withdrawn (excluded, not transcribed as a row): Heikes, Gerald L. (R) —
  // withdrew from the House race; he also separately filed and remains
  // certified for the US Senate race below (two distinct filings).
];

export const AK_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "DUSTIN THOMAS HOUSE DARDEN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "FRED C. GRAUBERGER",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "RICHARD GRAYSON",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: 'CAROL "KITTY" HAFNER',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "GERALD L. HEIKES",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: 'SIDNEY "SID" HILL',
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "SCOTT A. KOHLHAAS",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "DAVID B. LESLIE",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "RICHARD B. MAYERS",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "HEATHER MCELWAIN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "MARY PELTOLA",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "REECE J. ROBERTS",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "SHIRLEY A. SAUCERMAN",
    party: "NPA",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: 'EARL D. "SKIP" SOUTHWORTH',
    party: "AKP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "DAN S. SULLIVAN",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "DANIEL J. SULLIVAN JR.",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Withdrawn (excluded, not transcribed as a row): Hunt, William L. (D).
];

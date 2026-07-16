/**
 * scripts/congressional-rosters/ga-official-roster-2026.ts
 *
 * Georgia's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 14 US House districts and the 2026 US
 * Senate regular election. Built through the same manual official-source
 * pipeline as Arizona (card 637c2583), Texas (card 8530a468), Oklahoma
 * (card d9b1ef86), Alabama, Alaska, Colorado, Connecticut, California,
 * Arkansas, Delaware, and Florida, epic c5a813bb; this is Georgia's build
 * (card "[P0] Import + verify official roster: Georgia (GA)").
 *
 * GEORGIA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/georgia-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - GA_STAGE = "general": Georgia's May 19, 2026 general primary and its
 *     June 16, 2026 primary runoff are BOTH already certified as of this
 *     fixture's transcription (2026-07-15) — every major-party nomination is
 *     determined. This is a general-stage build like TX/OK/AL, not a
 *     pending-primary build like FL: nominees below are DERIVED from
 *     certified primary/runoff vote totals, not left at
 *     qualified_for_primary_ballot.
 *   - SOURCE SYSTEM — NOT Civix, NOT a static-HTML/PDF portal. Georgia's
 *     results system (`results.sos.ga.gov`) is an Angular single-page app
 *     vended by "Enhanced Voting" (CSP references `app.enhancedvoting.com`),
 *     a portal vendor this track has not seen before. Unlike Civix, it needs
 *     NO browser automation at all: the SPA's own Angular bundle
 *     (`main-*.js`) reveals a plain, unauthenticated JSON REST API at
 *     `https://results.sos.ga.gov/results/public/api/*`, directly reachable
 *     via `curl`/`WebFetch` with no Cloudflare gate and no JS rendering
 *     required (a simpler case than TX's Civix portal). See the data-check
 *     doc's operational-navigation section for the exact endpoint-discovery
 *     path and the two calls that mattered:
 *       `GET /results/public/api/jurisdictions/Georgia` — lists every
 *       election Georgia has ever run, each with a `publicElectionId`; the
 *       May 19, 2026 general primary is `GeneralPrimary51926` and the
 *       June 16, 2026 runoff is `06162026GeneralPrimaryRunoff`.
 *       `GET /results/public/api/elections/Georgia/{publicElectionId}/ballot-items`
 *       — every contest on that election's ballot, each with a
 *       `summaryResults.ballotOptions[]` array of candidates carrying
 *       official certified `voteCount` (this is what was parsed for every
 *       district below).
 *   - sos.ga.gov (the main SoS domain, including `/qualified-candidates` and
 *     the official 2026 elections-calendar PDF) is behind Cloudflare bot
 *     protection and returned HTTP 403 to every plain fetch attempted
 *     (`curl`, `WebFetch`) — this is the genuine blocker for this build (see
 *     "Known gaps" below), distinct from the results portal above, which
 *     needed no such workaround. No browser-automation tool was available in
 *     this build's environment to drive it as a rendered session (the
 *     mitigation TX's Civix playbook used); flagged for the NOT BEFORE
 *     re-check card opened alongside this build.
 *   - MAJORITY/RUNOFF DERIVATION: Georgia requires a majority (>50%) to win
 *     a primary outright; absent one, the top two finishers advance to the
 *     June 16 runoff. Applying that rule to the certified May 19 totals
 *     produced exactly five contests needing the runoff result to determine
 *     the final nominee — confirmed against the runoff election's own
 *     ballot-items list (27 contests, all of which had gone to a runoff):
 *     US Senate - Rep (Collins 40.50% / Dooley 30.19% / Carter 25.11%,
 *     runoff: Collins 55.54%); US House D1 - Dem (Griggs 34.45% / Hollowell
 *     24.66%, runoff: Hollowell 52.96%); US House D7 - Dem (Kozycki 39.95% /
 *     Norton 22.34%, runoff: Kozycki 67.72%); US House D11 - Rep (Cowan
 *     42.60% / Adkerson 21.72%, runoff: Cowan 64.98%); US House D12 - Dem
 *     (Smith 32.82% / George 26.65%, runoff: Smith 55.79%). Every other
 *     contest below was decided outright on May 19 by an outright majority
 *     or lack of opposition.
 *   - INCUMBENCY was cross-checked against house.gov's own "By State and
 *     District" member directory (fetched via `curl` — the page's full
 *     per-state table is present in the raw server-rendered HTML; no
 *     browser/scroll automation was actually needed to read it, despite the
 *     lazy-render note in the Civix playbook applying to a different,
 *     client-rendered widget on that same page) and senate.gov, never
 *     guessed from the results portal's own signals (which have no
 *     incumbency tag at all — a cleaner failure mode than Civix/FL's stale
 *     tags, since there was nothing to over-trust). house.gov's Georgia
 *     table (retrieved 2026-07-15) confirmed the following FOUR seats are
 *     open/vacant for 2026, each independently sourced, none inferred from
 *     the portal:
 *     (1) GA-1 — sitting member Earl L. "Buddy" Carter (REP) is NOT among
 *     the district's own May 19 candidates; he ran in the 2026 US Senate REP
 *     primary instead (confirmed directly by this fixture's own Senate
 *     data: Carter placed third, 25.11%). Open seat.
 *     (2) GA-10 — sitting member Mike Collins (REP) is likewise NOT among
 *     the district's candidates; he is this fixture's Senate REP runoff
 *     winner (55.54%) instead. Open seat.
 *     (3) GA-11 — sitting member Barry Loudermilk (REP) announced in
 *     February 2026 he would not seek re-election (confirmed via Fox News,
 *     Atlanta News First, WSB-TV, The Hill, and Ballotpedia News reporting,
 *     "29th/50th House Republican to not seek re-election"); he does not
 *     appear among GA-11's candidates. Open seat/retirement.
 *     (4) GA-13 — sitting member David Scott (DEM) died April 22, 2026,
 *     after having already qualified for re-election March 2, 2026
 *     (confirmed via GovTrack, Atlanta News First, and AJC reporting); the
 *     seat is VACANT as of this fixture's transcription (confirmed via
 *     clerk.house.gov's own GA-13 vacancy page), with a SEPARATE special
 *     election called for July 28, 2026 to fill only the remainder of his
 *     current term (through Jan 3, 2027) — a different contest, with a
 *     different candidate field, from the regular 2026 cycle's May 19
 *     primary covered here. Neither Jonathan Chavez (REP) nor Jasmine Clark
 *     (DEM), the regular-cycle nominees below, is a sitting incumbent.
 *   - GA-14 is the inverse case: Clay Fuller (REP) IS a sitting incumbent
 *     (won the March 10 / April 7, 2026 special election to fill Marjorie
 *     Taylor Greene's seat — she resigned Jan 5, 2026, per CNN/PBS/Fox News
 *     reporting — and was seated well before the May 19 primary), but nothing
 *     in the results portal's own May 19 ballot-item data tags him as an
 *     incumbent (no "(I)" suffix, unlike every other sitting member who ran
 *     in a contested primary). Marked `isIncumbent: true` here, correcting
 *     the portal's omission — the same class of stale/incomplete in-portal
 *     signal FL's build found, cross-checked independently via house.gov
 *     rather than trusted from the portal.
 *   - Every other district's winning nominee IS the sitting incumbent
 *     (confirmed by name against house.gov): Sanford Bishop (D2), Brian Jack
 *     (D3), Henry "Hank" Johnson Jr. (D4), Nikema Williams (D5), Lucy McBath
 *     (D6), Rich McCormick (D7), Austin Scott (D8), Andrew Clyde (D9), Rick
 *     W. Allen (D12). The Senate DEM incumbent, Jon Ossoff, ran unopposed in
 *     his own primary (100%, no runoff).
 *   - INDEPENDENT / LIBERTARIAN / WRITE-IN CANDIDATES ARE DELIBERATELY
 *     EXCLUDED from this fixture — a known gap, not an oversight. Georgia's
 *     independent and minor-party candidates never appear in primary/runoff
 *     data at all (Georgia's Democratic and Republican nominees are the only
 *     candidates decided by primary; independents and minor parties qualify
 *     directly for the general ballot via a separate petition process, June
 *     22–26, 2026 for individual district petitions), so nothing in the
 *     source data used above could confirm or deny them. A secondary
 *     aggregator (politics1.com, comparison-only, never a primary source
 *     per this track's SAFETY rule) lists several declared independent,
 *     Libertarian, and write-in filers by district, but: (a) the Libertarian
 *     Party of Georgia's own STATEWIDE ballot line — which would have
 *     carried its US Senate nominee, Allen Buckley — is independently
 *     confirmed to have FAILED per direct AJC reporting dated 2026-07-11
 *     ("Libertarians won't be on the ballot in Georgia, meaning likely no
 *     runoffs"): the party could not gather the ~72,000 signatures (1% of
 *     active registered voters) required by its filing deadline, so Buckley
 *     is NOT a qualified general-ballot candidate despite being the party's
 *     nominee; (b) no equivalent official confirmation could be obtained for
 *     any individual district-level independent/write-in filer (a much
 *     lower, ~1%-of-district signature bar than the statewide threshold, so
 *     these are NOT automatically disqualified by the same finding) because
 *     sos.ga.gov's own qualified-candidates page is Cloudflare-blocked (see
 *     above) and no browser-automation tool was available this session to
 *     drive it as a rendered session. Per this track's SAFETY rule — "a
 *     filing list cannot be represented as a qualified/certified roster" —
 *     these declared-but-unverified filers are omitted here rather than
 *     guessed onto the roster. See "Known gaps" in the data-check doc and
 *     the NOT BEFORE re-check card opened alongside this build.
 *
 * Sources:
 *   - https://results.sos.ga.gov/results/public/api/jurisdictions/Georgia
 *     (Georgia Secretary of State's Enhanced Voting results system —
 *     election index, retrieved 2026-07-15)
 *   - https://results.sos.ga.gov/results/public/api/elections/Georgia/GeneralPrimary51926/ballot-items
 *     (May 19, 2026 General Primary — certified candidate-level results for
 *     all 14 US House districts + US Senate, both parties, retrieved
 *     2026-07-15)
 *   - https://results.sos.ga.gov/results/public/api/elections/Georgia/06162026GeneralPrimaryRunoff/ballot-items
 *     (June 16, 2026 General Primary Runoff — certified runoff results for
 *     the 5 contests that lacked an outright May 19 majority, retrieved
 *     2026-07-15)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check by name, retrieved 2026-07-15)
 *   - https://www.senate.gov/senators/index.htm (senator directory,
 *     incumbency cross-check for Jon Ossoff, retrieved 2026-07-15)
 *   - https://clerk.house.gov/members/GA13/vacancy (confirms GA-13 vacancy,
 *     retrieved 2026-07-15)
 *   - https://www.ajc.com/politics/2026/07/libertarians-wont-be-on-the-ballot-in-georgia-meaning-likely-no-runoffs/
 *     (confirms Libertarian Party of Georgia's statewide ballot-access
 *     failure, retrieved 2026-07-15)
 *
 * Coverage: all 14 US House districts + the 2026 US Senate regular election.
 * Every nominee below is `qualified_for_general_ballot` (a certified
 * primary/runoff winner or an unopposed filer); no `runoff_pending` rows —
 * both the primary and its runoff are already certified as of transcription.
 *
 * KNOWN LIMITATIONS:
 *   - No independent, Libertarian, or write-in candidate is represented in
 *     this fixture — see the docblock section above. A future re-check
 *     should retry sos.ga.gov's official qualified-candidates page (blocked
 *     by Cloudflare this session) once browser automation is available, or
 *     once Georgia's sample ballots (and this results system's own general-
 *     election entry) are published, whichever comes first.
 *   - GA-13's regular-cycle nominees (Chavez/Clark) reflect the May 19/June
 *     16 primary cycle only; the July 28, 2026 special election (a separate
 *     contest, different candidates, filling only the remainder of David
 *     Scott's term) is out of scope for this fixture and not tracked here.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const GA_STATE = "GA";
export const GA_ELECTION_YEAR = 2026;
// Both the May 19, 2026 primary and its June 16, 2026 runoff are already
// certified as of transcription (2026-07-15) — every nominee below is a
// determined general-ballot candidate, not a primary-stage filer.
export const GA_STAGE = "general" as const;
export const GA_HOUSE_SOURCE_URLS = [
  "https://results.sos.ga.gov/results/public/api/elections/Georgia/GeneralPrimary51926/ballot-items",
  "https://results.sos.ga.gov/results/public/api/elections/Georgia/06162026GeneralPrimaryRunoff/ballot-items",
];
export const GA_SENATE_SOURCE_URLS = [
  "https://results.sos.ga.gov/results/public/api/elections/Georgia/GeneralPrimary51926/ballot-items",
  "https://results.sos.ga.gov/results/public/api/elections/Georgia/06162026GeneralPrimaryRunoff/ballot-items",
];
export const GA_RETRIEVED_AT = "2026-07-15";

export const GA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — OPEN SEAT: Earl L. "Buddy" Carter (REP incumbent) ran for
  // US Senate instead (placed 3rd in that primary, see GA_SENATE_ROSTER_2026).
  {
    district: "01",
    name: 'James "Jim" Kingston',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Amanda Hollowell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — Sanford Bishop (DEM, incumbent)
  {
    district: "02",
    name: "Matt Day",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Sanford Bishop",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Brian Jack (REP, incumbent)
  {
    district: "03",
    name: "Brian Jack",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Maura Keller",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 04 — Henry "Hank" Johnson, Jr. (DEM, incumbent)
  {
    district: "04",
    name: "Jim Duffie",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: 'Henry "Hank" Johnson, Jr.',
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 05 — Nikema Williams (DEM, incumbent)
  {
    district: "05",
    name: 'John "Bongo" Salvesen',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Nikema Williams",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 06 — Lucy McBath (DEM, incumbent)
  {
    district: "06",
    name: "Kevin E. Martin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Lucy McBath",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 07 — Rich McCormick (REP, incumbent)
  {
    district: "07",
    name: "Rich McCormick",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Tony Kozycki",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 08 — Austin Scott (REP, incumbent)
  {
    district: "08",
    name: "Austin Scott",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Kelly Esti",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 09 — Andrew Clyde (REP, incumbent)
  {
    district: "09",
    name: "Andrew Clyde",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Caitlyn Gegen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 10 — OPEN SEAT: Mike Collins (REP incumbent) ran for US Senate
  // instead (won that primary's runoff, see GA_SENATE_ROSTER_2026).
  {
    district: "10",
    name: "Houston Gaines",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: 'Pamela "Pam" Delancy',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 11 — OPEN SEAT: Barry Loudermilk (REP incumbent) announced in
  // February 2026 he would not seek re-election.
  {
    district: "11",
    name: "John Cowan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Chris Harden",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 12 — Rick W. Allen (REP, incumbent)
  {
    district: "12",
    name: "Rick W. Allen",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Ceretta Smith",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 13 — VACANT: David Scott (DEM incumbent) died April 22, 2026;
  // seat vacant, separate July 28, 2026 special election pending (out of
  // scope — see docblock). Neither regular-cycle nominee is an incumbent.
  {
    district: "13",
    name: "Jonathan Chavez",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Jasmine Clark",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 14 — Clay Fuller (REP, incumbent — won the special election to
  // fill Marjorie Taylor Greene's vacated seat; the primary portal's own
  // data omitted his incumbent tag, corrected here per house.gov).
  {
    district: "14",
    name: "Clay Fuller",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Shawn Harris",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const GA_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Mike Collins",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Jon Ossoff",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];

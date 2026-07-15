/**
 * scripts/congressional-rosters/co-official-roster-2026.ts
 *
 * Colorado's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 8 US House districts and the 2026 US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), Alabama,
 * and Alaska, epic c5a813bb; this is Colorado's build (card "[P0] Import +
 * verify official roster: Colorado (CO)").
 *
 * COLORADO-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/colorado-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Colorado's June 30, 2026 primary had ALREADY OCCURRED as of this
 *     fixture's transcription (2026-07-15) — unlike AZ/AK's pre-primary
 *     builds, CO is a general-ballot state: every major-party seat has a
 *     determined nominee, not a still-open primary field. CO_STAGE =
 *     "general".
 *   - NOT Civix — Colorado's official candidate/results infrastructure is
 *     two separate coloradosos.gov static-HTML/JSON systems, neither
 *     matching the `<subdomain>.<state>elections.civixapps.com` pattern:
 *     (1) a static server-rendered HTML candidate-list page
 *     (sos.state.co.us/pubs/elections/vote/primaryCandidates.html, the
 *     PRIMARY filer list, i.e. every candidate who ran in the June 30
 *     primary — NOT the general-ballot nominee list); (2) the primary
 *     RESULTS live on Colorado's "Clarity Elections" ENR (Election Night
 *     Reporting) platform (results.enr.clarityelections.com/CO/126592/),
 *     a different SPA vendor from Civix. Unlike Civix, Clarity's underlying
 *     JSON API is trivially discoverable and directly fetchable with no
 *     browser automation needed: hit `<base>/current_ver.txt` for the
 *     current results-version number, then
 *     `<base>/<version>/json/en/summary.json` for full per-contest results
 *     (candidate names, vote counts, percentages) and
 *     `<base>/<version>/json/en/electionsettings.json` for reporting-
 *     completeness metadata (`stateprecinctsreporting` /
 *     `stateprecinctsparticipating` — both 1924/1924 at retrieval, i.e.
 *     100% reporting, not a live/partial count). This CO build never needed
 *     `mcp__claude-in-chrome__*` browser automation at all.
 *   - Live-source access note: both coloradosos.gov and
 *     results.enr.clarityelections.com hit the same TLS trap AK's site did
 *     ("unable to get local issuer certificate", confirmed via `curl -v`,
 *     reproducible outside any tool sandbox) — `WebFetch` 403s on the SoS
 *     site outright. Retrieval used `curl -sk` (TLS verification bypassed,
 *     read-only GETs only) for every fetch in this build.
 *   - THE GENERAL-BALLOT ROSTER HAD TO BE DERIVED, same structural gap
 *     Texas's build hit: there is no single SoS-published "2026 General
 *     Candidate List" page/file yet (probed `generalCandidates.html` and a
 *     `2026GeneralCandidateListOfficial.xlsx` guess directly off the
 *     primary list's own URL pattern — both 404). The general-ballot roster
 *     is derived from two determined official sources plus one explicitly
 *     undetermined one:
 *     (1) Major-party (Democratic/Republican) nominees = the June 30
 *     primary's certified winner per contest (or the sole filer, if
 *     unopposed) — sourced from the Clarity ENR `summary.json` above,
 *     100% precincts reporting. Cross-checked candidate-by-candidate against
 *     independent news reporting for the two closest/most consequential
 *     races confirms the JSON is accurate: CPR.org/NBC News/PBS/Axios all
 *     independently reported Melat Kiros defeating 30-year incumbent Diana
 *     DeGette in CD-1's Democratic primary (matches JSON: Kiros 53.19%,
 *     DeGette 39.78%), and CPR.org reported Jeff Hurd defeating Ron Hanks
 *     ~67%-33% in CD-3's Republican primary (matches JSON almost exactly:
 *     66.35%/33.65%). Recorded as `qualified_for_general_ballot`.
 *     (2) Unaffiliated (UAF) candidates who petitioned onto the general
 *     ballot — sourced from the official SoS "2026 General Election
 *     Candidates With Approved Petition Formats" page
 *     (coloradosos.gov/pubs/elections/vote/generalPetitionCandidates.html).
 *     As of retrieval, every UAF petition row for a US House seat (5 total:
 *     CD-1, CD-3, CD-4, CD-6, CD-7; no UAF Senate filer) had a "Filed" date
 *     but an EMPTY "Sufficient" column — signature verification was still
 *     pending, not yet certified for the general ballot. This is
 *     structurally the same preliminary-filing stage the existing
 *     `declared_general_ballot_intent` status was built for (TX's
 *     independent-declaration track) — reused here rather than inventing a
 *     new status, and recorded with party "IND" (Colorado's "UAF" ballot
 *     designation collapses to the same existing FEC-side code TX/OK's
 *     declared independents use).
 *     (3) Minor-party (e.g. Libertarian) candidates — KNOWN LIMITATION, see
 *     below. NOT included in this fixture.
 *   - KNOWN LIMITATION — minor-party candidates excluded, not silently
 *     omitted: Colorado's Libertarian Party (and other minor parties)
 *     nominate by party assembly, not primary or SoS-run petition, per
 *     coloradosos.gov/pubs/elections/Candidates/MinorPartyAssembly.html.
 *     That page describes the process (candidates file a "Certificate of
 *     Designation by Assembly" with the SoS) but the SoS's public website
 *     publishes only the BLANK template form, not a consolidated list of
 *     which candidates were actually designated this cycle — searched
 *     extensively (site-scoped search, FormsList.html, BallotAccess.html,
 *     the primary/petition candidate list pages) and found no equivalent
 *     "minor party general candidates" page or file (unlike the UAF
 *     petition-candidates page, which does exist). Secondary sources (the
 *     Libertarian Party of Colorado's own site, national news aggregators)
 *     indicate LP Colorado fielded candidates in all 8 US House districts
 *     plus US Senate this cycle, but per the plan doc's SAFETY rule
 *     ("official-source reads only... a blocked/unpublished/ambiguous
 *     official source stays explicit, never guessed") this build does not
 *     transcribe a party's self-published list as if it were SoS-certified.
 *     A follow-up session could resolve this via TRACER
 *     (tracer.sos.colorado.gov), CO's official campaign-finance system,
 *     which registers all federal candidate committees including minor
 *     parties — not attempted this session (likely an ASP.NET-webforms
 *     portal requiring session/viewstate handling, out of scope for this
 *     build's time budget).
 *   - INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from the SoS candidate list's own signals or
 *     from this app's own FEC-derived `candidates` table: (1) house.gov's
 *     "By State and District" member directory (fetched directly via
 *     `curl`, not `WebFetch` — the latter 403'd; the page is a single large
 *     alphabetical-by-surname table, not grouped by state, so extraction
 *     parsed every row rather than jumping to a per-state anchor) confirms
 *     Colorado's 8 sitting Representatives as of retrieval: DeGette (D,
 *     CD-1), Neguse (D, CD-2), Hurd (R, CD-3), Boebert (R, CD-4), Crank (R,
 *     CD-5), Crow (D, CD-6), Pettersen (D, CD-7), Evans (R, CD-8).
 *     (2) senate.gov's senator directory confirms Hickenlooper (D) holds
 *     Colorado's Class II Senate seat (the one up in 2026), term expiring
 *     2027; Colorado's other seat (Bennet, Class III) is not up until 2029.
 *     CRITICAL: Diana DeGette is the sitting CD-1 incumbent per house.gov,
 *     but she LOST her Democratic primary (see above) — she is NOT a
 *     candidate on the Nov 3 general ballot at all, so CD-1's general
 *     contest has NO incumbent on either side (`isIncumbent: false` for
 *     both Kiros and Peterson). Every other district's/Senate's primary
 *     winner or unopposed nominee who IS the sitting house.gov/senate.gov
 *     incumbent is marked `isIncumbent: true`; challengers are `false`.
 *   - A certified primary WRITE-IN filer who did not win is not carried
 *     forward: Jenna Preston filed as a certified write-in candidate in
 *     CD-4's Democratic primary (per the primary candidate list's "Write
 *     in?" column), but the Clarity results show the on-ballot candidate,
 *     Eileen Laubacher, took 100% of the tallied primary vote — write-in
 *     votes were not separately reported, meaning Preston did not
 *     accumulate a certified vote total and is not the nominee.
 *   - The Republican Party's District 6 nominee, Jason Clark, is a
 *     mid-cycle replacement, not the original primary-ballot name: per the
 *     primary candidate list's own explanatory note, Mel Tewahade withdrew
 *     his CD-6 Republican candidacy on 2026-06-24, and the party nominated
 *     Jason Clark to fill the vacancy under section 1-4-1004(4)(b), C.R.S.
 *     (all primary votes cast for Tewahade counted for Clark). The Clarity
 *     JSON's CD-6 Republican Party result already reflects Clark at 100%,
 *     confirming this is the correct, current nominee.
 *
 * Sources:
 *   - https://www.coloradosos.gov/pubs/elections/vote/primaryCandidates.html
 *     (2026 Official Primary Election Candidate List — every filer for the
 *     June 30 primary, all offices; certified to counties May 1, 2026)
 *   - https://results.enr.clarityelections.com/CO/126592/ (Colorado's
 *     Clarity Elections ENR portal for the June 30, 2026 primary; JSON data
 *     fetched at https://results.enr.clarityelections.com/CO/126592/377222/json/en/summary.json
 *     and .../377222/json/en/electionsettings.json — version 377222 was
 *     current as of 2026-07-15, `websiteupdatedat` "7/14/2026 4:30:39 PM
 *     MDT", 1924/1924 precincts reporting)
 *   - https://www.coloradosos.gov/pubs/elections/vote/generalPetitionCandidates.html
 *     (2026 General Election Candidates With Approved Petition Formats —
 *     the UAF/unaffiliated petition-track candidates)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check)
 *   - https://www.senate.gov/senators/index.htm (senator directory,
 *     incumbency cross-check)
 *
 * Coverage: all 8 US House districts + the US Senate race. Major-party
 * nominees are `qualified_for_general_ballot` (determined); UAF petition
 * filers are `declared_general_ballot_intent` (signature verification
 * pending at retrieval); minor-party candidates are not included (see KNOWN
 * LIMITATION above).
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const CO_STATE = "CO";
export const CO_ELECTION_YEAR = 2026;
// Colorado's June 30, 2026 primary had already occurred at transcription
// time (2026-07-15) — every major-party seat has a determined nominee. See
// docblock's derivation note for how the general-ballot roster was built.
export const CO_STAGE = "general" as const;
export const CO_HOUSE_SOURCE_URLS = [
  "https://www.coloradosos.gov/pubs/elections/vote/primaryCandidates.html",
  "https://results.enr.clarityelections.com/CO/126592/",
  "https://www.coloradosos.gov/pubs/elections/vote/generalPetitionCandidates.html",
];
export const CO_SENATE_SOURCE_URLS = [
  "https://www.coloradosos.gov/pubs/elections/vote/primaryCandidates.html",
  "https://results.enr.clarityelections.com/CO/126592/",
];
export const CO_RETRIEVED_AT = "2026-07-15";

export const CO_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 1 — Diana DeGette (D, sitting incumbent) LOST her primary to
  // Melat Kiros; no incumbent appears in this general-ballot contest.
  {
    district: "01",
    name: "Melat Kiros",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Christy Peterson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Shimon Blau",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 2 — Joe Neguse (D) unopposed in primary, sitting incumbent.
  {
    district: "02",
    name: "Joe Neguse",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Kelley Anne Dennison",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 3 — Jeff Hurd (R) sitting incumbent, won primary.
  {
    district: "03",
    name: "Dwayne L. Romero",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Jeff Hurd",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Clifton Brown",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 4 — Lauren Boebert (R) sitting incumbent, unopposed in primary.
  {
    district: "04",
    name: "Eileen Laubacher",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Lauren Boebert",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Timothy M. Veldhuizen",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 5 — Jeff Crank (R) sitting incumbent, unopposed in primary.
  {
    district: "05",
    name: "Jessica Killin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Jeff Crank",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 6 — Jason Crow (D) sitting incumbent, unopposed in primary.
  // Republican nominee Jason Clark replaced withdrawn candidate Mel
  // Tewahade (see docblock).
  {
    district: "06",
    name: "Jason Crow",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Jason Clark",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Samir Ezzeldin Witta",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 7 — Brittany Pettersen (D) sitting incumbent, unopposed in
  // primary.
  {
    district: "07",
    name: "Brittany Pettersen",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Tim Bennett",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Joe Krzeczkowski",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 8 — Gabe Evans (R) sitting incumbent, unopposed in primary.
  {
    district: "08",
    name: "Manny Rutinel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Gabe Evans",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const CO_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // John Hickenlooper (D) sitting incumbent (Class II seat, term expiring
  // 2027), won his primary against Julie Gonzales.
  {
    district: null,
    name: "John Hickenlooper",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Mark Baisley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

/**
 * scripts/congressional-rosters/ok-official-roster-2026.ts
 *
 * Oklahoma's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 5 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583) and Texas (card 8530a468, epic c5a813bb); this is
 * Oklahoma's build (card d9b1ef86).
 *
 * OKLAHOMA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/oklahoma-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Oklahoma's official candidate/election source is NOT Civix-vended
 *     (oklahoma.gov / okelections.gov, not *.civixapps.com) - the Civix
 *     portal playbook in the nationwide roster plan doc does not apply
 *     here; this is a materially different, easier source.
 *   - Candidate SET (who filed) came from the State Election Board's
 *     static "2026 Candidates for Elective Office" PDF list book - a real
 *     text-layer PDF (confirmed via pypdf extraction, not a scanned
 *     image), listing every candidate who filed April 1-3, 2026 by office
 *     and party.
 *   - General-ballot NOMINEES had to be DERIVED, not read directly, because
 *     Oklahoma's June 16, 2026 primary already happened by the time this
 *     was built (mid-July): the official results portal
 *     (results.okelections.gov) was queried for each contested primary,
 *     and Oklahoma's statutory majority rule (26 O.S. Sec. 1-103: a
 *     candidate must win an outright majority - 50% + 1 - of their party's
 *     primary vote, or the top two vote-getters advance to an August
 *     runoff) was applied to each race to determine the nominee.
 *   - UNLIKE Texas's Civix portal, results.okelections.gov rendered every
 *     race as plain server-rendered HTML on ONE page load - no JS SPA, no
 *     virtualized scroll, no 403 on a plain fetch tool. It DID 403 on
 *     WebFetch specifically (needs a real browser session/referer), but a
 *     single `get_page_text` browser call after navigating returned every
 *     race's full candidate/vote/percent breakdown in one shot. A party
 *     with only one filer (no primary contest) does not appear in the
 *     results at all - Oklahoma does not hold a primary for an unopposed
 *     candidate; the sole filer is the nominee automatically.
 *   - TWO PARTY-SEAT NOMINATIONS ARE UNDETERMINED pending Oklahoma's
 *     August 25, 2026 runoff primary (confirmed the 4th Tuesday of August
 *     per 26 O.S. Sec. 1-103; today, at transcription time, is July 15,
 *     2026 - the runoff has NOT happened yet): the US Senate Democratic
 *     nomination (Thomas 45.19% vs. Priest 23.85%, no majority) and the
 *     OK-1 Republican nomination (Tedford 32.15% vs. Lahmeyer 25.88%, no
 *     majority, 11-candidate field). Both finalists for each are recorded
 *     with ballotStatus "runoff_pending" - NEITHER is promoted to
 *     qualified_for_general_ballot; that would be guessing an outcome not
 *     yet decided, which the epic's SAFETY rule explicitly forbids (this
 *     is the exact TX-incident-shaped mistake the card calls out by name).
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the filing PDF or the results portal:
 *     (1) house.gov's "By State and District" directory (Oklahoma section)
 *     confirms the sitting House delegation is Hern (OK-1), Brecheen
 *     (OK-2), Lucas (OK-3), Cole (OK-4), Bice (OK-5).
 *     (2) senate.gov's Oklahoma state page + the Congressional Bioguide
 *     (bioguide.congress.gov/search/bio/A000383) confirm Oklahoma's
 *     Class II Senate seat (the one on the 2026 ballot) is currently held
 *     by Alan Armstrong, appointed March 24, 2026 to fill the vacancy
 *     caused by Markwayne Mullin's resignation - NOT Mullin, who had
 *     already resigned by the time this was built. This matters because
 *     it changes the incumbency finding entirely: Armstrong does not
 *     appear anywhere in the Senate candidate filings (Republican,
 *     Democrat, Libertarian, or Independent) - he is not seeking
 *     election to keep the seat, so the 2026 Senate race is an OPEN SEAT,
 *     not an incumbent-defends race. (Kevin Hern, the winning Senate
 *     Republican primary candidate, is instead the SITTING OK-1
 *     REPRESENTATIVE - he did not file for re-election to his House seat,
 *     which is why OK-1 has no incumbent in its filing list and produced
 *     an 11-candidate open-seat Republican primary.)
 *   - Independent candidates: Oklahoma's filing process folds the
 *     independent nominating-petition requirement (26 O.S., 2% of
 *     registered voters in the relevant district/state, submitted in lieu
 *     of a filing fee) into the SAME April 1-3 filing window as party
 *     candidates - there is no separate later-stage "declaration of
 *     intent" document like Texas's. Whether the State Election Board had
 *     fully verified each independent's petition signature count as of
 *     this list's publication (vs. simply accepting the filing) could not
 *     be confirmed from the official sources read this session - so,
 *     consistent with the AZ/TX fixtures' conservative posture,
 *     independents here are recorded as "declared_general_ballot_intent"
 *     rather than "qualified_for_general_ballot".
 *   - No Libertarian or Green Party candidate filed for any US House seat;
 *     one Libertarian (Sevier White) filed for US Senate, unopposed in
 *     that party's primary (no Green Party filings found anywhere in the
 *     official congressional filing list - not omitted, verified absent).
 *
 * Sources:
 *   - https://oklahoma.gov/content/dam/ok/en/elections/candidate-filing-archives/2026-candidate-filing-archives/2026-candidate-list-book.pdf
 *     (State Election Board's official 2026 candidate filing list - who
 *     filed, by office/party/district)
 *   - https://results.okelections.gov/OKER/?elecDate=20260616
 *     (State Election Board's official June 16, 2026 primary election
 *     results - certified vote totals used to derive each party's
 *     general-ballot nominee per seat, or identify a pending runoff)
 *   - https://www.house.gov/representatives (119th Congress Oklahoma
 *     delegation, "By State and District" - incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://www.senate.gov/states/OK/intro.htm and
 *     https://bioguide.congress.gov/search/bio/A000383 (Oklahoma's
 *     current Class II senator - incumbency cross-check only)
 *
 * Coverage: all 5 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Two nominations are undetermined pending the August 25, 2026 runoff
 *     (US Senate - Democrat; OK-1 - Republican) - see "runoff_pending"
 *     entries above. This fixture will need a follow-up update once the
 *     runoff is certified.
 *   - Independent filers' petition-verification status as of this list's
 *     publication is unconfirmed from the official sources read this
 *     session - recorded as "declared_general_ballot_intent" (see above),
 *     an open item flagged for Muxin same as AZ's and TX's equivalent
 *     gaps.
 *   - Names are recorded as they appear in the official filing list /
 *     results portal; not independently re-verified against a third
 *     document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const OK_STATE = "OK";
export const OK_ELECTION_YEAR = 2026;
export const OK_STAGE = "general" as const;
export const OK_HOUSE_SOURCE_URLS = [
  "https://oklahoma.gov/content/dam/ok/en/elections/candidate-filing-archives/2026-candidate-filing-archives/2026-candidate-list-book.pdf",
  "https://results.okelections.gov/OKER/?elecDate=20260616",
];
export const OK_SENATE_SOURCE_URLS = [
  "https://oklahoma.gov/content/dam/ok/en/elections/candidate-filing-archives/2026-candidate-filing-archives/2026-candidate-list-book.pdf",
  "https://results.okelections.gov/OKER/?elecDate=20260616",
];
export const OK_RETRIEVED_AT = "2026-07-15";

// OK-1 is an open seat: Kevin Hern, the sitting representative, filed for
// US Senate instead of re-election to his House seat (confirmed absent
// from the OK-1 filing list; confirmed as the Senate Republican primary
// winner below). No other OK House district lost its incumbent.
export const OK_OPEN_SEAT_DISTRICTS = ["01"];

// Both nominations still pending Oklahoma's August 25, 2026 runoff primary
// as of this fixture's retrieval date (2026-07-15) - see KNOWN LIMITATIONS.
export const OK_RUNOFF_PENDING_CONTESTS = [
  { office: "senate" as const, district: null, party: "DEM" as const },
  { office: "house" as const, district: "01", party: "REP" as const },
];

export const OK_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — open seat (Hern running for Senate instead); Republican
  // nomination undetermined pending the Aug 25 runoff (Tedford 32.15% vs.
  // Lahmeyer 25.88% of an 11-candidate field, no majority).
  {
    district: "01",
    name: "MARK TEDFORD",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "01",
    name: "JACKSON LAHMEYER",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  // Sole Democratic filer — automatic nominee, no primary held.
  {
    district: "01",
    name: "JOHN CROISANT",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Brecheen (incumbent) won the Republican primary outright
  // (79.20%); Wade won the Democratic primary outright (73.73%).
  {
    district: "02",
    name: "JOSH BRECHEEN",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "BRANDON WADE",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "RONNIE HOPKINS",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 03 — Lucas (incumbent) won the Republican primary outright
  // (70.77%); Byrd won the Democratic primary outright (67.43%).
  {
    district: "03",
    name: "FRANK D. LUCAS",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "SUZIE BYRD",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — Cole (incumbent) won the Republican primary outright
  // (71.12%); Jacob won the Democratic primary outright (54.44%).
  {
    district: "04",
    name: "TOM COLE",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "MITCHELL JACOB",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "ROCCO BONACCI",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 05 — Bice (incumbent), sole Republican filer, automatic
  // nominee, no primary held; Nelson won the Democratic primary outright
  // (56.75%).
  {
    district: "05",
    name: "STEPHANIE BICE",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "JENA NELSON",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "ROBERT P. HENRI",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "05",
    name: "AUSTIN NIEVES",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

export const OK_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: the sitting senator (Alan Armstrong, appointed 2026-03-24
  // to fill Markwayne Mullin's resignation) did not file for election to
  // keep the seat — no incumbent below.
  // Hern (sitting OK-1 Representative) won the Republican primary outright
  // (69.76%).
  {
    district: null,
    name: "KEVIN HERN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Democratic nomination undetermined pending the Aug 25 runoff (Thomas
  // 45.19% vs. Priest 23.85%, no majority of a 5-candidate field).
  {
    district: null,
    name: "N'KIYLA JASMINE THOMAS",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: null,
    name: "JIM PRIEST",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  // Sole Libertarian filer — automatic nominee, no primary held.
  {
    district: null,
    name: "SEVIER WHITE",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "CURTIS STINNETT",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "RON MEINHARDT",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

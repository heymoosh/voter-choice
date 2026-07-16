/**
 * scripts/congressional-rosters/or-official-roster-2026.ts
 *
 * Oregon's 2026 official congressional roster — hand-transcribed from the
 * Oregon Secretary of State's own official primary-results abstract and the
 * ORESTAR candidate-filing system (not FEC filings). Built through the same
 * manual official-source pipeline as Arizona, Texas, Oklahoma, Alabama,
 * Alaska, Colorado, California, Arkansas, Delaware, Florida, Hawaii,
 * Louisiana, Maine, Indiana, Georgia, Iowa, Kansas, Idaho, Maryland, and
 * Kentucky, epic c5a813bb; this is Oregon's (22nd+) build.
 *
 * OREGON-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/oregon-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Oregon's official source is the state-run ORESTAR system
 *     (secure.sos.state.or.us/orestar). Unlike the donor-ingest script's
 *     experience with a different ORESTAR endpoint (contribution search,
 *     which needs a rendered browser per that script's own comment), this
 *     build's endpoint — the public "Candidate Filing Search"
 *     (CFSearchPage.do / cfFilings.do) — rendered cleanly for a plain
 *     WebFetch too; browser automation (mcp__claude-in-chrome__*) was used
 *     regardless, for reliability driving the cascading office/election
 *     dropdowns (selecting "Election" repopulates the "Filing for Office
 *     of" options via AJAX, which invalidates element references — each
 *     dropdown had to be read fresh after the prior one was set).
 *   - Oregon's May 19, 2026 primary is already PAST at transcription time
 *     (2026-07-16) — this is a GENERAL-stage roster: `OR_STAGE = "general"`.
 *     Winners were derived from the Secretary of State's own official
 *     "2026 May Primary Election Official Results.PDF" abstract of votes
 *     (county-by-county totals per contest, viewed via
 *     records.sos.state.or.us's document viewer — a real text-layer PDF,
 *     not an image scan; `pdftotext -layout` was used locally on the
 *     downloaded copy of the companion 2026 Elections Calendar PDF for the
 *     governing-date extraction below, since that particular document
 *     rendered in Chrome's native canvas-based PDF viewer with no
 *     accessible text layer for the browser tool's page-text extraction).
 *   - Independently, ORESTAR's own "Candidate Filing Search" for the "2026
 *     General Election" — searched separately by office (US Representative:
 *     12 results; US Senator: 2 results) — confirms the exact same 14
 *     candidates as the primary-results abstract, each row showing
 *     `Filing Method: Nominated`, `Filing Date: 06/25/2026`, `Qualified:
 *     Yes`. 06/25/2026 matches the Secretary of State's own 2026 Elections
 *     Calendar entry "Last day for Secretary of State to canvass votes,
 *     prepare and deliver register of nomination, certificates of election
 *     ... [Primary]" — i.e. Oregon's primary winners are mechanically
 *     carried onto the general-election candidate list on certification,
 *     with no separate nomination filing by the candidate. This two-source
 *     agreement (results abstract + ORESTAR's own post-certification
 *     candidate list) is stronger corroboration than either source alone.
 *   - NO independent, minor-party, or write-in candidate has filed for any
 *     Oregon federal contest as of this build's retrieval date. This is
 *     CONFIRMED, not inferred from absence: ORESTAR's Candidate Filing
 *     Search for the "2026 General Election" returns exactly 12 US
 *     Representative filings (6 districts × 2 major parties) and exactly 2
 *     US Senator filings — no more. Per the Secretary of State's 2026
 *     Elections Calendar, the window for a nonaffiliated or minor-party
 *     candidate to file a certificate of nomination for the general
 *     election opened June 3, 2026 and remains open through August 18,
 *     2026 (elected incumbents) / August 25, 2026 (everyone else) — i.e.
 *     STILL OPEN as of this fixture's 2026-07-16 retrieval date. A future
 *     recheck after August 25, 2026 could surface additional general-ballot
 *     rows; none are guessed here. See the dated follow-up card (backlog).
 *   - Because no non-major-party candidate has filed, this build required
 *     NO new party code in types.ts — every row here is "DEM" or "REP".
 *   - ALL SIX House incumbents won their own primary and are the
 *     determined nominee for their own seat — NO open seats, unlike KY's
 *     two-open-seat build or ME's Golden-retirement open seat. Every
 *     Republican primary in every district that had one (CD1, CD2, CD5)
 *     was genuinely contested — this is not a state where only one party
 *     fields a candidate.
 *   - CD5 resolves a real pre-build ambiguity flagged by the task brief:
 *     news coverage ahead of the primary named four possible Republican
 *     CD5 contenders (Patti Adair, Jonathan Lockwood, Jo Rae Perkins,
 *     Joseph Lehman). The official primary-results abstract for CD5 shows
 *     only TWO Republican candidates on the ballot — Patti Adair (43,524
 *     votes, winner) and Jonathan Lockwood (28,984 votes) — Jo Rae Perkins
 *     was in fact a candidate in the SEPARATE US Senate Republican primary
 *     (see below), not CD5; Joseph Lehman does not appear on any official
 *     2026 federal primary ballot in Oregon. Patti Adair is recorded as
 *     CD5's Republican nominee on the strength of the official results
 *     abstract, not the pre-primary news speculation.
 *   - US SENATE: Jeff Merkley (D, incumbent — confirmed via senate.gov's
 *     Oregon state page, which lists Merkley alongside Ron Wyden as
 *     Oregon's two sitting senators; Wyden's seat is not up in 2026) won
 *     the Democratic primary outright (457,006 of ~490,457 votes cast,
 *     ~93.2%) over Paul Damian Wells. David Brock Smith won a genuinely
 *     contested 7-candidate Republican primary (107,953 votes) over the
 *     closest competitor, Jo Rae Perkins (99,278 votes) — a real but not
 *     landslide margin (~8,700 votes) confirmed directly from the
 *     abstract's county-by-county totals, not inferred from partial
 *     returns.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the ORESTAR filing list or this app's FEC-derived
 *     `candidates` table:
 *     (1) house.gov's "By State and District" directory (Oregon section,
 *     confirmed 2026-07-16) lists the sitting delegation as Bonamici
 *     (OR-1), Bentz (OR-2), Dexter (OR-3), Hoyle (OR-4), Bynum (OR-5),
 *     Salinas (OR-6) — an exact match to every district's primary winner
 *     above, confirming zero open seats.
 *     (2) senate.gov's Oregon state page confirms Jeff Merkley and Ron
 *     Wyden as the two sitting senators; Merkley holds the seat up in
 *     2026.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const OR_STATE = "OR";
export const OR_ELECTION_YEAR = 2026;
// The May 19, 2026 primary is already past at transcription time
// (2026-07-16) — every row below is a determined general-ballot nominee,
// mechanically carried forward from the certified primary result (see the
// docblock's ORESTAR "Filing Method: Nominated" note), not a primary-stage
// filer list.
export const OR_STAGE = "general" as const;
export const OR_HOUSE_SOURCE_URLS = [
  // Official primary-results abstract of votes (all 6 US House districts,
  // county-by-county), viewed via the Secretary of State's document viewer.
  "https://records.sos.state.or.us/ORSOSCMSearch/Search/RecordViewer.aspx?uri=16180585",
  // ORESTAR's own post-certification "2026 General Election" candidate
  // list, searched by office — corroborates the abstract independently and
  // confirms zero independent/minor-party/write-in House filers to date.
  "https://secure.sos.state.or.us/orestar/CFSearchPage.do",
  // Incumbency cross-check (not an Oregon source, cited because it
  // materially confirmed every isIncumbent value below).
  "https://www.house.gov/representatives",
];
export const OR_SENATE_SOURCE_URLS = [
  "https://records.sos.state.or.us/ORSOSCMSearch/Search/RecordViewer.aspx?uri=16180585",
  "https://secure.sos.state.or.us/orestar/CFSearchPage.do",
  // Incumbency cross-check.
  "https://www.senate.gov/states/OR/intro.htm",
];
export const OR_RETRIEVED_AT = "2026-07-16";

export const OR_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // CD1 — Bonamici (incumbent) won the Democratic primary over a
  // contested challenger (Jamil O Ahmad); Kahl won a genuinely contested
  // Republican primary over John Verbeek.
  {
    district: "01",
    name: "Suzanne Bonamici",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Barbara J Kahl",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD2 — Beck won a crowded 6-candidate Democratic primary; Bentz
  // (incumbent) won the Republican primary over two challengers.
  {
    district: "02",
    name: "Chris Beck",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Cliff Bentz",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD3 — Dexter (incumbent) won a contested Democratic primary; Ayles ran
  // unopposed in the Republican primary.
  {
    district: "03",
    name: "Maxine E Dexter",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Loran Ayles",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD4 — Hoyle (incumbent) won a contested Democratic primary; DeSpain
  // won a contested Republican primary.
  {
    district: "04",
    name: "Val Hoyle",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Monique DeSpain",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD5 — Bynum (incumbent) won the Democratic primary; Adair won the
  // Republican primary over Lockwood (see docblock — resolves the
  // pre-primary 4-name ambiguity down to the 2 candidates who actually
  // appeared on the official CD5 Republican primary ballot).
  {
    district: "05",
    name: "Janelle S Bynum",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Patti Adair",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD6 — Salinas (incumbent) and Russ each ran unopposed in their
  // respective primaries.
  {
    district: "06",
    name: "Andrea Salinas",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "David Russ",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const OR_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Merkley (incumbent) won the Democratic primary outright (~93.2%, no
  // runoff needed).
  {
    district: null,
    name: "Jeff Merkley",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Smith won a genuinely contested 7-candidate Republican primary over
  // Jo Rae Perkins (~8,700-vote margin — see docblock).
  {
    district: null,
    name: "David Brock Smith",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

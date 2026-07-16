/**
 * scripts/congressional-rosters/wi-official-roster-2026.ts
 *
 * Wisconsin's 2026 official congressional roster for the August 11, 2026
 * Partisan Primary / November 3, 2026 General Election — covers all 8 US
 * House districts. Built through the same manual official-source pipeline
 * as AZ/TX/OK/AL and ~18 other states (epic c5a813bb); this is Wisconsin's
 * build.
 *
 * WISCONSIN-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/wisconsin-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Wisconsin's official source is NOT Civix-vended — a static,
 *     real-text-layer PDF from the Wisconsin Elections Commission (WEC),
 *     40 pages, confirmed via pypdf extraction (no scanned/image-only
 *     pages found; every page in the true page-count range was accounted
 *     for per the plan doc's scanned-PDF gotcha rule).
 *   - Wisconsin has NO 2026 US Senate contest: Wis. Stat. § 8.25(2) sets
 *     WI's two Senate classes on 6-year cycles anchored at 1962 and 1964;
 *     neither 1962+6n nor 1964+6n equals 2026. Confirmed independently by
 *     the complete absence of any "United States Senator"/"Senate" federal
 *     office section in the WEC's own ballot access report. House-only
 *     fixture, as expected.
 *   - This is a PRE-primary build (Aug 11, 2026 Partisan Primary has not
 *     yet happened as of the 2026-07-16 transcription date) — every
 *     recognized-party (DEM/REP/WGR) filer is recorded as
 *     `qualified_for_primary_ballot`, including unopposed ones, mirroring
 *     AZ's precedent of not prematurely promoting an uncontested filer to
 *     nominee status before the WEC's own Aug 26, 2026 primary
 *     certification (see the data-check doc's calendar section).
 *   - WISCONSIN GREEN (WGR) IS A BALLOT-STATUS PARTY, NOT A GENERIC
 *     INDEPENDENT: confirmed via a second official WEC document (the
 *     2026-2027 partisan-election ballot-order memo) listing Wisconsin's
 *     five ballot-status recognized parties as REP, DEM, CON, LIB, WGR.
 *     Wisconsin Green's sole CD6 filer therefore appears on the Aug 11
 *     primary ballot (unopposed) exactly like a D/R filer, NOT routed
 *     through the independent track below.
 *   - INDEPENDENTS BYPASS THE PRIMARY ENTIRELY AND ARE ALREADY FINAL-
 *     CERTIFIED FOR THE GENERAL BALLOT — a materially different situation
 *     from TX's/CO's/OK's `declared_general_ballot_intent` independents,
 *     whose petition-signature verification was still pending or
 *     unconfirmed at transcription time. Wisconsin's independents undergo
 *     the SAME nomination-paper sufficiency review as party candidates
 *     (same "Approve"/"Deny"/"Challenged" adjudication in the same WEC
 *     report), and the WEC's own June 9, 2026 report is explicit:
 *     "Recommended Motion #2: The 11 candidates not representing
 *     ballot-status parties marked 'approved' ... are approved for ballot
 *     access for the November 3, 2026 General Election" — a final
 *     certification, not a preliminary declaration. Recorded here as
 *     `qualified_for_general_ballot` accordingly (they do not appear on
 *     the Aug 11 primary ballot at all).
 *   - FOUR CANDIDATES WERE "CHALLENGED" (PENDING) IN THE JUNE 8, 2026
 *     SNAPSHOT REPORT AND HAD TO BE RESOLVED FROM A SEPARATE, MORE CURRENT
 *     SOURCE: the ballot access report itself is a pre-meeting staff
 *     recommendation memo dated June 8, 2026 — stale by five weeks
 *     relative to this build's 2026-07-16 transcription date. All four
 *     challenges were independently confirmed GRANTED (candidate keeps
 *     ballot access) via the WEC's own APPROVED Open Session Minutes for
 *     the June 9, 2026 meeting (CD3's Rustin Provance, CD6's Elizabeth
 *     Anne Fitzgibbon, CD8's Mark Scheffler x2 challenges) and the WEC's
 *     June 10, 2026 extension-challenges memo (CD7's Fred Clark, Kevin
 *     Hermening, Michael Alfonso) — see Sources below. No candidate was
 *     denied on a challenge; all four kept ballot access.
 *   - CD7 IS AN OPEN SEAT: the WEC report lists "Incumbent: Tom Tiffany"
 *     as a header (he is the sitting representative), but Tiffany does NOT
 *     appear anywhere in CD7's candidate list — he filed for Governor
 *     instead (confirmed as a Republican gubernatorial filer on the same
 *     report, and independently corroborated by contemporaneous Wisconsin
 *     press coverage of the CD7 race). No CD7 candidate is marked
 *     `isIncumbent: true`.
 *   - INCUMBENCY was cross-checked against house.gov's "By State and
 *     District" directory (Wisconsin section) via a live browser session —
 *     confirmed to match the WEC report's own "Incumbent:" field exactly
 *     for all 8 districts (Steil-1, Pocan-2, Van Orden-3, Moore-4,
 *     Fitzgerald-5, Grothman-6, Tiffany-7 [not seeking re-election, see
 *     above], Wied-8) — no discrepancy found, unlike OK's Armstrong/Mullin
 *     Senate case.
 *   - DENIED filers are excluded from this fixture entirely (they will not
 *     appear on any ballot) — `OfficialBallotStatus` has no "denied"
 *     value, matching every prior state's convention.
 *
 * Sources:
 *   - https://elections.wi.gov/sites/default/files/documents/D.%20Ballot%20Access%20Report%206.9.2026.pdf
 *     (WEC staff's June 8, 2026 ballot-access recommendation report for
 *     the June 9, 2026 Commission meeting — primary candidate-set source)
 *   - https://elections.wi.gov/sites/default/files/documents/June%209%2C%202026%2C%20Open%20Session%20Minutes%20APPROVED.pdf
 *     (WEC's own approved minutes resolving CD3/CD6/CD8 challenges)
 *   - https://elections.wi.gov/sites/default/files/documents/June%2010%20Extentions%20Ballot%20Access%20Challenge%20Memo__pagenumber.pdf
 *     (WEC's own challenge memo resolving all three CD7 challenges)
 *   - https://www.house.gov/representatives (119th Congress Wisconsin
 *     delegation, "By State and District" — incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://docs.legis.wisconsin.gov/document/statutes/8.25 (Wis. Stat.
 *     § 8.25(2) — confirms no WI Senate class is up in 2026)
 *
 * Coverage: all 8 US House districts. Zero US Senate contests in 2026 (see
 * above) — no senate rows.
 *
 * KNOWN LIMITATIONS:
 *   - Names are recorded as they appear in the official WEC report; not
 *     independently re-verified against a third document.
 *   - This fixture reflects ballot access as of the Aug 11, 2026 Partisan
 *     Primary stage. Whichever nominee wins each contested primary will
 *     need a follow-up update once the WEC certifies primary results
 *     (expected Aug 26, 2026 per the data-check doc's calendar section) —
 *     mirroring AZ's same open item.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const WI_STATE = "WI";
export const WI_OFFICE = "house" as const;
export const WI_ELECTION_YEAR = 2026;
export const WI_STAGE = "primary" as const;
export const WI_HOUSE_SOURCE_URLS = [
  "https://elections.wi.gov/sites/default/files/documents/D.%20Ballot%20Access%20Report%206.9.2026.pdf",
  "https://elections.wi.gov/sites/default/files/documents/June%209%2C%202026%2C%20Open%20Session%20Minutes%20APPROVED.pdf",
  "https://elections.wi.gov/sites/default/files/documents/June%2010%20Extentions%20Ballot%20Access%20Challenge%20Memo__pagenumber.pdf",
];
export const WI_RETRIEVED_AT = "2026-07-16";

export const WI_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // WI-01 — Steil (R, incumbent) unopposed in his own primary; 4-way
  // contested Democratic primary.
  {
    district: "01",
    name: "Lorenzo J. Santos",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Peter Burgelis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Mitchell Berman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Miguel Aranda",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Bryan Steil",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // WI-02 — Pocan (D, incumbent) faces one Democratic primary opponent; no
  // Republican filer at all (confirmed absent from the source, not omitted).
  {
    district: "02",
    name: "Mark Pocan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Douglas Alexander",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // WI-03 — Van Orden (R, incumbent) unopposed in his own primary;
  // 2-way Democratic primary; 2 independents (Kent, Provance) bypass the
  // primary entirely, already certified for the Nov 3 general ballot.
  // Provance's ballot access was Challenged (EL 26-36, Stephen Mueller v.
  // Rustin Provance) as of the June 8 report snapshot — GRANTED per the
  // WEC's June 9, 2026 approved minutes (1,369 valid signatures).
  {
    district: "03",
    name: "Derrick Van Orden",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Emily Berge",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Alexander Valiensi Kent",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Rustin Provance",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Rebecca Cooke",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // WI-04 — Moore (D, incumbent) faces one Democratic primary opponent;
  // 2-way Republican primary; 1 independent (Burks) bypasses the primary,
  // already certified for the Nov 3 general ballot.
  {
    district: "04",
    name: "Tim Rogers",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Purnima Nath",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Amy Donahue",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Gwen Moore",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Arthur Burks",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // WI-05 — Fitzgerald (R, incumbent) and one Democrat, both unopposed in
  // their own party's primary.
  {
    district: "05",
    name: "Andrew Beck",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Scott Fitzgerald",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // WI-06 — Grothman (R, incumbent) unopposed in his own primary; 2-way
  // Democratic primary; Wisconsin Green's sole filer (Arndt) is a
  // ballot-status party, so he's on the Aug 11 primary ballot too
  // (unopposed within WGR), NOT routed through the independent track. Two
  // independents (Thurow, Fitzgibbon) bypass the primary entirely, already
  // certified for the Nov 3 general ballot. Fitzgibbon's ballot access was
  // Challenged (EL 26-37, Brian Norby v. Elizabeth Anne Fitzgibbon) as of
  // the June 8 report snapshot — GRANTED per the WEC's June 9, 2026
  // approved minutes (1,278 valid signatures).
  {
    district: "06",
    name: "Amanda Bell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Matthew Arndt",
    party: "WGR",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Mike Thurow",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Brad Smith",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Glenn Grothman",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Elizabeth Anne Fitzgibbon",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // WI-07 — OPEN SEAT: Tiffany (sitting incumbent) filed for Governor, not
  // re-election to this seat (see docblock above) — no incumbent below.
  // 5-way Republican primary, 3-way Democratic primary. Three candidates
  // were Challenged as of the June 8 report snapshot (EL 26-41/42/43,
  // Thomas Schroeder v. Clark/Hermening/Alfonso, respectively) — all three
  // GRANTED per the WEC's June 10, 2026 extension-challenges memo.
  {
    district: "07",
    name: "Fred Clark",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Kevin Hermening",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Don Raihala",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Jessi Ebben",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Ginger Murray",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Chris Armstrong",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Niina Baum",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Michael Alfonso",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // WI-08 — Wied (R, incumbent) unopposed in his own primary; 3-way
  // Democratic primary. Scheffler's ballot access was Challenged twice
  // (EL 26-38 Robin Saldana v. Scheffler, EL 26-39 Reginald Crosson v.
  // Scheffler) as of the June 8 report snapshot — both GRANTED per the
  // WEC's June 9, 2026 approved minutes (1,320 valid signatures).
  {
    district: "08",
    name: "Mark Christopher Scheffler",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Katrina deVille",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Tony Wied",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Rick Crosson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

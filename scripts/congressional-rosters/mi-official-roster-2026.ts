/**
 * scripts/congressional-rosters/mi-official-roster-2026.ts
 *
 * Michigan's 2026 official congressional roster for the August 4, 2026
 * primary election — covers all 13 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), Alabama,
 * Alaska, Colorado, Connecticut, California, Arkansas, Delaware, Florida,
 * Hawaii, Louisiana, Maine, and Indiana, epic c5a813bb; this is Michigan's
 * build (card "[P0] Import + verify official roster: Michigan (MI)").
 *
 * MICHIGAN-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/michigan-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Michigan's Bureau of Elections runs its own Entellitrak
 *     portal (mi-boe.entellitrak.com) — a materially different, simpler
 *     shape than any prior state in this track: a SINGLE page load per
 *     `electionType` query param (PRI or GEN) returns EVERY race's full
 *     candidate table (all state, congressional, legislative, and judicial
 *     offices) in one server-rendered HTML document — no per-race dropdown
 *     querying was actually needed despite the page's "Select a Race"
 *     dropdown UI; a single `get_page_text` call after navigation captured
 *     the complete report both times. Confirmed directly linked from the
 *     official michigan.gov/sos/elections page (link text "2026 August
 *     Primary Candidate Listing" resolves to the exact PRI URL below),
 *     removing any doubt this is the authoritative access point.
 *   - TWO SEPARATE REPORTS, deliberately both used, covering two distinct
 *     nomination mechanisms:
 *     (1) `electionType=PRI` — "Official Candidate Listing ... Primary
 *     Election" — every Democratic and Republican filer for the August 4,
 *     2026 primary, by office/district. This is the candidate SET; the
 *     party NOMINEE for each seat remains undetermined until the primary
 *     (see MI_STAGE below).
 *     (2) `electionType=GEN` — "Unofficial Candidate Listing ... General
 *     Election" — Michigan's minor parties (Libertarian, Green, Working
 *     Class, per Ballotpedia's "Political parties in Michigan," May 2026:
 *     Michigan recognizes 7 parties — Democratic, Green, Libertarian,
 *     Natural Law, Republican, U.S. Taxpayers, Working Class) nominate by
 *     PARTY CONVENTION, not primary, and file directly onto the November
 *     general-election ballot — there is no primary contest for them to
 *     win or lose. Every convention filing date on this report (Feb–June
 *     2026) is already in the past relative to this build's 2026-07-15
 *     retrieval, so these nominations are final barring a challenge (one
 *     challenge outcome — a CD13 Green Party disqualification — is already
 *     reflected in the report; see DISQ handling below). No Natural Law or
 *     U.S. Taxpayers candidate filed for any 2026 MI congressional seat —
 *     verified absent from the GEN report, not omitted.
 *   - STATUS FLAGS: rows on both reports carry an optional leading flag —
 *     `DISQ` (disqualified) or `WITHD` (withdrawn) — no on-page legend was
 *     found defining these abbreviations explicitly, but both are
 *     self-evident, standard usage, and the meaning ("this candidate is
 *     NOT on the ballot") is unambiguous from context (e.g. a `DISQ`
 *     Green Party CD13 filer alongside multiple non-flagged, still-active
 *     filers for the same seat). Every `DISQ`/`WITHD` row is EXCLUDED from
 *     this fixture entirely, matching how AZ's build treated its own
 *     source's "withdrawn" list. Flagged rows found: US Senate (1 DISQ
 *     Republican), MI-07 (1 WITHD Democrat, filed 2025-07-16 — a stale
 *     filing withdrawn well before the cycle proper), MI-11 (2 DISQ
 *     Democrats, 1 DISQ Republican), MI-13 (2 DISQ Democrats, 2 DISQ
 *     Republicans, 1 DISQ Green Party). None of these appear in this
 *     fixture.
 *   - NO independent (no-party-affiliation) candidates have filed for any
 *     MI congressional seat as of this build's retrieval — confirmed
 *     absent from the GEN report, not omitted, and expected: per Michigan's
 *     official election calendar (below), the filing deadline for
 *     independent candidates seeking partisan office is 4 p.m., July 16,
 *     2026 — ONE DAY after this fixture's 2026-07-15 retrieval date. A
 *     re-check after that date (and its July 20, 2026 withdrawal-deadline
 *     companion) is required before this fixture can be considered a
 *     complete final candidate set — see Known Limitations and the
 *     dated NOT BEFORE follow-up card.
 *   - NO write-in filers found for any MI congressional seat as of this
 *     build's retrieval either — Michigan's write-in Declaration of Intent
 *     deadline for the August primary is 4 p.m., July 24, 2026 (also still
 *     in the future at retrieval time); the general-election write-in
 *     deadline is October 23, 2026. Both are open windows this fixture
 *     cannot reflect yet.
 *   - INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from the Entellitrak portal or this app's own
 *     FEC-derived `candidates` table: house.gov's "By State and District"
 *     member directory (Michigan section, fetched 2026-07-15) for the
 *     House delegation, and senate.gov's Class II roster
 *     (https://www.senate.gov/senators/Class_II.htm) plus independent
 *     reporting (Detroit News, NBC News, PBS NewsHour, CBS Detroit — all
 *     2025-01-28 or later) for the Senate seat. Findings:
 *     (1) 11 of Michigan's 13 sitting US Representatives filed for
 *     re-election in the SAME district they currently hold: Bergman
 *     (R-01), Moolenaar (R-02), Scholten (D-03), Huizenga (R-04), Walberg
 *     (R-05), Dingell (D-06), Barrett (R-07), McDonald Rivet (D-08),
 *     McClain (R-09), Tlaib (D-12), Thanedar (D-13).
 *     (2) TWO open House seats, confirmed by the SAME official filing data
 *     that establishes the rest of this fixture (the sitting member simply
 *     does not appear as a candidate in their own district, AND does
 *     appear as a candidate for a different 2026 office): MI-10's sitting
 *     representative, John James, filed for Governor instead (confirmed:
 *     "James, John," Shelby Township address, appears under the Governor
 *     race on the SAME PRI report, not under MI-10). MI-11's sitting
 *     representative, Haley Stevens, filed for US Senate instead
 *     (confirmed: "Stevens, Haley" appears under the US Senate race, not
 *     under MI-11).
 *     (3) The US Senate seat is OPEN: sitting Senator Gary Peters (Class
 *     II, term expiring January 3, 2027, per senate.gov) announced
 *     2025-01-28 he will not seek re-election (Detroit News, NBC News, PBS
 *     NewsHour, CBS Detroit all independently confirm) — consistent with
 *     Peters' absence from every party's Senate filing list on the
 *     official portal.
 *   - The static PDF `michigan.gov/sos/-/media/.../Candidate-Listing-
 *     Report.pdf` referenced as a possible cross-check 404s as of
 *     2026-07-15 (confirmed via direct `curl`, HTTP 404, and via browser
 *     navigation) — a stale/moved link, not a working alternate source.
 *     The live Entellitrak portal (linked directly from michigan.gov/sos/
 *     elections, confirmed by inspecting that page's own outbound link
 *     href) is the sole official source used; no third-party aggregator.
 *   - No `runoff_pending` rows — Michigan holds no primary runoff system
 *     for congressional races (a single plurality winner per party per
 *     seat on August 4). The party nominee for every contested primary
 *     seat is genuinely UNDETERMINED as of this fixture's retrieval
 *     (2026-07-15; the primary is 2026-08-04, still future) — this is why
 *     MI_STAGE is "primary" and every DEM/REP row below carries
 *     `qualified_for_primary_ballot`, not a guessed nominee, mirroring
 *     Arizona's own pre-primary posture (card 637c2583) rather than OK's
 *     post-primary derivation.
 *   - NOMINATION-MECHANISM SPLIT (the one genuinely new modeling wrinkle
 *     this build introduces): unlike AZ, where minor-party candidates
 *     (AIP/GRE/LIB) ALSO run in the primary alongside DEM/REP and so also
 *     carry `qualified_for_primary_ballot`, Michigan's minor parties
 *     (LIB/GRE/WCPM) nominate by CONVENTION, not primary — there is no
 *     primary contest left for them to win or lose, and their candidate
 *     files directly onto the November general ballot. Every non-DISQ
 *     LIB/GRE/WCPM row below is therefore recorded as
 *     `qualified_for_general_ballot` (the party's final nominee — nothing
 *     further to resolve this cycle), even though every DEM/REP row in the
 *     SAME district is `qualified_for_primary_ballot` (nominee still
 *     undetermined). This is a deliberate, documented judgment call: the
 *     GEN report is titled "Unofficial," but that label tracks pending
 *     CHALLENGES (as the one CD13 Green Party DISQ proves the report does
 *     track and reflect), not an unresolved nomination MECHANISM the way
 *     AZ's/TX's/OK's independent-petition "declared_general_ballot_intent"
 *     status does — a convention nomination is not a signature-count
 *     verification pending outcome.
 *   - `WCPM` ("Working Class Party of Michigan") is a new `party` code added
 *     to types.ts for this build — one of Michigan's 7 recognized parties
 *     (confirmed via Ballotpedia's "Political parties in Michigan," cross-
 *     checked against the portal's own "Working" column label), distinct
 *     from generic IND, mirroring the AIP/AKP/PF/LPF/FFP precedent.
 *
 * Sources:
 *   - https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=PRI&electionYear=2026
 *     (Michigan Bureau of Elections' official "Official Candidate Listing —
 *     Primary Election, Tuesday, August 4, 2026" — Democratic/Republican
 *     primary filers, all offices)
 *   - https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=GEN&electionYear=2026
 *     (Michigan Bureau of Elections' "Unofficial Candidate Listing —
 *     General Election, Tuesday, November 3, 2026" — minor-party
 *     convention nominees, all offices)
 *   - https://www.michigan.gov/sos/elections (confirms the above PRI URL as
 *     the linked "2026 August Primary Candidate Listing" resource)
 *   - https://www.michigan.gov/sos/-/media/Project/Websites/sos/Election-Administrators/Election-Dates.pdf
 *     ("August – November 2026 Election Dates," Rev. 2/26 — governing
 *     calendar dates; see the data-check doc's item (e))
 *   - https://www.house.gov/representatives (Michigan section — incumbency
 *     cross-check only, not a candidate-roster source)
 *   - https://www.senate.gov/senators/Class_II.htm (confirms Gary Peters'
 *     Class II seat and term expiration — incumbency cross-check only)
 *
 * Coverage: all 13 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Every DEM/REP congressional nomination is UNDETERMINED pending the
 *     August 4, 2026 primary — expected and correctly modeled via
 *     `qualified_for_primary_ballot`, not a gap.
 *   - Independent (no-party-affiliation) candidates for MI congressional
 *     seats cannot be ruled out yet: the filing deadline (July 16, 2026)
 *     was one day AFTER this fixture's retrieval date. A re-check after
 *     the July 20, 2026 withdrawal-deadline companion date is required.
 *   - Write-in filers for the August primary (deadline July 24, 2026) and
 *     the November general (deadline October 23, 2026) are both still
 *     open windows this fixture cannot reflect.
 *   - No explicit on-page legend was found defining `DISQ`/`WITHD`; both
 *     are standard, self-evident abbreviations and are treated as
 *     excluding a row from this fixture, but this is an inference, not a
 *     confirmed legend.
 *   - No post-primary candidate-withdrawal deadline for congressional
 *     nominees was found in Michigan's official Aug–Nov 2026 election
 *     calendar (only a PRE-primary withdrawal deadline exists — April 24,
 *     2026, already elapsed at retrieval time). This is an explicit
 *     absence, not a confirmed "no such deadline exists" — flagged for a
 *     future re-check rather than guessed either way.
 *   - Names are recorded as they appear in the official portal, reformatted
 *     from the source's "Last, First" column order to "First Last" for
 *     consistency with this app's rendering convention (matching how
 *     Florida's build reformatted its own "Last, First" source rows); not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MI_STATE = "MI";
export const MI_ELECTION_YEAR = 2026;
export const MI_STAGE = "primary" as const;
export const MI_HOUSE_SOURCE_URLS = [
  "https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=PRI&electionYear=2026",
  "https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=GEN&electionYear=2026",
];
export const MI_SENATE_SOURCE_URLS = [
  "https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=PRI&electionYear=2026",
  "https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=GEN&electionYear=2026",
];
export const MI_RETRIEVED_AT = "2026-07-15";

// MI-10 (John James filed for Governor instead) and MI-11 (Haley Stevens
// filed for US Senate instead) are open seats — the sitting representative
// is not a 2026 House candidate for their own seat. Confirmed both by the
// official filing data itself (each appears as a candidate for a different
// office) AND by house.gov's member directory (see docblock above).
export const MI_OPEN_SEAT_DISTRICTS = ["10", "11"];

export const MI_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Bergman (incumbent, REP)
  {
    district: "01",
    name: "Callie Barr",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Kyle Blomquist",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Wayne Stiles",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jack Bergman",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Matthew DenOtter",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Justin Michal",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Arnett Satterla",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Liz Hakola",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Moolenaar (incumbent, REP)
  {
    district: "02",
    name: "Ben Ambrose",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Jamie Hill",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Clyde Welford",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "John Moolenaar",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Charlotte Magoon",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — Scholten (incumbent, DEM); no minor-party filer.
  {
    district: "03",
    name: "Hillary Scholten",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Ryan Cushman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Terri DeBoer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 04 — Huizenga (incumbent, REP); no minor-party filer.
  {
    district: "04",
    name: "Diop Harris II",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Sean McCann",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Bill Huizenga",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Philip Tanis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 05 — Walberg (incumbent, REP)
  {
    district: "05",
    name: "Christian Vukasovich",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Tim Walberg",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Ronald A. Muszynski",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Jim Bronke",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 — Dingell (incumbent, DEM)
  {
    district: "06",
    name: "Debbie Dingell",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Heather Smiley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Timothy A. Teagan",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Clyde Shabazz",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Linda Rayburn",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — Barrett (incumbent, REP). One WITHD Democrat (Muhammad
  // Salman Rais, filed 2025-07-16, withdrawn) excluded.
  {
    district: "07",
    name: "Bridget Brink",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "William Lawrence",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Matt Maasdam",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Tom Barrett",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Shane Dedrick",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Felix Thibodeau",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 08 — McDonald Rivet (incumbent, DEM)
  {
    district: "08",
    name: "Kristen McDonald Rivet",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Amir Hassan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Al Lemmo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Thomas J. Smith",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "C. Mia Pettus",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Jim Casha",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Kathy Goodwin",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 09 — McClain (incumbent, REP)
  {
    district: "09",
    name: "Ray Pooley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Lisa McClain",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Kevin Vayko",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Destiny Clayton",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Jim Walkowicz",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 10 — open seat: John James (incumbent) filed for Governor
  // instead of House re-election. Not in this roster => not shown as a
  // 2026 House candidate for this seat.
  {
    district: "10",
    name: "Eric Chung",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Tim Greimel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Christina Bertrand Hines",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Michael Bouchard",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Steffan Demetropoulos",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Justin Kirk",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Robert Lulgjuraj",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Mike Saliba",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Andrea L. Kirby",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 11 — open seat: Haley Stevens (incumbent) filed for US Senate
  // instead of House re-election. Not in this roster => not shown as a
  // 2026 House candidate for this seat. Two DISQ Democrats (Stu Baker,
  // Michelle Mary Murphy) and one DISQ Republican (Tony J. Prieto)
  // excluded.
  {
    district: "11",
    name: "Aisha Farooqi",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Jeremy Moss",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "John Paul Torres",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Don Ufford",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Ethan Baker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Ryan Teasdale",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 12 — Tlaib (incumbent, DEM)
  {
    district: "12",
    name: "Shanelle Jackson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "Byron H. Nolen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "Rashida Tlaib",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "James D. Hooper",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "12",
    name: "Gary Walkowicz",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 13 — Thanedar (incumbent, DEM). Two DISQ Democrats (John
  // Goci, Mary Waters), two DISQ Republicans (Martell D. Bivings, Raphiel
  // King), and one DISQ Green Party filer (D. Etta Wilcoxon) excluded.
  {
    district: "13",
    name: "Donavan McKinney",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "Shri Thanedar",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "T.P. Nykoriak",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "Simone R. Coleman",
    party: "WCPM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const MI_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: sitting Senator Gary Peters (Class II, term expiring
  // 2027-01-03) announced 2025-01-28 he will not seek re-election — no
  // incumbent row below. Confirmed both by his absence from every party's
  // filing list and by independent reporting (see docblock).
  {
    district: null,
    name: "Abdul El-Sayed",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Mallory McMorrow",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Haley Stevens",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // One DISQ Republican (Bernadette Smith) excluded.
  {
    district: null,
    name: "Mike Rogers",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Lydia Christensen",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Douglas P. Marsh",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

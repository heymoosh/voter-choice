/**
 * scripts/congressional-rosters/va-official-roster-2026.ts
 *
 * Virginia's 2026 official congressional roster for the August 4, 2026
 * primary election — covers the two US House districts (05, 08) whose
 * candidate set is FULLY known from official sources as of this fixture's
 * retrieval date. Built through the same manual official-source pipeline as
 * Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado, Connecticut,
 * California, Arkansas, Delaware, Florida, Hawaii, Louisiana, Maine,
 * Indiana, Georgia, Iowa, Kansas, Idaho, Maryland, Kentucky, Nebraska, and
 * Missouri, epic c5a813bb; this is Virginia's build (card "[P0] Import +
 * verify official roster: Virginia (VA)").
 *
 * VIRGINIA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/virginia-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *
 *   - NOT Civix. Virginia's Department of Elections (ELECT) runs a static
 *     site (elections.virginia.gov) — every candidate document is a plain
 *     PDF or XLSX at a `elections.virginia.gov/media/...` URL, no
 *     `*.civixapps.com` vendor portal anywhere in the flow.
 *
 *   - **THE CENTRAL FINDING OF THIS BUILD — a genuine, non-obvious data-
 *     completeness gap in VA's own official source, not a search failure:**
 *     Virginia splits congressional nomination into two published tracks
 *     that do NOT arrive on the same schedule:
 *       (1) **Contested-primary filers** — published now, in the Aug 4, 2026
 *           primary candidate XLSX files. Complete and current as of
 *           retrieval.
 *       (2) **Non-primary nominees** (a party's automatic nominee when only
 *           one candidate qualified for that party/district — Va. Code
 *           requires a primary NOT be held in that case — or a nominee
 *           picked by convention/mass meeting) — NOT yet published anywhere
 *           on elections.virginia.gov as of 2026-07-16, despite the
 *           statutory party-certification deadline for this track (Senate/
 *           local: June 22, 2026; House: August 7, 2026) having already
 *           passed for the Senate/statewide track. This was independently
 *           confirmed by reading every "One Pager" PDF in full (they are
 *           generic, undated filing-instruction templates with ZERO
 *           candidate names, not a roster), site-searching ELECT's own
 *           search tool for "certified candidates 2026" / "Mark Warner 2026
 *           candidate" / "posted within three weeks" (no relevant hits),
 *           checking `casting-a-ballot/previous-candidate-lists/` (past
 *           cycles only — no live 2026 non-primary list exists yet), and
 *           looking for a State Board of Elections meeting-minutes
 *           attachment naming certified non-primary nominees (none found
 *           covering this). A dedicated follow-up pass additionally ruled
 *           out three more paths, confirming this is a genuine publication
 *           gap, not a search-completeness gap: (i) the COMET campaign-
 *           finance database (`cfreports.elections.virginia.gov`) tracks
 *           STATE/local candidates only — federal candidates file with the
 *           FEC, not VA COMET, so it structurally cannot confirm or deny
 *           anyone's 2026 federal candidacy; (ii) the SBE board-meeting-
 *           information page is served from a stale/orphaned CMS host
 *           showing only January 2019 meetings, not a current index; (iii)
 *           ELECT's own bulletin PDFs state in writing, verbatim: "The list
 *           of candidates that qualified for ballot access will be posted
 *           on ELECT's website
 *           (https://www.elections.virginia.gov/casting-a-ballot/candidate-list/)
 *           within three weeks after the candidate filing deadline" — that
 *           three-week promise (measured from the June 22 non-primary
 *           certification date) had already lapsed by ~3.5 weeks with
 *           nothing posted as of this fixture's 2026-07-16 retrieval. This
 *           is an administrative-posting lag on ELECT's own side, not a
 *           sign the underlying nomination didn't happen — but per this
 *           epic's SAFETY rule, an unpublished official record is never
 *           inferred from likelihood.
 *     **Concretely, this means 9 of VA's 11 House districts (01, 02, 03, 04,
 *     06, 07, 09, 10, 11) and the US Senate race each have the SITTING
 *     INCUMBENT'S OWN PARTY status unconfirmed** — either because neither
 *     party held a primary in that district (03, 04, 06, 11 — the House
 *     non-primary/independent filing deadline is itself August 4, 2026, so
 *     this data legitimately can't exist yet), or because the incumbent's
 *     own party had no primary while the OPPOSING party's primary is fully
 *     known (01, 02, 07, 09, 10, and the Senate Republican primary vs. the
 *     unpublished Senate Democratic nomination).
 *
 *   - **Why this fixture omits those 9 districts and the Senate race
 *     entirely, rather than importing the known (opposing-party) side
 *     alone** — a deliberate correctness call, not an oversight: this app's
 *     `isIncumbentSeekingReelection` (src/lib/server/officialRoster.ts) and
 *     the `/api/delegation` open-seat override
 *     (src/app/api/delegation/route.ts) both derive "is the sitting member
 *     running" from whether ANY imported row for that (state, office,
 *     district) carries `isIncumbent: true` — once official-roster rows
 *     exist for a seat at all, they become the FULL authority for that seat
 *     and the FEC-derived fallback is skipped entirely (races.ts's
 *     `lookupChallengers`). Importing, say, District 1's 7 known
 *     Democratic primary filers WITHOUT a row for the Republican incumbent
 *     (Rob Wittman, whose own-party nomination status isn't published)
 *     would make the app assert Wittman is NOT seeking re-election — a
 *     false, actively misleading signal, not a neutral gap. The two seats
 *     included below (05, 08) are safe because the incumbent's own status
 *     IS confirmed in the published primary data (McGuire and Beyer are
 *     each a flagged, contested primary filer in their own party — see
 *     below), so no such false signal is possible. The 9 excluded
 *     districts and the Senate race instead fall through to the
 *     pre-existing FEC-derived path, exactly like Louisiana's House
 *     omission (la-official-roster-2026.ts) when zero candidates existed to
 *     register — the correct behavior per that precedent is to omit, not
 *     guess or partially represent a seat's status.
 *
 *   - **District 05** — both parties' Aug 4 primaries are contested and
 *     fully published: 3 Democratic filers, 2 Republican filers including
 *     sitting incumbent John J. McGuire III (flagged `Incumbent: Yes` in
 *     the Republican primary XLSX itself, independently cross-checked
 *     against house.gov below). All 5 rows are `qualified_for_primary_ballot`
 *     — the Aug 4 primary has not yet occurred.
 *
 *   - **District 08** — the Democratic primary is contested and fully
 *     published: 5 filers including sitting incumbent Donald S. Beyer, Jr.
 *     (flagged `Incumbent: Yes` in the Democratic primary XLSX, cross-
 *     checked against house.gov below). No Republican primary was held in
 *     District 8 and no Republican non-primary nominee has been published
 *     yet — so, unlike District 5, this fixture has NO Republican-side row
 *     for District 8. This is safe (does not trigger the false "not
 *     seeking re-election" signal above) because Beyer's own row is
 *     present and flagged incumbent; the absent Republican side is simply
 *     an incomplete challenger list for this one seat, not a false
 *     incumbency signal. Only 5 rows are registered for District 8 (Dem
 *     side only) — a genuinely partial import, called out explicitly here
 *     since it is the one asymmetric case in this fixture.
 *
 *   - **No new party code was needed** — every candidate found across both
 *     fully-published primaries uses the existing "DEM"/"REP" codes; no
 *     Libertarian, Green, or other state-recognized minor party appeared in
 *     either primary XLSX for any VA congressional seat this cycle
 *     (checked, not merely absent from a partial read).
 *
 *   - **No independent or write-in candidates are included** — VA's
 *     independent-candidate one-pager PDFs are the same kind of generic,
 *     nameless filing-instruction template as the non-primary one-pagers
 *     (see above); no live independent-declaration list was found on
 *     elections.virginia.gov as of retrieval. Not a confirmed absence of
 *     independent filers, just an unpublished-source gap, same posture as
 *     the non-primary-nominee gap above.
 *
 *   - **INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from the primary XLSX's own "Incumbent"
 *     column or this app's own FEC-derived `candidates` table:**
 *     (1) `https://www.house.gov/representatives` ("By State and District,"
 *     Virginia section) confirms the sitting Representative for all 11 VA
 *     districts: 01 Robert "Rob" Wittman (R), 02 Jennifer "Jen" Kiggans (R),
 *     03 Robert "Bobby" Scott (D), 04 Jennifer McClellan (D), 05 John
 *     McGuire (R), 06 Ben Cline (R), 07 Eugene Vindman (D), 08 Donald Beyer
 *     (D), 09 H. Morgan Griffith (R), 10 Suhas Subramanyam (D), 11 James
 *     Walkinshaw (D). McGuire (05) and Beyer (08) match this fixture's
 *     `isIncumbent: true` rows exactly; the other 9 sitting members are not
 *     represented in this fixture at all (their own seats are entirely
 *     omitted, per the finding above — not a mismatch, an intentional
 *     omission). (2) `https://www.senate.gov/senators/index.htm` confirms
 *     Mark R. Warner (D) holds VA's Class II Senate seat (term expires
 *     January 2027 — the seat up in 2026); this is an ordinary 6-year-cycle
 *     election, not a special/appointed-seat situation like some other
 *     2026 Senate races. Warner is not represented in this fixture — the
 *     Senate race is entirely omitted, per the finding above (the
 *     Democratic non-primary nomination, presumably Warner's, is
 *     unpublished; only the 3-way contested Republican primary is known).
 *     Virginia's other Senator, Tim Kaine (D), is Class I (term expires
 *     2031) and not up in 2026 — confirmed absent from any 2026 primary
 *     document.
 *
 * Sources:
 *   - https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Democratic-Primary-Federal-6-3-2026.xlsx
 *     (ELECT's official Aug 4, 2026 Democratic primary candidate list —
 *     source for District 5's 3 Democratic filers and District 8's 5
 *     Democratic filers, incl. incumbent flag)
 *   - https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Republican-Primary-6-3-2026.xlsx
 *     (ELECT's official Aug 4, 2026 Republican primary candidate list —
 *     source for District 5's 2 Republican filers, incl. incumbent flag)
 *   - https://elections.virginia.gov/media/castyourballot/2026-August-Primary-Elections-(rev-5-28-26)-(for-web).pdf
 *     (ELECT's authoritative "which offices actually have an Aug 4 primary"
 *     table — confirms exactly which of the 22 party/district combinations
 *     are contested, and which have no primary for either party)
 *   - https://elections.virginia.gov/candidatepac-info/candidate-bulletins/
 *     (ELECT's candidate-bulletins index page — confirms no Civix vendor,
 *     links to the (nameless, template-only) general/non-primary/
 *     independent bulletin PDFs)
 *   - https://elections.virginia.gov/casting-a-ballot/candidate-list/
 *     (ELECT's candidate-list index page — links to the primary XLSX files
 *     above; the live 2026 non-primary/general candidate list is not yet
 *     posted here as of retrieval)
 *   - https://www.house.gov/representatives (incumbency cross-check only —
 *     "By State and District," Virginia section)
 *   - https://www.senate.gov/senators/index.htm (incumbency cross-check
 *     only — confirms Mark R. Warner holds VA's Class II seat, up in 2026)
 *
 * Coverage: 2 of Virginia's 11 US House districts (05 fully, both parties;
 * 08 partially, Democratic side only) — 9 House districts (01, 02, 03, 04,
 * 06, 07, 09, 10, 11) and the 2026 US Senate race are entirely omitted, per
 * the central finding above. See the dated follow-up card in
 * docs/operations/voter-choice-backlog.md for the re-check once VA's
 * non-primary nominee list is published and/or the Aug 4 primary is
 * certified.
 *
 * KNOWN LIMITATIONS:
 *   - 9 House districts and the Senate race are not represented in this
 *     fixture at all — see the central finding above. Those seats fall
 *     through to the pre-existing FEC-derived `candidates` table path,
 *     unchanged by this build.
 *   - District 8 has no Republican-side row (unpublished, and — unlike the
 *     9 fully-omitted districts — the Democratic side IS included, so this
 *     one district's roster is intentionally partial, not absent).
 *   - No independent or write-in candidates are included anywhere in this
 *     fixture (unpublished source, not confirmed absent).
 *   - Names recorded exactly as printed in the XLSX files; not
 *     independently re-verified against a third document beyond the
 *     incumbency cross-checks above.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const VA_STATE = "VA";
export const VA_ELECTION_YEAR = 2026;
// Virginia's Aug 4, 2026 primary had not yet occurred at transcription time
// (2026-07-16) — every row below is a primary-ballot filer, never a
// determined general-ballot nominee.
export const VA_STAGE = "primary" as const;
export const VA_HOUSE_SOURCE_URLS = [
  "https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Democratic-Primary-Federal-6-3-2026.xlsx",
  "https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Republican-Primary-6-3-2026.xlsx",
];
export const VA_RETRIEVED_AT = "2026-07-16";

export const VA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // ---- District 05 — both parties contested and fully published ----
  {
    district: "05",
    name: 'Rob W. "T-ski" Tracinski',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: 'Suzanne K. "Dr. K" Krzyzanowski',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Tom S. P. Perriello",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Melanie V. Lucero",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "John J. McGuire III",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // ---- District 08 — Democratic primary contested and fully published;
  // no Republican row (unpublished, see docblock) ----
  {
    district: "08",
    name: "Mo Seifeldein",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Michael Christian Duffin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Donald S. Beyer, Jr.",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Adam M. Dunigan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Lorena Thorne Bruner",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

// No VA_SENATE_ROSTER_2026 export — the 2026 US Senate race (Mark Warner's
// Class II seat) is entirely omitted from this fixture. The Republican
// primary is fully known (3 contested filers: Bert Mizusawa, Kim Farington,
// David E. Williams) but the Democratic side (presumably Warner's
// unopposed nomination) is unpublished as of retrieval — importing the
// Republican side alone would falsely signal Warner is not seeking
// re-election (see docblock's central finding). Mirrors la-official-
// roster-2026.ts's House omission: races.ts's getOfficialRoster falls
// through to the pre-existing FEC-derived path for senate/VA/2026 since no
// rows exist, which is the correct behavior here, not a gap.

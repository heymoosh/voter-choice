/**
 * scripts/congressional-rosters/nv-official-roster-2026.ts
 *
 * Nevada's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 4 US House districts. Nevada has no 2026 US
 * Senate race (Cortez Masto's seat, Class III, runs to 2028; Rosen's seat,
 * Class I, runs to 2030). Built through the same manual official-source
 * pipeline as Arizona (card 637c2583), Texas (8530a468), Oklahoma
 * (d9b1ef86), Alabama, Alaska, Colorado, Connecticut, California, Arkansas,
 * Delaware, Florida, and Indiana, epic c5a813bb; this is Nevada's build
 * (card "[P0] Import + verify official roster: Nevada (NV)").
 *
 * NEVADA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/nevada-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Nevada runs its own in-house ASP.NET election-results
 *     system on nvsos.gov (URL pattern .../SOSelectionPages/results/...),
 *     plus a separate Imperva-protected live filing portal
 *     (silverstateelection.nv.gov, not used here — blocked to both
 *     automated fetch and needed browser rendering). Both nvsos.gov and
 *     clarkcountynv.gov 403 automated (non-browser) fetches; every source
 *     below was read via an actual browser session
 *     (mcp__claude-in-chrome__*), same requirement as a Civix portal for a
 *     different underlying reason (bot-defense, not a JS SPA).
 *   - SPLIT FILING OFFICER: NV-1 and NV-3 are wholly within Clark County, so
 *     NRS assigns the Clark County Election Dept as filing officer for
 *     those two districts' candidates (including their independent
 *     petitioners) — NOT the Secretary of State. NV-2 and NV-4 span
 *     multiple counties, so their candidates (including independents) file
 *     directly with the SOS. This means NV-1/NV-3's full candidate set
 *     (including independents) had to be sourced from Clark County's own
 *     "Contests and Candidates" document, separate from the SOS's
 *     statewide list, which only carries NV-2/NV-4's federal rows.
 *   - NOMINEE DERIVATION: Nevada's June 9, 2026 primary is fully certified
 *     (county canvass deadline June 19, 2026, per Clark County's official
 *     2026 dates calendar) and Nevada has no runoff mechanism for
 *     congressional primaries — every contested major-party primary's top
 *     vote-getter is the determined general-ballot nominee. Nevada's
 *     official primary-results page
 *     (nvsos.gov/SOSelectionPages/results/2026StateWidePrimary/ElectionSummary.aspx)
 *     reports exact vote totals/percentages per candidate; NV-4's
 *     Democratic primary does not appear on that page at all because
 *     Horsford ran unopposed (no contested primary is held/reported when
 *     there's only one filer — confirmed against Clark County's own
 *     candidate list, which lists Horsford directly at "General" stage,
 *     not "Primary").
 *   - NV-2 IS AN OPEN SEAT. Incumbent Mark Amodei (R) announced February 6,
 *     2026 that he would not seek re-election and does not appear as a
 *     2026 candidate on either the SOS statewide list or any primary
 *     results page. No row in this fixture for district "02" carries
 *     isIncumbent: true.
 *   - INDEPENDENT/MINOR-PARTY BALLOT STATUS — two distinct categories found,
 *     not collapsed into one:
 *     (1) Independent American Party (ballot abbreviation "IAP" on Nevada's
 *         own documents) is a real, Nevada-recognized minor party under
 *         Nevada election law — its nominees (Chapman/CD2, Johnson Patrick
 *         D./CD3, Best/CD4) go through the party's own certificate-of-
 *         nomination process, not an individual signature petition, and
 *         carry no conditional marker on either official source document.
 *         Recorded `qualified_for_general_ballot` with a NEW `IAP` type
 *         code — deliberately NOT reusing the existing `AIP` code, which
 *         races.ts's PARTY_NAMES map ties specifically to "Arizona
 *         Independent Party" (confirmed live during this build's staging
 *         end-to-end check: reusing AIP rendered "Arizona Independent
 *         Party" on a Nevada candidate). Despite the near-identical party
 *         name, AIP and IAP are different real parties under different
 *         states' law — mirrors the AKP/NPP/PF/LPF/FFP precedent of a new
 *         code per state's own distinctly-named party.
 *     (2) True individual independents — Nevada's "No Political Party"
 *         designation (Clark County's own abbreviation key: "NPP = No
 *         Political Party (indicated for partisan offices only)") — must
 *         each file a signature petition under NRS 293.200 (100 registered
 *         voters, non-statewide office), with a stated filing deadline of
 *         June 22, 2026 per Clark County's official calendar. Clark
 *         County's own "Contests and Candidates" document (dated
 *         6/24/2026, i.e. two days after that deadline) marks every one of
 *         these candidates "General*" — its own legend defines the
 *         asterisk as "will only appear in the 2026 General Election if
 *         petition requirements are met" — meaning signature-sufficiency
 *         verification was still open as of that document's date. No later
 *         Clark County document confirming sufficiency was found. Per the
 *         epic's SAFETY rule (never promote a nominee from partial/pending
 *         signals), these five (Khan, St John, Thomas Jr., Willert — CD1;
 *         Anderson David J. — CD3) are recorded `declared_general_ballot_
 *         intent`, not `qualified_for_general_ballot`. NV-4's William
 *         Johnson ("No Political Party" on the SOS statewide list, which
 *         carries no Primary/General or petition-status column at all) is
 *         treated the same way by inference — same underlying NRS 293.200
 *         petition process, just filed with the SOS instead of a county
 *         clerk — rather than assuming the SOS list's "Certified List"
 *         title means his petition was independently confirmed sufficient.
 *         This app's `IND` code (not `NPP`, which is already a distinct
 *         type value reserved for California's "No Party Preference" ballot
 *         designation, a different legal concept under a different state's
 *         law) is used for all six of these individual petitioners.
 *   - INCUMBENCY was cross-checked against a second independent official
 *     source, never guessed from either Nevada source or this app's
 *     FEC-derived `candidates` table: house.gov's "By State and District"
 *     member directory (retrieved 2026-07-15), which confirms Titus (D-01),
 *     Amodei (R-02, not a 2026 candidate), Lee (D-03), and Horsford (D-04)
 *     as Nevada's four sitting members — matching this fixture's
 *     `isIncumbent` rows exactly, with no cross-district filing
 *     complications (unlike TX's Al Green or FL's 2026 map).
 *   - No `runoff_pending` rows — Nevada has no runoff system for
 *     congressional primaries; the June 9, 2026 primary decided every
 *     contested major-party nomination by plurality, fully certified.
 *
 * Sources:
 *   - https://www.nvsos.gov/SOSelectionPages/results/2026StateWidePrimary/ElectionSummary.aspx
 *     (Nevada SOS, official June 9, 2026 primary results by candidate,
 *     "Federal Races" section — US House Districts 1-4 — read via browser
 *     session 2026-07-15; nvsos.gov 403s non-browser fetches)
 *   - https://www.nvsos.gov/home/showpublisheddocument/20105/639179848915870000
 *     (Nevada SOS, "2026 General Election Statewide Certified List of
 *     Candidates," linked from nvsos.gov's 2026 Election Information page —
 *     covers NV-2/NV-4 federal candidates, the two multi-county districts
 *     that file with the SOS rather than a county clerk; retrieved
 *     2026-07-15)
 *   - https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:fe5dbe41-e2b2-402e-a651-cbe5e6ea53bc/original/as/Contests-Candidates-All-26.pdf
 *     (Clark County Election Dept, "Contests and Candidates in the 2026
 *     Elections in Clark County, Nevada," dated 6/24/2026 — covers NV-1/
 *     NV-3 federal candidates, the two districts wholly within Clark County
 *     that file with the county rather than the SOS, including the
 *     "General*" petition-pending marker for individual independents;
 *     retrieved 2026-07-15)
 *   - https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:a5950eb8-cb6d-404e-a533-b4856da8aa86/original/as/2026-dates.pdf
 *     (Clark County Election Dept, "Key Important Dates for the 2026
 *     Elections," updated 11/26/2025 — source for the standing calendar
 *     dates recorded in the data-check doc: primary canvass deadline,
 *     independent-candidate petition filing window/deadline, non-judicial
 *     candidate withdrawal deadlines; retrieved 2026-07-15)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check, retrieved 2026-07-15)
 *
 * Coverage: all 4 US House districts. No US Senate contest in 2026. Most
 * major-party and IAP rows are `qualified_for_general_ballot` (post-primary
 * certified nominee, or party-certified minor-party nominee); six
 * individual-petition independents are `declared_general_ballot_intent`
 * pending petition-sufficiency confirmation. No `qualified_for_primary_
 * ballot`, `write_in_qualified`, or `runoff_pending` rows.
 *
 * KNOWN LIMITATIONS:
 *   - The six `declared_general_ballot_intent` independents' petition-
 *     signature sufficiency was not independently confirmed as of this
 *     fixture's 2026-07-15 transcription, even though the June 22, 2026
 *     filing deadline has passed — no later Clark County or SOS document
 *     surfacing a resolved status was found. See the data-check doc's
 *     calendar-dates section for the dated re-check card opened to confirm
 *     final status.
 *   - No distinct POST-primary/pre-general candidate-withdrawal deadline
 *     was found in Clark County's full 13-page 2026 dates calendar (every
 *     "Last Day to Withdraw" entry in that document is pre-filing-close,
 *     i.e. pre-primary: March 24, 2026 for non-city non-judicial
 *     candidates). This may mean Nevada genuinely has no separate
 *     post-primary withdrawal window for a certified congressional
 *     nominee, or that this Clark-county-scoped document simply doesn't
 *     cover it — recorded as an open gap, not assumed either way. See the
 *     data-check doc.
 *   - Nevada's exact ballot-content-certification date (the point after
 *     which no further roster change is possible this cycle) was not
 *     found as a single named milestone in any source read this build; the
 *     closest identified anchors are the June 22, 2026 independent-petition
 *     deadline and the November 24, 2026 Nevada Supreme Court statewide
 *     canvass (which certifies results, not ballot content, and falls
 *     after the election itself). See the data-check doc.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NV_STATE = "NV";
export const NV_ELECTION_YEAR = 2026;
// Nevada's June 9, 2026 primary is fully certified (county canvass deadline
// June 19, 2026) and Nevada has no runoff mechanism — every contested
// major-party nomination is determined.
export const NV_STAGE = "general" as const;
export const NV_HOUSE_SOURCE_URLS = [
  "https://www.nvsos.gov/SOSelectionPages/results/2026StateWidePrimary/ElectionSummary.aspx",
  "https://www.nvsos.gov/home/showpublisheddocument/20105/639179848915870000",
  "https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:fe5dbe41-e2b2-402e-a651-cbe5e6ea53bc/original/as/Contests-Candidates-All-26.pdf",
  "https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:a5950eb8-cb6d-404e-a533-b4856da8aa86/original/as/2026-dates.pdf",
];
export const NV_RETRIEVED_AT = "2026-07-15";

export const NV_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Dina Titus (DEM, incumbent). Filed with Clark County
  // (wholly within Clark County).
  {
    district: "01",
    name: "Titus, Dina",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Buck, Carrie Ann",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Khan, Afzal \"Bobby\"",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "01",
    name: "St John, Steven \"Chap\"",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "01",
    name: "Thomas, Jr., Anthony",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "01",
    name: "Willert, Victor R.",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // District 02 — OPEN SEAT. Incumbent Mark Amodei (R) is not seeking
  // re-election (announced 2026-02-06) and is not a 2026 candidate; no
  // isIncumbent: true row for this district. Filed with the Secretary of
  // State (multi-county district).
  {
    district: "02",
    name: "Benitez-Thompson, Teresa F.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Flippo, David",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Chapman, Lynn",
    party: "IAP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Susie Lee (DEM, incumbent). Filed with Clark County
  // (wholly within Clark County).
  {
    district: "03",
    name: "Lee, Susie",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "O'Donnell, Marty",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Johnson, Patrick D.",
    party: "IAP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Anderson, David J.",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // District 04 — Steven Horsford (DEM, incumbent; unopposed in the
  // Democratic primary, so no contested-primary row appears on the
  // official results page — confirmed via Clark County's own candidate
  // list, which shows him directly at "General" stage). Filed with the
  // Secretary of State (multi-county district).
  {
    district: "04",
    name: "Horsford, Steven A.",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Whipple, Cody K.",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Best, Russell",
    party: "IAP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Johnson, William",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

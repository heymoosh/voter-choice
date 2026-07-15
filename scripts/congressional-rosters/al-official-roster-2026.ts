/**
 * scripts/congressional-rosters/al-official-roster-2026.ts
 *
 * Alabama's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 7 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), and Oklahoma (card d9b1ef86,
 * epic c5a813bb); this is Alabama's build (card at
 * docs/operations/voter-choice-backlog.md, "[P0] Import + verify official
 * roster: Alabama (AL)").
 *
 * ALABAMA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/alabama-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Alabama's official candidate/election source is a static HTML hub
 *     (sos.alabama.gov/alabama-votes/voter/election-information/2026,
 *     confirmed sourceFormat "html" / parserFamily "html_table" per the
 *     F03 rehearsal) - NOT Civix-vended. Every certification document is
 *     linked directly from that hub as a PDF; none required browser
 *     automation to fetch (unlike TX's Civix portal), but every PDF found
 *     was a SCANNED IMAGE with no text layer (pypdf/pdfminer both
 *     returned empty text) - transcription required visually reading each
 *     PDF page (via Claude's native PDF/image reading), not text
 *     extraction.
 *   - MID-DECADE REDISTRICTING IS THE CENTRAL COMPLICATION, discovered by
 *     checking the "2026-08-11" date the F03 rehearsal had flagged as
 *     not fitting the regular primary/runoff/general pattern (per this
 *     card's own ORIGIN note not to assume). SCOTUS narrowed VRA Section 2
 *     (Louisiana v. Callais) and lifted an injunction that had blocked
 *     Alabama from redrawing its congressional map mid-decade; on
 *     2026-05-11 the Court cleared the way, and Governor Ivey proclaimed a
 *     SPECIAL PRIMARY ELECTION for Congressional Districts 1, 2, 6, and 7
 *     on August 11, 2026, reverting those four districts to the
 *     2023 Alabama-Legislature-drawn map (confirmed via the Governor's own
 *     May 12, 2026 press release, cross-checked against Wikipedia's
 *     "2026 United States House of Representatives elections in Alabama"
 *     article for secondary corroboration only). Districts 3, 4, and 5
 *     were NOT affected by the map change and proceeded through the
 *     regular May 19 primary / June 16 runoff cycle unchanged.
 *   - THE MAY 19, 2026 REGULAR PRIMARY WAS STILL HELD in CD1/2/6/7, but
 *     per the Governor's proclamation those results were EXPLICITLY
 *     NULLIFIED by the special election - candidates who won or lost the
 *     nullified May 19 primary in those four districts had to re-qualify
 *     and re-run in the August 11 special primary (e.g. Jerry Carl, who
 *     led the nullified CD1 Republican primary, re-qualified and appears
 *     again as a special-primary candidate). This fixture records ONLY
 *     the special-primary candidate set for CD1/2/6/7, never the
 *     nullified May 19 results for those four districts.
 *   - THE SPECIAL PRIMARY HAS **NO RUNOFF** - confirmed explicitly in the
 *     Governor's proclamation ("There will be no runoff election") and in
 *     the official Special Primary Election Calendar PDF (no special-
 *     general or runoff date appears after August 11; the next dated
 *     event is state-executive-committee certification on August 24).
 *     Whichever candidate gets a plurality in each party's August 11
 *     special primary becomes that party's nominee directly, appearing on
 *     the ALREADY-SCHEDULED November 3, 2026 general ballot alongside the
 *     CD3/4/5 nominees determined by the regular cycle - there is no
 *     separate special general election.
 *   - ALL FOUR SPECIAL-PRIMARY DISTRICTS' NOMINATIONS ARE THEREFORE
 *     UNDETERMINED as of this fixture's retrieval date (2026-07-15) - the
 *     August 11, 2026 vote has not yet happened. Every candidate certified
 *     to appear on each party's special-primary ballot (per the Alabama
 *     Republican Party's and Alabama Democratic Party's own May 26, 2026
 *     certifications to the Secretary of State) is recorded here with
 *     ballotStatus "runoff_pending" for any contest with more than one
 *     candidate per party - reusing the existing mechanism per the epic's
 *     standing requirement (SAFETY: never guess a winner from an election
 *     that hasn't happened). SEE KNOWN LIMITATIONS below: this is
 *     technically a still-pending FIRST-ROUND special PRIMARY, not a
 *     runoff, and the "runoff_pending" name/UI copy is an imperfect
 *     semantic fit here - flagged, not silently resolved.
 *   - A PARTY WITH ONLY ONE CANDIDATE CERTIFIED for a given special-primary
 *     district race has no actual contest to hold - Alabama's own official
 *     Nov-3-general certification (Democratic Party, dated 2026-07-01,
 *     `CertificationofDemocraticPartyCandidates-2026General.pdf`) already
 *     lists that sole filer as the "Ballot Name" nominee, DETERMINED, not
 *     flagged pending: Clyde W. Jones, Jr. (CD1), Shomari C. Figures
 *     (CD2), and Terri A. Sewell (CD7) were each the only Democratic
 *     filer for their district's special primary, so they are recorded
 *     here as "qualified_for_general_ballot", not "runoff_pending". CD6's
 *     Democratic race is genuinely contested (4 filers) - that same
 *     official document explicitly marks its placeholder listing, "Keith
 *     Pilkington", with "(subject to August 11 Primary)*", confirming
 *     Alabama's own party apparatus treats an uncontested special-primary
 *     filer as decided and a contested one as not - this fixture mirrors
 *     that exact distinction. No Republican special-primary race was
 *     uncontested (CD1: 4, CD2: 6, CD6: 2, CD7: 2 filers), so every
 *     Republican CD1/2/6/7 row here is "runoff_pending".
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed: (1) house.gov's "By State and District" directory (Alabama
 *     section) confirms the sitting delegation is Moore (AL-1), Figures
 *     (AL-2), Rogers (AL-3), Aderholt (AL-4), Strong (AL-5), Palmer
 *     (AL-6), Sewell (AL-7); (2) senate.gov's Alabama state page confirms
 *     the sitting Class III senator (the seat on the 2026 ballot) is
 *     Tommy Tuberville. Redistricting changed district BOUNDARIES, not
 *     which numbered seat each sitting member holds, so incumbency here is
 *     matched by district/seat number exactly as AZ/TX/OK did.
 *   - AL-1 IS AN OPEN SEAT: incumbent Barry Moore did not seek re-election
 *     to his House seat - he ran for, and per the Alabama Republican
 *     Party's official Nov-3-general certification (2026-06-24, state-
 *     received 2026-06-30) WON, the Republican US Senate nomination
 *     ("U.S. Senate: Barry Moore" appears in that document's "2026 Primary
 *     Winners" table). Moore does not appear among the four CD1 special-
 *     primary Republican filers (Burger, Carl, Mills, Sidwell) - confirmed
 *     absent, not merely omitted. This is the exact same shape as
 *     Oklahoma's OK-1/Hern and US-Senate/Armstrong findings: the sitting
 *     officeholder is not seeking re-election to their own seat.
 *   - US SENATE IS AN OPEN SEAT: the sitting Class III senator, Tommy
 *     Tuberville, did not seek re-election to the Senate - the same
 *     official Republican certification document lists him instead as
 *     the certified nominee for GOVERNOR ("Governor: Tommy Tuberville"),
 *     not Senate. The Republican Senate nomination went to Barry Moore
 *     (won the May 19 primary/June 16 runoff outright per that same
 *     document), the Democratic nomination to Everett Wess (per the
 *     Alabama Democratic Party's parallel certification, dated
 *     2026-07-01). Both are DETERMINED, not pending - Senate was
 *     unaffected by the congressional redistricting (statewide race, no
 *     district lines).
 *   - AL-6 (Palmer) IS A SPECIAL CASE: incumbent Gary Palmer IS seeking
 *     re-election and IS one of the two certified Republican special-
 *     primary candidates (against Case Dixon) - but because the special
 *     primary itself hasn't happened, his renomination is NOT yet
 *     determined either. His row carries isIncumbent: true AND
 *     ballotStatus: "runoff_pending" simultaneously - isIncumbent reflects
 *     who currently holds the seat (a fact), ballotStatus reflects whether
 *     the nomination outcome is known (not yet, for this seat).
 *   - Independent/write-in candidates: no official Secretary of State
 *     document listing certified independent or write-in candidates for
 *     any 2026 Alabama congressional or Senate race was located this
 *     session (unlike Texas's dedicated declaration-tracking PDF).
 *     Wikipedia's Senate article names one declared independent (Craig
 *     Jelks) sourced to a 2026-01-21 Alabama Political Reporter article,
 *     but per the epic's SAFETY rule (no secondary source as primary
 *     source of record) this fixture does NOT include him - there is no
 *     official-source confirmation his ballot-access petition was ever
 *     filed or verified. Flagged as a known gap, not fabricated data.
 *   - No Libertarian or Green Party filings were found for any Alabama
 *     congressional or Senate race in the official documents reviewed
 *     this session (verified absent from every certification list read,
 *     not simply unresearched).
 *
 * Sources:
 *   - https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026
 *     (Alabama Secretary of State's 2026 election information hub - links
 *     every document below)
 *   - https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofRepublicanPartyCandidates-2026General.pdf
 *     (Alabama Republican Party's certification of 2026 primary winners
 *     for the Nov 3 general ballot - certified 2026-06-24, state-received
 *     2026-06-30; source for the determined Senate/CD3/CD4/CD5 Republican
 *     nominees, and for Tuberville's certified Governor nomination
 *     confirming the open Senate seat)
 *   - https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofDemocraticPartyCandidates-2026General.pdf
 *     (Alabama Democratic Party's certification of 2026 primary/runoff
 *     winners for the Nov 3 general ballot - certified 2026-07-01; source
 *     for the determined Senate/CD1/CD2/CD3/CD4/CD5/CD7 Democratic
 *     nominees, and for the explicit "(subject to August 11 Primary)*"
 *     flag on the CD6 Democratic placeholder)
 *   - https://www.sos.alabama.gov/sites/default/files/06-03-2026/Republican%20Certification%20of%20Candidates.pdf
 *     (Alabama Republican Party's certification of qualified 2026 Special
 *     Republican Primary candidates for CD1/2/6/7 - certified 2026-05-26;
 *     source for the pending Republican CD1/2/6/7 candidate fields)
 *   - https://www.sos.alabama.gov/sites/default/files/06-03-2026/Democratic%20Certification%20of%20Candidates.pdf
 *     (Alabama Democratic Party's certification of qualified 2026 Special
 *     Democratic Primary candidates for CD1/2/6/7 - certified 2026-05-26;
 *     source for the pending Democratic CD6 candidate field and the
 *     determined-by-being-unopposed CD1/CD2/CD7 Democratic filers)
 *   - https://www.sos.alabama.gov/sites/default/files/election-2026/Amended2026SpecialPrimaryElectionCalendar_05.27.2026.pdf
 *     (official Special Primary Election Calendar for CD1/2/6/7 - confirms
 *     the August 11, 2026 date and the absence of any runoff/special-
 *     general date)
 *   - https://governor.alabama.gov/newsroom/2026/05/governor-ivey-celebrates-major-court-victory-in-states-redistricting-battle-calls-special-election-for-alabama-drawn-congressional-map/
 *     (Governor Ivey's May 12, 2026 proclamation press release - primary
 *     source for why the special primary exists, that there is no runoff,
 *     and that the Nov 3 general "will occur as planned with all other
 *     races")
 *   - https://www.house.gov/representatives (119th Congress Alabama
 *     delegation, "By State and District" - incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://www.senate.gov/states/AL/intro.htm (Alabama's current
 *     senators - incumbency cross-check only)
 *
 * Coverage: all 7 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - CD1, CD2, CD6 (Republican + Democratic), and CD7's Republican
 *     nominations are ALL undetermined pending the August 11, 2026 special
 *     primary - see "runoff_pending" entries above. This fixture will need
 *     a follow-up update once that primary is certified (expected around
 *     2026-08-24 per the official calendar's state-executive-committee
 *     certification date).
 *   - The "runoff_pending" ballotStatus/label is an imperfect semantic fit
 *     for Alabama's CD1/2/6/7 situation: it is a still-pending FIRST-ROUND
 *     special primary with NO runoff (confirmed by the Governor's own
 *     proclamation), not a runoff between two known finalists the way
 *     Oklahoma's build used it. Reused here per the epic's standing
 *     requirement to use the existing mechanism rather than add new
 *     schema/UI for one state (see the plan doc's explicitly-deferred
 *     "bigger... design pass" on generalizing pending-election tracking).
 *     Concretely: the RepCard "Runoff pending" tag/CTA copy ("your vote in
 *     that runoff can still decide...") will read as factually imprecise
 *     for Alabama's CD1/2/6/7 candidates once this data is flag-enabled -
 *     flagged here for Muxin as a copy follow-up, not blocking this build
 *     (the flag stays off everywhere persistent regardless).
 *   - No official Secretary of State document confirming any independent
 *     or write-in candidate for an Alabama 2026 congressional/Senate race
 *     was located this session - see the independent/write-in note above.
 *     A Wikipedia-sourced declared independent Senate candidate (Craig
 *     Jelks) was deliberately excluded for lack of official corroboration.
 *   - Names are recorded as they appear in the official certification
 *     documents' "Ballot Name" columns (determined nominees) or candidate
 *     lists (pending special-primary filers); not independently
 *     re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const AL_STATE = "AL";
export const AL_ELECTION_YEAR = 2026;
export const AL_STAGE = "general" as const;
export const AL_HOUSE_SOURCE_URLS = [
  "https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofRepublicanPartyCandidates-2026General.pdf",
  "https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofDemocraticPartyCandidates-2026General.pdf",
  "https://www.sos.alabama.gov/sites/default/files/06-03-2026/Republican%20Certification%20of%20Candidates.pdf",
  "https://www.sos.alabama.gov/sites/default/files/06-03-2026/Democratic%20Certification%20of%20Candidates.pdf",
];
export const AL_SENATE_SOURCE_URLS = [
  "https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofRepublicanPartyCandidates-2026General.pdf",
  "https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofDemocraticPartyCandidates-2026General.pdf",
];
export const AL_RETRIEVED_AT = "2026-07-15";

// CD1 is an open seat: Barry Moore, the sitting representative, filed for
// (and won) US Senate instead of re-election to his House seat (confirmed
// absent from the CD1 special-primary filing list). No other AL House
// district lost its incumbent - AL-6's Gary Palmer is seeking re-election
// but his renomination is still pending (see below).
export const AL_OPEN_SEAT_DISTRICTS = ["01"];

// Every contest still undetermined pending Alabama's August 11, 2026
// special primary (NO runoff - see KNOWN LIMITATIONS) as of this
// fixture's retrieval date (2026-07-15).
export const AL_RUNOFF_PENDING_CONTESTS = [
  { office: "house" as const, district: "01", party: "REP" as const },
  { office: "house" as const, district: "02", party: "REP" as const },
  { office: "house" as const, district: "06", party: "REP" as const },
  { office: "house" as const, district: "06", party: "DEM" as const },
  { office: "house" as const, district: "07", party: "REP" as const },
];

export const AL_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 - open seat (Moore running for, and having won, the
  // Republican US Senate nomination instead). Republican nomination
  // undetermined pending the Aug 11 special primary (4-candidate field,
  // no runoff). Democratic nomination determined - Jones was the sole
  // Democratic filer for the special primary.
  {
    district: "01",
    name: "Lucas Burger",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "01",
    name: "Jerry Carl",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "01",
    name: "John Mills",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "01",
    name: "Austin Sidwell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "01",
    name: "Clyde W. Jones, Jr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 - incumbent Shomari Figures (D) seeking re-election, sole
  // Democratic filer for the special primary (determined). Republican
  // nomination undetermined pending the Aug 11 special primary
  // (6-candidate field, no runoff).
  {
    district: "02",
    name: "Hampton Harris",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "Christian Horn",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "Rhett Marques",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "David Matthews",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "Joshua McKee",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "James Richardson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "02",
    name: "Shomari C. Figures",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 - unaffected by redistricting; regular May 19 primary
  // cycle. Incumbent Mike Rogers (R) won outright (83.2%, no runoff).
  // Democratic nominee Lee McInnis ran unopposed.
  {
    district: "03",
    name: "Mike Rogers",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Lee McInnis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 - unaffected by redistricting. Incumbent Robert Aderholt
  // (R) won outright (77.6%, no runoff). Democratic nominee Amanda
  // Pusczek won her primary outright (62.8%, no runoff).
  {
    district: "04",
    name: "Robert B. Aderholt",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Amanda N. Pusczek",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 - unaffected by redistricting. Incumbent Dale Strong (R)
  // ran unopposed. Democratic nominee Andrew Sneed won the June 16 runoff.
  {
    district: "05",
    name: "Dale W. Strong",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Andrew Sneed",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 - incumbent Gary Palmer (R) IS seeking re-election and IS
  // one of the two certified special-primary candidates, but his
  // renomination is undetermined pending the Aug 11 special primary (no
  // runoff) - isIncumbent: true reflects who currently holds the seat;
  // ballotStatus reflects the still-pending outcome. Both parties'
  // nominations for this district are undetermined (R: 2-candidate field;
  // D: 4-candidate field - confirmed contested by the official Nov-3
  // certification's own "(subject to August 11 Primary)*" flag on
  // Pilkington).
  {
    district: "06",
    name: "Gary Palmer",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "runoff_pending",
  },
  {
    district: "06",
    name: "Case Dixon",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "06",
    name: "Jacob Bouma-Sims",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "06",
    name: "Ashtyn Kennedy",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "06",
    name: "Maurice Mercer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "06",
    name: "Keith Pilkington",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },

  // DISTRICT 07 - incumbent Terri Sewell (D) seeking re-election, sole
  // Democratic filer for the special primary (determined). Republican
  // nomination undetermined pending the Aug 11 special primary
  // (2-candidate field, no runoff).
  {
    district: "07",
    name: "Ammie Akin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "07",
    name: "David W. Perry",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "runoff_pending",
  },
  {
    district: "07",
    name: "Terri A. Sewell",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// US Senate - open seat: incumbent Tommy Tuberville (R) did not seek
// re-election, instead winning the Republican Governor nomination per the
// same official certification document. Unaffected by congressional
// redistricting (statewide race). Both nominations determined via the
// regular May 19 primary / June 16 runoff cycle.
export const AL_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Barry Moore",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Everett Wess",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
];

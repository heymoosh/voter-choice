/**
 * scripts/congressional-rosters/pa-official-roster-2026.ts
 *
 * Pennsylvania's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 17 US House districts. Pennsylvania has NO US
 * Senate contest in 2026 (John Fetterman's seat, elected 2022, runs through
 * 2028; Dave McCormick's seat, elected 2024, runs through 2030 — confirmed
 * via electionreturns.pa.gov's "Offices" menu, which lists no US Senate
 * office for the 2026 cycle, and independently via the candidate database's
 * Office filter, which likewise has no US Senate option), so this fixture is
 * house-only, mirroring MD/HI/CT/CA's shape. Built through the same manual
 * official-source pipeline as AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI/IA/ID/IN/
 * KS/KY/LA/MD, epic c5a813bb; this is Pennsylvania's build (card "[P0] Import
 * + verify official roster: Pennsylvania (PA)"). No prior F03/I06/I11
 * rehearsal covered Pennsylvania — this build's source research started cold.
 *
 * PENNSYLVANIA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/pennsylvania-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Pennsylvania's official election authority is the
 *     Department of State's Bureau of Elections. The results portal
 *     (electionreturns.pa.gov) is a Commonwealth-branded Angular-ish SPA
 *     with template placeholders in raw HTML, but renders cleanly for
 *     browser automation and carries no Civix branding/footer anywhere; the
 *     candidate database (pavoterservices.pa.gov/ElectionInfo) is an older
 *     ASP.NET/DataTables site. Neither matches the
 *     `<subdomain>.<state>elections.civixapps.com` URL pattern or
 *     "POWERED BY gocivix.com" footer from the Civix playbook.
 *   - PA_STAGE = "general": Pennsylvania's 2026 primary was held May 19,
 *     2026 — already in the past, and already certified: the Secretary of
 *     the Commonwealth's official press release "Secretary of the
 *     Commonwealth Certifies 2026 Primary Election Results" is dated June
 *     17, 2026 (pa.gov/agencies/dos press room), well before this build
 *     (2026-07-16). Unlike most prior states in this track, PA's primary
 *     results are therefore CERTIFIED, not just unofficial election-night
 *     numbers — every major-party nominee below is recorded
 *     `qualified_for_general_ballot` on that stronger basis.
 *   - District 3 is an OPEN SEAT: incumbent Dwight Evans (per house.gov's
 *     "By State and District" directory, fetched 2026-07-16) is NOT among
 *     any of the 3rd Congressional District's Democratic primary filers —
 *     confirmed by name-search across the full candidate database, not
 *     inferred. No Republican candidate filed for CD3 at all (confirmed:
 *     zero CD3 Republican rows across all 48 "Representative in Congress"
 *     candidate-database entries, and the write-in report shows only
 *     "Scattered" Republican write-in votes for CD3 — no named write-in
 *     candidate qualified). CD3's general ballot is therefore Chris Rabb
 *     (D) unopposed by a major party as of this build.
 *   - CD3's Democratic field was originally 9 filers, not the 4 who appear
 *     in the certified primary results below — cross-checked candidate ID
 *     by candidate ID against pavoterservices.pa.gov's Candidate Information
 *     pages: Jamillah Naderah Griffin (withdrew 2026-03-25), Cole Carter
 *     (removed from ballot via objection, 2026-04-06), Morgan B Cephas
 *     (withdrew by petition, 2026-04-14), Karl Morris (removed from ballot
 *     via objection, 2026-03-31), and Dave Oxman (withdrew 2026-03-25) were
 *     each confirmed `Candidate-Status: Withdrawn` and absent from the
 *     certified results, before ballot printing — none is a general-ballot
 *     candidate. The remaining 4 (Stanford, Street, Rabb, Griffith) sum to
 *     exactly 100% of the certified CD3 Democratic primary vote.
 *   - Every other district's primary winner's surname matches its current
 *     sitting member's surname per house.gov, confirmed by name (not by
 *     district number alone, per the TX Al Green / FL redistricting
 *     lesson) — including two seats that flipped in the 2024 cycle and
 *     whose CURRENT incumbent is therefore the opposite party from who held
 *     the seat previously: CD7 (Ryan Mackenzie, R, unseated Susan Wild in
 *     2024) and CD8 (Rob Bresnahan Jr., R, unseated Matt Cartwright in
 *     2024) — both Mackenzie and Bresnahan ran unopposed in their own 2026
 *     primary and are marked `isIncumbent: true`; their Democratic
 *     challengers (Bob Brooks, Paige Cognetti) carry no incumbent flag.
 *   - No independent, minor-party, or write-in candidate has qualified for
 *     the general ballot in any of the 17 districts as of this build
 *     (2026-07-16): (a) the candidate database's "Representative in
 *     Congress" filter returns exactly 48 rows total (43 who appear on the
 *     certified primary ballot + the 5 CD3 withdrawals/removals above), all
 *     Party = Democratic or Republican, all Candidate Type = Petition — zero
 *     Nomination Papers filings (PA's independent/minor-party route,
 *     distinct from the primary-petition route); (b) the official write-in
 *     PDF (`write-in votes_2026 primary for website .pdf`) shows only
 *     "Scattered" write-in vote totals for US Congress in every one of the
 *     17 districts, both parties — no named write-in candidate crossed the
 *     threshold to be individually reported, confirming none qualified;
 *     (c) the official Post-Primary Candidate Withdrawal List (as of its
 *     6/29/2026 report date) lists exactly 2 withdrawn candidates
 *     statewide, both state Senate seats (26th and 46th Senatorial
 *     Districts) — zero congressional withdrawals after the primary. This
 *     is expected, not a gap: Pennsylvania's own 2026 Election Calendar sets
 *     August 3, 2026 as the deadline to file nomination papers, still in the
 *     future at transcription time — see governing dates below.
 *
 * GOVERNING CALENDAR DATES (per pa.gov/agencies/vote/elections/upcoming-elections,
 * "2026 Election Important Dates to Remember", confirmed 2026-07-16):
 *   - August 3, 2026 — last day to circulate and file nomination papers
 *     (Pennsylvania's independent/minor-party route onto the general
 *     ballot). STILL OPEN at transcription time; a late filer would not yet
 *     appear in this fixture.
 *   - August 10, 2026 — last day to file objections to nomination papers.
 *   - August 10, 2026 — last day for withdrawal by candidates nominated by
 *     nomination papers, without a court order.
 *   - August 10, 2026 — last day for withdrawal by candidates nominated at
 *     the primary, without a court order. This is the candidate-withdrawal
 *     deadline for all 33 major-party nominees in this fixture (per the
 *     epic's 2026-07-16 candidate-withdrawal-deadline standing
 *     requirement) — STILL OPEN at transcription time. A dated re-check
 *     follow-up card is opened alongside this build for August 11, 2026 (the
 *     day after every one of these dates has passed).
 *   - Pennsylvania's calendar names no distinct later "ballot content
 *     certification" date beyond August 10 — county boards begin ballot
 *     preparation once the post-nomination-papers withdrawal window closes.
 *
 * Sources:
 *   - https://www.electionreturns.pa.gov/Home/OfficeResults?officeId=11&ElectionID=117&ElectionType=P&IsActive=1
 *     (official certified 2026 General Primary results — Representative in
 *     Congress, all 17 districts, both parties, retrieved 2026-07-16)
 *   - https://www.pavoterservices.pa.gov/ElectionInfo/electioninfo.aspx
 *     (2026 General Election candidate database, filtered to "Representative
 *     in Congress" — 48 total candidate rows, used to confirm CD3's
 *     withdrawn/removed filers and to confirm zero Nomination Papers
 *     (independent/minor-party) filings exist yet; retrieved 2026-07-16)
 *   - https://www.pa.gov/agencies/vote/elections/upcoming-elections
 *     ("2026 Election Important Dates to Remember" — full election
 *     calendar, retrieved 2026-07-16)
 *   - https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/voting-and-elections/running-for-office/2026/petition-filing-2026/2026%20post-primary%20candidate%20withdrawal%20listing.pdf
 *     (2026 Post-Primary Candidate Withdrawal List, report dated 6/29/2026 —
 *     0 congressional withdrawals, retrieved 2026-07-16)
 *   - https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/voting-and-elections/running-for-office/2026/write-in%20votes_2026%20primary%20%20for%20website%20.pdf
 *     (2026 Primary Election Write-In Votes — US Congress page shows only
 *     "Scattered" totals in all 17 districts, both parties, no named
 *     write-in candidate qualified; retrieved 2026-07-16)
 *   - https://www.pa.gov/agencies/dos (Department of State newsroom —
 *     "Secretary of the Commonwealth Certifies 2026 Primary Election
 *     Results", dated June 17, 2026, retrieved 2026-07-16)
 *   - https://www.house.gov/representatives ("By State and District"
 *     directory, member incumbency cross-check, retrieved 2026-07-16)
 *
 * Coverage: all 17 US House districts, 33 total rows (CD3 has only a
 * Democratic nominee — no Republican filed). No US Senate contest in 2026.
 * Every row is `qualified_for_general_ballot` (certified primary results). No
 * `declared_general_ballot_intent`, `write_in_qualified`, or
 * `runoff_pending` rows — Pennsylvania has no primary-runoff mechanism, and
 * no independent/minor-party/write-in candidate has qualified for the
 * general ballot in any district as of this build (see operational notes
 * above).
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the official source as of 2026-07-16. The
 *     August 3, 2026 nomination-papers filing deadline and the August 10,
 *     2026 objections/withdrawal deadlines (both nomination-papers and
 *     primary-nominated candidates) are all still open as of this build;
 *     see the dated re-check card.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const PA_STATE = "PA";
export const PA_ELECTION_YEAR = 2026;
export const PA_STAGE = "general" as const;
export const PA_HOUSE_SOURCE_URLS = [
  "https://www.electionreturns.pa.gov/Home/OfficeResults?officeId=11&ElectionID=117&ElectionType=P&IsActive=1",
  "https://www.pavoterservices.pa.gov/ElectionInfo/electioninfo.aspx",
];
export const PA_RETRIEVED_AT = "2026-07-16";

export const PA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Brian Fitzpatrick (REP, incumbent, unopposed); Bob Harvie
  // (DEM) won a 2-way primary over Lucia Simonelli, 65.14%-34.86%.
  {
    district: "01",
    name: "Bob Harvie",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Brian Fitzpatrick",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 02 — Brendan F. Boyle (DEM, incumbent, unopposed); Jessica
  // Arriaga (REP, unopposed).
  {
    district: "02",
    name: "Brendan F. Boyle",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Jessica Arriaga",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 03 — OPEN SEAT (incumbent Dwight Evans not seeking re-election —
  // absent from all Democratic primary filers, confirmed by name-search
  // against house.gov). Chris Rabb (DEM) won a 4-way primary (44.62%) over
  // Sharif Street (29.26%), Ala Stanford (24.05%), and Shaun Griffith
  // (2.06%). No Republican candidate filed for this district — see
  // operational notes above. No CD3 row carries `isIncumbent: true`.
  {
    district: "03",
    name: "Chris Rabb",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 04 — Madeleine Dean (DEM, incumbent, unopposed); Aurora Stuski
  // (REP, unopposed).
  {
    district: "04",
    name: "Madeleine Dean",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Aurora Stuski",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 05 — Mary Gay Scanlon (DEM, incumbent, unopposed); Nick
  // Manganaro (REP, unopposed).
  {
    district: "05",
    name: "Mary Gay Scanlon",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Nick Manganaro",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 06 — Chrissy Houlahan (DEM, incumbent, unopposed); Marty Young
  // (REP, unopposed).
  {
    district: "06",
    name: "Chrissy Houlahan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Marty Young",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 07 — Ryan Mackenzie (REP, incumbent, unopposed — unseated Susan
  // Wild in 2024); Bob Brooks (DEM) won a 4-way primary (41%) over Ryan
  // Crosswell (21.29%), Lamont G. McClure (19.95%), and Carol
  // Obando-Derstine (17.77%).
  {
    district: "07",
    name: "Bob Brooks",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Ryan Mackenzie",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 08 — Rob Bresnahan Jr. (REP, incumbent, unopposed — unseated
  // Matt Cartwright in 2024); Paige Cognetti (DEM, unopposed).
  {
    district: "08",
    name: "Paige Cognetti",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Rob Bresnahan Jr.",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 09 — Dan Meuser (REP, incumbent, unopposed); Rachel Wallace
  // (DEM, unopposed).
  {
    district: "09",
    name: "Rachel Wallace",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Dan Meuser",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 10 — Scott Perry (REP, incumbent, unopposed); Janelle Stelson
  // (DEM) won a 2-way primary over Justin Douglas, 67.44%-32.56%.
  {
    district: "10",
    name: "Janelle Stelson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Scott Perry",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 11 — Lloyd K. Smucker (REP, incumbent, unopposed); Nancy
  // Mannion (DEM, unopposed).
  {
    district: "11",
    name: "Nancy Mannion",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Lloyd K. Smucker",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 12 — Summer Lee (DEM, incumbent) won a 2-way primary over
  // William Parker, 81.2%-18.8%; James Hayes (REP, unopposed).
  {
    district: "12",
    name: "Summer Lee",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "James Hayes",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 13 — John Joyce (REP, incumbent, unopposed); Beth Farnham
  // (DEM, unopposed).
  {
    district: "13",
    name: "Beth Farnham",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "John Joyce",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 14 — Guy Reschenthaler (REP, incumbent, unopposed); Alan
  // Bradstock (DEM, unopposed).
  {
    district: "14",
    name: "Alan Bradstock",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Guy Reschenthaler",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 15 — Glenn "GT" Thompson (REP, incumbent, unopposed); Ray
  // Bilger (DEM, unopposed).
  {
    district: "15",
    name: "Ray Bilger",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: 'Glenn "GT" Thompson',
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 16 — Mike Kelly (REP, incumbent, unopposed); Justin Wagner
  // (DEM, unopposed).
  {
    district: "16",
    name: "Justin Wagner",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Mike Kelly",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 17 — Chris Deluzio (DEM, incumbent, unopposed); Tony Guy (REP)
  // won a 2-way primary over Jesse James Vodvarka, 53.26%-46.74%.
  {
    district: "17",
    name: "Chris Deluzio",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Tony Guy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

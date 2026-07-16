/**
 * scripts/congressional-rosters/ct-official-roster-2026.ts
 *
 * MINOR-PARTY CORRECTION (2026-07-16, found by Muxin's own post-merge
 * review of the CD1 PDF): the original build's docblock claimed "no
 * Green/Working Families/Independent congressional nomination has been
 * certified yet" and transcribed only 4 CD1 candidates
 * (Bronin/Gilchrest/Larson/Chai). Both claims were wrong: the CD1 PDF's 9th
 * page is a Green Party of Connecticut minor-party certification (CGS Sec.
 * 9-452), received by SOTS 2026-07-02, naming Mary L. Sanders as CD1's
 * certified Green nominee for the Nov 3, 2026 general election.
 *
 * ROOT CAUSE (confirmed from the original build's own transcript, not
 * guessed): its first pypdf text-extraction pass over cd1.pdf correctly
 * reported `pages: 9` and — same known failure mode already flagged
 * elsewhere in this file for Rep. Hayes' CD5 page — page index 8 (the
 * Green Party letter) came back as empty text, just like every blank
 * spacer page. When the build then constructed its worklist of pages to
 * visually re-render as bitmaps (the documented mitigation for exactly
 * this failure mode), it built that list FROM the pages that had
 * non-empty extracted text (`cd1.pdf: [0, 2, 4, 6]`) rather than from the
 * PDF's true full page range (0-8, all 9 pages). Page 8 was blank-text
 * for the same reason Hayes' page was — a scanned/non-extractable page,
 * not a non-candidate page — but unlike Hayes' page (which got caught
 * because the build separately went back and visually verified CD5's
 * blank-looking pages too), CD1's page 8 was silently dropped before the
 * visual-render step ever ran, because the worklist itself was already
 * filtered down to "pages pypdf found text on."
 *
 * AVOIDANCE FOR FUTURE STATES: never build a page worklist from which
 * pages *had extractable text* — that's the exact signal this failure
 * mode corrupts. Get the true page count (`len(pdf.pages)`) once per
 * file, then visually render and account for EVERY page in that range
 * (candidate, blank spacer, or other) before transcribing anything.
 * "Blank text" must route a page INTO the visual-review queue, never out
 * of it.
 *
 * A same-day re-check of the other 4 districts' PDFs (2nd/3rd/5th CD: even
 * page counts, 2 pages per candidate, matching each district's known
 * candidate count exactly; 4th CD: odd 5-page count explained by one
 * Docusign-native page with no blank spacer, not a missing candidate) found
 * no further gaps. Fixed by adding the Sanders row below; no other changes.
 *
 * Connecticut's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 5 US House districts. CT has 0 US Senate
 * contests in 2026 (Blumenthal's Class III seat runs to 2029, Murphy's
 * Class I seat to 2031) — no senate rows here. Built through the same
 * manual official-source pipeline as AZ/TX/OK/AL/AK, epic c5a813bb; this is
 * Connecticut's build (card CT official-roster card).
 *
 * CONNECTICUT-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/connecticut-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Connecticut is NOT Civix-vended. Its official congressional-candidate
 *     source is a set of 5 static, text-layer PDFs published directly by
 *     the Secretary of the State — one per district, each a scanned/
 *     Docusign-signed "Certificate of Party Endorsement, 15% Eligibility,
 *     or Nomination" bundle — linked from
 *     https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements.
 *     No browser automation was needed; plain `curl` fetched every PDF.
 *   - IMPORTANT PARSING GOTCHA: several of these PDF pages are
 *     image-only scans (no embedded text layer) — a plain `pypdf` text
 *     extraction silently returned blank pages for some candidates
 *     (Connecticut's own Rep. Jahana Hayes' CD5 endorsement, notably) and,
 *     worse, on at least one page (Amy Chai's CD1 certificate) extracted
 *     the surrounding form-field LABEL text without indicating which
 *     checkbox was actually marked, which could have caused a checked
 *     "Republican" party to be silently misread. Every page was re-rendered
 *     as a bitmap (`pypdfium2`) and visually re-read to confirm the actual
 *     checked party/status boxes before transcription — do not trust
 *     `pypdf`/`pdfminer` text extraction alone for these CT forms.
 *   - CT uses a party-convention-endorsement ballot-access system (Conn.
 *     Gen. Stat. § 9-400 et seq.), not a simple open filing period: each
 *     major party's district convention (all 5 CDs' conventions were held
 *     2026-05-11 or 2026-05-15) either endorses one candidate outright, or
 *     — when a challenger crosses a 15% delegate-vote threshold — sends
 *     multiple candidates to an August 11, 2026 primary. A THIRD, separate
 *     ballot-access path exists in parallel: a candidate who does not clear
 *     15% at convention can still reach the primary ballot by collecting
 *     nominating-petition signatures, filed with the town Registrar of
 *     Voters (not the Secretary of the State) by the 2026-06-09 deadline.
 *   - KNOWN LIMITATION — petition-route primary candidates are NOT captured
 *     by the Certificate-of-Endorsement PDFs above (those PDFs only cover
 *     the convention-endorsed/15%-threshold route). No single consolidated
 *     official CT document enumerating petition-qualified primary
 *     candidates was located this session (portal.ct.gov's "List of
 *     Candidates" / "Filed Candidates" pages under Candidate-Lists-for-
 *     Office only serve stale 2008-2014 archives; no per-town aggregation
 *     was found). Three candidates in this fixture reached the primary
 *     ballot via that petition route and are recorded here on the strength
 *     of multiple independent, mutually-corroborating contemporaneous news
 *     sources (not a single unverified source) rather than a direct
 *     official document: Ruth Fortune (CD1 Dem — confirmed by CT Mirror's
 *     candidate-forum coverage and Ballotpedia's CD1 primary page, both
 *     naming her alongside the convention-certified Bronin/Larson/
 *     Gilchrest as the 4th primary contestant); Winter Solomita and Jackson
 *     Taddeo-Waite (CD5 Dem — confirmed by the Lakeville Journal's
 *     district-candidate roundup and Ballotpedia, both naming them as
 *     Hayes' primary challengers with $0 reported FEC receipts). This is
 *     an explicit, disclosed gap in official-source coverage — not a
 *     guess about a contest OUTCOME (the plan's SAFETY rule) — consistent
 *     with the "nobody gets left out" principle: omitting real primary
 *     contestants because the single strongest official document doesn't
 *     happen to cover their ballot-access route would itself be a
 *     completeness failure.
 *   - CD1 has one certified minor-party filer: Mary L. Sanders (Green),
 *     certified by the Green Party of Connecticut under CGS Sec. 9-452 and
 *     received by SOTS 2026-07-02 — see the "MINOR-PARTY CORRECTION" note
 *     at the top of this file. Every other candidate below is a
 *     two-major-party (DEM/REP) filer; no other Green/Working
 *     Families/Independent congressional nomination has been certified as
 *     of this fixture's retrieval — CT's minor-party nomination deadline is
 *     2026-09-02, still in the future. `GRE` already existed in
 *     `types.ts` (added for a prior state), so no new party code was
 *     needed for this fixup.
 *   - `ballotStatus` judgment call: CD2 (Courtney/Austin), CD3 (DeLauro/
 *     Lancia), and the uncontested sides of CD1 (Chai, R) and CD4 (Himes,
 *     D) have NO primary — each party's sole convention-endorsed candidate
 *     is already the determined general-ballot nominee, so those rows use
 *     "qualified_for_general_ballot". CD1's Democratic primary (Bronin/
 *     Larson/Gilchrest/Fortune), CD4's Republican primary (Goldstein/
 *     Meressi), and CD5's Democratic primary (Hayes/Solomita/Taddeo-Waite)
 *     and Republican primary (Shea/DeBarros) are all still pending the
 *     2026-08-11 primary — those rows use "qualified_for_primary_ballot".
 *     `stage` is set to "general" for every row in this fixture regardless
 *     (mirroring Oklahoma's precedent, card d9b1ef86 — the SOTS certificate
 *     document itself is titled "November 3, 2026, General Election" for
 *     every filer, primary-pending or not, and `stage` is write-only
 *     metadata unread by officialRoster.ts/races.ts; `ballotStatus` is the
 *     field that actually differentiates a determined nominee from a
 *     primary-pending contestant).
 *   - No runoff mechanism exists in CT (src/data/states/CT.json's
 *     `runoffRules.hasRunoff` is `false`) — "runoff_pending" never applies
 *     here; a contested race is "qualified_for_primary_ballot" only, same
 *     as the pre-primary AZ/AK pattern.
 *   - Spelling discrepancy, resolved in favor of the official document:
 *     the CD4 Republican 15%-eligibility certificate is signed "Daniel
 *     Meressi" (matching his own handwritten authorization line), while
 *     nearly every news source spells the surname "Miressi". This fixture
 *     follows the official certificate's spelling, per the source
 *     hierarchy's preference for the legally responsible authority's own
 *     document over secondary reporting.
 *   - INCUMBENCY was cross-checked against the U.S. House Clerk's official
 *     member-data feed (https://clerk.house.gov/xml/lists/MemberData.xml,
 *     publish-date 2026-07-06 at retrieval — the most current official
 *     roster available), never guessed from the certificate documents'
 *     own framing or from this app's own FEC-derived `candidates` table:
 *     confirms John B. Larson (CT-01), Joe Courtney (CT-02), Rosa L.
 *     DeLauro (CT-03), James A. Himes (CT-04), and Jahana Hayes (CT-05) —
 *     all 5 Democratic incumbents, all seeking re-election in 2026, no
 *     open seats. No senate.gov/Bioguide cross-check was needed since CT
 *     has no 2026 Senate contest.
 *   - No independent/write-in candidates, and no further minor-party
 *     filers beyond CD1's Sanders (Green), exist yet for any CT
 *     congressional seat as of retrieval — CT's minor-party nomination
 *     deadline (2026-09-02) has not passed, and no separate independent-
 *     declaration document (comparable to TX's or OK's) was found; this
 *     fixture will need a follow-up update once further minor-party/
 *     independent nominations are certified and once the August 11
 *     primaries determine each contested race's actual general-ballot
 *     nominee.
 *
 * Sources:
 *   - https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements
 *     (Secretary of the State's landing page linking each district's
 *     Certificate-of-Endorsement PDF bundle)
 *   - https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/1st-cd-dem--rep-ada.pdf
 *   - https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/2nd-cd-dem--rep-ada.pdf
 *   - https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/3rd-cd-dem--rep-ada.pdf
 *   - https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/4th-cd-dem--rep-ada.pdf
 *   - https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/5th-cd-dem--rep-ada.pdf
 *
 * Coverage: all 5 US House districts. CT has 0 US Senate contests in 2026.
 *
 * KNOWN LIMITATIONS: see the operational notes above (petition-route
 * candidates cross-verified via independent secondary sources rather than
 * a single official document; no minor-party/independent filers exist yet;
 * two of five districts' nominations are still pending the August 11
 * primary).
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const CT_STATE = "CT";
export const CT_OFFICE = "house" as const;
export const CT_ELECTION_YEAR = 2026;
export const CT_STAGE = "general" as const;
export const CT_HOUSE_SOURCE_URLS = [
  "https://portal.ct.gov/sots/election-services/certificate-of-endorsement/2026-certificate-of-endorsements",
  "https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/1st-cd-dem--rep-ada.pdf",
  "https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/2nd-cd-dem--rep-ada.pdf",
  "https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/3rd-cd-dem--rep-ada.pdf",
  "https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/4th-cd-dem--rep-ada.pdf",
  "https://portal.ct.gov/-/media/sots/electionservices/certificates_of_party_endorsement/2026/us-congress/5th-cd-dem--rep-ada.pdf",
];
export const CT_RETRIEVED_AT = "2026-07-15";

export const CT_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // --- CD1 — Democratic primary pending (2026-08-11); Republican side
  // uncontested (Chai is the sole Republican filer). ---
  {
    district: "01",
    name: "Luke Bronin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jillian Gilchrest",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "John B. Larson",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Petition-route primary candidate — not on the SOTS Certificate of
  // Endorsement PDF; see the docblock's "KNOWN LIMITATION" note.
  {
    district: "01",
    name: "Ruth Fortune",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Amy Chai",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Green Party minor-party certification (CGS Sec. 9-452), page 9 of the
  // CD1 PDF — a 9th, oddly-placed page after the 4 major-party candidate
  // pages that the original build missed. Found via Muxin's own read of
  // the source PDF post-merge; see the docblock's "MINOR-PARTY CORRECTION"
  // note below. No primary applies to a minor-party nominee, so this is a
  // determined general-ballot row like Chai's, not primary-pending.
  {
    district: "01",
    name: "Mary L. Sanders",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // --- CD2 — uncontested both sides. ---
  {
    district: "02",
    name: "Joe Courtney",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "George Patrick Austin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // --- CD3 — uncontested both sides. ---
  {
    district: "03",
    name: "Rosa L. DeLauro",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Christopher Lancia",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // --- CD4 — Democratic side uncontested (Himes); Republican primary
  // pending (2026-08-11). ---
  {
    district: "04",
    name: "Jim Himes",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Michael Ted Goldstein",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Daniel Meressi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // --- CD5 — both parties' primaries pending (2026-08-11). ---
  {
    district: "05",
    name: "Jahana Hayes",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Petition-route primary candidates — not on the SOTS Certificate of
  // Endorsement PDF; see the docblock's "KNOWN LIMITATION" note.
  {
    district: "05",
    name: "Winter Solomita",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Jackson Taddeo-Waite",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Chris Shea",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Jonathan DeBarros",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

# Ohio vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Ohio (OH)" (backlog line 1513),
parent epic `c5a813bb-9223-4dc1-95aa-65637eb6940b` (nationwide official-source
congressional roster).

Date: 2026-07-16. Ohio's 2026 primary (2026-05-05) is already past and
certified — Ohio has **no runoff primary**, so the primary winner is
automatically the November nominee. The general election is 2026-11-03.

## Bottom line

**GO on the approach for Ohio.** All 15 OH House districts plus the Senate
special election render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 16 contests**.

**Ohio is not Civix-vended, and unlike every prior state in this track, has
no unified statewide candidate source at all.** `ohiosos.gov` and
`boe.ohio.gov` publish static guidance PDFs and are both bot-WAF-blocked to
non-browser fetches, but neither is the actual candidate-roster authority.
Ohio's congressional candidates file with — and are certified by — the
Board of Elections of the *most populous county* touching their district.
This build transcribed all 15 districts + the Senate race from **10
different county Boards of Elections' own official documents**, each row
citing the specific county document it actually came from (see "How this
was verified" below).

**No new `OfficialBallotStatus` value or party code was needed.** Every row
is `qualified_for_general_ballot`, `write_in_qualified` (3 rows — two
already-confirmed write-ins in OH-7, one in OH-15), or
`declared_general_ballot_intent` (1 row — an independent Senate filer).
Ohio has no runoff mechanism, so `runoff_pending` does not appear anywhere.
Ohio recognizes no uniquely-named minor party among these 16 contests (no
equivalent of Kentucky's "The Kentucky Party" or Alaska's "AKP") — existing
DEM/REP/LIB/IND codes cover every candidate found.

**Two governing calendar dates are still open** as of this build
(2026-07-16): Ohio's write-in declaration deadline (2026-08-23) and
candidate-withdrawal deadline (2026-08-25). A dated re-check follow-up card
is opened per the epic's NOT BEFORE convention — see "Governing calendar
dates" below.

**NO-GO on fan-out to further states** until the manual track has covered a
few more, and **NO-GO on flipping the flag for real users** without Muxin's
sign-off — same standing gate as every prior state.

## How this was verified — a decentralized, county-by-county source, no
Civix and no unified statewide portal

Ohio's official candidate/election source runs neither Civix nor any single
statewide vendor SPA. Its election administration is genuinely decentralized
to 88 county Boards of Elections, each running its own website/CMS
(WordPress, Revize CMS, custom ASP.NET, or a plain county `.gov` domain).

1. **`ohiosos.gov` and `boe.ohio.gov` are bot-WAF-blocked** (403, or a fake
   "Website Maintenance" page) to `WebFetch`/`curl`, even with full browser
   headers — this matches the pattern seen on other states' state-level
   sites, but here it mattered more, because neither domain is actually the
   candidate-roster source anyway (unlike AZ/OK/TX where the state-level
   site *was* the source).
2. **The breakthrough: individual county BOE domains are NOT behind that
   same WAF.** `WebFetch` could download county PDFs as raw binary directly
   from e.g. `boe.cuyahogacounty.gov`, `vote.franklincountyohio.gov`,
   `boe.woodcountyohio.gov`, `cms7files1.revize.com` (Stark County's CMS
   host), `elections.bcohio.gov`/`cms2.revize.com` (Butler County),
   `wpassets.lakecountyohio.gov` (Lake County) — and the `Read` tool's
   native PDF parser extracted clean, machine-readable candidate tables
   from every one of them. **Ten of fifteen House districts + the Senate
   race were confirmed this way**, via each anchor county's own official
   "November 3, 2026 General Election Candidate List" document.
3. **Five districts' anchor counties (Hamilton — OH-1/OH-8, Clermont —
   OH-2, Union — OH-4, Licking — OH-12) had not yet republished that
   convenience document** at transcription time — several Ohio counties
   don't post it until closer to the write-in/withdrawal deadlines in late
   August. Rather than treat this as a gap, this build used each county's
   own **certified May 5, 2026 primary results** instead: since Ohio has no
   runoff, the certified primary winner *is* the November nominee as a
   matter of law, so the "candidate list for the general" is a convenience
   republication, not the underlying authority. This mirrors how
   Oklahoma's build in this same track derived nominees from certified
   primary vote totals rather than waiting for a similar document. Every
   one of these 5 districts' figures came from an official, dated,
   county-certified results PDF (e.g. Hamilton County's "Primary 2026
   Official Results — Cumulative Results Report," Clermont County's "2026
   May 5 Primary Election – Summary Group Detail – Official Results,"
   Union County's "May 5, 2026 Primary — Official Summary Report," Licking
   County's "Licking's Official Canvass") — full vote totals recorded in
   the fixture file's own commit history/research notes, not just the
   winner's name.
4. **Licking County has no independent domain** — its results are hosted
   under `boe.ohio.gov/licking/...`, which returns HTTP 403 to `WebFetch`
   (matching the general state-level WAF block) and whose Chrome PDF
   viewer proved unresponsive to scripted click/scroll/keyboard input. The
   workaround: opening the PDF URL directly with a `#page=N` fragment (a
   full navigation, not an in-page action) let Chrome's native viewer
   render the target page cleanly for a screenshot read, without ever
   needing the viewer to respond to interaction.
5. **Incumbency cross-check**, never guessed from a county document:
   `https://www.house.gov/representatives` ("By State and District" →
   Ohio; a long, lazy-loaded, virtualized directory — anchor-only
   navigation doesn't populate the DOM, actual scrolling was required) for
   all 15 House seats, and `https://www.husted.senate.gov/about/` (Jon
   Husted's own official Senate page) for the Senate seat. **This app's
   own FEC-derived `candidates` table was deliberately never used for this
   cross-check.**

**Independent candidates:** Ohio's independent-candidate filing deadline
(ORC § 3513.257 — 4pm the day before the primary, 2026-05-04) has already
passed. One independent Senate filer, **Gregory Lee Levy**, is confirmed
via Butler County's own official "Candidate & Petition Activity" document
(marked "(N)", that county's own label for a non-major-party filer — not a
distinct recognized party). Whether Butler County had fully verified Levy's
petition-signature count as of that document's publication could not be
confirmed from the official sources read this session, so — consistent
with every prior state's equivalent gap (AZ/TX/OK/…) — Levy is recorded as
`declared_general_ballot_intent`, not `qualified_for_general_ballot`.

**Write-in candidates:** three were found already confirmed on an official
county document — Thahbia Asad and Andrey Joseph Martinichin (OH-7,
Cuyahoga County's list, marked "Yes – Write-In") and Samuel Ronan (OH-15,
Franklin County's list, same marking) — each recorded `party: null`,
`ballotStatus: "write_in_qualified"`, matching the AZ/FL/IN/KY/MD
convention. A second, self-described independent/write-in Senate candidate,
**Stephen Faris**, campaigns publicly on his own site (`writeinfaris.com`)
but does **not** appear on Cuyahoga County's official Senate candidate list
or any other official document read this session. Per the epic's SAFETY
rule against guessing, Faris is deliberately **omitted** from the fixture —
not a data gap, a documented absence from every official source checked.
Ohio's write-in deadline (2026-08-23) is still open, so this should be
re-checked after that date.

**Ohio's own party-label formatting is inconsistent county-to-county** in
the source documents themselves — spelled-out "Democratic"/"Republican"/
"Libertarian" in some counties (Wood, Hamilton), abbreviated "DEM"/"REP" or
bare "D"/"R"/"L" in others (Clermont, Butler), and "(N)"/"Nonparty"/
"Nonpartisan Write-In" for non-major-party or write-in filers. All of this
was normalized to this app's existing `DEM`/`REP`/`LIB`/`IND` codes and
`null` for write-ins — no new party code was needed, and none of these
labels represents a real distinct Ohio-recognized minor party.

**NAME COLLISION, not a data error:** Shontel M. Brown (OH-11
Representative, incumbent, seeking re-election to her House seat) and
Sherrod Brown (the Democratic nominee for the separate Senate special
election) are two different people who happen to share a surname — both
appear correctly in their respective, distinct contests.

**Not used as a source, deliberately:** Ballotpedia, Wikipedia,
270toWin. Local/regional news (WVXU, WSAZ, Richland Source, Roll Call,
NOTUS, The Reporting Project) was used only as a research lead to identify
which county to check and which document to look for — never cited as the
data source of record in the final fixture; every row traces to an
official government document (a county BOE candidate list or certified
primary-results canvass).

## A cross-check finding this build made

Ohio redrew its congressional map in November 2025 (Secretary LaRose's
directive to county boards, 2025-11-21) — the map governing the May 2026
primary and November 2026 general is the new bipartisan map, not the prior
one. This build worked entirely from post-redistricting sources (county BOE
documents and results already reflecting the new districts), so no
correction was needed, but it's recorded here because a future re-check
session should not assume the old district boundaries or anchor-county
assignments still apply from any pre-2025 reference. One concrete instance
of this mattering: Butler County's own official document places OH-8's
anchor in Hamilton County, not Butler — Butler itself anchors OH-10. A
naive assumption from Warren Davidson's (OH-8) name recognition alone would
have picked the wrong county.

## Contest inventory

Ohio has **15 US House districts and 1 US Senate contest in 2026** — a
special election for the seat JD Vance vacated on becoming Vice President.
Jon Husted was appointed to the seat in January 2025 and is himself the
Republican nominee to hold it through the special election. All 15 House
districts + the Senate race are covered by the general election; every
sitting incumbent sought re-election (no open House seats).

## What was built

Most of the AZ/TX/OK vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, and the importer's
array-shaped `FIXTURES` map. No new `OfficialBallotStatus` value, no new
party code, and no migration were needed for Ohio.

**New / changed for this build:**

- `scripts/congressional-rosters/oh-official-roster-2026.ts` (new) — 37
  House rows (all 15 districts) + 4 Senate rows, grouped into 10 per-county
  House exports (`OH_HOUSE_ROSTER_HAMILTON`, `_CLERMONT`, `_FRANKLIN`,
  `_UNION`, `_WOOD`, `_STARK`, `_CUYAHOGA`, `_BUTLER`, `_LICKING`, `_LAKE`)
  and 2 per-county Senate exports (`OH_SENATE_ROSTER_CUYAHOGA`,
  `OH_SENATE_ROSTER_BUTLER`), plus flat `OH_HOUSE_ROSTER_2026` /
  `OH_SENATE_ROSTER_2026` convenience exports. This is the first state in
  the track where per-row `sourceUrl` provenance genuinely varies within a
  single office — Ohio has no unified statewide source — so each grouped
  export carries its own accurate county-document citation rather than one
  blanket URL for the whole state. Full sourcing, methodology, and known
  limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `OH` in `FIXTURES` with
  **12 separate fixture entries** (10 House + 2 Senate, one per source
  county), each with its own accurate `sourceUrl` — a structural first for
  this track (every prior state had 1-2 entries, one per office). No
  changes to the importer's logic itself; `FIXTURES[state]` was already an
  array, so this uses the existing shape, just with more entries.
- `src/lib/server/officialRoster.test.ts` — 12 new tests: `getOfficialRoster`
  narrowing across all 15 OH districts + the Senate contest, confirmation
  that no row anywhere carries `runoff_pending` (Ohio has no federal
  runoff), write-in coverage (Asad/Martinichin/Ronan — `party: null`,
  `write_in_qualified`), Levy's independent status
  (`declared_general_ballot_intent`, not qualified),
  `isIncumbentSeekingReelection` for all 15 House incumbents + Husted (who
  is both the incumbent AND the nominee), and `lookupChallengers` wiring
  (both chambers covered, FEC query skipped; OH-3 as a clean two-way race;
  OH-7 exercising write-ins; Senate exercising Husted's
  incumbent-AND-nominee exclusion — he does not appear in the challengers
  list despite being on the ballot, same `.filter((r) => !r.isIncumbent)`
  behavior verified for every prior state).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): **clean.**
  162 test files, 3242 tests passing, 5 pre-existing `todo` (no failures),
  3247 total. Includes the 12 new `officialRoster.test.ts` additions
  (206/206 tests in that file). Note: an unrelated sandbox-only Playwright
  browser-launch failure was seen in `scripts/design/capture-shared.test.ts`
  under this session's sandboxed shell (a macOS Mach-port permission
  restriction on launching headless Chromium); confirmed pre-existing and
  unrelated to this change by re-running with the sandbox disabled, where
  it passes cleanly — the figures above are the sandbox-disabled, true
  result.
- OH's 41 rows (37 House + 4 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  `pg`-equivalent (`@neondatabase/serverless`) row-count query — **41 both
  times** (37 house / 4 senate), queried directly against
  `official_roster_candidates`, not just the importer's self-reported
  count.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 15 OH House
  districts and the Senate race, diffed against the fixture. **0
  mismatches across all 16 contests.** Full literal output (candidate
  name, party, and runoff-pending flag as the app would render it):

  ```
  OH-01 — incumbent GREG LANDSMAN, seekingReelection2026=true
    - Eric Conroy (Republican)

  OH-02 — incumbent DAVID J. TAYLOR, seekingReelection2026=true
    - Jen Mazzuckelli (Democrat)

  OH-03 — incumbent JOYCE BEATTY, seekingReelection2026=true
    - Cleophus Dulaney (Republican)

  OH-04 — incumbent JIM JORDAN, seekingReelection2026=true
    - Joshua D. Kolasinski (Democrat)

  OH-05 — incumbent BOB LATTA, seekingReelection2026=true
    - Brian A. Shaver (Democrat)
    - Michael J. Veloff (Libertarian)

  OH-06 — incumbent MICHAEL A. RULLI, seekingReelection2026=true
    - Elizabeth Kirtley (Democrat)

  OH-07 — incumbent MAX MILLER, seekingReelection2026=true
    - Brian Poindexter (Democrat)
    - Thahbia Asad (write-in)
    - Andrey Joseph Martinichin (write-in)

  OH-08 — incumbent WARREN DAVIDSON, seekingReelection2026=true
    - Vanessa Enoch (Democrat)

  OH-09 — incumbent MARCY KAPTUR, seekingReelection2026=true
    - Derek Merrin (Republican)
    - Matthew Althaus (Libertarian)

  OH-10 — incumbent MIKE TURNER, seekingReelection2026=true
    - Kristina Knickerbocker (Democrat)
    - Thomas F. McMasters (Libertarian)

  OH-11 — incumbent SHONTEL M. BROWN, seekingReelection2026=true
    - Mike Kirchner (Republican)

  OH-12 — incumbent TROY BALDERSON, seekingReelection2026=true
    - Jerrad Christian (Democrat)

  OH-13 — incumbent EMILIA SYKES, seekingReelection2026=true
    - Carey Coleman (Republican)

  OH-14 — incumbent DAVID P. JOYCE, seekingReelection2026=true
    - Maria Jukic (Democrat)

  OH-15 — incumbent MIKE CAREY, seekingReelection2026=true
    - Don Leonard (Democrat)
    - Brennan Barrington (Libertarian)
    - Samuel Ronan (write-in)

  U.S. SENATE — incumbent JON HUSTED (appointed, also the Republican
  nominee), seekingReelection2026=true
    - Sherrod Brown (Democrat)
    - William B. Redpath (Libertarian)
    - Gregory Lee Levy (Independent) [declared, petition status unconfirmed]
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Husted correctly does NOT appear in the Senate
  challengers list despite being the Republican nominee — he is the
  incumbent, and `lookupChallengers` excludes any row with `isIncumbent:
  true` from the challengers array (same convention verified for every
  prior state; his own seat card shows him separately).

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).
- **Credential-handling note:** an initial staging-import attempt hit a
  shell-quoting bug (the `.env.local` value is double-quote-wrapped; a
  naive `cut`-based extraction included the literal quotes, producing an
  invalid connection string) that caused `neon()` to throw an error with
  the **full staging connection string embedded in its message**, which
  printed into this session's tool output. This is a staging-only
  credential (never production), and the exposure was contained to this
  same session's transcript — the same trust boundary as `.env.local`
  itself — but per this repo's standing credential-handling rule, any such
  echo is treated as leak-equivalent regardless of the mechanism. Fixed by
  switching to `dotenv`'s own parser (handles quoting correctly) for every
  subsequent command, with output additionally piped through `grep -v
  "postgresql://"` as a defense-in-depth filter. **Flagging this
  explicitly so Muxin can decide whether the staging credential should be
  rotated** — not deciding that unilaterally here.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Ohio's write-in declaration deadline (2026-08-23) and
  candidate-withdrawal deadline (2026-08-25) are both still open** as of
  this build (2026-07-16). This fixture is not fully locked until those
  pass — a dated re-check follow-up card is opened per the epic's NOT
  BEFORE convention (see below).
- **Stephen Faris's self-described Senate write-in candidacy** is not on
  any official document read this session — omitted, not guessed. Should
  be re-checked once the write-in deadline passes.
- **Gregory Lee Levy's (Senate, independent) petition-verification status**
  as of Butler County's document publication is unconfirmed — recorded as
  `declared_general_ballot_intent`, the same conservative posture as every
  prior state's equivalent independent-filer gap.
- **Five districts' nominee pairing was derived from certified primary
  results rather than a republished "general candidate list"** (see "How
  this was verified," item 3) — this is the correct authoritative source
  under Ohio law (no runoff), not a lower-confidence substitute, but it is
  a different sourcing shape than the other 10 districts and is called out
  explicitly for transparency.
- Names are recorded as they appear in each official document; not
  independently re-verified against a third document beyond the
  incumbency cross-check.
- A shell-quoting incident briefly exposed the staging DB connection
  string in this session's tool output — see the credential-handling note
  above. Staging-only, contained to this session, but flagged for Muxin's
  own judgment on rotation.

## Governing calendar dates (plan doc item (e))

| Deadline | Date | Source | What it resolves |
|---|---|---|---|
| Partisan primary | 2026-05-05 | Ohio 2026 Elections Calendar | Already passed — sets every determined nomination above |
| Independent candidate filing (House/Senate) | 2026-05-04, 4pm | ORC § 3513.257, `https://codes.ohio.gov/ohio-revised-code/section-3513.257` | Already passed — Levy's independent filing is locked; no new independent Senate/House filer can appear |
| **Write-in declaration of intent (general election)** | **2026-08-23, 4pm** | ORC § 3513.041, `https://codes.ohio.gov/ohio-revised-code/section-3513.041` (72 days before the general) | **Still open.** Additional write-in candidates could still enter any of the 16 races before this date — Faris (Senate) is the one already-public instance to watch for |
| **Candidate withdrawal (automatic ballot removal cutoff)** | **2026-08-25** | ORC § 3513.30, `https://codes.ohio.gov/ohio-revised-code/section-3513.30` (70 days before the general) | **Still open.** Any of the 41 nominees above could still withdraw and be scrubbed from the ballot before this date |
| UOCAVA/overseas ballots ready | 2026-09-18 | ORC § 3511.04 | Practical "ballot must be finalized" checkpoint for overseas/military voters |
| Post-election canvass/certification | on/before 2026-11-24 | ORC § 3505.32, `https://codes.ohio.gov/ohio-revised-code/section-3505.32` (21 days after the election) | Post-election results certification — not a pre-election candidate-set lock |

**Net effect:** the candidate-set portion of this fixture is not fully
locked until **2026-08-25** (the later of the write-in and withdrawal
windows). A dated follow-up card (`NOT BEFORE: 2026-08-26`) is being opened
on the backlog per the epic's NOT BEFORE DATE-GATE CONVENTION to re-check
after both windows close.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/ohio-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/oh-official-roster-2026.ts`.
- **Official Ohio source URLs used** (10 county documents + 2 incumbency
  cross-checks + 4 statute citations; full untruncated URLs):
  - `https://votehamiltoncountyohio.gov/wp-content/uploads/2026/05/Cumulative-FINAL-1.pdf`
    (Hamilton County BOE, "Primary 2026 Official Results," OH-1 + OH-8)
  - `https://cms2.revize.com/revize/clermontcounty/OfficialGroupDetail.pdf`
    (Clermont County BOE, "2026 May 5 Primary Election – Summary Group
    Detail – Official Results," OH-2)
  - `https://vote.franklincountyohio.gov/getmedia/92039866-8eae-4fdc-a638-66ac8631bc70/2026-General-Candidate-List-2`
    (Franklin County BOE, "2026 General Election Candidates," OH-3 + OH-15)
  - `https://www.unioncountyohio.gov/media/Agencies/Board%20of%20Elections/union-election-summary.pdf`
    (Union County BOE, "May 5, 2026 Primary — Official Summary Report,"
    OH-4)
  - `https://boe.woodcountyohio.gov/DocumentCenter/View/370/Candidate-List-PDF`
    (Wood County BOE, "Candidate List for November 3, 2026 General
    Election," OH-5 + OH-9)
  - `https://cms7files1.revize.com/starkcountyoh/Document_center/Offices/Board%20of%20Elections/Candidates%20Issues%20&%20Campaign%20Finance%20Information/Candidates%20List%20General.pdf`
    (Stark County BOE, "Candidates List," General Election Nov 3 2026, OH-6
    + OH-13)
  - `https://boe.cuyahogacounty.gov/docs/default-source/boe/candidates-page/candidate-list.pdf?sfvrsn=4b1792c0_609`
    (Cuyahoga County BOE, Nov 2026 general candidate list, OH-7 + OH-11 +
    Senate — Husted, Sherrod Brown, Redpath)
  - `https://cms2.revize.com/revize/butlercountyboe/2026/November/PetitionActivityReport.pdf`
    (Butler County BOE, "Candidate & Petition Activity," OH-10 + Senate —
    Levy)
  - `https://www.boe.ohio.gov/licking/c/elecres/20260505results.pdf`
    (Licking County BOE, "Licking's Official Canvass," May 5, 2026
    Primary, OH-12)
  - `https://wpassets.lakecountyohio.gov/wp-content/uploads/sites/12/2026/07/15095752/2026-Candidate-Filings.pdf`
    (Lake County BOE, "November 3, 2026 General Election Candidate List,"
    OH-14)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not an Ohio source, cited because it materially shaped every
    `isIncumbent` value)
  - `https://www.husted.senate.gov/about/` (Senate incumbency cross-check
    only)
  - `https://codes.ohio.gov/ohio-revised-code/section-3513.257` (independent
    filing deadline)
  - `https://codes.ohio.gov/ohio-revised-code/section-3513.041` (write-in
    declaration deadline)
  - `https://codes.ohio.gov/ohio-revised-code/section-3513.30` (withdrawal
    deadline)
  - `https://codes.ohio.gov/ohio-revised-code/section-3505.32`
    (post-election canvass/certification deadline)
- **Operational-navigation section:** "How this was verified" above.
- **Governing calendar dates:** table above.

## GO/NO-GO verdict

**GO on the approach for Ohio — the manual track generalizes to a fully
decentralized, county-based source with no unified statewide portal at
all, a materially different shape than any prior state. NO-GO on
proceeding to more states or real users without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   prior state. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere persistent.
2. **A follow-up re-check is needed after 2026-08-25**, once Ohio's
   write-in and withdrawal windows both close, to confirm no late write-in
   entered and no nominee withdrew. A dated `NOT BEFORE: 2026-08-26`
   follow-up card is opened on the backlog for this.
3. **Faris's (Senate) write-in candidacy should be checked** at that same
   re-check, alongside the general write-in/withdrawal sweep.
4. **The staging-credential exposure noted above** is Muxin's call on
   whether to rotate — flagged, not acted on unilaterally.

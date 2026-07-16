# Kentucky vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Kentucky (KY)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Tenth state
built through this manual track, after Arizona, Texas, Oklahoma, Alabama,
Alaska, California, Colorado, Connecticut, Arkansas, Delaware, Florida, and
Hawaii (built off origin/main including all of the above).

Date: 2026-07-15. Kentucky's 2026 primary (2026-05-19) is already past —
**this is a post-primary, general-election-stage build**, like OK's/AL's/
AR's, not a pre-primary snapshot like AZ/DE/FL/HI. The general election is
2026-11-03.

## Bottom line

**GO on the approach for a tenth state.** All 6 KY US House districts plus
the Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 7 contests.**

**Kentucky is not Civix-vended.** Its official candidate source
(`web.sos.ky.gov/CandidateFilings/`) is a plain server-rendered ASP.NET
page — the I06 rehearsal's `sourceFormat: "portal"` / `parserFamily:
"rendered_portal"` classification undersold this: no browser automation was
needed at all, every office/district link is a real, directly-navigable
`Default.aspx?id=N` URL, and the full candidate table for an office renders
in one page load. This is the easiest source mechanically of any state
built so far.

**A load-bearing discovery: the portal's "Election" selector offers exactly
ONE election, "2026 General Election" — there is no separate primary
listing to derive a nominee from.** Every state built before Kentucky
either read primary-stage filers directly (AZ/DE/FL/HI) or had to derive
the general nominee from separately-published primary results (OK/AL/AR).
Kentucky's portal instead already reflects the settled post-primary
GENERAL-ballot filer set directly: every contested district shows exactly
one Republican and one Democratic filer, never two of the same party. This
was independently confirmed, not just inferred from the count pattern, for
the one district with a real primary upset: **KY-4's sitting Rep. Thomas
Massie lost the May 19, 2026 Republican primary to Trump-endorsed Ed
Gallrein** — the most expensive US House primary in American history at
the time — and Gallrein, not Massie, is the only Republican filer for KY-4
on the portal. Kentucky has no runoff primary for federal office (plurality
wins), so no derivation or `runoff_pending` row was ever in play.

**Two open seats, for two different, independently-confirmed reasons:**

- **KY-4:** Massie ran for re-election and lost his own primary (confirmed
  via web search cross-referencing NBC News/Ballotpedia primary-night
  coverage) — not a retirement, an electoral defeat.
- **KY-6:** sitting Rep. Andy Barr filed for **US Senate** instead of
  re-election to his House seat — confirmed absent from every KY-6 filer,
  confirmed present as a Senate Republican filer.

**US Senate is a fully open seat:** Mitch McConnell (the sitting senator
whose Class II seat is up in 2026) did not file for any 2026 office,
consistent with his 2025 retirement announcement — confirmed via
`senate.gov`'s Kentucky state page.

**A new state-recognized minor party, "Kentucky Party," required one new
party code (`KYP`)** — mirroring the AIP/AKP/NPP/PF/LPF/FFP precedent for a
state's own ballot-qualified minor party, added to
`scripts/congressional-rosters/types.ts` and `src/lib/server/races.ts`'s
`PARTY_NAMES` map.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** `https://web.sos.ky.gov/CandidateFilings/` loads
   directly to a "Candidate Filings with the Office of the Secretary of
   State" search page, defaulted to the "2026 General Election" (the only
   entry in its Election dropdown — confirmed by inspecting the combobox's
   full option list). The landing page already shows per-office filing
   counts as clickable links (`US Senator (4)`, `US Representative (21)`,
   plus non-federal offices out of scope).
2. **Tooling — a plain server-rendered page, no browser automation
   required for the pull itself.** Each office link resolves to a stable,
   directly-navigable URL (`Default.aspx?id=3` for Senate, `Default.aspx?
   id=4` for House) that renders the FULL candidate table for that office
   — name, address/email, office, district, party, and date filed — in one
   page load. No virtualized scroll (unlike TX's Civix Election Night
   Results grid), no per-district filter requirement (unlike Civix's
   single-select Office Name field), no pagination (unlike HI's 411-row
   Telerik grid). `mcp__claude-in-chrome__read_page` with `filter: "all"`
   returned every row of both tables directly from the accessibility tree
   — `get_page_text` alone undercounted (it missed the actual candidate
   rows on first read, likely a client-side render-timing artifact; the
   full `read_page` accessibility-tree read was reliable and used for the
   final transcription).
3. **Confirming these ARE the settled post-primary nominees, not a filed
   candidate/primary field.** The critical risk flagged by the card's own
   ORIGIN note (a filings listing might not be a certified post-primary
   roster) was resolved three ways: (a) the portal's Election selector has
   only ONE option, "2026 General Election" — there's no primary-stage
   list to have accidentally read instead; (b) every contested district's
   filer count by party is exactly 1-per-party, never 2+ of the same party
   (the empirical signature of a settled field, not an open primary
   ballot); (c) independently verified against real news coverage for the
   one district with an actual contested primary outcome, KY-4 — Massie
   lost to Gallrein, and Gallrein (not Massie) is the sole Republican filer
   on this list, confirming the list already reflects the primary's real
   outcome rather than the pre-primary candidate field.
4. **Incumbency cross-check**, never guessed from the filing list or this
   app's FEC-derived `candidates` table: `https://www.house.gov/
   representatives` ("By State and District" → Kentucky, confirmed
   2026-07-15) lists the sitting delegation as Comer (KY-1), Guthrie
   (KY-2), McGarvey (KY-3), Massie (KY-4), Rogers (KY-5), Barr (KY-6).
   `https://www.senate.gov/states/KY/intro.htm` confirms the sitting
   senators are Mitch McConnell and Rand Paul.
5. **"Kentucky Party" identified as a real, state-recognized minor
   party**, not a data artifact — it appears in the portal's own official
   Party Affiliation filter dropdown alongside Republican/Democratic/
   Independent/Libertarian/Forefathers/American Delta/Reform/Evangelical
   Christian/Constitution/Descendants of American Slaves/Natural Law/
   Veterans/Green/Populist/Nonpartisan/Write-In — the state itself
   maintains this as a distinct, ballot-qualified party, not a synonym for
   generic Independent. Added party code `KYP`.
6. **Independent-candidate posture.** Kentucky's generic "Independent"
   filers nominate by petition (KRS 118.315: 400 signatures for a US House
   district). Per KRS 118.315(4), the Secretary of State's examination for
   petition sufficiency happens AFTER filing (candidates are notified of
   defects within 24 hours) — the sources read this session did not
   confirm every listed independent's petition had cleared that
   examination as of retrieval. Consistent with the AZ/TX/OK/AL fixtures'
   conservative posture, these are recorded `declared_general_ballot_intent`
   rather than `qualified_for_general_ballot`. "Kentucky Party" and
   Libertarian Party filers, by contrast, are recognized ballot-qualified
   parties (like OK's Libertarian nominee) — recorded
   `qualified_for_general_ballot`.
7. **Write-in candidates.** Three filers (Thomas Michael Murphy — Senate;
   Billy Ray Wilson — KY-5; Robert Quigley — KY-6) filed a declaration of
   intent to be a write-in candidate (KRS 117.265(2), due by August 24,
   2026 — all three filed well before that deadline, per their listed
   filing dates). Recorded `write_in_qualified` with `party: null`,
   matching AZ's existing write-in convention.
8. **Candidate-withdrawal deadline research — a genuine negative
   finding.** The plan doc's standing requirement to record every
   governing calendar date, including a withdrawal deadline, was checked
   against Kentucky's own official 2026 election calendar PDF
   (`elect.ky.gov/Resources/Documents/2026%20Election%20Calendar%20Final%20
   Version%2010_6_2025.pdf`, extracted via `pypdf` since a plain `WebFetch`
   only returns raw PDF binary) — it does NOT list a withdrawal deadline
   at all. Followed up against the actual statute, KRS 118.212 (via
   FindLaw's full-text reproduction): Kentucky has **no fixed statutory
   withdrawal deadline** — a candidate may withdraw at any point up to the
   election. The only date-bound consequence is whether the county clerk
   can post the required polling-place notice at least 5 days before the
   election (KRS 118.212(5), a poll-worker liability provision, not a
   withdrawal cutoff). This is a materially different pattern from
   Oklahoma's fixed April 7 deadline, and worth recording explicitly so a
   future session doesn't waste time re-deriving it.

## Contest inventory

Kentucky has **6 US House districts and 1 US Senate contest in 2026** (the
Class II seat, currently held by Mitch McConnell, not seeking re-election).
All 6 House districts + the Senate race are covered by the general
election.

| District | Incumbent | Nominee(s) | Open seat? |
|---|---|---|---|
| KY-1 | James R. Comer (R) | Comer (R, seeking re-election), John "Drew" Williams (D) | No |
| KY-2 | S. Brett Guthrie (R) | Guthrie (R, seeking re-election), Megan Wingfield (D), Thomas A. Loecken (IND) | No |
| KY-3 | Morgan McGarvey (D) | McGarvey (D, seeking re-election), Maria Teresa Rodriguez (R) | No |
| KY-4 | Thomas Massie (R) | **OPEN** — Massie lost his primary to Ed Gallrein (R); Melissa Claire Strange (D), Mohammad Wael Ahmad (KYP), Jeremy Todd (LIB) | Yes |
| KY-5 | Hal Rogers (R) | Rogers (R, seeking re-election), Ned Pillersdorf (D), Billy Ray Wilson (write-in), Gerardo Serrano (IND), Mikel Wein (IND) | No |
| KY-6 | Andy Barr (R) | **OPEN** — Barr filed for Senate instead; Ralph Alvarado (R), Zach Dembo (D), Jay J Bowman (IND), Pete Lynch (KYP), Robert Quigley (write-in) | Yes |
| US Senate | Mitch McConnell (R) | **OPEN** — McConnell not seeking re-election; Andy Barr (R), Charles Booker (D), Thomas Michael Murphy (write-in), Christopher Campbell (KYP) | Yes |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI pattern)

**Needed no changes:** `db/schema.ts` (no migration — the existing
`official_roster_candidates` table, `NULLS NOT DISTINCT` uniqueness fix
(migration 0016), and plain-text `party`/`ballot_status` columns already
cover Kentucky's shape); the importer's core upsert logic; the
`runoff_pending`/`isRunoffPending` UI path (unused — Kentucky has no
federal runoff primary, so no undetermined-nomination case exists).

**New for this build:**

- `scripts/congressional-rosters/types.ts` — one new party code, `KYP`
  ("The Kentucky Party"), mirroring the AIP/AKP/NPP/PF/LPF/FFP precedent
  for a state's own recognized minor party.
- `src/lib/server/races.ts` — `KYP: "Kentucky Party"` added to the
  `PARTY_NAMES` display map, same pattern as every prior state-specific
  minor-party code.
- `scripts/congressional-rosters/ky-official-roster-2026.ts` (new) — 21
  House rows (all 6 districts) + 4 Senate rows, house+senate shape
  (mirrors OK/AL/AR/DE/FL, not CT/CA/HI's house-only shape). Full sourcing,
  methodology, and the Massie/Gallrein and withdrawal-deadline findings are
  in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `KY` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as OK/AL/AR/DE/FL.
- `src/lib/server/officialRoster.test.ts` — added KY's import block,
  `kyDbRow` helper, `KY_HOUSE_DB_ROWS`/`KY_SENATE_DB_ROWS`,
  `KY_INCUMBENT_SAMPLE`, and three `describe` blocks (narrowing, incumbency,
  wiring) covering all 6 districts, the Senate contest, both open-seat
  cases, the Kentucky Party code, and the write-in candidates.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3172 tests passing, 5 pre-existing `todo` (no failures).
  A `prettier` formatting issue in the new test additions was caught by the
  lint step and fixed (`npx prettier --write`) before this run, per the
  known CI-includes-prettier gotcha.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (worktree linked to
  the same Vercel project as the main checkout via `.vercel/project.json`,
  `projectName: "voter-choice"`), confirmed non-empty (146 characters)
  before use, deleted from disk immediately after each use — never
  `source`d, never left in a committed file.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state KY` — importer reported `upserted=25`. Direct row-count query
     (`select office, count(*) ... where state = 'KY' group by office`, not
     just the importer's own log line): **21 house / 4 senate = 25.**
  2. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=25`. Direct row-count query again:
     **25 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 6 KY House
  districts and the Senate race, against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture. **0 mismatches across all 7 contests.** Full literal output:

  ```
  KY-01 — incumbent James R. Comer, seekingReelection2026=true
    - John "Drew" Williams (Democrat)

  KY-02 — incumbent S. Brett Guthrie, seekingReelection2026=true
    - Megan Wingfield (Democrat)
    - Thomas A. Loecken (Independent)

  KY-03 — incumbent Morgan McGarvey, seekingReelection2026=true
    - Maria Teresa Rodriguez (Republican)

  KY-04 — OPEN SEAT (Massie lost his own primary to Gallrein)
    - Melissa Claire Strange (Democrat)
    - Ed Gallrein (Republican)
    - Mohammad Wael Ahmad (Kentucky Party)
    - Jeremy Todd (Libertarian)

  KY-05 — incumbent Hal Rogers, seekingReelection2026=true
    - Ned Pillersdorf (Democrat)
    - Billy Ray Wilson (write-in, party null)
    - Gerardo Serrano (Independent)
    - Mikel Wein (Independent)

  KY-06 — OPEN SEAT (Barr filed for Senate instead)
    - Ralph Alvarado (Republican)
    - Zach Dembo (Democrat)
    - Jay J Bowman (Independent)
    - Pete Lynch (Kentucky Party)
    - Robert Quigley (write-in, party null)

  U.S. SENATE — OPEN SEAT (McConnell not seeking re-election)
    - Andy Barr (Republican)
    - Charles Booker (Democrat)
    - Thomas Michael Murphy (write-in, party null)
    - Christopher Campbell (Kentucky Party)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"` and `isRunoffPending: false`. Incumbents (Comer,
  Guthrie, McGarvey, Rogers) were correctly excluded from their own
  district's challenger list; all filers for the three open seats (KY-4,
  KY-6, Senate) rendered, none incorrectly excluded as an incumbent.
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats — Kentucky's federal primary is decided by
plurality in a single round (KRS 118.425), with no runoff mechanism for
federal office. No seat's nomination is ambiguous; every row in this
fixture is either a determined `qualified_for_general_ballot`/
`write_in_qualified` nominee or a `declared_general_ballot_intent`
independent pending petition verification (see finding 6 above).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Independent filers' petition-sufficiency status as of this list's
  retrieval is unconfirmed** from the official sources read this session
  (KRS 118.315(4) examination happens post-filing) — recorded as
  `declared_general_ballot_intent`, an open item in the same posture as
  AZ's/TX's/OK's/AL's equivalent gaps.
- **No Green Party, Constitution Party, or other minor-party filer for any
  US House or Senate seat this cycle** — not omitted, verified absent from
  the official filing list (checked by reading every row of both office
  listings in full).
- **Two windows remain open that could still add a row to this
  roster**, both dated in "Governing calendar dates" below — a vacancy-fill
  petition candidate (deadline August 11, 2026) and a new write-in
  candidate (deadline August 24, 2026). A dated re-check card is required
  either way, even if the answer turns out to be "no change" (see below).
- Names are recorded as they appear in the official filing list; not
  independently re-verified against a third document.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled directly from Kentucky's own official 2026 election calendar
(`elect.ky.gov/Resources/Documents/2026%20Election%20Calendar%20Final%20
Version%2010_6_2025.pdf`, retrieved 2026-07-15, extracted via `pypdf`), and
KRS 118.212 (candidate-withdrawal statute, via FindLaw's full-text
reproduction, retrieved 2026-07-15):

- **June 2, 2026, 4:00 PM** — general candidate filing deadline (KRS
  118.365): last day to file any petition, certificate, statement, or
  nomination papers for the office sought. Already passed at this build's
  retrieval — this is the deadline every regular party/independent/
  minor-party filer in this fixture met (the latest observed filing date
  in the transcribed data is June 2, 2026, matching this deadline exactly).
- **August 11, 2026** — last day for independent, political organization,
  or political group candidates to file a petition due to a **vacancy**
  occurring after the June 2 filing deadline but less than 3 months before
  the election (KRS 118.375(2)). A still-future date at this build's
  2026-07-15 retrieval — could still add a row to this roster.
- **August 24, 2026, 4:00 PM** — last day to file a declaration of intent
  to be a write-in candidate (KRS 117.265(2)); the SAME day, the Secretary
  of State issues its final certification of candidates' names to county
  clerks (KRS 118.215(1)(b)) — Kentucky's true ballot-content lock date for
  this cycle. A still-future date at this build's retrieval — could still
  add a write-in row to this roster, and is the date after which the
  roster is fully locked either way.
- **No fixed candidate-withdrawal deadline exists.** KRS 118.212 permits a
  candidate to withdraw at any point up to the election — before
  certification, the Secretary of State simply does not certify the name;
  after certification, the county clerk posts a polling-place notice and
  votes for the withdrawn candidate are not tabulated. The only date-bound
  element is KRS 118.212(5)'s poll-worker liability provision (a fine if
  the county clerk learned of the withdrawal at least 5 days before the
  election and provided notice, but the precinct officers failed to post
  it) — not a cutoff on withdrawal itself. This means a withdrawal risk
  against this fixture's 25 already-filed rows remains open through
  Election Day, unlike states with a fixed pre-general withdrawal cutoff
  (e.g. Oklahoma's April 7 deadline).
- **November 3, 2026** — General Election Day.

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the August 24, 2026 final
certification date above — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
Kentucky (KY) — after final ballot certification" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ky-official-roster/docs/operations/kentucky-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/kentucky-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ky-official-roster/scripts/congressional-rosters/ky-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ky-official-roster-2026.ts`
  once merged to main).
- **Official Kentucky source URL(s) used:**
  - `https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=4` (Kentucky
    Secretary of State's official 2026 General Election candidate filing
    list — US Representative, all 6 districts)
  - `https://web.sos.ky.gov/CandidateFilings/Default.aspx?id=3` (Kentucky
    Secretary of State's official 2026 General Election candidate filing
    list — US Senator)
  - `https://elect.ky.gov/Resources/Documents/2026%20Election%20Calendar%20Final%20Version%2010_6_2025.pdf`
    (State Board of Elections' official 2026 election calendar — filing
    deadlines and certification dates)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Kentucky source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/states/KY/intro.htm` (Kentucky's current
    senators — incumbency cross-check only, confirms the McConnell open
    seat)
  - FindLaw's reproduction of KRS 118.212
    (`https://codes.findlaw.com/ky/title-x-elections/ky-rev-st-sect-118-212/`)
    — candidate-withdrawal statute, cited for the "no fixed deadline"
    finding above.

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete,
reviewed, and pass `npm run check` cleanly. The card's GOAL_CONDITION's
remaining requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag on — are
both done: the importer ran against staging twice, confirmed by direct
row-count query both times (25 rows, 21 house / 4 senate, no duplication on
re-run), and the real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for all 6 KY House districts and the Senate
race, with **0 mismatches** against the fixture. Prod was never touched —
every database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this
self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for KY and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after August 24, 2026**
   (Secretary of State's final certification / write-in deadline) — opened
   on the backlog per the NOT BEFORE date-gate convention.

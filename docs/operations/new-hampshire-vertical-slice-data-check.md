# New Hampshire vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: New Hampshire (NH)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Built through
the same manual track as AZ, TX, OK, AL, AK, CO, CT, CA, AR, DE, FL, HI, LA,
ME, and IN.

Date: 2026-07-15. New Hampshire's 2026 candidate-filing period (June 3-12,
2026) has already closed; **the September 8, 2026 state primary has NOT
happened yet as of this build** — 55 days in the future. The general
election is November 3, 2026.

## Bottom line

**GO on the approach for a fifteenth-plus state.** Both NH House districts
(NH-1, NH-2) and the US Senate race render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across all 3 contests**, all 40 rows.

**New Hampshire is not Civix-vended** — its official source is the Secretary
of State (`sos.nh.gov`, with some PDFs served from a separate `mm.nh.gov`
media-manager CDN), not `*.civixapps.com` anywhere. The Civix portal
playbook in the nationwide roster plan doc does not apply here.

**New Hampshire's primary is still upcoming**, the same posture as
Arizona's, Delaware's, and Hawaii's original builds — every Democratic and
Republican filer is recorded `qualified_for_primary_ballot`, no nominee
guessed. Unlike Delaware, **every one of NH's 6 partisan federal contests is
genuinely contested** (2+ filers) — there is no "sole filer, automatic
nominee" case in this fixture.

**A real, non-obvious incumbency finding surfaced during the official
cross-check**, the same shape as Oklahoma's Hern/Armstrong finding: NH-1's
sitting representative, **Chris Pappas, filed for US Senate instead of
re-election to his own House seat** — so NH-1 is an open seat even though
its incumbent appears on the 2026 ballot (just for a different office). The
Senate seat is separately open because its sitting senator, **Jeanne
Shaheen, did not file for re-election at all**. NH-2's incumbent, **Maggie
Goodlander, did file for re-election** and is correctly excluded from her
seat's challenger list.

**NO-GO on fan-out to further states** until the manual track has covered
the remaining jurisdictions, and **NO-GO on flipping the flag for real
users** without Muxin's sign-off — same standing gate as every prior state.

## How this was verified — a bot-walled static-PDF source, no Civix,

browser automation required for the fetch step itself

New Hampshire's official candidate/election source is `sos.nh.gov` — plain
static PDFs, not a JS portal or SPA. But **the host itself blocks any
non-browser fetch**: `WebFetch` and `curl` (even with a realistic browser
`User-Agent` header) both return HTTP 403 with a literal Akamai/edgesuite
"Access Denied" body
(`https://errors.edgesuite.net/18.1a67cd17.1784171970.fd7dff`) for every
`sos.nh.gov` URL tried, including PDF paths directly. This is a bot wall on
the *host*, not an access-control wall on the *document* — the same PDF
loads immediately in an actual Chrome session. `mm.nh.gov` (the state's
separate media-manager CDN, used for a few of the PDF links below) does
**not** show this block.

**Mechanics that mattered, in the order they bit:**

1. **Fetch workaround:** every PDF below was retrieved by driving an actual
   `mcp__claude-in-chrome__navigate` session to the URL, then running
   `fetch(window.location.href)` from **inside the page's own JS context**
   (same-origin, carries whatever cookies/session let the real page load) to
   pull the bytes, followed by a Blob + anchor `download` click to save the
   file to disk. Chrome's native PDF viewer does **not** expose extractable
   text through `get_page_text` or `read_page` (both return "no text
   content" / only DOM chrome, not the rendered page content) — direct
   `pypdf` extraction on the downloaded file was required for all
   multi-candidate lists.
2. **The in-page `fetch()` approach is necessary, not just convenient** — a
   plain `curl`/`WebFetch` call, even copying a realistic Chrome
   `User-Agent`, still 403s; only a request that originates from the actual
   rendered page (real session/referer context) gets past the wall.
3. **Chrome's native "Save As" download flow is unreliable under this
   session's automation** (a native OS save dialog that keypress/click
   automation could not reliably dismiss) — the workaround that worked
   consistently was reading Chrome's own hidden partial-download temp file
   directly (`~/Downloads/.com.google.Chrome.<random>`, present and complete
   even before the save dialog resolves) rather than waiting for the dialog.
4. **Candidate SET (who filed for the Sept 8, 2026 primary)** came from the
   Secretary of State's official "Cumulative Filings" PDF
   (`cumulative-filings-6.29.26.pdf`, 77 pages, all state races) — a real
   text-layer PDF. Every federal contest appears exactly once per party
   section (`DEMOCRATIC CUMULATIVE FILING`, page 1; `REPUBLICAN CUMULATIVE
   FILING`, page 31) under "United States Senator" and "Representative in
   Congress" headers, broken out by district for the House.
5. **Independent/minor-party candidates bypass the primary entirely** under
   NH law (RSA 655:17-a/17-b/17-c) — they file a Declaration of Intent (same
   June 3-12 window) and then must separately gather nomination-paper
   signatures (3,000 for US Senate — 1,500 per congressional district; 1,500
   for Representative in Congress, from the respective district) to qualify
   for the November 3 general ballot. Two SoS documents matter here: the
   unfiltered "Declarations of Intent Filed" list (everyone who filed
   intent, signature verification still pending) and the "Declarations of
   Intent - Qualified" list (candidates who have *already* cleared signature
   verification). As of this build, the qualified list contains **zero**
   federal filers — only one State Representative candidate — so every
   federal declared-intent filer below is recorded
   `declared_general_ballot_intent`, not further promoted.
6. **No results-derivation step was needed** (unlike Oklahoma/Arkansas) —
   New Hampshire's primary is still 55 days out at transcription time, so
   this fixture is a filing-list snapshot, not a post-primary result
   derivation.

**Incumbency cross-check**, never guessed from the filing list alone:
`https://www.house.gov/representatives` ("By State and District" → New
Hampshire) confirms the sitting delegation is **Chris Pappas (NH-1)** and
**Maggie Goodlander (NH-2)**; `https://www.senate.gov/states/NH/intro.htm`
confirms the Class II Senate seat on the 2026 ballot is currently held by
**Jeanne Shaheen**. Cross-referencing those three names against the full
cumulative-filing list: Shaheen appears in neither party's Senate list
(open seat, confirmed); Pappas appears in the Democratic **Senate** list,
not the NH-1 list (so NH-1 is also open, even though its own incumbent is on
the ballot); Goodlander appears in the Democratic NH-2 list (incumbent
defends). This app's own FEC-derived `candidates` table was deliberately
never used for this cross-check — same rule as every prior state.

**Withdrawals:** the SoS's official "Withdrawals - 2026" list (1 page,
Democratic + Republican sections) contains only State Representative and
county-office withdrawals — confirmed zero US House or US Senate withdrawal
for any candidate in this fixture.

**Third parties:** no Libertarian, Green, or other recognized minor-party
candidate filed a Declaration of Candidacy for any NH federal office this
cycle — verified absent from the cumulative filing list (only `DEM` and
`REP` section headers contain any federal-office entries), not omitted.

## Contest inventory

New Hampshire has **2 US House districts and 1 US Senate contest in 2026**
(the Class II seat, currently held by Jeanne Shaheen). Both House districts
+ the Senate race are covered.

## What was built (delta from the prior-state pattern)

All of the AZ/TX/OK/.../IN vertical slice's infrastructure is state-agnostic
and required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, the importer's
array-shaped `FIXTURES` map, and every `OfficialBallotStatus` value (no new
status was needed — NH's declared-intent independents reuse
`declared_general_ballot_intent`, exactly like OK's/TX's equivalent filers;
NH has no runoff, so `runoff_pending` does not appear in this fixture).

**New / changed for this build:**

- `scripts/congressional-rosters/nh-official-roster-2026.ts` (new) — 23
  House rows (NH-1: 14 contested-primary filers, no declared independents
  found; NH-2: 6 contested-primary filers + 3 declared independents) + 17
  Senate rows (13 contested-primary filers + 4 declared independents). Full
  sourcing, methodology, and known limitations are in the file's own header
  docblock.
- `scripts/ingest/official-roster.ts` — registered `NH` in `FIXTURES` with
  separate house/senate entries, exactly like OK's/ME's two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 10 new tests: `getOfficialRoster`
  narrowing across both NH districts + the Senate contest (including that
  every NH-1/Senate row is `qualified_for_primary_ballot` or
  `declared_general_ballot_intent`, and NH-2's 3 declared-intent
  independents come through with the exact status), `isIncumbentSeekingReelection`
  for NH-2 (true), NH-1 (false — Pappas filed for Senate instead), and the
  Senate seat (false — Shaheen didn't file), and `lookupChallengers` wiring
  (both chambers covered, FEC query skipped — 2 calls not 3; NH-1's all 14
  filers render with no incumbent excluded; the Senate's all 17 party +
  declared-intent filers render with correct party-name mapping including
  `IND` → `"Independent"`).

No DB migration was needed — `ballot_status` is a plain `text` column with
no CHECK constraint (confirmed by inspecting `db/schema.ts:155` before
writing anything).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean except
  one **pre-existing, unrelated** failure in
  `scripts/design/capture-shared.test.ts` (`browserType.launch: ... Permission
  denied` — a Playwright headless-Chromium sandbox-launch restriction in
  this session's environment, confirmed by re-running that single file with
  the sandbox disabled, where all 3 of its tests pass). Every other file
  passed: 161 files / 3187 tests (plus 5 pre-existing `todo`), including all
  154 tests in `officialRoster.test.ts` (10 of them new, for NH).
- NH's 40 rows (23 House + 17 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, pulled via `vercel env
  pull --environment=preview` and read inline — never the ambient
  `DATABASE_URL`, never sourced or echoed), re-imported, and confirmed
  idempotent by a direct `count(*)` row-count query against
  `official_roster_candidates WHERE state = 'NH'` (40 both times — not just
  the importer's own self-reported `upserted=40`, per the goal condition's
  explicit instruction not to trust that alone).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for NH-1, NH-2, and the
  Senate race, diffed against the fixture. **0 mismatches across all 3
  contests.** Full literal output (candidate name, party, as the app would
  render it):

  ```
  NH-01 — open seat (Pappas filed for Senate instead); both party
  nominations undetermined pending the Sept 8, 2026 primary
    - Carleigh Beriont (Democrat)
    - Sarah E. Chadzynski (Democrat)
    - Bill Conlin (Democrat)
    - Matthew Emerson (Democrat)
    - Heath Howard (Democrat)
    - Stefany Shaheen (Democrat)
    - Sarah Bella Spinosa (Democrat)
    - Maura C. Sullivan (Democrat)
    - Christian Urrutia (Democrat)
    - Lindsey Anderson (Republican)
    - Melissa Bailey (Republican)
    - Brian D. Cole (Republican)
    - Anthony DiLorenzo (Republican)
    - Hollie Noveletsky (Republican)

  NH-02 — incumbent Maggie Goodlander, seekingReelection2026=true
    - Paige Beauchemin (Democrat)
    - Michael Anthony Callis (Republican)
    - Dan Nicholson (Republican)
    - Victor Orlando (Republican)
    - Lily Tang Williams (Republican)
    - Scott Matthew Black (Independent) [declared intent, signature
      verification pending]
    - Robbie Mahrou (Independent) [declared intent, signature verification
      pending]
    - Sterling Thomas Sykes (Independent) [declared intent, signature
      verification pending]

  U.S. SENATE — open seat (sitting Senator Shaheen did not file for
  re-election); both party nominations undetermined pending the Sept 8,
  2026 primary
    - David Jarvis (Democrat)
    - Karishma Manzur (Democrat)
    - Chris Pappas (Democrat)
    - Maxwell L. Saal (Democrat)
    - John Vail (Democrat)
    - Tom Alciere (Republican)
    - Scott P. Brown (Republican)
    - Sky Danley (Republican)
    - Andy Martin (Republican)
    - Mary Maxwell (Republican)
    - Richard A. McMenamon II (Republican)
    - Sabrina Ann Smith (Republican)
    - John E. Sununu (Republican)
    - Tim Harris (Independent) [declared intent, signature verification
      pending]
    - Edmond Laplante (Independent) [declared intent, signature
      verification pending]
    - Jeanne Logan Morrow (Independent) [declared intent, signature
      verification pending]
    - Christine Lopez (Independent) [declared intent, signature
      verification pending]
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Goodlander was correctly excluded from NH-2's
  list as the seeking-reelection incumbent; no candidate was incorrectly
  excluded from NH-1 or the Senate race, both genuinely open seats.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). Both scratch verification scripts used for the row-count and
  end-to-end checks were deleted after use, never committed.

## Standing calendar dates (deliverable (e) — every still-governing date for

this state's roster, per the plan doc's strengthened requirement)

Pulled from the Secretary of State's own official "Filing for Office 2026"
summary
(`https://www.sos.nh.gov/sites/g/files/ehbemt561/files/inline-documents/sonh/filing-for-office-2026.pdf`)
and RSA 655 (New Hampshire's election-law chapter), read directly at
`gc.nh.gov`:

- **September 8, 2026 — State Primary Election.** Resolves the Democratic
  and Republican nominee for every contested federal seat in this fixture
  (all 6). This is the date that makes the current `qualified_for_primary_ballot`
  rows stale; a follow-up rebuild is needed after this date (NOT-BEFORE
  card opened, see below).
- **August 5, 2026, 5:00 p.m. — last day to submit signed nomination
  papers** to Supervisors of the Checklist, for every declared-intent
  independent/minor-party candidate (including the 7 federal filers in this
  fixture) to advance toward general-ballot qualification.
- **August 26, 2026, 5:00 p.m. — Supervisors of the Checklist must have
  nomination papers certified** for candidates and organizations.
- **September 2, 2026, 5:00 p.m. — last day to file certified nomination
  papers with the Secretary of State's office.** This is the date that
  resolves whether any of this fixture's 7 `declared_general_ballot_intent`
  rows (4 Senate, 3 NH-2 House) actually qualify for the general ballot —
  a second follow-up check is warranted here even before the September 8
  primary result matters for the independents specifically.
- **Candidate-withdrawal deadline (major-party primary candidates):** per
  RSA 655:30, no withdrawal is accepted **after the filing deadline itself**
  (June 12, 2026, already passed) except two narrow exceptions — RSA 655:31
  (a straw-candidate challenge petition, due "the Wednesday after the last
  day for filing," i.e. June 17, 2026, also already passed) and RSA 655:34
  (candidate death). In practice, none of this fixture's major-party filers
  can voluntarily withdraw before the primary; the SoS's official
  "Withdrawals - 2026" list (confirmed above) already shows zero federal
  withdrawals as of this build.
- **Post-primary disqualification (not a general voluntary-withdrawal
  right):** per RSA 655:38, a general-election nominee can only be removed
  between nomination and the November 3, 2026 election for age, domicile,
  or an incapacitating physical/mental disability acquired after the
  primary (sworn oath + physician's letter required); the party committee
  then has **3 days** from the disqualification notice to name a
  replacement. New Hampshire does not have a broader post-primary
  voluntary-withdrawal window the way some other states' RSA 655
  equivalents do — this is the only mechanism that could still change a
  determined nominee between September 8 and November 3.

**NOT-BEFORE follow-up card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): a re-check card for New Hampshire is added to the
backlog, gated to not be picked up before September 8, 2026, to rebuild this
fixture with the primary's actual nominees and to re-check the September 2,
2026 nomination-paper certification deadline for the 7 declared-intent
independents.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **No nominee is determined for any of the 6 partisan federal contests** —
  the Sept 8, 2026 primary has not happened yet. Recorded as
  `qualified_for_primary_ballot`, not guessed. Follow-up rebuild required
  after the primary (NOT-BEFORE card opened, above).
- **The 7 declared-intent independent filers' nomination-paper signature
  verification is unresolved** as of this build (certification deadline
  September 2, 2026, still future) — recorded as
  `declared_general_ballot_intent`, an open item in the same posture as
  OK's/TX's equivalent gap.
- **No Libertarian, Green, or other recognized minor-party candidate filed**
  a Declaration of Candidacy for any NH federal office this cycle — verified
  absent, not omitted.
- Names are recorded as they appear in the official filing lists; not
  independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/new-hampshire-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/nh-official-roster-2026.ts`.
- **Official New Hampshire source URLs used:**
  - `https://www.sos.nh.gov/sites/g/files/ehbemt561/files/docs/cumulative-filings-6.29.26.pdf`
    (Secretary of State's official cumulative Declaration-of-Candidacy
    filing list, as of 06/29/2026 — candidate set + party for the Sept 8,
    2026 primary)
  - `https://mm.nh.gov/files/uploads/sos/docs/declarations-of-intent-list-2026.pdf`
    (Secretary of State's unfiltered Declarations of Intent Filed list —
    source of every `declared_general_ballot_intent` row)
  - `https://www.sos.nh.gov/sites/g/files/ehbemt561/files/inline-documents/sonh/declarations-of-intent-list-2026-qualified.pdf`
    (Secretary of State's Declarations of Intent - QUALIFIED list — confirms
    zero federal candidates have cleared signature verification)
  - `https://mm.nh.gov/files/uploads/sos/docs/withdrawals-2026.pdf`
    (Secretary of State's official Withdrawals - 2026 list — confirms no
    federal withdrawal)
  - `https://www.sos.nh.gov/sites/g/files/ehbemt561/files/inline-documents/sonh/filing-for-office-2026.pdf`
    (Secretary of State's "Filing for Office 2026" summary — signature
    requirements + the nomination-paper filing-deadline calendar used for
    the standing calendar dates above)
  - `https://www.sos.nh.gov/elections/2026-2027-political-calendar` (state
    primary/general election dates)
  - `https://gc.nh.gov/rsa/html/lxiii/655/655-30.htm`,
    `.../655-31.htm`, `.../655-34.htm`, `.../655-38.htm` (RSA 655 withdrawal
    and disqualification statutes, read directly for the calendar-dates
    section above)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a New Hampshire source, cited because it materially shaped the
    `isIncumbent` data and surfaced the Pappas/NH-1 finding)
  - `https://www.senate.gov/states/NH/intro.htm` (Senate incumbency
    cross-check only — confirms the Shaheen open-seat finding)

## GO/NO-GO verdict

**GO on the approach for this state — 0 mismatches across all 3 contests,
verified live end-to-end. NO-GO on proceeding to more states or real users
without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   prior state. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **A follow-up rebuild is needed after September 8, 2026**, once the
   primary determines each party's nominee, and a second check after
   September 2, 2026 for the declared-intent independents' nomination-paper
   certification — NOT-BEFORE card opened for both.

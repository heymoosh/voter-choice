# Georgia vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Georgia (GA)`
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). Twelfth state built
through this manual track, after Arizona, Texas, Oklahoma, Alabama, Alaska,
Colorado, Connecticut, California, Arkansas, Delaware, and Florida.

Date: 2026-07-15. Georgia's 2026 general primary (2026-05-19) and its primary
runoff (2026-06-16) are BOTH already certified as of retrieval — this is a
**general-stage build**, like TX/OK/AL, not a pending-primary build like FL's:
every major-party nomination for the Nov 3, 2026 general is already
determined.

## Bottom line

**GO on the approach for a twelfth state.** All 14 GA House districts plus
the US Senate race render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across all 15 contests.**

**Georgia is not Civix-vended.** Its official results system
(`results.sos.ga.gov`) is an Angular single-page app vended by a company
called "Enhanced Voting" — a portal vendor this track hasn't seen before.
Unlike Civix, it needed **no browser automation at all**: the Angular
bundle's own JavaScript revealed a plain, unauthenticated JSON REST API
directly reachable via `curl`, which is what this build actually used (see
below) — a simpler case than TX's Civix portal, which required real browser
rendering to get anything out of it.

**Four open/vacant House seats, each independently sourced, none guessed:**
GA-1 (Buddy Carter, REP incumbent, ran for US Senate instead — confirmed
directly by his own 3rd-place finish in this fixture's Senate primary data);
GA-10 (Mike Collins, REP incumbent, also ran for Senate — and won that
primary's runoff, so he's this fixture's Senate REP nominee instead of GA-10's);
GA-11 (Barry Loudermilk, REP incumbent, publicly announced in February 2026 he
would not seek re-election); and GA-13 (David Scott, DEM incumbent, died April
22, 2026, after already qualifying for re-election in March — the seat is
vacant, with a separate July 28, 2026 special election pending to fill only
the remainder of his term, out of scope for this fixture). GA-14 is the
inverse case — Clay Fuller (REP) IS a sitting incumbent (won the special
election for Marjorie Taylor Greene's vacated seat back in April), but the
results portal's own primary data doesn't tag him as one; corrected here via
an independent house.gov cross-check, the same class of stale/incomplete
portal signal FL's build found.

**Independent, Libertarian, and write-in candidates are deliberately excluded**
from this fixture — a known, explicitly-flagged gap, not an oversight. See
"Known gaps" below.

**NO-GO on flipping the flag for real users** without Muxin's sign-off — same
standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

### Enhanced Voting portal mechanics (new vendor for this track)

1. **Recognizing the vendor.** `results.sos.ga.gov/results/public/Georgia`
   returned HTTP 200 to a plain `curl`, but only a ~40-line Angular SPA shell
   (`<title>Election Results</title>`, `<base href="/results/public/">`,
   module-preloaded `chunk-*.js` files) — no candidate data in the raw HTML.
   The shell's CSP comment referenced `app.enhancedvoting.com` /
   `app.dev.enhancedvoting.com`, identifying the vendor as "Enhanced Voting"
   (confirmed further via `georgia.enhancedballot.com`, which redirects to
   `app.enhancedvoting.com/ebd/voter/georgia`, the same company's candidate-
   facing filing portal).
2. **No browser automation was needed.** Rather than driving the SPA with
   `mcp__claude-in-chrome__*` tools (the mitigation TX's Civix build needed),
   this build fetched the Angular app's own compiled JavaScript bundle
   (`curl .../results/public/main-<hash>.js`) and grepped it for the API
   base URL the app itself calls: `endpoint:"/results/public/api"`. From
   there, two plain `curl` calls (no auth, no Cloudflare gate, no JS
   rendering) retrieved everything needed:
   - `GET https://results.sos.ga.gov/results/public/api/jurisdictions/Georgia`
     — Georgia's full election index (every election ever run, each with a
     `publicElectionId`). Filtering `elections[]` by `electionDate` starting
     with `"2026"` surfaced `GeneralPrimary51926` (May 19, 2026 primary) and
     `06162026GeneralPrimaryRunoff` (June 16, 2026 runoff) — plus, notably,
     `072826GASpecialElection` (July 28, 2026), which turned out to be the
     GA-13 vacancy special election (see below).
   - `GET https://results.sos.ga.gov/results/public/api/elections/Georgia/{publicElectionId}/ballot-items`
     — every contest on that election's ballot (554 contests for the May 19
     primary alone: every statewide office, PSC, both US House parties per
     district, US Senate, and every state legislative race), each with a
     `summaryResults.ballotOptions[]` array of candidates carrying official,
     certified `voteCount` figures. This is the actual data source
     transcribed into the fixture below — filtered to the 30 rows
     (`"US House of Representatives - District NN - {Rep,Dem}"` × 14 + "US
     Senate - {Rep,Dem}") that matter for this build.
3. **Deriving general-ballot nominees from primary/runoff vote totals.**
   Georgia requires an outright majority (>50%) to win a primary; absent one,
   the top two finishers advance to the June 16 runoff. Applying that rule to
   the certified May 19 totals identified exactly five contests without an
   outright majority — confirmed independently against the runoff election's
   own `ballot-items` list, which had exactly 27 contests, all of which had
   gone to a runoff for that reason:
   - US Senate - Rep: Collins 40.50% / Dooley 30.19% / Carter 25.11% →
     runoff: **Collins 55.54%**
   - US House D1 - Dem: Griggs 34.45% / Hollowell 24.66% → runoff:
     **Hollowell 52.96%**
   - US House D7 - Dem: Kozycki 39.95% / Norton 22.34% → runoff:
     **Kozycki 67.72%**
   - US House D11 - Rep: Cowan 42.60% / Adkerson 21.72% → runoff:
     **Cowan 64.98%**
   - US House D12 - Dem: Smith 32.82% / George 26.65% → runoff:
     **Smith 55.79%**

   Every other contest was decided outright on May 19 by a majority winner or
   lack of opposition.
4. **sos.ga.gov itself (the main SoS domain) IS Cloudflare-gated** — this is
   the genuine blocker this build hit. `sos.ga.gov/page/qualifying-candidates`,
   `/candidate-qualifying-elected-office`, and the official 2026 elections-
   calendar PDF (`sos.ga.gov/sites/default/files/forms/...`) all returned
   HTTP 403 to both `curl` and `WebFetch`, with a literal Cloudflare
   `<title>Just a moment...</title>` challenge page in the response body. No
   `mcp__claude-in-chrome__*` browser-automation tool was available in this
   build's environment to drive it as a rendered session (the mitigation
   TX's Civix playbook used for a different kind of block) — flagged for the
   NOT BEFORE re-check card opened alongside this build. `mvp.sos.ga.gov` (a
   Salesforce Lightning Community site, "GA My Voter Page") returned HTTP 200
   to plain `curl` but is itself client-rendered with no server-side content
   to parse — not useful without the same browser-automation gap.
5. **Incumbency cross-check.** `house.gov/representatives` was fetched
   directly via `curl` — contrary to the Civix playbook's note about this
   page needing scroll-triggered lazy-rendering, the full per-state member
   table (district, name, party) is actually present as static server-
   rendered HTML in the raw response; the lazy-render behavior noted in that
   playbook applies to a different, client-rendered widget elsewhere on the
   same page, not the table itself. This directly surfaced Georgia's full
   14-member House delegation and confirmed all four open-seat/vacancy cases
   above by cross-referencing names against the certified primary/runoff
   candidate lists (nobody had to be searched for under a "wrong" district —
   each was simply absent from the entire 2026 candidate list for a
   confirmed, independently-sourced reason).
6. **Confirming GA-13's vacancy and the parallel special election.**
   `clerk.house.gov/members/GA13/vacancy` confirmed the seat is vacant as of
   this build's retrieval date; direct reporting (GovTrack, Atlanta News
   First, AJC) confirmed Rep. David Scott died April 22, 2026, having already
   qualified for the regular 2026 cycle on March 2 (his name does not appear
   in the May 19 primary results — Georgia's SoS evidently removed it after
   his death rather than leaving a deceased candidate on the printed ballot).
   The July 28, 2026 special election (found via the jurisdiction index in
   step 2) fills only the remainder of his current term and has a completely
   different candidate field from the regular cycle's May 19 primary — kept
   explicitly out of scope for this fixture (see "Known gaps").
7. **Libertarian Party statewide ballot-access failure.** A secondary source
   (politics1.com, comparison-only) initially listed Allen Buckley as the
   Libertarian nominee for US Senate. Direct reporting
   (AJC, dated 2026-07-11, "Libertarians won't be on the ballot in Georgia,
   meaning likely no runoffs") confirmed the Libertarian Party of Georgia
   could not gather the ~72,000 signatures (1% of active registered voters)
   required by its filing deadline to qualify ANY statewide candidate for the
   Nov 3, 2026 ballot — so Buckley, despite being the party's convention
   nominee, is not a qualified general-ballot candidate. This finding does
   NOT automatically extend to district-level US House independent/write-in
   filers, whose signature threshold is a much lower ~1% of registered voters
   within their own district — but no official confirmation of any specific
   district-level filer's qualification status could be obtained given the
   Cloudflare block in item 4 above. See "Known gaps."

## Contest inventory

14 US House districts + 1 US Senate race. Incumbency column reflects the
house.gov/senate.gov NAME-based cross-check, not the portal's raw (largely
absent) incumbency signal.

| District | Incumbent (if any) | Notes |
|---|---|---|
| GA-01 | *(open — Carter ran for Senate)* | Kingston (R) won outright, Hollowell (D) won the runoff |
| GA-02 | Sanford Bishop (D) | Day (R) unopposed |
| GA-03 | Brian Jack (R) | Keller (D) won outright |
| GA-04 | Henry "Hank" Johnson, Jr. (D) | Duffie (R) unopposed |
| GA-05 | Nikema Williams (D) | Salvesen (R) unopposed |
| GA-06 | Lucy McBath (D) | Martin (R) won outright |
| GA-07 | Rich McCormick (R) | Kozycki (D) won the runoff |
| GA-08 | Austin Scott (R) | Esti (D) won outright |
| GA-09 | Andrew Clyde (R) | Gegen (D) won outright |
| GA-10 | *(open — Collins ran for Senate)* | Gaines (R) and Delancy (D) both won outright |
| GA-11 | *(open — Loudermilk retiring)* | Cowan (R) won the runoff, Harden (D) won outright |
| GA-12 | Rick W. Allen (R) | Smith (D) won the runoff |
| GA-13 | *(vacant — Scott died Apr 22, 2026)* | Chavez (R) unopposed, Clark (D) won outright; separate July 28 special election pending |
| GA-14 | Clay Fuller (R) — won the special election for MTG's vacated seat | Harris (D) unopposed (rematch from that special) |
| US Senate | Jon Ossoff (D) | Collins (R) won the runoff |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL pattern)

**Needed no changes:** `db/schema.ts` (no migration — `ballot_status`/`party`
are plain `text`, no CHECK constraint); `scripts/congressional-rosters/types.ts`
(no new party code needed — every nominee is REP or DEM, and independent/
Libertarian/write-in candidates are excluded per "Known gaps"); `races.ts`'s
`PARTY_NAMES` map; the importer's core upsert logic.

**New / changed for this build:**
- `scripts/congressional-rosters/ga-official-roster-2026.ts` — new fixture,
  14 House districts (28 rows) + Senate (2 rows), house+senate two-array
  shape (mirrors TX/OK/AL/AR/DE, not CT/CA's house-only shape).
- `scripts/ingest/official-roster.ts` — registered the `GA` import block and
  two-object `FIXTURES` entry.
- `src/lib/server/officialRoster.test.ts` — added GA's import block,
  `gaDbRow` helper, `GA_SENATE_DB_ROWS`, `GA_INCUMBENT_SAMPLE`/
  `GA_OPEN_SEAT_DISTRICTS`, and a `describe("lookupChallengers — GA
  wiring"...)` block covering both-chambers coverage, per-district incumbent
  exclusion across every documented incumbent, the four open-seat districts
  rendering both nominees with no exclusion, and Senate incumbent exclusion.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3156 tests passing, 5 pre-existing `todo` (no failures). One
  unrelated pre-existing flaky test
  (`src/lib/server/counters-scan-parity.test.ts`, a timing-sensitive SCAN
  parity test untouched by this build) failed once on a full-suite run and
  passed cleanly both in isolation and on a clean full re-run — not a
  regression from this change.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (from the main,
  Vercel-linked checkout), confirmed non-empty (146 characters) before use,
  substituted inline into each command — never `source`d, never echoed.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Pre-import row count for `state = 'GA'`: **0**.
  2. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state GA` — importer reported `upserted=30`. Direct row-count query
     (`select office, count(*) ... where state = 'GA' group by office`, not
     just the importer's own log line): **28 house / 2 senate = 30**.
  3. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=30`. Direct row-count query again:
     **28/2/30 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 14 House districts
  and the Senate race, against staging with `OFFICIAL_ROSTER_ENABLED=1`.
  Diffed candidate-by-candidate against the fixture
  (`ga-official-roster-2026.ts`). **0 mismatches across all 15 contests.**
  Every challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`, and every documented incumbent (or, for the four
  open seats, the absence of one) was correctly excluded/included. Full
  literal output from this build's verification run:

  ```
  GA-01: OK incumbent=(open seat) challengers=[Amanda Hollowell, James "Jim" Kingston]
  GA-02: OK incumbent=Sanford Bishop challengers=[Matt Day]
  GA-03: OK incumbent=Brian Jack challengers=[Maura Keller]
  GA-04: OK incumbent=Henry "Hank" Johnson, Jr. challengers=[Jim Duffie]
  GA-05: OK incumbent=Nikema Williams challengers=[John "Bongo" Salvesen]
  GA-06: OK incumbent=Lucy McBath challengers=[Kevin E. Martin]
  GA-07: OK incumbent=Rich McCormick challengers=[Tony Kozycki]
  GA-08: OK incumbent=Austin Scott challengers=[Kelly Esti]
  GA-09: OK incumbent=Andrew Clyde challengers=[Caitlyn Gegen]
  GA-10: OK incumbent=(open seat) challengers=[Houston Gaines, Pamela "Pam" Delancy]
  GA-11: OK incumbent=(open seat) challengers=[Chris Harden, John Cowan]
  GA-12: OK incumbent=Rick W. Allen challengers=[Ceretta Smith]
  GA-13: OK incumbent=(open seat) challengers=[Jasmine Clark, Jonathan Chavez]
  GA-14: OK incumbent=Clay Fuller challengers=[Shawn Harris]
  GA Senate: OK incumbent=Jon Ossoff challengers=[Mike Collins]

  Total mismatches: 0
  ```

- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **No independent, Libertarian, or write-in candidate appears in this
  fixture.** Georgia's independent/minor-party candidates never participate
  in primaries at all (only Democratic and Republican nominees are decided
  that way); they qualify directly for the general ballot via a separate
  petition process. A secondary aggregator (politics1.com, comparison-only)
  lists several declared filers by district (e.g. Dylan Castillo/GA-1,
  Brandon Daley/GA-2, Sahir Ahsan and Tabitha Johnson-Green/GA-10, Natalie
  Richoz/GA-11, Andrew Underwood/Libertarian/GA-14, plus a US Senate write-in
  and two declared independents), but this build could not independently
  confirm any of them actually completed Georgia's petition-signature
  requirement — the official qualified-candidates source (`sos.ga.gov`) is
  Cloudflare-blocked (see operational-navigation item 4) and no browser-
  automation tool was available this session. Per the SAFETY rule that "a
  filing list cannot be represented as a qualified/certified roster," these
  are omitted rather than guessed onto the roster. The Libertarian Party's
  own STATEWIDE US Senate nominee (Allen Buckley) is confirmed NOT qualified
  (missed the ~72,000-signature statewide threshold, per direct AJC
  reporting) — but this does not resolve the individual district-level
  filers, whose much lower ~1%-of-district threshold is a separate question.
- **GA-13's July 28, 2026 special election is out of scope.** This fixture
  only covers the regular 2026 cycle's May 19 primary / Nov 3 general
  nominees (Chavez/Clark); the special election (different candidates,
  filling only the remainder of David Scott's term) is a separate contest
  this track does not track.
- **A qualified candidate can still withdraw before the general.** This
  fixture does not capture any withdrawal after 2026-07-15 (retrieval date).

## Governing calendar dates (per the plan doc's standing requirement, item e)

- **June 22–26, 2026** — Georgia's independent/non-party candidate qualifying
  window for the general ballot (fourth Monday in June through the following
  Friday, per O.C.G.A. and Ballotpedia's Georgia ballot-access summary) — this
  window has already closed as of retrieval, meaning any qualified
  independent/write-in filer is already determined, even though this build
  could not retrieve the official list (see "Known gaps").
- **August 17, 2026** — first day to request an absentee ballot for the
  general election (source: georgia.gov's official 2026 general-election
  page).
- **September 15, 2026** — first day counties may mail/transmit UOCAVA
  (overseas/military) ballots — the practical federal deadline (MOVE Act, 45
  days before Nov 3) by which the general-election candidate list must be
  fully locked (source: georgia.gov).
- **September 19, 2026** — sample ballots become available for the general
  election — the practical point at which the certified, final candidate
  list (including any independent/write-in filers this fixture could not
  confirm) is publicly viewable (source: georgia.gov).
- **October 5, 2026** — last day to register to vote for the general election
  (source: georgia.gov; also confirmed via `src/data/states/ga.json`).
- **November 3, 2026** — General Election Day.
- **July 28, 2026** — the separate GA-13 special election (fills only the
  remainder of David Scott's term; out of scope for this fixture, see "Known
  gaps").

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the September 19, 2026 sample-
ballot-availability date above — see
`docs/operations/voter-choice-backlog.md`'s "[P0] Re-check official roster:
Georgia (GA) — after ballot content is locked for the general" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ga-official-roster/docs/operations/georgia-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/georgia-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ga-official-roster/scripts/congressional-rosters/ga-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ga-official-roster-2026.ts`
  once merged to main).
- **Official Georgia source URL(s) used:**
  - `https://results.sos.ga.gov/results/public/api/jurisdictions/Georgia`
    (Enhanced Voting results system — election index)
  - `https://results.sos.ga.gov/results/public/api/elections/Georgia/GeneralPrimary51926/ballot-items`
    (May 19, 2026 General Primary — certified candidate-level results)
  - `https://results.sos.ga.gov/results/public/api/elections/Georgia/06162026GeneralPrimaryRunoff/ballot-items`
    (June 16, 2026 General Primary Runoff — certified runoff results)
  - `https://www.house.gov/representatives` (member directory, incumbency
    cross-check)
  - `https://www.senate.gov/senators/index.htm` (senator directory,
    incumbency cross-check)
  - `https://clerk.house.gov/members/GA13/vacancy` (confirms GA-13 vacancy)
  - `https://www.ajc.com/politics/2026/07/libertarians-wont-be-on-the-ballot-in-georgia-meaning-likely-no-runoffs/`
    (confirms Libertarian Party of Georgia's statewide ballot-access failure)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete, reviewed,
and pass `npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (30 rows, 28 house / 2 senate, no duplication on re-run), and the
real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for all 14 House districts and the Senate race,
with **0 mismatches** against the fixture. Prod was never touched — every
database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this self-vet.

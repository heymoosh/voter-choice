# Louisiana vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Louisiana (LA)", parent epic
`c5a813bb-9223-4dc1-95aa-65637eb6940b` (nationwide official-source
congressional roster).

Date: 2026-07-15.

## Bottom line

**GO, with an intentional scope split.** Louisiana's 2026 congressional
election system is genuinely bifurcated by office, so this build produces a
**Senate-only** fixture — fully determined, verified end-to-end against the
real Neon staging branch — and deliberately ships **zero House rows**,
because Louisiana's US House candidate qualifying for the governing Nov 3
open-primary process (Act 7 of the 2026 Regular Legislative Session) had not
yet opened at build time. This is not a transcription gap; it is the
correct, honest representation of "nobody has qualified yet," verified
directly against the official portal's own live Nov 3, 2026 view. A dated
`NOT BEFORE: 2026-08-08` follow-up card builds the House roster once
qualifying closes (Aug 5-7, 2026).

**A real, non-obvious incumbency finding surfaced during the Senate
cross-check:** sitting US Senator Bill Cassidy (R) **lost renomination** —
he placed third in the May 16, 2026 closed Republican primary (24.8%,
behind Julia Letlow's 44.8% and John Fleming's 28.3%), and Letlow won the
June 27, 2026 runoff (56.9%) over Fleming. Cassidy is not one of the two
names on the Nov 3, 2026 general-ballot Senate section. Letlow is currently
Louisiana's sitting US Representative for the 5th District — a *different*
seat — so **neither** Nov 3 Senate nominee is the incumbent for the seat up
in 2026, confirmed independently against `senate.gov`'s own senator list
(Cassidy, not Letlow) beyond the portal and beyond secondary news coverage.

## How Louisiana's system works — and why it splits the build

Per the 2024 Legislature's closed-primary enactment plus Act 7 of the 2026
Regular Session (which carved US Representative back **out** of that system
for this cycle only):

- **US Senate, Supreme Court, PSC, and BESE** ran a **closed party primary**
  (May 16, 2026) with a **runoff** (June 27, 2026) — both already past at
  build time, so the Nov 3, 2026 general-ballot nominees for these offices
  are determined.
- **US House (all 6 districts)** instead uses Louisiana's **open ("jungle")
  primary** on Nov 3, 2026 — every candidate on one ballot regardless of
  party, top two advance to a **Dec 12, 2026 runoff** if nobody wins a
  majority. Candidate qualifying for this specific process is **August 5-7,
  2026** (source: `sos.la.gov/elections-voting/election-dates`), separate
  from — and later than — the closed-primary offices' qualifying, which
  "occurred in January" per the same page. A nominating-petition path closed
  July 9, 2026 (already past at build time) but produced zero visible
  qualifiers as of this build.

**Live-checked the ground truth directly:** the SoS Candidate Inquiry
portal's own Nov 3, 2026 election-date view
(`voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103`), with
every office selected and "View Candidates" run, returned exactly 2 rows for
US Senator (Davis-D, Letlow-R) and **"No candidates"** for all 6 "U. S.
Representative, Nth Congressional District" sections. That is the fixture's
source of truth for House, not the well-known names (Scalise, Johnson,
Higgins, Carter, Fields, etc.) that appear under the portal's *old*
5/16/2026 election-date view, filed back in February 2026 under the
*original* closed-party-primary process that Act 7 later superseded for
House races specifically — those filings are stale and were deliberately
**not** transcribed.

## Operational-navigation section

The portal (`voterportal.sos.la.gov`) is a **custom Louisiana SoS system,
not Civix-vended** (no `*.civixapps.com` domain, no "POWERED BY gocivix.com"
footer) — the Civix playbook's specific mechanics don't apply, but one of
its general lessons does: **`WebFetch` on the bare URL returns only the
unrendered SPA shell** (the election-date dropdown and office checkboxes,
zero candidate data) — actual candidate rows only populate client-side
after selecting an election date, checking offices, and clicking "View
Candidates for Selected Race(s)." This build used
`mcp__claude-in-chrome__*` browser automation to drive it like a human
would.

**Navigation sequence that worked:**

1. Navigate to `CandidateInquiry?electionDate=<YYYYMMDD>` directly (the URL
   param pre-selects the election date — no need to use the dropdown).
2. Click "Select All" (a real link, not a checkbox) to check every office in
   one click — the office list can run to 200+ entries (every down-ballot
   judicial/municipal race sharing that election date), so selecting
   individually is impractical.
3. Click "View Candidates for Selected Race(s)". **Its position on the page
   moves** depending on how many offices are listed above it (it sits
   directly under the "Election Date" selector on some views, and above
   "Select All" on others) — a screenshot before clicking is more reliable
   than a fixed coordinate.
4. `get_page_text` after the results render returns the full flat candidate
   list, including offices with "No candidates" explicitly printed (a
   reliable, unambiguous absence signal — not a rendering gap to
   double-check).

**Reliable vs. unreliable signals:** the "Filed Date" column read as a
straightforward, trustworthy filing timestamp for every row. The portal
prints an explicit `Unopposed` / `Advances` annotation next to some
down-ballot primary results (useful confirmation) but did **not** print any
such annotation for the Senate race specifically — the Nov 3 general-ballot
Senate section itself was treated as authoritative instead (it already
reflects the certified, post-runoff nominee set). A static red banner —
"Note: This information is UNOFFICIAL until qualifying is closed" — appears
on every election-date view regardless of whether that specific office's
qualifying has actually closed (it's boilerplate for the whole multi-office
page, most of which are down-ballot local races with their own Aug 5-7
qualifying window); it does not override the Senate race's own two
independently-confirmed-final status (see below).

**Tooling:** no scripted/Playwright pass was needed — Louisiana's portal is
a conventional server-rendered-after-load page (no virtualized scroll, no
SPA-internal sub-routing between a filing app and a separate results app
the way Texas's Civix portal has), so manual `browser_batch` clicks plus
`get_page_text` were sufficient for both election-date views checked.

## Contest inventory

Louisiana has **6 US House districts and 1 US Senate contest in 2026** (the
Class 2 seat, currently held by Bill Cassidy). This build covers the Senate
contest only — see "Known gaps" below.

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean. 162
  test files, 3163 tests passing, 5 pre-existing `todo` (no failures), 3168
  total.
- No migration needed — `ballot_status` remains a plain `text` column, no
  new value introduced by this build.
- LA's 2 Senate rows imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, pulled via `vercel env pull`, explicitly —
  never the ambient `DATABASE_URL`), re-imported, and confirmed idempotent
  by a **direct row-count query** (2 rows both times, not just the
  importer's own self-reported "upserted=2" count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for the LA Senate contest
  and for LA-01 (as a House-fallback sanity check). Full literal output:

  ```
  U.S. SENATE — Cassidy's Class 2 seat; NEITHER nominee is the sitting
  incumbent (Cassidy lost renomination — see Bottom line above)
    - "Jamie" Davis (Democrat)
    - Julia Letlow (Republican)

  LA-01 — no official roster rows exist yet (House qualifying not open);
  falls through to the pre-existing FEC-derived path, which itself has no
  LA-01 rows in staging yet either
    - (empty — confirms the designed fallback behavior, not a bug)
  ```

  Both Senate candidates carried `rosterProvenance.sourceKind ===
  "official_state_roster"`, matching the official source exactly — 0
  mismatches. LA-01's empty result confirms `races.ts`'s designed contract:
  when `getOfficialRoster` returns zero rows for an exact
  state/office/district/year, that seat is left on the pre-existing
  FEC-derived path untouched — no code change was needed to get this
  correct, honest behavior.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **All 6 US House districts have zero fixture rows**, by design — Louisiana's
  Nov 3, 2026 open-primary qualifying period (Aug 5-7, 2026) had not opened
  at build time; see the dated follow-up card below. This is not equivalent
  to `runoff_pending` (that status assumes two known finalists with an
  undetermined winner) — here there are zero known candidates for any
  district, so there is no per-seat row to tag; omission is the correct
  representation, not a placeholder for a future decision.
- **Candidate-withdrawal deadline for the House field cannot yet be
  computed to an exact date** — Louisiana's general withdrawal rule (La.
  R.S. 18:1400.1, per usvotefoundation.org) is 4:30pm on the 9th day after
  the relevant primary, or 4:30pm 2 days before early voting if exactly two
  candidates remain in a race — both formulas require knowing the actual
  House field first. Recorded as a rule, not a date, and handed to the
  dated follow-up card to compute once qualifying closes.
- **No independent/minor-party Senate filer** appeared in the portal's Nov 3
  general-ballot Senate section — exactly the two major-party nominees are
  listed.

## Every still-governing calendar date (per the plan doc's item (e))

- **August 5-7, 2026 (qualifying opens Aug 5, closes 4:30pm Aug 7)** — US
  House candidate qualifying period for the Nov 3, 2026 open primary (source:
  `https://www.sos.la.gov/elections-voting/election-dates`, confirmed
  2026-07-15). This is the date that resolves the House roster from empty to
  real.
- **July 9, 2026 (already past at build time)** — nominating-petition
  submission deadline for US House candidates choosing the petition path
  instead of paying the qualifying fee (source: same page). Produced zero
  visible qualifiers as of this build.
- **November 3, 2026** — US Senate general election (nominees already
  determined) / US House and most other offices' open primary.
- **December 12, 2026** — open general/runoff election, for any House (or
  other open-primary office) seat where no candidate won a majority on Nov
  3.
- **Candidate-withdrawal deadline (La. R.S. 18:1400.1, general rule, not
  yet computed to an exact date for House — see "Known gaps" above):**
  4:30pm on the 9th day after the relevant primary date, or 4:30pm 2 days
  before early voting begins if exactly two candidates remain in that race
  (source: usvotefoundation.org's Louisiana deadlines page, confirmed
  2026-07-15). For the Senate race specifically, applying this formula to
  the June 27, 2026 runoff yields **July 6, 2026** — already past as of this
  build (2026-07-15) — so the Senate ballot is effectively locked; no
  further withdrawal action is expected for that race absent an
  extraordinary/statutory exception not researched here.
- **A dated follow-up card, "[P2] Build official roster: Louisiana (LA) US
  House — after Nov 3 open-primary qualifying closes," `NOT BEFORE:
  2026-08-08`**, has been opened under the epic per the NOT BEFORE
  date-gate convention — see `docs/operations/voter-choice-backlog.md`.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/louisiana-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/la-official-roster-2026.ts`.
- **Official Louisiana source URLs used:**
  - `https://voterportal.sos.la.gov/CandidateInquiry?electionDate=20261103`
    (LA SoS Candidate Inquiry, Nov 3, 2026 election date — the operative
    source for both the Senate roster and the confirmed-empty House roster)
  - `https://www.sos.la.gov/elections-voting/election-dates` (LA SoS
    "Election Dates" page — House qualifying period, petition deadline,
    Nov 3 / Dec 12 election structure)
  - `https://www.washingtonpost.com/elections/2026/06/27/letlow-wins-louisiana-senate-runoff-succeed-cassidy-who-lost-his-primary/`
    and
    `https://www.nbcnews.com/politics/2026-election/live-blog/louisiana-election-bill-cassidy-live-updates-rcna344986`
    (Senate primary/runoff result cross-check, secondary sources)
  - `https://www.senate.gov/senators/senators-contact.htm` (incumbency
    cross-check only — confirms Cassidy, not Letlow, as a sitting LA
    Senator)
  - `https://letlow.house.gov/` (incumbency cross-check only — confirms
    Julia Letlow's current office is US House, not Senate)

## GO/NO-GO verdict

**GO.** The Senate fixture, importer registration, and tests are complete,
reviewed, and pass `npm run check` cleanly. The card's GOAL_CONDITION's
remaining requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag on — are
both done: the importer ran against staging twice, confirmed by direct
row-count query both times (2 rows, no duplication on re-run), and the real
code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for the Senate contest and LA-01, with 0
mismatches against the fixture and the designed empty-House fallback
confirmed working as intended. Prod was never touched — every database
command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this
self-vet. The House side is intentionally incomplete pending the Aug 5-7,
2026 qualifying period — tracked by the dated follow-up card above, not
left implicit.

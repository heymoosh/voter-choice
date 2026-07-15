# Alabama vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Alabama (AL)"
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). Fourth state through the
manual track, after AZ (`637c2583`), TX (`8530a468`), and OK (`d9b1ef86`).

Date: 2026-07-15. Alabama's regular 2026 primary (2026-05-19) and runoff
(2026-06-16) are already past. A **special primary election** for
Congressional Districts 1, 2, 6, and 7 is scheduled for 2026-08-11 — **not
happened yet as of this build**, 27 days in the future. The general election
is 2026-11-03 for every district.

**Why Alabama is not a normal "next state" build:** the F03 rehearsal had
already flagged a `2026-08-11` date that didn't fit the regular
primary/runoff/general pattern, with an explicit instruction on the card not
to assume what it was. It turned out to be the most structurally different
thing this pipeline has hit yet — not a runoff (like OK), not a portal
vendor quirk (like TX), but a **mid-decade congressional redistricting**
that nullified the regular primary results in four of Alabama's seven
districts and required an entirely separate special-election process for
just those four.

## Bottom line

**GO on the approach for a fourth state.** All 7 AL House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is
on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 8 contests**,
including the five contests whose nomination is still undetermined.

**The redistricting story, confirmed from primary sources, not assumed:**
the U.S. Supreme Court's *Louisiana v. Callais* ruling narrowed VRA Section
2 and, on 2026-05-11, lifted an injunction that had blocked Alabama from
redrawing its congressional map mid-decade. The next day (2026-05-12),
Governor Kay Ivey proclaimed a Special Primary Election for Congressional
Districts 1, 2, 6, and 7 — the four districts whose lines changed — set for
2026-08-11, **with explicitly no runoff** ("There will be no runoff
election," per her own press release). The regular May 19 primary was still
held in those four districts, but its results were **nullified** by the
special election; candidates who ran in the nullified primary (e.g. Jerry
Carl, who led the nullified CD1 Republican field) had to re-qualify and
re-file for the special primary to stay in contention. Districts 3, 4, and
5 were untouched by the map change and proceeded through the regular cycle
unaffected. The already-scheduled November 3, 2026 general election is
unchanged — special-primary winners simply join the CD3/4/5/Senate
nominees on that same ballot; there is no separate special general
election.

**Every CD1/2/6/7 contested race is undetermined as of this build.**
Alabama's own official Nov-3-general certification documents already prove
the state party apparatus treats this exactly the way this fixture does:
the Republican certification (dated 2026-06-24) simply omits CD1, CD2, CD6,
and CD7 entirely from its "2026 Primary Winners" table — no placeholder, no
guess. The Democratic certification (dated 2026-07-01) is even more
explicit: CD1 (Clyde W. Jones, Jr.), CD2 (Shomari C. Figures), and CD7
(Terri A. Sewell) each had only one Democratic filer for the special
primary, so the party's own document lists them as determined nominees —
but CD6's listed name, "Keith Pilkington," carries an explicit
**"(subject to August 11 Primary)\*"** flag, because that race has four
Democratic filers and is genuinely contested. This fixture reproduces that
exact distinction: uncontested special-primary filers are recorded
`qualified_for_general_ballot`; every genuinely contested CD1/2/6/7 race
(all four Republican fields, plus CD6's Democratic field) is recorded
`runoff_pending`.

**"`runoff_pending`" is a reused, imperfect label here — flagged, not
silently stretched.** Oklahoma's build added this status for a true
two-finalist runoff. Alabama's situation is a still-pending **first-round
special primary with no runoff at all** — a field of up to six candidates
(CD2 Republican), not narrowed to two. Reused per the epic's standing
instruction to use the existing mechanism rather than add new schema for
one state, but the RepCard "Runoff pending" tag/CTA copy ("your vote in
that runoff can still decide...") will read as factually imprecise for
Alabama's candidates once this data is flag-enabled. See "Known gaps" below.

**A real, non-obvious incumbency finding, confirmed the same way OK's
Armstrong/Mullin finding was:** the sitting Class III U.S. Senator, Tommy
Tuberville, is **not** on the 2026 Senate ballot — he is the Republican
Party's own certified nominee for **Governor** instead (confirmed directly
in the Republican certification document's "2026 Primary Winners" table,
not inferred). AL-1's sitting representative, Barry Moore, similarly left
his House seat to run for — and win — the Republican Senate nomination.
Both are open seats for their old office as a direct result.

**NO-GO on fan-out to further states beyond this one build, and NO-GO on
flipping the flag for real users** without Muxin's sign-off — same standing
gate as AZ, TX, and OK.

## How this was verified — a static HTML hub, but every certification PDF
is a scanned image, no Civix and no text-layer extraction possible

Alabama's official source (`sos.alabama.gov/alabama-votes/voter/election-information/2026`)
is confirmed static HTML, matching the F03 rehearsal's `sourceFormat: "html"`
/ `parserFamily: "html_table"` finding — **not** Civix-vended, so the Civix
portal playbook does not apply. Every certification document is linked
directly from that hub as a PDF, and none required browser automation to
fetch. The operational wrinkle specific to Alabama: **every PDF read this
session was a scanned image with no text layer** — `pypdf` and
`pdfminer.six` both returned empty strings on every attempt (confirmed
before concluding this, not assumed). Transcription required reading each
PDF page directly as an image (Claude's native PDF-reading path), not text
extraction — a materially different mechanic from OK's real text-layer PDF.

1. **Determined nominees (CD3, CD4, CD5, Senate):** the Alabama Republican
   Party's and Alabama Democratic Party's own certifications of "2026
   Primary Winners for Elected Office" to appear on the November 3 general
   ballot — `CertificationofRepublicanPartyCandidates-2026General.pdf`
   (certified 2026-06-24, state-received 2026-06-30) and
   `CertificationofDemocraticPartyCandidates-2026General.pdf` (certified
   2026-07-01). These are literally titled with a "Ballot Name" column —
   the most authoritative source available for the exact name that will
   appear on the ballot, used verbatim for every determined nominee in this
   fixture.
2. **Pending candidates (CD1/2/6/7):** the two parties' certifications of
   candidates *qualified to run* in the August 11 special primary —
   `Republican Certification of Candidates.pdf` and `Democratic
   Certification of Candidates.pdf` (both certified 2026-05-26, filed with
   the Secretary of State). These list every filer per district/party; this
   fixture records every name from these documents for any contest with
   more than one filer.
3. **Why the special primary exists at all, its no-runoff rule, and that
   the general proceeds as already scheduled:** Governor Ivey's own
   2026-05-12 proclamation press release
   (`governor.alabama.gov/newsroom/2026/05/...`) and the official Special
   Primary Election Calendar PDF (confirms no runoff/special-general date
   appears anywhere after August 11 — the next dated event is state
   executive-committee certification on August 24).
4. **Incumbency cross-check**, never guessed from a certification list:
   `https://www.house.gov/representatives` ("By State and District" →
   Alabama) confirms the sitting delegation is Moore (AL-1), Figures
   (AL-2), Rogers (AL-3), Aderholt (AL-4), Strong (AL-5), Palmer (AL-6),
   Sewell (AL-7); `https://www.senate.gov/states/AL/intro.htm` confirms the
   sitting Class III senator is Tommy Tuberville. **This app's own
   FEC-derived `candidates` table was deliberately never used for this
   cross-check** — same rule as AZ, TX, and OK.

**A note on Wikipedia's use in this build:** Wikipedia's
"2026 United States House/Senate elections in Alabama" articles were
consulted early for orientation (they cite the same primary sources this
build independently re-verified: the Governor's proclamation, the FEC, and
local reporting) — but every fact that made it into the fixture was
independently confirmed against an official Alabama SoS/party document or
house.gov/senate.gov before being recorded, per the epic's SAFETY rule that
a secondary source is comparison/orientation only, never the source of
record. One consequence of applying that rule strictly: a Wikipedia-named
declared independent Senate candidate (Craig Jelks) was **not** included in
this fixture, because no official Alabama document confirming his filing
or petition status was located this session — see "Known gaps" below.

**Independent/write-in candidates:** no official Secretary of State
document listing certified independent or write-in candidates for any 2026
Alabama congressional or Senate race was found this session (Alabama's
"Independent Candidates" page links only general guidance PDFs — a sample
petition, an administrative rule, a signature-requirement notice — not a
qualified-candidate list). Unlike Texas's dedicated declaration-tracking
PDF or Oklahoma's single combined filing window, Alabama simply doesn't
appear to publish this as a discrete document at the point this was
checked. Nothing was fabricated to fill that gap.

## A cross-check finding this build made (not a bug — a real, non-obvious
incumbency fact caught by the independent-source rule)

The same official Republican Party certification document that lists Barry
Moore as the winning Senate nominee also lists **Tommy Tuberville** as the
winning **Governor** nominee, in the same table. Cross-checked against
`senate.gov`, which confirms Tuberville is still Alabama's sitting Class
III senator today — he simply isn't seeking re-election to that seat. Had
this build relied on assuming "the sitting senator is probably running for
re-election" instead of reading the actual certification document, this
would have gone undetected; the official source made it unambiguous.

## Contest inventory

Alabama has **7 US House districts and 1 US Senate contest in 2026** (the
Class III seat, currently held by Tommy Tuberville, who is not seeking
re-election). All 7 House districts + the Senate race are covered by the
general election. Four of the seven House districts (1, 2, 6, 7) have their
party nominations pending the August 11, 2026 special primary; the
remaining three (3, 4, 5) and the Senate race are fully determined.

## What was built (delta from the AZ/TX/OK pattern)

All of the prior builds' infrastructure is state-agnostic and required **no
changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, `RepCard.tsx`'s existing "Runoff pending" tag/CTA,
and the importer's array-shaped `FIXTURES` map. No new `OfficialBallotStatus`
value, no schema migration, no UI change was needed — every mechanism
Alabama needed already existed from the OK build.

**New / changed for this build:**

- `scripts/congressional-rosters/al-official-roster-2026.ts` (new) — 27
  House rows (7 districts: 3 fully-determined district pairs, 4
  special-primary districts with a mix of determined-by-being-unopposed and
  genuinely pending fields) + 2 Senate rows (both determined). Full
  sourcing, methodology, and known limitations are in the file's own header
  docblock — including the redistricting narrative in full, so a future
  session doesn't have to re-derive it.
- `scripts/ingest/official-roster.ts` — registered `AL` in `FIXTURES` with
  separate house/senate entries, exactly like TX's and OK's two-entry
  pattern.
- `src/lib/server/officialRoster.test.ts` — 21 new tests: `getOfficialRoster`
  narrowing across all 7 AL districts + the Senate contest, `runoff_pending`
  coverage for AL-1's full 4-candidate Republican field (proving the
  mechanism generalizes beyond a 2-finalist runoff), AL-6's simultaneous
  `isIncumbent: true` + `ballotStatus: "runoff_pending"` case (the sitting
  incumbent's own renomination is undetermined), `isIncumbentSeekingReelection`
  for the 5 determined-incumbent districts + AL-1's open seat + the open
  Senate seat, and `lookupChallengers` wiring — including confirming that
  AL-6's Gary Palmer is excluded from the challenger list as the sitting
  incumbent even though his own nomination isn't decided (same
  isIncumbent-keyed contract as AZ/TX/OK; not a new behavior).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean before
  this build's staging-credential interruption; re-confirmed after (162
  test files, 3084 tests passing, 0 failures).
- **A genuine infrastructure interruption occurred mid-build:** the shared
  isolated Neon staging branch (`ROSTER_STAGING_DATABASE_URL`) was found to
  no longer exist — confirmed via a raw `@neondatabase/serverless` call
  (bypassing the importer entirely) returning `password authentication
  failed` against both the stale `.env.local` value and a freshly
  `vercel env pull`'d value (Development and Preview, identical). Muxin
  confirmed the branch itself was gone in the Neon console and created a
  replacement, updating Vercel's `ROSTER_STAGING_DATABASE_URL`. No data was
  actually lost by this: the AZ/TX/OK fixture files (the real source of
  truth) were already committed to `main`; only the ephemeral staging
  **copy** used for live verification needed to be rebuilt. Migrations
  `0015_add_official_roster_candidates.sql` and
  `0016_fix_official_roster_null_district_uniqueness.sql` were re-applied
  to the new branch (both additive/non-destructive — `CREATE TABLE`, index
  creation, and an index-uniqueness fix with no data-loss risk), then all
  four states (AZ, TX, OK, AL) were re-imported.
- AL's 29 rows (27 House + 2 Senate) imported to the isolated Neon
  **staging** branch, re-imported, and confirmed idempotent by direct
  row-count query (29 both times — 27 house / 2 senate — not just the
  importer's own self-reported count). Full staging state after
  re-populating all four states: AZ 46, OK 21, TX 118, AL 29 rows — AZ/OK/TX
  counts match their own build docs exactly, confirming the re-import
  reproduced prior state correctly, not just AL's.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 7 AL House
  districts and the Senate race, diffed against the fixture. **0 mismatches
  across all 8 contests.** Full literal output (candidate name, party, and
  provenance as the app would render it):

  ```
  AL-01 — open seat (Moore filed for, and won, the US Senate nomination
  instead); Republican nomination pending the Aug 11 special primary
    - Austin Sidwell (Republican) [pending]
    - Jerry Carl (Republican) [pending]
    - John Mills (Republican) [pending]
    - Lucas Burger (Republican) [pending]
    - Clyde W. Jones, Jr. (Democrat) [uncontested special-primary filer]

  AL-02 — incumbent Shomari C. Figures (Democrat), uncontested
  special-primary filer, excluded as incumbent; Republican nomination
  pending the Aug 11 special primary
    - Hampton Harris (Republican) [pending]
    - Christian Horn (Republican) [pending]
    - Rhett Marques (Republican) [pending]
    - David Matthews (Republican) [pending]
    - Joshua McKee (Republican) [pending]
    - James Richardson (Republican) [pending]

  AL-03 — incumbent Mike Rogers, seekingReelection2026=true, excluded as
  incumbent (unaffected by redistricting)
    - Lee McInnis (Democrat)

  AL-04 — incumbent Robert B. Aderholt, seekingReelection2026=true,
  excluded as incumbent (unaffected by redistricting)
    - Amanda N. Pusczek (Democrat)

  AL-05 — incumbent Dale W. Strong, seekingReelection2026=true, excluded as
  incumbent (unaffected by redistricting)
    - Andrew Sneed (Democrat)

  AL-06 — incumbent Gary Palmer IS seeking re-election but his own
  renomination is pending; excluded from challengers as the sitting
  incumbent regardless (both parties' fields pending the Aug 11 special
  primary)
    - Case Dixon (Republican) [pending]
    - Jacob Bouma-Sims (Democrat) [pending]
    - Ashtyn Kennedy (Democrat) [pending]
    - Maurice Mercer (Democrat) [pending]
    - Keith Pilkington (Democrat) [pending]

  AL-07 — incumbent Terri A. Sewell (Democrat), uncontested special-primary
  filer, excluded as incumbent; Republican nomination pending the Aug 11
  special primary
    - Ammie Akin (Republican) [pending]
    - David W. Perry (Republican) [pending]

  U.S. SENATE — open seat (sitting incumbent Tommy Tuberville is the
  certified Republican nominee for Governor instead, not Senate); both
  nominations determined, unaffected by redistricting
    - Barry Moore (Republican)
    - Everett Wess (Democrat)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Every pending candidate above renders with
  `isRunoffPending: true`; every determined nominee renders with
  `isRunoffPending: false`, confirmed directly from the live query output.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **All four special-primary districts' contested races are undetermined**
  pending the August 11, 2026 special primary (no runoff). This fixture
  will need a follow-up update once that primary is certified — the
  official calendar's state executive-committee certification date is
  2026-08-24.
- **The "`runoff_pending`" label is an imperfect semantic fit for Alabama's
  situation** — a still-pending first-round special primary with no runoff,
  not a runoff between two known finalists the way OK used it. Reused per
  the epic's standing requirement rather than adding new schema/UI for one
  state (the plan doc already defers a more general pending-election
  schema as a separate, bigger design pass). Concretely: the RepCard
  "Runoff pending" tag/CTA copy ("your vote in that runoff can still
  decide...") will read as factually imprecise for Alabama's CD1/2/6/7
  candidates once this data is flag-enabled — flagged here as a copy
  follow-up, not blocking this build (the flag stays off everywhere
  persistent regardless of this build).
- **AL-6's incumbent, Gary Palmer, is excluded from the "challengers" list
  by the app's existing isIncumbent-keyed contract, even though his own
  renomination is undetermined.** This is not a bug introduced by this
  build — it's the same behavior AZ/TX/OK already established (the sitting
  incumbent is "already shown as the seat's own card," so never appears as
  a challenger) — but it means a voter looking at AL-6 today won't see any
  signal that Palmer himself is in a contested primary against Case Dixon.
  Worth a look whenever the pending-election design pass (see OK's report
  doc) is scoped, since Alabama surfaced a case OK's pattern didn't:
  an incumbent whose own seat is genuinely contested.
- **No official Secretary of State document confirming any independent or
  write-in candidate** for an Alabama 2026 congressional/Senate race was
  located this session. A Wikipedia-sourced declared independent Senate
  candidate (Craig Jelks) was deliberately excluded for lack of official
  corroboration — see "How this was verified" above.
- **No Libertarian or Green Party filings were found** for any Alabama
  congressional or Senate race in the official documents reviewed this
  session — verified absent from every certification list read, not simply
  unresearched.
- Names are recorded as they appear in the official certification
  documents' "Ballot Name" columns (determined nominees) or candidate lists
  (pending special-primary filers); not independently re-verified against a
  third document.
- **A genuine infrastructure gap surfaced by this build:** the shared
  `ROSTER_STAGING_DATABASE_URL` Neon branch has no documented owner/recovery
  process — it was simply gone with no warning, and diagnosing "is this a
  stale credential or a deleted branch" from inside a sandboxed session
  took real back-and-forth (structural validation of the connection string,
  a raw driver-level test, two independent fresh Vercel pulls) before
  concluding it needed a human to check the Neon console directly. Worth a
  short runbook note somewhere (this doc, or the plan doc) for the next
  session that hits the same symptom: `password authentication failed`
  from a freshly-pulled credential, on a branch that worked hours earlier,
  means "check whether the branch itself still exists," not "look for a
  credential bug."

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/roster-al/docs/operations/alabama-vertical-slice-data-check.md`
  (will land at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/alabama-vertical-slice-data-check.md`
  once merged).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/roster-al/scripts/congressional-rosters/al-official-roster-2026.ts`
  (will land at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/al-official-roster-2026.ts`
  once merged).
- **Official Alabama source URLs used:**
  - `https://www.sos.alabama.gov/alabama-votes/voter/election-information/2026`
    (Alabama Secretary of State's 2026 election information hub)
  - `https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofRepublicanPartyCandidates-2026General.pdf`
    (Republican Party's certification of determined Nov 3 general-ballot
    nominees, incl. Senate/CD3/CD4/CD5 — and Tuberville's Governor
    nomination, confirming the open Senate seat)
  - `https://www.sos.alabama.gov/sites/default/files/election-2026/CertificationofDemocraticPartyCandidates-2026General.pdf`
    (Democratic Party's certification of determined Nov 3 general-ballot
    nominees, incl. Senate/CD1/CD2/CD3/CD4/CD5/CD7 — and the explicit
    "subject to August 11 Primary" flag on CD6)
  - `https://www.sos.alabama.gov/sites/default/files/06-03-2026/Republican%20Certification%20of%20Candidates.pdf`
    (Republican Party's certification of qualified Special Primary
    candidates for CD1/2/6/7)
  - `https://www.sos.alabama.gov/sites/default/files/06-03-2026/Democratic%20Certification%20of%20Candidates.pdf`
    (Democratic Party's certification of qualified Special Primary
    candidates for CD1/2/6/7)
  - `https://www.sos.alabama.gov/sites/default/files/election-2026/Amended2026SpecialPrimaryElectionCalendar_05.27.2026.pdf`
    (official Special Primary Election Calendar — confirms the Aug 11 date
    and the absence of any runoff/special-general date)
  - `https://governor.alabama.gov/newsroom/2026/05/governor-ivey-celebrates-major-court-victory-in-states-redistricting-battle-calls-special-election-for-alabama-drawn-congressional-map/`
    (Governor Ivey's proclamation press release — primary source for why
    the special primary exists, the no-runoff rule, and that the Nov 3
    general proceeds as already scheduled)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not an Alabama source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/states/AL/intro.htm` (Senate incumbency
    cross-check only — the source of the Tuberville/Governor finding above)

## GO/NO-GO verdict

**GO on the approach for a fourth state — the manual track generalizes to a
mid-decade redistricting/special-election scenario, and the existing
`runoff_pending` mechanism (reused, with a documented semantic caveat)
covers it without new schema or code. NO-GO on proceeding to more states or
real users without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for AZ, TX, OK, and/or AL)** — human sign-off
   required, same as every prior state. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A follow-up update to this fixture is needed after August 24-25,
   2026**, once Alabama's special primary is certified for CD1, CD2, CD6,
   and CD7.
3. **The "Runoff pending" copy imprecision for Alabama's special-primary
   candidates** (see "Known gaps") should be resolved before the flag ever
   flips for Alabama specifically — either accept the copy as close enough,
   or fold it into the already-planned pending-election design pass.
4. **The shared staging Neon branch's lack of a documented owner/recovery
   process** (see "Known gaps") is worth a short runbook note so the next
   session that hits this doesn't have to re-diagnose it from scratch.

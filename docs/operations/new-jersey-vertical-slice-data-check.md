# New Jersey vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: New Jersey (NJ)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. New Jersey's 2026 primary (June 2, 2026) is complete and
nominees are determined; the general election is November 3, 2026. New
Jersey has one 2026 US Senate contest (the Class II seat, held by Cory
Booker; the Class I seat is not up until 2030).

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/new-jersey-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/nj-official-roster-2026.ts`

**(c)** Exact, full, untruncated official New Jersey source URLs used:
- `https://nj.gov/state/elections/index.shtml` (Division of Elections home)
- `https://www.nj.gov/state/elections/election-information-2026.shtml` (2026 Election Information and Results landing page)
- `https://nj.gov/state/elections/candidate-information.shtml` (Candidate Information landing page)
- `https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-house.pdf` (official field of June 2, 2026 primary filers, US House, with "*" incumbent marker)
- `https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-senate.pdf` (same, US Senate)
- `https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-house-0612.pdf` (official independent/minor-party petition filers for the general ballot, US House)
- `https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-senate-0612.pdf` (same, US Senate)
- `https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-certification-of-primary-nominees.pdf` (the state's own primary-nominee certification — a scanned/image-only PDF, could not be text-extracted; see below)
- `https://www.nj.gov/state/elections/assets/pdf/chrons/2026-chron-general-election-0109.pdf` (official 2026 General Election Timeline, updated January 9, 2026 — source for the calendar dates in section (e) below)
- `https://www.house.gov/representatives` (incumbency cross-check)
- `https://bioguide.congress.gov` (Senate incumbency cross-check)
- New Jersey Globe (`newjerseyglobe.com`), New Jersey Monitor (`newjerseymonitor.com`), WHYY (`whyy.org`) — independent journalism, used ONLY to determine each contested primary's winner (never candidate eligibility/party); see the per-district citation list in "How this was verified" below.

**(d)** Operational-navigation section — see "How this was verified" below.

**(e)** Every still-governing calendar date — see "Governing calendar dates" below.

## Bottom line

**GO on the approach for a twelfth state.** All 12 NJ House districts and
the US Senate race render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path.

**Not Civix-vended.** New Jersey's Department of State, Division of
Elections publishes static PDF candidate lists (no JS portal, no
`*.civixapps.com` domain) — the Civix portal playbook does not apply.

**A structural finding, not a data gap:** New Jersey's own "general
candidates" PDF (dated 06/12/2026, ten days after the primary) turned out to
list ONLY independent/minor-party petition filers — zero Democratic or
Republican rows anywhere in it. This matches New Jersey's actual
ballot-access law (N.J.S.A. 19:13-3): a party primary's winner becomes the
general-ballot nominee automatically with no separate post-primary filing,
so the state's "general candidates" publication only ever needed to cover
the *other* path onto that ballot. This is a materially different document
shape than every prior state's "general candidates" list in this track and
is flagged for anyone reusing this pattern on a future state.

**A real sourcing limitation, disclosed rather than worked around:** New
Jersey's own "Certification of Primary Election Nominees" PDF — the
document that would directly answer "who won each contested primary" — is
a **scanned/image-only PDF** (confirmed: both `WebFetch` and direct PDF
text-extraction returned only JPEG-compression artifacts, no extractable
text; matches the plan doc's scanned/image-only PDF gotcha). No New Jersey
equivalent of Oklahoma's `results.okelections.gov` (a live official
election-night-results portal) or Indiana's `enr.indianavoters.in.gov` was
found. Each contested primary's winner was instead determined from
independent New Jersey political journalism reporting AP-called results
with vote totals/percentages — see the per-district citations below. The
FIELD of candidates per district/party (who was even eligible to win) is
still sourced solely from the state's own official PDF.

**Two open findings surfaced by this build, not assumed from a prior
state's pattern:**
- **NJ-12 is an open seat** — Bonnie Watson Coleman (D), the sitting
  Representative, did not file for re-election (confirmed absent from the
  official primary-candidates filing list; independently confirmed via her
  November 2025 retirement announcement).
- **NJ-8 has no Republican nominee** — no Republican candidate filed for
  this seat at all; the incumbent Democrat's general-ballot opponents are
  three independent/minor-party petition filers only.

**No `runoff_pending` rows** — New Jersey has no primary-runoff mechanism
(plurality wins); every contested primary in this fixture was decided
outright on June 2, 2026.

## Contest inventory

12 US House districts (all 12 covered) + 1 US Senate contest (Class II
seat). 40 total roster rows imported: 36 House, 4 Senate.

## How this was verified — static PDF downloads + independent-journalism primary-winner derivation

1. Confirmed New Jersey's official source is a static `.shtml` page
   (`election-information-2026.shtml`) linking to PDF documents, not a
   Civix-vended portal — checked the URL pattern (`nj.gov/state/elections`,
   no `*.civixapps.com`/`enr.*`/`results.*`) before assuming either way,
   per the card's ORIGIN instruction.
2. Fetched the two "Unofficial General Election Candidates" PDFs
   (House/Senate, dated 06/12/2026) expecting the full general-ballot
   roster — got only independent/minor-party petition filers instead (13
   House across 8 districts, 2 Senate). Cross-checked this against New
   Jersey's own ballot-access statute (N.J.S.A. 19:13-3) to confirm this
   was the document's correct, complete scope, not a partial fetch.
3. Fetched the two "Official Primary Election Candidates" PDFs
   (House/Senate, dated 04/02/2026) — real text-layer PDFs listing the full
   field of June 2, 2026 primary filers by district/party, with a "*"
   incumbent marker. This established the field of contestants and the
   state's own snapshot of incumbency as of the filing deadline.
4. Attempted to fetch New Jersey's "Certification of Primary Election
   Nominees" PDF — both `WebFetch` and direct PDF text-extraction returned
   only image-compression artifacts (scanned/image-only PDF, no
   extractable text). No live election-results portal equivalent to
   Oklahoma's or Indiana's was found on `nj.gov`.
5. **Derived each contested primary's winner from independent New Jersey
   political journalism reporting AP-called results**, cross-referenced
   against the state's own field-of-candidates list from step 3 (never
   introducing a name not already in the official filing):
   - NJ-2 (D, 4-way): Zack Mullock — [New Jersey Globe/Patch](https://patch.com/new-jersey/woodbridge/results-democratic-primary-nj-6-congress-seat-pallone-hsu-bansil) via NBC News aggregation
   - NJ-3 (R, 3-way): Michael P. McGuire — NBC News/AP-called results
   - NJ-4 (D, 2-way): Rachel Peace — NBC News/AP-called results
   - NJ-6 (D, 3-way, 67%-26%-8%): Frank Pallone Jr. — [New Jersey Globe](https://newjerseyglobe.com/congress/pallone-defeats-two-primary-foes-for-20th-term-in-nj-6/), [Patch](https://patch.com/new-jersey/woodbridge/results-democratic-primary-nj-6-congress-seat-pallone-hsu-bansil)
   - NJ-7 (D, 4-way): Rebecca Bennett — NBC News/AP-called results
   - NJ-8 (D, 2-way, 69.8%-30.2%): Rob Menendez — [New Jersey Globe](https://newjerseyglobe.com/congress/menendez-crushes-ali-in-nj-8-boosting-his-political-standing/), [New Jersey Monitor](https://newjerseymonitor.com/2026/06/02/rob-menendez-democratic-primary/) (Menendez 26,541 votes / Ali 11,510 votes of 38,051 total)
   - NJ-9 (R, 2-way): Rosie Pino — [US News](https://www.usnews.com/news/politics/articles/2026-06-12/rosie-pino-wins-republican-primary-in-new-jerseys-9th-district-to-challenge-rep-nellie-pou), AP-called June 12, 2026
   - NJ-10 (D, 2-way, 86%-14%): LaMonica R. McIver — [New Jersey Monitor](https://newjerseymonitor.com/2026/06/02/lamonica-mciver-federal-charges-democratic-primary/), [New Jersey Globe](https://newjerseyglobe.com/congress/mciver-defeats-unheralded-primary-foe-in-nj-10/)
   - NJ-11 (D, 4-way, 82%): Analilia Mejia — [New Jersey Globe](https://newjerseyglobe.com/congress/mejia-convincingly-wins-democratic-primary-for-first-full-term/), [Morristown Green](https://morristowngreen.com/2026/06/02/mejia-wins-the-primary-again-in-the-11th-congressional-district/)
   - NJ-12 (D, 13-way): Adam Hamawy — US News ("bested 12 other candidates")
   - US Senate (R, 4-way, 33.3%-29.4%-27%-10.7%): Justin Murphy — [WHYY](https://whyy.org/articles/new-jersey-election-2026-primary-senate-republican-nomination/), [PhillyVoice](https://www.phillyvoice.com/new-jersey-primary-election-results-us-senate-2nd-district-republicans-democrats/) (over Tabor, Zdan, Lebovics)
   - All unopposed-primary nominees (both major parties in NJ-1, NJ-5; Van
     Drew/Smith/Gottheimer/Kirrane/Kean Jr./Herzig/Pou/Bucco/Hathaway/
     Mele/Booker) came directly from the official filing PDF's single-filer
     rows, not from journalism.
6. **NJ-11 incumbency timing nuance**, found during this build: Analilia
   Mejia carries no "*" in the official primary-candidates PDF (dated
   04/02/2026), because at that filing deadline she had won only the
   February 5, 2026 special *primary* for the open NJ-11 seat (Mikie
   Sherrill's resignation to become NJ Governor) — the special *general*
   election did not occur until April 16, 2026. Cross-checked against
   `house.gov`'s current delegation listing: she is the sitting NJ-11
   Representative as of this build (2026-07-15) and is recorded
   `isIncumbent: true` in the fixture, with the state's frozen
   April-2-snapshot asterisk documented as an artifact of timing, not a
   data error.
7. **NJ-12 open-seat finding**: Bonnie Watson Coleman does not appear
   anywhere in the official primary-candidates filing PDF for NJ-12 —
   confirmed independently via her [November 2025 retirement
   announcement](https://newjerseymonitor.com/2025/11/10/bonnie-watson-coleman-retire/)
   (`newjerseymonitor.com`). No incumbent row exists for NJ-12 in the
   fixture, mirroring the OK-1 open-seat precedent from that state's build.
8. **Party-code handling**: New Jersey's post-2020 "office-block" ballot
   design requires every non-major-party candidate to select a ballot
   "Party" label, which for most independent filers is a self-chosen
   campaign slogan (e.g. "SAVE OUR BABIES", "WE THE PEOPLE") rather than a
   real party name — recorded as `party: "IND"` with the literal label
   preserved in an inline fixture comment. Two real, nationally-recognized
   minor parties appeared identically across unrelated races: Green Party
   and Libertarian Party (both already in the shared `types.ts` enum from
   prior states, reused as-is — confirmed via `grep` that GRE/LIB are
   already the established codes, no new codes needed) and **Socialist
   Workers Party**, which had no prior code — added `SWP` to
   `scripts/congressional-rosters/types.ts` and its display-name mapping to
   `PARTY_NAMES` in `src/lib/server/races.ts`, mirroring the AIP/AKP/NPP/
   PF/LPF/FFP precedent for a real recognized minor party.
9. Cross-checked incumbency two ways, never guessed from either NJ source
   or this app's own FEC-derived `candidates` table: (1) the official
   primary-candidates PDF's own "*" marker; (2) `https://www.house.gov/representatives`
   ("By State and District") for the current (2026-07-15) delegation, and
   `bioguide.congress.gov` for Senate confirmation.
10. Assembled `NJ_HOUSE_ROSTER_2026` (36 rows) and `NJ_SENATE_ROSTER_2026`
    (4 rows) and registered both in `scripts/ingest/official-roster.ts`.
11. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
    162 test files, 3,189 tests passed. (One test —
    `scripts/design/capture-shared.test.ts` — failed only under the
    sandboxed shell due to a Chromium launch permission restriction
    unrelated to this diff; confirmed zero-diff against `origin/main` for
    that file and passing cleanly when re-run unsandboxed.)
12. **Credential confirmed working.** The `.env.local` copy of
    `ROSTER_STAGING_DATABASE_URL` was stale (password authentication
    failed — a known recurring staging-branch-reset issue). Re-linked the
    worktree to the same Vercel project as the main checkout (copied
    `.vercel/project.json`) and ran a fresh
    `vercel env pull --environment=preview`, read inline via a single
    `grep`/`cut`/`sed` command substitution — never `source`d, never
    echoed — confirmed non-empty (146 characters) before use.
13. **Staging import: done, twice, confirmed by direct row-count query
    both times — no ambient/production `DATABASE_URL` ever used.**
    - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
      --state NJ` → `upserted=40`.
    - Queried `official_roster_candidates` directly against staging,
      grouped by office → `{house: 36, senate: 4}`, total `40`.
    - Re-ran the same import command a second time → `upserted=40` again,
      then re-queried the row count → still `40` (idempotent upsert
      confirmed, not a duplicate insert).
14. **End-to-end check against staging, flag on:** called
    `lookupChallengers` directly (the real production code path, not a
    mock) for NJ-1, NJ-2, NJ-8, NJ-11, NJ-12, and the Senate race against
    staging with `OFFICIAL_ROSTER_ENABLED=1`, and compared the app's
    literal output candidate-by-candidate against the fixture:
    ```
    NJ-01: [DAMON GALDO] — incumbent Norcross correctly excluded
    NJ-02: [ZACK MULLOCK, RAMON MORA JR.] — incumbent Van Drew correctly excluded
    NJ-08: [ARISTOTLE ELIOPOULOS, CRAIG HONTS (SWP), DA'SHONE HUGHEY] — incumbent Menendez excluded, no Republican row (correct — none filed)
    NJ-11: [JOE HATHAWAY, ALAN B. BOND] — incumbent Mejia correctly excluded
    NJ-12: [ADAM HAMAWY, GREGG MELE, ANDRES JINETE, WINSTON JORDAN] — open seat, all 4 render, none excluded
    SENATE: [JUSTIN MURPHY, VERONICA FERNANDEZ, JOANNE KUNIANSKY] — incumbent Booker correctly excluded
    ```
    Every row carried `rosterProvenance.sourceKind === "official_state_roster"`.
    `CRAIG HONTS`'s party rendered as "Socialist Workers Party" (confirming
    the new `SWP` → `PARTY_NAMES` mapping works end-to-end). The staging
    `DATABASE_URL` and `OFFICIAL_ROSTER_ENABLED` flag were both set inline
    for this verification command only, never written to a persisted env
    file, and both scratch verification scripts were deleted immediately
    after use (not committed).
15. Added 3 new `describe` blocks to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — NJ narrowing`, `isIncumbentSeekingReelection —
    NJ`, `lookupChallengers — NJ wiring`), mirroring the OK two-chamber
    coverage pattern. 153/153 tests pass in that file alone.

## Governing calendar dates (per the plan doc's item (e) requirement)

Pulled directly from the official New Jersey 2026 General Election
Timeline, updated January 9, 2026
(`https://www.nj.gov/state/elections/assets/pdf/chrons/2026-chron-general-election-0109.pdf`):

- **July 27, 2026** — deadline for the Secretary of State to submit to the
  county clerks the Statement of All Duly Nominated Candidates for the
  General Election (not later than 99 days before election), N.J.S.A.
  19:13-22. This is New Jersey's practical primary-nominee certification
  moment feeding the county-level ballot process.
- **August 10, 2026 at 3:00 p.m.** — drawing of ballot position for
  general election candidates by the county clerks (85 days before
  election), N.J.S.A. 19:14-12.
- **August 14, 2026** — deadline for independent candidates to decline
  nomination for the general election (81 days before election), N.J.S.A.
  19:13-16. This is New Jersey's independent-candidate withdrawal
  deadline — applies to every `declared_general_ballot_intent` row in this
  fixture.
- **August 20, 2026 by 4:00 p.m.** — deadline for a new nomination petition
  to fill a vacancy for independent candidates for the general election
  (75th day before election), N.J.S.A. 19:13-19.
- **August 25, 2026** — last day a vacancy can occur for a primary
  election nominee for the general election (70 days before election),
  N.J.S.A. 19:13-20. This is New Jersey's major-party-nominee withdrawal
  deadline — applies to every `qualified_for_general_ballot` row in this
  fixture.
- **August 27, 2026** — deadline for filling a primary-nominee vacancy for
  the general election (68 days before election), N.J.S.A. 19:13-20.
- **August 31, 2026** — deadline for preparation of the official general
  election ballot for printing (64 days before election), N.J.S.A.
  19:14-1. This is New Jersey's practical ballot-content-lock date — after
  this date no further roster change is possible for this cycle absent a
  court order.

**Dated re-check cards opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`, mirroring Indiana's two-card withdrawal/lock split):
one for 2026-08-26 — "Re-check official roster: New Jersey (NJ) — after
candidate-withdrawal deadlines" — the day after the later of NJ's two open
withdrawal windows (primary-nominee vacancy, August 25, N.J.S.A. 19:13-20;
the earlier independent-decline deadline, August 14, N.J.S.A. 19:13-16, is
subsumed by checking on this later date) — and one for 2026-09-01 —
"Re-check official roster: New Jersey (NJ) — after ballot-content lock" —
the day after the August 31 ballot-preparation deadline (N.J.S.A. 19:14-1),
confirming the roster is fully locked for the 2026 cycle.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- Every contested primary's WINNER is sourced from independent journalism
  reporting AP-called results, not from New Jersey's own certification
  document (scanned/image-only, unreadable this session) — flagged for
  Muxin, same category of open item as prior states' equivalent gaps.
- Independent/minor-party filers' final petition-signature sufficiency as
  of the "Unofficial" general-candidates list's publication date could not
  be confirmed — recorded as `declared_general_ballot_intent`, not
  `qualified_for_general_ballot`.
- Names are recorded as they appear in the official filing lists; not
  independently re-verified against a third document.
- The three still-open withdrawal/vacancy windows above (August 14, 25,
  31) mean this roster could still change before the general election —
  tracked via the three dated re-check cards, not treated as resolved.

## GO/NO-GO verdict

**GO.** `npm run check` clean (162 files, 3,189 tests). Staging import
idempotent (40 rows, confirmed twice by direct row-count query).
End-to-end `lookupChallengers` output against staging matches the fixture
candidate-by-candidate across 6 sampled contests (5 House + Senate), with
correct incumbent exclusion, correct open-seat handling (NJ-12), correct
no-opponent handling (NJ-8's missing Republican), and the new `SWP` party
code rendering correctly end-to-end. What remains: (1) Muxin's awareness of
the journalism-sourced-winner limitation (no prior state in this track
needed this path); (2) the two dated calendar re-checks above; (3) the
standard self-vet-then-merge flow per the card's DECISION line — this PR
is NOT merged by this build, per this session's explicit instruction that
a separate babysit-PRs session owns merge/rebase/Done.

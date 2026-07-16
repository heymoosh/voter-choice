# Minnesota vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Minnesota (MN)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15/16. Minnesota's 2026 candidate-filing period (May 19 –
June 2, 2026) is closed and the pre-primary withdrawal deadline (June 4,
2026) has passed, so the full candidate SET is final and closed — but the
2026 state primary (August 11, 2026) has **not yet happened** as of this
build. Almost every contested party primary is therefore undetermined. The
general election is November 3, 2026.

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/minnesota-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/mn-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Minnesota source URLs used:
- `https://candidates.sos.mn.gov/CandidateFilingResults.aspx?county=0&municipality=0&schooldistrict=0&hospitaldistrict=0&level=1&party=0&federal=True&judicial=True&executive=True&senate=True&representative=True&title=&office=0&candidateid=0` (Minnesota Secretary of State's official candidate-filing results portal — the candidate SET for all federal offices)
- `https://www.congress.gov/members?q=%7B%22congress%22%3A%22119%22%2C%22member-state%22%3A%22Minnesota%22%7D` (119th Congress Minnesota delegation — incumbency cross-check only, not a candidate-roster source)
- `https://www.sos.mn.gov/media/imefeepr/counties-elections-calendar.pdf` (official 2026 Minnesota Counties Calendar — source for the calendar dates in section (e) below)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for the next state.** All 8 MN House districts + the
US Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across all 8 House districts
and the Senate race.

**Minnesota is not Civix-vended.** Its Secretary of State runs a
state-hosted ASP.NET WebForms application at `candidates.sos.mn.gov` —
structurally one of the simplest sources seen in this track: every federal
filer (US Senate + all 8 US House districts) renders on ONE page load, no
per-district querying, no JS SPA, no virtualized scroll.

**Almost every party nomination is undetermined pending the August 11,
2026 primary** — this is NOT the OK/AL runoff-pending pattern (Minnesota
has no runoff mechanism; its primary is single-round, plurality-wins). It
mirrors the FL/CA pending-primary pattern instead: any party fielding more
than one filer for a seat has every filer recorded
`qualified_for_primary_ballot`; a party fielding exactly one filer for a
seat has no primary contest, so that filer is recorded
`qualified_for_general_ballot` directly (Minnesota does not hold a primary
for an unopposed candidate).

**Independent/minor-party filers recorded `qualified_for_general_ballot`,
not `declared_general_ballot_intent`** — unlike OK/TX's more conservative
posture, the candidates.sos.mn.gov portal's own published notice states
petition-filed candidates "are added after their petitions are reviewed,"
meaning appearance on the list already confirms completed petition review.
This covers Marisa Simonetti (Independent, US Senate), Rebecca Whiting
(Libertarian, US Senate — the sole Libertarian Senate filer, so no
Libertarian primary exists for that seat), and DeVelle L. Jackson
(Independent, MN-05).

**Two open seats found:** the US Senate seat (Sen. Tina Smith, Class 2,
announced Feb 2025 she will not seek reelection — absent from the filing
list) and MN-02 (sitting Rep. Angie Craig filed for the open Senate seat
instead of re-election to her own House seat — confirmed absent from the
MN-02 filing list, confirmed present in the Senate DFL field).

**No `runoff_pending` rows** — Minnesota has no runoff mechanism for
congressional primaries.

## How this was verified

1. Drove `candidates.sos.mn.gov`'s federal candidate-filing results page
   directly via a rendered browser session (`mcp__claude-in-chrome__*`) —
   the host sits behind Radware bot-management (a raw non-browser fetch
   redirects to `validate.perfdrive.com`), so a real browser session was
   required, but no further navigation was needed once loaded: every
   federal filer for both chambers rendered on the single page in one
   `get_page_text` call.
2. Transcribed all 17 US Senate filers and all 42 US House filers (8
   districts) directly from that page text into the fixture.
3. For each seat/party combination, counted the number of filers: exactly
   one filer → recorded `qualified_for_general_ballot` (automatic nominee,
   no primary contest exists); more than one filer → recorded
   `qualified_for_primary_ballot` for every filer in that field (nominee
   genuinely undetermined pending the August 11 primary).
4. Cross-checked incumbency against Congress.gov's official 119th Congress
   member list (`congress.gov/members`, filtered to Minnesota — a second
   independent official source, separate from the SoS filing portal).
   **Result: a clean case, no district-mismatch surprises.** All 8 sitting
   US Representatives and both sitting Senators (Klobuchar, Amy — Class 1,
   NOT up in 2026; Smith, Tina — Class 2, up in 2026, not seeking
   reelection) matched exactly. Every incumbent who filed appears in the
   SAME district Congress.gov shows — Minnesota did not redistrict for
   this cycle, unlike Florida's 2026 map or Texas's Al Green case.
5. Confirmed no write-in candidates and no Green Party filings appear
   anywhere in the portal's Federal Offices section — not omitted,
   verified absent from the full listing (unlike AZ/FL/IN, which each had
   write-ins).
6. Assembled `MN_HOUSE_ROSTER_2026` (42 rows) and `MN_SENATE_ROSTER_2026`
   (17 rows) and registered both in `scripts/ingest/official-roster.ts`'s
   `FIXTURES` map under a new `MN` key.
7. Added the `DFL` party code to `scripts/congressional-rosters/types.ts`'s
   party union and to `src/lib/server/races.ts`'s `PARTY_NAMES` map
   (`DFL: "Democratic-Farmer-Labor"`), mirroring the AIP/AKP/NPP/PF/LPF/FFP
   precedent for a state's own recognized party — Minnesota's Democratic
   affiliate is legally the Democratic-Farmer-Labor party, and the portal
   lists it verbatim, never "Democratic".
8. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   162 test files, 3,189 tests passed (one pre-existing, unrelated
   failure — `scripts/design/capture-shared.test.ts`'s Playwright
   `chromium.launch()` calls fail in this sandbox with a mach-port
   `Permission denied` error; confirmed identical on a clean `origin/main`
   checkout via `git stash`, unrelated to this change — no MN/
   official-roster code touches that file).
9. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL`
   retrieved via a fresh `vercel env pull --environment=preview` (linked
   via the main checkout's existing `.vercel/project.json`, copied into
   this worktree), read inline via a single `grep`/`cut` command
   substitution — never `source`d, never echoed — confirmed non-empty
   (177 characters) before use.
10. **Staging import: done, twice, confirmed by direct row-count query
    both times — no ambient/production `DATABASE_URL` ever used.**
    - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
      --state MN` → `upserted=59`.
    - Queried `SELECT count(*) FROM official_roster_candidates WHERE
      state='MN'` directly against staging → `59`.
    - Re-ran the same import command a second time → `upserted=59` again,
      then re-queried the row count → still `59` (idempotent upsert
      confirmed, not a duplicate insert).
11. **End-to-end check against staging, flag on:** called
    `lookupChallengers` directly (the real production code path, not a
    mock) for all 8 MN House districts and the Senate race, against
    staging with `OFFICIAL_ROSTER_ENABLED=1`, and compared the app's
    literal output candidate-by-candidate against the fixture. **Result: 0
    mismatches across all 8 districts and the Senate race** — every
    challenger name matched exactly, every incumbent (Finstad, Morrison,
    McCollum, Omar, Emmer, Fischbach, Stauber) was correctly excluded from
    their own district's challenger list, and MN-02 and the Senate race
    (both open seats, no incumbent row) correctly excluded no one. The
    staging `DATABASE_URL` and `OFFICIAL_ROSTER_ENABLED` flag were both set
    inline for these verification commands only, never written to a
    persisted env file, and both scratch verification scripts
    (`scripts/tmp-mn-verify-count.ts`, `scripts/tmp-mn-e2e-verify.ts`) were
    deleted immediately after use (not committed).
12. Added 12 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — MN narrowing`, `isIncumbentSeekingReelection —
    MN`, `lookupChallengers — MN wiring`), mirroring the existing OK/FL
    two-chamber coverage pattern.

## Standing calendar dates (per the plan doc's requirement (e))

Pulled directly from the official 2026 Minnesota Counties Calendar
(`https://www.sos.mn.gov/media/imefeepr/counties-elections-calendar.pdf`,
updated 2/13/2026), plus the SoS's own candidate-filing period notice:

- **Tuesday, May 19 – Tuesday, June 2, 2026** — candidate-filing period for
  federal, state, and county offices (already closed as of this build).
- **Thursday, June 4, 2026** — last day for candidates to withdraw by
  filing an Affidavit of Withdrawal, within 2 days after filing closes
  (M.S. 204B.12, subd. 1). **Already passed** as of this build — the
  filed-candidate SET is final and closed; no further pre-primary
  withdrawal is possible.
- **Tuesday, August 11, 2026** — Minnesota's 2026 state primary. This is
  the date that resolves nearly every `qualified_for_primary_ballot` row in
  this fixture to a determined nominee.
- **Tuesday, August 18, 2026** — the State Canvassing Board meets to
  canvass the certified, signed copies of county canvassing board reports
  and immediately certifies nominee names to counties (M.S. 204C.32, subd.
  2) — 7 days after the primary. This is the date the primary-stage
  roster becomes final/official for the general ballot.
- **Minnesota's post-primary/pre-general "vacancy in nomination"
  mechanism** (M.S. 204B.13, covering a nominee's death or withdrawal
  after winning the primary) is event-triggered, not governed by a fixed
  calendar date — checked, but no separate universal date exists to
  record beyond the June 4 pre-primary deadline above.
- **Thursday, November 19, 2026** — the State Canvassing Board meets to
  canvass the certified county canvassing board reports for the November
  3 general election (M.S. 204C.33, subd. 3) — 16 days after the general.

**Dated re-check card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): "[P2] Re-check official roster: Minnesota (MN) —
after primary certification", `NOT BEFORE: 2026-08-19` (the day after the
State Canvassing Board's Aug 18 certification meeting, allowing a day for
results to post) — see the backlog for the full card.

## Files changed

- `scripts/congressional-rosters/mn-official-roster-2026.ts` (new)
- `scripts/congressional-rosters/types.ts` (added `DFL` party code)
- `src/lib/server/races.ts` (added `DFL: "Democratic-Farmer-Labor"` to
  `PARTY_NAMES`)
- `scripts/ingest/official-roster.ts` (MN import + FIXTURES entry)
- `src/lib/server/officialRoster.test.ts` (MN test coverage)
- `docs/operations/voter-choice-backlog.md` (STATUS flip, done as a
  separate commit before this build per the claim-safely protocol; new
  dated re-check card added)
- This doc (new)

No database migration — `ballot_status` and `party` remain plain `text`
columns with no CHECK constraint (unchanged since migration 0016). No
production mutation. `OFFICIAL_ROSTER_ENABLED` was never set anywhere
persistent — only inline, for the staging verification commands in steps
10-11 above.

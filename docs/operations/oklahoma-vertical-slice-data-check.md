# Oklahoma vertical slice — built and verified live (official-source pipeline)

Card: `d9b1ef86-d6e8-4d7a-9a12-bcbfefc6b9ee` ("[P0] Import + verify official
roster: Oklahoma (OK)"), parent epic `c5a813bb` (nationwide official-source
congressional roster). Depends on `8530a468` (Texas vertical slice).

Date: 2026-07-15. Oklahoma's 2026 primary (2026-06-16) is already past;
**the runoff primary (2026-08-25) has NOT happened yet as of this build** —
41 days in the future. The general election is 2026-11-03.

**Why Oklahoma, specifically:** per the card's own ORIGIN note, this was
Muxin's direct pick to continue the manual state-by-state track — simply the
next state in sequence, not chosen for a specific technical gap the way
Texas was chosen for its Senate contest. Oklahoma turned out to matter for a
different reason: its official source is **not** Civix-vended (the pattern
Texas exercises), so this build is the first proof that the manual track
generalizes beyond that one vendor's software.

## Bottom line

**GO on the approach for a third state.** All 5 OK House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is
on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across all 6 contests,
including the two contests whose nomination is still undetermined.

**Oklahoma is not Civix-vended** (`oklahoma.gov` / `okelections.gov`, not
`*.civixapps.com`) — a materially easier source than Texas's JS portal: a
real text-layer PDF for the filing list, and a plain server-rendered results
page (no SPA, no virtualized scroll, no browser-automation workaround
needed for the results pull itself — see "How this was verified" below).

**A new `ballotStatus` value (`runoff_pending`) was added and is now proven
live**, not just designed: Oklahoma's statutory majority rule (26 O.S. §
1-103 — a candidate needs an outright 50%+1 majority of their party's
primary vote, or the top two advance to an August runoff) left **two
nominations undetermined** as of this build — the US Senate Democratic
nomination and the OK-1 Republican nomination. Both finalists for each are
recorded and render, correctly, without either being promoted to a guessed
winner. No database migration was needed for this — `ballot_status` is a
plain `text` column with no CHECK constraint.

**Update (2026-07-15, after Muxin's review): a distinct UI treatment now
ships with this card.** Muxin's read on the initial "renders like any other
challenger" behavior: a runoff-pending nomination is fundamentally different
from a settled one — the nominee for that seat isn't decided, and the reader
still has real agency over the outcome (Oklahoma's low-turnout runoff means
a single vote goes further than in the general). `SeatChallenger` gained an
`isRunoffPending` boolean (races.ts / officialRoster.ts), and `RepCard.tsx`
now renders a "Runoff pending" tag plus a CTA note — *"This party's nominee
isn't decided yet — a primary runoff will settle it. Your vote in that
runoff can still decide who appears on your November ballot."* — for any
challenger carrying that flag, in both EN and ES. Verified three ways: (1)
two new `RepCard.test.tsx` cases assert the tag/note render only for
`isRunoffPending: true`; (2) a direct `pg`-confirmed staging import; (3) the
live `/api/delegation` endpoint, called directly against a local dev server
pointed at staging with the flag on, for a real Tulsa (OK-1) address —
returned `MARK TEDFORD`/`JACKSON LAHMEYER` both with `"isRunoffPending":true`
and `JOHN CROISANT` with `"isRunoffPending":false`, exactly as expected. (The
chat/issue-interpretation step of the live UI 500'd on an unrelated missing
API key in that ad hoc dev run — unconnected to this change, not chased
further.) This was intentionally scoped to Oklahoma's two pending races, not
built as a generic per-state runoff-date system — see "A bigger idea" below
for the standing, cross-year capability Muxin wants planned separately.

**A real, non-obvious incumbency finding surfaced during the official
cross-check:** the sitting US Senator for the seat on this year's ballot is
**Alan Armstrong**, appointed 2026-03-24 to fill Markwayne Mullin's
resignation — not Mullin. Armstrong did not file for election to keep the
seat, so the Senate race is an open seat, and the winning Republican primary
candidate (Kevin Hern) is separately the *sitting OK-1 Representative*, who
also did not file for re-election to his House seat. See "A cross-check
finding" below.

**NO-GO on fan-out to further states** until the manual track has covered a
few more, and **NO-GO on flipping the flag for real users** without Muxin's
sign-off — same standing gate as AZ and TX.

## How this was verified — a static PDF plus a results-derivation step, no
Civix and no browser-automation workaround needed for the pull itself

Oklahoma's official candidate/election source runs neither Civix nor any
other vendor SPA the nationwide plan doc had already flagged. It is a hybrid
of the AZ and TX patterns, but simpler than either on its own:

1. **Candidate SET (who filed):** the State Election Board's official "2026
   Candidates for Elective Office" list book
   (`https://oklahoma.gov/content/dam/ok/en/elections/candidate-filing-archives/2026-candidate-filing-archives/2026-candidate-list-book.pdf`)
   — a real text-layer PDF (confirmed via `pypdf` extraction; not a scanned
   image, unlike a plain WebFetch attempt which only returns raw binary for
   any PDF). Every candidate who filed April 1-3, 2026, by office and party.
2. **General-ballot NOMINEES had to be derived, not read directly**, because
   Oklahoma's June 16, 2026 primary already happened by the time this was
   built: the official results portal
   (`https://results.okelections.gov/OKER/?elecDate=20260616`) was queried
   for every contested congressional primary, and the statutory majority
   rule was applied per race. **This portal 403s on a plain WebFetch call**
   (needs a real browser session, same as Civix), but unlike Civix, a
   single `get_page_text` call after navigating returned **every race on
   the ballot in one page load** — no virtualized scroll, no per-district
   filter form, no scripted Playwright pass needed. This is the single
   biggest operational difference from the TX build, and is recorded here
   (rather than in the Civix playbook, since this source has nothing to do
   with that vendor) for any future non-Civix state.
3. **Incumbency cross-check**, never guessed from the filing PDF or the
   results portal: `https://www.house.gov/representatives` ("By State and
   District" → Oklahoma) for the House delegation, and
   `https://www.senate.gov/states/OK/intro.htm` +
   `https://bioguide.congress.gov/search/bio/A000383` for the Senate seat.
   **This app's own FEC-derived `candidates` table was deliberately never
   used for this cross-check** — same rule as AZ and TX.

**Independent candidates:** Oklahoma folds the independent
nominating-petition requirement (26 O.S., 2% of registered voters in the
relevant district/state, submitted in lieu of a filing fee) into the *same*
April 1-3 filing window as party candidates — unlike Texas's separate,
later-stage "Declaration of Intent" PDF. Whether the State Election Board
had fully verified each independent's petition signature count as of this
list's publication couldn't be confirmed from the official sources read
this session, so — consistent with AZ's and TX's conservative posture —
independents are recorded as `declared_general_ballot_intent`, not
`qualified_for_general_ballot`.

**Not used as a source, deliberately:** Ballotpedia, and the card's own
ORIGIN note (which described the seat as "Markwayne Mullin's seat," a
plausible but, per the official record, out-of-date description — see "A
cross-check finding" below).

**FAQ — "why isn't [X] in the roster? I see them in the filing PDF":** the
filing PDF lists every candidate who *filed*, not the general-ballot
nominees — a party can have several April filers and only one survives to
November. This tripped Muxin's own review: the April PDF lists five
Republican Senate filers (Hern, Buckner, Ragain, Hankins, England), and only
Hern (69.76% of the primary vote, an outright majority) appears in the
fixture. Buckner/Ragain/Hankins/England aren't a data gap — they lost the
June 16 primary, confirmed from the results portal's full vote breakdown,
so Oklahoma's own election law says they're not on the November ballot. The
April PDF's date is expected and correct for its actual purpose (a snapshot
of who filed, compiled at 5pm April 3 — "used as the official proof for
printing state ballots" per its own header, i.e. the primary ballot, not the
general): it was never meant to reflect the June primary's outcome, which is
exactly why this build separately pulled the results portal to derive
nominees rather than reading the filing PDF as if it were a final list.

**Tooling note — a CSV/XML export exists on the results portal, worth
revisiting.** Muxin flagged `results.okelections.gov`'s "Export" menu, which
offers race/county/precinct-level CSV and XML downloads — a structurally
better source than parsing rendered HTML text. Network inspection found the
real endpoint (`https://results.okelections.gov/OKERS/enrapi/GetExtract/CSV/20260616`),
but a direct `fetch()` to it 401s ("Authorization has been denied for this
request") even after replicating the click that succeeded in the browser
(confirmed via `read_network_requests` that the real UI click got a 200 on
the identical URL) — the page's own JS evidently attaches some
short-lived/one-time auth token or header this session didn't reverse-engineer
via `fetch`/XHR hooking. The `get_page_text` HTML pull used instead is a
complete, single-shot read of every race (not partial or virtualized), so
this build's numbers aren't in doubt, but a future session with time to
inspect the real request via DevTools (not prototype-patched `fetch`) could
likely get the CSV working and make any OK-like non-Civix state easier to
parse. Flagged as an open tooling lead, same posture as TX's own
unexplored-shortcut note about its `findQualifiedCandidates` API.

## A cross-check finding this build made (not a bug — a real, non-obvious
incumbency fact caught by the independent-source rule)

The card creating this build described Oklahoma's 2026 Senate race using
Markwayne Mullin's name, with no further detail. The official
`senate.gov`/Bioguide cross-check (never skipped, per the epic's SAFETY
rule against guessing incumbency) surfaced that this description is no
longer accurate: **Mullin resigned**, and **Alan Armstrong was appointed
2026-03-24** to fill the vacancy — Armstrong, not Mullin, is the seat's
current occupant. Armstrong does not appear anywhere in the Senate
candidate filings (Republican, Democrat, Libertarian, or Independent) — he
is not seeking election to keep the seat. This makes the 2026 Senate race an
**open seat**, not an incumbent-defends race, and it means the winning
Republican Senate primary candidate, **Kevin Hern, is actually the sitting
OK-1 Representative** — he filed for Senate instead of re-election to his
own House seat, which is also why OK-1 produced an 11-candidate open-seat
Republican primary with no incumbent in the field.

Had this build relied on the card's own framing instead of the official
cross-check, `isIncumbent` would have been silently wrong for both the
Senate race (no candidate named "Mullin" exists to match against) and OK-1
(no consequence there, since Hern's absence from the OK-1 filing list is
what correctly signals the open seat either way) — but the Senate case
specifically demonstrates why the cross-check rule exists: a natural-seeming
assumption from second-hand framing would not have caught this.

## Contest inventory

Oklahoma has **5 US House districts and 1 US Senate contest in 2026**
(the Class II seat, currently held by appointee Alan Armstrong). All 5 House
districts + the Senate race are covered by the general election.

## What was built (delta from the AZ/TX pattern)

Most of the AZ/TX vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, and the importer's
array-shaped `FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — one new `OfficialBallotStatus`
  value, `"runoff_pending"`: a seat whose party nominee is undecided pending
  a still-future runoff. Both finalists get a row with this status; neither
  is ever promoted to `qualified_for_general_ballot` before the runoff is
  certified. No DB migration needed — `ballot_status` is a plain `text`
  column with no CHECK constraint (confirmed by inspecting
  `db/schema.ts:155` and staging's live index definition before writing any
  migration).
- `scripts/congressional-rosters/ok-official-roster-2026.ts` (new) — 15
  House rows (all 5 districts: major-party nominees, 2 runoff-pending
  finalists, declared independents) + 6 Senate rows (Hern-R, 2
  runoff-pending Democratic finalists, White-Libertarian, 2 declared
  independents). Full sourcing, methodology, and known limitations are in
  the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `OK` in `FIXTURES` with
  separate house/senate entries, exactly like TX's two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 11 new tests: `getOfficialRoster`
  narrowing across all 5 OK districts + the Senate contest, explicit
  `runoff_pending` coverage for both the OK-1 House race and the Senate
  race (both finalists returned with the exact status, the determined
  nominees are not), `isIncumbentSeekingReelection` for the 4
  incumbent-defended districts + the OK-1 open seat + the open Senate seat,
  `lookupChallengers` wiring (both chambers covered, FEC query skipped — 2
  calls not 3; the runoff-pending OK-1 race renders all three candidates as
  challengers, none excluded as incumbent, each carrying the correct
  `isRunoffPending` value end to end), and `officialRosterRowToSeatChallenger`
  mapping `ballotStatus: "runoff_pending"` to `isRunoffPending: true`.
- `src/lib/server/races.ts` — `SeatChallenger` gained an optional
  `isRunoffPending` boolean, undefined/false for the FEC path.
- `src/lib/server/officialRoster.ts` — `officialRosterRowToSeatChallenger`
  sets `isRunoffPending: row.ballotStatus === "runoff_pending"`.
- `src/prototype/redesign/RepCard.tsx` + `RepCard.test.tsx` — a "Runoff
  pending" tag and CTA note render on any challenger row carrying
  `isRunoffPending`; 2 new tests assert the tag/note render only when the
  flag is set.
- `src/prototype/VoterChoiceApp.tsx` — 2 new i18n keys (EN + ES):
  `runoffPendingTag`, `runoffPendingNote`.
- `public/redesign2.css` — `.runoff-pending-tag` (gold accent — an active
  CTA, deliberately not the muted grey `.seat-not-up` treatment, which
  reads as "this doesn't matter") and `.runoff-pending-note` styles.

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.
  162 test files, 3072 tests passing, 5 pre-existing `todo` (no failures),
  3077 total.
- Confirmed via a direct `pg` connection that staging already has migration
  `0016`'s `NULLS NOT DISTINCT` fix applied to
  `official_roster_candidates_seat_name_uidx` (from the TX build) — no new
  migration was needed for this build.
- OK's 21 rows (15 House + 6 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  row-count query (21 both times — 15 house / 6 senate — not just the
  importer's own self-reported count, per the goal condition's explicit
  instruction not to trust that alone).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 5 OK House
  districts and the Senate race, diffed against the fixture. **0 mismatches
  across all 6 contests.** Full literal output (candidate name, party, and
  provenance as the app would render it):

  ```
  OK-01 — open seat (Hern filed for Senate instead); Republican nomination
  runoff-pending
    - MARK TEDFORD (Republican) [runoff-pending finalist]
    - JACKSON LAHMEYER (Republican) [runoff-pending finalist]
    - JOHN CROISANT (Democrat) [uncontested primary nominee]

  OK-02 — incumbent JOSH BRECHEEN, seekingReelection2026=true
    - BRANDON WADE (Democrat)
    - RONNIE HOPKINS (Independent)

  OK-03 — incumbent FRANK D. LUCAS, seekingReelection2026=true
    - SUZIE BYRD (Democrat)

  OK-04 — incumbent TOM COLE, seekingReelection2026=true
    - MITCHELL JACOB (Democrat)
    - ROCCO BONACCI (Independent)

  OK-05 — incumbent STEPHANIE BICE, seekingReelection2026=true
    - JENA NELSON (Democrat)
    - ROBERT P. HENRI (Independent)
    - AUSTIN NIEVES (Independent)

  U.S. SENATE — open seat (sitting appointee Alan Armstrong did not file for
  election); Democratic nomination runoff-pending
    - KEVIN HERN (Republican) — won the Republican primary outright (69.76%)
    - N'KIYLA JASMINE THOMAS (Democrat) [runoff-pending finalist]
    - JIM PRIEST (Democrat) [runoff-pending finalist]
    - SEVIER WHITE (Libertarian) — sole filer, automatic nominee
    - CURTIS STINNETT (Independent)
    - RON MEINHARDT (Independent)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. The two runoff-pending contests render **both**
  finalists as challengers, now with the "Runoff pending" tag + CTA note
  described above (`isRunoffPending: true`), distinguishing them from a
  determined nominee — confirmed live via a direct `/api/delegation` call
  against staging for a Tulsa (OK-1) address, see the update note above.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Two nominations are undetermined pending the August 25, 2026 runoff**
  (US Senate — Democrat; OK-1 — Republican). Recorded as `runoff_pending`,
  not guessed from primary-round standings — this fixture needs a follow-up
  update once the runoff is certified.
- **Independent filers' petition-verification status is unconfirmed** from
  the official sources read this session (see "How this was verified"
  above) — recorded as `declared_general_ballot_intent`, an open item in
  the same posture as AZ's and TX's equivalent gaps.
- **No Libertarian or Green Party candidate filed for any US House seat**;
  one Libertarian (Sevier White) filed for US Senate, unopposed in that
  party's primary. No Green Party filings were found anywhere in the
  official congressional filing list — verified absent, not omitted.
- **The results-portal CSV/XML export isn't wired up** (401s on a plain
  `fetch`, unresolved this session) — see the tooling note above. The HTML
  pull used instead is complete and not in doubt, but the CSV would be more
  robust for a future build.
- **The base delegation resolver (GovTrack-derived `candidates` table)
  doesn't know Armstrong replaced Mullin either** — a live check via
  `/api/delegation` for a Tulsa address returned `candidate: null` for both
  OK Senate seat slots, so this app's own sitting-member data is stale on
  the exact same fact the official-roster cross-check caught. This is a
  separate ingestion pipeline (GovTrack, not this card's official-roster
  feature) and out of scope here, but corroborates the Armstrong finding
  and is worth a look whenever that pipeline is next touched.
- Names are recorded as they appear in the official filing list / results
  portal; not independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/oklahoma-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ok-official-roster-2026.ts`.
- **Official Oklahoma source URLs used:**
  - `https://oklahoma.gov/content/dam/ok/en/elections/candidate-filing-archives/2026-candidate-filing-archives/2026-candidate-list-book.pdf`
    (State Election Board's official 2026 candidate filing list)
  - `https://results.okelections.gov/OKER/?elecDate=20260616` (State
    Election Board's official June 16, 2026 primary election results —
    certified vote totals used to derive nominees / identify pending
    runoffs)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not an Oklahoma source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/states/OK/intro.htm` and
    `https://bioguide.congress.gov/search/bio/A000383` (Senate incumbency
    cross-check only — the source of the Armstrong/Mullin finding above)

## A bigger idea, deliberately not built here (Muxin, 2026-07-15)

Reviewing this build, Muxin's read on the runoff-pending CTA above was that
it shouldn't be a one-off for Oklahoma's two races: **every state's
in-progress elections (primary pending, runoff pending, etc.) should be
tracked this way, every year going forward** — not just during this initial
50-state buildout. The product case: (1) it's genuinely valuable voting
information — a reader in a low-turnout runoff can have outsized influence
and should be told so; (2) it gives the app a concrete, honest CTA instead
of a dead end; (3) it lets the app later assess "how did the person you
voted for in the runoff actually vote" as a follow-through loop.

This is a standing, cross-year capability, not a scoped fix — it needs its
own design pass (a per-state, per-year election-calendar input beyond the
2026-only snapshots in `src/data/states/*.json`; a roster-schema concept for
"which contest, which date resolves it" beyond a single `ballotStatus`
enum value; a recurring re-check as dates arrive). Deliberately **not**
designed or built as part of this OK card — captured as a new epic-level
backlog item for `c5a813bb` instead, per Muxin's request during review, so
it gets a real scoping pass rather than being bolted onto a single state's
build. Also written up in the plan doc's own revision log
(`docs/operations/nationwide-congressional-roster-plan.md`).

**Paste-ready backlog card draft** (Muxin's to place — per this repo's
practice, the backlog stays hers to edit during interactive review; this is
handed over, not written to `voter-choice-backlog.md` directly):

```
**[P1] EPIC: Track in-progress elections across every state, every year**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: 2026-07-15, Muxin's direct request while reviewing the Oklahoma
  vertical slice (card d9b1ef86) — generalizes OK's scoped runoff-pending
  status/CTA (ballotStatus: "runoff_pending", RepCard's "Runoff pending" tag)
  into a standing capability, not a one-off for OK's two 2026 races.
- OUTCOME: Any state's in-progress election (primary pending, runoff
  pending, or an equivalent not-yet-decided stage) is tracked and surfaced
  to readers with an honest status + a concrete voting CTA, for every future
  election cycle, not just 2026 — reusing (not duplicating) the OK pattern.
- IN SCOPE: (1) design a per-state, per-year election-calendar input (the
  current src/data/states/*.json snapshots are 2026-only); (2) design a
  roster-schema concept for "which contest, which date resolves it,"
  generalizing beyond a single ballotStatus enum value scoped to one cycle;
  (3) decide the re-check mechanism (scheduled job vs. build/import-time
  refresh) as resolution dates arrive; (4) decide whether OK's static
  tag+note UI generalizes as-is or needs the actual resolution date once the
  schema supports it.
- OUT OF SCOPE: implementation before the design pass below is reviewed;
  any specific state's fixture data.
- SAFETY: same posture as the rest of this epic — never guess an
  undetermined outcome; explicit "pending" states, not silent omission.
- DECISION: needs a design/plan pass (not a build) before any implementation
  — recommend running this through plan mode or the `planner` skill given
  its cross-cutting schema implications, rather than starting directly.
- STATUS: Backlog
- DEPENDS ON: none (can be scoped independently of the remaining manual
  per-state builds)
```

## GO/NO-GO verdict

**GO on the approach for a third state — the manual track generalizes
beyond Civix, and the new `runoff_pending` status (with its own CTA
treatment) is proven live. NO-GO on proceeding to more states or real users
without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for AZ, TX, and/or OK)** — human sign-off
   required, same as AZ and TX. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A follow-up update to this fixture is needed after August 25, 2026**,
   once the OK Senate Democratic and OK-1 Republican runoffs are certified.
3. **The standing "track pending elections everywhere, every year" idea**
   above needs its own scoping pass before any implementation — captured as
   a backlog item, not started here.
4. **Next states** — per the plan's 2026-07-15 revision, continue the
   manual track. This build's operational-navigation section above should
   materially speed up any future state whose official source is neither
   a static-PDF-only pattern (AZ) nor Civix-vended (TX).

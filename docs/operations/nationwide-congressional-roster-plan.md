# Nationwide official-source congressional candidate roster plan

Status: planning complete; implementation is explicitly not authorized.

Planning date: 2026-07-13.

Backlog epic: `c5a813bb-9223-4dc1-95aa-65637eb6940b`.

This document is the persistent source of truth for the P0 nationwide
congressional-roster project. It contains the original mandate, every decision
made during the follow-up planning sessions, the complete execution catalog,
the final robustness audit, and the acceptance criteria. The backlog card must
point here rather than relying on terminal or chat history.

No implementation, provisioning, migration, ingest, queue quarantine, or
public rollout is authorized by this document. When Muxin separately
authorizes execution, the implementation cards described below must be created
and groomed in the stated waves.

## Revision — state-by-state manual-first sequencing (2026-07-15)

The Arizona vertical slice (card `637c2583`, report at
`docs/operations/arizona-vertical-slice-data-check.md`) tested whether this
plan's approach actually works, then went further and **built it live**: a
flag-gated (`OFFICIAL_ROSTER_ENABLED`, default off), fully reversible
integration that makes AZ's hand-transcribed official roster govern
`lookupChallengers` and incumbent-on-ballot status, with zero behavior change
for any other state. This is the concrete answer to the plan's most
under-specified area — "Application interface and behavior" and A24/A25 were
one line of intent; AZ is now a working reference implementation of that line.

Two sequencing decisions follow from what AZ proved:

1. **State-by-state manual official-source import (Acquisition mode 5, "human-
   downloaded official document") is the preferred near-term path, not a
   fallback.** Muxin's explicit direction: prove the approach on a handful of
   states built by hand before committing to the automated 50-state adapter
   fanout (Wave 5, N21) — automation is the expensive bet, manual state-by-
   state is safer and cheaper to validate first. Each new state should follow
   the AZ pattern: hand-transcribe the official roster into a fixture file
   (`scripts/congressional-rosters/<state>-official-roster-<year>.ts`), import
   it into the lightweight `official_roster_candidates` table (additive,
   modeled on `can_candidates` — see `db/schema.ts`), verify with an automated
   test plus a local render check, then hold for Muxin's sign-off before
   flipping the per-build flag anywhere near real users. This does not require
   waiting on Wave 3's national source inventory (I05-I12) or Wave 4's full
   canonical schema (M13) — those remain valuable for the eventual automated
   path but are no longer a prerequisite to shipping a correct, manually-built
   state.
2. **Wave 5's automated parser-family fanout (N21) is deferred and gated on
   proof, not scheduled next.** Recommend gating N21 on at least 3-5 states
   shipped through the manual track above with clean verification — only then
   is there enough evidence about source-format diversity (PDF vs. structured
   feed vs. portal) and integration-pattern stability to justify investing in
   configuration-first automation. Until that gate, "next state" means another
   manual build, not inventory/parser research.

This revision does not weaken any completeness, freshness, promotion, or
release rule below — it only resequences which track is built first and lets
manually-built states ship (behind their own flag, human-reviewed) without
waiting on the full automated pipeline. The canonical M13 schema remains the
long-term target if/when automation is warranted; the AZ build's lighter
schema is an intentionally interim, additive, non-blocking alternative for the
manual track.

**Standing verification-deliverable requirement (Muxin, 2026-07-15, strengthened
2026-07-15 after the TX build) — applies to every state built through this
manual track, not just one:** the final report/summary for each state MUST
state, in full, not abbreviated or repo-relative:

(a) the **full absolute file path** to the doc holding the app's
output/comparison for that state (one per state, following the pattern of
`docs/operations/arizona-vertical-slice-data-check.md`);
(b) the **full absolute file path** to the fixture file holding the
transcribed data
(`scripts/congressional-rosters/<state>-official-roster-<year>.ts`);
(c) the **exact, full, untruncated official state-authority source URL(s)**
used;
(d) a written **operational-navigation section** — even a short one for an
easy state — describing how the official source was actually navigated:
what the site/portal structure looked like, any filter sequence or
non-obvious steps needed, which signals on the site turned out reliable vs.
unreliable, and any tooling used to pull the data. **There is no universal
approach across states** (Muxin, 2026-07-15) — a static-PDF state (AZ) and a
JS-portal state (TX) needed completely different mechanics, and this section
is what lets a future session skip re-discovering them from scratch. If the
state's official source runs Civix-vended software specifically, also check
(and add to) the "Civix portal operational playbook" subsection immediately
below rather than duplicating that write-up per-state;
(e) **every still-governing calendar date** for that state's roster, pulled
from the state's own official election calendar (not just checked for —
recorded, with the source date and what resolves on it) — added 2026-07-15
after the Colorado build surfaced the gap: the existing "check for any
still-undetermined nomination" requirement below (from the Oklahoma build)
only covers *pending primaries/runoffs*, but a roster can still be
incomplete for other calendar-bound reasons even when every major-party
nomination is already determined — an unaffiliated/minor-party
petition-signature sufficiency deadline, a nomination-vacancy-fill deadline,
or (the one date every state has) the state's own ballot-content
certification deadline, after which the roster for that cycle is fully
locked. List every such date found, in the same absolute-and-explicit style
as (a)-(c) (e.g. "July 30, 2026 — deadline for the county DEO to issue a
sufficiency/insufficiency notice on the 5 pending UAF House petitions;
September 4, 2026 — ballot-content certification, after which no further
change is possible this cycle"), so a human or a future session knows
exactly when a re-check is warranted without re-deriving the state's
election calendar from scratch. If the state's official election calendar
document/page was already fetched for other reasons during the build, no
extra source-hunting is required — just extract the relevant dates from it.
**Recording the dates here is not the finish line** — the build must also
open the actual dated follow-up card so a future session (or conductor) acts
on them automatically; see the backlog epic's "STANDING REQUIREMENT — NOT
BEFORE DATE-GATE CONVENTION" bullet (`c5a813bb`, 2026-07-15) for the exact
card format and the picking-rule exclusion that keeps it from being grabbed
before its date.

Plain chat/text output does not satisfy (a)-(c) or (e) — Muxin cannot click
or navigate a truncated path, a description of a URL, or a vague "sometime
before the election" — the literal string/date is required every time. So
Muxin can independently verify against the official source herself, every
time, the same way she did for AZ. Any per-state backlog card created for
this track should carry this requirement explicitly (see the Texas card as
the template); it is not optional polish.

### Civix portal operational playbook (Muxin, 2026-07-15)

AZ's official source was two static PDFs — straightforward to fetch and read.
Texas's build (card `8530a468`, report at
`docs/operations/texas-vertical-slice-data-check.md`) hit a materially harder
case: a JS single-page-app candidate portal (`goelect.txelections.civixapps.com`,
vended by Civix — `f03-source-inventory.ts` had already flagged this as
`sourceFormat: "portal"`, `parserFamily: "rendered_portal"`, so the *category*
of problem was pre-logged, but not the fine-grained navigation mechanics
needed to actually work through it). **Civix serves multiple states' election
systems**, so this playbook is written for reuse the next time a state's
official source turns out to run the same software, not just for Texas.

**How to recognize a Civix-vended portal:** URL pattern
`<subdomain>.<state>elections.civixapps.com`, page titles like "IvisCbpUi" or
"::Civix Election Night Results::", footer text "© 20XX Civix. All rights
reserved. POWERED BY gocivix.com".

**Mechanics that cost the most time, in the order they bite:**

1. **The portal 403s on any non-browser fetch** (`WebFetch`, curl, a Wayback
   Machine snapshot of the rendered page) — it's a JS app that needs an
   actual rendered browser session, not an access-control wall. Use
   `mcp__claude-in-chrome__*` (navigate, click, read_page/find) to drive it
   like a human would; there is no shortcut around this without browser
   automation.
2. **The "Candidate Information" filter form's `Office Name` field is a
   required single-select** — leaving it blank and submitting returns "No
   records found" every time, even when Year/Election/Office Type are
   correctly set. There is no "all districts" query; each district (or
   statewide office) must be queried individually, or scripted.
3. **Neither of the portal's own incumbency signals are reliable.** The
   Election Night Results page's `(I)` superscript and Candidate
   Information's explicit `INCUMBENT: YES/NO` field both failed to flag a
   real sitting member (Al Green, TX-9) because he happened to run in a
   *different* district that cycle — the field just wasn't populated
   correctly for that case, not a parsing bug on our end. **Cross-check
   incumbency against the U.S. House's own official member directory**
   (`https://www.house.gov/representatives`, "By State and District" tab,
   long single page with per-state `<caption id="state-XXX">` anchors —
   lazy-loads on scroll, so anchor-only navigation doesn't populate the DOM
   until you actually scroll near it) matched by district number + surname.
   **Never fall back to this app's own FEC-derived `candidates` table for
   this cross-check** — that data source is exactly the kind of
   stale/inaccurate roster this whole feature exists to route around.
4. **A general-election candidate bucket may not exist yet.** As of Texas's
   build (mid-July, general election in November), the portal's `Election`
   dropdown had no "GENERAL ELECTION" entry at all — only
   primary/runoff/special election filing records. The general-ballot
   nominee per seat had to be *derived*: query the Election Night Results
   sub-app (a different URL path, `ivis-enr-ui/races` vs. the Candidate
   Information app's `ivis-cbp-ui`) for certified primary/runoff vote
   totals, and take the winner. Check whether the state's primary/runoff
   calendar has already passed (`src/data/states/<state>.json`) before
   assuming this derivation step is even necessary — a state with an
   upcoming primary (like AZ's was) may not need it.
5. **The Election Night Results race list is a virtualized scroll** (Angular
   CDK `cdk-virtual-scroll-viewport`) — only ~3-4 races render into the DOM
   at once regardless of how the page is scrolled, so page-reading tools
   (`get_page_text`, `read_page`) only ever see a few races per call.
   Manually scrolling and re-reading to cover 30+ races is slow and easy to
   get wrong (silently miss a race). **Once the navigation mechanics are
   understood, switch to a scripted Playwright pass** (`chromium.launch()`,
   direct DOM queries against `mat-card` / `tr` elements — NOT the
   accessibility-tree tools — with an incremental `scrollBy` + collect loop,
   deduping by race title) rather than continuing by hand. Two structural
   traps when writing that script: (a) `document.querySelectorAll("mat-card")`
   returns both individual race cards AND outer wrapper cards that contain
   several races each — filter to leaf cards only (`card.querySelectorAll("mat-card").length === 0`)
   or you'll get one race's title attached to every other race's rows too;
   (b) table cell text has no inherent whitespace between adjacent
   cells' `textContent` — parse from `<tr>`/cell DOM structure directly,
   never regex against the concatenated card text.
6. **A public JSON API exists underneath the SPA**
   (`POST /api-ivis-cbp/api/cbp/findQualifiedCandidates` was observed via
   `read_network_requests`) but its request-body schema wasn't reverse-
   engineered this session (blind guesses 500'd, and patching `fetch`/`XHR`
   from outside the Angular zone.js context didn't reliably intercept the
   real call). If a future session has time to invest, capturing a real
   request body via actual DevTools (not prototype-patching) could let a
   script call this endpoint directly instead of driving the UI at all —
   flagged here as an unexplored shortcut, not a dead end.

**Independent/write-in candidates:** look for an official
"Declarations of Intent" or similar SoS-published PDF/list *separate* from
the Civix portal — Texas's independents (all offices, not just federal) were
in one PDF at a stable-looking SoS URL
(`sos.texas.gov/elections/forms/<year>-independent-declaration-tracking.pdf`),
not inside Civix at all. This is a *declaration*-stage document (petition-
signature verification pending) — record it as such, don't over-claim
`qualified_for_general_ballot` for filers sourced from it.

## Revision — Oklahoma build: non-Civix pattern, runoff-pending status, and a
new standing idea (2026-07-15)

Oklahoma's build (card `d9b1ef86`, report at
`docs/operations/oklahoma-vertical-slice-data-check.md`) is the third state
through the manual track, and the first whose official source runs neither a
static-PDF-only pattern (AZ) nor Civix (TX) — a real, materially different
non-Civix results portal, whose operational mechanics are recorded in OK's
own report doc rather than duplicated here (the Civix playbook above stays
Civix-specific, per its own instruction not to duplicate per-state).

**A new `OfficialBallotStatus` value, `runoff_pending`,** was added to
`scripts/congressional-rosters/types.ts` for a seat whose party nominee is
undecided pending a still-future runoff — both finalists get a row with this
status, neither is promoted to `qualified_for_general_ballot` before the
runoff is certified. No DB migration was needed (`ballot_status` is plain
`text`, no CHECK constraint).

**A distinct UI treatment ships with this value**: `SeatChallenger` gained an
`isRunoffPending` boolean, and `RepCard.tsx` renders a "Runoff pending" tag +
a CTA note ("your vote in that runoff can still decide who appears on your
November ballot") for any challenger carrying it — Muxin's call, made while
reviewing this build: a runoff-pending nomination is fundamentally different
from a settled one, and the reader has real agency over the outcome
(low-turnout runoffs mean a single vote goes further).

**Two follow-ups from Muxin's review, one immediate and mandatory, one bigger
and deliberately deferred:**

1. **Immediate and mandatory, effective now (Muxin, 2026-07-15):** every
   remaining state built through this manual track for the rest of 2026 MUST
   check that state's own official source for any still-undetermined
   nomination (a pending primary/runoff) as a standard, no-extra-cost part of
   the same research pass — the builder is already on the state's official
   site anyway. Use the exact mechanism OK already built and proved:
   `runoff_pending` ballotStatus + `SeatChallenger.isRunoffPending` + RepCard's
   "Runoff pending" tag/CTA — all state-agnostic already, no new code needed
   per state. See the epic card's own "STANDING REQUIREMENT" bullet
   (`c5a813bb`) for the backlog-level statement of this rule. **Extended
   2026-07-15 after the Colorado build:** this check is narrower than it
   looks — it catches an undetermined *nomination*, but not a determined
   roster that can still change for other calendar-bound reasons (a pending
   petition-signature deadline, a ballot-certification cutoff). See the
   "Standing verification-deliverable requirement" section's new item (e)
   above, which now requires recording every such governing date, not just
   checking for undetermined nominations.
2. **Bigger and deliberately deferred — a cross-year design pass, not needed
   to satisfy #1 above:** every state's in-progress elections should be
   tracked this way **every year going forward**, not just 2026 — concrete
   voter value (a reader in a pending runoff can be told they still have
   outsized influence), a real CTA instead of a dead end, and a later
   follow-through loop ("how did the person you voted for in the runoff
   actually vote"). This needs its own design pass before any implementation:
   - A per-state, per-year election-calendar input, not just the 2026-only
     snapshots in `src/data/states/*.json` today.
   - A roster-schema concept for "which contest, which date resolves it,"
     beyond a single `ballotStatus` enum value scoped to one cycle.
   - A recurring re-check as dates arrive (does this need a scheduled job, or
     is a build-time/import-time refresh sufficient?).
   - Whether the UI treatment built for OK (a static tag + note) generalizes,
     or needs the actual resolution date once the schema supports it.

   Captured as a new epic-level backlog item under `c5a813bb`, to be scoped
   properly rather than bolted onto a single state's card — see OK's report
   doc for the paste-ready draft.

**Repo-hygiene note (resolved 2026-07-15):** this build discovered that
`docs/operations/nationwide-congressional-roster-plan.md` had diverged across
two unmerged local branches after the TX build — the Standing
verification-deliverable requirement + Civix portal operational playbook
content above (originally added by commit `2281b745` on a sibling branch)
was missing from the branch this OK build was cut from
(`feat/tx-official-roster-vertical-slice`), even though TX's own report doc
references it as already written. AZ, TX, and OK have since all been merged
to `main` in sequence (Muxin's explicit sign-off, 2026-07-15) specifically to
stop this divergence from compounding further — each state now builds on a
single shared history instead of stacking on the previous state's unmerged
branch.

## Executive decision

Build a cycle-generic, federated ingestion system that treats the legally
responsible state election authority as the source of truth for each exact
congressional contest and election stage. FEC records remain campaign-finance
enrichment only. Raw official artifacts are retained privately, parsed into an
exact-contest model, validated for completeness, and promoted atomically.

The application must never infer ballot eligibility from filing activity,
fundraising, incumbency, a prior stage, or a stale database row. It must display
every qualified candidate for the user's exact upcoming contest, or an honest
unavailable/not-yet-published state.

The project will proceed through small, gated slices: source/calendar contract,
seven-jurisdiction rehearsal, national source inventory, schema and validator,
Texas/Alabama/California pilots, additional source-mode pilots, parser-family
fanout, shadow application integration, national verification, and one
attended nationwide cutover.

## Original mandate and incident context

The app displayed campaign filers as if they were qualified current-ballot
candidates. A voter reported current November candidates missing while people
who had withdrawn earlier in 2026 remained visible. PR #295 added containment:
FEC-only rows can remain as finance evidence but cannot be presented as a
verified replacement roster. Draft PR #296 and its Texas Senate comparison are
historical evidence, not the nationwide solution.

The original backlog proposal required:

1. A national official-source inventory for every applicable jurisdiction.
2. A canonical election, contest, candidate-identity, candidate-appearance,
   snapshot, completeness, and provenance model.
3. Reusable official CSV/XLSX/JSON/XML, HTML, text-PDF, rendered-portal, and
   human-downloaded official-document ingestion modes.
4. Representative pilots, including Texas.
5. Configuration-first national adapter fanout with custom code only for
   unusual sources.
6. Promotion only for complete, validated, exact-stage snapshots.
7. Scheduled freshness, change, staleness, and manual-review monitoring.
8. Integration through the existing database and address/race-resolution path
   where safe.

Muxin's original requirement is preserved verbatim:

> Ensure you use a sanity check and include a testing/validation- for isntance, there's TONS of candidates for Alabama (I think nearly 33 for House alone) whereas TX only has like a dozen. Nobody gets left out. I would also want a scheduled or periodic scraper that repulls new data (can be based on upcoming election dates etc.) I don't see a scope for how to make sure the data is fresh and clean and updated/maintained. The data we do pull MUST work perfectly in the app - use exxisting database schemas where appropriate, etc. It must ensure that users of the app are able to actually see the correct candidate information on their upcoming ballot.

Later planning instructions added these requirements:

- Persist every planning detail in this file rather than only in chat.
- Use Ballotpedia's 2026 master list for sampled sanity checks without
  scraping or treating it as authoritative.
- Explicitly address mutable calendars and Alabama's district-specific dates.
- Decompose the work into small cards that test the approach before fanout.
- Make the work safe for `groom-backlog` and `orchestrate-pipeline`.
- Include Codex-specific model recommendations, excluding Terra.

## Repository baseline

The implementation must start from these current facts:

- `db/schema.ts` has a general `candidates` table with FEC/cycle/seat/finance
  fields, but no exact elections, contests, official snapshots, appearances,
  or promotion history.
- `scripts/ingest/federal-candidates.ts` ingests FEC filing records. It is not
  a ballot-qualification ingest.
- `src/lib/server/races.ts` filters FEC rows by fundraising, caps them at eight,
  and now marks them finance-only. Those filters must never apply to an
  official ballot roster.
- `POST /api/delegation` attaches a statewide Senate list to an incumbent seat
  and cannot model overlapping regular/special contests or distinct Senate
  seats. It also returns `no_representation` for DC and territories before
  exposing delegate contests.
- The current UI consumes `seats[].challengers` and protects selection through
  roster-provenance checks.
- `src/data/states/*.json` describes statewide election logistics and is not
  precise enough to be the congressional contest calendar.
- `src/data/states/AL.json` explicitly says the congressional district split is
  not modeled.
- GitHub Actions is the existing bulk-ingestion layer. Vercel remains the app
  read path; Vercel Cron is not required for this project.
- Existing containment policy is documented in
  `docs/operations/candidate-roster-source-decision-report.md`.
- `.orchestrator.json` points at
  `docs/operations/voter-choice-backlog.md`, uses `main`, and claims only
  `To Do` cards.
- The prose-kanban parser stores only one `DEPENDS ON` value per card; parallel
  fan-in must therefore be represented by creating a gate card only after its
  whole preceding wave is Done.

## Locked product and infrastructure decisions

These decisions require no further implementation-time choice:

- **Public rollout:** one nationwide cutover after shadow validation, not
  progressive public enablement.
- **Stale data:** retain the last verified snapshot for audit/context but make
  it non-selectable.
- **Raw artifacts:** private Vercel Blob.
- **Parsed and promoted state:** Neon Postgres.
- **Bulk scheduler:** GitHub Actions.
- **Application runtime:** the existing Next.js/Vercel path reads promoted
  Neon data.
- **Ballotpedia:** manual sampled comparison only; never scraped or ingested.
- **FEC:** calendar discovery/change signal and finance enrichment only; never
  ballot qualification.
- **Source blocking:** use an official manual import, request an official bulk
  export, or mark the source blocked. Never bypass CAPTCHA, WAF, authentication,
  robots restrictions, or other controls.
- **Candidate visibility:** every qualified candidate is displayed. Official
  rosters bypass the FEC fundraising threshold and eight-candidate cap.
- **Uncertain identity match:** retain the official appearance without finance
  enrichment. Identity ambiguity cannot omit a candidate.
- **Implementation hold:** no child card becomes runnable until Muxin separately
  authorizes execution.

Before attended Vercel Blob provisioning, upgrade the currently outdated
Vercel CLI from 55.0.0 to the current release with one of:

```sh
npm i -g vercel@latest
# or
pnpm add -g vercel@latest
```

This upgrade is an infrastructure prerequisite, not part of the present
documentation-only work.

## Source authority and conflict policy

### Source hierarchy

1. The legally responsible state election authority's current artifact for the
   exact office, district/seat, election, and stage.
2. A county/local official sample ballot where that authority is responsible
   for publishing the exact ballot or where it independently confirms the state
   list.
3. Another official publication used as a cross-check.
4. The FEC calendar as a discovery/change signal, not the final legal oracle.
5. Ballotpedia as a manual secondary discrepancy detector.
6. FEC filing/finance rows as identity and fundraising enrichment only.

The FEC state-election-office directory is the starting authority directory:
https://www.fec.gov/introduction-campaign-finance/how-to-research-public-records/state-election-offices/

### Official-source conflicts

- If an FEC calendar date differs from the responsible state authority, mark
  affected contests `calendar_review_required` while an operator verifies and
  records the authoritative state evidence.
- If two state-authority publications disagree, do not guess. Retain both
  revisions, block selection for the affected contest, and require review.
- A conflict scoped to one contest does not invalidate unrelated contests in
  the jurisdiction.
- The resolution record must name both URLs, retrieval/checksum metadata, the
  authority chosen, the reason, reviewer, and timestamp.

### Ballotpedia policy

The 2026 comparison page is:
https://ballotpedia.org/List_of_congressional_candidates_in_the_2026_elections

It is useful because it covers House, Senate, DC, and applicable territories
and exposes candidate, party, office, and candidacy-status information. It is
not exact-stage official proof.

Rules:

- No automated fetch, scrape, bulk copy, access-control bypass, ingest, or
  production dependency.
- Compare only aligned scopes. If the master list cannot distinguish the exact
  stage/status, inspect its linked race page manually or mark the comparison
  `not_comparable`.
- A mismatch opens review against the official source.
- If the official source proves our ingest is wrong, block promotion and fix
  the adapter.
- If the official source proves our ingest is right, record Ballotpedia's
  difference/lag and continue.
- Ballotpedia agreement alone never proves completeness.

## Contest-calendar design

State logistics JSON and the FEC reporting calendar cannot be the sole contest
oracle. The FEC page itself says election dates are subject to change:
https://www.fec.gov/help-candidates-and-committees/dates-and-deadlines/2026-reporting-dates/congressional-pre-election-reporting-dates-2026/

It currently records:

- Alabama Senate and Congressional Districts 3, 4, and 5 primary on
  2026-05-19.
- Alabama Districts 3, 4, and 5 runoff on 2026-06-16.
- Alabama Congressional Districts 1, 2, 6, and 7 primary on 2026-08-11 after
  the governor's 2026-05-12 proclamation.
- Other 2026 changes in Arizona, Louisiana, Rhode Island, and Virginia,
  demonstrating that mutable dates are a general problem.

### Stable contest identity

A stable contest/election instance is keyed by:

- cycle;
- jurisdiction;
- office (`house`, `senate`, `delegate`, `resident_commissioner`);
- House district, at-large seat, or Senate seat/class/term;
- `regular` or `special`;
- stage (`primary`, `convention`, `runoff`, `general`);
- party lane where an authority models separate party stages;
- conditional-event identity where applicable.

The election date is a mutable, effective-dated revision and is not part of the
stable identity. This preserves continuity when a proclamation moves a date.

The oracle must represent:

- concurrent regular and special elections, including same-day contests;
- distinct Senate seats/classes/term lengths;
- party conventions where they determine access;
- conditional runoffs that are not expected until officially triggered;
- top-two, top-four, ranked-choice, and nonpartisan systems;
- DC/territorial delegate and resident-commissioner contests;
- cancelled or superseded election instances without deleting history.

### Calendar refresh

- Fetch/check national and configured state calendar signals daily during the
  active election year, independently of dates already stored.
- Preserve URL, authority, retrieval time, publication/effective time,
  checksum, parser version, and raw artifact for each revision.
- A changed checksum/date/proclamation triggers affected-source re-verification.
- A changed FEC artifact is a review signal, not permission to overwrite state
  evidence.

## Canonical data model

The current `candidates` table remains the finance/person-enrichment store.
Add additive, roster-specific structures rather than overloading its cycle
filing fields.

### Elections and contests

- `congressional_elections`: stable election instance, jurisdiction, cycle,
  stage, kind, current effective date, conditional/cancelled state.
- `congressional_contests`: exact office, district/seat/class/term, party lane,
  and representation type linked to an election instance.
- Effective-dated calendar revisions retain every official-source change.

### Candidate identities and appearances

- `congressional_candidate_identities`: source-agnostic person identity.
- `congressional_candidate_appearances`: exact contest/snapshot appearance,
  official ballot name, party, official source order, raw status, normalized
  lifecycle status, ballot-access method, and source-row reference.
- `congressional_candidate_finance_links`: explicit reviewed link between a
  roster identity and an existing `candidates` finance row, with match method
  and review metadata.

An appearance is the eligibility fact. An identity or finance link never is.

### Snapshots and promotion

- `congressional_roster_snapshots`: immutable authority, URLs, retrieval,
  publication/effective time, checksum, parser version, private artifact path,
  row counts, rejection/duplicate counts, completeness, validation outcome,
  and freshness deadline.
- `congressional_roster_promotions`: auditable atomic pointer/history selecting
  the current verified snapshot for each contest.

Migration code is additive. Building it may eventually be automated; applying
it to staging or production is attended and separately authorized.

### Status semantics

Preserve official raw values and normalize lifecycle status to:

- `filed`
- `qualified`
- `certified`
- `advanced`
- `defeated`
- `withdrawn`
- `disqualified`
- `unknown`

Model ballot-access method separately:

- `printed`
- `write_in`

Only a fresh, promoted, exact-upcoming-contest appearance that the responsible
authority reports as qualified/certified is selectable. An `advanced` result
from a prior stage is historical unless the authority also establishes the
person's exact next-contest appearance.

FEC-only, filed/pending, defeated, withdrawn, disqualified, unknown, stale,
and calendar-conflicted appearances remain auditable and non-selectable.

## Source inventory and artifacts

Maintain a versioned repository record for every jurisdiction. Required fields:

- cycle and jurisdiction;
- official authority and authority role;
- official landing page;
- calendar source;
- candidate-publication source;
- source role (`calendar_seed`, `calendar_authority`, `filing_list`,
  `qualified_or_certified_roster`, `sample_ballot`, `secondary_check`);
- exact contest/date/stage scope;
- source format and parser family;
- update cadence and active window;
- access, robots, terms, WAF, authentication, or manual constraints;
- fallback/manual-import procedure;
- last verification and reviewer;
- coverage state.

Coverage states:

- `automatable`
- `manual_official_import`
- `official_roster_not_yet_published`
- `blocked`

An unresolved `blocked` jurisdiction or contest prevents nationwide cutover.
A manual-import source can pass once a current official artifact has completed
the same validation/promotion path.

### Raw artifact storage

- Store immutable raw artifacts in private Vercel Blob.
- Use content-addressed paths such as
  `congressional-rosters/{cycle}/{jurisdiction}/{source}/{sha256}.{ext}`.
- Store the Blob pathname/checksum in Neon; do not store an expiring public URL
  as provenance.
- Display the official authority URL to users, never the private artifact URL.
- Pass `BLOB_READ_WRITE_TOKEN` to GitHub Actions through the existing
  Bitwarden-based secret flow.
- Provision and test Blob/isolated Neon staging in an attended card using only
  a harmless canary write/read/delete.

## Acquisition and parsing

Preferred modes, in order:

1. Official CSV/XLSX/JSON/XML.
2. Official HTML table/database export.
3. Text-based official PDF.
4. Browser-rendered official public portal.
5. Human-downloaded official document imported through the same parser.

Every mode must:

- retain the exact official artifact before parsing;
- use low-frequency requests and conditional retrieval where supported;
- use an identifying user agent/contact where appropriate;
- respect authentication, CAPTCHA, WAF, robots, and terms constraints;
- produce the same normalized snapshot/reconciliation contract;
- use saved official fixtures in tests;
- classify every source row rather than silently dropping it.

OCR is not a default ingestion mode. If an official PDF has no reliable text
layer, the source-inventory gate must choose a human-reviewed official import
or an explicit OCR pilot with heightened review; ordinary adapters may not
silently add OCR.

## Completeness, validation, and promotion contract

Promotion is fail-closed and atomic.

### Required reconciliation

For every artifact and contest, persist:

- source row count;
- parsed candidate row count;
- explicitly rejected/non-candidate row count with reason;
- duplicate row count and resolution;
- per-contest row count;
- status totals;
- promoted row count.

Required equation:

`source rows = parsed candidate rows + explicitly classified non-candidate/rejected rows`

Promotion requires zero unexplained rejected rows.

### Promotion blockers

- non-successful retrieval or unexpected content type;
- empty/error/login/challenge page masquerading as data;
- truncated or zero-byte artifact;
- schema/header change;
- parse-zero result unless an official artifact explicitly represents a
  candidate-free contest;
- missing expected district, party lane, stage, or contest;
- unexpected candidate removal or source shrink;
- ambiguous duplicate or identity collapse;
- unknown/unmapped official status;
- calendar conflict;
- stale source;
- Blob or database failure;
- unresolved completeness difference.

Every candidate removal must be supported by a new official roster/status or
reviewed official evidence. There is no numeric shrink threshold that silently
accepts losses.

### Failure behavior

- Retain the previous verified snapshot and its history.
- Do not replace or partially update its active promotion.
- Mark the new attempt rejected/review-required with evidence.
- Disable selection when the retained snapshot crosses `stale_after` or its
  calendar becomes conflicted.
- Scope the failure to affected contests where safely possible.

### Honest unavailable state

`official_roster_not_yet_published` requires a timestamped successful check of
the configured official publication channel. An HTTP error, access challenge,
empty/error page, or parser failure cannot create this state.

## Freshness and maintenance SLA

**Status note (2026-07-16):** the automated daily-check pipeline described
below is the long-term target and was never built — the epic's 2026-07-15
pivot paused the automated fan-out in favor of the manual state-by-state
track (see "Revision — state-by-state manual-first sequencing" above).
Freshness within the 2026 cycle is currently handled per-state via the
`NOT BEFORE` re-check card convention (backlog epic `c5a813bb`, "STANDING
REQUIREMENT — NOT BEFORE DATE-GATE CONVENTION"), not this SLA. Freshness
*across* cycles (2028, 2030, ...) is handled by that same epic's
"SUCCESSOR" note — a brand-new epic per cycle, not a rollover of this one.

“Always current” is an operational SLA relative to what the authority has
published, not a guarantee that an authority has already published data.

- Check national/FEC calendar signals daily during an active election year.
- Check each roster source weekly outside an active window.
- Check daily from 45 days before the next filing, withdrawal, certification,
  primary, runoff, or general milestone through seven days afterward.
- Allow shorter intervals only where the official source explicitly supports
  inexpensive conditional retrieval.
- Immediately re-verify affected contests after a calendar or artifact change.
- Set `stale_after` to no more than twice the required check interval:
  48 hours in daily windows and 14 days in weekly windows.
- Put manual-only sources into an attended queue with the same due date.
- Retain stale data for audit/context but disable selection.

GitHub Actions runs a daily due-source selector, acquisition, validation, and
coverage report. It reports:

- expected contests without a current source state;
- changed artifacts;
- additions/removals/status changes;
- stale or due manual sources;
- parser/schema failures;
- rejected promotions;
- calendar conflicts;
- unresolved review items.

## Application interface and behavior

Add an exact-contest read model and an additive shadow field to
`POST /api/delegation`:

```ts
type UpcomingCongressionalContest = {
  contestId: string;
  office: "house" | "senate" | "delegate" | "resident_commissioner";
  districtLabel: string | null;
  electionDate: string;
  stage: "primary" | "runoff" | "convention" | "general";
  electionKind: "regular" | "special";
  roster: {
    availability:
      | "verified_complete"
      | "official_roster_not_yet_published"
      | "manual_review_required"
      | "calendar_review_required"
      | "stale";
    retrievedAt: string | null;
    staleAfter: string | null;
    sourceLinks: Array<{ label: string; url: string }>;
    candidates: Array<{
      appearanceId: string;
      identityId: string | null;
      ballotName: string;
      party: string | null;
      status: string;
      ballotAccess: "printed" | "write_in";
      selectable: boolean;
      totalReceipts: number | null;
    }>;
  };
};
```

Behavior:

- Resolve the voter's exact House district and applicable statewide Senate
  seat/contest as of the requested/current date.
- Return concurrent regular/special contests separately; never blend rosters.
- Return delegate/resident-commissioner contests for DC/territories even when
  the current-member assessment honestly says representation is non-voting.
- Preserve the compatibility `challengers` path during shadow operation.
- At cutover, official `upcomingContests` becomes the sole eligibility source.
- Show every qualified official candidate; do not use fundraising viability or
  the eight-row FEC cap.
- Use official ballot order where provided, otherwise official document order,
  then stable alphabetical fallback.
- Display official source and freshness.
- Display honest unpublished/stale/review states rather than guessed rosters.
- Merge an incumbent's roster appearance with the sitting-member card only
  after a confirmed identity link. Ambiguity produces a separate official
  appearance, not an omission.

Feature mode:

`CONGRESSIONAL_ROSTER_READ_MODE=contained|shadow|official`

- Default: `contained`.
- `shadow`: compute/read official results for comparison without making them
  the public eligibility path.
- `official`: nationwide public official-roster path after all release gates.
- Rollback: return to `contained`; retain acquisition and audit history.

## Ballotpedia sampled QA protocol

Ballotpedia checks are attended and manual.

### Progressive sampling

- Compare every pilot contest with a comparable Ballotpedia entry.
- For each adapter tranche, select three contests deterministically from that
  tranche's expected-contest inventory.
- Before national cutover, select at least 30 contests across at least
  15 jurisdictions.
- Repeat a smaller stratified sample monthly during the active cycle and after
  a material source/parser change.

### Required strata

- House and Senate;
- delegate/resident commissioner where applicable;
- primary, runoff, and general;
- regular and special;
- high- and low-candidate-count contests;
- partisan, nonpartisan, and top-N/ranked systems;
- active and inactive/withdrawn candidacies.

Mandatory checks outside the random draw:

- existing Texas regression;
- Alabama district-date split and high-volume roster;
- one territory/delegate contest;
- one overlapping regular/special contest.

### Persisted report

Record:

- cycle and check timestamp;
- deterministic seed;
- operator;
- Ballotpedia page/race URL and comparison scope;
- selected contests;
- compared names/party/status where scope aligns;
- `match`, `mismatch`, or `not_comparable`;
- official artifact used to adjudicate every mismatch;
- resulting app/adapter correction or documented Ballotpedia difference.

## Progressive execution plan

**Per the 2026-07-15 revision above: the manual state-by-state track (AZ
pattern) runs now, independent of these waves, and does not block on or wait
for Wave 3/4. Wave 5's N21 automated fanout additionally requires 3-5 states
proven manually before it may be scoped as a card.** The waves below are
otherwise unchanged.

The current mega-card is not implementation-ready as one card. It is an epic.
The cards below are created only at their gates and each receives:

- `PARENT: c5a813bb`;
- `PLAN: docs/operations/nationwide-congressional-roster-plan.md`;
- one literal `GOAL_CONDITION`;
- exact in/out scope;
- named tests/direct evidence;
- explicit `DECISION` routing;
- a unique title and one resolvable dependency at most.

### Wave 0 — documentation bootstrap

Outcome:

- this file exists and contains the full plan and robustness audit;
- the backlog epic points here and is parked/non-executable;
- no implementation cards are created or promoted;
- `npm run check` passes.

GOAL_CONDITION:

```sh
test -f docs/operations/nationwide-congressional-roster-plan.md \
  && rg -F "PLAN: docs/operations/nationwide-congressional-roster-plan.md" docs/operations/voter-choice-backlog.md \
  && rg -F "## Final robustness audit" docs/operations/nationwide-congressional-roster-plan.md \
  && npm run check
```

### Wave 1 — source and calendar foundations

Create only after explicit execution authorization.

#### F01 — Source-inventory contract and verifier

Outcome: versioned source-record schema validates every required field and
coverage state.

GOAL_CONDITION: focused source-inventory tests and
`npm run verify:congressional-source-inventory -- --fixtures` pass, followed by
`npm run check`.

#### F02 — Mutable expected-contest/calendar oracle

Outcome: effective-dated exact contests and revisions work; Alabama's split is
a permanent regression; state logistics JSON cannot act as the oracle.

GOAL_CONDITION: focused calendar tests and
`npm run verify:congressional-calendar -- --year 2026 --fixture al-split` pass,
followed by `npm run check`.

F01 and F02 may run in parallel with disjoint files.

### Wave 2 — seven-jurisdiction rehearsal

Create after F01 and F02 are both Done rather than representing a false
multi-dependency.

#### F03 — Inventory rehearsal: AL, TX, CA, DC, AK, LA, PR

Each jurisdiction must have validator-clean official-source records or an
evidenced explicit state. No unknown omission is permitted.

#### F04 — Rehearsal review and contract correction gate

Adjudicate every rehearsal gap. Fanout is blocked until the contract is
declared fit or exact correction cards are completed.

### Wave 3 — national source inventory

After F04, create seven exact-scope cards:

- I05: AZ, AR, CO, CT, DE, FL, GA
- I06: HI, ID, IL, IN, IA, KS, KY
- I07: ME, MD, MA, MI, MN, MS, MO
- I08: MT, NE, NV, NH, NJ, NM, NY
- I09: NC, ND, OH, OK, OR, PA, RI
- I10: SC, SD, TN, UT, VT, VA, WA
- I11: WV, WI, WY, AS, GU, MP, VI

Each passes a group-scoped inventory verifier with no silent omissions.

After all seven are Done, create I12 rather than pre-encoding fan-in.

#### I12 — National inventory consolidation and semantic gate

Outcome:

- all 56 jurisdictions accounted for;
- every expected 2026 contest has an official-source path/state;
- parser families and access constraints frozen;
- non-sensitive public golden addresses selected for later app testing;
- exact pilot and adapter cards emitted;
- no placeholder/unknown adapter card promoted.

### Wave 4 — model, validator, and pilots

#### M13 — Canonical roster schema and migration

Add the exact-election, contest, identity, appearance, snapshot, promotion, and
finance-link structures. Migration code only; no production application.

#### M14 — Private artifact abstraction and fail-closed promotion engine

Use TDD and fake Blob/database implementations. Prove all failure cases retain
the prior promoted snapshot.

#### M15 — Isolated staging resources

Attended provisioning of private Blob and isolated Neon staging. Canary only;
no production data.

#### P16 — Texas live pilot

One complete official staging snapshot, full reconciliation, saved fixtures,
and the existing Texas Senate regression.

#### P17 — Alabama live pilot

Separate after Texas. Prove district-specific dates, high-volume completeness,
and simulated calendar-change invalidation. Do not hardcode “33 candidates.”

#### P18 — California live pilot

Prove top-two semantics and prevent premature inference of a future certified
general roster.

#### P19 — Additional source/semantic pilots

I12 creates one small card per still-unproven class: spreadsheet, text PDF,
rendered portal/manual import, write-in/replacement, regular/special overlap,
conditional runoff, territory/delegate, or ranked/top-N. Use one unusual
jurisdiction or one source mode per card.

#### P20 — Pilot review and contract freeze

An independent review either freezes the shared contract or creates blocking
correction cards. Any semantic correction reruns affected completed pilots.

### Wave 5 — national fanout and application

#### N21 — Parser-family adapter tranche pairs

**Gated by the 2026-07-15 revision: do not scope N21 until at least 3-5 states
have shipped through the manual state-by-state track with clean verification.**
Create exact cards after P20 (and after that manual-track gate). Limit each
implementation card to one parser family and no more than seven ordinary
jurisdictions; unusual sources receive one card each.

Follow every implementation card with a separate audit card that verifies
official reconciliation and three manual Ballotpedia samples. A failed audit
blocks the next tranche.

#### N22 — Calendar-driven acquisition/freshness dry run

Compute due sources and review states without promotion. Test Alabama revisions,
conditional events, manual sources, failures, and stale deadlines.

#### N23 — Scheduled staging ingestion and monitoring

Add GitHub Actions acquisition/reporting. Workflow code may be built
automatically later; schedule activation and secrets remain attended.

#### A24 — Exact-contest read model/API in shadow

Address resolution returns the exact upcoming contests, separate regular and
special elections, Senate seats, delegates, provenance, freshness, and finance
enrichment without using finance as eligibility.

#### A25 — Pilot UI flow behind the flag

Golden public addresses show every qualified candidate and honest unavailable
states. Genuine visual changes remain held for attended preview review.

**HARD MANUAL SANITY-TEST GATE (Muxin, 2026-07-14) — blocks A25 merge and all
fan-out/cutover.** Before A25 merges, and before ANY of N21 fan-out or C29
cutover proceeds, STOP for an attended manual accuracy test: run the real app
(preview/staging) for golden public addresses across at least TX, AL, and CA and
compare the candidates the app displays against an INDEPENDENT reliable source —
the state Secretary of State / election-authority official candidate list plus a
Ballotpedia spot-check. Confirm per contest: no missing qualified candidate, no
extra/withdrawn/defeated/filing-only candidate, correct ballot name/party/office/
district/stage, and an honest not-yet-published state where uncertified. Alabama
is the high-volume stress case (do not hardcode a candidate count); Texas Senate
is the standing regression. When A25 and the N21/C29 cards are created, each MUST
carry `DEPENDS ON` the backlog card "[P0] MANUAL SANITY-TEST GATE —
app-vs-official-source accuracy check before roster fan-out/cutover". This is the
earlier informal instance of Q27's national QA and gates the FIRST app-visible
roster data. Do not present roster data to real users until Muxin signs off.

### Wave 6 — national verification and release

#### V26 — National official-source verifier

Implement:

`npm run verify:congressional-rosters -- --year 2026`

Every expected contest must map to a fresh complete verified roster or an
evidenced official-not-yet-published state. `blocked`, stale,
calendar-conflicted, or unresolved review states fail cutover.

#### Q27 — National Ballotpedia sample QA

Attended 30-contest/15-jurisdiction manual report with official adjudication.

#### S28 — Nationwide shadow soak and rollback rehearsal

At least seven consecutive days and one complete scheduled cycle with no
unexplained coverage loss, stale selectable rows, or unresolved high-severity
discrepancy. Rehearse rollback to `contained`.

#### C29 — Attended nationwide cutover

Apply `official` mode once nationwide and run representative golden-address
smokes. Keep rollback ready.

#### X30 — Epic closeout and queue restoration

Stop roster conductors, verify every P0 child is Done, then perform one
attended locked board transition that closes the epic and restores all cards
quarantined at execution start to their recorded prior statuses.

## Orchestrator and grooming contract

### Current documentation-only state

- Keep the epic in `Backlog` with a `PARKED` execution-hold note.
- Do not create F01/F02 or any runnable child during documentation work.
- Do not move or quarantine unrelated cards during documentation work.

### When execution is separately authorized

1. Ensure this plan/backlog change is committed and merged to `origin/main` so
   fresh worktrees can resolve the cited plan.
2. Run an actual `groom-backlog` pass over only the next wave.
3. Create/stamp only cards that are startable at that gate.
4. Mechanically quarantine unrelated `To Do` cards by moving them to
   `Backlog` and adding a reversible P0 `PARKED` note containing
   `prior_status=To Do`.
5. Before every batch, abort if an unparked eligible non-P0 card exists.
6. Use non-primary conductor lanes such as `roster-a` and `roster-b` so the
   primary lane's repository-wide PR babysitting does not continue unrelated
   Review work during the lock.
7. Use at most two lanes and give them disjoint jurisdiction/config paths.
8. Create fan-in gates only after all cards in the preceding wave are Done.
9. Every code card uses TDD when meaningful and returns literal
   `GOAL_EVIDENCE`.
10. Every code card runs a focused test and `npm run check`.
11. Run `npm run e2e` once only on cards changing UI behavior or user-visible
    copy.
12. Never run Stryker locally.

External provisioning, applying migrations, secrets/schedule activation,
manual Ballotpedia review, public cutover, and queue restoration are attended
and cannot be auto-approved by a build card — EXCEPT as pre-authorized in the
next subsection.

### Pre-authorized execution decisions (Muxin, 2026-07-14)

Muxin has pre-authorized every downstream gate EXCEPT the two human stops below,
so an unattended run does not drip-feed approvals. These override the "attended"
defaults in the paragraph above for the named gates only. The conductor stamps
each downstream card it creates or emits with the matching DECISION from this
section (born decided), and applies one fail-closed rule uniformly: any
reconciliation discrepancy, verifier failure, missing secret, or official-source
mismatch STOPS the run and surfaces it — it never guesses, never exposes roster
data to real users, and never mutates production.

TWO HUMAN STOPS (never auto):

- A25 — the app-vs-official-source manual accuracy test (TX/AL/CA). No roster
  data is shown to real users before Muxin signs off. This is the incident
  backstop; keep it human.
- C29 — the public nationwide cutover to `official` mode. The only actor that
  flips live data for real users is Muxin.

PRE-AUTHORIZED (auto, fail-closed):

- M15 — isolated staging wire-up. Muxin provisions the private Blob store and an
  isolated Neon staging branch OUT OF BAND and sets the secrets
  `ROSTER_STAGING_BLOB_TOKEN` and `ROSTER_STAGING_DATABASE_URL`. The M15 card
  only consumes those pre-set secrets and runs a canary; it NEVER provisions
  cloud resources itself and NEVER points at production. If either secret is
  absent, M15 stops with an honest "staging not provisioned" state.
- Staging migrations — applying M13's migrations to the ISOLATED staging Neon
  branch only (additive, reversible, canary) is pre-authorized. Production
  migration application remains part of C29 (human).
- N23 — scheduled staging ingestion. Building the GitHub Actions workflow and
  enabling its schedule is pre-authorized once V26 is green. It reads only
  official public sources at low frequency with an identifying user agent and
  writes only to staging.
- P20 — pilot contract freeze. Auto-freeze the shared contract ONLY if every
  completed pilot has zero reconciliation discrepancies and its required
  Ballotpedia samples exact-match the official source. ANY discrepancy instead
  emits blocking correction cards and stops — never freeze over a discrepancy.
- V26 / S28 — the national verifier and the multi-day shadow soak + rollback
  rehearsal run automatically against staging; a failure or unexplained coverage
  loss stops the run and holds for review.
- Q27 — national Ballotpedia sample QA. Auto-generate the sampled report; zero
  discrepancies passes automatically, any discrepancy stops for adjudication.
- X30 — epic closeout / queue restoration runs automatically once every P0 child
  is Done and both human stops (A25, C29) have been cleared.

Hard boundary: nothing in this section authorizes exposing roster data to real
users or mutating production. Those two actions occur only at A25 (sign-off) and
C29 (cutover), both human.

## Codex model tiers

Current official model references checked on 2026-07-13:

- OpenAI model guidance:
  https://developers.openai.com/api/docs/models
- Codex rate card and current Codex model availability:
  https://help.openai.com/en/articles/20001106

Terra is intentionally excluded from this plan, as requested.

### Tier 1 — GPT-5.6 Sol

Use `GPT-5.6 Sol` with high/xhigh reasoning for the highest-stakes work:

- calendar and election-law semantics;
- official-source conflict resolution;
- canonical schema and promotion invariants;
- PDF/OCR or ambiguous portal decisions;
- rehearsal/pilot contract gates;
- national verifier and final robustness review;
- rollout/rollback and cutover review.

Use max reasoning only for a genuinely unresolved national-release or
official-source conflict, not routine implementation.

### Tier 2 — GPT-5.3-Codex

Use `GPT-5.3-Codex` with high reasoning for agentic implementation and code
review:

- schema/migration implementation after Sol fixes semantics;
- validators and promotion engine;
- ordinary adapters with known contracts;
- GitHub Actions and storage integration;
- read-model/API and UI integration;
- TDD, refactoring, and final diff review.

OpenAI's current Codex rate card states that Codex code review uses
GPT-5.3-Codex, making it the default implementation/review tier here.

### Tier 3 — GPT-5.6 Luna

Use `GPT-5.6 Luna` with medium/high reasoning for bounded, high-volume work:

- jurisdiction source-inventory research against a fixed schema;
- ordinary CSV/XLSX/HTML source classification;
- fixture generation from retained official artifacts;
- deterministic reconciliation reports;
- adapter-tranche evidence collection.

Escalate to Sol whenever authority, status, calendar, or completeness is
ambiguous. Luna must not independently decide legal authority or waive a
validation failure.

### Tier 4 — GPT-5.4 Mini

Use `GPT-5.4 Mini` with low/medium reasoning only for mechanical tasks:

- report formatting;
- deterministic fixture normalization after expected output is fixed;
- documentation cross-links;
- non-semantic inventory formatting and completeness bookkeeping.

It must not decide election semantics, source authority, eligibility,
promotion, or cutover.

### Parallel and verification assignments

- F01/F02 may run in parallel after documentation merges.
- National inventory and adapter fanout use at most two lanes.
- Schema/promotion, pilot gates, contract freeze, national verification,
  cutover, and closeout remain sequential.
- High-ambiguity consolidation, pilot freeze, and national verification should
  use a Sol agent team to propose, challenge, and converge on one verdict.
- Verification uses Sol for semantic/release gates and GPT-5.3-Codex for code
  correctness. A verifying agent must not be the sole author of the artifact
  it approves.

If a recommended model is unavailable in the active Codex workspace, use:

- GPT-5.4 as the fallback for Sol-level semantic review;
- GPT-5.4 or GPT-5.3-Codex for implementation;
- GPT-5.4 Mini for Luna-level bounded/mechanical work.

Do not silently substitute a weaker tier for an authority, eligibility,
promotion, or release decision.

## Test matrix and acceptance gates

### Calendar and contest fixtures

- Alabama Senate/CDs 3-5 remain 2026-05-19; CDs 1/2/6/7 are 2026-08-11.
- A simulated FEC/state revision preserves stable contest identity and creates
  a reviewable diff.
- FEC/state conflict cannot silently overwrite state evidence.
- Concurrent regular and special contests never blend.
- Conditional runoff is not reported missing before an official trigger.
- Distinct Senate seats/classes/terms resolve independently.

### Candidate/status fixtures

- Same person filed/qualified/defeated/withdrawn across different stages.
- Only the exact qualified/certified upcoming appearance is selectable.
- Official write-in eligibility is separate from lifecycle status.
- FEC finance survives status changes without granting eligibility.
- Unmatched/ambiguous identity rows remain visible without finance data.
- Incumbent deduplication requires a confirmed identity link.

### Failure fixtures

- truncated or zero-byte artifact;
- HTML error/login/challenge page;
- unexpected shrink or candidate removal;
- missing district or party lane;
- schema/header change;
- duplicate/ambiguous row;
- parse rejection or unmapped status;
- stale source;
- Blob/network/database failure.

Every failure must preserve the previous promotion. Stale/conflicted snapshots
remain auditable but non-selectable.

### Completeness and application gates

- Every promoted snapshot reports source, parsed, rejected, duplicate,
  per-contest, status, and promoted counts.
- Zero unexplained rejections.
- Every expected contest maps to a verified roster or an evidenced honest
  state.
- Golden public addresses resolve to the correct House, Senate, special, and
  delegate contests.
- Every qualified candidate is visible with ballot name, party, office,
  district/seat, date, stage, source, and freshness.
- No FEC-only, filed-only, defeated, withdrawn, disqualified, stale, unknown,
  or calendar-conflicted appearance is selectable.

### National release gate

- National verifier passes.
- No unresolved `blocked`, stale, calendar-conflicted, or manual-review contest.
- Ballotpedia sampling is complete and adjudicated.
- Seven consecutive shadow days and at least one full scheduled cycle pass.
- Rollback to containment is rehearsed.
- Nationwide golden-address smoke passes after the attended flag change.

## Final robustness audit

Verdict: the plan is robust after the controls below. No unmitigated
architecture blocker remains. Residual risks are official publication delay,
authority-site access changes, and manual-source workload; each produces an
honest non-selectable state rather than false completeness.

| Risk | Persisted control |
| --- | --- |
| Plan exists only in chat/current branch | This document is the source of truth; merge it before worktrees are created. |
| Mega-card is accidentally claimed | Backlog card is a parked, non-`To Do` epic with no `GROOMED` marker. |
| Documentation update accidentally starts implementation | No child cards or queue quarantine are created until separate authorization. |
| Unrelated work runs after authorization | Reversible P0 quarantine plus pre-batch eligibility audit and non-primary lanes. |
| Prose priority lock is not machine-enforced | `PARKED` metadata, queue audit, lane isolation, and attended restoration. |
| Board supports one dependency only | Gate cards are created only after the full preceding wave is Done. |
| Parallel agents drift on shared semantics | Contract freeze precedes fanout; maximum two disjoint lanes. |
| Plan fails only after national fanout | Foundation rehearsal, three named pilots, semantic pilots, and independent contract-freeze gates. |
| Calendar changes silently | Fixed daily refresh, immutable revisions, stable identity, and Alabama regression. |
| Official sources disagree | Contest-scoped `calendar_review_required`; no guessing or overwrite. |
| Partial/error source replaces good data | Immutable raw artifacts, reconciliation, and atomic fail-closed promotion. |
| Candidate removal slips through a threshold | Every removal requires official evidence or review; no silent shrink threshold. |
| Identity matching hides someone | Official appearance remains visible without a finance link. |
| Empty/error response becomes “not published” | Requires a successful timestamped official-channel check. |
| Manual source freshness is overstated | Attended SLA queue and non-selectable stale state. |
| Ballotpedia becomes an authority | Manual sample only; every mismatch adjudicated against official evidence. |
| Ballotpedia comparison mixes stages | Aligned scope or `not_comparable`; no all-cycle list treated as certified general ballot. |
| UI still truncates candidates | Official roster bypasses fundraising filter/cap and uses authoritative order. |
| Territories remain hidden | Upcoming delegate contests are returned alongside honest representation status. |
| Public systemic error | Shadow mode, national verifier, seven-day soak, attended cutover, one-setting rollback. |
| Final unlock races with epic completion | Stop conductors and perform one attended locked closeout/restoration transition. |
| Weak model makes an authority/release decision | Sol semantic/release tier and independent verification; weaker tiers have explicit boundaries. |

## Assumptions and explicit non-goals

- Initial operational cycle is 2026; schemas/configuration are cycle-generic.
- This project covers federal congressional contests, including applicable
  non-voting delegates/resident commissioner, not state/local ballots.
- It does not build a universal election-calendar replacement for unrelated
  product logistics.
- It does not remove existing FEC finance history.
- It does not scrape Ballotpedia or bypass official-site controls.
- It does not promise that an authority has published a roster before it has.
- It does not apply migrations, provision services, ingest live data, change
  production flags, or deploy as part of planning/documentation.
- Later discovery may supply exact source URLs, parser families, and golden
  addresses, but it may not weaken the authority, completeness, freshness,
  promotion, or release rules in this document without updating the plan and
  re-running the relevant gate.

## Documentation maintenance rule

Any later planning decision that changes scope, authority, schema, validation,
freshness, orchestration, model routing, or rollout must update this file in the
same change as its backlog-card update. Implementation cards may cite narrower
reports and fixtures, but they may not replace or abbreviate this plan.

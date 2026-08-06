# Donor-bucket framing + candidate accountability data — plan

> Status: **plan, adversarially reviewed 2026-07-23** — mechanical fixes applied, open
> judgment calls recorded in Open risks (see Review log at the end).
> **Parts 1, 2, 3 and 4 are built and shipped to prod** (see the "Part N — executed" notes),
> including Part 4's candidate-data follow-up (backfilled + verified 2026-07-25).
> **Part 5 step 0 is built (2026-07-25): the sourcing spike + rubric draft — see "Part 5 —
> step 0 built". The spike still needs a networked run before the schema is committed.
> Part 6 is still plan only.**
> Date: 2026-07-23. Author: session with Muxin, from her review notes on the Money-trail
> surface plus three pieces of unsolicited user feedback about promise-keeping.
> Prior art this supersedes nothing: `docs/FUNDING_DATA_SPARSENESS.md` remains accurate
> for the ingest-coverage story; this doc is about _framing_ and _net-new data_.

## How to vet this doc

If you are an AI or reviewer being asked to check this plan, the highest-value things to
attack, in order:

1. **The legal claims in the Context section.** Three load-bearing assertions: that $200 is
   the FEC itemization threshold and not our editorial choice; that sub-$200 money is
   genuinely un-decomposable in public filings; and that corporations cannot contribute to
   federal candidates. If any of those is wrong, Part 1 changes shape.
2. **Part 5's sourcing.** The promise corpus is the weakest link — see Open Risks #1. We
   found the Library of Congress bulk archive covers 2000–2016 only, which kills the source
   the original research recommended. Is there a better corpus we missed?
3. **Whether a scored kept/broken verdict is defensible at all.** This is an editorial
   judgment we would own publicly. Muxin has explicitly chosen it over a
   show-both-sides-and-let-the-voter-judge design. Argue the other side if you think it
   is the wrong call.
4. **Whether Parts 3 and 4 are worth building** versus answering those questions with live
   web search. Muxin's stated reason for building: _"I don't want to spend web search calls
   on this if we can instead build a database that it calls internally — I'd trust it more."_

What is **already decided** and not up for re-litigation (see Decisions taken): the bucket
label wording, keeping $200 on `/methodology` only, and the choice of a scored tracker.

---

## Context

Two problems and one net-new build, from Muxin's review notes.

**1. The donor buckets mislead and over-disclose.** The card prints `Small donors <$200` /
`Large donors ≥$200`. Two things are wrong with that. The framing implies $200 is an
"everyday person" amount — but the median American donates nothing at all, and of those who
do give, ~55% give under $100. So $200 is nearer the _top third_ of donors than the median.
And printing the cut-line invites gaming.

Important correction to the premise: **$200 is not our methodology.** `federal-donors.ts:414-431`
reads FEC's `individual_unitemized_contributions` vs `individual_itemized_contributions`. Federal
law requires itemization once a donor's cycle aggregate passes $200; below that the FEC publishes
one undifferentiated lump. So (a) there is nothing to game — it is public statute, and (b) we
_cannot_ re-cut at $100 even if we wanted to, because sub-$200 money is **not decomposable from
candidate committee reports**. (Precision matters in the wording: the threshold is a $200 _cycle
aggregate_, not per-donation, and conduit committees — ActBlue, WinRed — itemize every earmarked
contribution in their own Schedule A filings regardless of size. So "no per-donation detail in any
filing" is publicly falsifiable; the candidate-side lump still cannot be re-cut, which is what
matters for our buckets. `/methodology` must use the softer wording.) The fix is therefore
**labelling**, not re-bucketing: describe _who_ each bucket is,
the way `PACs · groups & lobbies` already does.

Muxin's honest question — do corporations fall in the "large individual" bucket? **No.**
Corporations cannot donate to a federal candidate at all (52 U.S.C. §30118). Corporate money
reaches a candidate as (i) a corporate-sponsored PAC → lands in our **PACs** bucket, or (ii)
super-PAC independent expenditures → not in candidate receipts, so absent from our numbers
entirely. Worth fixing alongside: our **industry** buckets ("Healthcare industry") are derived
from the _employer field on individual donations_ — people who work in that sector, not the
company. Current copy implies the company wrote a cheque.

Muxin's follow-up question — _then how do we show which industries and companies actually back a
candidate?_ — has a real data answer, and most of the plumbing already exists: **Part 6**.

**2. "No FEC filing data" is mostly wrong.** Live prod query
(`npx tsx --env-file=.env.local scripts/ingest/_coverage-by-layer.ts 2026`, run 2026-07-23):

|         | total  | none  | top-line only | small/large/PAC | sectors | issue-PACs |
| ------- | ------ | ----- | ------------- | --------------- | ------- | ---------- |
| Federal | 3,099  | 587   | 91            | **2,421**       | 1,623   | 620        |
| All     | 11,108 | 8,154 | 113           | 2,841           | 1,993   | 620        |

78% of federal candidates have a full breakdown. So a federal candidate showing "no data" is
almost certainly `candidate_not_resolved` — a name-match miss in `resolveCandidateId`
(`src/lib/server/alignment.ts:250`) — not missing data. State/local (73% `none`) is the genuine hole.

**3. Voters keep asking a question we can't answer.** Twice now: _did the candidate honour the
promises they ran on?_ One verbatim: _"I'd like to see what promises the candidate made/is making
to get elected and how that aligns with their behavior along with the issues I personally care
about. I'd also want to know who their closest partisan and bipartisan collaborators are and which
committees they are on — maybe some kind of analysis of their working style or power levers."_

We have votes, bills, issue tags, stock trades, lobbying activity and press releases — but
**no cosponsorship, no committee assignments, and no promise corpus**. Muxin wants this in our own
DB, not resolved by live web search, so answers are reproducible and trustworthy.

---

## Decisions taken

| Decision        | Choice                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucket copy     | Keep the names "Small donors" / "Large donors"; delete the `<$200` / `≥$200` sub-labels; add a corporations gloss                                                                                  |
| $200 disclosure | Scrubbed from every card/legend/prompt surface; **kept on `/methodology`** so numbers stay reproducible                                                                                            |
| Promise display | **Scored tracker** (PolitiFact-style) — an editorial judgment we own. Verdict enum signed off 2026-07-23: `kept` / `attempted_blocked` / `compromise` / `broken` / `not_yet_testable` (see Part 5) |
| Scope           | All of it, fully planned. Multi-PR, multi-session                                                                                                                                                  |

---

## Part 1 — Donor bucket copy

Surgical: change display strings only. Do **not** touch `donor_aggregates.bucket_label` — that
string is the ingest contract shared by `federal-donors.ts`, `federal-sectors-bulk.ts` and 53
state donor ingests, and `race-data.ts:248-249` already filters funding-mix labels out of
`donorCoalition` so they never reach the UI on the DB path.

**`src/prototype/VoterChoiceApp.tsx`** (en block, then mirror in the `es` block at ~:1260/:1643/:1669):

- `:422` `mixKeySmallSub: 'under $200'` → `'individuals'`
- `:424` `mixKeyLargeSub: '$200+'` → `'individuals'`
- `:828` `smallDonorsThreshold: '<$200'` → `'individuals'`
- `:830` `largeDonorsThreshold: '≥$200'` → `'individuals'`
- `:854` `smallDonorsAgenda` → `'Individual people giving in small amounts. No single agenda.'`
- `:856` `largeDonorsAgenda` → `'Individual people giving large amounts. Still individuals — companies cannot donate to a candidate directly.'`
- `:2405-2406` — **hardcoded, not i18n**: `Small donors <small>&lt;$200</small>` / `Large donors <small>≥$200</small>`. Route through `t()` like the `:3269` and `:3463` legends already do.
- New legend gloss beside the existing `pacGlossDefinition` (`:833`): _"Individual donors are people. Companies cannot donate to a candidate directly — their money moves through PACs."_
- `:858` `industryAgenda` (in `fundingSources`) — reword so it reads as _donors who work in that industry_, not the company.

**`src/lib/translations.ts:947` (en) and `:1649` (es)** — `racePatternsDonorMethodologyNote` currently
`"% by total contribution amount · Small donor = under $200 per donation"`. Drop the threshold clause;
keep `"% by total contribution amount"`.

**Prompt vocabulary** — the LLM ballot path emits `donorCoalition` labels verbatim and they can render
raw, so the parenthetical must leave the vocabulary too:

- `docs/PATTERN_TAXONOMIES.md:26-27` — `Small individual donors` / `Large individual donors`
- `docs/BALLOT_PROMPT.md:253-254` — same, plus rewrite the "means individual contributions under $200
  per donation" gloss to say _aggregated by dollar amount, split at the federal itemization line_.
  (The old gloss was factually wrong anyway — itemization triggers on a $200 _cycle aggregate_,
  not per-donation.)
- `docs/BALLOT_PROMPT.md` **example JSON blocks** at `:235`, `:241`, `:427-428` — all four carry
  `"Small individual donors (under $200)"` and teach the model harder than the vocabulary list does.
  Editing only `:253-254` leaves the examples contradicting the new vocabulary.
- Regenerate `src/lib/generated/ballotPromptEn.generated.ts` (do not hand-edit)
- `docs/BALLOT_PROMPT_ES.md` — verified: carries **no** $200 vocabulary (older `topFunders` shape),
  no change needed

**Chat tool path — the biggest miss the review found.** `resolveLookupDonorTool`
(`src/app/api/chat/route.ts:1151-1157`) serializes `lookupDonorCoalition` output verbatim, and those
buckets carry the frozen ingest labels `"Small individual donors (under $200)"` /
`"Large individual donors ($200+)"` (`src/lib/server/donors.ts:335-360`) — while
`BALLOT_PROMPT.md:255` explicitly tells the model **not** to override tool labels. So prompt-vocabulary
edits alone leave `$200` rendering on chat surfaces; the plan would have passed its own verification
while still failing there. Fix deterministically, never via the LLM: map the funding-mix bucket labels
to the new display labels (or filter them, mirroring what `race-data.ts:248-249` does on the DB path)
inside `resolveLookupDonorTool` before serialization.

**`/methodology`** — the "Donor data comes from FEC + state filings" block at
`src/prototype/VoterChoiceApp.tsx:6159`. Add a _How we count donations_ paragraph that does name the
$200 FEC itemization threshold, states that corporations cannot donate directly, and explains that
industry buckets come from donor employer fields.

Tests to update: `src/lib/server/donors.test.ts`, `race-data.test.ts`, `RepCard.test.tsx`,
`src/lib/structured-blocks.test.ts` (fixtures at `:190-191`, `:518` carry the old labels),
`e2e/prototype-core.spec.ts`, `design-tokens.test.ts` if it snapshots copy.

> **Note for a later card, not this one:** "Small donors" still frames sub-$200 as the everyday
> baseline when the true median is $0. A percentile framing ("gave more than 97% of Americans")
> would be more honest but needs a defensible denominator — flag it, don't build it here.

---

## Part 2 — "No FEC data" diagnostic and fix

1. **Instrument the miss.** `donorFieldsFromResult` (`src/lib/server/race-data.ts:232-239`) collapses
   three distinct reasons into prose. Log the raw `reason` plus `(name, jurisdiction, stateCode)`
   server-side so we can count `candidate_not_resolved` vs `no_donor_data` in production.
2. **Measure it offline.** New read-only `scripts/ingest/_resolution-miss-report.ts`, modelled on
   `_coverage-by-layer.ts`: replay 2026 federal ballot names through `resolveCandidateId` and
   report which fail. Expected causes, from the tier logic at `alignment.ts:284-339`: mixed
   `[D-NJ]` state decoration in `candidates.full_name`, nicknames, suffixes, hyphenated surnames.
   **Replay corpus — resolved.** Replaying `candidates.full_name` through the resolver would
   trivially exact-match at tier 1/2 (`alignment.ts:284-288`) and measure nothing — misses happen
   on names _as rendered on ballots_, which differ from the FEC-derived stored names. The right
   corpus already exists: **`official_roster_candidates`** — the hand-transcribed Secretary-of-State
   rosters covering all 50 states for 2026 (`scripts/ingest/official-roster.ts`,
   `scripts/congressional-rosters/*-official-roster-2026.ts`). Those names are exactly how official
   sources spell candidates ("SMITH, JOHN A. JR." vs our "John Smith [R-TX]"), independent of the
   `candidates` table. The script replays roster `name` + state + office through
   `resolveCandidateId` and reports the misses. Step-1 production logging stays as the complement:
   it catches the LLM-ballot path, where user-supplied ballot text can spell names a third way.
3. **Fix the top classes**, and add a regression fixture per class. `resolveCandidateId` is already
   known to be latently vulnerable on the chat/ballot path — the earlier House mis-resolution fix
   only threaded the resolved id through delegation. **Precision guard, non-negotiable:** every fix
   class loosens matching in a function shared by donors, alignment and the chat tools, and a false
   positive shows the _wrong person's_ donor data — strictly worse than "no data". Each class ships
   with a never-resolve-when-ambiguous test (two plausible candidates → resolver returns null), not
   just a recall fixture.
4. **Honest copy for the real gap.** Where data genuinely is absent (state/local), the message
   should say _we don't have state filings for this office yet_, not imply the candidate filed nothing.

### Part 2 — executed 2026-07-23

Measured against all 1,884 2026 federal roster names, before → after:

|                                  | before  | after | note                                    |
| -------------------------------- | ------- | ----- | --------------------------------------- |
| recall (rows with a counterpart) | 88%     | 99%   | 1,209/1,370 → 1,270/1,285               |
| misses                           | 59      | 12    | remainder are correct refusals (below)  |
| **suspect mismatches**           | **102** | **3** | wrong person's data — the precision bug |

The three surviving "mismatches" are all the same person under two spellings ("Ashley Hinson" ↔
"Ashley Hinson Arenholz") — artefacts of the report's surname-level expectation, not resolver
errors. Effective false-positive rate is zero.

`official_roster_candidates.our_candidate_id` is **empty in production** (the crosswalk was never
backfilled), so the report derives its own expectation: a roster row has a _plausible counterpart_
when some `candidates` row in the same chamber shares its normalized surname without contradicting
its state. That is looser than the resolver by design — it can catch what the resolver misses — but
it means `miss` is an upper bound, not a defect count.

Fixed classes (each with a recall fixture **and** a never-resolve-when-ambiguous fixture in
`alignment.test.ts`):

- **Authoritative state.** The resolver read state only from the `[D-NJ]` name decoration, present
  on ~20% of federal rows, while `candidates.state` is populated on ~97% and, where both exist,
  never disagrees. Reading the column lets a wrong-state row be excluded — this alone killed most
  of the 102 mismatches, e.g. an Alaska ballot's "GOLDFARB" resolving onto a Goldfarb elsewhere.
  The decoration still only narrows, never rejects, since prod shows stale tags.
- **Generational suffixes.** `candidateNameParts` read "III" as the surname, so "FREDERICK D.
  HAYNES III" (TX) resolved onto "Rep. Nicholas Begich III [R-AK]". Suffixes are now stripped, and
  a comma that only introduces one ("Clyde W. Jones, Jr.") no longer flips as a sortname.
- **Bare surname prefix-matching a FIRST name.** Tier 4 matched the Arizona ballot's "Gordon" onto
  "Gordon Chaffin" and "James" onto "James M Brown". Single-token queries are surnames; they are
  tier 3's job, where the ambiguity guard applies.
- **Diacritics and mid-name honorifics.** "LAUREN B. PEÑA" ↔ "Lauren B. Pena"; FEC rows splice the
  filer prefix mid-name ("Clyde W Mr. Jones", "Stephen A The Hon Womack").
- **Middle names and hyphenated surnames**, via a first+last tier requiring an exact first-name
  match ("Michael Don Johnson" ↔ "Michael Johnson", "Sonia Kacker" ↔ "Sonia Devgan-Kacker").
- **One person stored twice.** Every sitting member exists as both `federal-<BIOGUIDE>` (votes
  ingest) and `fec-<FECID>` (FEC roster ingest) — and the two share `fec_candidate_id`. Collapsing
  on that column is the FEC's own identity key, not a name guess, and the incumbent row wins
  because it carries the voting record plus at least as many donor rows. This is the same
  voteless-duplicate hazard the earlier House mis-resolution fix worked around in `delegation.ts`.

Deliberately **not** fixed — the resolver is right to return null:

- Two FEC candidacies for one person with no shared id (Mark Harris's 2016 NC-9 and current NC-8
  filings). Needs person-level dedup in `candidates`, not a looser matcher.
- Genuinely different people sharing a surname and state (Robert Menendez Sr. and Rob Menendez Jr.;
  "Victor M. Arias" vs "Vincent Michael Arias").
- Nickname-only differences where the rows are also duplicates ("Bob Onder" ↔ "Robert Frank
  Onder"). Resolving these would require guessing between two people.

Also open: 123 of 629 federal incumbents have a null `fec_candidate_id`, so the duplicate collapse
can't reach them. That is an ingest backfill, tracked separately from this matcher work.

---

## Part 3 — Committee assignments

Source: **`unitedstates/congress-legislators`** — `committees-current.yaml` +
`committee-membership-current.yaml`. CC0 public domain, keyed by bioguide ID. The join basis is the
`federal-<BIOGUIDE>` candidate-id convention that `member-stats.ts` already uses
(`scripts/ingest/member-stats.ts:108-112`) — **not** `member_civic_positions`, which is Senate-only
(`db/schema.ts:968-972`) and cannot crosswalk the House. Cheapest correct source; almost certainly
where Integrity Index's committees page comes from too.

- Migration: `committees` (thomas_id, name, chamber, jurisdiction, parent_committee_id) and
  `committee_memberships` (candidate_id FK, committee_id FK, rank, title, congress).
- `scripts/ingest/committee-assignments.ts` — follow the `member-stats.ts` shape (bioguide join,
  upsert, `source` + `source_url`, idempotent).
- Read layer in `src/lib/server/` beside `alignment.ts`; surface on the seat card as
  _what this member has formal jurisdiction over_ — chair/ranking flagged, since that is the
  actual power lever.
- **Honest empty state for non-incumbents** (applies to Part 4 too): committees and cosponsorships
  exist only for sitting members — the large majority of ballot candidates have neither. The card
  must say _not currently a member of Congress, so no committee record_, not render a blank that
  implies missing data — the exact failure mode Part 2 step 4 exists to fix.

### Part 3 — executed 2026-07-23

Built and verified against prod (all 1,884-candidate scale, not a sample):

- **Migration `0018_add_committees.sql`** — `committees` (thomas_id PK,
  self-referencing `parent_committee_id`) + `committee_memberships`
  (candidate_id/committee_id/congress unique index). Applied to prod.
- **`scripts/ingest/committee-assignments.ts`** — fetches
  `committees-current.yaml` + `committee-membership-current.yaml` from
  `unitedstates/congress-legislators` via the GitHub Contents API
  (`accept: application/vnd.github.raw+json`), not raw.githubusercontent.com.
  `js-yaml` added as a new dependency (none existed in the repo). Live run:
  230 committees, 3,881 of 3,891 memberships upserted (10 skipped —
  no matching `candidates` row, logged not thrown). `--dry-run` and
  `--congress` override both supported; 8 unit tests on the pure
  parse/flatten/join functions.
- **`src/lib/server/committees.ts`** — read layer mirroring
  `member-stats.ts`'s shape: soft-degrades to an empty map on
  `DB_NOT_CONFIGURED` or query failure, joins a subcommittee row to its
  parent's name, sorts leadership seats first. Spot-checked against a known
  fact (Susan Collins chairs Senate Appropriations) — correct. 7 unit tests.
- **`delegation.ts`**: committees are looked up only for the resolved
  incumbents (`houseMember` + `rankedSenators`) — never for `challengers`,
  which by construction have never held the seat. Threaded through the API
  route (`...seat` spread, no route change needed) and `delegationData.ts`'s
  `ApiDelegationSeat`/`DelegationSeatVM`.
- **RepCard.tsx** — new "4 · Committee assignments" section, same numbered
  step chrome as Alignment/Money/Attendance. Chair/ranking surfaced via a
  title chip. Honest empty state distinguishes federal ("no committee record
  on file for this member yet") from state ("not tracked at the state
  level") — mirroring `AttendanceBand2`'s existing federal/state split,
  since `unitedstates/congress-legislators` has no state-legislature
  coverage. Screenshot-verified both the populated and empty states.
  Non-incumbent honest-empty copy ("not currently a member of Congress") is
  **not yet wired to any UI surface** — HeadToHead/challengers don't render
  committees at all today, matching the existing donor-data precedent
  (GAPS-AND-DATA-AUDIT.md §D7); the structural guarantee (committees are
  never looked up for a challenger id) is in place so that surface needs no
  changes once Part 4's challenger-committee crosswalk lands.
- i18n: `repCard.stepCommitteesKicker/Heading`,
  `repCard.committeesUnavailableFederal/State` added to both `en` and `es`
  blocks in `VoterChoiceApp.tsx`.

Verification: `npx tsc --noEmit` clean; `npm run lint` 0 errors; full
`npm test` — 3,639 passed (the only 3 failures, in
`capture-shared.test.ts`, are a pre-existing Playwright/sandbox artifact
unrelated to this change, confirmed by re-running outside the sandbox).
19 new/changed tests across `committees.test.ts`,
`committee-assignments.test.ts`, `delegation.test.ts`, `RepCard.test.tsx`.

---

## Part 4 — Collaborator network (cosponsorship)

Source: **Congress.gov API** `/bill/{congress}/{type}/{number}/cosponsors`. We already hold
`CONGRESS_GOV_API_KEY` and `CONGRESS_GOV_BASE_URL` (`.env.example`), and `crs-summaries.ts`
already has a working client against `api.congress.gov/v3`.

- Migration: `bill_cosponsors` (bill_id FK, candidate_id FK, is_original, date_cosponsored).
- `scripts/ingest/bill-cosponsors.ts` — reuse the `crs-summaries.ts` fetch/backoff helpers;
  backfill over the `bills` rows we already hold. **One real step the review surfaced:** `bills` has
  no structured congress/type/number columns — identity is packed into the id string
  (`"govtrack-hr1234-118"`) with `source` distinguishing `openstates` state bills that have no
  congress.gov counterpart (`db/schema.ts:198-232`). The backfill must parse ids and filter to
  federal before calling the API; `crs-summaries.ts` consumes already-structured
  `{congress, type, number}`, so this parsing is new work.
- Derived read: top same-party and top cross-party collaborators by shared-bill count, computed
  in SQL at request time (no derived table until it's slow).
- External benchmark: **Lugar Center–Georgetown Bipartisan Index** as a citable cross-check —
  cite it, don't ingest it.

### Part 4 — executed 2026-07-24

Built following Part 3's committee vertical slice (migration → ingest → read layer → delegation
thread → seat card → i18n → tests). `npx tsc --noEmit` clean; `npm run lint` 0 errors; full
`npm test` — 3,671 passed (the only 3 failures, in `capture-shared.test.ts`, are the same
pre-existing Playwright/sandbox artifact noted for Part 3, unrelated to this change).

- **Migration `0019_add_bill_cosponsors.sql` + `billCosponsors` schema** — `bill_cosponsors`
  (bill_id FK, candidate_id FK, is_original, date_cosponsored, source/source_url/fetched_at),
  unique index on (bill_id, candidate_id) plus per-bill and per-candidate indexes. Additive;
  **not yet applied to any DB** (ships in the PR, applied separately — trips the
  `security-reviewed` gate per Open Risk #4).
- **`scripts/ingest/bill-cosponsors.ts`** — backfills the participation of the federal bills we
  hold, both **sponsor and cosponsors**. Reads `bills WHERE source='govtrack'`, parses the packed
  id (`govtrack-hr1234-118` → {congress,type,number}, mirroring `federal-votes.ts`'s
  `parsePlannedBillId`), filters to federal before any API call. Per bill it fetches two
  Congress.gov endpoints — the bill detail (for the sponsor) and `/cosponsors` (paginated) — with
  the same key/backoff shape as `crs-summaries.ts`, maps bioguide → `federal-<BIOGUIDE>`, and
  upserts only members with a matching `candidates` row (FK-safe; others counted, not thrown).
  The sponsor is stored as a `role='sponsor'` row and excluded from the cosponsor rows so the
  `(bill_id, candidate_id)` unique key holds; the sponsor fetch **fails soft** (a flaky detail
  call never drops the bill's cosponsor edges). `--dry-run`, `--congress`, `--limit`; 21 unit
  tests on the pure parse/flatten/build/sponsor functions + pagination + the dry-run loop.
  **Dry-run validated against prod**: 626 federal bills found, parsed, filtered; both endpoints
  fire per bill and the sponsor path degrades independently of the cosponsor path (confirmed
  live). The full backfill needs `CONGRESS_GOV_API_KEY` in the environment (held per
  `.env.example`; absent from this local checkout — calls 403, handled soft).
- **`src/lib/server/collaborators.ts`** — reads `bill_cosponsors` as a **bill-participation**
  graph via a self-join computed in SQL at request time (no derived table, per the plan). The
  join is on `bill_id` irrespective of role, so it captures **sponsor↔cosponsor** edges (the
  strongest collaboration signal — a member's own sponsored bills now count) as well as
  cosponsor↔cosponsor. For each member: top same-party and top cross-party collaborators by
  shared-bill count, party letter taken from the same `[D-NJ5]` decoration the card already uses
  (FEC-code fallback), soft-degrading to an empty map on `DB_NOT_CONFIGURED` / query failure.
  11 unit tests. **One documented limitation**: the shared-bill count is unweighted (a
  widely-cosponsored resolution counts the same as a narrow bipartisan bill) — which is exactly
  why the card cites the Lugar Center–Georgetown Bipartisan Index as the rigorous benchmark
  rather than claiming a bipartisanship score.
- **`delegation.ts`**: collaborators looked up only for the resolved incumbents
  (`senators` + `houseMember`), never for challengers — same structural guarantee as committees.
  Threaded through the API route (`...seat` spread, no route change), `delegationData.ts`
  (`ApiCollaboratorNetwork` + VM field + buildSeats), and a `resolveDelegation` wiring test.
- **RepCard.tsx** — new "5 · Collaborators" section reusing Part 3's numbered-step chrome.
  Cross-party group leads (bipartisan reach is the interesting signal), each row a name +
  party letter + shared-bill count chip, with the Lugar citation footnote. Honest federal/state
  empty split mirrors `CommitteesBand`. **Screenshot-verified** both populated and empty states
  against the real `redesign2.css`.

  > ⚠️ **FE design NOT reviewed — treat RepCard §5 as provisional (Muxin, 2026-07-24).**
  > Written up for Design as `docs/design/2026-redesign/COLLABORATORS_BAND_DESIGN_HANDOFF.md`
  > (2026-07-25) — literal current markup/CSS/i18n, real prod networks to design against, and
  > the open questions below plus the departed-collaborator finding. Awaiting a design round.
  > The section was built to prove the data path end-to-end and self-vetted only for
  > code/render correctness; it has **not** had a design review and the layout/copy may be
  > reworked or dropped. Known open questions if/when it's revisited: (1) is a second
  > numbered step (now §5, pushing Money/Attendance down) the right information architecture,
  > or should collaborators live inside an existing section / behind a disclosure? (2) the
  > cross-party-first ordering and "Reaches across the aisle" framing is an editorial choice,
  > not a designed decision; (3) the raw "N bills" chip exposes the unweighted-count proxy
  > directly to the reader — a designed treatment might hide the number and show only rank,
  > or omit the metric entirely and lean on the Lugar link. **Do not treat this as shipped
  > design.** The data layer (ingest + read + schema) is the durable part; the FE is a
  > placeholder. See the corresponding note in `RepCard.tsx` at the `CollaboratorsBand`
  > component.

- i18n: `repCard.stepCollaboratorsKicker/Heading`, `collaboratorsCrossParty/SameParty`,
  `collaboratorsSharedBills`, `collaboratorsCite`, `collaboratorsUnavailableFederal/State`
  added to both `en` and `es`.

Note on the schema vs. the plan: the plan specced `bill_cosponsors (bill_id, candidate_id,
is_original, date_cosponsored)`. Storing cosponsors alone would have captured cosponsor↔cosponsor
edges only and silently understated collaboration with prolific sponsors (often chairs /
leadership — exactly the "power levers" the user's verbatim ask names). We added a `role` column
and the sponsor row to close that; the source is the same Congress.gov API we already use, so it
was an ingest extension, not a new source. This is the one deliberate deviation from the plan's
schema, made because the plan's own goal ("closest collaborators") required it.

Shipped to prod (2026-07-24, PR #456 merged):

- **Migration `0019` applied to prod** — `bill_cosponsors` live (9 columns incl. `role`).
- **Backfill run + verified** via `ingest-federal.yml` (dispatched on the branch, now on `main`
  so it runs every Sunday): `federal_bills=626 processed=626 cosponsors=11448 sponsors=626
rows=12073 skipped_no_candidate=0 failed=0`. Read-path spot-check against prod returned a
  sensible network for the busiest member (Claudia Tenney, R-NY24). Row counts confirmed:
  11,447 cosponsor + 626 sponsor = 12,073, across 626 distinct members. (The same workflow run
  showed a **pre-existing, unrelated** failure in the FEC candidate-roster step — FEC API 429
  rate-limit — not caused by Part 4; it self-retries on the Sunday schedule.)

Deliberately deferred (not this card): challenger collaborators (challengers never held the seat
— same precedent as challenger donor/committee data); a **weighted** collaboration metric (the
count is unweighted by design — Lugar is cited as the rigorous benchmark instead).

### Part 4 — follow-up: candidate-data fixes (DONE — shipped + backfilled 2026-07-25)

> **Executed 2026-07-24 — see "Part 4 follow-up — executed" below.** One of the two
> diagnoses below turned out to be **wrong on its root cause** (Defect A: Kiley's stored
> party was correct all along; the missing field was his _caucus_). The original text is kept
> verbatim as written, with the correction recorded in the executed section — the wrong
> diagnosis is the useful part of the record.

> The live backfill spot-check (2026-07-24)
> surfaced **two defects and one product question**. All three are **data-layer**, NOT the
> FE-design deferral noted above — the `bill_cosponsors` data itself is correct (12,073 rows
> verified); these are quality problems in the `candidates` table that this feature renders
> faithfully. Root causes below are confirmed against real prod rows, not inferred.

**Defect A — party mislabel → wrong same/cross-party bucket (correctness).**

- **Symptom:** Kevin Kiley rendered `(I)` and placed in a Republican member's **cross-party**
  ("Reaches across the aisle to") list — overstating that member's bipartisanship.
- **Root cause:** `candidates` row `federal-K000401` (GovTrack votes ingest) stores
  `full_name="Rep. Kevin Kiley [I-CA3]"` **and** `party="I"` — both wrong; Kiley is Republican.
  His FEC-derived row `fec-H2CA03157` stores `party="OTH"`. **No row we hold has his correct
  party**, so there is no internal source to cross-check against. `partyLetter()`
  (`src/lib/server/collaborators.ts`) is faithful to the stored value — the code is not the bug,
  the ingested data is.
- **Scope (630 federal incumbents):** party = REP 271 · DEM 257 · null 95 · I 3 · DFL 2 · UNK 1.
  Of the non-DEM/REP: King + Sanders (`I`) are correct Independents; Omar + Kelly Morrison
  (`DFL`, the MN Democratic-Farmer-Labor affiliate) and Risch (`UNK`) are currently saved only
  because their `[D-..]`/`[R-..]` **name decoration** resolves correctly in `partyLetter`; the 95
  `null` rows are former members (Defect B). **Kiley is the only genuinely-wrong _current_
  member** — but he is the proof that the party field is untrustworthy.
- **Fix (proposed):**
  1. Add an **authoritative party source**: ingest the `party` field from
     `unitedstates/congress-legislators` (`legislators-current.yaml` +
     `legislators-historical.yaml`), keyed by bioguide — the **same repo Part 3 already pulls
     committees from**, so the client/pattern exists. Prefer it over the GovTrack
     decoration/`party` column. This fixes Kiley and hardens the whole field.
  2. Harden `partyLetter` regardless: map `DFL→D` (and any other state-affiliate codes), and
     keep the **precision-over-recall** guard — when no authoritative source agrees, return
     `null` (drop from a bucket) rather than guess a side. A wrong bucket is worse than an
     omission (same principle as Part 2's resolver).
- **No schema change** (a party backfill is an `UPDATE` to `candidates`, additive-in-spirit).

**Defect B — mangled display names for former members (~95 rows).**

- **Symptom:** `2019-2024] David Trone [D-MD6` instead of `David Trone`.
- **Root cause:** 95 former members carry a **non-standard decoration**
  `[party-district, start-end]`, e.g. `federal-T000483` =
  `"Rep. David Trone [D-MD6, 2019-2024]"`, with structured `party/state/district` all NULL.
  `cleanCandidateName` (`src/lib/server/alignment.ts:253`) strips the trailing tag with
  `/\s*\[[A-Za-z]+-[A-Za-z]{2}\d*\]\s*$/`, which requires the bracket to close right after the
  district digit — the `, 2019-2024` defeats it, so the tag survives; then the **comma inside
  the bracket** trips the sortname comma-flip (`head="Rep. David Trone [D-MD6"`,
  `tail="2019-2024]"` → flip) → the garbled reorder. Confirmed by running the real function on
  the real string.
- **Scope:** ~95 rows, all matching the `[X-YY, YYYY-YYYY]` pattern (full id/name list was
  dumped 2026-07-24; regenerate with the scope query in the resume notes below). Every one
  renders mangled wherever it surfaces.
- **Fix (proposed):** broaden the trailing-bracket strip to tolerate arbitrary bracket contents
  at end-of-string (e.g. `/\s*\[[^\]]*\]\s*$/`) so `[D-MD6, 2019-2024]` is removed **wholesale
  before** the comma-flip logic runs (it already runs first — it just fails to match).
- **⚠️ CRITICAL — shared function:** `cleanCandidateName` is also used by `resolveCandidateId`
  (donor + alignment + chat resolution). The tight regex was deliberate (the Norcross `[d-nj1]`
  incident). Broadening it **must** be proven safe: re-run Part 2's
  `scripts/ingest/_resolution-miss-report.ts` before/after (miss + suspect-mismatch counts must
  not regress), and add `cleanCandidateName` unit tests for the comma-year form while confirming
  the existing cases still pass (sortname `Collins, Susan`; suffix `Jones, Jr.`; Norcross).

**Product question (needs a Muxin decision, not just a fix).** The 95 mangled rows are **former
members** (flagged `is_incumbent=true`) that appear in the collaborator graph legitimately — via
their 118th-Congress (2023–24) cosponsorships alongside sitting members. Even with names fixed:
should "Closest collaborators" surface departed members at all? Options: (a) include them
(historically accurate, but a former member reads oddly as a current "collaborator"); (b) show
them labeled "former"; (c) restrict the graph to the current congress or to current members.
Decide before the FE is un-deferred. (Separately: 95 former members carrying `is_incumbent=true`
is a broader data-hygiene smell — delegation resolution only dodges it because their
`state`/`district` are NULL, so they never match a live seat. Out of Part 4 scope, but worth a
look.)

**Resume recipe (read-only, run from repo root with `--env-file=.env.local`):**

- Reproduce both defects on the real rows:
  ```
  select id, full_name, party, jurisdiction, state, district, is_incumbent
    from candidates where full_name ilike '%kiley%' or full_name ilike '%trone%' order by id;
  ```
  then call `cleanCandidateName(full_name)` + `partyLetter(full_name, party)` on each.
- Re-list the Defect-B population:
  ```
  select id, full_name from candidates
   where jurisdiction in ('federal-house','federal-senate') and is_incumbent
     and full_name ~ '\[[^\]]*(,|[0-9]{4})[^\]]*\]' order by id;
  ```
- Party audit: `select party, count(*) from candidates where jurisdiction in
('federal-house','federal-senate') and is_incumbent group by party;`

**Done-when:** Kiley resolves to `R` and drops out of a Republican member's cross-party bucket;
Trone (and the other ~95) render clean names; `_resolution-miss-report.ts` shows no regression;
new unit tests cover both classes; collaborators spot-check on Tenney re-run clean.

### Part 4 follow-up — executed 2026-07-24

`npx tsc --noEmit` clean; `npm run lint` 0 errors; full `npm test` — 3,721 passed (the only 3
failures, in `capture-shared.test.ts`, are the same pre-existing Playwright/sandbox artifact
noted for Parts 3-4; re-run outside the sandbox they pass).

**Defect A — the diagnosis above was wrong, and the correction is the finding.** Kiley's stored
party is **not** an error. `unitedstates/congress-legislators` records his 2025-27 term as
`party: Independent, caucus: Republican` — and our own two rows agree with it independently
(GovTrack `[I-CA3]` / `party="I"`, FEC `party="OTH"`). Three sources, one answer: he really is
an Independent. So "no row we hold has his correct party" was false; every row had it.

The **symptom** was real, though, and so was the harm: a Republican who frequently co-sponsors
with Kiley read as "reaching across the aisle". The actual missing datum is **who he works
with**, not who he is. Exactly three sitting members are affected — Sanders and King
(Independent, caucus Democrat) and Kiley (Independent, caucus Republican).

Fix, per Muxin's call (2026-07-24) to keep the card honest on both axes:

- **Migration `0020_add_candidate_caucus.sql`** — one nullable `candidates.caucus` column.
  Additive, no index, no existing data rewritten. **Applied to prod.** NULL for everyone whose
  caucus matches their party, which is all but three rows.
- **`collaborators.ts` splits the two letters.** `partyLetter()` is what the card PRINTS;
  the new `caucusLetter()` is what the same-/cross-party split uses. Kiley still renders
  "(I)" while counting toward a Republican's _same_-party list. The rule is applied to the
  seat member too (via a small caucus lookup on the member ids), so Kiley's own card doesn't
  file every Republican as cross-party — the same overstatement, mirrored.
- **`partyLetter` hardened regardless**, as the original plan asked: it now reads the party
  column FIRST and the `[D-NJ5]` decoration only as a fallback (the decoration goes stale),
  maps `DFL`/`DNPL` → `D`, and keeps the precision guard — `OTH`/`UNK` return null and fall
  through rather than being read as Independent, because a wrong bucket is worse than an
  omission (Part 2's rule).

**Defect B — fixed, but the one-line fix the handoff specced was not sufficient.**
`cleanCandidateName`'s trailing-tag strip now matches any trailing bracket
(`/\s*\[[^\]]*\]\s*$/`) instead of the tight party-state shape, so `[D-MD6, 2019-2024]` is
removed wholesale **before** the comma-flip runs. "David Trone" renders correctly. Two guards
on widening a matcher shared by donors/alignment/chat: the strip is anchored to end-of-string,
and it is skipped when it would consume the whole name.

**That fix alone regressed the guard rail — `suspect_mismatch` 3 → 19.** The handoff
anticipated the risk and the before/after run caught it. Cause: the ~95 former-member rows were
effectively _hidden_ by their own mangled names. Cleaning the names made them matchable, and
because their `candidates.state` is NULL they matched unrelated ballot surnames — an Alaska
ballot's "JOHN B. WILLIAMS" resolving onto "Rep. Brandon Williams [R-NY22, 2023-2024]". Three
further changes were needed to land Defect B safely:

1. **`stateFromCandidateName` had the identical tight-bracket bug** — `/\[[A-Za-z]+-([A-Za-z]{2})\d*\]/`
   requires the bracket to close after the district digits, so it returned NULL for all ~95
   service-span names. Those rows were stateless to the resolver, which is what let them match
   anything. The anchor is dropped (the state is always the two letters after `[<party>-`).
   Part 2's authoritative-state work never reached these rows because of this.
2. **The decoration may now reject — for former-member records only.** Part 2's rule (a stale
   `[D-XX]` tag must never veto a match; the Norcross incident) is otherwise untouched, and its
   three tests still pass unmodified. A row whose stored name records a _completed_ term has a
   **final** state, not a stale one, which is what makes it the one safe exception.
3. **`preferSitting` tie-break.** Fixing (1) and (2) still cost a real match: a bare "Grijalva"
   on the AZ-7 ballot became ambiguous between Adelita Grijalva (sitting) and Raúl Grijalva
   (departed) — two different people, same surname and state, so the ambiguity guard refused
   both. A name on a 2026 ballot means the person holding the seat now. Applied as a tie-break
   only where a live alternative exists, so a former member still resolves to their own record
   when they are the only match.

**New ingest `scripts/ingest/member-party.ts`** — authoritative `party`, `caucus` and
sitting/former status from `unitedstates/congress-legislators` (CC0, no API key), the same repo
Part 3 pulls committees from, fetched the same way. Joins on identity keys only, never a name:
bioguide → `federal-<BIOGUIDE>` and every FEC id the source lists → `fec-<FECID>`. Party is
normalized to the FEC code vocabulary the column is documented to hold (`REP`/`DEM`/`IND`), not
the source's prose, because `races.ts` groups on the raw value. Never touches `full_name`,
`state` or `district`. `--dry-run` reports the real per-row diff; 24 unit tests. **Added to
`ingest-federal.yml`** — membership changes between runs, so this has to be scheduled, not
one-shot.

Live plan, verified against prod before applying (106 rows):

| change                                                                               | rows |
| ------------------------------------------------------------------------------------ | ---- |
| sitting members' party normalized                                                    | 6    |
| ↳ Sanders/King/Kiley `I`→`IND`, Risch `UNK`→`REP`, Omar + Kelly Morrison `DFL`→`DEM` |      |
| caucus set (Sanders, King, Kiley)                                                    | 3    |
| matching `fec-` rows' party normalized                                               | 4    |
| former members flipped `is_incumbent` true→false                                     | 96   |

**Third finding, not in the handoff: Lindsey Graham is no longer a sitting senator.** The
source has him in `legislators-historical.yaml` with his term ending **2026-07-11**; our row
still said `is_incumbent = true`. That is a real staleness bug the ingest fixes — and it
carried a regression the other 95 former members didn't, because **his row has `state=SC`,
`office=senate`, `election_year=2026` populated** while theirs are NULL. Flipping him to
`is_incumbent=false` would have dropped him straight into `races.ts`'s challenger query and
listed him as a **2026 South Carolina Senate challenger**. Guarded with `isMemberRecord()` in
`races.ts` (a `federal-<BIOGUIDE>` row is a member record, never an FEC filing, so it can
never be a challenger), mirroring the existing `isIncumbentFiler` exclusion, with a test.
⚠️ Worth a separate look: SC's delegation card will now show one senator.

**Product question — decided (Muxin, 2026-07-24): show former members, labelled "former".**
Option (b). Dropping them would silently shrink a member's real 118th-Congress network;
leaving them unlabelled reads as a current colleague. `Collaborator.departed` is threaded
from `candidates.is_incumbent` through `delegation.ts` → `ApiCollaborator` → `RepCard`, which
renders "David Trone (D · former)". New i18n `repCard.collaboratorsFormer` (en + es). The FE
remains **design-deferred** per the ⚠️ note above — this is a label on a provisional band, not
a design decision.

**Verification.** `_resolution-miss-report.ts` over all 1,884 roster names. Four runs, because
the first fix regressed and the report is what showed it:

|                      | before | B alone | +state/reject | +preferSitting (shipped) |
| -------------------- | ------ | ------- | ------------- | ------------------------ |
| hit                  | 1,270  | 1,270   | 1,267         | **1,270**                |
| miss                 | 12     | 12      | 15            | **12**                   |
| **suspect_mismatch** | **3**  | **19**  | 4             | **4**                    |

Shipped state: **recall exactly preserved** (hit and miss both unchanged), and the single
`suspect_mismatch` delta is a **correct** resolution the report cannot recognize — AL-1's
"Jerry Carl" now resolves to `Rep. Jerry Carl [R-AL1, 2021-2024]`, which is the same person
(he left in 2024 and filed again for 2026). The report derives its expectation from
`candidates.state`, which is NULL on former-member rows, so it sees "no plausible counterpart"
and flags a true match as suspect. Same class of artifact as Part 2's three surviving
"mismatches" (the Ashley Hinson spellings). Effective false-positive rate is still zero.

Two matches were also **dropped and not counted as losses above** because the report scored
them as hits: "Eric Garcia" (CA-21) was resolving onto Rep. Robert Julio Garcia and "Calvin
Lee" (CA-34) onto Erica Lee. Both were wrong people; they are now honest nulls. The report
calls them hits because its plausibility test is surname-level.

4 new resolver tests cover the classes above (former member in another state rejected; former
member in their own state still resolves; sitting preferred over predecessor; two sitting
members still refuse to disambiguate).

Shipped to prod (2026-07-25, PR #458 merged):

- **Migration `0020` applied** — `candidates.caucus` live.
- **Backfill run and verified.** All 106 planned rows written; a re-run now plans
  `party_updated=0 caucus_updated=0 incumbency_updated=0`, i.e. idempotent and complete.

Post-backfill verification against prod (read-only, all five Done-when criteria):

| check                                     | result                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Kiley out of a Republican's cross-party   | ✅ now in Tenney's **same**-party at 19 shared bills; her cross-party cutoff is 13, so he had been displacing a real Democrat |
| …while still displaying honestly          | ✅ renders `Kevin Kiley (I)`; Sanders/King likewise display `I`, bucket `D`                                                   |
| former members render clean               | ✅ `David Trone`, `Sherrod Brown`, `Lindsey Graham`; **0** mangled rows remain                                                |
| `is_incumbent` corrected                  | ✅ 0 former members still flagged sitting                                                                                     |
| collaborators spot-check (Tenney, R-NY24) | ✅ clean, and `David Trone (D · former)` renders labelled as decided                                                          |

Party distribution on sitting members is now **REP 271 · DEM 259 · IND 3** — the old
`null 95 / DFL 2 / UNK 1` values are gone.

**Still open / deferred:**

- **SC's delegation card now shows a single senator**, since Graham is correctly flagged
  departed (term ended 2026-07-11). Correct, but unreviewed — worth a look.
- 123 of 629 federal incumbents still have a null `fec_candidate_id` (carried over from Part 2).
- RepCard §5 remains **design-deferred** (see the ⚠️ note in Part 4 — executed). The "former"
  label is a label on a provisional band, not a design decision. The design ask is written up
  in `docs/design/2026-redesign/COLLABORATORS_BAND_DESIGN_HANDOFF.md`, which adds a finding the
  ⚠️ note predates: departed members are ~8.5× more likely to land in the cross-party "reaches
  across the aisle" list than the same-party one (191/1,793 rows vs 25/2,000), 159 of 400
  members show at least one, and for 15 members the **entire** aisle-reaching list has left
  Congress. That makes the section's headline claim a truthfulness question, not just a
  styling one. Nothing has come back from Design yet.

## Part 5 — Promise ledger + kept/broken scoring

The hard one, and the one with a real sourcing risk.

**Sourcing reality check.** The original research brief recommended the Library of Congress
Elections Web Archive as the promise corpus. It is **not usable as specced**: the bulk CDX data
package covers **2000–2016 only**. For 2026 the practical archive layer is the **Wayback Machine
CDX API** (free, public) against campaign-site URLs, plus:

- **`dwillis/congress-press`** (MIT) — already wired at
  `scripts/ingest/congress-press-rationales.ts`; same corpus capitolreleases.com scrapes
  ("four times daily from official House and Senate.gov press pages"). This covers promises made
  _in office_.
- **Ballotpedia Candidate Connection** — structured self-reported positions. Voluntary, so
  incomplete; **licence must be confirmed before ingest.**
- **Google Political Ads Transparency Center** (BigQuery, 2018→, 7-year retention) — promises
  made in paid ads.

**Schema:**

- `candidate_promises` — candidate_id, canonical_issue, sub_issue, promise_text, made_at,
  venue (`campaign_site` | `ad` | `press_release` | `questionnaire` | `debate`), source_url,
  archive_url, extraction_model_version, **promise_type** (`vote` | `introduce_bill` |
  `oversight` | `funding` | `outcome`), **conditions_deadline**. The last two implement the
  core anti-bias rule from Muxin's promise-tracking research: **the test for "kept" is declared
  at extraction time, before any outcome is known** — never chosen after seeing how things
  turned out. A promise with no falsifiable action, scope, or deadline is filtered at
  extraction as unverifiable rhetoric, not carried forward to be judged.
- `promise_actions` — promise_id, action_type (`vote` | `sponsorship` | `cosponsorship` |
  `amendment` | `committee_action`), ref to `votes` / `bills` / `bill_cosponsors`, direction.
- `promise_verdicts` — promise_id, verdict, rationale, evidence refs, adjudicator_version,
  adjudicated_at. **Verdict enum (signed off by Muxin 2026-07-23):** `kept` |
  `attempted_blocked` | `compromise` | `broken` | `not_yet_testable` | `not_yet_rated` —
  `attempted_blocked` means the member took the promised controllable action but other
  institutions stopped the outcome; `not_yet_testable` is a real adjudication (no relevant
  vote/deadline has occurred yet); `not_yet_rated` means not yet adjudicated, or contested
  (human annotators disagreed). The unit of evaluation is the
  **action the member plausibly controlled**: a House member who promised "vote against X" and
  did so has _kept_ the promise even if X passed; "no law materialized" is never by itself
  `broken`. This is the mirror image of the agenda-setting rule below — never credit an outcome
  they didn't drive, never blame an outcome they couldn't control.

**Pipeline:** extract promises (LLM over archived campaign pages + press releases) → link to
actions (deterministic issue-tag join over `issue_tags`, which already carries `stance_lens`) →
adjudicate (LLM, outcome-based like PolitiFact, not effort-based). Framing that matters for
public defensibility: **the LLM is not the judge — it is an evidence assembler applying a
published, versioned rubric** (the rubric requirement below). The rubric is the editorial
judgment we own; the model executes it and flags ambiguous cases for human review instead of
forcing a verdict. Start small: pilot on one state's House delegation (~20-50 members) for one
cycle before going nationwide.

**Because this is a scored verdict we own, it needs the same rigour as the bill tagger:**
a hand-labelled gold set and a scored oracle pass, mirroring
`scripts/ingest/_gold-oracle.workflow.js` / `scripts/ingest/_gold-sample.ts` /
`scripts/ingest/_subissue-gold-score.ts`. Ship no verdict to production until the gold pass clears.
Attribute _agenda-setting_ separately from _outcome_ — never credit a member for a law merely
because they introduced a similar bill. The Perplexity research pass sharpens this into a
three-label evidence standard worth adopting verbatim for `promise_actions`: **Activity**
(introduced/cosponsored/offered an amendment) vs **Advancement** (committee action, markup,
amendment adopted, floor consideration) vs **Outcome** (provision in enacted law) — a verdict may
only cite the highest label the official record actually supports.

**But note where the bill-tagger analogy breaks** (review finding): issue-tagging is a fairly
objective task; kept/broken is a contested judgment, and a single-annotator gold set quietly
reintroduces the exact bias Open Risk #3 warns about. To be clear about roles: the _adjudicator_
is the LLM that scores every promise in production; the _annotators_ are the humans who hand-label
the small gold set the adjudicator is graded against. Required beyond the tagger workflow: a
written adjudication rubric versioned alongside `adjudicator_version`, and a second human
annotator on the gold set (Muxin plus one other person — ideally someone whose politics differ)
with inter-annotator agreement reported next to the oracle score. Where the two humans disagree,
the promise is a genuinely contested case and belongs in `not_yet_rated`, not in the gold set.

**Bootstrap the gold set with labels humans already wrote.** Hand-labeled promise verdicts do
exist — PolitiFact's presidential promise meters (Obameter, Trump-O-Meter/MAGA-meter, Biden
tracker) and the academic Polimeter/Poltext project — and the adjudicator should be scored
against a sample of those _first_, as an external calibration pass against professional
fact-checkers' judgments before our own gold set is graded. Two hard limits on this shortcut:
(1) coverage — those corpora label **presidents and governments, not members of Congress**, so
they calibrate the _method_ but cannot substitute for hand-labeling our actual 2026
congressional promises (they shrink the gold set we must label ourselves; they don't eliminate
it); (2) licensing — PolitiFact ratings are Poynter's copyrighted editorial content; scoring
against them internally with citation is defensible, republishing their labels is not
(same confirm-before-ingest posture as Ballotpedia). Full Fact's promise-tracking research is
the methodology reference for the rubric itself.

**Two more states the pipeline must handle honestly:**

- _Zero promises found_ for a candidate is legitimate and must render as "no promise corpus for
  this candidate", never as a blank.
- Campaign sites change mid-campaign. Pick and record a canonical-capture policy (e.g. last
  Wayback capture before election day) — `archive_url` must point at the exact capture the
  promise was extracted from, or verdicts are unreproducible.

**Every verdict must show its evidence inline**: `not_yet_rated` is a legitimate, visible state,
never a hidden one.

### Part 5 — step 0 built 2026-07-25 (sourcing spike + rubric draft; NOT yet run)

Open Risk #1 says the campaign-site URL list "could gate Part 5 entirely — recommend a spike
before committing to the schema." This session built that spike and the rubric scaffolding.
**Deliberately NOT built: the schema.** Migration 0021 waits until the spike has run and the
corpus-ready number is known — committing `candidate_promises` first would invert the plan's own
sequencing.

- **`scripts/ingest/_promise-corpus-spike.ts`** — read-only, no schema, no writes. For each
  candidate on a pilot state's 2026 official roster (default TX: 38 House districts, inside the
  plan's 20-50-member pilot band): resolve to our `candidates` row (Part 2 machinery) →
  `fec_candidate_id` → the principal campaign committee's **FEC Form 1 `website`** via OpenFEC →
  Wayback CDX capture check with the plan's canonical-capture policy executable (last capture at
  or before election day). Nine outcome buckets from `unresolved` through `website_archived` (the
  corpus-ready headline number), with `social_media_only` split out because a Facebook-page
  "website" is a different extraction problem, and `website_no_captures` surfacing the
  Save-Page-Now-while-still-live action item. 29 unit tests on the pure URL/parse/policy
  functions; `npx tsc --noEmit` clean; lint 0 errors.
- **Source choice, recorded:** FEC Form 1 is a _filing_ — the committee declared its own URL, so
  it is evidence, not an inference, and joins on `fec_candidate_id` with no name matching (the
  same "a filing is evidence" standard Part 6a applies to `CONNECTED_ORG`). **Ballotpedia is not
  queried at all**, even by the spike — Open Risk #2's confirm-before-ingest posture applies to
  spike HTTP calls too. Wikidata P856 (CC0) is the designated fallback _only if_ Form 1 coverage
  disappoints, because it needs name-based entity resolution — exactly the false-match class
  Part 2 exists to control. Incidentally, the spike also measures how the known
  123-null-`fec_candidate_id` backfill gap (Part 2 leftover) bites Part 5: those rows land in its
  `no_fec_id` bucket.
- **`docs/PROMISE_ADJUDICATION_RUBRIC.md` (0.1.0-draft)** — the written, versioned rubric the
  plan requires alongside `adjudicator_version`, drafted so Muxin and the second annotator have
  a text to argue with rather than a blank page. Encodes: the signed-off verdict enum, the
  four-gate extraction test (committed actor / falsifiable action / determinable scope / testable
  window), declare-the-test-at-extraction, the controllable-action unit with the
  never-credit/never-blame mirror rule, the Activity/Advancement/Outcome evidence ladder, the
  ambiguity-escalation rules, and the two-annotator gold process with external calibration
  (PolitiFact/Polimeter) first. Ship-gate numbers (κ ≥ 0.70, ≥ 90% gold agreement, zero
  kept↔broken polarity flips) are **proposed, not settled** — flagged for sign-off.
- **API key note:** the spike reads `FEC_API_KEY`, falling back to `CONGRESS_GOV_API_KEY`
  (both are api.data.gov keys — same infrastructure), then `DEMO_KEY`; the resolution order is
  documented in the script header. The `.env.example` entry for `FEC_API_KEY` was deliberately
  left out of the step-0 PR — the CI security gate flags any `.env*` edit for human security
  review, which a comment-only change didn't warrant. Add it in the migration-0021 PR, which
  trips that gate anyway (Open Risk #4).

**Not run in this session** — the session's sandbox had no external network (OpenFEC, Wayback,
Wikidata and fec.gov all policy-blocked) and no `.env.local`, so the spike is built and
unit-tested but has produced no coverage numbers yet. It is one command from a dev machine:

```
npx tsx --env-file=.env.local scripts/ingest/_promise-corpus-spike.ts --state TX
```

**Next actions, in order:** (1) run the spike; (2) read the `website_archived` share and decide
whether Form 1 coverage carries the corpus or the Wikidata fallback/Ballotpedia-licensing paths
need opening; (3) Muxin reviews the rubric draft and picks the second annotator; (4) only then
commit the Part 5 schema (migration 0021) shaped by what the spike found. Pilot-state default is
TX — Muxin can override with `--state`.

---

## Part 6 — Which industries and companies actually back a candidate

New scope from Muxin's review of this doc: fixing the industry copy (Part 1) makes the buckets
honest, but the question she actually wants answered — _which industries and businesses support
this candidate_ — is currently unanswered anywhere in the product. The data exists, and most of
the plumbing is already in the repo.

**Where corporate-adjacent money is findable, per channel:**

| Channel                              | In candidate receipts? | Data source                                  | Status                             |
| ------------------------------------ | ---------------------- | -------------------------------------------- | ---------------------------------- |
| Individual donors by employer sector | Yes                    | FEC bulk `indiv` (employer field)            | Wired (`federal-sectors-bulk.ts`)  |
| Corporate/trade PAC → candidate      | Yes                    | FEC bulk `pas2` + committee master `cm`      | Wired for issue-PACs only — extend |
| Super-PAC independent expenditures   | **No**                 | FEC Schedule E (bulk IE file or OpenFEC API) | Not ingested — net-new             |

**6a — PAC money attributed to sponsor + industry.** `scripts/ingest/federal-issue-pacs.ts`
already consumes `pas2{cycle}.zip` (every committee→candidate contribution) joined to
`cm{cycle}.zip`, and its committee-master parse already extracts the exact fields needed:
`CMTE_TP`, `ORG_TP` (Corporation / Labor / Trade / Membership / Coop) and
`CONNECTED_ORG` — the sponsoring company's name (`federal-issue-pacs.ts:159-173`). Today those
fields are used only to classify _issue_ PACs via `src/lib/issuePacRules.ts`; everything else
collapses into the single unclassified "PACs" total (`federal-donors.ts:419-443`, the
`other_political_committee_contributions` aggregate). Build: a sibling ingest modelled on
`federal-issue-pacs.ts` that classifies committees by `CONNECTED_ORG` + `ORG_TP` into industry
buckets (reuse/extend the `_bucket-mapping.ts` employer→sector table so individual-employer
sectors and PAC-sponsor sectors use one vocabulary). This is the honest answer to "which
corporations support this candidate": the corporate-sponsored-PAC money, attributed to the
sponsor. Bulk path needs no API key (`_fec-bulk.ts` client is keyless).

Schema decision to take at build time: per-PAC identity currently survives only inside
`raw_metadata.committees[]` JSON on issue-PAC rows (`federal-issue-pacs.ts:291-300`). If the UI
should name top PACs/sponsors (it should), promote committees to a first-class table rather than
growing the JSON. Muxin's Perplexity research (independently) converges on the same shape and
names the real bottleneck — entity resolution, not data access: the table should be
`committee_id → PAC name → parent/sponsor → sector → evidence_url → confidence/status`, seeded
from FEC `CONNECTED_ORG` (which is a filing, i.e. evidence, not an inference) and expanded only
while the false-match rate stays acceptable. Start with the largest PACs; every sponsor
relationship carries its evidence link.

**6b — Super-PAC independent expenditures.** The doc's Context is right that IEs are absent from
candidate receipts — but they are public: FEC Schedule E, available as the bulk
independent-expenditure file or OpenFEC `/schedules/schedule_e/`, itemized per spender with a
**support/oppose** flag per candidate. (The `24A`/`24E` transaction types our issue-PAC ingest
deliberately drops at `federal-issue-pacs.ts:57,200` are this money.) Spender committee id joins
to committee master for sponsor/industry attribution. Net-new ingest, same `_fec-bulk.ts`
scaffold.

**Display rule, non-negotiable:** outside spending is _not_ the candidate's money and legally
cannot be coordinated with the campaign. It must render as its own "Outside spending about this
race" block — spent _for_ and _against_, never summed into the funding mix — or we misstate
campaign finance law on the surface whose whole point is precision.

**Explicitly deferred (from the Perplexity research pass), so nobody scope-creeps into them:**

- _Who funds the super PAC_ (its own Schedule A receipts, incl. corporate donors) is a third,
  distinct dataset. If ever shown, the only honest label is "funded a group that spent
  independently" — never attribute a super PAC's candidate-specific spending proportionally to
  its corporate donors.
- _Electioneering communications_ are a separate FEC category (ads naming a candidate without
  express support/oppose) — not IEs, not receipts. Out of scope for 6b.
- _Dark-money nonprofits_ need not disclose donors. Where an outside spender is a nonprofit, the
  honest render is "donors not publicly disclosed", not a blank — same principle as Part 2 step 4.

---

## Data hygiene — `2026-05-public.pgdump` verdict

Vetted 2026-07-23 (this was the open backlog card at `docs/operations/voter-choice-backlog.md:2793`):
**safe to delete.** The 9.8 GB file is the OpenStates monthly Postgres dump, downloaded to bypass
API 429s for the one-time state backfill (`.ai/work-packets/launch-openstates-bulk-ingest.md:17-26`).
Its only two consumers — `scripts/ingest/state-votes-from-dump.ts` and
`scripts/ingest/_summary-stream-filter.ts` — were one-shot backfills that completed, with results
durable in Neon; ongoing ingest is API-based (`scripts/ingest/state-votes.ts`); the file is
gitignored (`.gitignore:101`). Caveat: the exact May-2026 snapshot is unrecoverable after deletion
(a re-download would be a later month) — acceptable since all derived data is persisted. The 696 KB
sibling `2026-05-schema.pgdump` can go with it.

---

## Attribution — Integrity Index

Muxin wants a shout-out to <https://integrityindex.us> and explicitly does **not** want their data
pulled without permission. The site names no sources on its public pages; its scorecard is built
from four commitments (no corporate PAC money, stock-trading ban, ban lobbying, overturn Citizens
United), all of which are reconstructable from primary sources we already use or plan to use —
FEC, House/Senate financial disclosures, and Quiver Quantitative for stock activity (we already
have `member_stock_transactions` and `scripts/ingest/stock-transactions.ts`).

Action: add a credit line on `/about`, and separately email Nico
(<https://linktr.ee/stocking_the_capitol>) before touching anything of theirs.
`palewire/moneyinpolitics.wtf` is a campaign-finance jargon glossary — a good candidate to link
from the PAC gloss.

---

## Verification

- **Part 1** — `npm test` (donors, race-data, RepCard, structured-blocks); `npx playwright test
e2e/prototype-core.spec.ts`; then run the app and screenshot a federal seat card with a full
  breakdown (Cornyn or Nehls, both confirmed to have 2026 mix rows) to prove no `$200` renders
  anywhere and the corporations gloss reads correctly. A code-reading claim is not sufficient
  evidence for a visual change. **Plus the chat path** — the screenshot exercises only the DB path;
  also render a RACE_PATTERNS chat response for a funding-mix-bearing candidate and confirm no
  `$200` appears in the LLM output (this is the surface the review found the original checklist
  would have missed).
- **Part 2** — `npx tsx --env-file=.env.local scripts/ingest/_resolution-miss-report.ts` before
  and after; miss count must drop, and every fixed class needs a unit test. **Done** — see
  "Part 2 — executed" above. Watch `suspect_mismatch` as the guard rail: it must never grow, since
  a false positive renders the wrong person's money.
- **Parts 3-4** — ingest with `--dry-run` first, then a scoped live run; spot-check one member's
  committees against `clerk.house.gov/committees` and one bill's cosponsors against its
  congress.gov page.
- **Part 5** — gold-set score reported before any verdict is enabled; keep it behind a flag
  (`PROMISE_TRACKER_ENABLED`) in the `CAN2026_DISPLAY_ENABLED` pattern until Muxin signs off.
- **Part 6** — `--dry-run` first; spot-check one corporate PAC's attributed sponsor/industry
  against its fec.gov committee page, and one candidate's IE totals against the fec.gov
  independent-expenditure view for that race; assert in a unit test that IE amounts never enter
  `donor_aggregates` funding-mix math.

## Open risks

1. **Promise corpus coverage is unknown.** No campaign-site URL list exists in our schema today;
   sourcing it (Ballotpedia? FEC Form 2?) is unresolved and could gate Part 5 entirely.
   Recommend a spike before committing to the schema.
2. **Ballotpedia licensing unconfirmed.** Do not ingest until cleared.
3. **Scored verdicts are an editorial liability.** Muxin's own observation that Integrity Index
   skews toward one party applies to us the moment we render `BROKEN`. The gold set is the
   mitigation, and per-verdict evidence is non-negotiable.
4. **Migration + security gate.** Parts 3-6 touch `db/**`, which trips the required
   `security-reviewed` label gate.
5. **Part 2's offline miss report — resolved.** The replay corpus is
   `official_roster_candidates` (nationwide 2026 SoS rosters, already ingested); see Part 2
   step 2. Residual risk is only the LLM-ballot spelling variants, covered by step-1 logging.
6. **Gold-set annotator bias (Part 5).** A single annotator's kept/broken labels are the editorial
   bias of Open Risk #3 wearing a lab coat. Second annotator + agreement stats are part of the
   definition of done, not a nice-to-have.
7. **Part 6b framing liability.** Summing or visually mingling independent expenditures with
   candidate receipts would misstate campaign-finance law. The "outside spending" separation is a
   correctness requirement, enforced by test.

## Source appendix

Sources evaluated while writing this plan, with the verdict on each.

| Source                                       | Use                                           | Verdict                                                                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FEC `/candidates/totals/`, bulk files        | Funding mix, sectors                          | Already wired (`federal-donors.ts`, `federal-sectors-bulk.ts`)                                                                                                                                              |
| Congress.gov API v3                          | Cosponsors, amendments, committee activity    | **Adopt for Part 4** — key already held                                                                                                                                                                     |
| `unitedstates/congress-legislators` (CC0)    | Committee assignments                         | **Adopt for Part 3** — cheapest correct source                                                                                                                                                              |
| GovTrack API                                 | Votes, member stats                           | Already wired (`federal-votes.ts`, `member-stats.ts`)                                                                                                                                                       |
| `dwillis/congress-press` (MIT)               | In-office statements                          | Already wired (`congress-press-rationales.ts`)                                                                                                                                                              |
| capitolreleases.com                          | In-office statements                          | **Redundant** — same House/Senate press-page corpus as above; no API                                                                                                                                        |
| LoC US Elections Web Archive                 | Campaign promises                             | **Rejected** — bulk package is 2000–2016 only (browsable archive continues past 2016, but has no bulk access)                                                                                               |
| Wayback Machine CDX API                      | Campaign promises                             | **Adopt for Part 5** — but needs a campaign-URL list we don't have                                                                                                                                          |
| Ballotpedia Candidate Connection             | Self-reported positions                       | Candidate; **licence unconfirmed**                                                                                                                                                                          |
| Google Political Ads Transparency (BigQuery) | Promises in paid ads                          | Candidate; 2018→, 7-yr retention (earliest years already aging out)                                                                                                                                         |
| Lugar Center Bipartisan Index                | Cross-party benchmark                         | Cite, don't ingest                                                                                                                                                                                          |
| FEC bulk `pas2` + `cm` (committee master)    | PAC→candidate money, sponsor/industry         | Already wired for issue-PACs (`federal-issue-pacs.ts`); **extend for Part 6a**                                                                                                                              |
| FEC Schedule E (bulk IE file / OpenFEC API)  | Super-PAC independent expenditures            | **Adopt for Part 6b** — support/oppose flag per candidate                                                                                                                                                   |
| PolitiFact promise trackers                  | Methodology reference + calibration corpus    | Score adjudicator against their presidential labels as an external calibration pass (cite, never republish — Poynter copyright); their 2010 congressional GOP Pledge-O-Meter is the precedent worth reading |
| Polimeter / Poltext (academic)               | Promise-tracking methodology + labels         | Methodology reference; second calibration corpus (governments, not Congress)                                                                                                                                |
| Full Fact promise-tracking research          | Rubric design                                 | Reference for the adjudication rubric — progress = achievement of stated aim, primary sources                                                                                                               |
| OpenSecrets                                  | Money context, PAC→parent/industry enrichment | Secondary to FEC; **public API shut down April 2025** — manual/reference use only; licensing of bulk data unconfirmed                                                                                       |
| FollowTheMoney                               | State-level campaign finance                  | Future — for the state/local gap, never for federal                                                                                                                                                         |
| Quiver Quantitative                          | Stock activity                                | Already wired (`stock-transactions.ts`)                                                                                                                                                                     |
| integrityindex.us                            | —                                             | **Do not scrape.** Credit + ask permission                                                                                                                                                                  |
| ProPublica Congress API                      | —                                             | Dead                                                                                                                                                                                                        |

---

## Review log

**2026-07-23 — adversarial review** (fresh-eyes agent over the plan alone, every checkable claim
verified against the codebase), plus two scoped investigations (pgdump usage; PAC/IE data
availability). Muxin's two Perplexity research docs were cross-checked against the Source appendix
in a follow-up pass: they independently converge on the same source stack (FEC primary,
Congress.gov, official committee rosters, Lugar as benchmark) and contributed the entity-resolution
table shape and attribution rules in Part 6, the Activity/Advancement/Outcome standard in Part 5,
the OpenSecrets-API-is-dead and FollowTheMoney appendix rows, and Part 6's deferred-scope list
(super-PAC donors, electioneering communications, dark-money nondisclosure). Their GitHub survey
also confirmed no existing open-source project delivers the corporation→PAC→candidate chain —
building it ourselves is the only option. A third research doc (promise-tracking judgment)
contributed Part 5's declare-the-test-at-extraction rule, the controllable-action unit of
evaluation with the recommended `attempted_blocked` verdict, the LLM-as-rubric-applier framing,
the one-state pilot, and the PolitiFact/Polimeter calibration-corpus bootstrap for the gold set.

Mechanical fixes applied in this revision:

- **Chat-path label leak** — the highest-leverage find: `resolveLookupDonorTool` serializes
  `(under $200)` labels the prompt forbids the model to override. Part 1 now requires a
  deterministic mapping, and Verification gains a chat-path check.
- `BALLOT_PROMPT.md` example JSON blocks (`:235`, `:241`, `:427-428`) added to the edit list.
- Line-number corrections: `pacGlossDefinition` `:833` (was `:836`), `industryAgenda` `:858`
  (was `:826`); gold scripts live under `scripts/ingest/`; "~40 state ingests" → 53.
- Part 3 join basis corrected — `member_civic_positions` is Senate-only; use the
  `federal-<BIOGUIDE>` id convention from `member-stats.ts`.
- Part 4 gains the bill-id parsing step (`bills` ids are packed strings, mixed with state bills).
- Sub-$200 "no detail in any filing" claim softened — conduit committees (ActBlue/WinRed) itemize
  all sizes; threshold is a cycle aggregate, not per-donation.
- `structured-blocks.test.ts` added to the Part 1 test list; `BALLOT_PROMPT_ES.md` verified as
  carrying no $200 vocabulary.
- Non-incumbent empty states (Parts 3-4), resolver precision guard (Part 2), gold-set second
  annotator + rubric and Wayback canonical-capture policy (Part 5) added as requirements;
  judgment-level versions recorded as Open Risks #5-7.

Verified correct and left as-is: all Part 1 `VoterChoiceApp.tsx` and `translations.ts` citations
(en and es), the `donor_aggregates.bucket_label` ingest-contract claim and `race-data.ts:248-249`
filtering, `alignment.ts` tier logic and cited failure classes, `federal-donors.ts:414-431`,
Congress.gov key presence and `crs-summaries.ts` client, `congress-legislators` filenames + CC0,
the §30118 corporate ban and §30104(b)(3)(A) itemization threshold, the security-gate risk, and
the flag-pattern analogy. Not verifiable from the repo (re-check at implementation time): the prod
coverage table, Cornyn/Nehls 2026 mix rows, the median-donor statistics, Ballotpedia licensing.

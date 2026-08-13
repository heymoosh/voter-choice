# Donor-bucket framing + candidate accountability data — plan

> Status: **plan, adversarially reviewed 2026-07-23** — mechanical fixes applied, open
> judgment calls recorded in Open risks (see Review log at the end).
> **Parts 1, 2, 3 and 4 are built and shipped to prod** (see the "Part N — executed" notes),
> including Part 4's candidate-data follow-up (backfilled + verified 2026-07-25) and the
> 2026-08-06 audit follow-up that closed three gaps an independent vet of Parts 1–4 found
> (see "Audit follow-up — executed"; it also records which findings are deliberate deferrals,
> so they don't get re-raised).
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

### Audit follow-up — executed 2026-08-06 (independent Codex vet of Parts 1–4)

An independent audit (Codex, run against `origin/main`, scoped to Parts 1–4 + the Part 4
follow-up) returned PARTIAL on every part. The user-facing paths all traced end to end; the
findings were at the edges. Three were real and are now fixed, three are not defects.

**Fixed:**

1. **Committee assignments were never refreshed on a schedule.** `.github/workflows/ingest-federal.yml`
   ran the votes, cosponsor, member-party and FEC-roster jobs but not `committee-assignments.ts`,
   which was manual-only (`npm run db:committee-assignments`). Now a scheduled step, ordered after
   member-party (which refreshes the `federal-<BIOGUIDE>` rows the membership join needs).
2. **Committee memberships could only ever grow.** The ingest upserts, so a member who left a
   committee kept rendering on their card forever. It now reconciles: after a successful run it
   deletes the ingested congress's memberships the source no longer lists.

   The reconciliation deletes by **explicit key, never by timestamp** (`computePruneScope`). The
   first cut of this fix pruned "anything not touched this run" via `fetched_at`, and a re-audit
   caught three ways that destroys real data: a membership the run SKIPPED (no `candidates` row,
   or a committee missing from the YAML) is indistinguishable from one the source dropped; the
   upserts stamp `now()` on the DATABASE clock while a run marker is the APPLICATION clock, so a
   database even slightly behind the runner makes just-written rows look deletable; and a
   part-failed upsert loop leaves the remainder looking untouched. The prune is therefore bounded
   to `refreshedMemberIds × fetchedCommitteeIds` minus the keys actually written — it can only
   remove a committee seat from a member this run successfully refreshed, on a committee this run
   saw. Everything uncertain stays.

   Four further guards: scoped to the one ingested congress, never on `--dry-run`, and two
   floors. `MIN_MEMBERSHIPS_FOR_PRUNE` (100) is measured against the fetched row count, not the
   count surviving the join — a broken join is exactly the case where the filtered number shrinks,
   so gating on it would let a half-resolved run authorise its own deletions. `MIN_MEMBERS_FOR_PRUNE`
   (100) is measured on DISTINCT members refreshed, and exists because the row floor alone has a
   hole a third audit pass found: one real membership plus 99 rows for members we hold no
   `candidates` row for clears a 100-**row** floor, and that one member's other committees then
   read as departures. Stale is a smaller lie than "this member has no committees".
   `membershipsDeleted` is in the run counts.

   **Before the scheduled prune is trusted, preview it.**
   `npx tsx --env-file=.env.local scripts/ingest/committee-assignments.ts --preview-prune`
   upserts as normal and PRINTS the rows the reconciliation would delete, deleting nothing.
   `--dry-run` cannot serve this purpose — it skips the upserts too, so there is no prune set to
   report. Run the preview once against prod and eyeball the count: a handful of genuine committee
   changes is expected; a large number means something is wrong and you have caught it before it
   destroyed data rather than after. The preview and the real delete share one predicate builder
   (`pruneFilter`) so they can never disagree.

   **Known limitation, accepted.** Two classes of row are never pruned: a committee DISSOLVED
   (dropped from `committees-current.yaml`) falls outside `fetchedCommitteeIds`, and a member who
   left Congress entirely is never refreshed. Both follow from the same thing the prune is built
   around — we cannot tell "gone from the source" from "not fetched this run". Consequence: a
   dissolved committee can keep rendering on a sitting member's card until someone clears it by
   hand. A departed member's rows are normally invisible, since delegation only resolves
   `is_incumbent = true`. Fixing the first properly means committee-lifecycle reconciliation
   (tombstoning committees, not just memberships) — a larger change than this ingest, and worth a
   card if a dissolved committee is ever actually observed on a card.

3. **The card ignored the very party column this follow-up backfilled.** `resolveDelegation` derived
   the seat member's own party from the `[D-NJ6]` name decoration and `rawMetadata`, never
   `candidates.party` — the field made authoritative here precisely because the decoration is stale
   on rows the backfill corrected. The card therefore contradicted its own collaborators band, which
   has read the column since it shipped. Worse, `[DFL-MN5]` matches no single-letter code, so
   Minnesota's DFL members displayed **no party at all**. Party precedence is now
   `candidates.party` > decoration > rawMetadata, reusing `partyLetter` from `collaborators.ts` so
   both surfaces share one closed list of party codes.

**Not defects — do not re-raise:**

4. **Challenger committees and challenger collaborators are deliberate deferrals**, recorded above
   ("Non-incumbent honest-empty copy… not yet wired to any UI surface" and "Deliberately deferred
   (not this card): challenger collaborators"). Challengers have never held the seat, so they have
   no committee seat and no cosponsorship record; the structural guarantee that neither is ever
   looked up for a challenger id is in place. Building those surfaces is a product-direction change,
   not a gap fix.
5. **`$200` sub-labels surviving in `design-handoff/design-session/screens-results.jsx` and
   `docs/design/.../prototype-components.jsx`** are frozen design-handoff snapshots. They are `.jsx`,
   outside the tsconfig `include` (`**/*.ts`, `**/*.tsx`), and imported by nothing under `src/` — so
   they never reach a user. Editing them would corrupt the design source of truth we diff against.
   The only `$200` in the running app is on `/methodology`, which is what Part 1 decided.
6. **Prod row counts, backfill totals and resolution rates are unverifiable from code**, by
   construction — they need a live DB. The verification tables above record the runs that produced
   them; re-running `scripts/ingest/_resolution-miss-report.ts` against prod is the only way to
   re-confirm.

Tests added (12): four on the prune's behaviour (prunes / skips on a thin source / skips when the
source is healthy but nothing joined / never on dry-run), five on `computePruneScope` — one per
bound the re-audit showed was load-bearing — and three on party sourcing (column beats a stale
decoration; DFL resolves where the decoration can't; falls back to the decoration when the column
is empty or `UNK`).

Two further targeted audit passes ran against the fix branch. The second verified each of the six
original findings: RESOLVED on the scheduling and party-sourcing fixes, all three not-a-defect calls
confirmed, and the first prune implementation rejected — which is why the keyed version above
exists. The third audited only the rewritten prune: it confirmed the clock-skew hazard was
structurally gone and found no SQL defect, and produced the row-floor hole and the
permanent-staleness limitation now recorded above.

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

### Part 5 — step 0 spike RUN 2026-08-07 (TX; verdict: Form 1 carries the corpus)

Muxin ran the spike from her dev machine (prod `DATABASE_URL`, real `FEC_API_KEY`). Getting a
clean pass took three attempts, both operationally instructive: DEMO_KEY's hourly budget dies
after ~8 candidates (65% `fec_api_error` — a real api.data.gov key is mandatory, not a
nicety), and Wayback's CDX API throttles hard at the spike's default 4-way concurrency (32%
`wayback_error`); the clean run used `--concurrency 1` and took on the order of tens of
minutes. Final table (`--state TX`, 111 roster candidates, 2026 House):

| bucket                | n   | share |
| --------------------- | --- | ----- |
| `website_archived`    | 55  | 50%   |
| `website_no_captures` | 2   | 2%    |
| `no_website_on_file`  | 14  | 13%   |
| `unresolved`          | 36  | 32%   |
| `wayback_error`       | 4   | 4%    |

Campaign URL on file (any kind): 61/111 (55%). Corpus-ready: **55/111 (50%)**.

**Decision (step 2 above): GO — Form 1 + Wayback carries the pilot corpus.** The layered
read: of the 75 candidates the FEC could see, 73% are corpus-ready; of the 61 with a real URL
on file, 96% of those whose CDX lookup succeeded have in-window captures — "URL exists but
archive is empty" is nearly nonexistent (2 cases). 35 of 38 TX districts have at least one
corpus-ready candidate (19, 30, 32 pending the 4 `wayback_error` retries), and every
major incumbent came back with deep capture history (Cuellar 47 captures, Escobar 46,
Sessions 45, Casar 43, Castro 41, Allred 37…). The Wikidata P856 fallback stays closed; no
Ballotpedia dependency (it was never queried).

Findings to carry into the pilot build:

- **`social_media_only` = 0 and `no_fec_id` = 0** — the Facebook-page-as-website problem did
  not materialize in TX, and the 123-null-`fec_candidate_id` backfill gap did not bite (its
  members aren't on the 2026 ballot as challengers resolve differently).
- **`unresolved` (36, 32%) is the second-biggest bucket and it is ours to explain**, per the
  zero-promises-is-legitimate rule: names are almost all minor-party/independent filers,
  consistent with sub-$5k candidacies that never file with the FEC (no row can exist), but
  the split vs. genuine Part 2 name-match misses must be measured
  (`scripts/ingest/_resolution-miss-report.ts`) before the pilot ships.
- **One probable Part 2 false match surfaced:** TX-18 "VALENCIA LANA WILLIAMS" and TX-23
  "VERONICA WILLIAMS" both resolved to the same committee website
  (`veronicagwilliams.com`, identical capture set) — exactly the misattribution class the
  promise ledger cannot tolerate (promises extracted from one candidate's site credited to
  another). Verify and fix the TX-18 resolution before extraction runs.
- **Save-Page-Now action items:** Keith Self (TX-03, `selfforcongress.com`) and William
  Taggart (TX-38, `wiliamtaggart.org`) have live sites with zero captures. Worth also
  proactively SPN-ing all 61 on-file URLs to pin fresh pre-election captures while sites are
  live — cheap insurance for the canonical-capture policy.
- **Operational settings for future spike/extraction runs:** real `FEC_API_KEY` (1,000
  req/hr), Wayback CDX at concurrency 1 with the existing backoff.

A follow-up `--json` run (same day) resolved every remaining ambiguity. Wayback errors are
fully transient — unioning capture successes across runs, **58 of the 61 URL-holding
candidates (95%) have verified in-window captures**, and the only 3 without captures all have
live sites (Self TX-03, Taggart TX-38, plus Ronny Jackson TX-13, whose CDX lookup succeeded
with a true zero) — i.e. after a Save-Page-Now pass the archive rate for site-having
candidates is 100%. Union corpus-ready: **58/111 (52%)**; by group: incumbents 21/25 (84%,
→ 23/25 after SPN; the last two, Menefee TX-18 and Gill TX-26, filed no website on Form 1
but are sitting members fully covered by the press-release venue), major-party nominees
~55/76 (72%), minor/independent 3/35 (9%). Districts 19, 30, and 32 are now confirmed
real gaps, not artifacts: all are races where no nominee filed a Form 1 website (open-seat
races with no incumbent on the ballot), reachable only via the ads/questionnaire venues.
The JSON also **confirmed the Williams false match by id**: the TX-18 "VALENCIA LANA
WILLIAMS" row carries `candidateId fec-H6TX23299` — the TX-23 Veronica Williams candidate.
(Other cross-district `fec_candidate_id`s in the output — Castro `H2TX35011`, Allred
`H8TX32098`, Cuellar `H2TX23082`, Sessions `H2TX03126`, Babin `H6TX02079`, etc. — are NOT
errors: FEC candidate ids permanently encode the first district a candidate ever filed for.)

This unblocks step 3: the rubric draft (`docs/PROMISE_ADJUDICATION_RUBRIC.md`, 0.1.0-draft)
now goes to Muxin for threshold sign-off (κ ≥ 0.70, ≥ 90% gold agreement, zero kept↔broken
polarity flips — proposed, not settled) and the second-annotator pick. Migration 0021 (step 4)
remains gated behind that review, shaped by the findings above.

**Steps 3–4 executed 2026-08-12.** Rubric signed off at 1.0.0 (thresholds ship as initial
defaults, revisable pre-gold-pass; second annotator: Muxin's husband, differing-politics
criterion deferred with a third-spot-check mitigation recorded — see the rubric change log).
Migration 0021 (`candidate_promises` / `promise_actions` / `promise_verdicts`) written per
this Part's spec with idempotency built in (deterministic extractor-computed promise PK;
`NULLS NOT DISTINCT` link unique). Two decisions recorded from Muxin, same date: **(1) no
paid licensing for any promise-venue source** — free/public-record routes only; **(2) the
small-candidate coverage gap (the 32% `unresolved` bucket, mostly no-FEC independents) stays
on the roadmap as post-pilot venue expansion, not a pilot blocker**: free-terms inquiries to
Project Vote Smart and Ballotpedia, state voter-guide candidate statements where they exist
(official, license-free — though not TX), and state-filing website fields, in that order,
with a one-day coverage check of the unresolved names against whichever source answers
first. Next engineering after 0021 merges: the extraction pipeline (step 0 of the plan's
extract → link → adjudicate sequence) over the 58 corpus-ready TX captures.

**Extraction pipeline built 2026-08-12** (`scripts/ingest/promise-extract.ts`; 0021 applied
to prod the same day). Consumes the spike's `--json` output as its corpus manifest, fetches
each candidate's exact canonical capture plus a bounded set of same-site issue pages replayed
at the same timestamp (`archive_url` records the exact capture Wayback actually served, after
its own redirects), and extracts with Claude (claude-sonnet-5 — accuracy over cost on a
58-candidate corpus, since a mistake here is a false attribution) against the rubric's §1
four-gate test with the declared-test fields (`promise_type`, `conditions_deadline`) required
per promise. Two hard rails beyond the prompt: **a post-hoc verbatim gate drops any extraction
whose quote does not literally appear in the fetched page text** (the anti-hallucination /
no-false-attribution rule made mechanical), and the deterministic PK contract from the 0021
comment is implemented as specced (sha-256 over candidate_id + archive_url + normalized text),
so re-runs upsert instead of duplicating. Operational posture inherited from the spike:
fail-soft fetch, `--concurrency 1` default, resumable (already-extracted candidates skipped
per `extraction_model_version`; targeted-only `--force`). Run order from a dev machine:
spike `--json > spike-tx.json` → `promise-extract.ts --corpus spike-tx.json --dry-run` (read
the would-upsert lines) → same command without `--dry-run`. NOT yet run — writes wait for
Muxin to run it. After the corpus is in: linking (`issue_tags` join → `promise_actions`) and
the adjudicator with external calibration + the gold-set process (rubric §6). Everything
stays invisible to users until `PROMISE_TRACKER_ENABLED` plus the ship gate.

**Linking pipeline built 2026-08-12, same session** (`scripts/ingest/promise-link.ts` —
stage 2 of extract → link → adjudicate). The issue-tag join is deterministic as planned
(candidate's votes and (co)sponsorships on bills carrying the promise's `canonical_issue`;
YEA takes the bill's `stance_lens` side, NAY flips it, a name on a bill takes the bill's
side; present/absent/not_voting are never directional evidence). One input the plan's
"deterministic join" phrasing glossed over: `direction` (toward/against) needs the
**promise's own side** of the pole axis, which lives in its text — resolved with a bounded
Haiku classification per promise against the SAME `renderTaggerPoleBlock()` vocabulary the
bill tagger consumes (the two cannot drift), with **"unclear" → zero links + logged for
human review** (rubric §5's no-guessing rule applied at the linking layer). Full provenance
in `link_method` (`issue_tag_join+promise-pole-v1+<model>`). Evidence level is deliberately
conservative: every linker row is `activity`, the lowest rung — advancement/outcome upgrades
require per-action bill-status proof and belong to a future enrichment pass; under-labeling
only makes verdicts more cautious. Zero linked actions is the expected, honest state for
challengers (no official record → `not_yet_testable` territory). Run after extraction:
`npx tsx --env-file=.env.local scripts/ingest/promise-link.ts --dry-run`, then without the
flag. Remaining stage: the adjudicator (rubric §4-§6, external calibration + gold set).

**Adjudicator built 2026-08-12, same session** (`scripts/ingest/promise-adjudicate.ts` —
stage 3, completing extract → link → adjudicate; first corpus rows landed in
candidate_promises the same evening: 14 promises across 6 TX candidates). Two paths, one
rule order: **(1) deterministic §4.1** — the default window is the term being sought
(2027-01-03 → 2029-01-03), and before it opens no promise can be kept or broken, so every
2026 verdict is `not_yet_testable` computed in code, with current-term linked actions
recorded as context, not judged; **(2) LLM adjudication** (dormant until the window opens)
— Sonnet executes the rubric's §4 rule order against the pre-declared test and the linked
actions, with three mechanical rails: cited evidence ids must be a subset of the promise's
own promise_actions rows (fabricated evidence downgrades to `not_yet_rated` with the
violation recorded), unknown verdicts/thin rationales downgrade the same way, and any
kept/broken-class verdict citing zero evidence is refused. `adjudicator_version` =
`rubric-1.0.0+adj-v1+<model>`, pinning the rubric version per its own versioning rule;
re-adjudication under a new version inserts new rows (history preserved). Verdict rows are
internal until the §6.4 ship gate (gold pass + `PROMISE_TRACKER_ENABLED`). What remains for
Part 5 is process, not pipeline: the §6 gold-set machinery (external calibration sampling,
annotator export for Muxin + husband, κ/agreement scoring mirroring
`_subissue-gold-score.ts`) and the UI surface behind the flag.

### Part 5 — pipeline RUN to completion 2026-08-12/13 (TX; ledger populated on prod)

Muxin ran all three stages from her machine the same night the code merged. Final state on
prod, all behind `PROMISE_TRACKER_ENABLED`:

- **Corpus: 29 promises across 9 TX candidates** (Hunt 1, Mealer 1, Goldman 1, Nehls 2,
  Herrera 8, Hart 1, Hockett 5, Hale 7, Early 3), each a verbatim quote pinned to its exact
  Wayback capture, test declared at extraction. Every candidate with promises is a
  **challenger** — all 2026 incumbents' campaign homepages came up empty of gate-passing
  commitments (donate/bio shells; their record is their pitch). Total extraction spend
  across all runs ≈ $1.60. Spike corpus was 48 archived of 111 (a Wayback-throttled day —
  20 `wayback_error` convert on later re-runs; the extract's per-candidate resume makes
  top-up passes free of rework).
- **Links: 0 rows, honestly.** 24/29 promises belong to candidates with no congressional
  record; **5/29 flagged `unclear_side`** and refused links (term limits, gerrymandering
  ban, cartel FTO designation, two AI-governance promises — all genuinely orthogonal to
  their issues' pole axes; the no-guessing rule §5 applied at the linking layer).
- **Verdicts: 29 × `not_yet_testable`**, all via the deterministic §4.1 path (window
  2027-01-03 → 2029-01-03 not open; zero model calls). The LLM path stays dormant until
  the 120th Congress convenes.

**Gold-set machinery built 2026-08-13** (`_promise-gold-sample.ts` + `_promise-gold-score.ts`,
mirroring the bill tagger's gold workflow as Part 5 requires). Two rounds, matching what is
honestly labelable when: **Round 1 "extraction"** (available now) — both annotators
independently validate the corpus itself against the archived captures (is each stored quote a
genuine four-gate promise? right issue? right declared test?), scored with per-question
agreement + Cohen's κ, disagreements listed as contested extractions whose fixes flow into
extractor prompt revisions, never silent row edits; **Round 2 "verdict"** (meaningful once the
window opens 2027-01-03) — the §6 gold set proper: BLIND worksheets (adjudicator verdict never
shown), human-pair κ, and the computed §6.4 ship gate (κ ≥ 0.70 AND adjudicator ≥ 90% on
human-agreed gold with zero kept↔broken polarity flips; contested cases → `not_yet_rated`,
excluded per §6.3). Worksheets are per-annotator CSVs generated by the sample script; the
independent-labeling rule (§6.2 — same-household annotators) is printed on the artifacts
themselves. Run order: `_promise-gold-sample.ts` → each annotator fills their own CSV without
conferring → `_promise-gold-score.ts --round extraction --a <fileA> --b <fileB>`.

**Decision (Muxin, 2026-08-13): calibrate on labeled history, then ship a RETROSPECTIVE
ledger — don't wait for 2027.** Two-step path, replacing "verdict gold waits for the 120th
Congress" as the near-term plan:

1. **External calibration first** (rubric §6.1, already specced): score the adjudicator's
   LLM path against PolitiFact presidential-meter / academic Polimeter cases — real
   promises with completed, professionally-labeled outcomes. "Training" here means
   iterating the rubric + adjudication prompt (versioned `adj-vN` bumps), NOT fine-tuning
   a model — every revision stays auditable. PolitiFact labels are Poynter's copyright:
   internal scoring with citation only, never republished. Build: a calibration harness
   that takes a CSV of external cases (promise text, evidence summary, professional label
   mapped onto our enum) and reports agreement/κ/polarity-flips per adjudicator revision.
2. **Retrospective run once confident**: the 2022 cycle — today's incumbents were 2022
   candidates, their pre-election-2022 captures are in Wayback, and their promised term
   (118th Congress, 2023-01-03 → 2025-01-03) is COMPLETE, so every verdict is genuinely
   adjudicable now. Run the existing pipeline backward (spike → extract → link →
   adjudicate with `--cycle 2022` parameterization), Muxin + husband label a retrospective
   gold sample (real kept/broken cases — the §6 gold round becomes meaningful in 2026),
   compute the §6.4 ship gate on it, and if it passes, ship "what they said vs. what they
   did — last term" live behind `PROMISE_TRACKER_ENABLED`. Voters get said-vs-did history
   without waiting for 2027; the 2026 promises keep accruing under the same machinery.

Known dependencies and honesty notes for step 2, recorded up front: (a) **118th-Congress
record backfill is the gating cost** — linking needs 2023-2024 votes, bills, and
issue_tags in the DB; scope this first (GovTrack/Congress.gov have the data; tagging two
more years of bills has real API cost); (b) cycle parameterization of the spike's
election-day cutoff, the FEC committee lookup, and the adjudicator's TERM_WINDOW;
(c) **winner bias**: a retrospective ledger only covers people who won in 2022 — any
surface that renders it must say it covers incumbents' prior-term promises, not all
candidates; (d) 2022 Form 1 website coverage and Wayback capture rates need their own
mini-spike before committing (same step-0 posture as the 2026 corpus).

Operational findings the run bought, all fixed same-day (#487, #489): drizzle `sql`
templates render JS arrays as IN-tuples, never `ANY()`; extraction responses need a
format-retry + 8k output budget (silent truncation zeroed two candidates before the fix —
Hockett's "0" was a truncation artifact all along, she's actually the #3 corpus); the
verbatim gate dropped 3 near-paraphrases in production, exactly as designed. One item for
the gold set: Hale's cartel promise classified `border_security` on one run and
`crime_public_safety` on the next (same id; adjacent-issue nondeterminism worth
quantifying). Prompt-gate calibration (#488, extractor v2) came from the first dry-run:
position statements ("supports X") and campaign-conduct pledges (donation refusals) are
gate-2 exclusions, confirmed by re-run.

**External calibration harness — built 2026-08-13** (step 1 of the retrospective decision
above). `scripts/ingest/_promise-calibration.ts` feeds professionally-labeled historical
cases through the REAL adjudicator path — same `buildAdjudicationSystemPrompt`, same
`parseAndValidateVerdict` rails (synthetic action ids exercise the no-fabricated-evidence
check exactly as production does) — and scores the results against the professional labels:
agreement, Cohen's κ (reusing `_promise-gold-score.ts` machinery), kept↔broken polarity
flips, and the model's flag rate, broken down per expected label so systematic misses are
visible. To unlock per-case historical windows, the adjudicator's window functions
(`windowNotYetOpen` / `deterministicNotYetTestable` / `buildAdjudicationPrompt`) now take an
optional `TermWindow` parameter defaulting to the 2026 `TERM_WINDOW` — no behavior change
for the production pipeline, and the same parameter serves the planned `--cycle 2022` run.

Input is a hand-assembled CSV (columns documented in the script; synthetic example at
`scripts/ingest/fixtures/promise-calibration-sample.csv`): promise text + declared test,
the case's own promised window, `actions_json` (the official-record actions the linker
would have produced, translated from the tracker's cited evidence), the professional label
verbatim (`source_label`) plus its mapping onto our enum (`expected_verdict`), and a
REQUIRED `source_url` citation. **Copyright discipline:** PolitiFact labels are Poynter's —
internal scoring with citation only, never republished — so the real cases CSV and reports
live in `scripts/ingest/_promise-calibration/` which is now `.gitignore`d (as is
`_promise-gold/`, matching its stated intent). Reports are stamped with
`ADJUDICATOR_VERSION`; the calibration loop is: assemble cases → run → read disagreements →
revise rubric/prompt → bump `adj-vN` → re-run → compare stamped reports. Known-by-design
miss to quantify: broken-by-inaction always flags under adj-v1 (the zero-evidence rail
refuses positive verdicts with no cited actions) — the fixture's `cal_inaction` case
documents this. Candidate case sources: PolitiFact's meters (Trump-O-Meter, Obameter,
Biden Promise Tracker, and the congressional GOP Pledge-O-Meter — closest to our domain)
and the academic Polimeter/Comparative Agendas datasets. Dry-run verified on the fixture:
per-case windows render correctly and historical windows take the LLM path.

**118th-Congress backfill — SCOPED 2026-08-13** (dependency (a) of the retrospective
decision). Findings from the code, ordered by what actually blocks:

1. **`federal-votes.ts` is already congress-parameterized** — `CONGRESS=118 npx tsx
--env-file=.env.local scripts/ingest/federal-votes.ts` targets the 118th with no code
   change… except:
2. **The GovTrack offset cap IS the blocker.** `fetchGovTrackVotePage` stops at
   `GOVTRACK_MAX_OFFSET = 1000` (GovTrack 400s beyond it), and the 118th had roughly
   1,500+ House and ~700 Senate roll calls — a single `congress=118` query truncates more
   than half the record, with only a console warning. **FIXED same day**: the fetch is now
   partitioned by `chamber` × `session` year (GovTrack's `/vote` endpoint supports both
   filters), each slice paged independently under the cap, with link-keyed dedupe and the
   tail year included (a closing session can spill past New Year). Muxin verified the
   partition counts live against the API — every chamber-year slice of the 118th is under
   1,000. The cap warning remains, now per-slice, in case a future chamber-year ever
   exceeds it. With this, `CONGRESS=118` is runnable as-is.
3. **Candidate identity is safe.** Vote rows key candidates by bioguide id (same
   `federal-<BIOGUIDE>` convention as committee-assignments), so 118th votes by current
   incumbents land on their existing candidate rows — exactly what the retrospective
   linker needs. Members who left after the 118th create new candidate rows (harmless).
4. **`bill-cosponsors.ts` takes `--congress 118`** and backfills over bills already held,
   so it runs AFTER the votes ingest lands the 118th bills. Congress.gov key already in
   `.env.local` (used for 119th enrichment); rate limit ~5,000 req/hr is the pacing item.
5. **Issue tagging runs on SUBSCRIPTION, not the API** _(corrected 2026-08-13 — the
   original scoping note said "tag-bills.ts, low single-digit dollars on Haiku," which
   contradicts the standing policy: the Anthropic API key is reserved for user-facing
   chat; bulk LLM classification runs via Claude Code subscription subagents — the
   ~46,000-tag precedent, see docs/operations/voter-choice-backlog.md)._ The proven
   path: `_export-untagged-batches.ts` (dev machine, DB read → batch JSON files) →
   subscription workflow/subagents classify against the canonical vocabulary →
   `insert-issue-tags.ts` (dev machine, JSON → `issue_tags` upsert, version-stamped
   `*-agent-v1`). The 118th's ~600–900 roll-called bills arrive with zero `issue_tags`
   rows, so any untagged filter picks them up; the export script's `LIMIT 500` means a
   couple of export/insert rounds. `tag-bills.ts` (API path) stays for reference but is
   NOT the run instruction.
6. **Coverage check before any of this** (read-only, Muxin's machine) — confirms what the
   DB already holds:
   `SELECT LEFT(vote_date::text, 4) AS yr, COUNT(*) FROM votes WHERE id LIKE 'govtrack%' OR source_url LIKE '%govtrack%' GROUP BY 1 ORDER BY 1;`
   `SELECT REVERSE(SPLIT_PART(REVERSE(id), '-', 1)) AS congress, COUNT(*) FROM bills WHERE id LIKE 'govtrack-%' GROUP BY 1 ORDER BY 1;`
   (bill ids pack congress as the last dash-segment: `govtrack-hr1234-118`.)

Remaining retrospective dependencies after this: cycle-parameterize the corpus spike
(2022 election-day cutoff + FEC Form 1 lookup by cycle) and pass the 2023–2025 window
through extract/adjudicate (the adjudicator side is DONE via `TermWindow` above); then the
2022 TX mini-spike to measure Wayback coverage before committing.

**Cycle parameterization + backfill safety — built 2026-08-13** (dependency (b), plus a
hazard the scoping missed). Three pieces:

1. **`--cycle` on the corpus spike.** `--cycle 2022` (any cycle whose election day has
   passed) flips the spike to RETROSPECTIVE mode: the roster switches from
   `official_roster_candidates` to that cycle's WINNERS — members whose term started the
   following Jan 3, straight from `candidate_offices` with identity pre-resolved (no
   resolver pass, no `unresolved` bucket) — the capture window defaults to the cycle
   (Jan 1 odd-year → that election day, `generalElectionDay()` computed), and FEC lookups
   prefer the cycle's own filings: `pickPrincipalCommittee` now prefers committees active
   in the requested cycle, and the website comes from `/committee/{id}/history/{cycle}`
   (the era's Form 1 snapshot) before falling back to the current filing. Members whose
   candidates rows lack seat columns (never seat-backfilled) are counted and reported
   rather than silently dropped. Winner bias remains inherent and stated.
2. **`--cycle` on the adjudicator.** `termWindowForCycle(2022)` → 2023-01-03..2025-01-03,
   threaded through both paths; `termWindowForCycle(2026)` ≡ `TERM_WINDOW`, so default
   behavior is unchanged.
3. **Backfill incumbency hazard, fixed before the 118th run.** The votes ingest hardcoded
   `isIncumbent: true` on every member it created and the upsert clobbered the column —
   a `CONGRESS=118` backfill would have marked every retired/defeated 118th member a
   sitting incumbent in prod. Now: incumbency is asserted only by CURRENT-congress roll
   calls, the in-memory plan merge never lets an older congress demote a newer row, and
   the DB upsert is monotonic (`is_incumbent OR excluded.is_incumbent` — demotion stays
   the roster/incumbent-backfill scripts' job). NOTE for the run: the default config has
   always ingested `[current, current-1]`, so partial pre-partition-fix 118th data (first
   1,000 vote records) may already exist — the re-run upserts over it idempotently, and
   the coverage SQL above will show the before/after.

**External calibration — FIRST RUN executed 2026-08-13** (`rubric-1.0.0+adj-v1`, run via
Claude Code subscription subagents per policy — Sonnet, the production `ADJUDICATOR_MODEL`,
verbatim production prompts, verdicts validated through `parseAndValidateVerdict`'s rails).
Case set: 18 GOP Pledge-O-Meter promises (the congressional meter; 5 kept / 5 compromise /
8 broken by PolitiFact's ruling), assembled from Wayback-archived PolitiFact pages fetched
on Muxin's machine; `expected_verdict` decided per-case under OUR rubric with the evidence
in hand (source label kept verbatim alongside — 4 house-passed-senate-died "Broken" cases
map to our `attempted_blocked`, and "take action to repeal" maps to a vote-type `kept`).
Artifacts (cases.csv, gen-cases.ts, agent-verdicts.json, report) live untracked on Muxin's
machine in `scripts/ingest/_promise-calibration/`.

**Results (n=18): agreement 66.7%, κ=0.565, polarity flips 0, flag rate 16.7%, agreement
excluding flags 80.0%.** The two §6.4-critical properties held: ZERO kept↔broken flips,
and on the hardest mapping case (`gop655_repeal_aca`, PolitiFact "Broken") the adjudicator
followed the pre-declared vote-type test to `kept` — it applies our rule order rather than
pattern-matching pundit labels. All three clean rule-3 mapping cases (644/656/691) came
back `attempted_blocked` as designed.

The six disagreements, and what they teach (the adj-v2 worklist):

1. **broken-by-inaction flags instead of ruling** (gop657: own bill died in own
   subcommittee → flagged; gop664: conduct promise violated at the dispositive moment →
   flagged). Both flags gave reasoned ambiguity exposing real rubric gaps: rule 3's
   examples don't cover died-in-own-chamber-committee, and nothing says how to weigh an
   adopted rule against later violations of it. adj-v2: add to rule 5 — "a member's own
   measure that their own chamber controlled and never advanced, absent any external
   blocker, is inaction"; add a conduct-promise clause — "violation at the dispositive
   moment outweighs the enabling rule's adoption."
2. **compound promises** (gop667 "no delay AND no pork" → flagged; but gop692, the same
   shape, was correctly ruled compromise). adj-v2: state that a promise with two testable
   halves where one succeeded is rule-4 compromise, not a flag.
3. **adjacent-category softness, low harm** (gop649 kept→compromise: enacted caps
   discounted as "a negotiated deal rather than the strict caps sought"; gop671
   compromise→kept: sustained funding read as full delivery; gop686, the deliberately
   contested case, attempted_blocked→compromise — a defensible reading its own notes
   anticipated). These are one-rung misses among the non-polar labels; worth prompt
   tightening, not rule changes.

Next round: apply the adj-v2 revisions, re-run the same 18 (reports are version-stamped
and comparable), and extend the case set with Biden-tracker legislative cases for
source diversity. Broken-class recall (currently 1/3, the rest flagged) is the number to
move; flags are safe-by-design but each one is a case the app can't display.

**External calibration — SECOND RUN executed 2026-08-13** (`rubric-1.1.0+adj-v2`, same 18
cases, same subscription-subagent mechanics, prompts regenerated from the revised system
prompt). The revisions shipped as rubric **1.1.0** (MINOR bump; no shipped verdict
invalidated — every production verdict to date is deterministic `not_yet_testable`) plus
`adj-v2` prompt rendering: rule-5 inaction-with-opportunity and conduct-promise clauses,
the rule-4 compound-promise clause, a rule-2 note (delivered-but-narrower is rule 4; a
different legislative _vehicle_ alone is not a downgrade), and an explicit "these three
patterns are cleanly decidable — do not flag them" line on rule 6.

**Results (n=18): agreement 83.3% (was 66.7%), κ=0.770 (was 0.565), polarity flips 0,
flag rate 0% (was 16.7%).** Broken-class recall 3/3 (was 1/3): gop651 ruled broken
outright, gop657 via the inaction-with-opportunity clause, gop664 via the conduct clause —
the run-1 worklist's target number, fully closed. gop649 (run-1 kept→compromise miss)
now kept. The declared-test property held again on gop655. The three remaining misses,
all adjacent-category, zero polar: gop667 and gop671 expected `compromise`, ruled `kept`
(the rule-2 "different vehicle" note likely overcorrects when the delivered thing was
also materially narrower — candidate wording for adj-v3, not urgent since both are
one-rung and non-polar); gop686, the deliberately contested case, again
`attempted_blocked`→`compromise`, the defensible reading its notes anticipated. Numbers
now sit at the §6.4 gate's neighborhood on an external set the gate wasn't written for
(the gate is defined over OUR gold set); the method is calibrated enough to proceed to
the Biden-tracker extension and then the human gold round.

**External calibration — THIRD RUN executed 2026-08-13** (`rubric-1.1.0+adj-v2`, held-out
extension set: 16 Biden-Promise-Tracker legislative cases, window 2021-01-20→2025-01-20,
assembled from Wayback captures fetched on Muxin's machine the same day; snapshot-cited
per case, gitignored per the Poynter rule). Different era, different party, different
promise-maker analog, labels the adjudicator had never seen — and the set deliberately
carries a NEW mapping-asymmetry class the GOP meter didn't have: PolitiFact Compromise
rulings that credit EXECUTIVE salvage (an ATF rule, NLRB policy, a strategy document)
after the legislative path died, which our legislative-only evidence ladder reads as
rule-3 `attempted_blocked`.

**Results (n=16): agreement 87.5%, κ=0.823, polarity flips 0, flag rate 0%.** By class:
`attempted_blocked` **6/6** — the entire mapping-divergence class held, including all
three their-Compromise→our-attempted_blocked cases (1536 background checks, 1585 PRO
Act, 1615 domestic-terrorism law) and all three their-Broken→our-attempted_blocked cases
(1575 min wage incl. the parliamentarian blocker, 1606 assault-weapons ban, 1562 Roe
codification with two lost cloture votes). `broken` **3/3**, every one via the 1.1.0
inaction-with-opportunity clause on fresh data (1558 public option, 1610 citizenship —
"mere introduction does not discharge an outcome promise" cited nearly verbatim, 1587 SS
solvency). The deliberately contested inverse-mapping case (1559 Medicare negotiation,
their Kept → our compromise) came back `compromise` as we expected. The two misses, both
adjacent-category, zero polar:

1. **bid1542 VAWA (expected kept → model compromise): a case-authoring flaw, not an
   adjudicator flaw.** The promise text names the boyfriend AND stalking loopholes; the
   assembled evidence showed the boyfriend loophole closed (BSCA) but said nothing about
   the stalking loophole, and the model correctly applied the rule-4 compound clause to
   the evidence as given. The expected label stands as authored (no post-hoc relabeling —
   that would contaminate the test), but the disagreement credits the adjudicator. Case
   authoring lesson for the gold round: compound promises need per-component evidence.
2. **bid1589 corporate tax 28% (expected compromise → model broken).** The model declined
   to treat the IRA's 15% corporate minimum tax as a "materially partial version" of
   raising the rate to 28% — a different instrument toward the same aim. Rule 4's
   examples (narrower scope, lower funding, sunsets) don't cover
   different-instrument-same-aim; this is the sharpest adj-v3 candidate to date, and the
   run-2 misses (667/671) sit on the same boundary from the other side.

Aggregate across both adj-v2 sets: 29/34 (85.3%), zero kept↔broken flips and zero flags
in 34 consecutive cases. The declared-test and rule-order properties now hold across two
meters, two parties, and two decades. Next: the Muxin+husband gold round (§6.2-6.4) on
our own extracted corpus — the calibration method is ready; adj-v3 wording (the rule-4
instrument question above, plus run 2's rule-2 note) should be drafted from the gold
round's disagreements rather than pre-emptively.

Run order for the retrospective mini-spike (after this merges):
`CONGRESS=118 … federal-votes.ts` → `bill-cosponsors.ts --congress 118` (both dev-machine,
free data APIs, no LLM) → issue tagging via the SUBSCRIPTION pattern above (export →
subagent workflow → insert; no API spend) →
`_promise-corpus-spike.ts --state TX --cycle 2022 --json > spike-tx-2022.json` (free:
OpenFEC + Wayback only).

**118th backfill RUN 2026-08-13 (Muxin's machine): COMPLETE.** With the partition fix:
1,932 GovTrack vote records (vs. the 1,000 the old offset cap truncated at), 1,426 bill
roll calls, 532 bills (all 532 Congress.gov-enriched, 0 failures), 553 candidates / 555
office terms, **221,583 vote rows** upserted. `bill-cosponsors --congress 118`: 532/532
bills, 12,221 sponsor+cosponsor rows, 0 failures, 0 skipped-no-candidate (bioguide
matching held perfectly). Remaining LLM step: tag the 532 new bills — now runnable via
`scripts/ingest/_tag-bills.workflow.js` (this PR), the ported subscription pattern:
`_export-untagged-batches.ts` (also fixed here: "untagged" now means no `issue_tags` row
under ANY version — the old version-scoped filter would have re-exported agent-tagged
bills forever) → run the workflow in a local Claude Code session (Sonnet subagents read
the canonical vocabulary from source and write `insert-issue-tags.ts`-shaped result
files) → `insert-issue-tags.ts` per result file (version now stamped
`claude-sonnet-5-agent-v1`) → re-export to verify 0 remaining. The 2022 TX mini-spike
has NO tagging dependency (FEC + Wayback only) and can run any time. Standing policy, restated (Muxin, 2026-08-13): **the Anthropic
API key is for user-facing chat only; every bulk/batch LLM step in these pipelines runs
on subscription subagents.** This also applies forward: the calibration harness and the
retrospective extract/link/adjudicate runs should execute their LLM calls via
subscription subagents (the harness's prompts and validation rails are importable pure
functions, so a subagent-driven runner scores identically), with version strings following
the `*-agent-v1` convention `insert-issue-tags.ts` established.

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

**6a — built 2026-08-13** (`scripts/ingest/federal-pac-sponsors.ts` + migration
`0022_add_pac_committees.sql`). The schema decision above was taken as specced: committees
promoted to a first-class `pac_committees` table (committee_id → name → CONNECTED_ORG →
sector → classification_method → status → evidence_url), with per-committee × candidate ×
cycle totals in `pac_candidate_contributions` (direct 24K/24P/24Z money only — the same
dollars already inside the "PACs" funding-mix bucket; read paths must never re-add them to
totals). Classification is CONNECTED_ORG + ORG_TP only, exactly as specced: sponsor-name
keywords against the shared `_bucket-mapping.ts` vocabulary (one vocabulary with
individual-employer sectors); ORG_TP=L committees take union/education buckets (their own
filing's claim); corporate committee NAMES are deliberately never keyword-matched (an
ideological PAC with an industry word in its name is not that industry); non-industry
buckets (Party committees, PACs, Other, Self-funded) are allowlist-excluded so nothing
double-represents. Unclassified = NULL sector, honest. Human curation is first-class:
`status` = auto | verified | rejected, and re-runs never reclassify non-auto rows (the
false-match-rate control the plan requires). Run:
`npx tsx --env-file=.env.local scripts/ingest/federal-pac-sponsors.ts --cycle 2026 --dry-run`
then without the flag. Remaining for 6a after ingest: the UI block naming top PACs/sponsors
per candidate (display-layer; excludes `rejected` rows).

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

**6b — built 2026-08-13** (`scripts/ingest/federal-independent-expenditures.ts` + migration
`0023_add_independent_expenditures.sql`). One table, `independent_expenditures`: spender
committee × candidate × cycle × `support_oppose` → `amount_total` + `expenditure_count`.
Spender identity is **not** duplicated — `committee_id` FKs to 6a's `pac_committees`, and
spenders are registered through 6a's own `buildCommitteeRow`/`upsertCommittees` (imported,
not copied), so sponsor (`CONNECTED_ORG`), sector, evidence URL and the
auto/verified/rejected status guard stay in one place. Unlike 6a's
`pac_candidate_contributions`, no attributability filter is applied: party committees and
non-connected super PACs make real IEs, and there is no double-representation risk because
none of this money is in the funding mix. Spenders absent from the committee master are
kept with the IE file's own name and a NULL sector — honestly unclassified.
**The display rule, restated and now enforced by test:** outside spending is not the
candidate's money; it renders only as its own "Outside spending about this race" block,
spent _for_ and spent _against_ shown as two figures, never summed into the funding mix,
never summed into `totalRaised`, and never netted against each other.
`scripts/ingest/independent-expenditure-isolation.test.ts` asserts structurally that (a) the
ingest never touches `donor_aggregates`, (b) no funding-mix producer or read path
(`federal-donors.ts`, `federal-sectors-bulk.ts`, `federal-issue-pacs.ts`,
`federal-pac-sponsors.ts`, `_fec-bulk.ts`, `src/lib/server/donors.ts`, `race-data.ts`) — nor
any other file in `src/**`, `scripts/**`, `db/**` — references the IE table, and (c)
support/oppose are separate rows kept apart by the table's unique key. Source file: the
per-cycle FTP-style bulk zips carry no Schedule E (`oppexp` is OPERATING expenditures, the
wrong file); IEs ship as a standalone header-bearing CSV,
`https://www.fec.gov/files/bulk-downloads/<cycle>/independent_expenditure_<cycle>.csv` —
keyless, no OpenFEC key needed. (The as-built default omitted the `<cycle>/` directory and
404'd on Muxin's first 2026 dry-run — exactly the loud failure the mitigations were built
for; fixed same day.) **Unverified assumption remaining for the dry-run:** fec.gov was
blocked by the build container's egress proxy, so the column names come from the FEC's
published file description, not a live fetch. Mitigations: `--ie-url` / `--ie-csv` override
the location, and columns resolve **by name** from the file's own header (with the documented
aliases) — a missing load-bearing column aborts the run and echoes the header it saw, rather
than guessing positionally. Amount is `EXP_AMO` (per filing), never `AGG_AMO` (running
aggregate); filings superseded by an amendment (`FILE_NUM` appearing as another row's
`PREV_FILE_NUM`) are dropped; unrecognised `SUP_OPP` values and unresolved FEC candidate ids
are counted and logged, never guessed or silently dropped. Run:
`npx tsx --env-file=.env.local scripts/ingest/federal-independent-expenditures.ts --cycle 2026 --dry-run`
then without the flag. Remaining for 6b after ingest: the "Outside spending about this race"
UI block (display-layer, deliberately not built here) — and a decision on candidate scoping,
since the ingest reuses the siblings' `loadFederalCandidateMapWithFundingMix`, so IE money
aimed at a candidate with no funding-mix row is currently reported as an unresolved miss
rather than stored.

**6b — first `--dry-run` (Muxin's machine, 2026-08-13, cycle 2026): SUCCEEDED.** Both
build-time assumptions resolved: the URL needed the `<cycle>/` directory (404'd loudly,
fixed same day), and the header check passed — all seven columns resolved by name from the
live file. Numbers: 13,398 Schedule E rows scanned, 12,054 parsed, 794 superseded
amendments dropped, 9 unmapped `SUP_OPP`; 9,245 rows matched → 1,330 aggregate rows across
452 spenders (0 missing from the committee master): **support $441.3M / 961 rows, oppose
$242.7M / 369 rows** — reported apart, per the rule. Real 2026 shapes visible: the top
oppose spender is a Cornyn-affiliated super PAC ($25.0M against fec-S6TX00388), UDP and
Fairshake both present. Findings out of the run, and what changed because of them:

1. **A $17.0B row** aimed at fec_id H6FL11274 — a filing error (the whole file's matched
   total is ~$684M). Filings are evidence, not infallible evidence: the ingest now
   QUARANTINES any single row over $50M (`SUSPECT_AMOUNT_CEILING`) — counted, logged with
   its file number for fec.gov verification, excluded from every aggregate including the
   unresolved-miss tallies; supersession still wins over quarantine.
2. **2,015 unresolved-candidate rows.** Expected classes visible in the top misses:
   presidential committees (`P*` fec ids — out of scope for a congressional ledger) and
   congressional candidates with no funding-mix row (e.g. fec_id S6MI00418 at $23.2M —
   likely a primary-phase or since-departed candidacy). The scoping decision above is now
   live with real dollar amounts attached.
3. **Sector is (unclassified) for essentially every top spender** — correct, not a bug:
   super PACs are non-connected committees, so `CONNECTED_ORG` is usually empty. Where a
   sponsor IS filed it is often another political committee ("CORNYN VICTORY COMMITTEE",
   "CASSIDY LEADERSHIP FUND"), which the sector vocabulary rightly never maps to an
   industry. Consequence for the UI block: outside spending is presented by SPENDER NAME
   and filed sponsor, with sector shown only when it exists; the hand-curation workflow
   (`status=verified`) is the path to naming who is behind the big ones.

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

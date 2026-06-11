# Alignment — Phase 2 Hand-off (continuation)

**Written:** 2026-06-11 · **By:** branch-audit reconciliation pass
**Supersedes the read of:** `alignment/pole-vocabulary` branch (the May-28 overnight design run)

---

## TL;DR — read this first

**The alignment re-tag work you started on the design branch has already SHIPPED to
production.** A later effort picked up the May-28 design, executed it on a Neon branch
(`alignment-work`), validated it, and **cut over to prod on 2026-06-06**. The corrected
tags are live. So this is a *continuation* hand-off, not a "pick up where the branch
left off" hand-off.

- ✅ **The data is fixed and live.** Bill tagging for all 12 contested issues was
  re-derived against the pole vocabulary, independently gold-validated (12/12 issues
  ≤5% inversion vs the old 13–53%), and migrated into prod `issue_tags`.
- ❌ **The architecture that PREVENTS the bug from coming back was NOT built.** The
  tagger and the runtime resolver still each infer pole direction independently; there
  is no shared vocabulary artifact either one imports. The drift that caused the
  original inversions can recur on the next re-tag or prompt edit.
- 🟡 **The disambiguation UX is half-built** — the data structures exist, but the
  trigger is model-confidence-driven (not data-driven) and no UI renders the buttons.

**Action on the old branch:** `alignment/pole-vocabulary` is fully superseded — 9 of its
11 files are byte-identical to `main`, and the other 2 (`HANDOFF.md`, `OVERNIGHT_PLAN.md`)
exist in *newer* form on `main`. Nothing is lost by deleting it. **Safe to delete; no
archive tag needed** (everything is already in `main`).

---

## Why the branch looked unfinished

It was based on `launch/production @ db3b63d` (**2026-05-28**); `main` is now **252
commits / ~2 weeks ahead**. The branch is a pure design package (11 docs, 2,362 lines,
zero code). It blocks on 6 product decisions in its `HANDOFF.md` — but those decisions
were subsequently made and executed by the cutover effort, which is why it *reads* as
"awaiting you" while production has already moved past it.

---

## What SHIPPED (verified in `main` @ 2026-06-11)

| Item | Evidence | Status |
|---|---|---|
| 16-issue pole vocabulary | `docs/alignment/POLE_VOCABULARY.md` | live (docs) |
| Re-tag of all 12 contested issues (15,593 tags) | commits `33a8a7d`→`868a03c`; `ALIGNMENT_LEDGER.md` | done on `alignment-work` Neon branch |
| Offline gold-sample validation gate | commit `683d1c2` — "12/12 PASS"; `ALIGNMENT_EVAL.md` | passed (3-juror Opus panel, blind) |
| **Prod cutover** | commit `2d6baf7` "FIRED — corrected tags live"; `issue_tags` 42,506 → 24,866; backup table `issue_tags_backup_precutover` retained; reversible SQL | **LIVE since 2026-06-06** |
| Read-path `no_score` guard | commit `33fa328` (2026-06-10), `src/lib/server/alignment.ts` `computeVoteAlignment` returns `abstain` for any non-`in_favor`/`opposed` stance | live |
| Donor issue-PAC stance read path | PR #94 `a7cb1e7`; `src/lib/server/donors.ts` (`alignsWith`, `issuePacStance`) | live |
| CAN2026 enrichment substrate | 12 `can_*` tables, `db/migrations/0004_add_can2026_tables.sql`, `scripts/ingest/can2026.ts`, monthly workflow | shipped, ingest-ready |
| Re-tag tooling | `scripts/ingest/_pole-*.ts` (assemble/insert/verify/audit/snapshot) | one-time pipeline, in repo |

The 6 product decisions from the old `HANDOFF.md` were effectively resolved by the
cutover: disambiguation phrasing adopted as drafted (#1); `public_safety` vs
`crime_public_safety` kept separate (#3); housing kept as valence (#2 deferred);
funder axes kept standalone (#5). **Still open: #4 (rename `election_integrity`) and
the issue-id merges.**

---

## What is genuinely LEFT (the real Phase-2 backlog)

Ordered by value. Items 1–2 are the ones that matter; the rest are polish.

### 1. Operationalize the shared anchor (HIGHEST VALUE — the bug can recur)
**Problem:** The data is corrected, but `SHARED_ANCHOR_SPEC.md` was never implemented.
Verified: no file under `src/` imports a pole-vocabulary artifact; `src/lib/canonicalIssues.ts`
is still just an id→label map with **no pole definitions**; the tagger
(`scripts/ingest/tag-bills.ts`) and the runtime resolver
(`src/lib/generated/ballotPromptEn.generated.ts`) each define "what `in_favor` means"
independently. The next re-tag or prompt edit can silently re-invert.
**Work:** Derive a single structured artifact from `POLE_VOCABULARY.md` (the JSON
derivative the spec §5 describes) and make BOTH the tagger and the resolver consume it.
This is the durable fix the whole exercise was for.

### 2. Make the disambiguation trigger data-driven + wire the UI
**Problem:** `[CONCERN_INTERPRETATION]` already supports `disambiguationQuestion` +
`disambiguationOptions` (see `src/lib/structured-blocks.ts`), but the trigger is the
LLM's self-assessed `confidence: "low"`, not the vocabulary's `axis_type: contested`.
The model can skip asking when it's falsely confident. And no redesign surface renders
the buttons yet — so users are never actually asked.
**Work:** Drive the gate from `axis_type` (contested ⇒ always ask) and wire the
buttons into the chat/cold-open surface. With 12 of 16 issues contested, this is the
central UX, not an edge case.

### 3. Issue-id renames / merges (decision #4 + granularity)
Still carrying poleless names in `canonicalIssues.ts`: `gun_rights_safety`,
`crime_public_safety`, `public_safety`, `election_integrity`, `border_security`.
Candidate changes from the design + ledger follow-ups: `election_integrity` →
`voting_access`; `border_security` → merge into `immigration`;
`public_safety` + `crime_public_safety` → `criminal_justice`. ⚠ Each touches a key in
`canonicalIssues.ts` AND the prompt vocabulary AND requires a targeted re-tag of the
affected corpus — do as a deliberate, validated mini-cutover, not a rename-in-place.

### 4. Vote-rationale field (design-only)
`ALIGNMENT_DATA_MODEL.md` proposes a per-contributing-vote rationale on
`ContributingVote`/`AlignmentResult` in `alignment.ts`, surfaced in the
`AlignmentDrilldown`. Where CAN curated context covers the vote
(`can_candidate_key_votes.context`), populate from that prose. Not yet coded. (Note:
"bridge" was renamed to "vote rationale" to avoid colliding with the redesign's Polis
"bridge statements" — that rename is settled in docs, absent from code.)

### 5. Flip CAN2026 display ON
`CAN2026_DISPLAY_ENABLED` is still gated OFF in `src/app/api/delegation/route.ts`.
Blocking condition unchanged: confirm attribution terms with Paul / can2026.org before
flipping. (Substrate + ingest are ready; this is a product/legal gate, not eng.)

### 6. Ledger follow-ups
From `ALIGNMENT_LEDGER.md`: stricter `public_safety` re-tag (it tagged over-eagerly);
null-summary coverage (state bills with no OpenStates abstract limit alignment depth —
see the recovery option in `docs/operations/post-launch-backlog.md`).

---

## Where to look (current source-of-truth, all on `main`)

- **Pole definitions (prose):** `docs/alignment/POLE_VOCABULARY.md`
- **Architecture spec (unbuilt):** `docs/alignment/SHARED_ANCHOR_SPEC.md`
- **Run log / what actually happened:** `docs/alignment/ALIGNMENT_LEDGER.md`, `ALIGNMENT_EVAL.md`
- **Canonical issue ids:** `src/lib/canonicalIssues.ts`
- **Tagger:** `scripts/ingest/tag-bills.ts` · re-tag pipeline: `scripts/ingest/_pole-*.ts`
- **Runtime resolver / concern gate:** `src/lib/generated/ballotPromptEn.generated.ts`, `src/lib/structured-blocks.ts`
- **Scoring truth table + read-path guard:** `src/lib/server/alignment.ts`
- **Alignment API:** `src/app/api/alignment/route.ts`
- **Donor poles:** `src/lib/server/donors.ts`
- **CAN2026 schema:** `db/schema.ts` (`can_*` tables) · gate: `src/app/api/delegation/route.ts`
- **DB schema source of truth:** `db/schema.ts` (Drizzle) + `db/migrations/`

## Suggested first move
Start at item 1. Read `SHARED_ANCHOR_SPEC.md`, then `canonicalIssues.ts` and the two
prompt/tagger consumers — decide the shape of the shared artifact and which module owns
it. That single change closes the recurrence risk; everything else is additive.

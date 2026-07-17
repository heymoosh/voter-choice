# Ship-readiness review — 2026-07-16

Full accounting of what remains to ship the app once the state-roster ingest completes, plus the unmerged-branch/worktree audit and the status of the front-end design program. Produced by a read-only sweep of the backlog (`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/voter-choice-backlog.md`), all local branches/worktrees, and the full PR history (`gh pr list --state all`, repo `https://github.com/heymoosh/voter-choice`). Companion board card: **"[P1] EPIC: Post-roster ship runway"**.

Board edits made alongside this doc (all committed 2026-07-16):
- AZ vertical slice (`637c2583`) resolved from a dual-STATUS anomaly to **Done** (merged via PR #322, commit `8ce11c5c`; flag flip still separately gated).
- Orphaned Review bugs `ef8d602c` (P0 tablet Edit Issues), `8e4ef0f3` (edit-issues propagation), `2d1e6f97` (polling-place note) re-queued to **To Do** with triage notes.
- New cards added: Post-roster ship runway EPIC · Round-4 a11y audit lane (never built) · tip-jar Stripe-live decision · integrated design-review gallery (In Progress this session) · branch/worktree cleanup checklist.

---

## 1. State-roster ingest status (babysit lane — hands off)

As of this review: **24+ states Done** (count rising as the babysit session merges; RI/UT/WI/WV landed during this review), remainder In Progress with auto-merge enabled on their PRs.

Cannot finish on the current path:
- **DC, AS, GU, MP, PR, VI** — hard-blocked on card `8f2c4e91` *"DECISION NEEDED: non-voting-territory delegate rendering"* (ATTENDED — Muxin product call: how a single Delegate/Resident-Commissioner seat renders in the House+Senate RepCard UI). Writeup: `docs/operations/non-voting-territory-delegate-rendering-gap.md`.
- **SD** — plain Backlog, no blocker, just unclaimed.

Remaining roster human gates: the **MANUAL SANITY-TEST GATE** (`041eddfa`, attended app-vs-official-source accuracy check) and the **`OFFICIAL_ROSTER_ENABLED` flag flip / C29 cutover**. ~23 dated "Re-check official roster" cards carry `NOT BEFORE` gates (future scheduled work, not launch blockers).

## 2. Design/UI program — what merged, what's held, what was never built

**Merged to main, never visually reviewed by Muxin** (squash-merged 2026-07-11 → 07-13):
- Round 3 parity: PRs #267 (Keystone integration + `docs/design-review/` gallery), #268–#283 (results/intake/scorecard parity lanes, blind-card copy ruling in #280, rep-card evidence row #272, moneygap #271, bold-flag token leaks #273).
- Round 4: #284 (alignment-rows data bug), #285 (RepCard canvas port), #286 (not-up seats), #287 (H2H money), #288 (workspace scroll), #290 (duel issue rows).

**Built but unmerged / held** — CORRECTED by the 2026-07-16 gallery build: the raw three-dot diffs below overstate. Per-conflict verification during the gallery integration found the three r31 branches fully SUBSUMED by main (same changes landed via separately-squashed PRs, main's copies often newer/bug-fixed) and the polis branch subsumed except one real delta: the `.standing2` OKLCH cluster-hue token block in `public/redesign2.css`. Gallery + evidence: branch `integration/ship-readiness-gallery-20260716` (tip 76def437), `docs/design-review/CHANGELIST.md` on it.
| Branch | Diff vs main | PR | State | Preserved 2026-07-16 |
|---|---|---|---|---|
| `work-drilldown-r31` | ~652 lines (RepCard/drilldown Round-3.1) | none | held draft | pushed to origin |
| `work-intake-r31` | ~520 lines (intake canvas-drift fixes) | none | held draft | pushed to origin |
| `work-scorecard-r31` | ~312 lines (scorecard canvas literals) | none | held draft | pushed to origin |
| `wt/keystone-polis-report-redesign` | ~3,452 lines (3-cluster polis opinion map) | #266 | CLOSED draft, **HELD STOP-SHIP** for visual sign-off | already on origin |
| `wt/apply-the-bold-flag-palette-as-the-default` | ~1,856 lines; pre-dates Round 3/4 merges, likely part-superseded/conflicting | #241 | CLOSED draft, held | local tip → `archive/bold-flag-local-20260716` |

**Lane G (responsive/a11y audit) — ran but its output was LOST:** the audit produced 12 verified findings + 8 draft cards on 2026-07-12, written only to that session's scratchpad (since deleted). 8 of 12 findings were preserved in session memory and are now itemized on the re-opened board card; 4 are unrecoverable without a re-run.

**Recovered fast-follow:** PR #284's own KNOWN GAP — the H2H duel call site (`src/prototype/redesign/App2.tsx` ~1015) still uses `issuesForLevel()` instead of #284's `issuesForSeatCard()`; it was waiting on #284+#287, both merged 2026-07-12/13, and the follow-up was never filed. Now a To Do card (3-line fix).

**Review artifact gap:** `docs/design-review/index.html` on main is the Round-3-era gallery (generated 2026-07-11 from `fd8d4905`) — it predates the Round-4 merges and the held branches. Generator: `scripts/design/review-gallery.ts` (`npm run design:review-gallery`). The integrated gallery covering current main + held branches is being built under the new "[P1] Integrated design-review gallery" card.

**Resolved rulings:** blind-strip tenure — landed (#280 + tenure-claim suppression `b88a6cbb`). "Evidence pills" — likely subsumed by #272/#285 (no explicit trace). CanContextSection — dead/closed (CAN2026 source confirmed empty 2026-06-25).

## 3. Branch + worktree cleanup evidence table

Method: because PRs squash-merge, `git branch --no-merged` false-positives. Every branch below was cross-referenced against the full PR list by head ref, and NO-PR branches were content-verified on `origin/main` (feature files grep'd on the main tree). **Nothing is deleted; deletions require Muxin's explicit approval** (see the cleanup checklist card).

### 3a. Verified superseded — safe to delete on approval (~60)
| Branch(es) | Evidence |
|---|---|
| `archive/voter-choice-*-20260712` (12 branches) | deliberate archive snapshots; underlying work on main |
| `board/roster-wave3-resume-and-sanity-gate` | PR #315 closed; board moved on |
| `claude/budget-work`, `-work2`, `-work3` | Redis fail-open guards live on main (`counters-rate-limit.ts`, `polis/route-guard.ts`, `race-data-rate-limit.ts`) |
| `fix/pr230-e2e-button-regression`, `pr230-view-tmp`, `tmp-rebase-pr230`, `wt/match-the-keystone-design-exactly-d83cf5ec` | PR #230 lane; content on main |
| `pr-243-review`, `wt/candidates-overview-…-5192287a` | PR #243 lane; delegation-overview 3-card screen on main |
| `wt/intake-locked-state-ship-as-its-own-screen-c1a43c39` | PR #236; IntakeLocked on main |
| `pr93-work` | `SeatChat.tsx` on main |
| `review/round3-integration`, `review/round3-integration-v2`, `integration/round4-gallery` | merge/review scratch; constituent lanes merged individually |
| `tmp-rebase-pr209` | rebase scratch of PR #209 (privacy disclosure) |
| `wt/keystone-01…27` (26 lane branches) + `wt/keystone-phase-3-copy-diff-report-b7c7178d` (#233) | Keystone lane fully integrated via #267 |
| `wt/p1-wire-real-polis-bridges-…-840a9ed2` (#265), `wt/polis-entry-screen-…-4936d17b` (#237), `wt/polis-report-where-it-split-…-e2455f56` (#240) | polis lane content on main |
| `wt/rename-reorg-nav` (#154), `wt/vote-rationale-field` (#139) | closed drafts; superseded |
| Worktree `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ky-official-roster` | KY on main (`src/data/states/KY.json`, `scripts/congressional-rosters/ky-official-roster-2026.ts`); PR #345 closed |
| Worktree `.claude/worktrees/roster-babysit-2` | 0 commits ahead, clean |

### 3b. Excluded from deletion
- Babysit lane: all `feat/*-official-roster-vertical-slice` branches, their worktrees, `ut-roster-build`, `worktree-*` scaffolding branches.
- Pending gallery review: `work-drilldown-r31`, `work-intake-r31`, `work-scorecard-r31`.
- Held: `wt/keystone-polis-report-redesign` (STOP-SHIP), `wt/apply-the-bold-flag-palette-as-the-default` + `archive/bold-flag-local-20260716`.
- Pending tip-jar decision: `claude/tip-jar-work`, `claude/zealous-hoover-ead0b1-rebase` (Stripe test→live swap never shipped; main's tip flow has no payment links).

## 4. The post-roster runway (priority order)

1. **Restore the 24 PARKED cards** (`PARKED: P0 nationwide roster priority lock` → recorded `prior_status`) once the roster epic `c5a813bb` closes.
2. **Territory delegate decision** `8f2c4e91` (ATTENDED) → unblocks DC/AS/GU/MP/PR/VI; pick up SD.
3. **MANUAL SANITY-TEST GATE** `041eddfa` (ATTENDED) → `OFFICIAL_ROSTER_ENABLED` flag flip / C29.
4. **UX-batch review** via the integrated gallery → Muxin's verdicts close the ~16 Review-status UX cards (DECISION "stage — Muxin approves the combined UX batch") and settle the r31/polis/bold-flag branches.
5. **Restored P0 infrastructure:** test/staging env `446b9327` → golden-address smoke `2baacd7e`; bill-tagging cron off the front-end key `c86714c6`; retrospective security audit `850b1220`.
6. **Go-live gate epic** `0054bb72`: launch-flag convention `a09a77c8` · chat limit 100→10 `28bf87ec` · Polis reset `1f5e2506` · translations `2b325135` (→ UX-finalized epic `e18e65fd` → Keystone epic `c44193cf`).
7. **Re-queued Review bugs:** `ef8d602c` (P0 tablet), `8e4ef0f3`, `2d1e6f97` — re-verify against current main first.
8. **Housekeeping:** cleanup checklist card · Next.js CVE bump decision `06e9e179` · tip-jar decision · Round-4 a11y lane.

Phase 2 / Phase 3 cards stay gated behind their `[GATE]` epics (`b5ecb804`, `726d732a`) and are out of ship-scope.

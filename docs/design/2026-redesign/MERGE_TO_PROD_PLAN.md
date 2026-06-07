# Canonical Merge-to-Production Plan

**Authoritative as of 2026-06-07 (Muxin).** Source of truth for cutting the redesign over to
`launch/production`. The alignment/deploy session executes the gated steps; this plan absorbs the
alignment side so nothing is lost.

## Topology (the facts that drive the merge)
- **`feat/prototype-rebuild` (PR #65) = the correct app.** Canonical frontend (the prototype IS the
  app) + backend wiring + accuracy program (Textract large-format extraction, measure body capture,
  judicial-retention rendering, funding honesty) + the `candidate_data` web-research fallback. Green:
  `npm run lint` 0 errors · `npm run test` 2133 passed · `tsc` clean · `next build` green.
- **`launch/production` already has the alignment work** — 19 commits (cutover FIRED, ledger re-tags,
  gold-sample validation, pole_v1 snapshot). They are **tooling/ledger/docs only — ZERO `src/` or
  test files** — and the **corrected tag data is already LIVE in prod `issue_tags`**. So
  "push the alignment work" is already done; there is nothing else to fold in.
- **The two alignment paths layer in `src/lib/server/race-data.ts`:** corrected voting-record tags
  (`issue_tags`) are used first; the `candidate_data` web-research fallback fills in only for
  candidates with no voting record. The data cutover is transparent to this read path.
- **IGNORE the other session's local test-merge** (its worktree is ~99 commits ahead only because it
  locally test-merged the same branches; **unpushed, redundant with PR #65, do NOT fold it in**).
  Deferred alignment follow-ups are recorded in the pushed `ALIGNMENT_LEDGER.md` — nothing is lost if
  those local-only commits are dropped.

## Hard constraints (the plan MUST respect)
1. **Never overwrite `issue_tags`.** The corrected tags are live in prod. Do NOT run any
   re-ingest/migration that rewrites them. Backup exists: `issue_tags_backup_precutover`.
2. **Apply the additive `candidate_data` migration `0001` to prod Neon at deploy** — the
   `race-data.ts` fallback reads `candidate_data`; it must exist before the new code serves traffic.
   `0001` is additive (new table) and does not touch `issue_tags`.
3. **Commit-author gate:** `deploy.yml` validates the HEAD commit author is a linked account. The
   merge commit must be authored as `Muxin Li <muxin.li.pro@gmail.com>`.

## Execution sequence (gated — pushing `launch/production` deploys to prod via Vercel)
1. **Pre-flight:** on `launch/production`, re-merge `origin/feat/prototype-rebuild` (picks up PR #65's
   latest). Confirm `npm run lint` / `npm run test` / `npm run build` green. Expect only ~2 trivial
   merge conflicts (e.g. `.gitignore`) — resolve by keeping the rebuild's frontend and
   `launch/production`'s alignment `scripts/ingest` + data.
2. **Apply migration `0001`** to prod Neon (additive; does not touch `issue_tags`).
3. **Merge `feat/prototype-rebuild` → `launch/production`** (the alignment commits already on the
   target are preserved; the merge adds the frontend/backend).
4. **Push `launch/production`** → `deploy.yml` runs `vitest` + deploys; `test.yml`
   (lint+test+build+e2e) also runs and now passes.
5. **Verify on prod:** voting-record candidate shows real `issue_tags` alignment; a no-record
   candidate shows the `candidate_data` web-research fallback ("based on public statements"); a ballot
   measure shows its body text; a judicial-retention question renders as name-visible Yes/No; an
   un-ingested candidate's funding shows the honest "sector breakdown not available".
6. **Prune** the merged app worktrees (round2/3/4-fixes, phase-b/seam, ws1/2/3, design-integration)
   + the dead `/tmp` one. Keep experiment worktrees / branches / tags.

## Rollback
- App/frontend: the cutover is a normal git merge → revert the merge commit.
- Alignment data: restore from `issue_tags_backup_precutover`.

## Cross-reference
Alignment-side compatibility detail lives in the alignment session's `MERGE_TO_PROD_HANDOFF.md`
(committed on its local worktree — ask that session to push it if the full detail is needed here).

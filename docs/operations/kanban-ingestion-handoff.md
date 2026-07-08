# Kanban Ingestion Handoff — voter-choice-backlog.md

**Goal:** Keep `docs/operations/voter-choice-backlog.md` formatted so the `prose_kanban` Python tool (in `simple-kanban`) ingests it into a clean Kanban board.

## Where things stand (2026-06-12)

- File renamed `post-launch-backlog.md` → `voter-choice-backlog.md` (old file deleted). H1 now `# Voter Choice Backlog`.
- Verified against the real parser: **63 cards, 0 stray cards, every card in a real column.** Distribution: 43 Backlog / 18 Done / 2 In Progress. The one `DEPENDS ON` resolves correctly.
- Transform was done by a throwaway script in the scratchpad (now gone). To redo, rebuild from the spec below — don't hand-edit 80+ cards.

## The hard rule (why formatting matters)

The parser's only card-boundary signal is a **whole-line bold line** — regex `^\*\*(.+?)\*\*\s*$`, i.e. a line that is *entirely* bold, nothing else. That line becomes a new card title; everything until the next one is its description.

Two consequences that bit us:

1. Any whole-line bold label (`**References:**`, `**Action when ready:**`, etc.) becomes a junk card. Real card titles all start with `[` (`[P1]`, `[idea]`, `[P0 — FIXED …]`); labels don't — that's the clean discriminator.
2. A line that *starts and ends* with `**` (even a wrapped sentence) also matches — it reads as one big bold span. So merging a bold fragment onto another bold line creates a stray card. Strip the inner `**` when merging.

Card metadata the parser reads (must be at line start, not bold-prefixed):
- `STATUS: <col>` — must be exactly `Backlog` / `To Do` / `In Progress` / `Done`. Anything else (your `**Status:** Open/RESOLVED` prose) is ignored and the card defaults to Backlog.
- `DEPENDS ON: <text>` — fuzzy-matched (difflib, cutoff 0.35) against non-Done card titles.

## Transform spec (to reproduce)

Operate line-by-line; treat a card as the span from one real title (whole-line bold whose inner text starts with `[`) to the next.

1. **Sub-label bolds → bullets.** Any whole-line bold whose inner text does NOT start with `[` → prefix with `- ` so it's no longer whole-line bold. Exception: a wrapped sentence continuation (e.g. the `variables populated … never hardcoded.` fragment) → merge onto the previous line with its inner `**` stripped.
2. **Add `STATUS:` per card** using this mapping (first match wins, check "partially resolved" before "resolved"):
   - Any card under the `## ✅ Resolved` archive header → `Done`.
   - Else read the card's `**Status:**` prose: `partially resolved` → In Progress; `resolved` (incl. "largely resolved") → Done; `documented, no action` → Done; `instrumented`/`awaiting` → In Progress; else → Backlog.
   - Insert the `STATUS:` line right after the `**Status:**` prose line (keep the prose — it holds the dated detail).
3. **`DEPENDS ON`** only for genuine blockers. Currently just one: the `crime_public_safety` / `public_safety` redundancy card depends on `Issue taxonomy is too broad for precise alignment matching`.
4. **Verify** by importing `prose_kanban.parser.parse` (+ `matcher.resolve_dependencies`) against the output. Assert: no card title lacking a `[` prefix, all `status_present == True`, and every `DEPENDS ON` resolves to a title.

Parser location: `simple-kanban/.claude/worktrees/create-app/prose_kanban/`.

## Open decisions (carry-forward)

- **Section structure is lost on ingestion.** The parser has no concept of sections, so `## Phase 1/2/3`, `#### sub-headers`, and `---` dividers get absorbed into the *preceding* card's description. If phase grouping should show on the board, decide: prefix card titles with a phase tag, or hold phase context elsewhere. Not yet done.
- **8 files still reference the old filename** (`post-launch-backlog`): `docs/alignment/PHASE2_HANDOFF.md`, `docs/design/2026-redesign/REBUILD_STATUS.md`, `docs/REDESIGN_2026_SHIPPED.md`, `src/lib/server/alignment.ts`, `src/lib/server/alignment.test.ts`, `.ai/work-packets/tdd-phase-1-core-discipline.md`, `.ai/work-packets/redesign-phase-1-prompt-refactor.md`, `.ai/project-briefs/tdd-rollout.md`. Update pointers? (not done)
- **More `DEPENDS ON`?** Other cross-refs in the doc are "Related:" siblings, not hard blockers. Add specific ones only on request — forcing them risks wrong fuzzy matches.

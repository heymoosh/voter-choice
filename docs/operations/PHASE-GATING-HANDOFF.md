# Handoff: gate voter-choice phases with epic cards + DEPENDS ON

## Goal
Make the orchestrator work **only Phase 1 + Cross-cutting** cards until you explicitly open a
later phase — gated cleanly by one "phase gate" epic card per boundary. Robust against the
future auto-promote loop.

## How the picker works (the why)
- voter-choice's conductor picks **only from `To Do`** (`ready_statuses: ["To Do"]` in
  `.orchestrator.json`). **Backlog is never touched** until something promotes it.
- It respects **`DEPENDS ON`**: a card is eligible only when its one DEPENDS-ON target is **Done**.
- `## Phase` headings are **cosmetic** — the picker ignores them. Gating is done purely via
  **STATUS** (To Do vs Backlog) + **DEPENDS ON**.
- Coming soon: a self-sustaining auto-promote loop (simple-kanban card `0da3916b`) will auto-move
  *ready* Backlog cards into To Do. **The DEPENDS ON gate is what stops it jumping ahead into
  Phase 2** — without it, status-scoping alone won't hold once that loop ships.

## The pattern
1. Create one **gate epic card per phase boundary**, kept in **Backlog**, that stays *not Done*
   until you decide to open that phase:
   - `[GATE] Phase 1 complete → open Phase 2`
   - `[GATE] Phase 2 complete → open Phase 3`
2. On **every Phase 2 card** (the cards under `## Phase 2 — Intermediary`), add one line:
   `- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2`
   On **every Phase 3 card** (under `## Phase 3 — Accurate ballot ingestion`):
   `- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3`
3. **Cross-cutting / Operations** cards and **Phase 1** cards get **no gate dep** — they run now.
4. Keep Phase 2/3 cards in **Backlog** for now (double-safe; today's picker won't touch them anyway).

## To open a phase (when you're ready)
- Drag the gate card to **Done**.
- *Today:* also promote that phase's cards to To Do.
- *Once the auto-promote loop ships:* just mark the gate Done — the loop promotes the now-unblocked
  cards for you. One move opens the whole phase.

## Do-first checklist
- [ ] Audit the **14 To Do cards** — move any Phase 2/3 card back to Backlog. To Do should be
      **Phase 1 + Cross-cutting only** (those are what get worked tonight).
- [ ] Create `[GATE] Phase 1 complete → open Phase 2` (STATUS: Backlog).
- [ ] Create `[GATE] Phase 2 complete → open Phase 3` (STATUS: Backlog).
- [ ] Add the matching `DEPENDS ON` line to each Phase 2 card, and each Phase 3 card.
- [ ] Leave Phase 1 + Cross-cutting cards ungated.

## Clean way to apply (via the prose_kanban helpers — avoids hand-editing the md)
```python
from prose_kanban import orchestrator_ops as o
BACKLOG = "docs/operations/voter-choice-backlog.md"   # abs path when run from elsewhere

# 1. gate cards
o.append_card(BACKLOG, "[GATE] Phase 1 complete → open Phase 2",
              "- Milestone gate — NOT a buildable task; keep in Backlog. Stays here until Phase 1 "
              "is shippable. Marking it Done unblocks every Phase 2 card that DEPENDS ON it.",
              status="Backlog")
o.append_card(BACKLOG, "[GATE] Phase 2 complete → open Phase 3",
              "- Milestone gate — same idea, one phase up.", status="Backlog")

# 2. point each phase card at its gate (title must match the gate EXACTLY)
o.apply_dependency(BACKLOG, "<Phase 2 card title>", "[GATE] Phase 1 complete → open Phase 2")
o.apply_dependency(BACKLOG, "<Phase 3 card title>", "[GATE] Phase 2 complete → open Phase 3")
```

## Watch-outs
- `DEPENDS ON` matches the target card's **title** and resolves when it's **Done** — keep gate
  titles **exact, unique, and stable** (don't rename them later).
- **One `DEPENDS ON` per card.** If a Phase 2 card already depends on something else, either
  re-point it at the gate, or make *that* dependency itself sit behind the gate.
- Do this while **no orchestrator is running on voter-choice** (edit via the board UI, or when
  idle) so you don't clobber live STATUS lines.
- **Don't gate Cross-cutting cards** — they're meant to run regardless of phase.

# Phase 3-5 Integration: How /start Picks Up New Phases

**Last updated:** April 3, 2026
**Purpose:** Documents what Claude Code needs to change so the existing `/start` command and experiment infrastructure supports Phases 3-5.

---

## What Needs to Change

The existing `/start` command (`/.claude/commands/start.md`) is designed for the Phase 1/2 experiment loop. It reads `RUN_LOG.md ## Next`, checks out a branch, runs the workflow, measures, tags, and updates the log. That core loop does not change. But several pieces need updating to support the new phases.

### 1. RUN_LOG.md — Write the New ## Next Entry

The current `## Next` says "Experiment complete." To kick off Phase 3, update it to:

```markdown
## Next

Phase 3 Run 1 — [workflow name] on `[branch-name]`. Execute Phase 3 (real ballot data integration) per `docs/PHASE3_SPEC.md`. Build on top of the Phase 2 completion tag.
```

The `/start` command already parses `## Next` for phase number, branch name, and spec file. It routes Phase 1-2 to branches and Phase 0/3 to main. **Phase 3, 4, and 5 should route to branches** (same as Phase 1-2) because each workflow builds independently.

**Change needed in `start.md`:** Update the phase routing logic to recognize Phases 3, 4, and 5 as branch-based phases (like 1 and 2), not main-based phases (like 0 and 3-analysis).

### 2. Branch Strategy

Each branch already has Phase 1 and Phase 2 code. Phase 3 builds on top of Phase 2 on each branch.

**Tagging convention (continues existing pattern):**

- Phase 2 tags already exist: `speckit-run3-phase2-complete`, `vanilla-phase2-complete`, etc.
- Phase 3 tags: `speckit-phase3-complete`, `superpowers-phase3-complete`, etc.
- Phase 4 tags: `speckit-phase4-complete`, etc.
- Phase 5 tags: `speckit-phase5-complete`, etc.

**Pre-flight check (Step 3d in start.md):** Currently verifies HEAD is at the Phase 1 tag for Phase 2 runs. Update this to verify HEAD is at the Phase N-1 tag for Phase N runs. The tag name should be derived from the branch name and previous phase number.

### 3. Workflow Files — Per-Branch .claude/commands/workflow.md

Each branch has its own `workflow.md` that defines the framework-specific methodology. These don't need to change — the workflow file describes HOW the framework works, not WHAT it builds. The spec file (PHASE3_SPEC.md, etc.) describes what to build.

**The `/start` command already reads the spec file** referenced in `## Next`. It passes the spec to the workflow as input. This pattern continues unchanged for Phases 3-5.

### 4. Measurement Script — scoring/measure.mjs (host-side)

The measurement script lives at `scoring/measure.mjs` on `main` (moved from `scripts/` as part of the scoring isolation fix — see `docs/LEARNINGS.md` → Learning 009). It runs ESLint, Vitest, duplication, bundle, Lighthouse, Playwright e2e, LOC, and the new security/privacy suite. It is invoked by Hermes from a host-side `main` worktree against a branch worktree via `node scoring/measure.mjs --repo <branch-worktree>`. It is NOT run inside the build container, and `npm run measure` no longer exists in `package.json`.

**Changes needed for Phase 3+:**

- **E2e tests need to be extended** with new test files for each phase. The measurement script runs ALL Playwright tests in the `e2e/` directory — so adding new test files is sufficient; the script doesn't need modification.
- **API mocking for e2e:** Phase 3+ e2e tests must mock external API responses. The Playwright test setup needs a mock server or request interception layer. This should be added as a Phase 3 infrastructure task (similar to how Phase 0.3b set up the initial e2e infrastructure).
- **New metric: API response coverage** (optional). Could measure what percentage of the data model is populated from live APIs vs. fallback. Not critical for the experiment comparison but useful for the product.

### 5. Randomized Run Order

Phase 1 and 2 used a randomized run order to control for learning effects. **Phase 3-5 should use a NEW randomized order** — don't re-use the Phase 1-2 order, because learning effects compound and a fresh randomization distributes them more fairly.

**Task:** Before Phase 3 Run 1, generate a new random sequence for all 5 workflows. Document it in `RUN_LOG.md` (same as Phase 0.5 did for Phases 1-2).

### 6. EXPERIMENT_DESIGN.md — Update the Execution Plan

The experiment design doc needs a new section covering Phases 3-5, following the same structure as the existing Phase 0-3 sections. This includes:

- Phase 3, 4, 5 descriptions and ownership
- Updated "What Done Means" criteria for each phase
- Updated Project Files table (add PHASE3_SPEC.md, PHASE4_SPEC.md, PHASE5_SPEC.md)
- Updated phase transition notes (Phase 2→3, 3→4, 4→5)

### 7. Environment Variables for Phase 3+

Phase 3 introduces API keys that need to be available on all branches. Since `.env.local` is gitignored, each branch needs its own copy (or the keys need to be set in the CI/build environment).

**For local development (Muxin's machine):** A single `.env.local` file at the repo root, present on all branches. Since it's gitignored, it persists across branch switches.

**For Vercel deployment (if applicable):** Set environment variables in the Vercel project settings, which apply to all deployments regardless of branch.

**For Phase 5 specifically:** The `ANTHROPIC_API_KEY` needs to be added with the $20/month workspace spending cap configured in the Anthropic Console before any Phase 5 runs begin.

---

## Execution Sequence

Here's the full sequence for running Phases 3-5, maintaining the experiment's controlled methodology:

### Pre-Phase 3 Setup (Claude Code on main)

1. Formalize the three spec files (PHASE3_SPEC.md, PHASE4_SPEC.md, PHASE5_SPEC.md) — they exist as Cowork drafts, Claude Code should review and commit them
2. Update `EXPERIMENT_DESIGN.md` with Phase 3-5 sections
3. Update `start.md` to support Phases 3-5 (branch routing, tag verification)
4. Add API mock infrastructure to Playwright setup (for Phase 3+ e2e tests)
5. Add new e2e test files for Phase 3 acceptance criteria
6. Generate new randomized run order for Phases 3-5
7. Set up API keys in `.env.local` (Muxin does this manually — keys should not be in any committed file)
8. Commit all infrastructure updates, tag as `v1-phase3-ready`
9. Update all 5 branches to include the new infrastructure (cherry-pick or merge from main)
10. Update `RUN_LOG.md ## Next` with the first Phase 3 run

### Phase 3 Runs (same pattern as Phases 1-2)

For each workflow (in new randomized order):

1. Muxin runs `/start` from main
2. Claude Code autonomously builds Phase 3, measures, tags, updates RUN_LOG
3. Muxin provides observations or says "nothing to add"

### Between Phase 3 and Phase 4

1. Claude Code adds Phase 4 e2e test files to all branches
2. New randomized order (or continue Phase 3 order — decide based on learning effect observations)
3. Update `RUN_LOG.md ## Next` for first Phase 4 run

### Phase 4 Runs (same pattern)

### Between Phase 4 and Phase 5

1. Muxin sets up Anthropic API key with $20/month cap
2. Claude Code adds Phase 5 e2e test files and API mock infrastructure for chat
3. Update `RUN_LOG.md ## Next` for first Phase 5 run

### Phase 5 Runs (same pattern)

### Phase 6: Analysis

Same as the original Phase 3 analysis, but now covering Phases 1-5 deltas across all workflows. The richer dataset (5 phases × 5 workflows) should reveal much clearer patterns about which workflows handle growing complexity well.

---

## Key Principle: Nothing Changes About How Muxin Works

From Muxin's perspective, the workflow is identical:

1. Open Claude Code in the voter-choice repo
2. Run `/start`
3. Wait for it to finish
4. Provide observations or say "nothing to add"

All the infrastructure changes are internal to the repo. The `/start` command handles everything automatically. Muxin does not need to remember which phase is active, which branch to check out, or which spec file to reference. That's all encoded in `RUN_LOG.md ## Next`.

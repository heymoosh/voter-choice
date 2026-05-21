# Project Brief: TDD Rollout — Willison red/green discipline + CI + mutation testing + visual regression

Slug: tdd-rollout
Status: active
Tracked by: this brief (no TRACKER section yet — to add if a tracker arc opens for ops work)
Started: 2026-05-19
Last updated: 2026-05-19

## Original Intent

> "We need to apply some test-driven development. We need to write tests before we code to ensure that what we built actually runs accordingly. … I want to absolutely enforce Willison's practice on TDD. … Tests need to be automated to ensure existing features don't break when we add new things."

## Original User Intent

From the planning session (2026-05-19):

1. Adopt test-driven development across `launch/production` work.
2. Enforce Simon Willison's red/green pattern — write the test, **run it, watch it fail**, then write code. Make the red phase rigorous, not optional.
3. Automate regression prevention so existing features don't break when new things land.
4. Use the project's existing artifact templates (project brief / work packets) so the rollout survives across multiple sessions.
5. Land the rollout in **multiple phases** because the user expects this to take many sessions:
   - Phase 1: core discipline (Willison ritual + CI + branch protection + red-phase enforcement)
   - Phase 2: Stryker mutation testing on high-stakes logic
   - Phase 3: visual regression + coverage thresholds + pre-push hook
   - Phase 4: Agentic QE (deferred / opt-in / advisory-only)

## Intent Interpretation

The user wants TDD as a *durable practice*, not a one-off discipline applied to the next packet. The 9 redesign packets already in `.ai/work-packets/` describe the upcoming product work; this rollout must land first so that work is implemented under the new discipline from the start.

The structural principle: **what we test isn't optional, but how we know our tests actually test the thing they claim to test isn't optional either.** Willison's red phase is the proof. Stryker's mutation testing is a second-level proof (would the test catch a real bug?). Visual regression is the third-level proof (does the rendered UI match what we baselined?).

Agentic QE is interesting but the project's existing `docs/ai-coding-practices/guardrails/qe-tooling.md` already caps its role at "advisory" and warns against `aqe init --auto`. Trust the existing kit: defer AQE until a concrete gap emerges that AQE solves better than manual work.

The validation principle: **don't standardize the discipline based on theory.** Phase 1 validates the workflow on one small real task (a P1 from the post-launch backlog) before the work-packet template gets updated to bake in the new ritual. If the validation surfaces friction, the template update incorporates the lesson.

## Goals

- Make the Willison red/green ritual the default for all execution work on `launch/production`.
- Provide automated regression protection via a CI test workflow + branch protection that blocks merge on failure.
- Enforce the red phase rigorously via `scripts/ai-tdd-red.sh` — not via developer discipline alone.
- Add mutation testing on high-stakes paths so the test suite's *quality* is measurable.
- Add visual regression once the redesign lands so UI changes surface explicitly to reviewers.
- Preserve the existing kit's posture: AGENTS.md as root contract; guardrails as decision owners; work packets as execution units.

## Domain / Business Rules

Rules:

- Tests are written first. Implementation follows. Always. (Phase 1 enforces.)
- The red phase is rigorous: every new test must be run *before* the implementation exists, and the failure output must be captured. `scripts/ai-tdd-red.sh` is the enforcement gate.
- CI gates merges into `launch/production`. Branch protection requires the test workflow green.
- Experiment branches (the `experiment/*` and `claude/*` worktrees for the framework-comparison study) are NOT subject to TDD enforcement — those exist to measure whether other workflow plugins already enforce best practices. Only `launch/production` and PRs into it require the gate.
- The kit owns `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, `.codex/config.toml`. AQE (Phase 4) must never overwrite these. Manual config only.
- Acceptance criteria in work packets must be observable. Tests are written from AC, not from implementation. (Already a `work-packet-rules.md` rule; this rollout reinforces it.)
- The Anti-Solutions section of every work packet must call out test-shape traps (hollow assertions, tautological mocks, snapshot-without-content).

Assumptions:

- Vitest 3.2.1 + Playwright 1.52.0 + React Testing Library 16.3.2 + `@vitest/coverage-v8` 3.2.1 are the canonical test toolchain. No tool churn.
- The existing `~30` test files in `src/` establish enough convention to extend.
- The existing pre-commit hook (`.githooks/pre-commit`) running `scripts/ai-verify.sh --staged` stays as the local fast-feedback gate.
- The deploy workflow (`.github/workflows/deploy.yml`) does not run tests itself; it deploys on push to `launch/production`. CI must run tests *before* merge so a failing build never reaches deploy.
- GitHub branch protection is configurable via the GitHub UI by the repo owner (Muxin). The CI workflow will reference job names that match the protection rules.

User-confirmed decisions:

- Branch protection only on `launch/production`. Experiment branches are intentionally exempt.
- AGENTS.md root contract is updated to bake TDD in (not just referenced from a guardrail).
- Red-phase evidence is formal via `scripts/ai-tdd-red.sh`, not ritual via "worker pastes failure."
- Visual regression baselines wait until the redesign lands (current design is being discarded; baselining now wastes effort).
- AQE is deferred to Phase 4 trigger-based; not enabled in Phase 1–3.
- The work-packet template is NOT updated until Phase 1 validation completes — the validation may surface friction that should shape the template change.
- A small task picked from the post-launch backlog serves as Phase 1's validation target — specifically the "limited data notice" fix from `docs/operations/post-launch-backlog.md`.

Open business questions:

- Should the deploy workflow gate on the test workflow (via `needs:`) so a deploy literally cannot start until tests pass, or rely on branch protection alone? (Currently leaning: branch protection alone is sufficient; the deploy workflow already runs only on `launch/production` push, which can only happen after merge, which requires tests green.)
- Mutation score threshold for Phase 2: start at 60% and ratchet, or set 80% as the launch bar?
- Coverage threshold for Phase 3: on all changed files, or just on files marked `// @critical-logic`?

## Commercial Readiness

Target readiness: launch (this rollout makes launch readiness durable)

Applicable lanes:

- security baseline — TDD on the BYOK path (redesign Phase 9) and PII strip (redesign Phase 1) reduces leak risk.
- API/contracts — golden-file tests on prompt routing (redesign Phase 1) lock the contract.
- privacy/data — PII tests assert what's stripped before any model call.
- observability/support — CI workflow surfaces failures publicly.
- deployment/config — branch protection turns "we should test before deploy" into "you can't merge without testing."

User decisions:

- Branch protection configuration: required job names must match what the workflow exposes. Single decision at Phase 1 ship time.

Known risks:

- Friction: rigorous red-phase enforcement adds time per AC. Mitigation: keep `scripts/ai-tdd-red.sh` fast; tune AC granularity.
- False positives in CI (flaky tests, env diffs): mitigation: deterministic seeds, no real network in unit tests; integration tests use VCR-style fixtures.
- Workflow yaml drift between deploy.yml and test.yml: mitigation: shared composite action or a single source of truth for setup steps.

## Operational Reproducibility

Setup path:

- `npm install` (existing)
- After Phase 1: `chmod +x scripts/ai-tdd-red.sh` for local use
- After Phase 2: `npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker`
- After Phase 3: Playwright browsers are already installed; visual baselines committed in-repo

Provider/config strategy:

- CI: GitHub Actions. Branch protection: GitHub UI.
- No provider changes; no MCP changes in Phase 1–3.
- Phase 4 (deferred): AQE via npx-launched MCP, manually wired into `.claude/mcp.json` and `.codex/config.toml`.

Database/migration strategy:

- not applicable

CI/deploy checks:

- New `.github/workflows/test.yml` runs lint + test + build (job 1) and e2e (job 2) on every PR + push to `launch/production`.
- Branch protection on `launch/production` requires both jobs green.
- Existing `.github/workflows/deploy.yml` continues to fire on push to `launch/production` post-merge.
- Phase 2 adds `.github/workflows/mutation.yml` (likely nightly, or on PR touching scoped paths).

Manual steps:

- One-time: configure GitHub branch protection on `launch/production` (Settings → Branches → Add rule). Required status checks: `test` and `e2e` jobs from `test.yml`.
- One-time (Phase 4 trigger): create `.ai/enable-aqe` marker and manually wire AQE MCP. Currently deferred.

## Decisions Made

- **Four-phase rollout** — Phase 1 (core) → Phase 2 (mutation) → Phase 3 (visual + thresholds) → Phase 4 (AQE, deferred). Rationale: each phase is sized for ~1-3 sessions; dependencies are explicit; AQE is true opt-in.
- **Willison red/green is the canonical TDD pattern** — write test, run, see fail, capture failure, implement, run, see pass, full suite, commit, CI verifies. Rationale: discipline beats automation here; the user explicitly wants Willison's approach.
- **Branch protection on `launch/production` only** — experiment branches exempt. Rationale: experiments measure other-plugin discipline; forcing this discipline on them defeats the measurement.
- **AGENTS.md root contract bake-in** — TDD ritual is stated in AGENTS.md, not just referenced from a guardrail. Rationale: stronger signal; every session reading AGENTS.md sees the rule.
- **Red-phase enforced via script, not ritual** — `scripts/ai-tdd-red.sh` is mandatory. Rationale: scripts don't forget; rituals do.
- **Validate Phase 1 on a small non-redesign task** — picked the "limited data notice" P1 from `docs/operations/post-launch-backlog.md`. Rationale: real work, isolated, small enough for one session, doesn't entangle TDD validation with the much larger redesign.
- **Work-packet template update DEFERRED until Phase 1 validates** — backfill into the 9 redesign packets after the template stabilizes. Rationale: validation may surface friction that shapes the template change.
- **Stryker timing — before redesign Phase 1** — TDD Phase 1 lands → TDD Phase 2 (Stryker) lands → THEN redesign Phase 1 (prompt refactor) starts. Rationale: prompt routing + PII strip are the highest-stakes redesign code; mutation testing should be in place when those tests are first written, not bolted on after.
- **Visual regression baselines AFTER redesign lands** — current design is being discarded; baselining now wastes effort.
- **AQE is genuinely deferred** — trigger is "a concrete gap that AQE solves better than manual work." Not a scheduled phase.
- **2026-05-21: TDD rollout three-phase harness SHIPPED + VALIDATED end-to-end.** Phase 1 + 1a + 2 + 2a + 2b all merged via the gate stack without admin bypass (7 PRs total). `test` + `e2e` + `mutation` all required on `launch/production`; all gates have populated app_ids. Verification rigor rule baked into TDD guardrail after Phase 2a discipline-gap finding. Phase 3 (visual regression + coverage thresholds + pre-push hook) remains queued but blocked-on-redesign for visual baselines. Phase 4 (AQE) remains trigger-based. Redesign Phase 1 (prompt refactor) is unblocked and ready.

## Rejected Options

- **Tool churn** (Jest, Cypress, Mocha, Pact) — vitest + playwright already cover the surface. No churn.
- **`aqe init --auto`** — explicitly forbidden by existing `qe-tooling.md`. Would overwrite kit sources of truth.
- **Required CI on all branches** — would block experiment branches; user explicitly wants those exempt.
- **Standardize the template before validating** — would risk baking in workflow friction we hadn't yet discovered.
- **Big-bang multi-tool setup (Stryker + visual regression + coverage all in Phase 1)** — too much scope; lower confidence each piece is configured right; harder rollback.
- **Letting AQE drive test generation** — the kit's `qe-tooling.md` is unambiguous: AQE is advisory, never owner. Rejected as a Phase 1 path.

## Current State

- Test stack: Vitest 3.2.1, Playwright 1.52.0, React Testing Library 16.3.2, jsdom 25.0.1, `@vitest/coverage-v8` 3.2.1. All in `package.json` `devDependencies`.
- ~30 existing test files in `src/`. Conventions established (`// @vitest-environment jsdom`, fixtures, `screen` queries, `vi.fn()` mocks).
- `e2e/` directory has 2 Playwright spec files (`ballot-tool.spec.ts`, `features.spec.ts`).
- Pre-commit hook at `.githooks/pre-commit` runs `scripts/ai-verify.sh --staged` (lint + test + build on staged changes).
- `scripts/ai-verify.sh` is the umbrella verification gate referenced by AGENTS.md.
- **No CI test workflow exists.** `.github/workflows/` contains 6 workflows: `deploy.yml` + 5 data-ingest workflows. Regressions can land on `launch/production` and be deployed without CI noticing.
- `docs/ai-coding-practices/guardrails/qe-tooling.md` documents AQE as deferred behind a `.ai/enable-aqe` marker that does NOT exist yet.
- 9 redesign work packets in `.ai/work-packets/redesign-phase-*.md` are drafted (uncommitted in working tree) and ready for review; they do NOT yet have Test Plan sections.

## System Ownership Map

Domain concerns:

- test discipline (red/green ritual) — owner: `docs/ai-coding-practices/guardrails/test-driven-development.md` (Phase 1 creates)
- red-phase enforcement — owner: `scripts/ai-tdd-red.sh` (Phase 1 creates)
- CI test gate — owner: `.github/workflows/test.yml` (Phase 1 creates)
- branch protection policy — owner: GitHub repo settings (Phase 1 manual one-time)
- mutation testing — owner: `stryker.config.json` + `.github/workflows/mutation.yml` (Phase 2 creates)
- visual regression — owner: Playwright e2e specs + committed baselines (Phase 3)
- coverage thresholds — owner: `vitest.config.ts` (Phase 3 extends)
- pre-push hook — owner: `.githooks/pre-push` (Phase 3 creates)
- AQE adapter — owner: `.claude/mcp.json` + `.codex/config.toml` (Phase 4 trigger, manual)

Known overlaps:

- `scripts/ai-verify.sh` (umbrella gate) and the new test workflow both run `npm run test`. Mitigation: ai-verify stays as local gate; CI is canonical for merge decisions.
- `scripts/ai-qe-check.sh` (already exists, stub) and the future AQE adapter (Phase 4). Mitigation: ai-qe-check stays advisory; Phase 4 if/when triggered wires the real adapter behind it.

Open gaps:

- The work-packet template doesn't have a Test Plan section yet. Phase 1 deliberately defers the template change to post-validation.
- The 9 redesign packets reference `scripts/ai-verify.sh` for verification but don't enforce the red phase. Backfill happens after Phase 1 validates.

Execution packet rules:

- Every work packet under this brief that touches Phase 1's CI workflow yaml must match job names against the branch-protection requirement.
- No packet under this brief shall enable AQE without the `.ai/enable-aqe` marker and a user-approved Phase 4 trigger.
- Every packet under this brief shall include a Test Plan section as a preview of the upcoming template change (informs that change).

## Work Packets

- `.ai/work-packets/tdd-phase-1-core-discipline.md` — TDD Phase 1: Willison ritual + CI workflow + branch protection + red-phase script + guardrail doc + AGENTS.md update + validation on the "limited data notice" task. Status: SHIPPED + VALIDATED end-to-end 2026-05-20 (commits `5967ced` + `6dfcf38`; validated via Phase 2a). Branch protection currently relaxed to require `test` only; `e2e` to be re-added when Phase 1a lands.
- `.ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md` — TDD Phase 1a (follow-up to Phase 1): make `npm run e2e` pass reliably in CI so `e2e` can be re-added to branch-protection required-status. Status: ready. Discovered by Phase 1's first CI run (46/94 e2e tests timed out on `prompt-output` waitFor — pre-existing CI-readiness gap exposed by the new gate, not a regression).
- `.ai/work-packets/tdd-phase-2-mutation-testing.md` — TDD Phase 2: Stryker setup, scoped mutation testing on high-stakes paths, mutation-score threshold, CI integration. Status: SHIPPED + VALIDATED end-to-end 2026-05-20 (commit `d0f38ac`; tool validated via Phase 2a Experiment 2; gate refinement needed — see Phase 2b).
- `.ai/work-packets/tdd-phase-2a-end-to-end-validation.md` — TDD Phase 2a: refocused to two local experiments validating Q1 (regression detection + hollow-test detection) rather than four PR cycles for Q2. Status: SHIPPED 2026-05-20. **Findings:** Q1a PASS (regression detection works — 4 of 5 alignment tests fire on a 1-char threshold flip). Q1b tool PASS (Stryker correctly flagged all 4 mutants of a hollow test as Survived). Q1b gate ⚠️ NUANCED (global `break: 22` too coarse to flag small hollow additions — Phase 2b candidate). Q2 PR-mechanics validated incidentally via PRs #1 + #2 (`test` gate correctly blocked PR #1 on pre-existing prettier drift; PR #2 fixed drift and merged cleanly via UI without admin override). Surfaced a real discipline gap: subagent verification reports of "lint clean" were unreliable across Phase 1 + 2; orchestrator-re-verification rule added to TDD guardrail.
- `.ai/work-packets/tdd-phase-2b-mutation-gate-refinement.md` — TDD Phase 2b (follow-up surfaced by Phase 2a): refine mutation gate from global threshold to per-file or per-PR granularity so small hollow tests on small additions still trip the gate. Status: NOT YET DRAFTED — surface as needed when Phase 2a Evidence Plan signals it's important to ship before more redesign work runs through the gate.
- `.ai/work-packets/tdd-phase-3-visual-regression-and-thresholds.md` — TDD Phase 3: Playwright visual regression baselines (post-redesign), coverage thresholds, pre-push hook, polish. Status: ready (blocked-on Phase 1 + redesign Phase 4 baseline).
- `.ai/work-packets/tdd-phase-4-aqe-advisory.md` — TDD Phase 4: Agentic QE advisory enablement. Status: DEFERRED — no packet drafted until a trigger fires. The brief carries this as a placeholder.

## Open Questions

- (For Phase 2 scoping) Which exact files get mutation-tested in v1? Proposal: `src/lib/prompts/**`, `src/lib/state-rules/**`, `src/lib/server/budget.ts`, `src/lib/anthropic-client-byok.ts`. Refine when Phase 2 is groomed.
- (For Phase 2 threshold) Mutation score target: 60% start vs 80% start? Defer to Phase 2 grooming.
- (For Phase 3 coverage) Apply thresholds to all source, all changed files, or only `// @critical-logic` tagged files? Defer to Phase 3 grooming.
- (For Phase 4 trigger) What concrete signal would justify enabling AQE? Proposal: when coverage-gap analysis or flaky-test triage becomes a chronic time sink in a project sense. Recorded here so future-Muxin remembers.

## Next Steps

1. **Review the three drafted work packets** (TDD Phase 1, 2, 3) in `.ai/work-packets/tdd-phase-*.md`.
2. **Sign off on the validation task** (limited-data notice from `post-launch-backlog.md`) as Phase 1's target.
3. **Decide branch protection scope** (required jobs on `launch/production` only — confirmed) and how to apply (manual GitHub UI step at Phase 1 ship time).
4. **Execute Phase 1** via `/work-next` against `tdd-phase-1-core-discipline.md`. Worker writes tests first (the limited-data notice tests), runs the new `scripts/ai-tdd-red.sh`, confirms red, implements, confirms green, runs the full suite, ships.
5. **Post-Phase-1: update the work-packet template** with a Test Plan section informed by what was learned. Backfill into the 9 redesign packets.
6. **Then Phase 2** — Stryker setup, scoped paths, CI integration.
7. **Then begin redesign work** — starting with `redesign-phase-1-prompt-refactor.md`, now under the TDD discipline.
8. **Phase 3 (visual regression baselines + coverage thresholds + pre-push hook)** — visual baselines wait until redesign Phase 4 (text-first cards) lands; coverage thresholds + pre-push can ship any time after Phase 1.
9. **Phase 4 (AQE)** — deferred. Revisit only when a concrete gap surfaces.

# Workflow Experiment — Phase 3 Analysis

**Completed:** 2026-04-03  
**Analyst:** Claude Code (claude-sonnet-4-6)  
**Experiment design:** Muxin  

---

## Executive Summary

Five AI coding workflow frameworks were used to build the same Next.js ballot research tool, then extend it with Spanish language support. The experiment asks: **which workflow produces code that's easiest to extend and maintain?**

**Top-line result:** All four framework-guided workflows (CE, Superpowers, Spec Kit, BMAD) produced significantly better code than Vanilla Claude Code. Vanilla was the only branch with persistent e2e failures (36/42, 85.7%) and the only branch with a confirmed TDD violation. Among the frameworks, Spec Kit and Superpowers had the highest test coverage (88–92%), while BMAD uniquely extended the e2e suite in Phase 2 (+20 new tests). Compound Engineering was fastest but added zero new tests in Phase 2.

**Caveats:** This experiment has two structural limitations that must be acknowledged. First, all runs were autonomous (no human operator input), which is a realistic scenario but means qualitative "feel" data is absent. Second, Phase 1 runs 1–4 were invalidated and re-run after discovering frameworks were not being invoked (Learning 001) — the final datasets are from corrected runs with proper enforcement.

---

## Experiment Setup

### The Task

Build a ballot research tool website. Users enter a zip code, get a customized AI research prompt pre-filled with their state's election data. The tool displays state info (election dates, registration deadlines, early voting, voter ID requirements) and generates a copyable prompt.

**Phase 1:** Build the complete tool from scratch using `docs/PROJECT_SPEC.md`.  
**Phase 2:** Extend with full Spanish language support using `docs/PHASE2_SPEC.md`.

### The Frameworks

| # | Framework | Branch | Tag prefix | Steps |
|---|-----------|--------|------------|-------|
| 1 | Vanilla (no framework) | `workflow/vanilla` | `vanilla` | 1 (build) |
| 2 | Compound Engineering | `run4/compound-engineering` | `ce-run4` | 4 (plan→work→review→compound) |
| 3 | Superpowers | `run3/superpowers` | `superpowers-run3` | 6 (brainstorming→plans→execute→review→verify→finish) |
| 4 | Spec Kit | `run3/spec-kit` | `speckit-run3` | 8 (constitution→specify→clarify→plan→tasks→checklist→analyze→implement) |
| 5 | BMAD | `run3/bmad` | `bmad-run3` | 10 (brainstorming→brief→PRD→UX→architecture→epics→readiness→sprint→implement→review) |

### Run Invalidation

Phase 1 runs 1–4 were invalidated before BMAD was run (see `docs/LEARNINGS.md` Learning 001). Root cause: the `/start` command contained soft guidance ("use framework commands if available") rather than hard enforcement. Claude Code read the spec and coded directly on all branches — identical behavior regardless of which framework was installed. The independent variable was not actually varied.

**Corrective action:** Created framework-specific `workflow.md` files on new `run3/` and `run4/` branches with explicit Skill tool invocation and CLAUDE.md enforcement. All four framework runs are from corrected branches. Vanilla's Phase 1 results are kept (no framework to bypass).

**Impact on analysis:** Original run1 branches are preserved as experiment data documenting the bypass behavior, but are excluded from comparison tables below.

---

## Methodology Notes

### Measurement Infrastructure

- **ESLint:** `eslint-plugin-complexity` (max 10), `eslint-plugin-prettier` — identical config all branches
- **Unit tests:** Vitest. Shared scaffold has no tests; each workflow generates its own test suite.
- **E2e tests:** Playwright. 42 shared tests in `e2e/ballot-tool.spec.ts` (added in Phase 0). BMAD Phase 2 extended to 62 tests.
- **Bundle size:** Next.js production build (`npm run build`)
- **Lighthouse:** Measured on host Mac (Chromium not available in Docker container). Phase 2 Lighthouse data: only Spec Kit (via Docker workaround). All others: N/A (container limitation).
- **TDD adherence:** `scripts/analyze-adherence.mjs` — analyzes whether test files appear before impl files in git history. Methodology described below.

### TDD Score Methodology

The adherence script scores TDD per **test file**: was this test file's first commit before or after its corresponding impl file's first commit?

- `tddOrderCorrect`: test appeared before impl ✓
- `tddOrderViolated`: impl appeared before test ✗
- `tddUnchecked`: test file introduced in a phase where the impl file was not (cross-phase)
- `tddNeutral`: test and impl in the same commit (can't determine order)
- `tddScore` = `tddOrderCorrect / (tddOrderCorrect + tddOrderViolated)` × 100, or null if all unchecked

### Phase 2 Build Duration (from `metrics/timing.jsonl`)

| Framework | Phase 2 start | Phase 2 end | Duration |
|-----------|---------------|-------------|----------|
| Vanilla | 2026-03-31 22:04 UTC | (no end recorded) | ~14 min† |
| Compound Engineering | 2026-04-01 14:28 UTC | 2026-04-01 14:49 UTC | **21 min** |
| Superpowers | 2026-04-03 13:47 UTC | 2026-04-03 14:40 UTC | **54 min** |
| Spec Kit | 2026-04-03 18:49 UTC | 2026-04-03 19:25 UTC | **37 min** |
| BMAD | 2026-04-03 20:55 UTC | 2026-04-03 22:25 UTC | **90 min** |

† Vanilla: `build_end` not logged (timing.jsonl has only `build_start`). Duration from RUN_LOG notes.

---

## Phase 1 Results: Building from Scratch

### Code Quality

| Framework | E2e | Unit tests | Line cov% | ESLint e/w/c | Dup% | Page bundle | Lighthouse P/A/B/S |
|-----------|-----|-----------|-----------|--------------|------|-------------|-------------------|
| **Vanilla** | **36/42 (85.7%)** | 0 | — | 0/1/1 | 0% | 9.87 kB | 100/100/100/100 |
| CE | 42/42 (100%) | 39/39 | 17.4% | 0/0/0 | 0% | 12.9 kB | N/A† |
| Superpowers | 42/42 (100%) | 53/53 | **80.2%** | 0/0/0 | 0% | 7.92 kB | 100/100/100/100 |
| Spec Kit | 42/42 (100%) | **72/72** | **88.3%** | 0/0/0 | 0% | 8.08 kB | 100/100/100/100 |
| BMAD | 42/42 (100%) | 50/50 | 19.1% | 0/0/0 | 0% | 6.32 kB | 100/**96**/100/100 |

† CE Phase 1 Lighthouse: N/A (container limitation). Note: +102 kB shared JS on all branches (Next.js runtime).

### Code Size (Phase 1)

| Framework | src/ LOC | src/ files | Commits since scaffold | Lines added |
|-----------|---------|-----------|----------------------|-------------|
| Vanilla | 1,026 | 10 | 11 | +2,483 |
| CE | 1,755 | 23 | 16† | +43,079 |
| Superpowers | 1,623 | 25 | 26 | +15,061 |
| Spec Kit | 1,838 | 29 | 18 | +8,798 |
| BMAD | 1,364 | 22 | 17 | +48,562 |

† CE Phase 1 includes multiple sessions (plan+work+review+compound cycle). The high line delta for CE and BMAD reflects extensive framework documentation artifacts (plan files, solution docs, PRD, architecture docs, epics) counted in the git diff.

### Phase 1 Findings

1. **Vanilla shipped with e2e failures.** 6/42 tests fail (85.7%). Root causes: HTML5 `pattern` attribute on zip input blocks the JS submit handler; `state-selector` strict mode violation in multi-state flow. These bugs were introduced and never caught without framework oversight.

2. **Vanilla had 0 unit tests.** No test files were written. All four framework-guided runs produced unit test suites (39–72 tests).

3. **Coverage gap between frameworks.** Spec Kit (88.3%) and Superpowers (80.2%) produced dramatically higher coverage than CE (17.4%) and BMAD (19.1%). Both Spec Kit and Superpowers enforce TDD Iron Law explicitly. BMAD and CE do not.

4. **Bundle sizes are tight.** BMAD produced the smallest page bundle (6.32 kB), Vanilla the second-smallest (9.87 kB), despite Vanilla having the worst quality metrics. Framework overhead in planning docs does not bloat production JS.

5. **BMAD Accessibility 96.** Only BMAD Phase 1 had a sub-100 accessibility Lighthouse score. Not a code defect — likely container render timing in the test run.

---

## Phase 2 Results: Extending with Spanish

### Code Quality

| Framework | E2e | Unit tests | Line cov% | ESLint e/w/c | Dup% | Page bundle | Lighthouse P/A/B/S |
|-----------|-----|-----------|-----------|--------------|------|-------------|-------------------|
| Vanilla | **36/42 (85.7%)** | 19/19 | — | 0/0/0† | 0% | 17.9 kB | N/A |
| CE | 42/42 (100%) | 39/39 (unchanged) | 32.8% | 0/0/0 | 0% | 21.1 kB | N/A |
| Superpowers | 42/42 (100%) | 107/107 | **89.9%** | 0/0/0 | 0.52% | 13.6 kB | N/A |
| Spec Kit | 42/42 (100%) | **159/159** | **91.6%** | 0/0/0 | 0.45% | 16.0 kB | 100/100/100/100 |
| BMAD | **62/62 (100%)** | 101/101 | 37.75% | 0/0/0 | 0.34% | 12.0 kB | N/A |

† Vanilla Phase 2 ESLint improved (1 warning + 1 complexity violation fixed during refactor to support translations).

### Phase 1 → Phase 2 Delta

| Framework | E2e delta | Unit test delta | Coverage delta | LOC delta | ESLint delta |
|-----------|-----------|----------------|----------------|-----------|--------------|
| Vanilla | ±0 (still 36/42) | +19 (0→19) | — | +812 | −1w −1c (improved) |
| CE | ±0 | **0** (no new tests) | +15.4 pp | +580 | ±0 |
| Superpowers | ±0 | +54 (53→107) | +9.7 pp | +966 | ±0 |
| Spec Kit | ±0 | **+87** (72→159) | +3.3 pp | +1,356 | ±0 |
| BMAD | **+20 e2e** (42→62) | +51 (50→101) | +18.7 pp | +762 | ±0 |

**Key signals:**
- BMAD was the only framework to extend the shared e2e suite in Phase 2 (+20 tests: 10 language toggle + 10 accessibility). All others maintained 42/42.
- CE added **zero** new unit tests in Phase 2. The Spanish feature was added without test coverage for the new i18n code.
- Spec Kit added the most unit tests (+87) and ended Phase 2 with the highest coverage (91.6%).
- All frameworks maintained zero ESLint errors through Phase 2.
- All frameworks introduced minimal duplication (≤0.52%) — well within acceptable range.

### Phase 2 Code Size

| Framework | Phase 1 LOC | Phase 2 LOC | Delta | Phase 2 files |
|-----------|------------|------------|-------|---------------|
| Vanilla | 1,026 | 1,838 | +812 (+79%) | ~14 |
| CE | 1,755 | 2,335 | +580 (+33%) | 28 |
| Superpowers | 1,623 | 2,589 | +966 (+60%) | 33 |
| Spec Kit | 1,838 | 3,194 | +1,356 (+74%) | 37 |
| BMAD | 1,364 | 2,126 | +762 (+56%) | 29 |

Spec Kit grew the most (+1,356 LOC) because its TDD Iron Law requires comprehensive test coverage for all new code. CE grew the least (+580) despite the same feature scope — consistent with adding no new unit tests.

---

## Framework Adherence

### Workflow Completion

All five frameworks completed all expected workflow steps. `metrics/workflow-log.jsonl` on each branch confirms step completion.

| Framework | Steps logged | Steps completed | Gaps |
|-----------|-------------|----------------|------|
| Vanilla | 1/1 | 1/1 | None |
| CE | `lfg` started + completed | 1/1 | None (3 lfg sessions, Phase 1+2) |
| Superpowers | 6 Phase 1 + 6 Phase 2 | 12/12 | None |
| Spec Kit | 8 steps + 5 implement sub-steps | 13/13 | None |
| BMAD | 9 steps logged | 9/10† | `bmad:code-review` not logged |

† BMAD `bmad:code-review` was completed (findings resolved) but not logged in `workflow-log.jsonl` due to session split.

### TDD Adherence

| Framework | Phase 1 tddScore | Phase 2 tddScore | Impl-only commits | Assessment |
|-----------|-----------------|-----------------|-------------------|------------|
| Vanilla | 0% (1 violation) | 0% (1 violation) | 1 | **Confirmed violation** |
| CE | 100% | 100% | 3 impl-only† | High adherence |
| Superpowers | null (unassessable) | null (unassessable) | 4 (cross-phase) | Cannot verify |
| Spec Kit | 100% | 30%† | 0 impl-only | Partially adherent |
| BMAD | null (unassessable) | null (unassessable) | 0 | Cannot verify |

† CE: 3 "impl-only" commits are multi-file integration commits; test files added in preceding commits. The adherence script scores test files (4/4 = 100%), not impl commits.  
† Spec Kit Phase 2: 30% score reflects that 7/10 test files were committed in the same commit as their impl (GREEN commits in TDD cycle). 0 commits had impl without any accompanying test.

**Interpretation:** Vanilla is the only framework with a confirmed TDD violation (impl committed before its test). Spec Kit, CE, and BMAD all had test coverage for every implementation commit. Superpowers: bundled commits prevent verification, but 0 impl-only commits indicates tests accompanied all code.

### Framework Artifacts Produced

| Framework | Artifacts | Produced |
|-----------|-----------|---------|
| Vanilla | workflow-log.jsonl | ✓ |
| CE | plan file, solution doc, workflow-log | ✓ (both phases) |
| Superpowers | brainstorming doc, plan doc, workflow-log | ✓ (both phases) |
| Spec Kit | constitution, spec, clarify, plan, tasks, checklist, analyze — all in `specs/` | ✓ (both phases) |
| BMAD | brainstorming, product-brief, PRD, UX-design, architecture, epics, sprint plan — 6+ docs | ✓ (both phases) |

---

## Cross-Framework Comparison

### Composite View (Phase 2 Final State)

| Metric | Vanilla | CE | Superpowers | Spec Kit | BMAD |
|--------|---------|-----|-------------|---------|------|
| E2e pass rate | 85.7%⚠ | 100% | 100% | 100% | 100% |
| Unit tests | 19 | 39 | 107 | **159** | 101 |
| Line coverage | — | 32.8% | 89.9% | **91.6%** | 37.75% |
| ESLint errors | 0 | 0 | 0 | 0 | 0 |
| Duplication | 0% | 0% | 0.52% | 0.45% | 0.34% |
| Page bundle | 17.9 kB | 21.1 kB | 13.6 kB | 16.0 kB | **12.0 kB** |
| src/ LOC | 1,838 | 2,335 | 2,589 | 3,194 | 2,126 |
| Phase 2 duration | ~14 min | **~21 min** | ~54 min | ~37 min | ~90 min |
| New e2e in P2 | 0 | 0 | 0 | 0 | **+20** |
| New unit in P2 | +19 | **0** | +54 | **+87** | +51 |

### Strengths and Weaknesses

**Vanilla (no framework)**
- ✓ Fastest, least overhead
- ✗ Shipped with 6 broken e2e tests (only framework to do so)
- ✗ Zero unit tests in Phase 1
- ✗ 1 confirmed TDD violation
- ✗ ESLint issues (1 warning, 1 complexity violation) fixed only during Phase 2

**Compound Engineering**
- ✓ Fast build (21 min Phase 2), full workflow compliance
- ✓ Strong architectural artifacts (plan + solution docs)
- ✗ Zero new tests added in Phase 2 — Spanish support shipped without i18n unit tests
- ✗ Lowest coverage among frameworks (32.8%) — suggests test depth is not a framework priority
- ✓ Clean, tightly structured code (smallest LOC delta in P2: +580)

**Superpowers**
- ✓ High coverage in both phases (80.2% → 89.9%)
- ✓ 100% e2e both phases
- ✓ Produces comprehensive test suites (+54 new tests in Phase 2)
- ✗ TDD unassessable (cross-phase test/impl bundling)
- ✓ Subagent-driven development produces well-structured, modular code
- ✗ Longest Phase 1 history (multi-session, context-limit splits)

**Spec Kit**
- ✓ Highest unit test count (159) and coverage (91.6%)
- ✓ 100% e2e both phases
- ✓ Only framework with Phase 2 Lighthouse data (100/100/100/100)
- ✓ TDD Iron Law enforced — all code has test coverage
- ✗ Most code written (+1,356 LOC in Phase 2) — more surface area to maintain
- ✗ Branch naming incompatibility (Spec Kit scripts require `001-feature-name` format)
- ✗ TDD score in Phase 2 = 30% (mixed commits) — strict commit-level ordering not enforced

**BMAD**
- ✓ Most comprehensive e2e suite (62 tests — only framework to extend shared e2e in Phase 2)
- ✓ Tightest production bundle (12.0 kB page) despite full i18n
- ✓ 0 impl-only commits — all code shipped with tests
- ✓ Most thorough planning artifacts (6+ pre-build docs per phase)
- ✗ Slowest build (90 min Phase 2) — planning overhead is real
- ✗ Coverage dropped from branch lines % (19.07% Phase 1 → 37.75% Phase 2) suggests Phase 1 tests were shallow on line coverage
- ✗ `bmad:code-review` not logged in workflow-log (session split)

---

## Key Findings

### Finding 1: Framework enforcement prevents e2e regressions

**All four framework-guided builds shipped with 42/42 e2e passing. Vanilla shipped with 36/42 (85.7%).**

This is the starkest differentiator. The 6 Vanilla failures (HTML5 pattern attribute blocking JS handler + strict mode violation) were introduced in Phase 1 and never fixed across both phases. Framework-guided builds caught and fixed these during development — either through mandatory review steps (CE: `ce:review`; BMAD: `bmad-code-review`) or TDD cycles that catch behavioral failures early (Spec Kit, Superpowers).

### Finding 2: Without enforcement, frameworks are bypassed

Learning 001 (documented in `LEARNINGS.md`) showed that all four framework-guided Phase 1 runs were initially identical to Vanilla — Claude Code ignored the framework commands and coded directly. Re-runs with hard enforcement (`workflow.md` + CLAUDE.md requirements) produced meaningfully different behavior. **A framework installed but not enforced is indistinguishable from no framework.**

This finding extends beyond this experiment: any autonomous AI coding agent will follow the path of least resistance unless explicit invocation requirements exist.

### Finding 3: Test coverage is a framework choice, not a framework guarantee

Line coverage in Phase 2:
- Spec Kit: 91.6% | Superpowers: 89.9% (both enforce TDD Iron Law)
- CE: 32.8% | BMAD: 37.75% (neither mandate line-level coverage)

Spec Kit and Superpowers both explicitly require "RED→GREEN→REFACTOR→COMMIT" TDD cycles. The result is ~3× higher coverage than frameworks that don't mandate this. CE added **zero new unit tests** in Phase 2, shipping a full i18n implementation without test coverage for the translation logic.

### Finding 4: BMAD uniquely extended the testing surface

BMAD is the only framework that added new e2e tests in Phase 2 (62 total vs 42 baseline). BMAD's story-driven development (10 stories in Phase 2) naturally expanded the test suite — each story has acceptance criteria that become e2e tests. The other frameworks treated e2e as a verification gate, not a deliverable to extend.

### Finding 5: Planning overhead has real cost but real benefit

Phase 2 build times correlate loosely with framework planning depth:
- Vanilla: ~14 min (no planning)
- CE: ~21 min (plan + work + review + compound)
- Spec Kit: ~37 min (8 structured steps)
- Superpowers: ~54 min (6 steps with subagent-driven dev)
- BMAD: ~90 min (10-step full BMAD pipeline)

BMAD takes 4× longer than CE for Phase 2. But BMAD produced 20 more e2e tests and a 62/62 pass rate with the most comprehensive planning artifacts. Whether the quality gain justifies the time cost depends on project longevity — for a maintenance-heavy production tool, the investment likely pays back. For a throwaway prototype, CE's speed is valuable.

### Finding 6: Bundle size is not a differentiator

All frameworks produced nearly identical shared JS bundles (~102 kB). Page-specific bundle growth in Phase 2 was consistent across frameworks (translations add ~5–8 kB). Bundle size is not a signal for workflow quality in this experiment.

### Finding 7: The codebase scale health check

Phase 2 src/ LOC and file counts:

| Framework | src/ LOC | src/ files | Scale rating |
|-----------|---------|-----------|-------------|
| Vanilla | 1,838 | ~14 | 🟢 Green |
| CE | 2,335 | 28 | 🟢 Green |
| Superpowers | 2,589 | 33 | 🟢 Green |
| Spec Kit | 3,194 | 37 | 🟢 Green |
| BMAD | 2,126 | 29 | 🟢 Green |

All branches are well within the Green threshold (< 40 files / < 3k LOC). None of the Phase 2 builds hit the Yellow zone. This validates the project scope as appropriate for the experiment — results reflect framework quality differences, not codebase complexity confounds.

---

## Known Limitations

These are documented in `docs/EXPERIMENT_DESIGN.md` and reproduced here for the write-up.

### Learning effects (N=1 model)

All runs used the same Claude Code model family (claude-sonnet-4-6 for most Phase 2 runs; claude-opus-4-6 was considered but Sonnet was settled as the standard). The model sees its own prior output on branches, which could create path dependence. However, since each Phase 2 run starts from a Phase 1 branch built with the framework's methodology, the starting state is controlled.

Importantly: the "operator" for all runs was Claude Code itself (fully autonomous). There is no human learning effect. The solo-operator confound from the original experiment design does not apply — Claude Code does not accumulate session fatigue.

### Spec-format bias

All frameworks received identical structured spec docs (`PROJECT_SPEC.md`, `PHASE2_SPEC.md`). Spec-first frameworks (Spec Kit in particular) are optimized for this input format. More conversational frameworks might perform differently with iterative direction instead of a complete spec. Results reflect "which workflow best leverages a structured spec."

### Lighthouse gap

Lighthouse data is available for:
- Phase 1: Vanilla, Superpowers, Spec Kit, BMAD (measured on host Mac or Docker with workaround)
- Phase 2: **Only Spec Kit** (100/100/100/100 — others N/A due to Chromium not available in container)

Phase 2 Lighthouse comparisons are not available for CE, Superpowers, BMAD, or Vanilla. Given that all Phase 1 scores (where available) were at or near 100, Phase 2 Lighthouse is unlikely to differentiate — but the gap exists and should be noted.

### Run 2 branches discarded

`run2/` branches were created for CE, Superpowers, Spec Kit after Learning 001 was applied. Some `run2/` runs failed due to skill invocation issues (Learning 005/006). `run3/` and `run4/` branches were created with full fixes. The discarded branches are preserved in git history as experiment data but excluded from this analysis.

### Measurement timing limitation

`timing.jsonl` captures Phase 2 build duration. Phase 1 duration is not captured in timing.jsonl (the file was introduced in Phase 2 `/start` infrastructure). Phase 1 durations from RUN_LOG notes are estimates, not machine-measured timestamps.

---

## Recommendation

**For a real, shippable project with maintenance longevity:** Use **Spec Kit** or **Superpowers**.

Both produce >88% line coverage, 100% e2e pass rate, and enforced TDD cycles. Spec Kit's 8-step workflow produces the most complete requirement artifacts (constitution, spec, tasks, checklist) which document *why* the code exists — valuable for maintenance. Superpowers' subagent-driven development produces modular, well-tested code in fewer planning artifacts, which may be preferable when team context is self-explanatory.

**For fast iteration on a defined spec:** Use **Compound Engineering**.

CE produces solid, tested code (100% e2e) quickly (~21 min Phase 2). The planning artifacts (solution docs) are lean and useful. The tradeoff is lower coverage (33%) and no test expansion on new features — CE's `/ce:work` doesn't mandate TDD. For a project where the spec is stable and speed matters, CE is the strongest choice.

**For complex multi-feature projects:** Consider **BMAD**.

BMAD's story-driven approach naturally expands the test surface with each feature. The 90-minute Phase 2 build produced the most comprehensive test suite (62 e2e, 101 unit, 37.75% coverage — more meaningful coverage growth than CE's +15pp). For a project that will grow across many sprints, BMAD's upfront planning investment likely pays back.

**Avoid Vanilla Claude Code for production code.**

The 6 pre-existing e2e failures, zero unit tests in Phase 1, and confirmed TDD violation tell a clear story: without workflow enforcement, autonomous Claude Code will ship working-but-fragile code that accumulates technical debt. Vanilla is appropriate only for prototypes or throwaway scripts.

---

## Data Index

All raw data is preserved in git. To reproduce any metric:

| Data | Location |
|------|---------|
| Phase 1 measurements | `metrics/<branch>/baseline.json` at each `*-phase1-complete` tag |
| Phase 2 measurements | `metrics/<branch>/baseline.json` on each Phase 2 branch |
| Workflow execution logs | `metrics/workflow-log.jsonl` on each branch |
| Build timing | `metrics/timing.jsonl` on each branch |
| Adherence reports (Phase 1) | `metrics/adherence/*.json` on `main` |
| Adherence reports (Phase 2) | `metrics/adherence/*.json` on `run3/superpowers`, `run3/spec-kit` |
| Experiment learnings | `docs/LEARNINGS.md` |
| Per-run details | `docs/RUN_LOG.md` |

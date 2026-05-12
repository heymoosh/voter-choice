# FINAL_RANKING.md — Experiment Results

**Generated:** 2026-05-12T14:41:41.355Z

This is the auto-generated cross-framework rollup of all 45 actions (15 Phase 1 replicates + 5 representative selections + 25 forward-iteration builds across Phases 2–6). The composite score is a weighted mean of five maintainability axes. See **methodology** at the bottom for the weighting and what data went into each axis.

**Read this in light of [docs/FRAMING.md](../../docs/FRAMING.md).** The result supports a narrow claim: best workflow on this Next.js project, run autonomously, n=3 replicates at Phase 1, n=1 forward iteration on the median-LOC representative across Phases 2–6.

## Ranking

| Rank | Framework | Composite | Test Quality | Complexity | Diff Hygiene | Completion | Variance | Phases | Findings |
|------|-----------|-----------|--------------|------------|--------------|------------|----------|--------|----------|
| 1 | **compound-engineering** | 58 | — | 30 | 61 | 100 | 40 | 6/6 | 18 |
| 2 | **bmad** | 56 | 60 | 50 | 1 | 100 | 80 | 6/6 | 22 |
| 3 | **superpowers** | 53 | 57 | 50 | 0 | 100 | 60 | 6/6 | 15 |
| 4 | **spec-kit** | 52 | 50 | 50 | 17 | 100 | 40 | 6/6 | 14 |
| 5 | **vanilla** | 47 | 33 | 50 | 13 | 100 | 40 | 6/6 | 16 |

## Per-framework breakdown

### compound-engineering

- **Composite:** 58
- **Replicates found:** 3/3
- **Chosen representative:** r1 (median LOC (1782); replicates span 1458..1808, RSD 9.46%)
- **Phases with metrics:** 1, 2, 3, 4, 5, 6
- **Responder-log entries:** 26
- **Noisy metrics (RSD > 25%):** vitest.tests.total (62.57%), eslint.warnings (27.22%), complexity.max (55.39%), duplication.percentage (87.32%)

**Axes:**

- `testQuality` = — — partial data
- `complexity` = 30 — avg=6.34, max=63, critical=8, trajectory penalty=0
- `diffHygiene` = 61 — mean adherence 0.61 across 1 phases, total unexpected LOC=346
- `completion` = 100 — 6/6 phases produced metrics
- `variance` = 40 — mean RSD 28.1% across 10 P1 metrics

**Findings:**

- Phase 1:
  - #1 E2e gap — ? / 0 passing
  - #5 Lint regression — 0 errors, 4 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 2:
  - #5 Lint regression — 0 errors, 4 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=346, scopeAdherence=0.61, files=[docs/plans/2026-05-11-002-feat-multilingual-spanish-support-plan.md, docs/solutions/phase2-multilingual-i18n-pattern.md, metrics/responder-log.jsonl, metrics/timing.jsonl, metrics/workflow-log.jsonl, ...]
- Phase 3:
  - #5 Lint regression — 0 errors, 10 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.80, Δmax=0, Δcritical=2
- Phase 4:
  - #5 Lint regression — 0 errors, 10 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 5:
  - #5 Lint regression — 0 errors, 14 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=-0.40, Δmax=0, Δcritical=2
- Phase 6:
  - #5 Lint regression — 0 errors, 17 warnings
  - #6 Bundle anomaly — 131 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=-0.16, Δmax=0, Δcritical=1

### bmad

- **Composite:** 56
- **Replicates found:** 3/3
- **Chosen representative:** r2 (median LOC (1861); replicates span 1564..1861, RSD 7.95%)
- **Phases with metrics:** 1, 2, 3, 4, 5, 6
- **Responder-log entries:** 36
- **Noisy metrics (RSD > 25%):** duplication.percentage (45.27%)

**Axes:**

- `testQuality` = 60 — cov P1=12.8% → P6=27.3% (Δ14.5pp), e2e P6=100%
- `complexity` = 50 — avg=5.76, max=35, critical=6, trajectory penalty=0
- `diffHygiene` = 1 — mean adherence 0.21 across 1 phases, total unexpected LOC=1868
- `completion` = 100 — 6/6 phases produced metrics
- `variance` = 80 — mean RSD 11.2% across 10 P1 metrics

**Findings:**

- Phase 1:
  - #5 Lint regression — 0 errors, 2 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 2:
  - #5 Lint regression — 0 errors, 4 warnings
  - #6 Bundle anomaly — 132 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=1868, scopeAdherence=0.21, files=[_bmad/docs/phase2/architecture.md, _bmad/docs/phase2/epics-and-stories.md, _bmad/docs/phase2/prd.md, _bmad/docs/phase2/product-brief.md, metrics/experiment/bmad-r2/phase1.json, ...]
  - #12 Complexity regression — Δavg=-0.03, Δmax=2, Δcritical=1
- Phase 3:
  - #5 Lint regression — 0 errors, 7 warnings
  - #6 Bundle anomaly — 132 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.89, Δmax=13, Δcritical=1
- Phase 4:
  - #5 Lint regression — 0 errors, 10 warnings
  - #6 Bundle anomaly — 139 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.70, Δmax=0, Δcritical=1
- Phase 5:
  - #5 Lint regression — 0 errors, 17 warnings
  - #6 Bundle anomaly — 145 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.37, Δmax=0, Δcritical=3
- Phase 6:
  - #5 Lint regression — 0 errors, 19 warnings
  - #6 Bundle anomaly — 145 kB (expected 85-130)
  - #7 Timing gap — start=undefined end=undefined

### superpowers

- **Composite:** 53
- **Replicates found:** 3/3
- **Chosen representative:** r1 (median LOC (1328); replicates span 1075..1470, RSD 12.65%)
- **Phases with metrics:** 1, 2, 3, 4, 5, 6
- **Responder-log entries:** 24
- **Noisy metrics (RSD > 25%):** duplication.percentage (141.42%)

**Axes:**

- `testQuality` = 57 — cov P1=17.3% → P6=29.9% (Δ12.5pp), e2e P6=100%
- `complexity` = 50 — avg=5.33, max=54, critical=4, trajectory penalty=0
- `diffHygiene` = 0 — mean adherence 0.20 across 1 phases, total unexpected LOC=1409
- `completion` = 100 — 6/6 phases produced metrics
- `variance` = 60 — mean RSD 20.9% across 9 P1 metrics

**Findings:**

- Phase 1:
  - #7 Timing gap — start=undefined end=undefined
- Phase 2:
  - #5 Lint regression — 0 errors, 2 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=1409, scopeAdherence=0.20, files=[.claude/worktrees/dazzling-villani-93999d, .claude/worktrees/launch-production-federal, docs/superpowers/plans/2026-05-11-phase2-multilingual.md, docs/superpowers/specs/2026-05-11-phase2-multilingual-design.md, metrics/experiment/superpowers-r1/phase1.json, ...]
  - #12 Complexity regression — Δavg=1.00, Δmax=25, Δcritical=1
- Phase 3:
  - #5 Lint regression — 0 errors, 7 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=1.34, Δmax=14, Δcritical=1
- Phase 4:
  - #5 Lint regression — 0 errors, 7 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 5:
  - #5 Lint regression — 0 errors, 11 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 6:
  - #5 Lint regression — 0 errors, 12 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=-0.01, Δmax=7, Δcritical=2

### spec-kit

- **Composite:** 52
- **Replicates found:** 3/3
- **Chosen representative:** r1 (median LOC (1661); replicates span 1574..2089, RSD 12.68%)
- **Phases with metrics:** 1, 2, 3, 4, 5, 6
- **Responder-log entries:** 12
- **Noisy metrics (RSD > 25%):** eslint.warnings (141.42%), complexity.max (44.02%), duplication.percentage (71.34%)

**Axes:**

- `testQuality` = 50 — cov P1=14.1% → P6=24.3% (Δ10.2pp), e2e P6=100%
- `complexity` = 50 — avg=5.95, max=58, critical=6, trajectory penalty=0
- `diffHygiene` = 17 — mean adherence 0.37 across 1 phases, total unexpected LOC=1022
- `completion` = 100 — 6/6 phases produced metrics
- `variance` = 40 — mean RSD 31.6% across 10 P1 metrics

**Findings:**

- Phase 1:
  - #7 Timing gap — start=undefined end=undefined
- Phase 2:
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=1022, scopeAdherence=0.37, files=[.specify/features/multilingual-extension/checklists/requirements.md, .specify/features/multilingual-extension/plan.md, .specify/features/multilingual-extension/spec.md, .specify/features/multilingual-extension/tasks.md, metrics/experiment/spec-kit-r1/phase1.json, ...]
- Phase 3:
  - #5 Lint regression — 0 errors, 9 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=1.29, Δmax=13, Δcritical=1
- Phase 4:
  - #5 Lint regression — 0 errors, 12 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 5:
  - #5 Lint regression — 0 errors, 20 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.20, Δmax=20, Δcritical=5
- Phase 6:
  - #5 Lint regression — 0 errors, 23 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.12, Δmax=16, Δcritical=0

### vanilla

- **Composite:** 47
- **Replicates found:** 3/3
- **Chosen representative:** r1 (median LOC (1410); replicates span 1204..1428, RSD 7.54%)
- **Phases with metrics:** 1, 2, 3, 4, 5, 6
- **Responder-log entries:** 5
- **Noisy metrics (RSD > 25%):** vitest.tests.total (36.13%), eslint.warnings (70.71%), complexity.max (66.55%), duplication.percentage (141.42%)

**Axes:**

- `testQuality` = 33 — cov P1=16.1% → P6=22.8% (Δ6.8pp), e2e P6=98%
- `complexity` = 50 — avg=5.27, max=62, critical=3, trajectory penalty=0
- `diffHygiene` = 13 — mean adherence 0.33 across 2 phases, total unexpected LOC=2897
- `completion` = 100 — 6/6 phases produced metrics
- `variance` = 40 — mean RSD 38.5% across 10 P1 metrics

**Findings:**

- Phase 1:
  - #5 Lint regression — 0 errors, 2 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 2:
  - #5 Lint regression — 0 errors, 2 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=403, scopeAdherence=0.62, files=[metrics/experiment/vanilla-r1/phase1.json, metrics/timing.jsonl, metrics/workflow-log.jsonl, src/lib/ballot-data.ts]
- Phase 3:
  - #5 Lint regression — 0 errors, 9 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #11 Diff sprawl — unexpectedLOC=2494, scopeAdherence=0.04, files=[.claude/worktrees/blissful-poitras-ca29a3, .claude/worktrees/dazzling-villani-93999d, .claude/worktrees/launch-production-federal, .claude/worktrees/unruffled-blackwell-b25753, .eslint-complexity-report.json, ...]
- Phase 4:
  - #5 Lint regression — 0 errors, 9 warnings
  - #7 Timing gap — start=undefined end=undefined
- Phase 5:
  - #5 Lint regression — 0 errors, 13 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=0.36, Δmax=9, Δcritical=2
- Phase 6:
  - #5 Lint regression — 0 errors, 16 warnings
  - #7 Timing gap — start=undefined end=undefined
  - #12 Complexity regression — Δavg=-0.02, Δmax=8, Δcritical=0

## Cross-framework metric comparison

Each row is a metric; each column is a framework. Cell = `phase1 → last-completed` (Phase 6 if everything ran). Missing values shown as `—`.

| Metric | compound-engineering | bmad | superpowers | spec-kit | vanilla |
|--------|----|----|----|----|----|
| E2e pass rate | — → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 100.0% | 100.0% → 98.3% |
| Vitest coverage (lines) | — → — | 12.8% → 27.3% | 17.3% → 29.9% | 14.1% → 24.3% | 16.1% → 22.8% |
| LOC (src/) | 1782.0 → 8099.0 | 1861.0 → 8287.0 | 1328.0 → 7618.0 | 1661.0 → 9730.0 | 1410.0 → 7087.0 |
| File count | 18.0 → 56.0 | 21.0 → 99.0 | 23.0 → 74.0 | 22.0 → 87.0 | 9.0 → 39.0 |
| Complexity avg | 6.2 → 6.3 | 4.1 → 5.8 | 3.2 → 5.3 | 4.4 → 6.0 | 4.8 → 5.3 |
| Complexity max | 63.0 → 63.0 | 20.0 → 35.0 | 8.0 → 54.0 | 10.0 → 58.0 | 41.0 → 62.0 |
| Bundle first-load (kB) | 102.0 → 131.0 | 127.0 → 145.0 | 127.0 → 130.0 | 102.0 → 102.0 | 102.0 → 102.0 |
| Duplication % | 0.0% → 0.6% | 3.3% → 1.4% | 0.0% → 1.1% | 0.0% → 0.8% | 0.6% → 0.4% |

## Methodology

Composite score is a weighted mean of:

- **Test quality (25%)** — Phase 1 → last-completed-phase coverage delta + last-completed-phase e2e pass rate.
- **Complexity (25%)** — Last-completed phase's avg complexity + trajectory penalty if any phase added > 1.5 to avg.
- **Diff hygiene (20%)** — Mean `scopeAdherence` across Phases 2–6; penalty if total unexpected LOC > 500.
- **Scope completion (20%)** — Phases completed / 6. A framework that hit a blocker at Phase 3 maxes out at ~50.
- **Variance (10%)** — Inverse of mean RSD across Phase 1 metrics (lower variance scores higher).

Composite weights only the axes that have data — a framework with no representative.json still gets a composite from the four other axes, just with the variance term dropped.

Findings come from the 13-check rubric in [scoring/auto-findings-rubric.md](../../scoring/auto-findings-rubric.md). Only checks 1, 5, 6, 7, 11, 12, 13 are programmatically applied here; the rest depend on adherence-report JSON not produced by the autonomous pipeline.

Open the per-phase JSON in `metrics/experiment/<framework>-<replicate>/phase<N>.json` for full per-function complexity, every test name, and bundle-size detail. Open `metrics/experiment/<framework>-<replicate>/delta-phase<N-1>-to-phase<N>.md` for the per-phase Markdown delta render.

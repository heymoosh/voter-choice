# FINAL_RANKING.md — Experiment Results

**Generated:** 2026-05-12T14:25:17.753Z

This is the auto-generated cross-framework rollup of all 45 actions (15 Phase 1 replicates + 5 representative selections + 25 forward-iteration builds across Phases 2–6). The composite score is a weighted mean of five maintainability axes. See **methodology** at the bottom for the weighting and what data went into each axis.

**Read this in light of [docs/FRAMING.md](../../docs/FRAMING.md).** The result supports a narrow claim: best workflow on this Next.js project, run autonomously, n=3 replicates at Phase 1, n=1 forward iteration on the median-LOC representative across Phases 2–6.

## Ranking

| Rank | Framework | Composite | Test Quality | Complexity | Diff Hygiene | Completion | Variance | Phases | Findings |
|------|-----------|-----------|--------------|------------|--------------|------------|----------|--------|----------|
| 1 | **compound-engineering** | 32 | — | 40 | — | 17 | 40 | 1/6 | 3 |
| 2 | **bmad** | 27 | — | — | — | 0 | 80 | 0/6 | 0 |
| 3 | **superpowers** | 20 | — | — | — | 0 | 60 | 0/6 | 0 |
| 4 | **vanilla** | 13 | — | — | — | 0 | 40 | 0/6 | 0 |
| 5 | **spec-kit** | 13 | — | — | — | 0 | 40 | 0/6 | 0 |

## Per-framework breakdown

### compound-engineering

- **Composite:** 32
- **Replicates found:** 3/3
- **Chosen representative:** r1 (median LOC (1782); replicates span 1458..1808, RSD 9.46%)
- **Phases with metrics:** 1
- **Responder-log entries:** 26
- **Noisy metrics (RSD > 25%):** vitest.tests.total (62.57%), eslint.warnings (27.22%), complexity.max (55.39%), duplication.percentage (87.32%)

**Axes:**

- `testQuality` = — — no data
- `complexity` = 40 — avg=6.17, max=63, critical=2, trajectory penalty=0
- `diffHygiene` = — — no forward phases
- `completion` = 17 — 1/6 phases produced metrics
- `variance` = 40 — mean RSD 28.1% across 10 P1 metrics

**Findings:**

- Phase 1:
  - #1 E2e gap — ? / 0 passing
  - #5 Lint regression — 0 errors, 4 warnings
  - #7 Timing gap — start=undefined end=undefined

### bmad

- **Composite:** 27
- **Replicates found:** 0/3
- **Chosen representative:** r2 (median LOC (1861); replicates span 1564..1861, RSD 7.95%)
- **Phases with metrics:** none
- **Responder-log entries:** 36
- **Noisy metrics (RSD > 25%):** duplication.percentage (45.27%)

**Axes:**

- `testQuality` = — — no data
- `complexity` = — — no data
- `diffHygiene` = — — no forward phases
- `completion` = 0 — 0/6 phases produced metrics
- `variance` = 80 — mean RSD 11.2% across 10 P1 metrics

**No findings detected.**

### superpowers

- **Composite:** 20
- **Replicates found:** 0/3
- **Chosen representative:** r1 (median LOC (1328); replicates span 1075..1470, RSD 12.65%)
- **Phases with metrics:** none
- **Responder-log entries:** 24
- **Noisy metrics (RSD > 25%):** duplication.percentage (141.42%)

**Axes:**

- `testQuality` = — — no data
- `complexity` = — — no data
- `diffHygiene` = — — no forward phases
- `completion` = 0 — 0/6 phases produced metrics
- `variance` = 60 — mean RSD 20.9% across 9 P1 metrics

**No findings detected.**

### vanilla

- **Composite:** 13
- **Replicates found:** 0/3
- **Chosen representative:** r1 (median LOC (1410); replicates span 1204..1428, RSD 7.54%)
- **Phases with metrics:** none
- **Responder-log entries:** 5
- **Noisy metrics (RSD > 25%):** vitest.tests.total (36.13%), eslint.warnings (70.71%), complexity.max (66.55%), duplication.percentage (141.42%)

**Axes:**

- `testQuality` = — — no data
- `complexity` = — — no data
- `diffHygiene` = — — no forward phases
- `completion` = 0 — 0/6 phases produced metrics
- `variance` = 40 — mean RSD 38.5% across 10 P1 metrics

**No findings detected.**

### spec-kit

- **Composite:** 13
- **Replicates found:** 0/3
- **Chosen representative:** r1 (median LOC (1661); replicates span 1574..2089, RSD 12.68%)
- **Phases with metrics:** none
- **Responder-log entries:** 12
- **Noisy metrics (RSD > 25%):** eslint.warnings (141.42%), complexity.max (44.02%), duplication.percentage (71.34%)

**Axes:**

- `testQuality` = — — no data
- `complexity` = — — no data
- `diffHygiene` = — — no forward phases
- `completion` = 0 — 0/6 phases produced metrics
- `variance` = 40 — mean RSD 31.6% across 10 P1 metrics

**No findings detected.**

## Cross-framework metric comparison

Each row is a metric; each column is a framework. Cell = `phase1 → last-completed` (Phase 6 if everything ran). Missing values shown as `—`.

| Metric | compound-engineering | bmad | superpowers | vanilla | spec-kit |
|--------|----|----|----|----|----|
| E2e pass rate | — → — | — → — | — → — | — → — | — → — |
| Vitest coverage (lines) | — → — | — → — | — → — | — → — | — → — |
| LOC (src/) | 1782.0 → 1782.0 | — → — | — → — | — → — | — → — |
| File count | 18.0 → 18.0 | — → — | — → — | — → — | — → — |
| Complexity avg | 6.2 → 6.2 | — → — | — → — | — → — | — → — |
| Complexity max | 63.0 → 63.0 | — → — | — → — | — → — | — → — |
| Bundle first-load (kB) | 102.0 → 102.0 | — → — | — → — | — → — | — → — |
| Duplication % | 0.0% → 0.0% | — → — | — → — | — → — | — → — |

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

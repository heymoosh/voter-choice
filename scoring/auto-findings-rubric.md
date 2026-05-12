# Auto-Findings Rubric

**Purpose:** This file is the authoritative rubric Hermes applies post-build, from the host side, after a workflow container exits cleanly. It contains the 13-check auto-findings table plus checks 14-17 for the v2 axes, the data completeness gate, and the Phase 2+ delta report format.

**Who reads this:** Hermes only. This file lives in `scoring/` which is masked by a tmpfs overlay inside the build container, so workflows cannot read it during execution. Keeping it out of container view is what prevents metric gaming (see `docs/LEARNINGS.md` → Learning 009).

**When Hermes reads it:** After the build container exits with a committed + tagged build, Hermes runs `node scoring/measure.mjs --repo <branch-worktree>` and `node scoring/analyze-adherence.mjs --repo <branch-worktree> <branch-name>`, then applies the checks in this file against the two JSON outputs.

---

## 1. Data Completeness Gate (runs first)

Before applying the 10-check rubric, verify every required artifact was captured. If any check FAILs, stop and surface the failure — do NOT continue to tagging or RUN_LOG updates. The experiment loses that data permanently once the session ends.

Run these checks against the branch worktree:

### Check 1: `metrics/timing.jsonl` must contain both `build_start` and `build_end`

- FAIL if file missing
- FAIL if `build_start` count < 1
- FAIL if `build_end` count < 1
- On PASS, extract start and end timestamps and compute wall-clock duration

### Check 2: `metrics/workflow-log.jsonl` must exist with at least one completed entry

- FAIL if file missing (no workflow execution audit trail)
- WARNING if zero `"completed"` entries (workflow steps did not log properly)
- Record total entries and completed count

### Check 3: Adherence report must exist

- Compute `SAFE_BRANCH` by replacing `/` with `-` in branch name
- FAIL if `metrics/adherence/<SAFE_BRANCH>.json` is missing

### Check 4: Measurement JSON must exist with required fields

- Locate the newest `metrics/*.json` (excluding the adherence dir)
- FAIL if none found
- WARNING for each missing field: `eslintErrors`, `eslintWarnings`, `e2eTotal`, `e2ePassed`, `lighthouse`, `bundleFirstLoadKb`, `coverageLinesPct`, `duplicationPct`, `securityScan`, `privacyScan`

### Check 5: Workflow-generated tests

- Count `src/**/*.test.*` and `src/**/*.spec.*`
- WARNING if zero test files on a framework that should produce tests (any non-vanilla branch)

---

## 2. Auto-Findings Table

Apply after the data completeness gate passes. Evaluate every row and record the result (PASS / FINDING) with specific numbers. Read from both the measurement JSON and the adherence report JSON.

| # | Check | Condition that triggers a FINDING | What to record |
|---|-------|-----------------------------------|----------------|
| 1 | **E2e gap** | `e2ePassed` < `e2eTotal` or `e2eTotal` < 42 | Pass count, total count, whether failures are new or pre-existing |
| 2 | **TDD violation** | `tddScore` < 100 OR `implOnlyCommits` > 0 | TDD score, impl-only commit count, neutral count |
| 3 | **TDD unassessable** | `tddScore` is null AND `uniqueTestFiles` > 0 | Count of neutral vs unchecked, explain why score is null |
| 4 | **Workflow gap** | `workflowLog.missing` array has entries | Which steps are missing |
| 5 | **Lint regression** | `eslintErrors` > 0 OR `eslintWarnings` > 0 | Error and warning counts |
| 6 | **Bundle anomaly** | First load JS > 130 kB or < 85 kB (±20% from ~102 kB baseline) | Actual bundle size |
| 7 | **Timing gap** | `timing.hasStart` or `timing.hasEnd` is false | Which entry is missing |
| 8 | **Measurement gap** | `measurement.missing` array has entries | Which fields are missing from JSON |
| 9 | **Workflow log empty** | `workflow-log.jsonl` missing or 0 completed entries | Whether file exists, entry count |
| 10 | **Test generation** | `uniqueTestFiles` == 0 for a non-vanilla framework | Framework name, expected behavior |
| 11 | **Diff sprawl** (Phase 2+) | `diffHygiene.summary.unexpected.locAdded` > 200 OR `diffHygiene.scopeAdherence` < 0.7 | Files in `unexpectedFiles`, scope-adherence ratio. Compare against `scoring/phase-scopes/phase<N>.json` to see what the phase was supposed to touch. |
| 12 | **Complexity regression** (Phase 2+) | Phase delta on `complexity.average` > +2.0 OR `complexity.max` > +5 OR `complexity.distribution.critical_21plus` increased | Per-function complexity averages, top functions by complexity in `complexity.perFunction[:10]`. Indicates abstraction quality degraded across iteration. |
| 13 | **Responder transparency** | `metrics/responder-log.jsonl` missing OR (framework ∈ {bmad, spec-kit} AND entry count < 3) | Entry count, framework. A thin log on a question-heavy framework suggests the wrapper inlined answers without recording its reasoning. |
| 14 | **Acceptance coverage gap** | `acceptanceCoverage.coverage` < 1.0 | Coverage ratio and missing `AC-N` IDs |
| 15 | **NFR compliance gap** | `nfrCompliance.passRate` < 1.0 | Pass rate plus failed `NFR-N` checks |
| 16 | **Coupling regression** | `coupling.density` grew > 50% phase-over-phase OR `coupling.circular` > 0 | Density delta, cycle count, fan-in/out context |
| 17 | **Type safety regression** | `typeSafety.strictErrors` > 0 OR `typeSafety.escapeHatches` increased from prior phase | Strict-mode error count and escape-hatch delta |

**Finding format (for the RUN_LOG entry):**

- **Finding name (UNIQUE TO `<branch>` if applicable):** description with specific numbers

If ALL checks pass, record: "No anomalies detected — all 10 checks passed, metrics within expected ranges."

### Note on thresholds

The numeric thresholds above (42 e2e tests, 85-130 kB bundle, TDD score 100) are calibrated for Phase 1/Phase 2. Phase 3+ will add new acceptance criteria (API integration tests, multi-language test suites, chat e2e flows) and the table will need to be extended accordingly. Any extension is done on `main` only, never on a workflow branch.

---

## 3. Phase 2+ Delta Report Format

When the completed sub-phase is Phase 2 or later, produce a comparison table against the previous phase on the same branch.

**This is automated.** Run `node scoring/compute-deltas.mjs --branch <branch> --phase <N> --repo <branch-worktree>` after `measure.mjs` completes. It reads `metrics/<branch>/phase<N>.json` (current) and `metrics/<branch>/phase<N-1>.json` from the prior tag (`<framework>-phase<N-1>-complete`), then writes both `delta-phase<N-1>-to-phase<N>.json` and a Markdown render with the table below.

Read the previous phase's measurement JSON from the tagged commit (`<tag-prefix>-run<N>-phase<M-1>-complete`) and produce a row for each metric:

```
Metric                     Phase M-1    Phase M    Delta
-----------------------------------------------------------
e2e pass rate              X / Y        X' / Y'    ±Δ
Lighthouse (perf)          NN           NN'        ±Δ
Lighthouse (a11y)          NN           NN'        ±Δ
Lighthouse (best-pract)    NN           NN'        ±Δ
Lighthouse (SEO)           NN           NN'        ±Δ
ESLint errors              N            N'         ±Δ
ESLint warnings            N            N'         ±Δ
Duplication %              X.X%         X.X%       ±Δ
Bundle first load (kB)     NN           NN'        ±Δ
Lines of code (src/)       N            N'         ±Δ
Cyclomatic complexity avg  X.X          X.X        ±Δ
Coverage lines %           X.X%         X.X%       ±Δ
Security scan findings     N            N'         ±Δ
Privacy scan findings      N            N'         ±Δ
```

For Phase 3+, extend the table with phase-specific metrics as they become available (e.g., Phase 3 API coverage %, Phase 4 translation coverage %, Phase 5 chat response time).

---

## 4. Post-Build Reporting (Hermes writes this into RUN_LOG)

After applying the rubric, Hermes must commit a RUN_LOG entry on `main` that contains:

1. **Commit hash** of the final workflow commit on the branch
2. **Tag name** just pushed
3. **Key metrics** from the measurement JSON (e2e, Lighthouse scores, bundle, LOC, duplication, coverage, security/privacy findings)
4. **Workflow log summary** — which framework commands ran and approximate duration of each (from `metrics/workflow-log.jsonl`)
5. **Workflow-generated test file count**
6. **Git build statistics** — commit count and lines added/removed since scaffold
7. **Framework adherence** — which artifacts were produced, any missing steps
8. **Auto-findings summary** — every FINDING from the 10-check table, or "All 10 checks passed"
9. **Data completeness gate** — PASS or a list of FAILs
10. **Phase M delta report** (Phase 2+)
11. **Operator notes** — "No additional observations" in autonomous runs; operator can amend later if she wants to add qualitative signal

---

## 5. Scoring Isolation Enforcement

This file and the rest of `scoring/` must never be:

- Readable inside the build container
- Referenced by name in any per-branch `.claude/commands/workflow.md`
- Passed as a prompt, env var, or mounted file into the Claude Code container

Hermes now enforces isolation with a deployed Docker tmpfs overlay, not the older VPS-only concept. The build container masks these paths:

- `/workspace/scoring`
- `/workspace/metrics`
- `/workspace/docs/RUN_LOG.md`
- `/workspace/docs/LEARNINGS.md`
- `/workspace/docs/EXPERIMENT_HISTORY.md`
- `/workspace/docs/EXPERIMENT_V2_PLAN.md`
- `/workspace/docs/FINAL_RANKING.md`

Build-time workflows receive only the spec and app code they need. The host-side scorer runs after container exit against the bind-mounted output directory, not from inside the isolated container. See `docker/run-claude.sh` for the active masking rules and `docs/LEARNINGS.md` → Learning 009 for the gaming-vector post-mortem.

## 6. v2 Tag Convention

Run 6 uses a uniform tag format for every phase:

- `<framework>-r<N>-phase1-complete`
- `<framework>-r<N>-phase2-complete`
- ...
- `<framework>-r<N>-phase6-complete`

Legacy Run 5 analysis may still encounter forward tags without the replicate suffix (for example, `<framework>-phase3-complete`). Scoring scripts must continue resolving that legacy form as a fallback, but all new v2 orchestration should emit the uniform replicate-suffixed convention.

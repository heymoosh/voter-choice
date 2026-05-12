# Experiment v2: Implementation Plan

> **Audience:** A coding agent picking this up cold to execute the v2 rebuild of the workflow comparison experiment.
>
> **Mission:** The original experiment (Run 5) produced `metrics/experiment/FINAL_RANKING.md` but has 7 measurement gaps that make those numbers directional, not conclusive. This plan closes every gap before a clean re-run of all 45 actions, so the v2 ranking can credibly answer: **"Which workflow methodology produces the highest-quality, most maintainable codebase while consistently delivering features?"**

---

## TL;DR

Three things you must internalize before touching code:

1. **Two upstream corrections** to common misreadings of the gap analysis:
   - **LOC bias is on tests, not docs.** `scoring/measure.mjs:554-722` already excludes `.md` files. Documentation is NOT counted as LOC. The real bias is that `*.test.*`, `*.spec.*`, and `*.json` data files inside `src/` all roll into "application LOC," so a framework that writes more tests looks "heavier." The fix is to split `productionLOC` / `testLOC` / `dataLOC` / `docLOC` and treat `testLOC` as a positive signal in Test Quality, never a penalty in Scope Discipline.
   - **"Feature completeness" doesn't need FR-IDs.** Both Plan agents grepped the spec corpus and found 0 `FR-XXX` references. Specs already describe what to build (acceptance criteria, UX flows, NFRs) — the fix is to make those programmatically enumerable as `AC-N` / `UX-N` / `NFR-N` items, not to retrofit a separate FR formalism.

2. **The scope is full v2 — Tier 3.** Operator (Muxin) explicitly chose this over the cheap retroactive recovery option. We build the closed-gap infrastructure first, validate with a smoke run, then re-run all 45 actions clean.

3. **Run 5 data stays as a baseline.** Don't delete it. After Run 6 produces v2 rankings, write a short comparison in `docs/ANALYSIS.md` documenting which axes shifted with the closed gaps. This is itself a finding.

---

## Background reading (do this BEFORE you start editing)

In order:

1. `docs/EXPERIMENT_DESIGN.md` — original protocol, hypotheses, measurement axes
2. `docs/FRAMING.md` — what the experiment can and can't claim
3. `docs/LEARNINGS.md` — 9 prior learnings including Learning 009 (rubric leakage, partial isolation never deployed)
4. `scoring/auto-findings-rubric.md` — the 13-check rubric; understand which 6 weren't applied
5. `metrics/experiment/FINAL_RANKING.md` — the current (directional) ranking
6. `scoring/measure.mjs` — where most measurement logic lives
7. `scoring/aggregate-experiment.mjs` — where the composite gets computed (look at `applyRubric()` around lines 151-259)
8. `.claude/commands/start.md` — orchestration entrypoint; contains the `$(date -Iseconds)` bug

The original plan that produced this doc lives at `~/.claude/plans/hi-i-m-on-tender-hellman.md` if you need the design rationale.

---

## What's already been done in this worktree

**You should `git status` first.** The following changes are uncommitted in worktree `pensive-northcutt-cf58dc`:

- `scoring/compute-deltas.mjs` — tag-resolution fix applied (lines ~59-109). Now tries both `<framework>-r<N>-phase<N-1>-complete` and `<framework>-phase<N-1>-complete` when looking up the prior-phase tag. **Verified by running `node scoring/compute-deltas.mjs --branch experiment/bmad-r2 --phase 3` — succeeds (previously failed).** This is Task A1.1; mark it done.
- `scoring/diff-hygiene.mjs` — same tag-resolution fix applied (lines ~63-105). **Not yet end-to-end tested.** Run the verification under A1.1 below before moving on.

Don't redo these. Verify, then proceed to A1.2.

---

## Architecture decisions already made (don't relitigate)

| Decision | Choice | Rationale |
|---|---|---|
| Scope of redesign | Full v2 with clean re-run | Operator explicitly chose Tier 3 over retroactive recovery |
| Feature-completeness method | Acceptance Criteria (`AC-N`) coverage + NFR pass rate | No FR-IDs in spec corpus; restructure specs to make criteria enumerable |
| Sub-agent confound | Acknowledge + narrow claim, not multi-model re-run | Phase D adds 5-action sanity check, not a full multi-model rerun |
| Rubric isolation | Deploy Hermes tmpfs in Docker, not VPS | Cheaper, sufficient, matches existing `docker/run-claude.sh` setup |
| Tag naming for v2 | `<framework>-r<N>-phase<N>-complete` (uniform) for ALL phases including forwards | Eliminates the legacy `<framework>-phase<N>-complete` mismatch |
| Run 5 data | Keep | Comparison artifact for "what changed with gaps closed" |
| LOC handling | Split into productionLOC / testLOC / dataLOC / docLOC | testLOC counts positive in Test Quality, never penalty in Scope Discipline |

---

## Phase overview & dependency graph

```
Phase A (Infrastructure) — sequential within waves, parallel across waves where noted
├── Wave 1: Script fixes (recoverable bugs)
│   ├── A1.1 Tag-resolution fix       [STARTED — verify only]
│   ├── A1.2 Timing wrapper           [BLOCKS A2, B, C]
│   └── A1.3 WorkflowTiming dedupe    [parallel with A1.2]
├── Wave 2: LOC + Rubric
│   ├── A3  LOC role split            [BLOCKS A9]
│   └── A2  Rubric checks 4/8/9/10    [parallel with A3]
├── Wave 3: New scoring measures      [all parallel after Wave 1 + 2]
│   ├── A4.1 acceptance-coverage.mjs
│   ├── A4.2 nfr-compliance.mjs
│   ├── A4.3 tdd-signal.mjs
│   ├── A4.4 coupling.mjs
│   ├── A4.5 type-safety.mjs
│   └── A4.6 subagent-calls.mjs
├── Wave 4: Spec restructuring
│   └── A6  PROJECT_SPEC + PHASE2-6_SPEC AC/UX/NFR sections   [BLOCKS A4.1, A4.2]
├── Wave 5: Infrastructure deployment
│   └── A5  Hermes isolation in docker/run-claude.sh          [BLOCKS B, C]
├── Wave 6: Composite + docs
│   ├── A9  Update aggregator for 7-axis composite            [BLOCKS B]
│   ├── A7  Rubric doc update                                 [parallel]
│   └── A8  FRAMING.md narrowing                              [parallel]
└── Phase A gate: every task above passes its verification

Phase B — Smoke run (vanilla × 6 phases)
    Validates that Phase A actually works end-to-end before scaling

Phase C — Clean re-run (45 actions)
    Only after B passes cleanly

Phase D — Multi-model robustness (optional, 5 random actions)
```

**Critical ordering note:** A6 (spec restructuring) must complete before A4.1 (acceptance-coverage) and A4.2 (nfr-compliance) — those scripts parse the new spec sections. Within Wave 4, restructure all 6 specs in one pass.

---

## Phase A — Infrastructure

### A1. Scoring script fixes

#### A1.1 Tag-resolution fix [STARTED]

**Goal:** Make `compute-deltas.mjs` and `diff-hygiene.mjs` resolve the prior-phase tag whether it uses the replicate-suffixed form (`bmad-r2-phase2-complete`) or the bare form (`bmad-phase2-complete`).

**Status:** Both scripts edited in this worktree. **Verify only.**

**Verification:**
```bash
node scoring/compute-deltas.mjs --branch experiment/bmad-r2 --phase 3
# Pass: prints "Wrote ... delta-phase2-to-phase3.json" and "Computed N metric deltas" where N > 0

node scoring/diff-hygiene.mjs --branch experiment/bmad-r2 --phase 3
# Pass: prints a JSON result with scopeAdherence as a number (not null) and no errors
```

If either fails, read the script around the slug-resolution block (search for `slugCandidates`) and confirm the candidate-list logic is intact.

#### A1.2 Build `scripts/emit-timing.sh` and rewire `start.md`

**Goal:** Eliminate the `$(date -Iseconds)` subshell-expansion bug that caused `metrics/timing.jsonl` to never be created with valid ISO timestamps. Force all timing emission through a single host-side wrapper.

**Why this matters:** In `.claude/commands/start.md` lines 7 and 13, embedded prompt templates contain literal `$(date -Iseconds)`. When sent to a sub-agent, the command substitution is not evaluated in the agent's shell; the agent writes the literal string to JSONL, producing invalid JSON. Fix: shell-out to a wrapper script whose `date` invocation evaluates in its own shell context.

**Files:**
- **Create:** `scripts/emit-timing.sh`
- **Modify:** `.claude/commands/start.md` — find every `$(date -Iseconds)` and every JSONL emit block; route through the wrapper

**Wrapper contract:** Accepts `--event <name>`, `--phase <N>`, `--branch <branch>` (optional), `--file <path>` (defaults to `metrics/timing.jsonl`). Writes a single JSONL line:
```json
{"event":"build_start","phase":1,"branch":"experiment/bmad-r2","timestamp":"2026-05-12T14:23:01-07:00"}
```

Behavior:
- `date -u +%Y-%m-%dT%H:%M:%SZ` if `date -Iseconds` not supported (defensive)
- Appends, never overwrites (`>>`)
- Creates parent dir with `mkdir -p` if missing
- Returns non-zero on any I/O failure (so the agent can detect)

Add a parallel wrapper for workflow-log emission: `--event workflow_step --step <name> --status <started|completed|failed>` writes to `metrics/workflow-log.jsonl`.

**Verification:**
```bash
# Should produce a valid JSONL line; jq parses without error
bash scripts/emit-timing.sh --event build_start --phase 1 --branch test/x
jq . metrics/timing.jsonl | tail -5
# Pass: jq succeeds; timestamp field is ISO 8601

# Workflow log variant
bash scripts/emit-timing.sh --event workflow_step --phase 1 --step plan --status started --file metrics/workflow-log.jsonl
jq . metrics/workflow-log.jsonl | tail -5
# Pass: same
```

After validating, search `start.md` for `$(date` and replace every occurrence with a `bash scripts/emit-timing.sh ...` call.

#### A1.3 WorkflowTiming dedupe in `measure.mjs`

**Goal:** Defense in depth — even with A1.2 deployed, existing Run 5 data has duplicated `workflowTiming.steps` entries with negative `durationMs` from the original bug. Dedupe before reporting.

**File:** `scoring/measure.mjs` lines 783-828 (the workflowTiming aggregation block).

**Change:** When building `steps`, key by step name. If multiple entries have the same name, keep the one whose `started` timestamp is most recent and whose `durationMs` is positive; otherwise drop. Emit `workflowTiming.dedupedCount` to record how many entries were collapsed (zero on clean Run 6 data; non-zero is a smell signal).

**Verification:**
```bash
node scoring/measure.mjs --repo . --phase 4 --branch experiment/bmad-r2 --skip-build
# (skip-build flag should already exist; if not, run on the current checkout's last-known phase)
# Pass: output JSON has workflowTiming.steps array with no duplicate `step` names
#       and workflowTiming.dedupedCount field present
```

### A2. Implement rubric checks 4, 8, 9, 10

**Goal:** Push programmatic rubric coverage from 7/13 to 11/13 by adding the four pure-JSON-inspection checks that the original aggregator skipped.

**File:** `scoring/aggregate-experiment.mjs` — extend `applyRubric()` around lines 151-259.

| Check | Logic |
|---|---|
| 4 — Workflow gap | Compare `phaseData.workflowTiming.steps[*].step` against framework's declared step list (define a static map: `vanilla → []`, `bmad → ['analyst', 'pm', 'architect', 'sm', 'dev', 'qa']`, etc.). Report missing required steps. |
| 8 — Measurement gap | Recursively walk the phase JSON; list paths where a leaf value is `null` or an expected-field is absent. Report a string array of field paths. |
| 9 — Workflow log empty | Read `metrics/<branch>/workflow-log.jsonl` (or `metrics/workflow-log.jsonl` if branch-scoped doesn't exist); assert `entry_count >= 1`. Fire FINDING if zero. |
| 10 — Test generation | For non-vanilla frameworks, assert `phaseData.workflowTests.count > 0`. Fire FINDING if zero (means the framework didn't actually generate test files as part of its methodology). |

**Verification:**
```bash
node scoring/aggregate-experiment.mjs --dry-run --target bmad
# Pass: report includes Findings entries with check numbers 4, 8, 9, 10
# Pass: no "check not implemented" warnings for 4/8/9/10
```

Add `--dry-run` and `--target <framework>` if they don't already exist (look for `argValue('--target')` in the script — they may already be there).

### A3. LOC role split in `measure.mjs`

**Goal:** Replace existing application/plugin/infrastructure split with role-based categories so tests stop being counted as "bloat."

**File:** `scoring/measure.mjs` lines 554-722 (`measureLOC()` and helpers).

**New schema for `linesOfCode` block:**
```json
{
  "productionLOC": 1820,
  "testLOC":       640,
  "dataLOC":       210,
  "docLOC":        0,
  "plugin":        450,
  "infrastructure": 80,
  "totalApplication": 2670,
  "byExtension": { ... }
}
```

**Role assignment rules:**
- `testLOC`: files matching `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `e2e/**/*.ts`, `src/__tests__/**`
- `dataLOC`: files matching `src/**/*.json`, `public/**/*.json`, `data/**/*.json`
- `docLOC`: repo-wide `**/*.md` (still excluded from "application," but now surfaced explicitly so we can compare doc weight across frameworks)
- `productionLOC`: everything in `src/**` that doesn't match testLOC or dataLOC patterns
- `plugin` / `infrastructure`: existing scoping (`.claude/*`, `_bmad/`, `.specify/`, `scripts/`, root config)

**Verification:**
```bash
node scoring/measure.mjs --repo . --phase 1 --branch test/loc-split --skip-build --print-only
# Pass: output JSON.linesOfCode has all 5 role fields; productionLOC + testLOC + dataLOC ≤ totalApplication
# Pass: productionLOC > 0 for any non-empty src/
```

Also update `scoring/aggregate-experiment.mjs` lines 593-602 (the markdown table that renders LOC per framework) to show `productionLOC` and `testLOC` as separate columns instead of a single "LOC (src/)" column.

### A4. New scoring measures (six host-side scripts)

Each script is independent. After A6 ships, A4.1 and A4.2 can run. The rest (A4.3-A4.6) don't depend on spec restructuring and can be built in parallel.

#### A4.1 `scoring/acceptance-coverage.mjs`

**Goal:** Programmatically check that every acceptance criterion in `docs/PHASE<N>_SPEC.md` is exercised by at least one test.

**Depends on:** A6 (specs must have a `## Acceptance Criteria` section with `AC-N` items first).

**Inputs:**
- `--phase <N>` (required)
- `--repo <path>` (optional, defaults to cwd)
- `--branch <branch>` (optional, for the output metrics dir)

**Logic:**
1. Read `docs/PHASE<N>_SPEC.md` (or `docs/PROJECT_SPEC.md` for Phase 1)
2. Parse `## Acceptance Criteria` section; extract every `AC-N` ID (regex `\bAC-\d+\b`)
3. Grep `e2e/**/*.ts`, `src/**/*.test.*`, `src/**/*.spec.*` for `AC-N` references inside `describe(...)` and `test(...)`/`it(...)` arguments
4. Emit per-AC pass/fail (with optional Playwright result lookup if `playwright-report` JSON exists)
5. Compute `coverage = covered / required`

**Output:** writes to `metrics/<branch>/acceptance-coverage-phase<N>.json`:
```json
{
  "phase": 3,
  "branch": "experiment/bmad-r2",
  "acRequired": 8,
  "acCovered": 7,
  "coverage": 0.875,
  "missing": ["AC-3.6"],
  "computedAt": "2026-05-12T..."
}
```

**Verification:**
```bash
# After A6 ships and you've added AC-1..AC-N to PROJECT_SPEC.md:
node scoring/acceptance-coverage.mjs --phase 1 --repo . --branch test/x
# Pass: outputs JSON with acRequired matching the count of AC- items in the spec
# Pass: coverage is a number in [0,1]
```

#### A4.2 `scoring/nfr-compliance.mjs`

**Goal:** For each NFR declared in a phase spec, run the corresponding compliance check and record pass/fail.

**Depends on:** A6 (specs must have a `## Non-Functional Requirements` section with `NFR-N` items and category tags).

**NFR check matrix (extend as specs require):**

| NFR category | How to check |
|---|---|
| Performance — bundle | `bundleSize.firstLoadJsShared.size` ≤ stated threshold |
| Performance — Lighthouse | `lighthouse.performance` ≥ stated threshold |
| Accessibility | `lighthouse.accessibility` ≥ stated threshold |
| SEO | `lighthouse.seo` ≥ stated threshold |
| Privacy — no localStorage | grep `src/` for `localStorage|sessionStorage|document\.cookie` → expected: 0 hits OR explicitly allow-listed |
| Security — semgrep | `npx semgrep --config p/owasp-top-ten src/` → 0 findings of severity HIGH+ |
| Security — npm audit | `npm audit --json` → 0 HIGH or CRITICAL |
| Security — gitleaks | `gitleaks detect --no-banner` → 0 secrets |
| UX — keyboard nav | An e2e test tagged `keyboard-nav` passes |
| UX — error state | An e2e test tagged `error-state` passes |

The script parses the spec's `Non-Functional Requirements` block, maps each NFR-N to a category, runs the check, records pass/fail.

**Output:** `metrics/<branch>/nfr-compliance-phase<N>.json`:
```json
{
  "phase": 3,
  "nfrs": [
    { "id": "NFR-3.1", "category": "Performance", "threshold": "Lighthouse perf >= 90", "actual": 93, "passed": true },
    { "id": "NFR-3.2", "category": "Security", "threshold": "0 HIGH npm audit", "actual": 0, "passed": true },
    { "id": "NFR-3.3", "category": "UX", "threshold": "keyboard-nav e2e passes", "actual": "passed", "passed": true }
  ],
  "passRate": 1.0
}
```

**Verification:**
```bash
node scoring/nfr-compliance.mjs --phase 1 --repo . --branch test/x
# Pass: outputs JSON with nfrs array; passRate is a number in [0,1]
```

#### A4.3 `scoring/tdd-signal.mjs`

**Goal:** Per framework, emit a binary signal "tests-first commit pattern observed Y/N" plus a coarse fraction of test-first commits.

**Logic:**
1. For each `experiment/<framework>-r<N>` branch (or `experiment/<framework>` for representatives), run `git log --diff-filter=A --name-only --pretty=format:'%H'` to list new-file additions
2. Group additions by commit; classify each commit as `test-first` (added at least one `*.test.*` or `*.spec.*` file with no `src/**` impl files added in the same commit), `test-with` (test + impl added together), `impl-only` (no test files), or `other` (no `src/` files at all — e.g., docs commits)
3. Emit per-framework:
```json
{
  "framework": "bmad",
  "branches": ["experiment/bmad-r1", "experiment/bmad-r2", "experiment/bmad-r3", "experiment/bmad"],
  "commitClassification": {
    "test-first": 12,
    "test-with":  8,
    "impl-only":  4,
    "other":      3
  },
  "testFirstPresent": true,
  "testFirstFraction": 0.444,
  "caveat": "Commits mix test+impl; binary signal only. Quantitative TDD score not recoverable."
}
```

**Output:** `metrics/<framework>-tdd-signal.json` (one file per framework, not per phase).

**Verification:**
```bash
node scoring/tdd-signal.mjs --framework bmad --repo .
# Pass: outputs JSON; testFirstPresent is boolean; commitClassification counts sum to total commit count on branches
```

#### A4.4 `scoring/coupling.mjs`

**Goal:** Per-phase coupling density to feed Maintainability Trajectory.

**Logic:**
1. Run `npx madge --json --extensions ts,tsx src/`
2. Parse the dependency graph (file → array of dependencies)
3. Compute:
   - `nodes` (file count)
   - `edges` (total dependency count)
   - `density = edges / (nodes * (nodes - 1))` (handle nodes ≤ 1 as null)
   - `meanFanIn`, `meanFanOut`
   - `circular` (count of cycles madge reports)

**Output:** Merged into existing per-phase JSON as a `coupling` block:
```json
{
  "coupling": {
    "nodes": 87,
    "edges": 142,
    "density": 0.0188,
    "meanFanIn": 1.63,
    "meanFanOut": 1.63,
    "circular": 0
  }
}
```

**Integration:** `measure.mjs` calls this as a sub-step. Add a `runCoupling()` invocation around line ~800 (find where other measures are aggregated; pattern is consistent across the file).

**Verification:**
```bash
node scoring/measure.mjs --repo . --phase 1 --branch test/x --skip-build --print-only
# Pass: output JSON has coupling block with all 6 fields
```

#### A4.5 `scoring/type-safety.mjs`

**Goal:** Type-safety axis input — count strict TypeScript errors and escape hatches.

**Logic:**
1. Run `npx tsc --noEmit --strict --project tsconfig.json` (or the project's tsconfig); count diagnostics emitted
2. Grep `src/**/*.ts*` for `\bany\b`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`
3. Emit:
```json
{
  "typeSafety": {
    "strictErrors": 0,
    "anyOccurrences": 4,
    "tsIgnoreCount": 1,
    "tsExpectErrorCount": 0,
    "tsNocheckCount": 0,
    "escapeHatches": 5
  }
}
```

Merged into per-phase JSON. Also integrate into `measure.mjs`.

**Verification:**
```bash
node scoring/measure.mjs --repo . --phase 1 --branch test/x --skip-build --print-only
# Pass: typeSafety block present with all 6 numeric fields
```

#### A4.6 `scoring/subagent-calls.mjs`

**Goal:** Count sub-agent dispatches per build to discriminate sub-agent-heavy frameworks (Superpowers, CE) from minimal ones (vanilla).

**Logic:**
1. Read Claude transcript files for the build session. Path: bind-mounted read-only by `docker/run-claude.sh` at container exit (see A5). Likely location inside container: `/transcripts/*.jsonl`.
2. Parse each JSONL line as a Claude transcript message. Count entries where the message contains a `Task` tool call (or `tool_use` with `name == "Task"` / sub-agent dispatch).
3. Group by sub-agent type if discoverable from the tool input (`subagent_type` field).
4. Emit:
```json
{
  "subagentCalls": {
    "total": 14,
    "byType": {
      "Plan": 2,
      "Explore": 6,
      "code-reviewer": 3,
      "general-purpose": 3
    },
    "transcriptSource": "/transcripts/session-xyz.jsonl"
  }
}
```

Merged into per-phase JSON.

**Verification:** Run during A5 (Hermes deployment) — this script needs the transcript bind-mount to exist. Mark as "wait until A5" if you hit this before A5 is done.

### A5. Deploy Hermes isolation

**Goal:** Extend the existing `docker/run-claude.sh` tmpfs overlay so workflows cannot read the rubric, prior metrics, or learnings documents during the build.

**File:** `docker/run-claude.sh`. Read it first — Learning 009 already established part of the isolation (`/workspace/scoring` is masked).

**Changes:**
1. **Extend tmpfs mounts** to additionally mask:
   - `/workspace/metrics`
   - `/workspace/docs/RUN_LOG.md`
   - `/workspace/docs/LEARNINGS.md`
   - `/workspace/docs/EXPERIMENT_HISTORY.md`
   - `/workspace/docs/EXPERIMENT_V2_PLAN.md` (THIS FILE — workflows must not see the v2 plan during their build)
   - `/workspace/docs/FINAL_RANKING.md` (if present)
2. **Container entrypoint assertion:** at startup, run `[ -z "$(ls /workspace/scoring 2>/dev/null)" ] || { echo "isolation breach: scoring/ visible" >&2; exit 1; }` and abort if not empty. Add equivalent assertions for the metrics and docs masks.
3. **Bind-mount transcript dir read-only** for A4.6: `-v "${HOST_TRANSCRIPT_DIR}:/transcripts:ro"`. Pick a stable host path under the experiment workspace (suggest `metrics/transcripts/<run-id>/`).
4. **Host-side scorer pattern:** the scorer runs AFTER the container exits, on the host, reading the bind-mounted output dir. Confirm this is already the pattern (it should be from Learning 009); document it explicitly in the script comments.

**In-container vs. host-side scoring responsibilities**

- **In-container build responsibilities**
  - Build on the workflow branch
  - Emit only `timing.jsonl` and `workflow-log.jsonl`
  - Write those files only to the scratch dir mounted at `/workspace/metrics`
  - Commit/tag/push the workflow branch
  - Do NOT run `measure.mjs`, `compute-deltas.mjs`, or `diff-hygiene.mjs` inside the container
- **Per-run scratch dir pattern**
  - Host path: `metrics/run-outputs/<run-id>/`
  - Container mount point: `/workspace/metrics`
  - `<run-id>` should be unique per build. Prefer framework/replicate/phase/timestamp when discoverable.
- **Host-side harvest responsibilities**
  1. Check out the workflow branch on the host
  2. Run `scoring/measure.mjs --repo <host-checkout> --phase <N> --branch <branch>`
  3. Read `timing.jsonl` and `workflow-log.jsonl` from `metrics/run-outputs/<run-id>/`
  4. Merge those artifacts into `metrics/<branch>/phase<N>.json` under timing/workflow fields
  5. Run `compute-deltas.mjs` and `diff-hygiene.mjs` on the host
  6. Preserve the harvested logs under the canonical branch metrics dir for auditability

**Verification:**
```bash
# Smoke test the container in isolation
./docker/run-claude.sh --dry-run --shell "ls -la /workspace/scoring; ls -la /workspace/metrics; ls -la /workspace/docs/"
# Pass: scoring/ is empty, metrics/ is empty, RUN_LOG.md and LEARNINGS.md not visible
# Pass: container exits 0 (assertion passed)

# Negative test — disable masking, expect failure
./docker/run-claude.sh --dry-run --no-isolation --shell "ls /workspace/scoring"
# Pass: assertion fires, exit code != 0
```

### A6. Spec restructuring

**Goal:** Make every phase spec parseable for `AC-N`, `UX-N`, and `NFR-N` IDs so A4.1 and A4.2 can compute completeness automatically.

**Files (modify each):**
- `docs/PROJECT_SPEC.md` (Phase 1)
- `docs/PHASE2_SPEC.md`
- `docs/PHASE3_SPEC.md`
- `docs/PHASE4_SPEC.md`
- `docs/PHASE5_SPEC.md`
- `docs/PHASE6_SPEC.md`

**Required sections per spec (additive — keep existing content):**

```markdown
## Acceptance Criteria

Each criterion is a single testable assertion. Every e2e and integration test must reference the AC-N it covers in its `describe()` or `test()` name (e.g., `test('AC-3.4: candidate enrichment retries on 5xx', ...)`).

- **AC-N.1** — <single testable assertion>
- **AC-N.2** — <single testable assertion>
- ...

## Required UX Flows

End-to-end user journeys. Each must have an e2e test referencing the UX-N ID.

- **UX-N.1** — <flow description: user enters X → sees Y → can Z>
- ...

## Non-Functional Requirements

Each NFR has a category (Performance | Accessibility | Security | Privacy | Scalability | UX) and a measurable threshold where possible.

- **NFR-N.1** *(Performance)* — First Load JS ≤ 130 kB
- **NFR-N.2** *(Accessibility)* — Lighthouse a11y ≥ 90
- **NFR-N.3** *(Security)* — 0 HIGH or CRITICAL findings from `npm audit`
- ...
```

**Authoring guidance for AC-N items:**
- One assertion per AC. If you read "X and Y must work" as one AC, split it.
- Numbered as `AC-N.M` where N is the phase number and M is sequential within the phase. (Phase 1 uses `AC-1.M`.)
- Existing spec prose is the source of truth — distill into AC items, don't replace.

**Verification:**
```bash
# Sanity check: every spec now has the three sections
for f in docs/PROJECT_SPEC.md docs/PHASE{2,3,4,5,6}_SPEC.md; do
  for h in "## Acceptance Criteria" "## Required UX Flows" "## Non-Functional Requirements"; do
    grep -q "$h" "$f" || echo "MISSING: $h in $f"
  done
done
# Pass: no "MISSING" output

# Sanity check: AC-N IDs are present and well-formed
grep -hoE '\bAC-[0-9]+\.[0-9]+\b' docs/PROJECT_SPEC.md docs/PHASE*_SPEC.md | sort -u | head
# Pass: outputs a non-empty list like AC-1.1, AC-1.2, AC-2.1, ...
```

### A7. Update `scoring/auto-findings-rubric.md`

**Goal:** Document the new state — Hermes is now deployed, all 13 checks plus 4 new ones are active.

**Changes:**
1. **Rewrite Section 5** ("Scoring isolation"): change from "Hermes-on-VPS architecture (not yet deployed)" to "tmpfs overlay in Docker (deployed in v2). See `docker/run-claude.sh`." Document the tmpfs masking list.
2. **Add checks 14–17** for the new axes:
   - 14 — Acceptance coverage gap: `acceptanceCoverage.coverage < 1.0`
   - 15 — NFR compliance gap: `nfrCompliance.passRate < 1.0`
   - 16 — Coupling regression: `coupling.density` grew > 50% phase-over-phase OR `coupling.circular > 0`
   - 17 — Type safety regression: `typeSafety.strictErrors > 0` OR `typeSafety.escapeHatches` grew > 0 from prior phase
3. **Document the v2 tag convention:** `<framework>-r<N>-phase<N>-complete` for every phase including forwards. Note that legacy convention (`<framework>-phase<N>-complete`) is still resolved as fallback for Run 5 retroactive analysis.

### A8. Narrow the claim in `docs/FRAMING.md`

**Goal:** Even with closed gaps, scope what the experiment can claim.

**Add a paragraph after the existing claim list:**

> **Scope of v2 claim:** The v2 ranking represents workflow-as-defined-by-its-prompts paired with Claude Sonnet, executed autonomously on a single Next.js project, n=3 Phase 1 replicates + n=1 forward-phase replicate per framework. It does not claim generalization to: (a) human developers using these frameworks, (b) non-Sonnet models, (c) projects outside the Next.js / React / TypeScript / Tailwind stack, or (d) codebases above ~10k LOC. Phase D (if executed) provides a sanity check on model-effect magnitude but does not extend the generalization range.

Also update the "What this experiment can and cannot claim" table to reflect closed-gap rigor (e.g., remove or annotate the "rubric leakage" caveat since v2 deploys isolation).

### A9. Update aggregator for the 7-axis composite

**Goal:** Replace the existing 5-axis composite (testQuality 25 / complexity 25 / diffHygiene 20 / completion 20 / variance 10) with the v2 7-axis composite.

**File:** `scoring/aggregate-experiment.mjs` lines ~270-410 (the composite-computation block).

**New formula (sum = 100):**

| Axis | Weight | Inputs |
|---|---|---|
| **Feature Completeness** | 25 | mean(acceptanceCoverage.coverage × nfrCompliance.passRate) across Phases 1-6 |
| **Code Quality** | 15 | Normalized: complexity (avg + max) + eslint counts + bundle in [85,130]kB + typeSafety.strictErrors + escapeHatches |
| **Test Quality** | 15 | Coverage trajectory + e2e pass rate + optional mutation score |
| **Scope Discipline** | 15 | mean(scopeAdherence) across Phases 2-6 + penalty on unexpected `productionLOC` (testLOC never penalized) |
| **Maintainability Trajectory** | 10 | complexity delta growth + coupling density growth across consecutive phases |
| **Process Fidelity** | 10 | TDD binary present + workflow-log step coverage + subagentCalls match framework's expected topology |
| **Replication Variance** | 10 | inverse mean RSD on Phase 1 metrics across 3 replicates |

**Implementation notes:**
- Each axis is normalized to [0,100] before weighting
- Document the normalization function for each axis in code comments
- Emit per-axis scores AND per-axis sub-component scores (so the markdown table can show "Feature Completeness: 78 (AC: 0.85, NFR: 0.92)")
- Update the markdown renderer at lines ~593-602 and beyond to show:
  - Separate `productionLOC` / `testLOC` columns
  - Per-axis scores
  - Optional sub-component column
  - Per-framework "key findings" expansion

**Verification:**
```bash
node scoring/aggregate-experiment.mjs
# Pass: regenerates FINAL_RANKING.md and FINAL_REPORT.json
# Pass: every framework has 7 axis scores summing to a composite ≤ 100
# Pass: no '—' or 'null' in critical columns
```

Reproducibility check:
```bash
node scoring/aggregate-experiment.mjs && cp metrics/experiment/FINAL_REPORT.json /tmp/run1.json
node scoring/aggregate-experiment.mjs && diff /tmp/run1.json metrics/experiment/FINAL_REPORT.json
# Pass: diff is empty (deterministic)
```

---

## Phase A gate

Before moving to Phase B, every task above must pass its verification. Run this consolidated check:

```bash
# Sanity gate
echo "A1.1" && node scoring/compute-deltas.mjs --branch experiment/bmad-r2 --phase 3 >/dev/null 2>&1 && echo "OK"
echo "A1.2" && bash scripts/emit-timing.sh --event test --phase 0 --file /tmp/timing-test.jsonl && jq . /tmp/timing-test.jsonl >/dev/null && echo "OK"
echo "A2"   && node scoring/aggregate-experiment.mjs --dry-run | grep -q "check 4\|check 8\|check 9\|check 10" && echo "OK"
echo "A3"   && node scoring/measure.mjs --repo . --phase 1 --branch test/x --skip-build --print-only | jq -e '.linesOfCode.productionLOC' >/dev/null && echo "OK"
echo "A4.1" && [ -f scoring/acceptance-coverage.mjs ] && echo "OK"
echo "A4.2" && [ -f scoring/nfr-compliance.mjs ] && echo "OK"
echo "A4.3" && [ -f scoring/tdd-signal.mjs ] && echo "OK"
echo "A4.4" && [ -f scoring/coupling.mjs ] && echo "OK"
echo "A4.5" && [ -f scoring/type-safety.mjs ] && echo "OK"
echo "A4.6" && [ -f scoring/subagent-calls.mjs ] && echo "OK"
echo "A5"   && ./docker/run-claude.sh --dry-run --shell "ls /workspace/scoring" 2>&1 | grep -q "^$\|isolation" && echo "OK"
echo "A6"   && grep -l "## Acceptance Criteria" docs/PROJECT_SPEC.md docs/PHASE{2,3,4,5,6}_SPEC.md | wc -l | grep -q "^6$" && echo "OK"
echo "A7"   && grep -q "checks 14" scoring/auto-findings-rubric.md && echo "OK"
echo "A8"   && grep -q "Scope of v2 claim" docs/FRAMING.md && echo "OK"
echo "A9"   && node scoring/aggregate-experiment.mjs >/dev/null && echo "OK"
```

All `OK`s = Phase A green. Any failure = fix before proceeding.

---

## Phase B — Smoke run validation

**Goal:** Prove Phase A actually works end-to-end before re-running 45 actions.

**Procedure:**
1. Pick the simplest workflow: **vanilla**
2. Run all 6 phases on a fresh worktree using the existing `/start` orchestrator
3. Validate that every measure produces clean, non-null data on every phase

**Sub-tasks:**

| Task | Verification |
|---|---|
| B1 — Create fresh worktree `experiment/vanilla-r1-v2` from `main` | `git worktree add ../voter-choice-vanilla-v2 -b experiment/vanilla-r1-v2 main` |
| B2 — Run Phase 1 via orchestrator with Hermes isolation active | After completion: `cat metrics/experiment/vanilla-r1-v2/phase1.json` shows all fields non-null |
| B3 — Tag `vanilla-r1-phase1-complete` | `git tag -l 'vanilla-r1-phase1-complete'` returns it |
| B4 — Validate `metrics/timing.jsonl` has valid ISO timestamps for build_start AND build_end | `jq '.[] | .timestamp' metrics/timing.jsonl \| head` shows valid ISO strings |
| B5 — Run Phases 2-6, tagging each `vanilla-r1-phase<N>-complete` | All tags exist after completion |
| B6 — Run `compute-deltas.mjs` for Phases 2-6 | All 5 delta files written without errors |
| B7 — Run `aggregate-experiment.mjs` for the single-framework smoke run | FINAL_RANKING shows vanilla with 7-axis scores, no nulls in critical columns |
| B8 — Sanity check: vanilla shows LOW Process Fidelity (no declared workflow) | If vanilla scores HIGH on Process Fidelity, the axis is broken — fix before scaling |

**Hold gate:** if B8 fails or any earlier step produces null/missing data, **stop and fix in Phase A** before moving to Phase C. Don't paper over with workarounds; that's how Run 5 ended up with 7 gaps.

---

## Phase C — Clean re-run of 45 actions (Run 6)

**Goal:** Re-run the full experiment with closed-gap infrastructure.

**Structure (matches original):**
- 15 Phase 1 replicates: 3 per framework × 5 frameworks
- 5 representative selections: median `productionLOC` chosen by `select-representative.mjs`
- 25 forward iterations: 5 frameworks × Phases 2-6

**Operator note:** The repo has an existing `/start` orchestrator (see `.claude/commands/start.md`). After Phase A8 ships, `/start` should automatically:
- Use the v2 tag convention `<framework>-r<N>-phase<N>-complete` uniformly
- Route timing through `scripts/emit-timing.sh`
- Run inside Hermes-isolated Docker
- Capture all new measures (acceptance, NFR, coupling, type-safety, subagent-calls)

**Run order:** as designed in `EXPERIMENT_DESIGN.md` — randomized to distribute any learning effects.

**Sub-tasks:**

| Task | Verification |
|---|---|
| C1 — Run all 15 Phase 1 actions | 15 tagged commits exist; 15 `phase1.json` files have full schema |
| C2 — Select representatives via `select-representative.mjs` | 5 `<framework>-representative.json` files exist; each names a replicate |
| C3 — Run 25 forward iterations | 25 tagged commits exist; 25 phase JSONs have full schema |
| C4 — Run `compute-deltas.mjs` for all 25 forward phases | 25 delta JSONs written successfully |
| C5 — Run `aggregate-experiment.mjs` | Regenerates `FINAL_RANKING.md` + `FINAL_REPORT.json` v2 |
| C6 — Write `docs/ANALYSIS.md` v2 section: "Run 5 vs Run 6 comparison" | Document which axes shifted; which findings became significant; which became insignificant |

**Quality bar for C5:**
- 25/25 diff-hygiene observations populated (vs Run 5's 5/25)
- 11/13 original rubric checks applied + 4 new checks → 15/17 total
- 0 timing gaps
- No "—" cells in Test Quality, Code Quality, or Feature Completeness columns
- Reproducibility check (run twice → identical) passes

---

## Phase D — Multi-model robustness check (optional)

**Goal:** Estimate how much of the cross-framework variance is attributable to model swap vs. workflow swap.

**Procedure:**
1. Select 5 random actions from the 45 (1 per framework, random phase)
2. Re-run each with an alternate model (Opus, or Codex-GPT via the existing Codex-critic branch infrastructure)
3. Compute per-axis variance contribution from model swap vs. workflow swap

**Sub-tasks:**

| Task | Verification |
|---|---|
| D1 — Pick 5 random (framework, phase) pairs | Deterministic seed in a script; record selection in `docs/ANALYSIS.md` |
| D2 — Re-run each pair with alternate model on a fresh worktree branch (`experiment/<framework>-r<N>-phase<N>-altmodel`) | 5 new tagged commits and 5 phase JSONs |
| D3 — Compare per-axis scores | Compute `varianceContribution = stddev(model-swap) / stddev(workflow-swap)` per axis |
| D4 — Annotate `FINAL_RANKING.md` axes where model variance dominates workflow variance | Any axis where ratio > 1.5 is flagged "model-confounded" |
| D5 — Update `FRAMING.md` claim if needed | If most axes are model-confounded, narrow the claim to "Sonnet-only"; if not, document model-effect magnitude as a known caveat |

---

## File map (everything to modify or create)

**Modify:**
- `scoring/compute-deltas.mjs` — tag-resolution fix lines ~64-109 [DONE in worktree]
- `scoring/diff-hygiene.mjs` — tag-resolution fix lines ~63-105 [DONE in worktree, verify only]
- `scoring/measure.mjs` — A1.3 dedupe + A3 LOC split + A4.4 coupling + A4.5 type-safety integration
- `scoring/aggregate-experiment.mjs` — A2 rubric checks + A9 7-axis composite + A3 LOC columns
- `scoring/auto-findings-rubric.md` — A7 checks 14-17 + Section 5 rewrite + tag convention doc
- `.claude/commands/start.md` — A1.2 timing wrapper integration + v2 tag-emit convention
- `docker/run-claude.sh` — A5 Hermes tmpfs extensions + entrypoint assertion + transcript bind-mount
- `docs/PROJECT_SPEC.md` + `docs/PHASE{2,3,4,5,6}_SPEC.md` — A6 AC/UX/NFR sections
- `docs/FRAMING.md` — A8 narrowed claim
- `docs/ANALYSIS.md` — Phase C6 Run 5 vs Run 6 comparison

**Create:**
- `scripts/emit-timing.sh` — A1.2 host-side timing wrapper
- `scripts/post-build-score.sh` — A5 host-side harvester + scorer
- `scoring/acceptance-coverage.mjs` — A4.1
- `scoring/nfr-compliance.mjs` — A4.2
- `scoring/tdd-signal.mjs` — A4.3
- `scoring/coupling.mjs` — A4.4
- `scoring/type-safety.mjs` — A4.5
- `scoring/subagent-calls.mjs` — A4.6

**Regenerate (don't edit by hand):**
- `metrics/experiment/FINAL_RANKING.md` (v2)
- `metrics/experiment/FINAL_REPORT.json` (v2)
- `metrics/<branch>/phase<N>.json` (Run 6 outputs)
- `metrics/<branch>/delta-phase<N-1>-to-phase<N>.json` + `.md`
- `metrics/<branch>/acceptance-coverage-phase<N>.json`
- `metrics/<branch>/nfr-compliance-phase<N>.json`
- `metrics/<framework>-tdd-signal.json`
- `metrics/<framework>-representative.json` (recomputed for v2)

---

## State persistence and resumption

If you're picking this up mid-execution:

1. `git status` and `git diff` to see what's already been changed in this worktree
2. Read `docs/RUN_LOG.md` tail — every prior action is logged there chronologically
3. Check the Phase A gate consolidated check above — run it and see which tasks already pass
4. The plan file at `~/.claude/plans/hi-i-m-on-tender-hellman.md` contains the original design rationale if you need it
5. **Don't rerun tasks already complete.** The verification commands in each task are idempotent — use them to check state before doing work

After every task completes:
- Commit with a meaningful message: `phase A1.2: build emit-timing.sh wrapper`
- Don't squash; the commit log is experiment data

After each Phase gate passes:
- Tag the gate: `git tag phase-A-complete`, `phase-B-complete`, etc.
- Append a `## Next` entry to `docs/RUN_LOG.md` describing what's next

---

## Pitfalls / gotchas

1. **The `$(date)` bug is sneaky.** It only manifests when the date substitution sits inside a prompt string sent to a sub-agent — not when run directly in your shell. Always pipe timing through `scripts/emit-timing.sh`, even when it feels like overkill.

2. **Hermes isolation breaks if `metrics/` is masked before measure.mjs runs and you don't provide a scratch mount.** The intended pattern is: container runs the build → writes only to `metrics/run-outputs/<run-id>/` mounted at `/workspace/metrics` → exits → host runs the scorer against the repo checkout plus that scratch dir. Measure.mjs runs OUTSIDE the container, so it can see `scoring/` and merge the scratch timing/workflow logs into canonical `metrics/<branch>/phase<N>.json`. Don't accidentally invert this.

3. **Tag convention drift.** Run 5 used `<framework>-phase<N>-complete` for forward phases (no replicate). Run 6 should use `<framework>-r<N>-phase<N>-complete` uniformly. The scoring scripts handle both via fallback, but new tags emitted by `/start` orchestration must use the v2 convention.

4. **Spec restructuring can drift from existing tests.** When adding AC-N IDs to specs, also retrofit at least one e2e/integration test per AC to reference the ID in its `describe()` name. Otherwise A4.1 will report 0% coverage on Run 5 data — which is technically correct but useless for the Run 5 vs Run 6 comparison.

5. **Sub-agent transcripts may not be available depending on Claude Code config.** A4.6 assumes transcripts are written somewhere host-readable. If not, treat `subagentCalls` as optional and emit `null`; the Process Fidelity axis should weight other components more heavily in that case.

6. **`madge` can choke on circular deps.** A4.4 should handle the `circular` field gracefully and not crash on cycles. Use `madge --json` (machine-readable) rather than `madge --circular` (CLI-formatted).

7. **`tsc --strict` may fail if the project's tsconfig.json already disables it.** A4.5 needs to invoke tsc with explicit `--strict` even when the project config disables it — that's the whole point of measuring "would this code pass strict mode."

8. **Run 5 data must not be deleted.** Phase C6 compares Run 5 ranking to Run 6 ranking. If you accidentally regenerate FINAL_RANKING.md before capturing the Run 5 version, recover it from git history: `git show <run5-tag>:metrics/experiment/FINAL_RANKING.md`.

9. **CE coverage will need backfill OR re-runs.** Run 5's `compound-engineering` phase JSONs have `vitest.coverage = None` for Phases 2-6. In Run 6, this is moot (clean re-run captures coverage). But if you ever need to retroactively analyze Run 5, you'll need to check out each `compound-engineering-phase<N>-complete` tag and run `npx vitest run --coverage`.

10. **Process Fidelity axis must NOT reward vanilla.** Vanilla has no declared workflow — it should score lowest on this axis by construction. If your sanity check (B8) shows vanilla scoring high here, the axis is rewarding the wrong thing (e.g., "no workflow violations" because there's no workflow to violate). Fix by anchoring the score to declared-step coverage, not to absence of violations.

---

## Glossary

- **Framework / workflow:** vanilla, bmad, compound-engineering, spec-kit, superpowers — the 5 AI coding methodologies being compared
- **Replicate:** one of N independent runs of the same framework on the same phase (Phase 1 has 3 replicates; forward phases have 1 representative)
- **Phase:** one of 6 build stages (1 = base ballot tool; 2-6 = forward iterations adding i18n, real data, more locales, LLM chat, drag-rank)
- **Action:** one (framework, replicate, phase) combination = 15 Phase 1 + 25 forward = 40, plus 5 representative selections = 45 total
- **Run:** a complete execution of all 45 actions. Run 5 was the last completed run; Run 6 is the v2 re-run this plan produces
- **Composite score:** weighted sum of axis scores producing a single number per framework for ranking
- **Hermes isolation:** the tmpfs overlay pattern that hides scoring rubric and prior metrics from workflows during the build, preventing metric gaming
- **AC-N / UX-N / NFR-N:** acceptance criteria / UX flow / non-functional requirement IDs introduced in A6 for programmatic completeness checking
- **Process Fidelity:** an axis measuring whether the framework actually executed its declared workflow steps (not just produced output that looks right)

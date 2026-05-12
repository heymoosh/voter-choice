# Phase C Runbook: Clean Re-Run of 45 Actions (Run 6)

> **Prerequisites:** Phase B fully complete (B1-B6 + re-scoped B8 all green).
> Do NOT start Phase C if Phase B is partial. See `docs/RUN_LOG.md` for current Phase B status.

---

## Pre-flight checklist

Run these before dispatching ANY Phase C action:

```bash
# 1. API budget check — must pass before each action
bash scripts/api-budget-check.sh

# 2. Phase B gate — all 6 smoke phases must be tagged
for p in 1 2 3 4 5 6; do
  git tag -l "vanilla-r1-v2c-phase${p}-complete" | grep -q . || echo "MISSING: B${p}"
done

# 3. AC-N pickup — each phase must have tagged tests
for p in 1 2 3 4 5 6; do
  echo "Phase $p AC-N hits:"
  git show "vanilla-r1-v2c-phase${p}-complete":e2e/ 2>/dev/null \
    | grep -cE "AC-${p}\." || echo "0 — FIX BEFORE PHASE C"
done

# 4. Infrastructure smoke — container still works
bash scripts/validate-container-git.sh
bash scripts/validate-container-claude.sh /path/to/a/workflow-worktree

# 5. phase-A-complete tag must be CURRENT (not the old premature tag)
git tag -l phase-A-complete
git log phase-A-complete --oneline -1
# Should point to a commit AFTER all Phase A infrastructure work
```

---

## Wave structure (quota-aware)

Phase C has 45 actions. Run them in three waves to stay within quota limits:

| Wave | Actions | Type | Estimated quota |
|------|---------|------|-----------------|
| Wave 1 | 15 Phase 1 replicates (3 × 5 frameworks) | Fresh builds | ~33% |
| Wave 2 | 5 representative selections | Script invocations, fast | ~5% |
| Wave 3 | 25 forward phases (5 frameworks × Phases 2-6) | Incremental builds | ~60% |

**Rule:** If `api-budget-check.sh` shows < 20% remaining, pause and wait for reset.

### Run order (randomized from EXPERIMENT_DESIGN.md)

Randomize within each wave to distribute learning effects. Record the order in `docs/RUN_LOG.md` before starting (not after).

---

## Per-action gate (apply after EVERY action)

```bash
# After each action completes:
FRAMEWORK=<fw>
PHASE=<N>
BRANCH=experiment/${FRAMEWORK}-r1  # or -r2, -r3 for replicates

# 1. Clean commit check
infra_dels=$(git show HEAD --diff-filter=D --name-only | grep -cE "^(docs/|scoring/)" || echo 0)
echo "Infrastructure deletions: $infra_dels"  # must be 0

# 2. Phase JSON has required fields
jq -e '.linesOfCode.productionLOC, .acceptance.coverage,
       .nfrCompliance.passRate, .coupling.density,
       .typeSafety.strictErrors' \
  metrics/experiment/${BRANCH}/phase${PHASE}.json
# All must be non-null (non-zero or 0 are both OK; null is a failure)

# 3. AC-N tagging present
grep -rE "AC-${PHASE}\.[0-9]+" e2e/ src/ | head -3
# Must have hits — empty = instruction not followed

# 4. Delta file exists (phase >= 2)
if [ "$PHASE" -ge 2 ]; then
  ls metrics/experiment/${BRANCH}/delta-phase$((PHASE-1))-to-phase${PHASE}.json
fi
```

If any gate fails: diagnose the root cause, fix the infrastructure, rerun. Do not move to the next action.

---

## Kill-switch criteria

Stop Phase C immediately (don't start next action) if:

1. **API quota error** (`400 workspace usage limit`) — log to `metrics/failures.jsonl`, halt
2. **Quota < 20%** per `api-budget-check.sh`
3. **Three consecutive action failures** of the same type — indicates systemic issue not per-action
4. **Git history corruption** — any push that shows unexpected branch divergence

On halt: commit the failures.jsonl, update RUN_LOG with exact stopping point and failure mode.

---

## Sequencing rule

From `start.md` orchestrator:
1. All Phase 1 replicates first (15 actions)
2. Representative selections after all 3 replicates per framework are done (5 actions)
3. Forward phases only after ALL 5 representatives are selected (25 actions)

This ordering is enforced by the `/start` orchestrator. Do not reorder.

---

## Failure recovery

| Failure type | Recovery |
|-------------|---------|
| Test failure (vitest/playwright) | Build agent iterates up to 3 cycles; if unrecoverable, logs to failures.jsonl and tags anyway (failure is a finding) |
| Lint failure | Build agent fixes and retries; ESLint errors = do not tag |
| API error (external service, not quota) | Build agent uses fallback/mock per spec; documents in responder-log.jsonl |
| Quota error | Halt, log, wait for reset |
| Context limit mid-build | Resume container with "continue from where you left off" prompt; commit partial work if tests pass |
| Contaminated commit (infra deletions) | Do NOT push; diagnose; fix `git add` scope; rebuild |

---

## AC-N verification (post-Phase C)

After all 45 actions, run this to verify AC-N coverage across all frameworks and phases:

```bash
for fw in vanilla bmad spec-kit superpowers compound-engineering; do
  for p in 1 2 3 4 5 6; do
    tag="${fw}-r1-phase${p}-complete"
    if git tag -l | grep -qx "$tag"; then
      count=$(git show "$tag":e2e/ 2>/dev/null | grep -cE "AC-${p}\." || echo 0)
      echo "$fw phase $p: $count AC-N refs"
    fi
  done
done
```

Any zero: that phase's workflow did not follow the AC-N instruction. Flag it in `docs/ANALYSIS.md` as a measurement gap.

---

## Phase C completion

Phase C is done when:
```bash
# Discovery script returns empty
bash -c "$(grep -A 40 '### Step 2: Run the discovery script' .claude/commands/start.md | grep -v '#')"
# → empty output

# All 45 tags exist
git tag -l | grep -cE "(r[123]-phase1|phase[2-6])-complete"  # should be 45
```

Then:
1. Run `node scoring/aggregate-experiment.mjs`
2. Write `docs/ANALYSIS.md` v2 section (Run 5 vs Run 6 comparison)
3. Tag `phase-C-complete`

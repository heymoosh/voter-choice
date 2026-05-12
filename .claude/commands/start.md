You are the experiment orchestrator. Your job is lightweight: figure out the next action, dispatch a sub-agent to do it, log the result, loop. Do not do build work yourself — sub-agents do that. This keeps your context clean across all 45 actions.

## How this works

The experiment has three kinds of work, in this order:

1. **Phase 1 replicates** — 3 builds per framework × 5 frameworks = 15 builds total. Each on its own `experiment/<framework>-r<N>` branch.
2. **Representative selection** — 5 selections, one per framework. Picks the median-LOC replicate. Fast script invocation.
3. **Phase 2–6 forward iteration** — 5 phases × 5 frameworks = 25 builds total. Runs on the chosen replicate branch.

Total: 15 + 5 + 25 = **45 discrete actions**. You dispatch one sub-agent per action, log its 1-paragraph summary, loop. Exit when context degrades or the experiment is complete. Re-invoke `/start` to resume — state lives on disk (git tags + metric files), not in this conversation.

**Model policy for sub-agents:** every Agent tool dispatch in this orchestrator must include `model: "sonnet"`. This forces every of the 45 build actions to run on the same model class regardless of which model is driving the orchestrator session. Variance across model versions is one of the deliberate confounds we control for — sub-agents must not inherit Opus or Haiku silently.

---

## The loop

### Step 1: Pull latest state from origin

```bash
git fetch origin --tags --prune
```

### Step 2: Run the discovery script

Paste and run verbatim. Capture the first non-empty line of stdout:

```bash
FRAMEWORKS=(vanilla bmad spec-kit superpowers compound-engineering)
REPLICATES=(r1 r2 r3)

NEXT_ACTION=""

# Phase 1 replicates first
for fw in "${FRAMEWORKS[@]}"; do
  for r in "${REPLICATES[@]}"; do
    if ! git tag -l | grep -qx "${fw}-${r}-phase1-complete"; then
      NEXT_ACTION="phase1_replicate ${fw} ${r}"
      break 2
    fi
  done
done

# Then representative selection (only after all 3 replicates done for that framework)
if [ -z "$NEXT_ACTION" ]; then
  for fw in "${FRAMEWORKS[@]}"; do
    if [ ! -f "metrics/experiment/${fw}-representative.json" ]; then
      if git tag -l | grep -qx "${fw}-r1-phase1-complete" \
         && git tag -l | grep -qx "${fw}-r2-phase1-complete" \
         && git tag -l | grep -qx "${fw}-r3-phase1-complete"; then
        NEXT_ACTION="select_representative ${fw}"
        break
      fi
    fi
  done
fi

# Then phase 2–6 forward (only after ALL 5 frameworks have a representative)
if [ -z "$NEXT_ACTION" ]; then
  ALL_REPS=1
  for fw in "${FRAMEWORKS[@]}"; do
    [ -f "metrics/experiment/${fw}-representative.json" ] || ALL_REPS=0
  done
  if [ "$ALL_REPS" = "1" ]; then
    for p in 2 3 4 5 6; do
      for fw in "${FRAMEWORKS[@]}"; do
        if ! git tag -l | grep -qx "${fw}-phase${p}-complete"; then
          NEXT_ACTION="phase_forward ${fw} ${p}"
          break 2
        fi
      done
    done
  fi
fi

echo "$NEXT_ACTION"
```

### Step 3: Check the output

- **Empty output** → print the final summary table (bottom of this file) and exit. Experiment is complete.
- **Non-empty** → continue to Step 4.

### Step 4: Dispatch a sub-agent

Use the Agent tool with `subagent_type: "general-purpose"` AND `model: "sonnet"`. The `model: "sonnet"` is non-negotiable — it ensures every of the 45 actions runs on the same model class regardless of orchestrator model. Pick the prompt template below matching the action type. Fill in `<fw>`, `<r>`, and `<phase>` from the discovery output. The repo path is `/Users/Muxin/Documents/GitHub/voter-choice` (primary repo) or the current worktree path if different.

**Do not do any build work yourself.** The sub-agent handles everything: checkout, install, build, test, commit, tag, push.

### Step 5: Log the result

When the sub-agent returns, note its 1-paragraph summary (which action it ran, what succeeded/failed, what tag it pushed). Keep it brief — this is your only persistent record in this conversation.

### Step 6: Loop

Go back to Step 1. Don't pause between actions. Don't ask for confirmation. Just keep dispatching sub-agents until the discovery script returns empty or you've taken 5+ actions and notice context/tool degradation.

### When to exit

Exit only when:
- Discovery script returns empty (experiment done).
- You've dispatched at least 3 sub-agents and notice your orchestration is degrading (missed steps, confused state). Commit nothing — sub-agents already pushed. Exit. Next `/start` picks up where tags left off.
- A sub-agent reports a hard failure it couldn't recover (bad API key, infrastructure down). Log to `metrics/failures.jsonl` (check it out to main, commit, push), then exit for human review.

---

## Sub-agent prompt templates

### Template: phase1_replicate

Use when discovery output is `phase1_replicate <fw> <r>`.

```
You are a build agent running a single Phase 1 replicate in a workflow-comparison experiment.

Task: build the voter-choice app on branch `experiment/<FW>-<R>` using the framework's own methodology.

Repo path: /Users/Muxin/Documents/GitHub/voter-choice

## Steps (execute in order, no skipping)

1. git fetch origin --tags --prune
2. git checkout experiment/<FW>-<R>
3. bash scripts/load-secrets.sh 2>/dev/null || true
4. Deleting build artifacts: rm -rf node_modules .next coverage playwright-report.json
5. npm install
6. mkdir -p metrics metrics/experiment
7. bash scripts/emit-timing.sh --event build_start --phase 1 --branch "experiment/<FW>-<R>" --file metrics/timing.jsonl
8. Read .claude/commands/workflow.md on this branch. Execute every step under its `## Workflow Steps` section using `docs/PROJECT_SPEC.md` as the Phase 1 source of truth.
   **AC-N tagging is mandatory:** `docs/PROJECT_SPEC.md` has an `## Acceptance Criteria` section with `AC-1.N` items. Every e2e test and Vitest test that covers an acceptance criterion MUST reference the AC-N ID in its `describe()` or `test()` / `it()` name — e.g., `test("AC-1.2: single-state zip renders state card", ...)`. Without this tagging, the Feature Completeness axis cannot be computed.
9. **Responder logging is mandatory.** Every time the framework asks a clarifying question, menu choice, or decision, BEFORE answering append to metrics/responder-log.jsonl:
   {"timestamp":"<ISO-8601>","phase":1,"framework":"<FW>","question":"<verbatim>","decisionRule":"<spec section>","answer":"<your response>","autoChosen":true}
   `decisionRule` must cite the actual spec section (e.g. "PROJECT_SPEC.md FR-003"). If no spec section grounds it, write "reasonable default — no spec coverage".
10. Run: npm run lint
11. Run: npx vitest run
12. Run: npx playwright test
    Iterate (fix → re-run) until all three pass or document an unrecoverable blocker. If unrecoverable, write to metrics/failures.jsonl and stop.
13. bash scripts/emit-timing.sh --event build_end --phase 1 --branch "experiment/<FW>-<R>" --file metrics/timing.jsonl
14. Stage only application source files — do NOT use `git add .` as it captures deletions of Hermes-masked infrastructure paths (docs/, scoring/, metrics/) and corrupts the branch:
    git add src/ e2e/ public/ package.json package-lock.json
    [ -d data/ ] && git add data/ || true
15. git commit -m "phase1: <FW> replicate <R>"
16. git tag <FW>-<R>-phase1-complete
17. git push origin experiment/<FW>-<R>
18. git push --tags
19. Stop after the build/tag push. Host-side Hermes will harvest the scratch `metrics/` mount after container exit, run `scripts/post-build-score.sh`, write `metrics/<branch>/phase1.json`, and handle any post-build reporting.

## Return value
Return exactly one paragraph: which branch you built, whether lint/vitest/playwright passed or what failed, and which tag was pushed. Do not claim that measurement or RUN_LOG updates already happened; those are host-side post-build steps.
```

---

### Template: select_representative

Use when discovery output is `select_representative <fw>`.

```
You are a selection agent picking the representative Phase 1 replicate for one framework in a workflow-comparison experiment.

Task: run the representative-selection script for framework `<FW>` and commit the result to main.

Repo path: /Users/Muxin/Documents/GitHub/voter-choice

## Steps

1. git fetch origin --tags --prune
2. git checkout main
3. git pull --no-rebase origin main
4. node scoring/select-representative.mjs --framework <FW> --repo "$(pwd)"
   This reads metrics/experiment/<FW>-r{1,2,3}/phase1.json, picks the median-LOC run, and writes metrics/experiment/<FW>-representative.json.
5. git add metrics/experiment/<FW>-representative.json
6. git commit -m "select-representative: <FW> (chose median-LOC replicate)"
7. **Append a RUN_LOG entry** for the selection:
    ```
    CHOSEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('metrics/experiment/<FW>-representative.json')).chosen)")
    RATIONALE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('metrics/experiment/<FW>-representative.json')).rationale)")
    node scoring/log-run.mjs --phase 1 --framework <FW> --branch main --tag select-representative-<FW> --status ok --summary "chose $CHOSEN — $RATIONALE" --repo "$(pwd)"
    git add docs/RUN_LOG.md
    git commit -m "run-log: select-representative <FW> auto-entry"
    ```
8. git push origin HEAD:main

## Return value
Return exactly one paragraph: which replicate was chosen, what its LOC was, what the variance across r1/r2/r3 was, and confirm the push succeeded.
```

---

### Template: phase_forward

Use when discovery output is `phase_forward <fw> <phase>`.

```
You are a build agent running a forward-iteration phase in a workflow-comparison experiment.

Task: build Phase <PHASE> of the voter-choice app for framework `<FW>` on its chosen representative replicate branch.

Repo path: /Users/Muxin/Documents/GitHub/voter-choice

## Steps (execute in order, no skipping)

1. git fetch origin --tags --prune
2. git checkout main && git pull --no-rebase origin main
3. Read the chosen replicate:
   CHOSEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('metrics/experiment/<FW>-representative.json')).chosen)")
   BRANCH="experiment/<FW>-${CHOSEN}"
4. git checkout "$BRANCH"
5. bash scripts/load-secrets.sh 2>/dev/null || true
   If this fails AND Phase <PHASE> spec requires external API keys, document the blocker in metrics/failures.jsonl, push, and stop.
6. Deleting build artifacts: rm -rf node_modules .next coverage playwright-report.json
7. npm install
8. mkdir -p metrics metrics/experiment
9. bash scripts/emit-timing.sh --event build_start --phase <PHASE> --branch "$BRANCH" --file metrics/timing.jsonl
10. Read .claude/commands/workflow.md on this branch. Execute every step under its `## Workflow Steps` section using `docs/PHASE<PHASE>_SPEC.md` as the source of truth.
    **AC-N tagging is mandatory:** `docs/PHASE<PHASE>_SPEC.md` has an `## Acceptance Criteria` section with `AC-<PHASE>.N` items. Every e2e test and Vitest test that covers an acceptance criterion MUST reference the AC-N ID in its `describe()` or `test()` / `it()` name — e.g., `test("AC-2.3: language toggle persists on reload", ...)`. Without this tagging, the Feature Completeness axis cannot be computed.
11. **Responder logging is mandatory** — same protocol as Phase 1: append to metrics/responder-log.jsonl before answering every framework question.
12. Run: npm run lint
13. Run: npx vitest run
14. Run: npx playwright test
    Iterate until green or document an unrecoverable blocker.
15. bash scripts/emit-timing.sh --event build_end --phase <PHASE> --branch "$BRANCH" --file metrics/timing.jsonl
16. Stage only application source files — do NOT use `git add .` as it captures deletions of Hermes-masked infrastructure paths (docs/, scoring/, metrics/) and corrupts the branch:
    git add src/ e2e/ public/ package.json package-lock.json
    [ -d data/ ] && git add data/ || true
17. git commit -m "phase<PHASE>: <FW>"
18. git tag <FW>-phase<PHASE>-complete
19. git push origin "$BRANCH"
20. git push --tags
21. Stop after the build/tag push. Host-side Hermes will harvest the scratch `metrics/` mount after container exit, run `scripts/post-build-score.sh`, write `metrics/<branch>/phase<PHASE>.json`, then compute deltas and post-build reports from the host.

## Return value
Return exactly one paragraph: which branch/phase you built, whether tests passed or what failed, and what tag was pushed. Do not claim that scoring, deltas, or RUN_LOG updates already happened; those are host-side post-build steps.
```

---

## Final summary — run the aggregator and report

When the discovery script returns empty, the experiment is data-complete. Run the aggregator from the orchestrator (not as a sub-agent — it's fast and the orchestrator wants to inspect the result before exiting):

```bash
git checkout main
git pull --no-rebase origin main
node scoring/aggregate-experiment.mjs --repo "$(pwd)"
git add metrics/experiment/FINAL_REPORT.json metrics/experiment/FINAL_RANKING.md
git commit -m "experiment: final aggregator output"
git push origin HEAD:main
```

Then read `metrics/experiment/FINAL_RANKING.md` and print its contents to the user, prefaced with:

```
EXPERIMENT COMPLETE — 45 actions done.

Final ranking and metric comparison written to metrics/experiment/FINAL_RANKING.md.
Findings per the 13-check rubric are inline. Read it in light of docs/FRAMING.md
to keep the claim scoped to what this experiment can actually support.
```

Also print the completion checkbox table so the user can verify all 45 actions landed:

```bash
echo "Tag completion check:"
for fw in vanilla bmad spec-kit superpowers compound-engineering; do
  row="$fw"
  for r in r1 r2 r3; do
    if git tag -l | grep -qx "$fw-$r-phase1-complete"; then row="$row | ✓"; else row="$row | —"; fi
  done
  if [ -f "metrics/experiment/$fw-representative.json" ]; then row="$row | ✓"; else row="$row | —"; fi
  for p in 2 3 4 5 6; do
    if git tag -l | grep -qx "$fw-phase$p-complete"; then row="$row | ✓"; else row="$row | —"; fi
  done
  echo "$row"
done
```

Then exit. The user can read the FINAL_RANKING.md and the RUN_LOG entries to understand what happened overnight.

### If partial

If the orchestrator exits before all 45 actions complete (context degraded, fatal failure), the aggregator still runs against partial data and produces a partial ranking. The composite scores reflect "what's been measured so far"; the per-framework `completedPhases` field tells the user which frameworks finished and which didn't. Tell the user to re-invoke `/start` (or `/loop /start`) to resume.

You are the experiment orchestrator. Drive the experiment to completion across all 5 frameworks. State lives on disk (tags + metric files), not in this conversation. Loop until done. Do not stop for confirmation.

## How this works

The experiment has three kinds of work, in this order:

1. **Phase 1 replicates** — 3 builds per framework × 5 frameworks = 15 builds total. Each on its own `experiment/<framework>-r<N>` branch. Variance estimation.
2. **Representative selection** — 5 selections, one per framework. Picks the median-LOC replicate. Pure script invocation, ~5 seconds each.
3. **Phase 2–5 forward iteration** — 4 phases × 5 frameworks = 20 builds total. Each runs on the chosen replicate branch (e.g., `experiment/bmad-r2` if r2 was selected). Iterates the codebase through Spanish i18n → real APIs → 5 languages w/ RTL → on-site LLM chat.

Total: 15 + 5 + 20 = **40 discrete actions**. You do as many as you can per session, then exit. The next `/start` invocation picks up where you left off because **state is on disk, not in conversation**.

## The loop

### Step 1: Pull latest from origin

```bash
git fetch origin --tags --prune
```

### Step 2: Compute the next action

Run this discovery script (paste verbatim, capture the first non-empty line of output):

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

# Then phase 2–5 forward (only after ALL 5 frameworks have a representative)
if [ -z "$NEXT_ACTION" ]; then
  ALL_REPS=1
  for fw in "${FRAMEWORKS[@]}"; do
    [ -f "metrics/experiment/${fw}-representative.json" ] || ALL_REPS=0
  done
  if [ "$ALL_REPS" = "1" ]; then
    for p in 2 3 4 5; do
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

If output is empty: **print "EXPERIMENT COMPLETE" with the summary table from the bottom of this file, then exit.**

Otherwise: the output is one of:
- `phase1_replicate <framework> <r>`
- `select_representative <framework>`
- `phase_forward <framework> <phase>`

### Step 3: Execute the action

Pick the matching section below. Execute every step in order. Commit, tag, push.

### Step 4: Loop

Go back to Step 1. Don't pause. Don't summarize between actions. Just keep going.

### When to exit

Exit only when:
- The discovery script outputs empty (experiment done — print the final summary).
- You've taken at least 3 actions and notice your responses are degrading, tool calls are failing in unexpected ways, or you're losing track of context. Commit current state, push, exit. The next `/start` will resume.
- An action fails 3 consecutive times with the same error. Log to `metrics/failures.jsonl`, push, exit so a human can investigate.

---

## Action: phase1_replicate <framework> <r>

```bash
BRANCH="experiment/${fw}-${r}"
git checkout "$BRANCH"
bash scripts/load-secrets.sh 2>/dev/null || true
rm -rf node_modules .next coverage playwright-report.json
npm install
mkdir -p metrics
echo "{\"event\":\"build_start\",\"timestamp\":\"$(date -Iseconds)\",\"branch\":\"$BRANCH\"}" > metrics/timing.jsonl
```

Then execute the framework workflow:
1. Read `.claude/commands/workflow.md` on this branch.
2. Execute every step in its `## Workflow Steps` section using `docs/PROJECT_SPEC.md` as the Phase 1 source of truth.
3. **Responder logging is mandatory:** every time the framework asks you a clarification, menu choice, or decision, append to `metrics/responder-log.jsonl` per the protocol documented in this file's `## Responder logging` section.
4. Run `npm run lint`, `npx vitest run`, `npx playwright test`. Iterate until green or document an unrecoverable blocker.

Then close the phase:
```bash
echo "{\"event\":\"build_end\",\"timestamp\":\"$(date -Iseconds)\"}" >> metrics/timing.jsonl
git add .
git commit -m "phase1: ${fw} replicate ${r}"
git tag "${fw}-${r}-phase1-complete"
node scoring/measure.mjs --phase 1 --repo "$(pwd)"
git add metrics/
git commit -m "measure: phase 1 ${fw} ${r}" 2>/dev/null || true
git push origin "$BRANCH"
git push --tags
```

---

## Action: select_representative <framework>

```bash
git checkout main
git pull --no-rebase origin main
node scoring/select-representative.mjs --framework "${fw}" --repo "$(pwd)"
git add metrics/experiment/${fw}-representative.json
git commit -m "select-representative: ${fw} (chose median-LOC replicate)"
git push origin HEAD:main
```

The output `metrics/experiment/${fw}-representative.json` contains a `chosen` field (e.g., `"r2"`) that subsequent phase_forward actions read.

---

## Action: phase_forward <framework> <phase>

Read the chosen replicate first:
```bash
CHOSEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('metrics/experiment/${fw}-representative.json')).chosen)")
BRANCH="experiment/${fw}-${CHOSEN}"
git checkout "$BRANCH"
bash scripts/load-secrets.sh 2>/dev/null || true
rm -rf node_modules .next coverage playwright-report.json
npm install
mkdir -p metrics
echo "{\"event\":\"build_start\",\"timestamp\":\"$(date -Iseconds)\",\"branch\":\"$BRANCH\",\"phase\":${phase}}" >> metrics/timing.jsonl
```

Then execute the framework workflow for this phase:
1. Read `.claude/commands/workflow.md` on this branch.
2. Execute every step in `## Workflow Steps` using `docs/PHASE${phase}_SPEC.md` as the source of truth.
3. Phase 3+ may require API keys (Google Civic, Vote Smart, Anthropic, etc.). If `bash scripts/load-secrets.sh` failed and the phase spec requires API access, document the unrecoverable blocker, write to `metrics/failures.jsonl`, push, exit — a human needs to provision keys.
4. Responder logging is mandatory.
5. Iterate to green.

Then close:
```bash
echo "{\"event\":\"build_end\",\"timestamp\":\"$(date -Iseconds)\"}" >> metrics/timing.jsonl
git add .
git commit -m "phase${phase}: ${fw}"
git tag "${fw}-phase${phase}-complete"
node scoring/measure.mjs --phase "${phase}" --repo "$(pwd)"
node scoring/compute-deltas.mjs --branch "$BRANCH" --phase "${phase}" --repo "$(pwd)"
git add metrics/
git commit -m "measure: phase ${phase} ${fw}" 2>/dev/null || true
git push origin "$BRANCH"
git push --tags
```

---

## Responder logging

Whenever the framework workflow asks you a menu choice, clarification question, or decision, before answering, append a single line to `metrics/responder-log.jsonl`:

```json
{"timestamp":"<ISO-8601>","phase":<N>,"framework":"<fw>","question":"<verbatim>","decisionRule":"<spec section that grounded the answer>","answer":"<your response>","autoChosen":true}
```

Rules:
- `question` is verbatim from the framework, not a paraphrase.
- `decisionRule` cites the actual spec section (`PHASE2_SPEC.md FR-018`, etc.). If no spec section grounds the answer, write `"reasonable default — no spec coverage"`.
- `answer` is the response or menu choice. For skipped questions, set `answer: "skipped"`, `autoChosen: false`.
- One entry per question. Don't batch.

The rubric checks this log later. Thin log on a question-heavy framework (BMAD, Spec Kit) = FINDING.

---

## Final summary table

When the discovery script outputs empty, print this and exit:

```
EXPERIMENT COMPLETE

Framework            | r1 | r2 | r3 | Chosen | P2 | P3 | P4 | P5
---------------------|----|----|----|--------|----|----|----|----
vanilla              | ✓  | ✓  | ✓  | r2     | ✓  | ✓  | ✓  | ✓
bmad                 | ✓  | ✓  | ✓  | r1     | ✓  | ✓  | ✓  | ✓
compound-engineering | ✓  | ✓  | ✓  | r3     | ✓  | ✓  | ✓  | ✓
spec-kit             | ✓  | ✓  | ✓  | r2     | ✓  | ✓  | ✓  | ✓
superpowers          | ✓  | ✓  | ✓  | r1     | ✓  | ✓  | ✓  | ✓

All 40 actions complete. See docs/RUN_LOG.md for per-phase metrics summary and metrics/experiment/ for full data.
```

If only partial: print which actions completed this session and which are still pending. Tell the operator to run `/start` again to continue (or `/loop /start` for hands-off).

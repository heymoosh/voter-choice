You are an autonomous agent. Your job is to execute work, not describe it.

## Context: what this command does now

This command is the entry point for Claude Code running inside the isolated Docker container during a workflow build. Its ONLY job is to execute the per-branch workflow and produce a committed, tagged build. It does NOT run measurement, adherence analysis, or update RUN_LOG. Those are Hermes's responsibilities, executed from the host after this container exits.

If you are running outside a container (e.g., the operator is working on Phase 0 or Phase 3 setup/analysis on `main`), skip to the "Non-container mode" section at the bottom.

## Scoring isolation (important)

The `scoring/` directory is masked by a tmpfs overlay inside this container and will appear empty. This is intentional — workflows must not see the measurement and adherence-check code during execution, because visibility of the rubric enables metric gaming (see `docs/LEARNINGS.md` → Learning 009). Do not attempt to inspect, bypass, or work around this mask. Do not try to guess what metrics will be measured. Build the app per the spec, follow the framework workflow, and trust that Hermes will score the result afterward.

## Step 0: Confirm you are on the right branch

Run: `git rev-parse --abbrev-ref HEAD`

Hermes should have checked you out to the correct workflow branch before starting this container. Verify it matches the branch Hermes intended. If you are on `main`, STOP and report — `/start` should never run a build from `main`.

If there are uncommitted changes on the branch, STOP and report: "Uncommitted changes on `<branch>`, cannot proceed."

## Step 1: Pre-flight checks

**1a. Log build start:**

Identify what model you are running as. Your model name is in your system context (e.g., `claude-opus-4-6`, `claude-sonnet-4-6`). Log it:

```
mkdir -p metrics && echo '{"event":"build_start","timestamp":"'$(date -Iseconds)'","model":"<YOUR_MODEL_ID>"}' > metrics/timing.jsonl
```

Replace `<YOUR_MODEL_ID>` with your actual model identifier. Do NOT hardcode a guess.

**1b. Verify required infrastructure files exist:**

Confirm these files exist in the working tree:
- `e2e/ballot-tool.spec.ts` (shared e2e test suite)
- `src/data/states/TX.json` (stub data)
- `.claude/commands/workflow.md` (framework workflow steps for this branch)

If any are missing, STOP and report. Do not proceed with the build.

**1c. Phase 2 only — verify starting point:**

If this is a Phase 2 run (determined by the prompt Hermes invoked you with):

Run: `git describe --tags --exact-match HEAD 2>/dev/null`

Expected tag should contain `phase1-complete`. If HEAD is not at the Phase 1 completion tag, STOP and report.

## Step 2: Clean environment

```
rm -rf node_modules .next coverage playwright-report.json
npm install
```

## Step 3: Execute framework workflow

**Build context:**
- **Phase 1:** This branch has the framework and scaffold installed but NO existing ballot tool code. You are building the app from scratch per `docs/PROJECT_SPEC.md`.
- **Phase 2:** This branch has a completed Phase 1 ballot tool. You are extending it with Spanish language support per `docs/PHASE2_SPEC.md`.
- **Phase 3:** Real API integration replacing stub data per `docs/PHASE3_SPEC.md`.
- **Phase 4:** Extended language support (5 languages including Arabic RTL) per `docs/PHASE4_SPEC.md`.
- **Phase 5:** On-site LLM chat, budget management, downloadable ballot, voter profile per `docs/PHASE5_SPEC.md`.

Read `.claude/commands/workflow.md` from the current branch. It contains the framework-specific workflow steps.

**Execute every instruction in that file completely before returning to Step 4 below.**

The workflow.md file contains:
- A `## Meta` section with framework name, tag prefix, and framework verification path
- A `## Workflow Steps` section — the core framework methodology to follow
- An `## Adherence Check` section — artifact verification commands to run after the build

Execute the `## Workflow Steps` section now. You will execute the `## Adherence Check` section in Step 4.

### Responder logging (REQUIRED during Step 3)

When the framework presents a menu, asks a clarifying question, or requests a decision, BEFORE proceeding append a JSON entry to `metrics/responder-log.jsonl` with this exact shape:

```json
{"timestamp":"<ISO-8601>","phase":<N>,"framework":"<framework-name>","question":"<verbatim prompt text>","decisionRule":"<spec section that grounded the answer>","answer":"<the response you gave>","autoChosen":true}
```

Rules:
- `question` must be the verbatim text the framework asked, not a paraphrase.
- `decisionRule` must cite the actual spec section that justified the choice (e.g., `PHASE2_SPEC.md FR-018`, `PROJECT_SPEC.md § "User Flow"`). If no spec section grounds the answer, write `"reasonable default — no spec coverage"` and proceed.
- `answer` is the response you gave or the menu choice you selected. For free-text responses, include the text. For skipped questions (e.g., "offer visual companion" with no visual surface), set `answer: "skipped"` and `autoChosen: false`.
- Append one entry per question. Do not batch.

This log is later read by the scoring rubric to verify the autonomous wrapper represented each framework fairly. If the log is empty or suspiciously thin for a framework that asks many questions (BMAD, Spec Kit), the rubric flags a finding.

## Step 4: Post-build close-out

**4a. Log build end:**

```
echo '{"event":"build_end","timestamp":"'$(date -Iseconds)'"}' >> metrics/timing.jsonl
```

**4b. Framework adherence artifact check:**

Read the `## Adherence Check` section of `.claude/commands/workflow.md` and execute those commands now. This produces a visible summary of which framework artifacts exist on disk. The output goes to stdout — Hermes captures it.

Do NOT run any scoring scripts. Do NOT run `node scoring/*` or similar. Those do not exist in this container's view of the filesystem and are not your responsibility.

**4c. Commit and tag:**

Read the `TAG_PREFIX` from the `## Meta` section of `.claude/commands/workflow.md`.

Extract the run number from the branch name prefix (e.g., `run4/compound-engineering` → `run4`). If the branch has no `run<N>/` prefix, omit the run segment from the tag.

Tag the branch: `<TAG_PREFIX>-<RUN>-phase<N>-complete` (e.g., `ce-run4-phase1-complete`, `bmad-run4-phase2-complete`).

Ensure all workflow work is committed on the current branch. Push commits and tags to remote:

```bash
git push && git push --tags
```

## Step 5: Exit cleanly

Report to stdout a concise summary for Hermes to capture:
- Current branch and HEAD commit hash
- Tag name you just created
- Total commits since the scaffold tag: `git rev-list --count v0-scaffold..HEAD`
- Whether `metrics/workflow-log.jsonl` exists and how many entries it has
- Whether `metrics/timing.jsonl` contains both `build_start` and `build_end` entries
- Any errors or deviations you encountered during the workflow

Do NOT run the full data completeness gate, do NOT compute metrics, do NOT update `docs/RUN_LOG.md`, do NOT attempt to analyze the build. Those are Hermes's responsibilities. Hermes reads the tag, runs `scoring/measure.mjs --repo <branch-worktree>` and `scoring/analyze-adherence.mjs --repo <branch-worktree>` from the host side, and updates `docs/RUN_LOG.md` on `main`.

Exit.

---

## Non-container mode (Phase 0 / Phase 3 work on main)

If the operator invoked you on `main` for Phase 0 (setup) or Phase 3 (analysis) work, the flow is different because you are not inside the workflow container.

1. Read `docs/RUN_LOG.md` on `main` and find the `## Next` section.
2. If `## Next` points to a Phase 1 or Phase 2 sub-phase, STOP and tell the operator: "Phase 1 and Phase 2 runs are now orchestrated by Hermes from the VPS. This `/start` command is only for Phase 0 and Phase 3 work on main. Start the Hermes run instead."
3. If `## Next` points to a Phase 0 or Phase 3 sub-phase, execute that sub-phase directly: create files, write code, make commits. Do the actual work now.
4. After completing the sub-phase:
   - Commit your changes on `main` with a meaningful message prefixed with the sub-phase identifier (e.g., `phase0.5: add Semgrep ruleset`)
   - Update `docs/RUN_LOG.md`: move the completed sub-phase into `## Completed` (include commit hash and brief summary), write the new next sub-phase into `## Next`
   - Commit the RUN_LOG update
5. Report a concise summary of what was done.

IMPORTANT: Skip straight to Step 0. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.

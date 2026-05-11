You are an autonomous agent. Your job is to execute work, not describe it. No preamble. First tool call is a file read. Go.

## What this command does

Chains `/start` across all experiment phases (1 → 5) for the current `experiment/<framework>` branch. Each phase calls `/start`, which builds, measures, commits, and tags. This command advances through every phase without stopping for operator input.

## Pre-flight

1. Confirm you are on an `experiment/<framework>` branch. Run `git rev-parse --abbrev-ref HEAD`. If not on `experiment/*`, STOP and report.
2. Load API keys: `bash scripts/load-secrets.sh` — this populates `.env.local` from Bitwarden. Required for Phase 3+ (Google Civic, Vote Smart, etc.) and Phase 5 (Anthropic API). If the script fails, log the error and continue — Phase 1 and Phase 2 do not require API keys.
3. Note the framework: extract from branch name (`experiment/bmad` → BMAD, `experiment/vanilla` → Vanilla, etc.).

## Phase loop

For each phase from 1 to 5, in order:

**Before each phase:**
- Read `docs/RUN_LOG.md` `## Next`. Confirm the next entry refers to this branch and this phase number. If RUN_LOG says a different branch or phase, stop and report the mismatch.
- Check whether a completion tag already exists for this phase on this branch (e.g., `vanilla-phase1-complete`). If yes, skip to the next phase — don't re-run completed phases.

**Run the phase:**
- Invoke `/start`. This reads the phase spec, runs the framework methodology, builds, runs tests, commits, and tags.
- `/start` updates `docs/RUN_LOG.md ## Next` to advance to the next phase automatically. Trust it.
- If `/start` fails (build errors, test failures, tag not created): log the failure to `metrics/run-phases-log.jsonl` with `{"phase": N, "status": "failed", "timestamp": "..."}`, then continue to the next phase rather than halting. The goal is to get as far as possible in one unattended run.

**Measurement (host-side, after the phase commits and tags):**
- Run `node scoring/measure.mjs --repo "$(pwd)" --phase <N>` to produce `metrics/<branch>/phase<N>.json`. Note: the scoring scripts live on `main`, not on the experiment branch. If running locally without Hermes, invoke from a separate `main` worktree pointed at this branch via `--repo`.
- If phase ≥ 2, also run `node scoring/compute-deltas.mjs --branch <branch> --phase <N> --repo "$(pwd)"` to produce the delta JSON + Markdown comparing this phase against the prior tag.
- Diff-hygiene runs automatically inside `measure.mjs` when `--phase >= 2` and `scoring/phase-scopes/phase<N>.json` exists.

**After each phase:**
- Append a success entry to `metrics/run-phases-log.jsonl`: `{"phase": N, "status": "complete", "tag": "<tag-name>", "timestamp": "..."}`

## Completion

After Phase 5 (or after all phases either complete or fail):
- Run `git log --oneline v2.0-experiment-baseline..HEAD` to show all commits made during this run.
- Check for a `<framework>-v2.0-complete` tag. If absent, create it now: `git tag <framework>-v2.0-complete && git push --tags`.
- Print a summary table:

```
Phase | Status  | Tag
------|---------|----
1     | complete | vanilla-phase1-complete
2     | complete | vanilla-phase2-complete
3     | failed   | —
4     | skipped  | —
5     | skipped  | —
```

- Update `docs/RUN_LOG.md` on `main` (via `git push origin HEAD:main` after committing) to record the run's outcome.

## Important: no operator checkpoints

Do NOT pause between phases to ask for confirmation or summarize findings. Trust the spec. Make reasonable defaults for any framework prompts using the relevant phase spec as source of truth (`docs/PHASE<N>_SPEC.md`). The operator is not present. Keep going.

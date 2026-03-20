You are an autonomous agent. Your job is to execute work, not describe it.

## Step 1: Read context
- Read `docs/RUN_LOG.md` — find the `## Next` section.
- Read any source files referenced in that section.

## Step 2: Determine phase type and act accordingly

### If Phase 0 or Phase 3 (setup / analysis):
Execute the sub-phase directly. Create files, write code, make commits. Do the actual work NOW. Skip to Step 4.

### If Phase 1 or Phase 2 (build / extend):
**STOP.** You are on the `main` branch. Build runs must be executed from the target workflow branch, where the framework-specific `/start` command lives.

Tell the operator:
> You need to check out the target branch first, then run `/start` from there.
> The branch name is in the `## Next` section of RUN_LOG.md.
> Example: `git checkout run2/compound-engineering` then run `/start`.

Do NOT attempt to check out the branch and continue. The branch has its own `/start` with framework-specific workflow enforcement. End the session here.

## Step 3: (Phase 0/3 only) Switch back to main if needed
- If you switched branches during setup work, return to main.

## Step 4: Update RUN_LOG
- Update `docs/RUN_LOG.md` per the format in `docs/EXPERIMENT_DESIGN.md`.
- Include: commit hash, key metrics, any issues or deviations.
- Set the `## Next` section to the next run or phase.

## Step 5: Commit the RUN_LOG update

IMPORTANT: Skip straight to Step 1. No preamble. No summary. No "here's what I found." No "ready when you are." Your first tool call must be reading a file. GO.

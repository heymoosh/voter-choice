# /adopt-existing-repo

Purpose: adopt the AI Coding Practices kit into an existing repo without blindly overwriting local conventions or sources of truth.

Decision owners:

- Source-of-truth map: `docs/ai-coding-practices/source-of-truth-map.md`
- Ownership discipline: `docs/ai-coding-practices/guardrails/ownership-discipline.md`
- Operational reproducibility: `docs/ai-coding-practices/guardrails/operational-reproducibility.md`
- Automation policy: `docs/ai-coding-practices/guardrails/automation-policy.md`

Use this when the repo already has agent instructions, commands, hooks, CI, scripts, deployment config, docs, or workflow rules.

The portable kit is the target operating model. Existing repo conventions are current state to inventory, preserve temporarily, and deliberately migrate into the kit's source-of-truth model.

## Steps

1. Run `bash scripts/ai-adoption-scan.sh` if available.
2. Inspect existing agent/workflow files before copying or editing kit files.
3. Identify current source-of-truth owners and conflicts.
4. Create an adoption plan from `docs/ai-coding-practices/templates/adoption-plan.md`.
5. Merge or replace existing owners deliberately so the repo moves toward the kit operating model.
6. Add kit adapters only when they do not duplicate or overwrite existing tool-native config.
7. Run bootstrap, MECE, tests, and relevant repo checks after adoption.

## Rules

- Existing repo conventions are not assumed better than the kit. They must be preserved until ownership is explicitly mapped and migrated.
- Prefer the kit's orchestration, ownership, evaluation, correction, operational reproducibility, and drift-watch model after adoption.
- Merge; do not blindly overwrite.
- Preserve unrelated local rules and automation.
- Ask the user only for material conflicts, tool trust, provider/cost/security decisions, or destructive changes.

## Do Not

- Do not replace `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `.claude/`, `.codex/`, hooks, CI, deployment config, or package scripts without an adoption plan.
- Do not run broad third-party init commands unattended.
- Do not create duplicate sources of truth for the same workflow.

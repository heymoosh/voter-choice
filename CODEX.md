# CODEX.md

Codex-specific delta. `AGENTS.md` is the shared contract; read it first if it has not already been loaded by the environment.

## Codex Defaults

- The shared orchestration posture in `docs/ai-coding-practices/guardrails/orchestration-posture.md` applies before Codex-specific preferences.
- For non-trivial work, keep the main Codex session in the orchestrator role unless the user explicitly asks it to execute directly.
- Treat `docs/ai-coding-practices/commands/*.md` as internal command procedures, not native Codex slash commands.
- When the user asks for `/start-work`, `/adopt-existing-repo`, `/groom`, `/work-next`, `/evaluate-work`, `/correct-work`, `/capture`, or `/conformance-review`, read and follow the matching file under `docs/ai-coding-practices/commands/`.
- Repo-local Codex hooks may run preflight automatically when the project `.codex` layer is trusted; still run `bash scripts/ai-preflight.sh` manually if preflight output has not appeared.
- Prefer `rg` / `rg --files` for codebase search.
- Use `apply_patch` for manual edits.
- Preserve unrelated user changes in dirty worktrees.
- Use plans for multi-step work, but do not let planning replace implementation.
- Run focused verification before final response.
- Run ownership audits before execution when the gate in `docs/ai-coding-practices/guardrails/ownership-discipline.md` applies.

## Delegation

Use subagents only when explicitly requested or when the environment policy allows it. Delegate bounded, non-overlapping work only. The main agent remains responsible for routing, integration, and final verification.

## Final Response

Include what changed, files touched, verification run/result, and risks or checks not run.

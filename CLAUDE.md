@AGENTS.md

# CLAUDE.md

Claude Code-specific delta. `AGENTS.md` is the shared contract.

## Claude Code Defaults

- The shared orchestration posture in `docs/ai-coding-practices/guardrails/orchestration-posture.md` applies before Claude-specific preferences.
- Keep this file short. Put task details in work packets, not here.
- For non-trivial work, keep the main Claude session in the orchestrator role unless the user explicitly asks it to execute directly.
- Use subagents for bounded investigation or execution when they can run in isolated context.
- Use Opus/high for orchestration, product judgment, architecture, unclear integration, and review.
- Use Opus/high for ownership audits before execution when the gate in `docs/ai-coding-practices/guardrails/ownership-discipline.md` applies.
- Use Sonnet/medium for bounded implementation with a clear work packet.
- Compact or start a fresh session between unrelated tasks. Do not rely on a multi-day chat as the source of truth.

## Internal Flows

These are internal flows Claude may use. The user does not need to invoke them by name.

Claude Code slash-command adapters live in `.claude/commands/`. They are wrappers only; canonical command procedures live in `docs/ai-coding-practices/commands/`.

- `/start-work` - orient to repo state and route the user's plain-language request.
- `/adopt-existing-repo` - merge this kit into an existing repo without overwriting local sources of truth.
- `/capture` - preserve a later idea in `.ai/inbox/` when the user explicitly wants it remembered.
- `/groom` - interview and route captures/vague requests into the lightest useful artifact.
- `/work-next` - execute one ready work packet.
- `/evaluate-work` - evaluate completed work against intent, evidence, ownership, and acceptance criteria.
- `/correct-work` - retry only named evaluator findings with focused evidence.
- `/conformance-review` - review readiness before demo/release/large merge when the user asks whether something is ready.

## Hooks

Claude hooks may run the scripts in `scripts/`, but hooks must not make product decisions or mutate shared project state.

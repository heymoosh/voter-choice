@AGENTS.md

# CLAUDE.md — Claude Code delta

`AGENTS.md` is the shared contract. Your global `~/.claude/CLAUDE.md` already defines posture,
autonomy, reporting style, and model allocation — don't re-derive them here.

- Keep the main session as orchestrator for non-trivial work; delegate bounded, isolatable work to
  subagents (Sonnet for spec-driven execution; Opus for judgment, integration, review).
- Claude slash-command flows live in `.claude/commands/` (wrappers) → `docs/ai-coding-practices/commands/`
  (procedures). Load a command's doc only when it's invoked.
- Hooks may run `scripts/`, but must not make product decisions or mutate shared project state.
- Compact or start fresh between unrelated tasks; don't rely on a multi-day chat as source of truth.

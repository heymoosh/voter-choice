# Automation Policy

Default to on-demand commands, not scheduled AI routines.

## Good Automation

Use automation when it is:

- deterministic
- read-only
- narrow and high-signal
- mechanically safe and easy to revert
- consuming a real signal that exists today

Examples:

- lint/build/test commands
- CI checks
- secret scanning
- worktree/sibling-session guards
- pre-demo conformance review run manually

## Risky Automation

Avoid automation that:

- writes TRACKER.md
- edits work packets, AC, or project briefs unattended
- opens non-mechanical PRs
- produces reports nobody reads
- duplicates another check
- consumes signals that do not exist yet

## Routine Gate

Before adding a routine, answer:

1. What signal does it consume?
2. Does that signal exist in this repo today?
3. What action will it take?
4. Would I trust that action unattended?
5. Will anyone read the output?
6. Is this cheaper than a work packet plus a test?

If the answer is weak, do not add the routine.

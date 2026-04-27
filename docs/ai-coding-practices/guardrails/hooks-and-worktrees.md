# Hooks And Worktrees

Use hooks for deterministic guardrails, not judgment.

## Keep-Worthy Guardrails

- Session precheck: warn if dirty, behind main, on unexpected branch, or in merge/rebase state.
- Sibling-session lock: block edits when another agent session is active in the same checkout.
- Worktree intent: require `.ai/wt-intent.md` before edits on task branches.
- Destructive command approval: ask before `reset --hard`, force push, branch deletion, or broad file deletion.

## Worktree Intent Template

```md
slug: <kebab-case>
declared_at: <ISO timestamp>
branch: <branch>
ref: TRACKER § <section> — <row or work packet>

<one sentence: what this worktree is doing>
```

## Do Not Use Hooks For

- product decisions
- automatic TRACKER updates
- automatic project brief updates
- session-end narrative summaries
- broad cleanup without user review

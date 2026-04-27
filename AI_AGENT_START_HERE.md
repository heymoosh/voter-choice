# AI Agent Start Here

This repo includes the AI Coding Practices starter kit.

For existing repos with their own agent docs, commands, hooks, CI, scripts, or deployment config, do not copy blindly. Ask an AI agent to run `/adopt-existing-repo` from the existing repo and create an adoption plan before replacing files.

If you are an AI coding agent, do this before coding:

```bash
bash scripts/ai-bootstrap.sh
```

Then follow `AGENTS.md`:

1. Restate the user's intent.
2. State the route: direct edit, capture, work packet, project brief, or answer-only.
3. Ask only questions that materially change implementation, scope, UX, data model, privacy/security, or verification.
4. Re-route after clarification.
5. Implement once intent, scope, and verification are clear enough.
6. Run focused verification and report changed files, results, and risks.

For non-trivial product work, default to `docs/ai-coding-practices/guardrails/orchestration-posture.md`: preserve original intent, handle orchestration/evaluation/correction internally, and bring the user back only for material decisions or final product review.

If you are the human using this kit in a new repo:

```bash
bash scripts/ai-bootstrap.sh
```

Then start Codex or Claude Code and describe what you want in plain language.

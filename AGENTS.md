# AGENTS.md

Root contract for AI coding agents in this repo. Keep this file lean; detailed rules live under `docs/ai-coding-practices/`.

If present, read `AI_AGENT_START_HERE.md` first for session bootstrap.

If you are running in Codex, also read `CODEX.md` for Codex-specific deltas. If you are running in Claude Code, also read `CLAUDE.md` for Claude-specific deltas.

## Project

Voter Choice is a free AI-powered ballot research tool for Texas voters. Users enter their zip code to get election info, then chat with Claude Sonnet to research their ballot. The app also supports a copy/paste fallback when the chat budget is exhausted.

Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, deployed on Vercel.

Production branch: `launch/production`. Pushes to this branch trigger `.github/workflows/deploy.yml` and Vercel deployment.

Key project files:

- `docs/BALLOT_PROMPT.md` - system prompt for ballot research chat
- `docs/PROJECT_SPEC.md` - original project specification
- `docs/LAUNCH_PLAN.md` - MVP launch plan and session breakdown
- `src/data/TX.json` - Texas election data
- `.github/workflows/deploy.yml` - CI/CD pipeline using Bitwarden Secrets Manager and Vercel

## Default Contract

The user may describe what they want in plain language. Do not require them to know commands, task size, work packets, or project briefs.

Before coding, run `bash scripts/ai-bootstrap.sh` if present. For non-trivial product work, follow `docs/ai-coding-practices/guardrails/orchestration-posture.md` and `docs/ai-coding-practices/guardrails/drift-watch.md`.

For non-trivial work, act as orchestrator first: route, clarify, create/update the working doc, delegate bounded execution when useful, and review integration. Do not skip straight to implementation when ownership, scope, or verification needs judgment.

For substantial or delegated work, evaluate before accepting completion, retry routine quality gaps internally, and ask the user only for decisions, scope changes, unresolved ambiguity, or repeated retry failure.

For every request:

1. Restate the intent.
2. State the route: direct edit, capture, work packet, project brief, or answer-only.
3. Ask only questions that materially change implementation, scope, UX, data model, privacy/security, or verification.
4. Re-route after clarification.
5. Implement only when intent, scope, and verification are clear enough.

## Routing

Use the lightest safe path:

- direct edit for tiny obvious changes
- `.ai/inbox/` for later ideas
- `.ai/work-packets/` for behavior-changing or ambiguous execution work
- `.ai/project-briefs/` only for multi-session arcs

Details: `docs/ai-coding-practices/guardrails/request-routing.md`.

## Ownership

Before non-trivial edits, identify the owning concern and avoid parallel sources of truth. Require an ownership audit before execution when the work crosses modules, durable rules, data/state/API/auth/AI/integration behavior, or new abstractions.

Rules: `docs/ai-coding-practices/guardrails/ownership-discipline.md`.

## Work Packets

Do not execute from acceptance criteria alone. Work packets must carry intent, scope, acceptance criteria, verification, and anti-solutions.

Template: `docs/ai-coding-practices/templates/work-packet.md`.
Rules: `docs/ai-coding-practices/guardrails/work-packet-rules.md`.

## Production Safety

- Repo only. Never read/write/delete anything outside this repo unless the user explicitly approves.
- No sudo. No global installs. Local `npm install` is fine.
- No force push, branch deletion, or history rewriting.
- Commit before switching branches. Pull before pushing.
- `rm -rf` only on build artifacts such as `node_modules`, `.next`, `coverage`, or `dist`, and only with exact paths.
- Pin exact versions in `package.json`.
- Never expose API keys to client-side code.
- Never log conversation content.
- Local secrets belong in `.env.local`, which is gitignored.

## Verification

Use focused checks first:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` when browser behavior changes
- `bash scripts/ai-verify.sh` for kit-aware verification routing

## Done

Done means evidence reviewed, checks run or skipped with reason, acceptance criteria verified when present, anti-solutions avoided, ownership constraints preserved, changed files summarized, and risks named.

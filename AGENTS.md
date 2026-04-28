# AGENTS.md

Root contract for AI coding agents in this repo. Detailed rules live under `docs/ai-coding-practices/`.

Read `AI_AGENT_START_HERE.md` first. Codex also reads `CODEX.md`; Claude Code also reads `CLAUDE.md`.

## Project

Voter Choice is a free AI-powered ballot research tool for Texas voters. Users enter their address to get election info, then chat with Claude Sonnet or use a copy/paste fallback.

Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Vercel. Production branch: `launch/production`; pushes trigger `.github/workflows/deploy.yml`.

## Default Contract

Do not require the user to know commands, task size, work packets, or project briefs. Before coding, run `bash scripts/ai-bootstrap.sh` if present.

For non-trivial product work, follow `docs/ai-coding-practices/guardrails/orchestration-posture.md` and `docs/ai-coding-practices/guardrails/drift-watch.md`: route first, preserve original intent, create/update the working doc, delegate bounded work when useful, evaluate before accepting completion, and ask the user only for material decisions or unresolved ambiguity.

For every request:

1. Restate the intent.
2. State the route: direct edit, capture, work packet, project brief, or answer-only.
3. Ask only questions that materially change implementation, scope, UX, data model, privacy/security, or verification.
4. Re-route after clarification.
5. Implement only when intent, scope, and verification are clear enough.

## Routing

Use the lightest safe path: direct edit for tiny obvious changes, `.ai/inbox/` for later ideas, `.ai/work-packets/` for behavior-changing or ambiguous work, and `.ai/project-briefs/` only for multi-session arcs. Details: `docs/ai-coding-practices/guardrails/request-routing.md`.

## Ownership

Before non-trivial edits, identify the owning concern and avoid parallel sources of truth. Require an ownership audit when work crosses modules, durable rules, data/state/API/auth/AI/integration behavior, or new abstractions. Rules: `docs/ai-coding-practices/guardrails/ownership-discipline.md`.

## Work Packets

Do not execute from acceptance criteria alone. Work packets must carry intent, scope, acceptance criteria, verification, and anti-solutions. Template: `docs/ai-coding-practices/templates/work-packet.md`; rules: `docs/ai-coding-practices/guardrails/work-packet-rules.md`.

## Production Safety

- Repo only. Never read/write/delete anything outside this repo unless the user explicitly approves.
- No sudo. No global installs. Local `npm install` is fine.
- No force push, branch deletion, or history rewriting.
- Work only on `launch/production` unless the user explicitly says otherwise. Commit before switching branches. Pull before pushing.
- `rm -rf` only on build artifacts such as `node_modules`, `.next`, `coverage`, or `dist`, and only with exact paths.
- Pin exact versions in `package.json`.
- Never expose API keys to client-side code.
- Never log conversation content.
- Local secrets belong in `.env.local`, which is gitignored.

## Verification

Use focused checks first: `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` when browser behavior changes, and `bash scripts/ai-verify.sh` for kit-aware routing.

## Done

Done means evidence reviewed, checks run or skipped with reason, acceptance criteria verified when present, anti-solutions avoided, ownership constraints preserved, changed files summarized, and risks named.

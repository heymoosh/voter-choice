# TRACKER

## Status

- Production branch: `launch/production`.
- Product: Voter Choice, a Texas ballot research tool built with Next.js, TypeScript, Tailwind CSS, Claude, and Vercel.
- AI Coding Practices adopted as the operating model; current source-of-truth map lives in `docs/ai-coding-practices/source-of-truth-map.md`.
- Deployment CI remains owned by `.github/workflows/deploy.yml`.

## Next

<!-- Agent should add links to ready work packets here when useful. -->

## Active Project Briefs

<!-- Agent should add project brief links only for multi-session arcs. -->

## Blocked / Needs User Decision

- Decide whether to trust/install the kit's Agentic QE MCP adapters in `.claude/mcp.json` and `.codex/config.toml`; they run `npx -y agentic-qe@latest`.

## Follow-Ups

<!-- Useful later, not now. -->

## Current State Pointers

- AI coding practices: `docs/ai-coding-practices/`
- Work packets: `.ai/work-packets/`
- Project briefs: `.ai/project-briefs/`
- Inbox: `.ai/inbox/`
- Product source of truth: `docs/PROJECT_SPEC.md`, `docs/LAUNCH_PLAN.md`, `docs/BALLOT_PROMPT.md`
- Verification commands: `npm run lint`, `npm run test`, `npm run build`, `npm run e2e`, `bash scripts/ai-verify.sh`

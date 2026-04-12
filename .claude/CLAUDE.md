# CLAUDE.md — Voter Choice

## Project
Voter Choice is a free AI-powered ballot research tool for Texas voters. Users enter their zip code to get election info, then chat with Claude Sonnet to research their ballot. The app also supports a copy/paste fallback when the chat budget is exhausted.

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, deployed on Vercel.

**Branch:** `launch/production` is the production branch. Pushes trigger CI/CD → Vercel deploy.

## Key Files
- `docs/BALLOT_PROMPT.md` — system prompt for the ballot research chat
- `docs/PROJECT_SPEC.md` — original project specification
- `docs/LAUNCH_PLAN.md` — MVP launch plan and session breakdown
- `src/data/TX.json` — Texas election data (dates, deadlines, per-election)
- `.github/workflows/deploy.yml` — CI/CD pipeline (Bitwarden SM → Vercel)

## Boundaries
- **Repo only.** Never read/write/delete anything outside this repo.
- **No sudo.** No global installs. Local `npm install` is fine.
- **No force push, no branch deletion, no history rewriting.**
- **Commit before switching branches.** Pull before pushing.
- **`rm -rf` only on build artifacts** (node_modules, .next, coverage, dist) with exact paths.
- Pin exact versions in package.json.
- If anything requires going outside these boundaries, **stop and ask.**

## Code Style
TypeScript. ESLint + Prettier. Tailwind for styling. React Server Components where possible, client components only when needed for interactivity.

## Secrets
- `ANTHROPIC_API_KEY` — pulled from Bitwarden Secrets Manager at deploy time. For local dev, use `.env.local` (gitignored).
- Never expose API keys to client-side code. Never log conversation content.

# AI Coding Practices Adoption Plan

Status: applied
Repo: `/Users/Muxin/Documents/GitHub/voter-choice`
Date: 2026-04-27
Branch: `launch/production`

## Existing Sources

- `.claude/CLAUDE.md` - Claude Code project context, branch/deploy facts, repo boundaries, code style, and secrets policy.
- `.claude/settings.local.json` - local Claude Code permission allowlist. Gitignored and not adopted as shared source of truth.
- `.github/workflows/deploy.yml` - production CI/CD to Vercel, including Bitwarden Secrets Manager integration.
- `package.json` - Node, Next.js, lint, format, test, e2e, build, and measurement scripts.
- `.gitignore` - local/generated artifact ownership.
- `README.md` - previously generic Next.js starter instructions.

## Conflicts

- `AGENTS.md` / root `CLAUDE.md` / `CODEX.md` vs `.claude/CLAUDE.md` - durable agent guidance was nested in a Claude-only file. Migrated shared project and safety rules into root owners and converted `.claude/CLAUDE.md` to a compatibility adapter.
- Kit `.claude/mcp.json` and `.codex/config.toml` vs repo tool-trust posture - both configure `npx -y agentic-qe@latest`. Deferred pending explicit trust decision.
- Kit README vs existing `README.md` - existing README was create-next-app boilerplate. Replaced with project-specific development, verification, deployment, and AI-practices pointers.
- Kit `.gitignore` vs existing `.gitignore` - existing repo ignore rules are broader and project-specific. Merged only `.agentic-qe/`.

## Preserve

- `launch/production` as the production branch.
- `.github/workflows/deploy.yml` as deployment source of truth.
- Existing `package.json` scripts and dependency versions.
- `.claude/settings.local.json` as local, untracked operator configuration.
- Existing production rules: no force push/history rewriting, no global installs, exact destructive paths only, pinned dependency versions, and no client-side secret exposure.

## Add

- Root `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `AI_AGENT_START_HERE.md`, and `TRACKER.md`.
- `.ai/inbox/`, `.ai/project-briefs/`, and `.ai/work-packets/` with `.gitkeep` placeholders.
- `docs/ai-coding-practices/` canonical commands, guardrails, templates, learning notes, and source-of-truth map.
- `scripts/ai-*.sh` guardrail and verification scripts.
- `.githooks/pre-commit` optional pre-commit hook.
- `.claude/commands/` slash-command adapters.

## Merge

- Production project context and boundaries moved from `.claude/CLAUDE.md` into `AGENTS.md`.
- Claude-specific practices moved into root `CLAUDE.md`.
- Codex-specific practices added to root `CODEX.md`.
- Project README now includes AI Coding Practices entrypoints.
- `.gitignore` now ignores `.agentic-qe/` local tool state.

## Do Not Install

- `.claude/mcp.json` and `.codex/config.toml` from the kit are not installed yet because they run `npx -y agentic-qe@latest`, which is a tool trust/security/provider decision.
- The existing deployment workflow is not replaced or generalized.
- Package scripts are not rewritten during adoption.

## Manual Decisions

- Decide whether to trust the Agentic QE MCP adapters from the kit in this repo.
- Decide whether to run `bash scripts/ai-bootstrap.sh`, which changes local git config `core.hooksPath` to `.githooks`.

## Verification

- `bash scripts/ai-adoption-scan.sh`
- `bash scripts/ai-bootstrap.sh` only after hook-path decision or with explicit local acceptance.
- `bash scripts/ai-mece-check.sh`
- `bash scripts/ai-verify.sh`
- `npm run lint`
- `npm run test`
- `npm run build`

## Result

- Kit operating model is installed on `launch/production`.
- Existing production/deployment behavior is preserved.
- Durable agent guidance has a root source of truth.
- Tool-trust adapters and hook-path activation remain explicit decisions.

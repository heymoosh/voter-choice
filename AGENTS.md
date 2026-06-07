# AGENTS.md

Cross-agent contract for **Voter Choice**. Keep this file lean — detail lives under
`docs/ai-coding-practices/` and loads on demand. Claude also reads `CLAUDE.md`; Codex also reads `CODEX.md`.

## Project

Free AI ballot-research tool for Texas voters: enter an address → election info → chat with Claude
(or copy/paste fallback). Next.js 15 App Router · TypeScript · Tailwind · Vercel.
Production branch `launch/production` (push → `.github/workflows/deploy.yml`).

## Production safety (always applies)

- Repo only — no reads/writes/deletes outside this repo without explicit approval.
- No sudo, no global installs (local `npm install` is fine). Pin exact versions in `package.json`.
- No force-push, branch deletion, or history rewriting. Work on `launch/production` unless told
  otherwise. Commit before switching branches; pull before pushing.
- `rm -rf` only on build artifacts (`node_modules`, `.next`, `coverage`, `dist`) with exact paths.
- Never expose API keys to client code. Never log conversation content. Secrets in `.env.local`
  (gitignored). **Production DB writes are gated: back up first + explicit approval.**

## Working trees (pick the right one)

- **Default (95% of work):** `.claude/worktrees/launch-production-federal/` on `launch/production` —
  bug fixes, features, redesign, backlog. Auto-deploys on push.
- **PDF bakeoff (research only):** `.claude/worktrees/pdf-bakeoff/` — never merges to production.

## Posture

Take the lightest safe path; preserve the user's intent; ask only about **material** decisions
(behavior, UX, scope, data model, privacy/security, cost). Decide engineering details yourself.
_(Claude inherits full posture, autonomy, and model allocation from the user's global config;
other agents: `docs/ai-coding-practices/guardrails/orchestration-posture.md`.)_

## Alignment scoring (high-stakes — read the ledger first)

The score **silently inverts** on contested issues if tagging is wrong. Any change to the issue
poles, the bill-tagger, or the concern-resolver MUST run the eval on the `alignment-work` Neon
branch and append the result to `docs/alignment/ALIGNMENT_LEDGER.md` **before merge**. Don't
re-learn what the ledger already records. Method: `docs/alignment/ALIGNMENT_EVAL.md`.

## Verify

`npm run lint` · `npm run test` · `npm run build` · `npm run e2e` (when browser behavior changes).
`bash scripts/ai-bootstrap.sh` before coding if present.

## On demand — load only when the task calls for it

| When you're… | Read |
|---|---|
| routing a request / sizing work | `guardrails/request-routing.md` · `templates/work-packet.md` |
| crossing modules, durable rules, data/auth/AI/integration | `guardrails/ownership-discipline.md` |
| implementing against acceptance criteria | `guardrails/test-driven-development.md` |
| doing UI / component reuse | `docs/design/DESIGN_SURFACE_MAP.md` |
| writing a handoff | `templates/HANDOFF_TEMPLATE.md` (≤20 lines, enforced) |
| running an internal flow (Claude) | `docs/ai-coding-practices/commands/` |

(Guardrail paths are under `docs/ai-coding-practices/`.) **Done** = evidence reviewed, checks run
or skipped-with-reason, acceptance criteria met, changed files summarized, risks named.

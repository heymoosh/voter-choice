# Work Packet: activate-ai-coding-practices-automation

Status: completed
Owner: orchestrator
Branch: launch/production

## Intent

Make the repo's AI Coding Practices workflow usable by default for Codex now and Claude later, while keeping Agentic QE disabled until the pre-live readiness gate.

## Original User Intent

"I agree with not yet on AQE - what should trigger it is before we're ready to go live for real users. 2 - both codex and claude, but yes agree to focus on Codex first. 3 - yes."

## Scope

Touch:

- deploy-blocking format/test drift in current branch
- AI Coding Practices preflight/bootstrap/QE checks
- repo-local Codex adapter marker
- local git hook activation

Do not touch:

- `main`
- Agentic QE MCP package setup
- runtime product behavior or production secrets

## Acceptance Criteria

- `launch/production` remains the active branch.
- `npm run lint`, `npm run test`, `npm run build`, and `bash scripts/ai-verify.sh` pass.
- Preflight treats missing Agentic QE MCP config as intentional unless `.ai/enable-aqe` exists.
- Local git hooks are configured to `.githooks`.

## Verification

- Run focused app checks and repo preflight after edits.
- Confirm `git config --get core.hooksPath` returns `.githooks`.

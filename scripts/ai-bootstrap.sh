#!/usr/bin/env bash
# ai-bootstrap — one-command setup for the AI Coding Practices kit.
# Safe to run repeatedly.

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

info() { printf '[ai-bootstrap] %s\n' "$*"; }
warn() { printf '[ai-bootstrap] warn: %s\n' "$*"; }

if git rev-parse --git-dir >/dev/null 2>&1; then
  git config core.hooksPath .githooks
  info "configured git hooks path: .githooks"
else
  warn "not inside a git repo; run git init before relying on hooks"
fi

for script in scripts/ai-preflight.sh scripts/ai-mece-check.sh scripts/ai-session-lock.sh scripts/ai-worktree-intent.sh scripts/ai-verify.sh scripts/ai-packet-readiness-check.sh scripts/ai-evidence-check.sh scripts/ai-qe-check.sh; do
  [ -f "$script" ] && chmod +x "$script" 2>/dev/null
done

if [ -x scripts/ai-preflight.sh ]; then
  scripts/ai-preflight.sh
else
  warn "scripts/ai-preflight.sh missing or not executable"
fi

info "bootstrap complete"

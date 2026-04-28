#!/usr/bin/env bash
# ai-preflight — portable session-start sanity check for AI coding agents.
# Run before coding when present. It does not mutate project files.

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

warn() { printf '[ai-preflight] warn: %s\n' "$*"; }
info() { printf '[ai-preflight] %s\n' "$*"; }

[ -f AGENTS.md ] || warn "AGENTS.md missing at repo root; agent may not load workflow rules."
[ -f AI_AGENT_START_HERE.md ] || warn "AI_AGENT_START_HERE.md missing; first-run bootstrap guidance may be harder to discover."
[ -f TRACKER.md ] || warn "TRACKER.md missing; create a lean priority index if this repo will use work packets."

[ -f CLAUDE.md ] || warn "CLAUDE.md missing; Claude Code-specific deltas unavailable."
[ -f CODEX.md ] || warn "CODEX.md missing; Codex-specific deltas unavailable."
[ -d .claude/commands ] || warn ".claude/commands missing; Claude slash-command adapters unavailable."
[ -f .codex/config.toml ] || warn ".codex/config.toml missing; Codex preflight hook adapter unavailable."

AQE_REQUIRED_MARKER=".ai/enable-aqe"
if [ -f "$AQE_REQUIRED_MARKER" ]; then
  [ -f .claude/mcp.json ] || warn ".claude/mcp.json missing; Claude Agentic QE MCP adapter unavailable."
else
  info "Agentic QE MCP adapters intentionally disabled until pre-live readiness gate."
fi

for d in .ai .ai/inbox .ai/work-packets .ai/project-briefs; do
  [ -d "$d" ] || warn "$d missing; create it if this repo uses the AI Coding Practices workflow."
done

if git rev-parse --git-dir >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>/dev/null)"
  [ -n "$branch" ] && info "branch: $branch"

  hooks_path="$(git config --get core.hooksPath 2>/dev/null)"
  if [ "$hooks_path" != ".githooks" ]; then
    warn "git hooks are not configured for this kit; run: git config core.hooksPath .githooks"
  fi

  if [ -x scripts/ai-session-lock.sh ]; then
    scripts/ai-session-lock.sh check
  else
    warn "scripts/ai-session-lock.sh is not executable; sibling AI session detection skipped."
  fi

  if ! git diff --quiet --ignore-submodules -- 2>/dev/null || ! git diff --cached --quiet --ignore-submodules -- 2>/dev/null; then
    warn "working tree has uncommitted changes; preserve unrelated user work."
  fi

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    behind="$(git rev-list --count HEAD..@{u} 2>/dev/null)"
    ahead="$(git rev-list --count @{u}..HEAD 2>/dev/null)"
    [ "${behind:-0}" -gt 0 ] && warn "branch is behind upstream by $behind commit(s)."
    [ "${ahead:-0}" -gt 0 ] && warn "branch is ahead of upstream by $ahead commit(s)."
  fi

  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ] || [ -f .git/CHERRY_PICK_HEAD ]; then
    warn "git operation in progress; do not auto-fix without user direction."
  fi
fi

if [ -x scripts/ai-mece-check.sh ]; then
  scripts/ai-mece-check.sh --warn
else
  warn "scripts/ai-mece-check.sh is not executable; structural MECE checks skipped."
fi

if [ -f "$AQE_REQUIRED_MARKER" ] && [ -x scripts/ai-qe-check.sh ]; then
  scripts/ai-qe-check.sh || warn "Agentic QE adapters may be unavailable; evaluators should name this gap if AQE is needed."
fi

info "Default posture: orchestrate non-trivial product work, preserve original intent, and bring the user back only for material decisions or final review."
info "First response should include: Workflow loaded: AGENTS.md + orchestration posture + preflight."
info "Before coding: follow AGENTS.md. Route the request, apply the ownership audit gate when needed, then proceed."
exit 0

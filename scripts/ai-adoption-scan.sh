#!/usr/bin/env bash
# ai-adoption-scan — read-only scan for adopting the kit into an existing repo.
# Usage: scripts/ai-adoption-scan.sh

set +e

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
cd "$ROOT" 2>/dev/null || exit 0

echo "[ai-adoption-scan] existing repo adoption scan"

check_path() {
  path="$1"
  label="$2"
  if [ -e "$path" ]; then
    echo "[ai-adoption-scan] found: $path — $label"
  fi
}

check_path AGENTS.md "universal agent instructions"
check_path CLAUDE.md "Claude Code instructions"
check_path CODEX.md "Codex-specific instructions"
check_path AI_AGENT_START_HERE.md "AI bootstrap doc"
check_path .claude "Claude Code config/commands"
check_path .claude/commands "Claude slash commands"
check_path .claude/mcp.json "Claude MCP config"
check_path .codex "Codex config"
check_path .codex/config.toml "Codex project config"
check_path .githooks "Git hooks path"
check_path .github/workflows "GitHub Actions workflows"
check_path package.json "Node package scripts"
check_path pyproject.toml "Python project config"
check_path Cargo.toml "Rust project config"
check_path go.mod "Go module config"
check_path Dockerfile "container build config"
check_path docker-compose.yml "local orchestration config"
check_path compose.yml "local orchestration config"
check_path vercel.json "Vercel deploy config"
check_path netlify.toml "Netlify deploy config"
check_path railway.toml "Railway deploy config"
check_path fly.toml "Fly deploy config"
check_path terraform "Terraform IaC"
check_path infra "infrastructure directory"
check_path migrations "database migrations"
check_path prisma "Prisma schema/migrations"
check_path drizzle "Drizzle config/migrations"
check_path supabase "Supabase config/migrations"
check_path .env.example "environment template"
check_path Makefile "task runner"
check_path justfile "task runner"

if git rev-parse --git-dir >/dev/null 2>&1; then
  hooks_path="$(git config --get core.hooksPath 2>/dev/null)"
  if [ -n "$hooks_path" ]; then
    echo "[ai-adoption-scan] git core.hooksPath: $hooks_path"
  else
    echo "[ai-adoption-scan] git core.hooksPath: <unset>"
  fi
fi

echo "[ai-adoption-scan] complete; create adoption plan before overwriting existing owners"
exit 0

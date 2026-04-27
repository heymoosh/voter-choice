#!/usr/bin/env bash
# ai-qe-check — best-effort check for Agentic QE adapter availability.
# Usage: scripts/ai-qe-check.sh

set +e

status=0

if [ -f .claude/mcp.json ] && grep -q 'agentic-qe' .claude/mcp.json 2>/dev/null; then
  echo "[ai-qe-check] Claude MCP adapter: configured"
else
  echo "[ai-qe-check] warn: Claude MCP adapter missing or not configured"
  status=1
fi

if [ -f .codex/config.toml ] && grep -q 'mcp_servers.agentic-qe' .codex/config.toml 2>/dev/null; then
  echo "[ai-qe-check] Codex MCP adapter: configured"
else
  echo "[ai-qe-check] warn: Codex MCP adapter missing or not configured"
  status=1
fi

if command -v npx >/dev/null 2>&1; then
  echo "[ai-qe-check] npx: available"
else
  echo "[ai-qe-check] warn: npx unavailable; AQE MCP may not start"
  status=1
fi

exit "$status"

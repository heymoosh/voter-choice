#!/bin/bash
# Run Claude Code in an isolated Docker container
# - Mounts only the voter-choice repo
# - Runs as non-root user "runner"
# - Mounts Claude credentials read-only

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Build the image if needed
echo "Building claude-runner image..."
docker build -t claude-runner "$REPO_DIR/docker"

echo "Starting Claude Code in isolated container..."
echo "  Repo mounted at: /workspace"
echo "  Running as: runner (non-root)"
echo ""

PROMPT="${1:---}"

docker run -it --rm \
  --name claude-runner \
  -v "$REPO_DIR:/workspace" \
  -v "$CLAUDE_DIR:/home/runner/.claude" \
  --network host \
  --ipc=host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  claude-runner \
  claude --dangerously-skip-permissions -p "$PROMPT"

#!/bin/bash
# Run Claude Code in an isolated Docker container
# - Mounts only the voter-choice repo
# - Runs as non-root user "runner"
# - Mounts Claude credentials read-only
# - Masks scoring scripts so workflows cannot read the rubric
#
# Scoring isolation (see docs/LEARNINGS.md → Learning 009):
# The `scoring/` directory on main contains the measurement and
# adherence-analysis code. If the workflow can read those files during
# a build, it learns exactly what metrics and thresholds it will be
# scored on, which enables gaming. The path is masked with an empty
# tmpfs overlay so the container sees it as an empty directory
# regardless of what actually exists on the host branch.
#
# Legacy note: Runs 1-3 (branches workflow/*, run2/*, run3/*) have
# scoring scripts baked into their `scripts/` directory because they
# were created before the scoring isolation fix. Those branches are
# permanently contaminated. Re-runs of those workflows must be done on
# new branches (run4/*, run5/*, etc.) created from a post-fix main
# commit where `scripts/` is empty on the scaffold.

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Build the image if needed
echo "Building claude-runner image..."
docker build -t claude-runner "$REPO_DIR/docker"

echo "Starting Claude Code in isolated container..."
echo "  Repo mounted at: /workspace"
echo "  Running as:      runner (non-root)"
echo "  Scoring masked:  /workspace/scoring (tmpfs)"
echo ""

PROMPT="${1:---}"

docker run -it --rm \
  --name claude-runner \
  -v "$REPO_DIR:/workspace" \
  -v "$CLAUDE_DIR:/home/runner/.claude" \
  --tmpfs /workspace/scoring:rw,size=1m \
  --network host \
  --ipc=host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  claude-runner \
  claude --dangerously-skip-permissions -p "$PROMPT"

#!/bin/bash
# Run the full measurement suite inside the Playwright Docker container.
# This is required because Lighthouse and Playwright e2e need Chrome,
# which requires system libraries only present in the Playwright image.
#
# Usage: bash docker/run-measure.sh [--output path/to/output.json]

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Build the image if needed
echo "Building claude-runner image..."
docker build -q -t claude-runner "$REPO_DIR/docker"

echo "Running full measurement suite in Playwright container..."
echo ""

docker run --rm \
  -v "$REPO_DIR:/workspace" \
  --network host \
  --ipc=host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -w /workspace \
  claude-runner \
  bash -c "npm install --silent 2>/dev/null && node scripts/measure.mjs $*"

#!/usr/bin/env bash
# ai-tdd-red — verify the red phase of a TDD cycle.
#
# Usage: scripts/ai-tdd-red.sh <test-file>
#
# Runs the named test file under vitest and inverts the success contract:
#   - if at least one test FAILS: prints the failure output, prints
#     "[ai-tdd-red] confirmed RED — proceed to implementation", exits 0.
#   - if all tests PASS: prints
#     "[ai-tdd-red] ERROR: test passed without implementation. Your test
#     isn't testing the thing you think it is." and exits 1.
#   - if vitest collects no tests for the given path: treats that as an
#     error (not a red phase) and exits 1 with a distinct message — a worker
#     skipping the red phase via a misnamed path shouldn't pass the gate.
#
# Environment:
#   VITEST_CONFIG  Optional path to a vitest config file. The self-tests at
#                  scripts/ai-tdd-red.test.sh set this so they can sandbox
#                  fixtures outside the project's normal include glob.
#                  Production callers should leave it unset; the project's
#                  vitest.config.ts already covers src/**/*.test.ts.
#
# See docs/testing.md.

set -u

if [ -z "${1:-}" ]; then
  echo "usage: scripts/ai-tdd-red.sh <test-file>"
  exit 1
fi

TEST_FILE="$1"

VITEST_ARGS=(run)
if [ -n "${VITEST_CONFIG:-}" ]; then
  VITEST_ARGS+=(--config "$VITEST_CONFIG")
fi
VITEST_ARGS+=("$TEST_FILE")

# Run vitest and capture stdout+stderr together. Use npx so we depend only
# on the locally installed binary, and bypass `npm run test` to avoid the
# project's `pretest` hook (sync:ballot-prompt) which adds latency and is
# unrelated to the red phase.
output="$(npx vitest "${VITEST_ARGS[@]}" 2>&1)"
vitest_rc=$?

# Always echo the captured output so workers can paste it into evidence,
# regardless of which branch we take below.
echo "$output"

# Order of checks is load-bearing:
#   1. "No test files found" can co-occur with a non-zero exit; if we
#      treated that as a failure indicator we'd green-light an empty file.
#   2. Otherwise, vitest exit 0 means everything passed → not a real red phase.
#   3. A non-zero exit with no "no tests" signal means at least one test
#      failed (or threw during collection / setup), which is what we want.
if echo "$output" | grep -qE "No test files found|no tests"; then
  echo "[ai-tdd-red] ERROR: vitest collected no tests for '$TEST_FILE'. Check the path and the vitest include glob."
  exit 1
fi

if [ "$vitest_rc" -eq 0 ]; then
  echo "[ai-tdd-red] ERROR: test passed without implementation. Your test isn't testing the thing you think it is."
  exit 1
fi

echo "[ai-tdd-red] confirmed RED — proceed to implementation"
exit 0

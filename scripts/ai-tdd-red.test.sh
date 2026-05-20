#!/usr/bin/env bash
# ai-tdd-red.test.sh — bash self-tests for scripts/ai-tdd-red.sh.
#
# Covers three behaviors required by the work packet
# (.ai/work-packets/tdd-phase-1-core-discipline.md, Test Plan section):
#   1. given a fixture test file with all-passing tests:
#      expect exit 1 + the "isn't testing" message
#   2. given a fixture test file with at least one failing test:
#      expect exit 0 + failure output in stdout
#   3. given no arguments:
#      expect exit 1 + usage message
#
# Approach: each case isolates its fixture inside a mktemp'd directory under
# /tmp, drops a tiny vitest config there with `include` pointing at the
# fixture, symlinks the project's node_modules so `vitest/config` resolves,
# then invokes the production script with VITEST_CONFIG set to that config.
# A trap on EXIT removes every temp dir created during the run.
#
# Run from anywhere; the script resolves the project root via git.

set -u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT" ]; then
  echo "[ai-tdd-red.test] ERROR: must run inside the voter-choice repo"
  exit 1
fi

SCRIPT="$ROOT/scripts/ai-tdd-red.sh"

TMP_DIRS=()

cleanup() {
  for d in "${TMP_DIRS[@]:-}"; do
    [ -n "$d" ] && [ -d "$d" ] && rm -rf "$d"
  done
}
trap cleanup EXIT

# Track pass/fail across cases without bailing on the first failure.
PASSES=0
FAILS=0

assert() {
  local label="$1"
  local condition="$2"
  if [ "$condition" = "true" ]; then
    echo "  [PASS] $label"
    PASSES=$((PASSES + 1))
  else
    echo "  [FAIL] $label"
    FAILS=$((FAILS + 1))
  fi
}

# make_fixture_dir <kind>
#   kind: passing|failing
#   echoes the absolute path to the fixture .test.ts file on stdout.
#   sets up:
#     <tmpdir>/fixture.test.ts
#     <tmpdir>/vitest.config.mjs (include pointed at fixture)
#     <tmpdir>/node_modules -> <project>/node_modules (symlink)
make_fixture_dir() {
  local kind="$1"
  local dir
  dir="$(mktemp -d -t ai-tdd-red-test.XXXXXX)"
  TMP_DIRS+=("$dir")

  if [ "$kind" = "passing" ]; then
    cat > "$dir/fixture.test.ts" <<'EOF_TEST'
import { describe, it, expect } from "vitest";
describe("ai-tdd-red passing fixture", () => {
  it("arithmetic holds", () => {
    expect(1 + 1).toBe(2);
  });
});
EOF_TEST
  else
    cat > "$dir/fixture.test.ts" <<'EOF_TEST'
import { describe, it, expect } from "vitest";
describe("ai-tdd-red failing fixture", () => {
  it("intentionally fails to simulate the red phase", () => {
    expect(1 + 1).toBe(3);
  });
});
EOF_TEST
  fi

  cat > "$dir/vitest.config.mjs" <<EOF_CONFIG
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["$dir/fixture.test.ts"],
    globals: true,
    environment: "node",
  },
});
EOF_CONFIG

  ln -s "$ROOT/node_modules" "$dir/node_modules"

  echo "$dir/fixture.test.ts"
}

# config_for <fixture-file>
#   echoes the matching vitest config path.
config_for() {
  local fixture="$1"
  echo "${fixture%/fixture.test.ts}/vitest.config.mjs"
}

run_script() {
  local fixture="$1"
  local config
  config="$(config_for "$fixture")"
  VITEST_CONFIG="$config" bash "$SCRIPT" "$fixture"
}

echo "[ai-tdd-red.test] script under test: $SCRIPT"
echo "[ai-tdd-red.test] project root: $ROOT"
echo

# ----------------------------------------------------------------------
# Case 1: all-passing fixture → expect exit 1 + "isn't testing" message
# ----------------------------------------------------------------------
echo "[ai-tdd-red.test] case 1: all-passing fixture"
fixture="$(make_fixture_dir passing)"
out="$(run_script "$fixture" 2>&1)"
rc=$?
echo "  vitest exit code from script: $rc"
echo "  --- captured output (last 5 lines) ---"
echo "$out" | tail -5 | sed 's/^/    /'
echo "  --- end output ---"
[ "$rc" -eq 1 ] && c1_exit=true || c1_exit=false
echo "$out" | grep -qi "isn't testing" && c1_msg=true || c1_msg=false
assert "exits 1 when all tests pass" "$c1_exit"
assert "stdout contains \"isn't testing\" message" "$c1_msg"
echo

# ----------------------------------------------------------------------
# Case 2: failing fixture → expect exit 0 + failure output in stdout
# ----------------------------------------------------------------------
echo "[ai-tdd-red.test] case 2: failing fixture"
fixture="$(make_fixture_dir failing)"
out="$(run_script "$fixture" 2>&1)"
rc=$?
echo "  vitest exit code from script: $rc"
echo "  --- captured output (last 5 lines) ---"
echo "$out" | tail -5 | sed 's/^/    /'
echo "  --- end output ---"
[ "$rc" -eq 0 ] && c2_exit=true || c2_exit=false
echo "$out" | grep -qi "confirmed RED" && c2_msg=true || c2_msg=false
echo "$out" | grep -qE "FAIL|✗|AssertionError" && c2_fail=true || c2_fail=false
assert "exits 0 when at least one test fails" "$c2_exit"
assert "stdout contains \"confirmed RED\" marker" "$c2_msg"
assert "stdout includes vitest failure output" "$c2_fail"
echo

# ----------------------------------------------------------------------
# Case 3: no arguments → expect exit 1 + usage message
# ----------------------------------------------------------------------
echo "[ai-tdd-red.test] case 3: no arguments"
out="$(bash "$SCRIPT" 2>&1)"
rc=$?
echo "  exit code: $rc"
echo "  output: $out"
[ "$rc" -eq 1 ] && c3_exit=true || c3_exit=false
echo "$out" | grep -qi "usage" && c3_msg=true || c3_msg=false
assert "exits 1 when called with no args" "$c3_exit"
assert "stdout contains usage message" "$c3_msg"
echo

# ----------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------
echo "[ai-tdd-red.test] summary: $PASSES passed, $FAILS failed"
if [ "$FAILS" -gt 0 ]; then
  echo "[ai-tdd-red.test] FAILED"
  exit 1
fi
echo "[ai-tdd-red.test] OK"
exit 0

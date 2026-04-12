#!/usr/bin/env node

/**
 * Post-hoc process adherence analysis for Phase 3.
 *
 * Verifies that frameworks were actually exercised at the process level,
 * not just at the artifact level. Runs against a specific branch.
 *
 * This script lives in `scoring/` on `main` only. It is intentionally
 * NOT present on workflow branches and NOT mounted into the build
 * container. Hermes invokes it from a host-side main worktree pointed
 * at the target branch worktree via --repo. Workflows must never read
 * this file — it enumerates the exact checks being run against their
 * commit history and would enable gaming of TDD scores, workflow-log
 * completeness, and commit-pattern analysis.
 *
 * Usage: node /path/to/main/scoring/analyze-adherence.mjs --repo /path/to/branch-worktree [branch-name]
 *
 * If --repo is omitted, process.cwd() is used.
 * If no branch name is passed, analyzes the current branch in --repo.
 *
 * Checks:
 * 1. TDD compliance: test files committed before corresponding implementation
 * 2. Commit pattern analysis: test-related vs. implementation-only commits
 * 3. Workflow log completeness: all expected steps present and completed
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

// ROOT is the target repository being analyzed, NOT the location of
// this script. Hermes passes --repo when invoking from outside.
let ROOT = process.cwd();
const argvSlice = process.argv.slice(2);
const repoIdx = argvSlice.indexOf("--repo");
if (repoIdx !== -1 && argvSlice[repoIdx + 1]) {
  ROOT = resolve(argvSlice[repoIdx + 1]);
}

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8", timeout: 30000 });
  } catch (err) {
    return err.stdout || "";
  }
}

// ------------------------------------------------------------------
// 1. TDD Compliance — test files vs. implementation files
// ------------------------------------------------------------------
function analyzeTDD(branch) {
  console.log("\n=== TDD Compliance ===");

  // Get all commits on the branch since v0-scaffold
  const log = run(
    `git log v0-scaffold..${branch} --name-only --pretty=format:"COMMIT:%H|%s" -- "src/**"`,
  );

  const commits = [];
  let current = null;

  for (const line of log.split("\n")) {
    if (line.startsWith("COMMIT:")) {
      if (current) commits.push(current);
      const [hash, ...msgParts] = line.replace("COMMIT:", "").split("|");
      current = { hash, message: msgParts.join("|"), files: [] };
    } else if (line.trim() && current) {
      current.files.push(line.trim());
    }
  }
  if (current) commits.push(current);

  // Classify commits
  let testOnlyCommits = 0;
  let implOnlyCommits = 0;
  let mixedCommits = 0;
  let testFiles = new Set();
  let implFiles = new Set();

  for (const commit of commits) {
    const tests = commit.files.filter(
      (f) => f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/),
    );
    const impls = commit.files.filter(
      (f) =>
        f.match(/\.(ts|tsx|js|jsx)$/) &&
        !f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/),
    );

    if (tests.length > 0 && impls.length === 0) testOnlyCommits++;
    else if (tests.length === 0 && impls.length > 0) implOnlyCommits++;
    else if (tests.length > 0 && impls.length > 0) mixedCommits++;

    tests.forEach((f) => testFiles.add(f));
    impls.forEach((f) => implFiles.add(f));
  }

  // Check if test files appeared in earlier commits than their impl counterparts
  let tddOrderCorrect = 0;
  let tddOrderViolated = 0;
  let tddUnchecked = 0;
  let tddNeutral = 0; // test + impl in same commit (neither correct nor violated)

  for (const tf of testFiles) {
    // Derive the likely implementation file
    const implFile = tf.replace(/\.test\./, ".").replace(/\.spec\./, ".");

    if (!implFiles.has(implFile)) {
      tddUnchecked++;
      continue;
    }

    // Find first commit containing each
    const testFirstCommit = commits.findIndex((c) => c.files.includes(tf));
    const implFirstCommit = commits.findIndex((c) =>
      c.files.includes(implFile),
    );

    if (testFirstCommit === -1 || implFirstCommit === -1) {
      tddUnchecked++;
      continue;
    }

    // Note: commits are in reverse chronological order (newest first)
    // So a higher index means an earlier commit
    if (testFirstCommit === implFirstCommit) {
      // Test and impl first appeared in the same commit — neither TDD nor
      // violation. Common with mixed commits (frameworks that don't enforce
      // strict RED→GREEN ordering).
      tddNeutral++;
    } else if (testFirstCommit > implFirstCommit) {
      // testFirstCommit has higher index = earlier commit (reverse chrono)
      // → test was committed before impl = correct TDD order
      tddOrderCorrect++;
    } else {
      tddOrderViolated++;
    }
  }

  // TDD score: correct / (correct + violated). Neutral commits are excluded
  // from the score (they don't demonstrate TDD but don't violate it either).
  // If ALL test files are neutral/unchecked, tddScore is null (can't assess).
  const tddAssessable = tddOrderCorrect + tddOrderViolated;
  const result = {
    totalCommitsInSrc: commits.length,
    testOnlyCommits,
    implOnlyCommits,
    mixedCommits,
    uniqueTestFiles: testFiles.size,
    uniqueImplFiles: implFiles.size,
    tddOrderCorrect,
    tddOrderViolated,
    tddNeutral,
    tddUnchecked,
    tddScore:
      tddAssessable > 0
        ? Math.round((tddOrderCorrect / tddAssessable) * 100)
        : null,
    tddCoverage:
      testFiles.size > 0
        ? Math.round(
            ((tddOrderCorrect + tddOrderViolated + tddNeutral) /
              testFiles.size) *
              100,
          )
        : null,
  };

  console.log(`  Commits in src/: ${result.totalCommitsInSrc}`);
  console.log(
    `  Test-only: ${testOnlyCommits}, Impl-only: ${implOnlyCommits}, Mixed: ${mixedCommits}`,
  );
  console.log(`  Test files: ${testFiles.size}, Impl files: ${implFiles.size}`);
  console.log(
    `  TDD order: ${tddOrderCorrect} correct, ${tddOrderViolated} violated, ${tddNeutral} neutral (same commit), ${tddUnchecked} unchecked`,
  );
  if (result.tddScore != null) {
    console.log(`  TDD score: ${result.tddScore}%`);
  } else {
    console.log(
      `  TDD score: N/A (no assessable test/impl pairs — ${tddNeutral} neutral, ${tddUnchecked} unchecked)`,
    );
  }
  if (result.tddCoverage != null) {
    console.log(`  TDD coverage: ${result.tddCoverage}% of test files assessable`);
  }

  return result;
}

// ------------------------------------------------------------------
// 2. Workflow Log Completeness
// ------------------------------------------------------------------
function analyzeWorkflowLog(branch) {
  console.log("\n=== Workflow Log Completeness ===");

  // Expected steps per framework
  const expectedSteps = {
    superpowers: [
      "brainstorming",
      "writing-plans",
      "executing-plans",
      "requesting-code-review",
      "verification-before-completion",
      "finishing-a-development-branch",
    ],
    "compound-engineering": ["lfg"],
    "spec-kit": [
      "speckit.constitution",
      "speckit.specify",
      "speckit.clarify",
      "speckit.plan",
      "speckit.tasks",
      "speckit.checklist",
      "speckit.analyze",
      "speckit.implement",
    ],
    bmad: [
      "bmad:brainstorming",
      "bmad:product-brief",
      "bmad:prd",
      "bmad:ux-design",
      "bmad:architecture",
      "bmad:epics-and-stories",
      "bmad:implementation-readiness",
      "bmad:sprint-planning",
      "bmad:story-implementation",
      "bmad:code-review",
    ],
    vanilla: ["vanilla-build"],
  };

  // Detect framework from branch name
  let framework = null;
  for (const key of Object.keys(expectedSteps)) {
    if (branch.includes(key)) {
      framework = key;
      break;
    }
  }

  if (!framework) {
    console.log(`  Could not detect framework from branch: ${branch}`);
    return { framework: null, expected: [], completed: [], missing: [] };
  }

  // Read workflow log from the branch
  let logContent;
  try {
    logContent = run(
      `git show ${branch}:metrics/workflow-log.jsonl 2>/dev/null`,
    );
  } catch {
    logContent = "";
  }

  if (!logContent.trim()) {
    console.log(`  No workflow-log.jsonl found on ${branch}`);
    return {
      framework,
      expected: expectedSteps[framework],
      completed: [],
      missing: expectedSteps[framework],
    };
  }

  const entries = logContent
    .trim()
    .split("\n")
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const completedSteps = entries
    .filter((e) => e.status === "completed")
    .map((e) => e.step);

  const expected = expectedSteps[framework];
  const missing = expected.filter((s) => !completedSteps.includes(s));

  console.log(`  Framework: ${framework}`);
  console.log(`  Expected steps: ${expected.length}`);
  console.log(`  Completed steps: ${completedSteps.length}`);
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(", ")}`);
  } else {
    console.log(`  All expected steps completed`);
  }

  return { framework, expected, completed: completedSteps, missing };
}

// ------------------------------------------------------------------
// 3. Build Statistics
// ------------------------------------------------------------------
function analyzeBuildStats(branch) {
  console.log("\n=== Build Statistics ===");

  const commitCount = run(
    `git rev-list --count v0-scaffold..${branch}`,
  ).trim();
  const diffStat = run(
    `git diff --shortstat v0-scaffold..${branch}`,
  ).trim();

  console.log(`  Commits since scaffold: ${commitCount}`);
  console.log(`  Changes: ${diffStat}`);

  return { commitCount: parseInt(commitCount) || 0, diffStat };
}

// ------------------------------------------------------------------
// 4. Timing Validation — build_start and build_end in timing.jsonl
// ------------------------------------------------------------------
function analyzeTimingLog(branch) {
  console.log("\n=== Timing Log Validation ===");

  let logContent;
  try {
    logContent = run(
      `git show ${branch}:metrics/timing.jsonl 2>/dev/null`,
    );
  } catch {
    logContent = "";
  }

  if (!logContent.trim()) {
    console.log("  FAIL: metrics/timing.jsonl not found on branch");
    return {
      exists: false,
      hasStart: false,
      hasEnd: false,
      model: null,
      durationMinutes: null,
    };
  }

  const entries = logContent
    .trim()
    .split("\n")
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const startEntry = entries.find((e) => e.event === "build_start");
  const endEntry = entries.find((e) => e.event === "build_end");

  const hasStart = !!startEntry;
  const hasEnd = !!endEntry;
  const model = startEntry?.model || null;

  let durationMinutes = null;
  if (hasStart && hasEnd && startEntry.timestamp && endEntry.timestamp) {
    const startMs = new Date(startEntry.timestamp).getTime();
    const endMs = new Date(endEntry.timestamp).getTime();
    if (!isNaN(startMs) && !isNaN(endMs)) {
      durationMinutes = Math.round((endMs - startMs) / 60000);
    }
  }

  console.log(`  timing.jsonl: ${entries.length} entries`);
  console.log(`  build_start: ${hasStart ? "PASS" : "FAIL"}`);
  console.log(`  build_end: ${hasEnd ? "PASS" : "FAIL"}`);
  if (model) console.log(`  Model: ${model}`);
  if (durationMinutes != null)
    console.log(`  Duration: ~${durationMinutes} minutes`);

  return { exists: true, hasStart, hasEnd, model, durationMinutes };
}

// ------------------------------------------------------------------
// 5. Measurement JSON Completeness
// ------------------------------------------------------------------
function analyzeMeasurementJSON(branch) {
  console.log("\n=== Measurement JSON Completeness ===");

  // Look for measurement JSON files on the branch
  let fileList;
  try {
    fileList = run(
      `git ls-tree --name-only ${branch} metrics/ 2>/dev/null`,
    );
  } catch {
    fileList = "";
  }

  const jsonFiles = fileList
    .trim()
    .split("\n")
    .filter((f) => f.endsWith(".json") && !f.includes("adherence"));

  if (jsonFiles.length === 0) {
    console.log("  FAIL: no measurement JSON files found in metrics/");
    return { exists: false, fields: {}, missing: [] };
  }

  // Read the latest measurement JSON
  const latestFile = `metrics/${jsonFiles[jsonFiles.length - 1]}`;
  let content;
  try {
    content = run(`git show ${branch}:${latestFile} 2>/dev/null`);
  } catch {
    content = "";
  }

  if (!content.trim()) {
    console.log(`  FAIL: could not read ${latestFile}`);
    return { exists: false, fields: {}, missing: [] };
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch {
    console.log(`  FAIL: ${latestFile} is not valid JSON`);
    return { exists: false, fields: {}, missing: [] };
  }

  // Required fields per EXPERIMENT_DESIGN.md metrics
  const requiredFields = [
    "eslintErrors",
    "eslintWarnings",
    "e2eTotal",
    "e2ePassed",
    "vitestTotal",
    "vitestPassed",
    "duplication",
    "bundleSize",
    "loc",
  ];

  const fields = {};
  const missing = [];
  for (const field of requiredFields) {
    if (field in data) {
      fields[field] = data[field];
    } else {
      missing.push(field);
    }
  }

  console.log(`  File: ${latestFile}`);
  console.log(`  Fields present: ${Object.keys(fields).length}/${requiredFields.length}`);
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(", ")}`);
  } else {
    console.log(`  All required fields present`);
  }

  return { exists: true, file: latestFile, fields, missing };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
function main() {
  // Parse positional branch arg, skipping over --repo <path> if present.
  const positionals = [];
  for (let i = 0; i < argvSlice.length; i++) {
    if (argvSlice[i] === "--repo") {
      i++; // skip value
      continue;
    }
    positionals.push(argvSlice[i]);
  }
  const branch = positionals[0] || run("git branch --show-current").trim();

  console.log(`Adherence Analysis for: ${branch}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      branch,
    },
    tdd: analyzeTDD(branch),
    workflowLog: analyzeWorkflowLog(branch),
    buildStats: analyzeBuildStats(branch),
    timing: analyzeTimingLog(branch),
    measurement: analyzeMeasurementJSON(branch),
  };

  // Save report
  const outDir = join(ROOT, "metrics", "adherence");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const safeBranch = branch.replace(/\//g, "-");
  const outPath = join(outDir, `${safeBranch}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n=== Report saved to ${outPath} ===`);
}

main();

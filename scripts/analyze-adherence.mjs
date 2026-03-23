#!/usr/bin/env node

/**
 * Post-hoc process adherence analysis for Phase 3.
 *
 * Verifies that frameworks were actually exercised at the process level,
 * not just at the artifact level. Runs against a specific branch.
 *
 * Usage: node scripts/analyze-adherence.mjs [branch-name]
 *
 * If no branch is specified, analyzes the current branch.
 *
 * Checks:
 * 1. TDD compliance: test files committed before corresponding implementation
 * 2. Commit pattern analysis: test-related vs. implementation-only commits
 * 3. Workflow log completeness: all expected steps present and completed
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

  for (const tf of testFiles) {
    // Derive the likely implementation file
    const implFile = tf
      .replace(/\.test\./, ".")
      .replace(/\.spec\./, ".");

    if (!implFiles.has(implFile)) {
      tddUnchecked++;
      continue;
    }

    // Find first commit containing each
    const testFirstCommit = commits.findIndex((c) => c.files.includes(tf));
    const implFirstCommit = commits.findIndex((c) =>
      c.files.includes(implFile),
    );

    // Note: commits are in reverse chronological order (newest first)
    // So a higher index means an earlier commit
    if (testFirstCommit >= implFirstCommit) {
      tddOrderCorrect++;
    } else {
      tddOrderViolated++;
    }
  }

  const result = {
    totalCommitsInSrc: commits.length,
    testOnlyCommits,
    implOnlyCommits,
    mixedCommits,
    uniqueTestFiles: testFiles.size,
    uniqueImplFiles: implFiles.size,
    tddOrderCorrect,
    tddOrderViolated,
    tddUnchecked,
    tddScore:
      tddOrderCorrect + tddOrderViolated > 0
        ? Math.round(
            (tddOrderCorrect / (tddOrderCorrect + tddOrderViolated)) * 100,
          )
        : null,
  };

  console.log(`  Commits in src/: ${result.totalCommitsInSrc}`);
  console.log(
    `  Test-only: ${testOnlyCommits}, Impl-only: ${implOnlyCommits}, Mixed: ${mixedCommits}`,
  );
  console.log(`  Test files: ${testFiles.size}, Impl files: ${implFiles.size}`);
  console.log(
    `  TDD order: ${tddOrderCorrect} correct, ${tddOrderViolated} violated, ${tddUnchecked} unchecked`,
  );
  if (result.tddScore != null) {
    console.log(`  TDD score: ${result.tddScore}%`);
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
// Main
// ------------------------------------------------------------------
function main() {
  const branch = process.argv[2] || run("git branch --show-current").trim();

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

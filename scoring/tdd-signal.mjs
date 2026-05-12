#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const framework = argValue("--framework");
const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();

if (!framework) {
  console.error("Usage: node scoring/tdd-signal.mjs --framework <framework> [--repo <path>]");
  process.exit(2);
}

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function branchExists(branch) {
  return run(`git rev-parse --verify ${branch}`) !== "";
}

function isTestFile(file) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);
}

function isImplFile(file) {
  return file.startsWith("src/") && !isTestFile(file);
}

const candidateBranches = [
  `experiment/${framework}-r1`,
  `experiment/${framework}-r2`,
  `experiment/${framework}-r3`,
  `experiment/${framework}`,
];
const branches = candidateBranches.filter(branchExists);

const commitClassification = {
  "test-first": 0,
  "test-with": 0,
  "impl-only": 0,
  other: 0,
};

for (const branch of branches) {
  const commits = run(`git log --format=%H ${branch}`)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const commit of commits) {
    const addedFiles = run(`git show --diff-filter=A --name-only --pretty=format: ${commit}`)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const hasTest = addedFiles.some(isTestFile);
    const hasImpl = addedFiles.some(isImplFile);

    if (hasTest && !hasImpl) {
      commitClassification["test-first"] += 1;
    } else if (hasTest && hasImpl) {
      commitClassification["test-with"] += 1;
    } else if (!hasTest && hasImpl) {
      commitClassification["impl-only"] += 1;
    } else {
      commitClassification.other += 1;
    }
  }
}

const classifiedTotal = Object.values(commitClassification).reduce(
  (sum, count) => sum + count,
  0,
);
const testFirstPresent = commitClassification["test-first"] > 0;
const testFirstFraction =
  classifiedTotal > 0
    ? Math.round((commitClassification["test-first"] / classifiedTotal) * 1000) / 1000
    : 0;

const output = {
  framework,
  branches,
  commitClassification,
  testFirstPresent,
  testFirstFraction,
  caveat:
    "Commits mix test+impl; binary signal only. Quantitative TDD score not recoverable.",
};

const outputPath = join(ROOT, "metrics", `${framework}-tdd-signal.json`);
if (!existsSync(join(ROOT, "metrics"))) {
  mkdirSync(join(ROOT, "metrics"), { recursive: true });
}
writeFileSync(outputPath, JSON.stringify(output, null, 2));
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

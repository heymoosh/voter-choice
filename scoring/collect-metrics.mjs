#!/usr/bin/env node
/**
 * collect-metrics.mjs
 *
 * Extracts per-phase metric files from experiment branches onto the working
 * tree so aggregate-experiment.mjs can read them from a single checkout.
 *
 * For each framework:
 *   - Phase 1: pulls phase1.json from all three replicates (r1, r2, r3)
 *   - Phases 2–6 + deltas: pulls from the chosen representative replicate
 *
 * Usage: node scoring/collect-metrics.mjs --repo <path>
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const repoIdx = args.indexOf("--repo");
const ROOT = repoIdx !== -1 ? args[repoIdx + 1] : process.cwd();

const FRAMEWORKS = ["vanilla", "bmad", "spec-kit", "superpowers", "compound-engineering"];
const REPLICATES = ["r1", "r2", "r3"];

function gitShow(ref, filePath) {
  try {
    return execSync(`git -C "${ROOT}" show "${ref}:${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeIfMissing(destPath, content) {
  if (!content) return false;
  ensureDir(destPath.replace(/\/[^/]+$/, ""));
  writeFileSync(destPath, content, "utf-8");
  return true;
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

let collected = 0;
let missing = 0;

for (const fw of FRAMEWORKS) {
  console.log(`\n── ${fw}`);

  // Phase 1 for all 3 replicates
  for (const r of REPLICATES) {
    const branch = `experiment/${fw}-${r}`;
    const srcPath = `metrics/experiment/${fw}-${r}/phase1.json`;
    const destPath = join(ROOT, "metrics", "experiment", `${fw}-${r}`, "phase1.json");

    if (existsSync(destPath)) {
      console.log(`  [skip] ${fw}-${r}/phase1.json (already present)`);
      continue;
    }

    const content = gitShow(branch, srcPath);
    if (writeIfMissing(destPath, content)) {
      console.log(`  [ok]   ${fw}-${r}/phase1.json`);
      collected++;
    } else {
      console.log(`  [miss] ${fw}-${r}/phase1.json (not found on ${branch})`);
      missing++;
    }
  }

  // Chosen representative replicate
  const repPath = join(ROOT, "metrics", "experiment", `${fw}-representative.json`);
  const rep = readJson(repPath);
  if (!rep?.chosen) {
    console.log(`  [skip] no representative.json for ${fw}`);
    continue;
  }
  const chosen = rep.chosen; // e.g. "r1"
  const branch = `experiment/${fw}-${chosen}`;
  console.log(`  representative: ${chosen} (branch ${branch})`);

  // Phases 2–6
  for (let phase = 2; phase <= 6; phase++) {
    const srcPath = `metrics/experiment/${fw}-${chosen}/phase${phase}.json`;
    const destPath = join(ROOT, "metrics", "experiment", `${fw}-${chosen}`, `phase${phase}.json`);

    if (existsSync(destPath)) {
      console.log(`  [skip] ${fw}-${chosen}/phase${phase}.json (already present)`);
      continue;
    }

    const content = gitShow(branch, srcPath);
    if (writeIfMissing(destPath, content)) {
      console.log(`  [ok]   ${fw}-${chosen}/phase${phase}.json`);
      collected++;
    } else {
      console.log(`  [miss] ${fw}-${chosen}/phase${phase}.json`);
      missing++;
    }
  }

  // Delta files (phase N-1 → N) for phases 2–6
  for (let phase = 2; phase <= 6; phase++) {
    const from = phase - 1;
    const srcPath = `metrics/experiment/${fw}-${chosen}/delta-phase${from}-to-phase${phase}.json`;
    const destPath = join(ROOT, "metrics", "experiment", `${fw}-${chosen}`, `delta-phase${from}-to-phase${phase}.json`);

    if (existsSync(destPath)) continue;

    const content = gitShow(branch, srcPath);
    if (writeIfMissing(destPath, content)) {
      console.log(`  [ok]   ${fw}-${chosen}/delta-phase${from}-to-phase${phase}.json`);
      collected++;
    } else {
      // deltas are optional — don't count as missing
      console.log(`  [n/a]  ${fw}-${chosen}/delta-phase${from}-to-phase${phase}.json`);
    }
  }
}

console.log(`\nDone. Collected ${collected} files, ${missing} genuinely missing.`);

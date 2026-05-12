#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const phaseArg = argValue("--phase");
const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();
const branch = argValue("--branch") || "unknown";

if (!phaseArg) {
  console.error("Usage: node scoring/acceptance-coverage.mjs --phase <N> [--repo <path>] [--branch <branch>]");
  process.exit(2);
}

const phase = parseInt(phaseArg, 10);
if (Number.isNaN(phase) || phase < 1) {
  console.error("--phase must be an integer >= 1");
  process.exit(2);
}

const specPath =
  phase === 1
    ? join(ROOT, "docs", "PROJECT_SPEC.md")
    : join(ROOT, "docs", `PHASE${phase}_SPEC.md`);

if (!existsSync(specPath)) {
  console.error(`Spec not found: ${specPath}`);
  process.exit(1);
}

const specContent = readFileSync(specPath, "utf-8");
const acceptanceSections = [
  ...specContent.matchAll(/## Acceptance Criteria([\s\S]*?)(\n## |\n# |$)/g),
];
const acceptanceSection =
  acceptanceSections.length > 0
    ? acceptanceSections[acceptanceSections.length - 1][1]
    : "";
const acIds = [...new Set(acceptanceSection.match(/\bAC-\d+\.\d+\b/g) || [])];

const referenced = new Set();
const testRoots = [join(ROOT, "e2e"), join(ROOT, "src")];

function collectTestFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectTestFiles(fullPath, out);
      continue;
    }
    if (
      /\.spec\.(ts|tsx|js|jsx)$/.test(entry) ||
      /\.test\.(ts|tsx|js|jsx)$/.test(entry) ||
      (dir.includes(`${ROOT}/e2e`) && /\.ts$/.test(entry))
    ) {
      out.push(fullPath);
    }
  }
  return out;
}

for (const file of testRoots.flatMap((dir) => collectTestFiles(dir))) {
  const content = readFileSync(file, "utf-8");
  for (const acId of acIds) {
    if (content.includes(acId)) referenced.add(acId);
  }
}

const missing = acIds.filter((id) => !referenced.has(id));
const output = {
  phase,
  branch,
  acRequired: acIds.length,
  acCovered: referenced.size,
  coverage: acIds.length > 0 ? referenced.size / acIds.length : 0,
  missing,
  computedAt: new Date().toISOString(),
};

const outDir = join(ROOT, "metrics", branch);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, `acceptance-coverage-phase${phase}.json`),
  JSON.stringify(output, null, 2),
);

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

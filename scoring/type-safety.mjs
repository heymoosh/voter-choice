#!/usr/bin/env node

import { execSync } from "child_process";
import { resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();

function run(cmd) {
  try {
    return {
      success: true,
      stdout: execSync(cmd, {
        cwd: ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }),
      stderr: "",
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    };
  }
}

function countMatches(pattern) {
  const result = run(`rg -o --no-heading --glob 'src/**/*.ts' --glob 'src/**/*.tsx' "${pattern}" src`);
  if (!result.success && !result.stdout) return 0;
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

const tscResult = run("npx tsc --noEmit --strict --project tsconfig.json");
const diagnostics = `${tscResult.stdout}\n${tscResult.stderr}`;
const strictErrors = diagnostics
  .split("\n")
  .filter((line) => /error TS\d+:/.test(line)).length;

const anyOccurrences = countMatches("\\bany\\b");
const tsIgnoreCount = countMatches("@ts-ignore");
const tsExpectErrorCount = countMatches("@ts-expect-error");
const tsNocheckCount = countMatches("@ts-nocheck");

const payload = {
  typeSafety: {
    strictErrors,
    anyOccurrences,
    tsIgnoreCount,
    tsExpectErrorCount,
    tsNocheckCount,
    escapeHatches:
      anyOccurrences + tsIgnoreCount + tsExpectErrorCount + tsNocheckCount,
  },
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

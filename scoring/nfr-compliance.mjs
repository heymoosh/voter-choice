#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
  console.error("Usage: node scoring/nfr-compliance.mjs --phase <N> [--repo <path>] [--branch <branch>]");
  process.exit(2);
}

const phase = parseInt(phaseArg, 10);
if (Number.isNaN(phase) || phase < 1) {
  console.error("--phase must be an integer >= 1");
  process.exit(2);
}

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

const specPath =
  phase === 1
    ? join(ROOT, "docs", "PROJECT_SPEC.md")
    : join(ROOT, "docs", `PHASE${phase}_SPEC.md`);
const specContent = readFileSync(specPath, "utf-8");
const nfrSection =
  specContent.match(/## Non-Functional Requirements([\s\S]*?)(\n## |\n# |$)/)?.[1] || "";

const nfrs = [...nfrSection.matchAll(/- \*\*(NFR-\d+\.\d+)\*\* \*\(([^)]+)\)\* — (.+)/g)].map(
  ([, id, category, threshold]) => ({ id, category, threshold }),
);

const metricsPath = join(ROOT, "metrics", branch, `phase${phase}.json`);
let phaseMetrics = null;
if (existsSync(metricsPath)) {
  phaseMetrics = JSON.parse(readFileSync(metricsPath, "utf-8"));
} else {
  const measured = run(`node scoring/measure.mjs --repo "${ROOT}" --phase ${phase} --print-only`);
  if (measured.success && measured.stdout) {
    phaseMetrics = JSON.parse(measured.stdout);
  }
}

function evaluateNfr(nfr) {
  const text = nfr.threshold;

  if (/First Load JS/i.test(text)) {
    const limit = Number(text.match(/(\d+)\s*kB/i)?.[1] || 130);
    const actual = phaseMetrics?.bundleSize?.firstLoadJsShared?.size ?? null;
    return { actual, passed: typeof actual === "number" ? actual <= limit : false };
  }

  if (/Lighthouse performance/i.test(text)) {
    const limit = Number(text.match(/(\d+)/)?.[1] || 90);
    const actual = phaseMetrics?.lighthouse?.performance ?? null;
    return { actual, passed: typeof actual === "number" ? actual >= limit : false };
  }

  if (/Lighthouse accessibility/i.test(text)) {
    const limit = Number(text.match(/(\d+)/)?.[1] || 90);
    const actual = phaseMetrics?.lighthouse?.accessibility ?? null;
    return { actual, passed: typeof actual === "number" ? actual >= limit : false };
  }

  if (/Lighthouse seo/i.test(text)) {
    const limit = Number(text.match(/(\d+)/)?.[1] || 90);
    const actual = phaseMetrics?.lighthouse?.seo ?? null;
    return { actual, passed: typeof actual === "number" ? actual >= limit : false };
  }

  if (/npm audit/i.test(text)) {
    const audit = run("npm audit --json");
    const parsed = audit.stdout ? JSON.parse(audit.stdout) : {};
    const high = parsed.metadata?.vulnerabilities?.high ?? 0;
    const critical = parsed.metadata?.vulnerabilities?.critical ?? 0;
    const actual = high + critical;
    return { actual, passed: actual === 0 };
  }

  if (/localStorage|sessionStorage|cookies/i.test(text)) {
    const storage = run("rg -n \"localStorage|sessionStorage|document\\.cookie\" src");
    const hits = storage.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
    return { actual: hits, passed: hits === 0 };
  }

  return { actual: "manual-check-required", passed: false };
}

const results = nfrs.map((nfr) => {
  const evaluation = evaluateNfr(nfr);
  return {
    id: nfr.id,
    category: nfr.category,
    threshold: nfr.threshold,
    actual: evaluation.actual,
    passed: evaluation.passed,
  };
});

const passedCount = results.filter((result) => result.passed).length;
const output = {
  phase,
  nfrs: results,
  passRate: results.length > 0 ? passedCount / results.length : 0,
};

const outDir = join(ROOT, "metrics", branch);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, `nfr-compliance-phase${phase}.json`),
  JSON.stringify(output, null, 2),
);

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

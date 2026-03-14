#!/usr/bin/env node

/**
 * Measurement script for the voter-choice workflow experiment.
 * Runs all automated metrics and outputs a single JSON report.
 *
 * Usage: node scripts/measure.mjs [--output path/to/output.json]
 *
 * Metrics collected:
 * - ESLint errors/warnings
 * - Vitest test coverage and pass rate
 * - Cyclomatic complexity (via ESLint)
 * - Code duplication (jscpd)
 * - Bundle size (next build)
 * - Lighthouse scores (against local build)
 * - Playwright e2e test results
 */

import { execSync, spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const args = process.argv.slice(2);

let outputPath = null;
const outputIdx = args.indexOf("--output");
if (outputIdx !== -1 && args[outputIdx + 1]) {
  outputPath = args[outputIdx + 1];
}

function run(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 300000,
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
    return { success: true, stdout: result, stderr: "" };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      exitCode: err.status,
    };
  }
}

function log(msg) {
  console.log(`\n=== ${msg} ===`);
}

// ------------------------------------------------------------------
// 1. ESLint
// ------------------------------------------------------------------
function measureEslint() {
  log("ESLint");
  const result = run(
    "npx next lint --output-file .eslint-report.json --format json 2>/dev/null",
  );
  // next lint returns exit 1 when there are warnings/errors
  const reportPath = join(ROOT, ".eslint-report.json");
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      let errors = 0;
      let warnings = 0;
      let complexityViolations = 0;
      for (const file of report) {
        errors += file.errorCount || 0;
        warnings += file.warningCount || 0;
        for (const msg of file.messages || []) {
          if (msg.ruleId && msg.ruleId.includes("complexity")) {
            complexityViolations++;
          }
        }
      }
      console.log(
        `  Errors: ${errors}, Warnings: ${warnings}, Complexity violations: ${complexityViolations}`,
      );
      return { errors, warnings, complexityViolations };
    } catch {
      console.log("  Could not parse ESLint report");
      return { errors: null, warnings: null, complexityViolations: null };
    }
  }
  console.log("  ESLint report not generated");
  return { errors: null, warnings: null, complexityViolations: null };
}

// ------------------------------------------------------------------
// 2. Vitest (tests + coverage)
// ------------------------------------------------------------------
function measureVitest() {
  log("Vitest (tests + coverage)");
  const result = run(
    "npx vitest run --coverage --reporter=json --outputFile=.vitest-report.json 2>&1",
  );

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    passRate: null,
  };
  let coverage = {
    lines: null,
    branches: null,
    functions: null,
    statements: null,
  };

  const reportPath = join(ROOT, ".vitest-report.json");
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      testResults.total = report.numTotalTests || 0;
      testResults.passed = report.numPassedTests || 0;
      testResults.failed = report.numFailedTests || 0;
      testResults.skipped =
        (report.numPendingTests || 0) + (report.numTodoTests || 0);
      testResults.passRate =
        testResults.total > 0
          ? Math.round((testResults.passed / testResults.total) * 10000) / 100
          : null;
    } catch {
      // no valid report
    }
  }

  // Check if any test files exist
  const hasTests = run(
    "find src -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' 2>/dev/null",
  );
  if (!hasTests.stdout.trim()) {
    console.log("  No test files found — skipping");
    return { tests: { ...testResults, skipped: "no test files" }, coverage };
  }

  const coveragePath = join(ROOT, "coverage", "coverage-summary.json");
  if (existsSync(coveragePath)) {
    try {
      const cov = JSON.parse(readFileSync(coveragePath, "utf-8"));
      const total = cov.total || {};
      coverage.lines = total.lines?.pct ?? null;
      coverage.branches = total.branches?.pct ?? null;
      coverage.functions = total.functions?.pct ?? null;
      coverage.statements = total.statements?.pct ?? null;
    } catch {
      // no valid coverage
    }
  }

  console.log(`  Tests: ${testResults.passed}/${testResults.total} passed`);
  console.log(
    `  Coverage: lines=${coverage.lines}%, branches=${coverage.branches}%`,
  );
  return { tests: testResults, coverage };
}

// ------------------------------------------------------------------
// 3. Code duplication (jscpd)
// ------------------------------------------------------------------
function measureDuplication() {
  log("Code duplication (jscpd)");
  run(
    'npx jscpd --pattern "src/**/*.{ts,tsx}" --reporters json --output .jscpd-report . 2>&1',
  );
  const reportPath = join(ROOT, ".jscpd-report", "jscpd-report.json");
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      const stats = report.statistics || {};
      const total = stats.total || {};
      console.log(
        `  Duplicated lines: ${total.duplicatedLines || 0} / ${total.lines || 0} (${total.percentage || 0}%)`,
      );
      return {
        duplicatedLines: total.duplicatedLines || 0,
        totalLines: total.lines || 0,
        percentage: total.percentage || 0,
        clones: (report.duplicates || []).length,
      };
    } catch {
      console.log("  Could not parse jscpd report");
      return null;
    }
  }
  console.log("  No jscpd report generated");
  return null;
}

// ------------------------------------------------------------------
// 4. Bundle size (next build)
// ------------------------------------------------------------------
function measureBundleSize() {
  log("Bundle size (next build)");
  const result = run("npx next build 2>&1");
  if (!result.success && !result.stdout) {
    console.log("  Build failed");
    return { buildSuccess: false, pages: null };
  }

  const output = result.stdout + (result.stderr || "");

  // Parse the build output for route sizes
  const pages = [];
  const routeRegex = /[○◐●ƒ]\s+(\S+)\s+(\d+(?:\.\d+)?)\s+(kB|B)/g;
  let match;
  while ((match = routeRegex.exec(output)) !== null) {
    pages.push({
      route: match[1],
      size: parseFloat(match[2]),
      unit: match[3],
    });
  }

  // Look for "First Load JS shared by all" line
  const sharedMatch = output.match(
    /First Load JS shared by all\s+(\d+(?:\.\d+)?)\s+(kB|B)/,
  );
  const firstLoadShared = sharedMatch
    ? { size: parseFloat(sharedMatch[1]), unit: sharedMatch[2] }
    : null;

  console.log(
    `  Build: ${result.success ? "success" : "completed with warnings"}`,
  );
  console.log(`  Routes found: ${pages.length}`);
  if (firstLoadShared) {
    console.log(
      `  First Load JS shared: ${firstLoadShared.size} ${firstLoadShared.unit}`,
    );
  }

  return {
    buildSuccess: true,
    pages,
    firstLoadJsShared: firstLoadShared,
  };
}

// ------------------------------------------------------------------
// 5. Lighthouse
// ------------------------------------------------------------------
function measureLighthouse() {
  log("Lighthouse");

  // Build first, then start the server in background
  if (!existsSync(join(ROOT, ".next"))) {
    console.log("  Building first...");
    run("npx next build 2>&1");
  }

  const result = run("npx lhci collect --config=lighthouserc.js 2>&1");
  if (!result.success && !result.stdout.includes("Done running")) {
    console.log("  Lighthouse collect failed, trying inline approach...");
  }

  // Parse results from .lighthouseci directory
  const lhDir = join(ROOT, ".lighthouseci");
  if (existsSync(lhDir)) {
    try {
      const files = execSync(`ls ${lhDir}/*.json 2>/dev/null`, {
        encoding: "utf-8",
        cwd: ROOT,
      })
        .trim()
        .split("\n")
        .filter(Boolean);

      // Find the lhr (Lighthouse result) file
      for (const file of files) {
        if (file.includes("lhr-")) {
          const lhr = JSON.parse(readFileSync(file, "utf-8"));
          const scores = {
            performance: Math.round(
              (lhr.categories?.performance?.score || 0) * 100,
            ),
            accessibility: Math.round(
              (lhr.categories?.accessibility?.score || 0) * 100,
            ),
            bestPractices: Math.round(
              (lhr.categories?.["best-practices"]?.score || 0) * 100,
            ),
            seo: Math.round((lhr.categories?.seo?.score || 0) * 100),
          };
          console.log(`  Performance: ${scores.performance}`);
          console.log(`  Accessibility: ${scores.accessibility}`);
          console.log(`  Best Practices: ${scores.bestPractices}`);
          console.log(`  SEO: ${scores.seo}`);
          return scores;
        }
      }
    } catch {
      // fall through
    }
  }

  console.log("  Could not collect Lighthouse results");
  return {
    performance: null,
    accessibility: null,
    bestPractices: null,
    seo: null,
  };
}

// ------------------------------------------------------------------
// 6. Playwright e2e
// ------------------------------------------------------------------
function measurePlaywright() {
  log("Playwright e2e tests");

  // Check if e2e tests exist
  if (!existsSync(join(ROOT, "e2e"))) {
    console.log("  No e2e directory found — skipping");
    return { total: 0, passed: 0, failed: 0, skipped: "no e2e directory" };
  }

  // Build if needed
  if (!existsSync(join(ROOT, ".next"))) {
    console.log("  Building first...");
    run("npx next build 2>&1");
  }

  // Use config reporters (playwright.config.ts writes JSON to playwright-report.json)
  const result = run("npx playwright test 2>&1");

  const reportPath = join(ROOT, "playwright-report.json");
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      const suites = report.suites || [];
      let total = 0;
      let passed = 0;
      let failed = 0;
      let timedOut = 0;
      let skippedCount = 0;

      function countSpecs(suite) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              total++;
              if (result.status === "passed") passed++;
              else if (result.status === "failed") failed++;
              else if (result.status === "timedOut") timedOut++;
              else if (result.status === "skipped") skippedCount++;
            }
          }
        }
        for (const child of suite.suites || []) {
          countSpecs(child);
        }
      }

      for (const suite of suites) {
        countSpecs(suite);
      }

      const passRate =
        total > 0 ? Math.round((passed / total) * 10000) / 100 : null;
      console.log(`  Tests: ${passed}/${total} passed (${passRate}%)`);
      if (failed > 0) console.log(`  Failed: ${failed}`);
      if (timedOut > 0) console.log(`  Timed out: ${timedOut}`);
      return {
        total,
        passed,
        failed,
        timedOut,
        skipped: skippedCount,
        passRate,
      };
    } catch {
      console.log("  Could not parse Playwright report");
    }
  }

  // If no tests actually matched, report as skipped
  if (result.stderr && result.stderr.includes("no tests found")) {
    console.log("  No e2e tests matched — skipping");
    return { total: 0, passed: 0, failed: 0, skipped: "no tests matched" };
  }

  console.log("  Playwright run completed but no report generated");
  return { total: 0, passed: 0, failed: 0, skipped: "no report" };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  console.log("Voter Choice — Measurement Script");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const branch = run("git branch --show-current").stdout.trim();
  const commit = run("git rev-parse --short HEAD").stdout.trim();
  console.log(`Branch: ${branch}, Commit: ${commit}`);

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      branch,
      commit,
      nodeVersion: process.version,
    },
    eslint: measureEslint(),
    vitest: measureVitest(),
    duplication: measureDuplication(),
    bundleSize: measureBundleSize(),
    lighthouse: measureLighthouse(),
    playwright: measurePlaywright(),
  };

  // Determine output path
  if (!outputPath) {
    const metricsDir = join(ROOT, "metrics", branch || "unknown");
    if (!existsSync(metricsDir)) {
      mkdirSync(metricsDir, { recursive: true });
    }
    outputPath = join(metricsDir, "baseline.json");
  }

  // Ensure output directory exists
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n=== Report saved to ${outputPath} ===`);
}

main().catch((err) => {
  console.error("Measure script failed:", err);
  process.exit(1);
});

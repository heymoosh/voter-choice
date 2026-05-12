#!/usr/bin/env node

/**
 * Measurement script for the voter-choice workflow experiment.
 * Runs all automated metrics and outputs a single JSON report.
 *
 * This script lives in `scoring/` on `main` only. It is intentionally
 * NOT present on workflow branches and NOT mounted into the build
 * container. Hermes invokes it from a host-side main worktree, pointed
 * at the target branch worktree via --repo, after the container has
 * exited with a committed + tagged build.
 *
 * Workflows must never see this file's contents or its metric list.
 * Exposing the rubric to workflows enables metric gaming (see
 * docs/LEARNINGS.md → Learning 009).
 *
 * Usage: node /path/to/main/scoring/measure.mjs --repo /path/to/branch-worktree [--output path/to/output.json]
 *
 * If --repo is omitted, process.cwd() is used — which lets the script
 * run from inside the target worktree as well.
 */

import { execSync, spawn } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const printOnly = args.includes("--print-only");
const originalConsoleLog = console.log.bind(console);

if (printOnly) {
  console.log = () => {};
}

let outputPath = null;
const outputIdx = args.indexOf("--output");
if (outputIdx !== -1 && args[outputIdx + 1]) {
  outputPath = args[outputIdx + 1];
}

// ROOT is the target repository being measured, NOT the location of
// this script. Hermes (or the operator) passes --repo when invoking
// from outside the target worktree. Default is cwd.
let ROOT = process.cwd();
const repoIdx = args.indexOf("--repo");
if (repoIdx !== -1 && args[repoIdx + 1]) {
  ROOT = resolve(args[repoIdx + 1]);
}

const branchOverride = argValue("--branch");
const timingLogOverride = argValue("--timing-log");
const workflowLogOverride = argValue("--workflow-log");

// Optional --phase N. When provided, output goes to phase<N>.json instead
// of baseline.json. Required by compute-deltas.mjs (sub-task 2 of the
// deferred-audit-concerns plan).
let phaseNumber = null;
const phaseIdx = args.indexOf("--phase");
if (phaseIdx !== -1 && args[phaseIdx + 1]) {
  phaseNumber = parseInt(args[phaseIdx + 1], 10);
  if (Number.isNaN(phaseNumber) || phaseNumber < 1) {
    console.error("Invalid --phase value:", args[phaseIdx + 1]);
    process.exit(2);
  }
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

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
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
// 1b. Per-function cyclomatic complexity
// ------------------------------------------------------------------
// Runs a second ESLint pass with the `complexity` rule forced to threshold 1
// so every function emits a "has a complexity of N" message regardless of
// the on-disk threshold. Parses the messages to extract per-function detail.
// The on-disk eslint.config.mjs is untouched — override is via CLI --rule.
//
// Why: measureEslint() above only captures the violation count. To track
// abstraction quality phase-over-phase we need average + max + distribution
// across all functions, not just those above a static threshold.
function measureComplexity() {
  log("Per-function cyclomatic complexity");
  const reportPath = join(ROOT, ".eslint-complexity-report.json");
  // Force complexity threshold to 1 so every function emits a message.
  // Use shell-escaped JSON for the --rule argument. The single quotes
  // around the JSON keep the shell from interpreting the inner double quotes.
  const cmd =
    `npx eslint --rule '{"complexity":["warn",1]}' ` +
    `--format json --output-file .eslint-complexity-report.json ` +
    `'src/**/*.{ts,tsx,js,jsx,mjs}' 2>/dev/null || true`;
  run(cmd);

  if (!existsSync(reportPath)) {
    console.log("  Complexity report not generated");
    return null;
  }

  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf-8"));
  } catch {
    console.log("  Could not parse complexity report");
    return null;
  }

  const fnRegex = /Function '([^']+)' has a complexity of (\d+)/;
  const methodRegex = /Method '([^']+)' has a complexity of (\d+)/;
  const arrowRegex = /Arrow function has a complexity of (\d+)/;
  const genericRegex = /has a complexity of (\d+)/;

  const perFunction = [];
  for (const file of report) {
    const relPath = file.filePath.replace(ROOT + "/", "");
    for (const msg of file.messages || []) {
      if (msg.ruleId !== "complexity") continue;
      let name = "<anonymous>";
      let complexity = null;
      const fnMatch = msg.message.match(fnRegex);
      const methodMatch = msg.message.match(methodRegex);
      const arrowMatch = msg.message.match(arrowRegex);
      const generic = msg.message.match(genericRegex);
      if (fnMatch) {
        name = fnMatch[1];
        complexity = parseInt(fnMatch[2], 10);
      } else if (methodMatch) {
        name = methodMatch[1];
        complexity = parseInt(methodMatch[2], 10);
      } else if (arrowMatch) {
        name = "<arrow>";
        complexity = parseInt(arrowMatch[1], 10);
      } else if (generic) {
        complexity = parseInt(generic[1], 10);
      }
      if (complexity == null) continue;
      perFunction.push({
        file: relPath,
        name,
        complexity,
        line: msg.line ?? null,
      });
    }
  }

  if (perFunction.length === 0) {
    console.log("  No functions found");
    return {
      count: 0,
      average: null,
      max: null,
      p50: null,
      p75: null,
      p95: null,
      distribution: null,
      perFunction: [],
    };
  }

  const sorted = [...perFunction].map((f) => f.complexity).sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const average = +(sum / sorted.length).toFixed(2);
  const max = sorted[sorted.length - 1];
  const pct = (p) => {
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  };
  const distribution = {
    simple_1_5: sorted.filter((c) => c <= 5).length,
    moderate_6_10: sorted.filter((c) => c >= 6 && c <= 10).length,
    complex_11_15: sorted.filter((c) => c >= 11 && c <= 15).length,
    highComplex_16_20: sorted.filter((c) => c >= 16 && c <= 20).length,
    critical_21plus: sorted.filter((c) => c >= 21).length,
  };

  // Sort perFunction descending by complexity for human-readable JSON;
  // keep top 50 to bound the report size.
  perFunction.sort((a, b) => b.complexity - a.complexity);
  const topFunctions = perFunction.slice(0, 50);

  console.log(
    `  Functions: ${sorted.length}, avg=${average}, max=${max}, p95=${pct(95)}`,
  );
  return {
    count: sorted.length,
    average,
    max,
    p50: pct(50),
    p75: pct(75),
    p95: pct(95),
    distribution,
    perFunction: topFunctions,
  };
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
// 7. Lines of code
// ------------------------------------------------------------------
function measureLOC() {
  log("Lines of code");

  const CODE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".sh",
    ".css",
    ".json",
  ]);
  const DOC_EXTENSIONS = new Set([".md"]);

  // Directories that are plugin/framework code (workflow scaffolding)
  // Actual directory names per branch (from Phase 0.4 install):
  //   CE:          .claude/skills/, .claude/agents/
  //   BMAD:        _bmad/, .claude/skills/
  //   Spec Kit:    .specify/, .claude/commands/speckit.* (counted via .claude/commands/)
  //   Superpowers: .claude/skills/, .claude/agents/, .claude/hooks/
  //   Vanilla:     (none — minimal CLAUDE.md only)
  // .claude/commands/start.md is our own infra, but the rest are framework files.
  const PLUGIN_DIRS = [
    ".claude/skills",
    ".claude/agents",
    ".claude/hooks",
    "_bmad",
    ".specify",
  ];
  // Everything else that's project code but not app or plugin
  const INFRA_DIRS = ["scripts", ".claude/commands"];
  const EXCLUDED_DIRS = new Set([
    ".git",
    "node_modules",
    ".next",
    "coverage",
    "dist",
    "test-results",
    "playwright-report",
  ]);

  function countLines(filePath) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    let total = lines.length;
    // Don't count trailing empty last line from split
    if (lines[lines.length - 1] === "") total--;
    let blank = 0;
    let comment = 0;
    let inBlock = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        blank++;
        continue;
      }
      if (inBlock) {
        comment++;
        if (trimmed.includes("*/")) inBlock = false;
        continue;
      }
      if (trimmed.startsWith("/*")) {
        comment++;
        if (!trimmed.includes("*/")) inBlock = false;
        if (!trimmed.endsWith("*/") && trimmed.includes("/*")) inBlock = true;
        continue;
      }
      if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
        comment++;
      }
    }
    return { total, blank, comment, code: total - blank - comment };
  }

  function walkDir(dir, allowedExtensions) {
    const results = [];
    if (!existsSync(dir)) return results;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        if (fullPath === join(ROOT, ".claude", "worktrees")) continue;
        results.push(...walkDir(fullPath, allowedExtensions));
      } else {
        const ext = entry.name.includes(".")
          ? "." + entry.name.split(".").pop()
          : "";
        if (allowedExtensions.has(ext)) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  function countCategory(files) {
    let total = 0;
    let blank = 0;
    let comment = 0;
    let code = 0;
    let fileCount = 0;
    const byExtension = {};

    for (const file of files) {
      const counts = countLines(file);
      total += counts.total;
      blank += counts.blank;
      comment += counts.comment;
      code += counts.code;
      fileCount++;
      const ext = "." + file.split(".").pop();
      if (!byExtension[ext]) byExtension[ext] = { files: 0, code: 0 };
      byExtension[ext].files++;
      byExtension[ext].code += counts.code;
    }

    return { files: fileCount, total, blank, comment, code, byExtension };
  }

  function uniqueFiles(files) {
    return Array.from(new Set(files));
  }

  function appRelative(file) {
    return relative(ROOT, file).split("\\").join("/");
  }

  function isTestFile(relPath) {
    return (
      /^e2e\/.*\.ts$/.test(relPath) ||
      /^src\/__tests__\//.test(relPath) ||
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relPath)
    );
  }

  function isDataFile(relPath) {
    return (
      /^src\/.*\.json$/.test(relPath) ||
      /^public\/.*\.json$/.test(relPath) ||
      /^data\/.*\.json$/.test(relPath)
    );
  }

  // Also count standalone config files in root (exclude lockfiles and generated reports)
  const EXCLUDE_FILES = new Set([
    "package-lock.json",
    "playwright-report.json",
    ".vitest-report.json",
    ".eslint-report.json",
    ".eslint-complexity-report.json",
  ]);
  const rootConfigFiles = [];
  try {
    const rootEntries = readdirSync(ROOT, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (
        !entry.isDirectory() &&
        CODE_EXTENSIONS.has("." + entry.name.split(".").pop()) &&
        !entry.name.startsWith(".") &&
        !EXCLUDE_FILES.has(entry.name)
      ) {
        rootConfigFiles.push(join(ROOT, entry.name));
      }
    }
  } catch {
    // ignore
  }

  const srcFiles = walkDir(join(ROOT, "src"), CODE_EXTENSIONS);
  const e2eFiles = walkDir(join(ROOT, "e2e"), CODE_EXTENSIONS);
  const publicJsonFiles = walkDir(join(ROOT, "public"), new Set([".json"]));
  const dataJsonFiles = walkDir(join(ROOT, "data"), new Set([".json"]));
  const markdownFiles = walkDir(ROOT, DOC_EXTENSIONS);

  const productionFiles = [];
  const testFiles = [];
  const dataFiles = [...publicJsonFiles, ...dataJsonFiles];

  for (const file of srcFiles) {
    const relPath = appRelative(file);
    if (isTestFile(relPath)) {
      testFiles.push(file);
    } else if (isDataFile(relPath)) {
      dataFiles.push(file);
    } else {
      productionFiles.push(file);
    }
  }
  for (const file of e2eFiles) {
    const relPath = appRelative(file);
    if (isTestFile(relPath)) {
      testFiles.push(file);
    }
  }

  const pluginFiles = uniqueFiles(
    PLUGIN_DIRS.flatMap((dir) => walkDir(join(ROOT, dir), CODE_EXTENSIONS)),
  );
  const infraFiles = uniqueFiles([
    ...INFRA_DIRS.flatMap((dir) => walkDir(join(ROOT, dir), CODE_EXTENSIONS)),
    ...rootConfigFiles,
  ]);

  const production = countCategory(uniqueFiles(productionFiles));
  const tests = countCategory(uniqueFiles(testFiles));
  const data = countCategory(uniqueFiles(dataFiles));
  const docs = countCategory(uniqueFiles(markdownFiles));
  const plugin = countCategory(pluginFiles);
  const infra = countCategory(infraFiles);

  const appByExtension = {};
  for (const category of [production.byExtension, tests.byExtension, data.byExtension]) {
    for (const [ext, stats] of Object.entries(category)) {
      if (!appByExtension[ext]) appByExtension[ext] = { files: 0, code: 0 };
      appByExtension[ext].files += stats.files;
      appByExtension[ext].code += stats.code;
    }
  }

  const summary = {
    productionLOC: production.code,
    testLOC: tests.code,
    dataLOC: data.code,
    docLOC: docs.code,
    totalApplication: production.code + tests.code + data.code,
    plugin: { code: plugin.code, files: plugin.files, byExtension: plugin.byExtension },
    infrastructure: { code: infra.code, files: infra.files },
    byExtension: appByExtension,
    application: {
      code: production.code + tests.code + data.code,
      files: production.files + tests.files + data.files,
      byExtension: appByExtension,
    },
    total: {
      code: production.code + tests.code + data.code + docs.code + plugin.code + infra.code,
      files:
        production.files + tests.files + data.files + docs.files + plugin.files + infra.files,
    },
  };

  console.log(`  Production LOC: ${production.code} lines across ${production.files} files`);
  console.log(`  Test LOC: ${tests.code} lines across ${tests.files} files`);
  console.log(`  Data LOC: ${data.code} lines across ${data.files} files`);
  console.log(`  Doc LOC: ${docs.code} lines across ${docs.files} files`);
  console.log(`  Plugin/framework code: ${plugin.code} lines across ${plugin.files} files`);
  console.log(`  Infrastructure (scripts, e2e, configs): ${infra.code} lines across ${infra.files} files`);
  console.log(`  Total: ${summary.total.code} lines across ${summary.total.files} files`);

  return summary;
}

// ------------------------------------------------------------------
// 8. Workflow-generated test files
// ------------------------------------------------------------------
function measureWorkflowTests() {
  log("Workflow-generated tests");
  const result = run(
    "find src -name '*.test.*' -o -name '*.spec.*' 2>/dev/null",
  );
  const files = result.stdout.trim().split("\n").filter(Boolean);
  console.log(`  Test files in src/: ${files.length}`);
  if (files.length > 0) {
    for (const f of files) {
      console.log(`    ${f}`);
    }
  }
  return { count: files.length, files };
}

function measureBuildTiming() {
  log("Build timing");
  const logPath = timingLogOverride || join(ROOT, "metrics", "timing.jsonl");
  if (!existsSync(logPath)) {
    console.log("  No timing.jsonl found — skipping");
    return { exists: false, hasStart: false, hasEnd: false, entryCount: 0 };
  }

  const entries = readFileSync(logPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const startEntry = entries.find((entry) => entry.event === "build_start");
  const endEntry = [...entries].reverse().find((entry) => entry.event === "build_end");
  const durationMs =
    startEntry?.timestamp && endEntry?.timestamp
      ? new Date(endEntry.timestamp) - new Date(startEntry.timestamp)
      : null;

  console.log(
    `  build_start=${startEntry ? "yes" : "no"}, build_end=${endEntry ? "yes" : "no"}`,
  );

  return {
    exists: true,
    hasStart: Boolean(startEntry),
    hasEnd: Boolean(endEntry),
    entryCount: entries.length,
    start: startEntry?.timestamp || null,
    end: endEntry?.timestamp || null,
    durationMs,
    source: logPath,
  };
}

function measureWorkflowLogSummary() {
  log("Workflow log");
  const logPath = workflowLogOverride || join(ROOT, "metrics", "workflow-log.jsonl");
  if (!existsSync(logPath)) {
    console.log("  No workflow-log.jsonl found — skipping");
    return { exists: false, entryCount: 0, completedCount: 0, source: logPath };
  }
  const entries = readFileSync(logPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const completedCount = entries.filter((entry) => entry.status === "completed").length;
  console.log(`  Entries: ${entries.length}, completed: ${completedCount}`);
  return {
    exists: true,
    entryCount: entries.length,
    completedCount,
    source: logPath,
  };
}

function measureTypeSafety() {
  log("Type safety");
  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = join(dirname(__filename), "type-safety.mjs");
  if (!existsSync(scriptPath)) {
    console.log("  type-safety.mjs not found at", scriptPath);
    return null;
  }
  const result = run(`node "${scriptPath}" --repo "${ROOT}"`);
  if (!result.success) {
    console.log("  type-safety.mjs failed:", result.stderr || result.stdout);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    console.log(
      `  strictErrors=${parsed.typeSafety?.strictErrors ?? "?"}, escapeHatches=${
        parsed.typeSafety?.escapeHatches ?? "?"
      }`,
    );
    return parsed.typeSafety ?? null;
  } catch {
    console.log("  Could not parse type-safety output");
    return null;
  }
}

function measureCoupling() {
  log("Coupling");
  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = join(dirname(__filename), "coupling.mjs");
  if (!existsSync(scriptPath)) {
    console.log("  coupling.mjs not found at", scriptPath);
    return null;
  }
  const result = run(`node "${scriptPath}" --repo "${ROOT}"`);
  if (!result.success) {
    console.log("  coupling.mjs failed:", result.stderr || result.stdout);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    console.log(
      `  nodes=${parsed.coupling?.nodes ?? "?"}, edges=${parsed.coupling?.edges ?? "?"}, circular=${
        parsed.coupling?.circular ?? "?"
      }`,
    );
    return parsed.coupling ?? null;
  } catch {
    console.log("  Could not parse coupling output");
    return null;
  }
}

// ------------------------------------------------------------------
// 8c. Acceptance coverage (acceptance-coverage.mjs)
// ------------------------------------------------------------------
function measureAcceptanceCoverage(branch, phase) {
  log("Acceptance coverage");
  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = join(dirname(__filename), "acceptance-coverage.mjs");
  if (!existsSync(scriptPath)) {
    console.log("  acceptance-coverage.mjs not found at", scriptPath);
    return null;
  }
  if (phase == null) {
    console.log("  Skipping (no --phase provided)");
    return null;
  }
  const b = branch || "unknown";
  const result = run(`node "${scriptPath}" --repo "${ROOT}" --phase ${phase} --branch "${b}"`);
  if (!result.success) {
    console.log("  acceptance-coverage.mjs failed:", result.stderr || result.stdout);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    console.log(
      `  acRequired=${parsed.acRequired}, acCovered=${parsed.acCovered}, coverage=${parsed.coverage}`,
    );
    return parsed;
  } catch {
    console.log("  Could not parse acceptance-coverage output");
    return null;
  }
}

// ------------------------------------------------------------------
// 8d. NFR compliance (nfr-compliance.mjs)
// ------------------------------------------------------------------
function measureNfrCompliance(branch, phase) {
  log("NFR compliance");
  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = join(dirname(__filename), "nfr-compliance.mjs");
  if (!existsSync(scriptPath)) {
    console.log("  nfr-compliance.mjs not found at", scriptPath);
    return null;
  }
  if (phase == null) {
    console.log("  Skipping (no --phase provided)");
    return null;
  }
  const b = branch || "unknown";
  const result = run(`node "${scriptPath}" --repo "${ROOT}" --phase ${phase} --branch "${b}"`);
  if (!result.success) {
    console.log("  nfr-compliance.mjs failed:", result.stderr || result.stdout);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    console.log(`  nfrs=${parsed.nfrs?.length ?? 0}, passRate=${parsed.passRate}`);
    return parsed;
  } catch {
    console.log("  Could not parse nfr-compliance output");
    return null;
  }
}

// ------------------------------------------------------------------
// 8b. Diff hygiene (only when --phase >= 2)
// ------------------------------------------------------------------
// Delegates to scoring/diff-hygiene.mjs which lives next to this file.
// Skipped when --phase is not provided or phase is 1 (no prior tag to
// diff against). The script must succeed end-to-end; if it errors,
// embed null and continue rather than failing the whole measurement.
function measureDiffHygiene(branch, phase) {
  log("Diff hygiene");
  if (phase == null || phase < 2) {
    console.log("  Skipping (phase < 2 or no --phase provided)");
    return null;
  }
  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = join(dirname(__filename), "diff-hygiene.mjs");
  if (!existsSync(scriptPath)) {
    console.log("  diff-hygiene.mjs not found at", scriptPath);
    return null;
  }
  const result = run(
    `node "${scriptPath}" --branch "${branch}" --phase ${phase} --repo "${ROOT}"`,
  );
  if (!result.success) {
    console.log("  diff-hygiene.mjs failed:", result.stderr || result.stdout);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    console.log(
      `  Scope adherence: ${parsed.scopeAdherence}, unexpected files: ${parsed.summary.unexpected.filesChanged}`,
    );
    return parsed;
  } catch {
    console.log("  Could not parse diff-hygiene output");
    return null;
  }
}

// ------------------------------------------------------------------
// 9. Workflow step timing
// ------------------------------------------------------------------
function measureWorkflowTiming() {
  log("Workflow step timing");
  const logPath = workflowLogOverride || join(ROOT, "metrics", "workflow-log.jsonl");
  if (!existsSync(logPath)) {
    console.log("  No workflow-log.jsonl found — skipping");
    return null;
  }
  const lines = readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
  const entries = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const completionEntries = entries.filter((entry) => entry.status === "completed");
  const stepCandidates = new Map();

  for (const entry of entries) {
    if (entry.status !== "started" || !entry.step) continue;

    const startedMs = entry.timestamp ? new Date(entry.timestamp).getTime() : null;
    const completed = completionEntries
      .filter((candidate) => {
        if (candidate.step !== entry.step || !candidate.timestamp) return false;
        if (startedMs == null) return true;
        return new Date(candidate.timestamp).getTime() >= startedMs;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

    const durationMs =
      completed && entry.timestamp && completed.timestamp
        ? new Date(completed.timestamp) - new Date(entry.timestamp)
        : null;
    const candidate = {
      step: entry.step,
      started: entry.timestamp || null,
      completed: completed?.timestamp || null,
      durationMs,
    };

    if (!stepCandidates.has(entry.step)) {
      stepCandidates.set(entry.step, []);
    }
    stepCandidates.get(entry.step).push(candidate);
  }

  const rawStepCount = Array.from(stepCandidates.values()).reduce(
    (total, candidates) => total + candidates.length,
    0,
  );
  const steps = [];

  for (const [stepName, candidates] of stepCandidates.entries()) {
    const winner = candidates
      .filter((candidate) => candidate.durationMs != null && candidate.durationMs > 0)
      .sort((a, b) => {
        const aStarted = a.started ? new Date(a.started).getTime() : -Infinity;
        const bStarted = b.started ? new Date(b.started).getTime() : -Infinity;
        return bStarted - aStarted;
      })[0];

    if (!winner) {
      console.log(`  Dropping duplicate/incomplete timing entries for step '${stepName}'`);
      continue;
    }

    steps.push(winner);
  }

  steps.sort((a, b) => {
    const aStarted = a.started ? new Date(a.started).getTime() : Infinity;
    const bStarted = b.started ? new Date(b.started).getTime() : Infinity;
    return aStarted - bStarted;
  });

  const dedupedCount = rawStepCount - steps.length;
  const completedSteps = steps.filter((s) => s.completed).length;
  console.log(`  Steps: ${completedSteps}/${steps.length} completed`);
  console.log(`  Deduped entries: ${dedupedCount}`);
  for (const s of steps) {
    const dur = s.durationMs != null ? `${Math.round(s.durationMs / 1000)}s` : "incomplete";
    console.log(`    ${s.step}: ${dur}`);
  }

  return { steps, totalSteps: steps.length, completedSteps, dedupedCount };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  console.log("Voter Choice — Measurement Script");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const branch = branchOverride || run("git branch --show-current").stdout.trim();
  const commit = run("git rev-parse --short HEAD").stdout.trim();
  console.log(`Branch: ${branch}, Commit: ${commit}`);

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      branch,
      commit,
      phase: phaseNumber,
      nodeVersion: process.version,
    },
    eslint: measureEslint(),
    complexity: measureComplexity(),
    vitest: measureVitest(),
    duplication: measureDuplication(),
    bundleSize: measureBundleSize(),
    lighthouse: measureLighthouse(),
    playwright: measurePlaywright(),
    linesOfCode: measureLOC(),
    workflowTests: measureWorkflowTests(),
    timing: measureBuildTiming(),
    workflowLog: measureWorkflowLogSummary(),
    coupling: measureCoupling(),
    typeSafety: measureTypeSafety(),
    acceptance: measureAcceptanceCoverage(branch, phaseNumber),
    nfrCompliance: measureNfrCompliance(branch, phaseNumber),
    workflowTiming: measureWorkflowTiming(),
    diffHygiene: measureDiffHygiene(branch, phaseNumber),
  };

  if (printOnly) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  // Determine output path
  if (!outputPath) {
    const metricsDir = join(ROOT, "metrics", branch || "unknown");
    if (!existsSync(metricsDir)) {
      mkdirSync(metricsDir, { recursive: true });
    }
    const filename = phaseNumber != null ? `phase${phaseNumber}.json` : "baseline.json";
    outputPath = join(metricsDir, filename);
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

#!/usr/bin/env node

/**
 * Phase delta computation for the voter-choice experiment.
 *
 * Reads phase<N>.json on the current branch and phase<N-1>.json from the
 * prior phase tag, then emits a JSON + Markdown report of every numeric
 * leaf's delta. This is what makes the auto-findings-rubric's delta section
 * actually executable — measure.mjs only emits absolute values per phase.
 *
 * Usage:
 *   node scoring/compute-deltas.mjs --branch <branch-name> --phase <N>
 *
 * Optional:
 *   --repo <path>       Repo root (defaults to cwd)
 *   --prev-tag <tag>    Override the auto-derived prior-phase tag
 *   --prev-ref <ref>    Read prior metrics from a different ref (e.g. an
 *                       archive tag with a different branch path)
 *   --prev-path <path>  Path inside the prev ref to the prior metrics JSON
 *                       (defaults to metrics/<branch>/phase<N-1>.json with
 *                       a baseline.json fallback)
 *
 * Output:
 *   metrics/<branch>/delta-phase<N-1>-to-phase<N>.json
 *   metrics/<branch>/delta-phase<N-1>-to-phase<N>.md
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const branchName = argValue("--branch");
const phaseArg = argValue("--phase");
const repoArg = argValue("--repo");
const prevTagOverride = argValue("--prev-tag");
const prevRefOverride = argValue("--prev-ref");
const prevPathOverride = argValue("--prev-path");

if (!branchName || !phaseArg) {
  console.error("Usage: compute-deltas.mjs --branch <branch> --phase <N>");
  process.exit(2);
}

const phase = parseInt(phaseArg, 10);
if (Number.isNaN(phase) || phase < 2) {
  console.error("--phase must be an integer >= 2");
  process.exit(2);
}

const ROOT = repoArg ? resolve(repoArg) : process.cwd();

// Derive the framework slug from the branch name. Examples:
//   experiment/vanilla          -> vanilla
//   experiment/bmad             -> bmad
//   experiment/bmad/r2          -> bmad-r2
//   archive/run5/vanilla        -> run5-vanilla   (used for replay tests)
const frameworkSlug = branchName
  .replace(/^experiment\//, "")
  .replace(/^archive\//, "")
  .replace(/\//g, "-");

// Tag conventions in this repo (observed via `git tag -l`):
//   Phase 1 replicates:        <framework>-r<N>-phase1-complete   (e.g. bmad-r2-phase1-complete)
//   Forward phases (legacy):   <framework>-phase<N>-complete       (e.g. bmad-phase3-complete)
//   Forward phases (v2):       <framework>-r<N>-phase<N>-complete  (uniform convention)
// To compute a Phase-N delta on a representative branch like
// experiment/bmad/r2, the prev-tag lookup must try BOTH the
// replicate-suffixed slug (works for Phase 2 → 1 and v2 forward phases) AND
// the bare slug (works for legacy forward phases Phase 3+ where the
// representative-run tag drops the -r<N>).
const bareSlug = frameworkSlug.replace(/-r\d+$/, "");
const slugCandidates = bareSlug !== frameworkSlug ? [frameworkSlug, bareSlug] : [frameworkSlug];

const branchMetricsDir = join(ROOT, "metrics", branchName);
const currentPath = join(branchMetricsDir, `phase${phase}.json`);
if (!existsSync(currentPath)) {
  console.error(`Current phase metrics not found: ${currentPath}`);
  console.error(
    `Did measure.mjs run with --phase ${phase}? It must to produce phase${phase}.json.`,
  );
  process.exit(1);
}

const current = JSON.parse(readFileSync(currentPath, "utf-8"));

// Resolve the prior phase metrics. Try, in order:
//   1. --prev-ref:--prev-path  (explicit override)
//   2. <framework>-phase<N-1>-complete:metrics/<branch>/phase<N-1>.json
//   3. <framework>-phase<N-1>-complete:metrics/<branch>/baseline.json (legacy)
//   4. metrics/<branch>/phase<N-1>.json on disk (mid-experiment fallback)
function readGitFile(ref, path) {
  try {
    return execSync(`git show ${ref}:${path}`, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

const candidates = [];
if (prevRefOverride) {
  const path = prevPathOverride || `metrics/${branchName}/phase${phase - 1}.json`;
  candidates.push({ ref: prevRefOverride, path });
}

// Try every slug candidate × every legacy path. The first hit wins.
const autoTags = prevTagOverride
  ? [prevTagOverride]
  : slugCandidates.map((s) => `${s}-phase${phase - 1}-complete`);
const autoTag = autoTags[0]; // for error reporting below
for (const tag of autoTags) {
  candidates.push({ ref: tag, path: `metrics/${branchName}/phase${phase - 1}.json` });
  candidates.push({ ref: tag, path: `metrics/${branchName}/baseline.json` });
}

let priorContent = null;
let priorSource = null;
for (const c of candidates) {
  const content = readGitFile(c.ref, c.path);
  if (content) {
    priorContent = content;
    priorSource = `${c.ref}:${c.path}`;
    break;
  }
}

if (!priorContent) {
  // Final fallback: on-disk file (useful mid-experiment if the prior phase
  // wasn't tagged yet).
  const localPriorPath = join(branchMetricsDir, `phase${phase - 1}.json`);
  if (existsSync(localPriorPath)) {
    priorContent = readFileSync(localPriorPath, "utf-8");
    priorSource = `disk:${localPriorPath}`;
  }
}

if (!priorContent) {
  console.error(
    `Could not find prior phase metrics. Tried tag(s) ${autoTags.map((t) => `'${t}'`).join(", ")} (phase${phase - 1}.json and baseline.json) and on-disk phase${phase - 1}.json.`,
  );
  process.exit(1);
}

let prior;
try {
  prior = JSON.parse(priorContent);
} catch (err) {
  console.error("Prior metrics JSON parse failed:", err.message);
  process.exit(1);
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function walkDeltas(prev, curr, prefix = "") {
  const result = {};
  const keys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(curr || {}),
  ]);
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const a = prev?.[key];
    const b = curr?.[key];
    if (typeof a === "number" && typeof b === "number") {
      const delta = +(b - a).toFixed(4);
      const pctChange = a !== 0 ? +(((b - a) / a) * 100).toFixed(2) : null;
      result[path] = { prev: a, curr: b, delta, pctChange };
    } else if (isPlainObject(a) && isPlainObject(b)) {
      Object.assign(result, walkDeltas(a, b, path));
    } else if (isPlainObject(a) && b == null) {
      // entire subtree removed; emit a removal marker
      Object.assign(result, walkDeltas(a, {}, path));
    } else if (a == null && isPlainObject(b)) {
      Object.assign(result, walkDeltas({}, b, path));
    } else if (typeof a === "number" && b == null) {
      result[path] = { prev: a, curr: null, delta: null, pctChange: null };
    } else if (a == null && typeof b === "number") {
      result[path] = { prev: null, curr: b, delta: null, pctChange: null };
    }
    // arrays / strings / booleans: ignore for delta purposes
  }
  return result;
}

const deltas = walkDeltas(prior, current);

const output = {
  metadata: {
    branch: branchName,
    fromPhase: phase - 1,
    toPhase: phase,
    fromCommit: prior.metadata?.commit || null,
    toCommit: current.metadata?.commit || null,
    priorSource,
    computedAt: new Date().toISOString(),
  },
  deltas,
};

if (!existsSync(branchMetricsDir)) {
  mkdirSync(branchMetricsDir, { recursive: true });
}
const jsonPath = join(branchMetricsDir, `delta-phase${phase - 1}-to-phase${phase}.json`);
writeFileSync(jsonPath, JSON.stringify(output, null, 2));

function renderMarkdown(o) {
  const lines = [
    `# Phase ${o.metadata.fromPhase} → Phase ${o.metadata.toPhase} delta — \`${o.metadata.branch}\``,
    "",
    `**Computed:** ${o.metadata.computedAt}`,
    `**Prior source:** \`${o.metadata.priorSource}\``,
    `**Commits:** ${o.metadata.fromCommit || "?"} → ${o.metadata.toCommit || "?"}`,
    "",
    "| Metric | Prev | Curr | Δ | % change |",
    "|--------|-----:|-----:|--:|---------:|",
  ];
  const fmt = (v) => (v == null ? "—" : v);
  const fmtDelta = (v) => {
    if (v == null) return "—";
    return v >= 0 ? `+${v}` : String(v);
  };
  const fmtPct = (v) => {
    if (v == null) return "—";
    return (v >= 0 ? "+" : "") + v + "%";
  };
  for (const [metric, d] of Object.entries(o.deltas)) {
    lines.push(
      `| ${metric} | ${fmt(d.prev)} | ${fmt(d.curr)} | ${fmtDelta(d.delta)} | ${fmtPct(d.pctChange)} |`,
    );
  }
  return lines.join("\n") + "\n";
}

const mdPath = join(branchMetricsDir, `delta-phase${phase - 1}-to-phase${phase}.md`);
writeFileSync(mdPath, renderMarkdown(output));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(`Prior source: ${priorSource}`);
console.log(`Computed ${Object.keys(deltas).length} metric deltas.`);

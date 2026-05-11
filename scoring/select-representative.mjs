#!/usr/bin/env node

/**
 * Select a representative replicate run for a framework after the n=3
 * Phase 1 replicates have all completed.
 *
 * Reads (each replicate is its own branch `experiment/<framework>-r<N>`):
 *   metrics/experiment/<framework>-r1/phase1.json
 *   metrics/experiment/<framework>-r2/phase1.json
 *   metrics/experiment/<framework>-r3/phase1.json
 *
 * Writes:
 *   metrics/experiment/<framework>/representative.json
 *
 * Selection rule: median LOC across r1/r2/r3 (default). Falls back to
 * any available replicate if some are missing.
 *
 * Reports variance per metric so FRAMING.md's "n=3 at Phase 1" caveat
 * can be amended if any workflow shows extreme spread.
 *
 * Usage:
 *   node scoring/select-representative.mjs --framework <name> [--repo <path>]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);
function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const framework = argValue("--framework");
const repoArg = argValue("--repo");
if (!framework) {
  console.error("Usage: select-representative.mjs --framework <name>");
  process.exit(2);
}

const ROOT = repoArg ? resolve(repoArg) : process.cwd();
const summaryDir = join(ROOT, "metrics", "experiment", framework);

const replicates = [];
for (const r of ["r1", "r2", "r3"]) {
  // Each replicate is its own branch with its own metrics directory.
  const path = join(ROOT, "metrics", "experiment", `${framework}-${r}`, "phase1.json");
  if (!existsSync(path)) {
    console.warn(`Missing: ${path}`);
    continue;
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    replicates.push({ id: r, data, path });
  } catch (err) {
    console.warn(`Failed to parse ${path}: ${err.message}`);
  }
}

if (replicates.length === 0) {
  console.error(`No replicate metrics found for framework '${framework}' under ${baseDir}`);
  process.exit(1);
}

function stat(name, getter) {
  const values = replicates
    .map((r) => ({ id: r.id, value: getter(r.data) }))
    .filter((x) => typeof x.value === "number");
  if (values.length === 0) return null;
  const nums = values.map((v) => v.value);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance =
    nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
  const stdDev = Math.sqrt(variance);
  const rsd = mean !== 0 ? +(stdDev / Math.abs(mean) * 100).toFixed(2) : null;
  const sortedAsc = [...values].sort((a, b) => a.value - b.value);
  return {
    name,
    perReplicate: Object.fromEntries(values.map((v) => [v.id, v.value])),
    mean: +mean.toFixed(2),
    stdDev: +stdDev.toFixed(2),
    rsd,
    minId: sortedAsc[0].id,
    medianId: sortedAsc[Math.floor(sortedAsc.length / 2)].id,
    maxId: sortedAsc[sortedAsc.length - 1].id,
  };
}

const dims = [
  ["linesOfCode.application.code", (d) => d.linesOfCode?.application?.code],
  ["linesOfCode.application.files", (d) => d.linesOfCode?.application?.files],
  ["vitest.tests.total", (d) => d.vitest?.tests?.total],
  ["vitest.coverage.lines", (d) => d.vitest?.coverage?.lines],
  ["playwright.passRate", (d) => d.playwright?.passRate],
  ["eslint.errors", (d) => d.eslint?.errors],
  ["eslint.warnings", (d) => d.eslint?.warnings],
  ["complexity.average", (d) => d.complexity?.average],
  ["complexity.max", (d) => d.complexity?.max],
  ["duplication.percentage", (d) => d.duplication?.percentage],
  ["bundleSize.firstLoadJsShared.size", (d) => d.bundleSize?.firstLoadJsShared?.size],
];

const varianceByMetric = {};
for (const [name, getter] of dims) {
  const s = stat(name, getter);
  if (s) varianceByMetric[name] = s;
}

// Selection rule: pick the replicate at the median LOC. If LOC is unavailable,
// fall back to median vitest.tests.total, then first replicate.
let chosen;
let rationale;
const locStat = varianceByMetric["linesOfCode.application.code"];
if (locStat && locStat.medianId) {
  chosen = locStat.medianId;
  rationale = `median LOC (${locStat.perReplicate[locStat.medianId]}); replicates span ${locStat.perReplicate[locStat.minId]}..${locStat.perReplicate[locStat.maxId]}, RSD ${locStat.rsd}%`;
} else {
  chosen = replicates[0].id;
  rationale = `LOC unavailable; defaulted to first replicate (${chosen})`;
}

const noisyMetrics = Object.values(varianceByMetric).filter(
  (s) => s.rsd != null && s.rsd > 25,
);

const report = {
  metadata: {
    framework,
    selectedAt: new Date().toISOString(),
    replicatesFound: replicates.length,
    replicateIds: replicates.map((r) => r.id),
  },
  chosen,
  rationale,
  noisyMetrics: noisyMetrics.map((s) => ({
    metric: s.name,
    rsd: s.rsd,
    note: s.rsd > 50 ? "very high variance — flag in FRAMING.md" : "moderate variance",
  })),
  varianceByMetric,
};

const summaryParent = join(ROOT, "metrics", "experiment");
if (!existsSync(summaryParent)) mkdirSync(summaryParent, { recursive: true });
const outPath = join(summaryParent, `${framework}-representative.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`Wrote ${outPath}`);
console.log(`Chosen: ${chosen}`);
console.log(`Rationale: ${rationale}`);
if (noisyMetrics.length > 0) {
  console.log(`\nNoisy metrics (RSD > 25%):`);
  for (const m of noisyMetrics) {
    console.log(`  ${m.metric}: ${m.rsd}% (${m.note})`);
  }
}

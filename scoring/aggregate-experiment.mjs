#!/usr/bin/env node

/**
 * Cross-framework experiment aggregator.
 *
 * Reads every per-phase, per-branch metrics file produced by measure.mjs,
 * compute-deltas.mjs, and select-representative.mjs, then synthesizes:
 *   - metrics/experiment/FINAL_REPORT.json — machine-readable rollup
 *   - metrics/experiment/FINAL_RANKING.md — human-readable ranking
 *
 * Runs the 13-check rubric defined in scoring/auto-findings-rubric.md
 * against the captured data per phase per framework. Computes a composite
 * maintainability score with explicit per-axis breakdown.
 *
 * Graceful degradation: if a framework didn't complete all 5 phases (e.g.,
 * Phase 3 blocked on missing API keys), the aggregator reports what's
 * present and flags what's missing rather than crashing.
 *
 * Usage:
 *   node scoring/aggregate-experiment.mjs [--repo <path>]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();
const DRY_RUN = args.includes("--dry-run");
const TARGET = argValue("--target");
const FRAMEWORKS = ["vanilla", "bmad", "spec-kit", "superpowers", "compound-engineering"];
const REPLICATES = ["r1", "r2", "r3"];
const FORWARD_PHASES = [2, 3, 4, 5, 6];

const QUESTION_HEAVY = new Set(["bmad", "spec-kit"]);
const WORKFLOW_EXPECTATIONS = {
  vanilla: [],
  bmad: [
    "bmad:product-brief",
    "bmad:prd",
    "bmad:architecture",
    "bmad:epics-and-stories",
    "bmad:implementation-readiness",
    "bmad:sprint-planning",
    "bmad:story-implementation",
    "bmad:code-review",
  ],
  "spec-kit": [
    "speckit.specify",
    "speckit.clarify",
    "speckit.plan",
    "speckit.tasks",
    "speckit.analyze",
    "speckit.implement",
  ],
  superpowers: [
    "brainstorming",
    "writing-plans",
    "executing-plans",
    "requesting-code-review",
    "verification-before-completion",
    "finishing-a-development-branch",
  ],
  "compound-engineering": ["ce:plan", "ce:work", "ce:review", "ce:compound"],
};
const EXPECTED_FIELD_PATHS = [
  "metadata.branch",
  "metadata.phase",
  "eslint.errors",
  "eslint.warnings",
  "complexity.average",
  "complexity.max",
  "complexity.distribution.critical_21plus",
  "vitest.coverage.lines",
  "bundleSize.firstLoadJsShared.size",
  "playwright.total",
  "playwright.passed",
  "playwright.passRate",
  "linesOfCode.productionLOC",
  "linesOfCode.testLOC",
  "linesOfCode.dataLOC",
  "linesOfCode.docLOC",
  "linesOfCode.totalApplication",
  "workflowTests.count",
  "workflowTiming.steps",
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    console.warn(`  ! Failed to parse ${path}: ${err.message}`);
    return null;
  }
}

function gitShowFile(ref, path) {
  try {
    return execSync(`git -C "${ROOT}" show ${ref}:${path} 2>/dev/null`, {
      encoding: "utf-8",
    });
  } catch {
    return null;
  }
}

function safeNum(v, fallback = null) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// ------------------------------------------------------------------
// Per-phase metric loaders
// ------------------------------------------------------------------

function loadReplicatePhase1(framework, replicate) {
  const path = join(
    ROOT,
    "metrics",
    "experiment",
    `${framework}-${replicate}`,
    "phase1.json",
  );
  return { path, data: readJsonIfExists(path) };
}

function loadRepresentative(framework) {
  const path = join(
    ROOT,
    "metrics",
    "experiment",
    `${framework}-representative.json`,
  );
  return { path, data: readJsonIfExists(path) };
}

function loadForwardPhase(framework, chosenReplicate, phase) {
  const path = join(
    ROOT,
    "metrics",
    "experiment",
    `${framework}-${chosenReplicate}`,
    `phase${phase}.json`,
  );
  return { path, data: readJsonIfExists(path) };
}

function loadDelta(framework, chosenReplicate, fromPhase, toPhase) {
  const path = join(
    ROOT,
    "metrics",
    "experiment",
    `${framework}-${chosenReplicate}`,
    `delta-phase${fromPhase}-to-phase${toPhase}.json`,
  );
  return { path, data: readJsonIfExists(path) };
}

function loadResponderLog(framework, chosenReplicate) {
  const branch = `experiment/${framework}-${chosenReplicate}`;
  // Tag-based read first (the build commit tagged it), else live file.
  for (const ref of [
    `${framework}-phase6-complete`,
    `${framework}-phase5-complete`,
    `${framework}-phase4-complete`,
    `${framework}-phase3-complete`,
    `${framework}-phase2-complete`,
    `${framework}-${chosenReplicate}-phase1-complete`,
    branch,
  ]) {
    const content = gitShowFile(ref, "metrics/responder-log.jsonl");
    if (content) {
      const entries = content
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { ref, entries };
    }
  }
  return { ref: null, entries: [] };
}

function loadWorkflowLog(framework, chosenReplicate) {
  const branch = `experiment/${framework}-${chosenReplicate}`;
  const refs = [
    `${framework}-phase6-complete`,
    `${framework}-phase5-complete`,
    `${framework}-phase4-complete`,
    `${framework}-phase3-complete`,
    `${framework}-phase2-complete`,
    `${framework}-${chosenReplicate}-phase1-complete`,
    branch,
  ];
  const candidatePaths = [
    `metrics/${branch}/workflow-log.jsonl`,
    "metrics/workflow-log.jsonl",
  ];

  for (const ref of refs) {
    for (const path of candidatePaths) {
      const content = gitShowFile(ref, path);
      if (!content) continue;
      const entries = content
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
      return { ref, path, entries };
    }
  }

  for (const path of candidatePaths) {
    const diskPath = join(ROOT, path);
    if (!existsSync(diskPath)) continue;
    const entries = readFileSync(diskPath, "utf-8")
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
    return { ref: "disk", path, entries };
  }

  return { ref: null, path: null, entries: [] };
}

// ------------------------------------------------------------------
// Rubric application (the 13 checks from auto-findings-rubric.md)
// ------------------------------------------------------------------

function applyRubric(phaseData, context) {
  const findings = [];
  if (!phaseData) return findings;

  const { framework, phase, delta, responderEntries, workflowLogEntries } = context;

  function getPath(obj, path) {
    return path.split(".").reduce((value, key) => {
      if (value == null || !(key in value)) return undefined;
      return value[key];
    }, obj);
  }

  function collectNullLeafPaths(value, prefix = "", out = []) {
    if (value === null) {
      out.push(prefix || "<root>");
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        collectNullLeafPaths(item, `${prefix}[${index}]`, out);
      });
      return out;
    }
    if (typeof value === "object" && value !== null) {
      for (const [key, child] of Object.entries(value)) {
        const childPath = prefix ? `${prefix}.${key}` : key;
        collectNullLeafPaths(child, childPath, out);
      }
    }
    return out;
  }

  function normalizeWorkflowStep(step) {
    return typeof step === "string" ? step.replace(/-phase\d+$/, "") : step;
  }

  // Check 1 — E2e gap
  const e2ePassed = safeNum(phaseData.playwright?.passing);
  const e2eTotal = safeNum(phaseData.playwright?.total);
  const e2eMin = phase >= 2 ? 42 : 42;
  if (e2eTotal != null) {
    if ((e2ePassed != null && e2ePassed < e2eTotal) || e2eTotal < e2eMin) {
      findings.push({
        id: 1,
        name: "E2e gap",
        detail: `${e2ePassed ?? "?"} / ${e2eTotal} passing`,
      });
    }
  } else {
    findings.push({ id: 1, name: "E2e missing", detail: "no playwright data" });
  }

  // Check 4 — Workflow gap
  const expectedSteps = WORKFLOW_EXPECTATIONS[framework] ?? [];
  const observedSteps = new Set(
    (phaseData.workflowTiming?.steps ?? [])
      .map((step) => normalizeWorkflowStep(step?.step))
      .filter(Boolean),
  );
  const missingSteps = expectedSteps.filter((step) => !observedSteps.has(step));
  if (missingSteps.length > 0) {
    findings.push({
      id: 4,
      name: "Workflow gap",
      detail: `missing steps: ${missingSteps.join(", ")}`,
    });
  }

  // Check 5 — Lint regression
  const errors = safeNum(phaseData.eslint?.errors, 0);
  const warnings = safeNum(phaseData.eslint?.warnings, 0);
  if (errors > 0 || warnings > 0) {
    findings.push({
      id: 5,
      name: "Lint regression",
      detail: `${errors} errors, ${warnings} warnings`,
    });
  }

  // Check 6 — Bundle anomaly (±20% from 102 kB baseline)
  const bundleKb = safeNum(phaseData.bundleSize?.firstLoadJsShared?.size);
  if (bundleKb != null && (bundleKb < 85 || bundleKb > 130)) {
    findings.push({
      id: 6,
      name: "Bundle anomaly",
      detail: `${bundleKb} kB (expected 85-130)`,
    });
  }

  // Check 7 — Timing gap
  const timing = phaseData.workflowTiming;
  if (timing && (!timing.hasStart || !timing.hasEnd)) {
    findings.push({
      id: 7,
      name: "Timing gap",
      detail: `start=${timing.hasStart} end=${timing.hasEnd}`,
    });
  }

  // Check 8 — Measurement gap
  const nullLeafPaths = collectNullLeafPaths(phaseData);
  const missingFieldPaths = EXPECTED_FIELD_PATHS.filter((path) => {
    if (phase < 2 && path.startsWith("diffHygiene.")) return false;
    return getPath(phaseData, path) === undefined;
  });
  const measurementGaps = [...new Set([...nullLeafPaths, ...missingFieldPaths])].sort();
  if (measurementGaps.length > 0) {
    findings.push({
      id: 8,
      name: "Measurement gap",
      detail: measurementGaps.slice(0, 8).join(", "),
      paths: measurementGaps,
    });
  }

  // Check 9 — Workflow log empty
  const workflowLogCount = workflowLogEntries?.length ?? 0;
  if (workflowLogCount < 1) {
    findings.push({
      id: 9,
      name: "Workflow log empty",
      detail: `workflow-log entries=${workflowLogCount}`,
    });
  }

  // Check 10 — Test generation
  const workflowTestCount = safeNum(phaseData.workflowTests?.count, 0);
  if (framework !== "vanilla" && workflowTestCount < 1) {
    findings.push({
      id: 10,
      name: "Test generation",
      detail: `${framework} produced ${workflowTestCount} workflow test files`,
    });
  }

  // Check 11 — Diff sprawl (Phase 2+)
  if (phase >= 2 && phaseData.diffHygiene) {
    const unexpectedLoc = safeNum(
      phaseData.diffHygiene.summary?.unexpected?.locAdded,
      0,
    );
    const adherence = safeNum(phaseData.diffHygiene.scopeAdherence);
    if (unexpectedLoc > 200 || (adherence != null && adherence < 0.7)) {
      const unexpectedFiles = phaseData.diffHygiene.unexpectedFiles ?? [];
      findings.push({
        id: 11,
        name: "Diff sprawl",
        detail: `unexpectedLOC=${unexpectedLoc}, scopeAdherence=${
          adherence?.toFixed(2) ?? "?"
        }, files=[${unexpectedFiles.slice(0, 5).join(", ")}${
          unexpectedFiles.length > 5 ? ", ..." : ""
        }]`,
      });
    }
  }

  // Check 12 — Complexity regression (Phase 2+, needs delta)
  if (phase >= 2 && delta?.deltas) {
    const avgDelta = safeNum(delta.deltas["complexity.average"]?.delta);
    const maxDelta = safeNum(delta.deltas["complexity.max"]?.delta);
    const critDelta = safeNum(
      delta.deltas["complexity.distribution.critical_21plus"]?.delta,
    );
    if (
      (avgDelta != null && avgDelta > 2.0) ||
      (maxDelta != null && maxDelta > 5) ||
      (critDelta != null && critDelta > 0)
    ) {
      findings.push({
        id: 12,
        name: "Complexity regression",
        detail: `Δavg=${avgDelta?.toFixed(2) ?? "?"}, Δmax=${
          maxDelta ?? "?"
        }, Δcritical=${critDelta ?? "?"}`,
      });
    }
  }

  // Check 13 — Responder transparency
  if (QUESTION_HEAVY.has(framework) && responderEntries != null) {
    if (responderEntries.length < 3) {
      findings.push({
        id: 13,
        name: "Responder transparency",
        detail: `${responderEntries.length} entries on ${framework} (expected >= 3)`,
      });
    }
  }

  return findings;
}

// ------------------------------------------------------------------
// Composite maintainability scoring
// ------------------------------------------------------------------

/**
 * Compute the 5-axis composite for one framework. Each axis returns a
 * score in [0, 100] (higher is better) plus a `notes` field explaining
 * what data went in. Composite is the weighted mean.
 */
function computeComposite(framework, frameworkData) {
  const { replicates, representative, phases, deltas } = frameworkData;
  const phase1 = representative?.chosen
    ? replicates[representative.chosen]?.data
    : Object.values(replicates).find((r) => r?.data)?.data ?? null;
  const lastCompletedPhase = [6, 5, 4, 3, 2, 1].find(
    (p) => p === 1 ? phase1 : phases[p],
  );
  const phaseLast = lastCompletedPhase === 1 ? phase1 : phases[lastCompletedPhase ?? 1];

  // Axis 1: Test quality drift (P1 -> last completed)
  let testQuality = null;
  let testQualityNotes = "no data";
  if (phase1 && phaseLast && lastCompletedPhase !== 1) {
    const covP1 = safeNum(phase1.vitest?.coverage?.lines);
    const covLast = safeNum(phaseLast.vitest?.coverage?.lines);
    const passRateLast = safeNum(phaseLast.playwright?.passRate);
    if (covP1 != null && covLast != null && passRateLast != null) {
      // Reward: coverage holding or growing, e2e at 100%
      const coverageDelta = covLast - covP1;
      const coverageBonus = Math.max(0, Math.min(40, coverageDelta * 2));
      const baselineCoverage = Math.min(40, covLast * 0.4);
      const e2eBonus = passRateLast >= 99 ? 20 : passRateLast >= 90 ? 10 : 0;
      testQuality = Math.round(coverageBonus + baselineCoverage + e2eBonus);
      testQualityNotes = `cov P1=${covP1.toFixed(1)}% → P${lastCompletedPhase}=${covLast.toFixed(
        1,
      )}% (Δ${coverageDelta.toFixed(1)}pp), e2e P${lastCompletedPhase}=${passRateLast.toFixed(0)}%`;
    } else {
      testQualityNotes = "partial data";
    }
  } else if (phase1) {
    const covP1 = safeNum(phase1.vitest?.coverage?.lines);
    if (covP1 != null) {
      testQuality = Math.round(Math.min(60, covP1 * 0.6));
      testQualityNotes = `only P1 — cov ${covP1.toFixed(1)}% (capped at 60)`;
    }
  }

  // Axis 2: Complexity discipline (last completed phase complexity + trajectory)
  let complexity = null;
  let complexityNotes = "no data";
  const lastPhaseData = phases[lastCompletedPhase ?? 1] ?? phase1;
  const lastComplexityAvg = safeNum(lastPhaseData?.complexity?.average);
  const lastComplexityMax = safeNum(lastPhaseData?.complexity?.max);
  if (lastComplexityAvg != null) {
    // Score from average complexity: ≤4 → 100, ≤6 → 80, ≤8 → 60, ≤10 → 40, >10 → 20
    let avgScore = 100;
    if (lastComplexityAvg > 4) avgScore = 80;
    if (lastComplexityAvg > 6) avgScore = 60;
    if (lastComplexityAvg > 8) avgScore = 40;
    if (lastComplexityAvg > 10) avgScore = 20;
    // Penalty if any function has critical complexity (>20)
    const critical = safeNum(
      lastPhaseData?.complexity?.distribution?.critical_21plus,
      0,
    );
    let critPenalty = Math.min(30, critical * 10);
    // Trajectory penalty: if delta avg > 1.5 across any consecutive phases
    let trajectoryPenalty = 0;
    for (const phase of FORWARD_PHASES) {
      const d = deltas[`${phase - 1}_to_${phase}`];
      const avgDelta = safeNum(d?.deltas?.["complexity.average"]?.delta);
      if (avgDelta != null && avgDelta > 1.5) trajectoryPenalty += 10;
    }
    complexity = Math.max(
      0,
      Math.round(avgScore - critPenalty - trajectoryPenalty),
    );
    complexityNotes = `avg=${lastComplexityAvg.toFixed(2)}, max=${
      lastComplexityMax ?? "?"
    }, critical=${critical}, trajectory penalty=${trajectoryPenalty}`;
  }

  // Axis 3: Diff hygiene (avg scopeAdherence across forward phases)
  let diffHygiene = null;
  let diffHygieneNotes = "no forward phases";
  const adherenceValues = [];
  const unexpectedSum = { loc: 0, files: 0 };
  for (const phase of FORWARD_PHASES) {
    const d = phases[phase]?.diffHygiene;
    if (!d) continue;
    const a = safeNum(d.scopeAdherence);
    if (a != null) adherenceValues.push(a);
    unexpectedSum.loc += safeNum(d.summary?.unexpected?.locAdded, 0);
    unexpectedSum.files += safeNum(d.summary?.unexpected?.filesModified, 0);
  }
  if (adherenceValues.length > 0) {
    const mean =
      adherenceValues.reduce((a, b) => a + b, 0) / adherenceValues.length;
    // 0.9 → 100, 0.7 → 70, 0.5 → 40, <0.5 → 20
    let score = Math.round(mean * 100);
    if (unexpectedSum.loc > 500) score -= 20;
    diffHygiene = Math.max(0, Math.min(100, score));
    diffHygieneNotes = `mean adherence ${mean.toFixed(2)} across ${
      adherenceValues.length
    } phases, total unexpected LOC=${unexpectedSum.loc}`;
  }

  // Axis 4: Scope completion (how many phases completed)
  let completion = null;
  let completionNotes = "";
  const phasesCompleted =
    (phase1 ? 1 : 0) + FORWARD_PHASES.filter((p) => phases[p]).length;
  const totalPhases = 1 + FORWARD_PHASES.length;
  completion = Math.round((phasesCompleted / totalPhases) * 100);
  completionNotes = `${phasesCompleted}/${totalPhases} phases produced metrics`;

  // Axis 5: Variance discipline (RSD averaged across key Phase 1 metrics; lower is better)
  let variance = null;
  let varianceNotes = "no representative.json";
  if (representative?.varianceByMetric) {
    const rsds = Object.values(representative.varianceByMetric)
      .map((m) => safeNum(m.rsd))
      .filter((r) => r != null);
    if (rsds.length > 0) {
      const meanRsd = rsds.reduce((a, b) => a + b, 0) / rsds.length;
      // RSD ≤ 5% → 100, ≤ 15% → 80, ≤ 25% → 60, ≤ 40% → 40, > 40% → 20
      let score = 100;
      if (meanRsd > 5) score = 80;
      if (meanRsd > 15) score = 60;
      if (meanRsd > 25) score = 40;
      if (meanRsd > 40) score = 20;
      variance = score;
      varianceNotes = `mean RSD ${meanRsd.toFixed(1)}% across ${rsds.length} P1 metrics`;
    }
  }

  // Composite — weighted mean of available axes
  const axes = [
    { name: "testQuality", weight: 0.25, score: testQuality, notes: testQualityNotes },
    { name: "complexity", weight: 0.25, score: complexity, notes: complexityNotes },
    { name: "diffHygiene", weight: 0.2, score: diffHygiene, notes: diffHygieneNotes },
    { name: "completion", weight: 0.2, score: completion, notes: completionNotes },
    { name: "variance", weight: 0.1, score: variance, notes: varianceNotes },
  ];
  const presentAxes = axes.filter((a) => a.score != null);
  let composite = null;
  if (presentAxes.length > 0) {
    const totalWeight = presentAxes.reduce((s, a) => s + a.weight, 0);
    composite = Math.round(
      presentAxes.reduce((s, a) => s + a.score * a.weight, 0) / totalWeight,
    );
  }

  return { composite, axes };
}

// ------------------------------------------------------------------
// Main aggregation
// ------------------------------------------------------------------

function aggregateFramework(framework) {
  // Replicates (Phase 1)
  const replicates = {};
  for (const r of REPLICATES) {
    const loaded = loadReplicatePhase1(framework, r);
    replicates[r] = loaded;
  }

  // Representative
  const representativeLoaded = loadRepresentative(framework);
  const representative = representativeLoaded.data;
  const chosen = representative?.chosen ?? null;

  // Forward phases (from chosen replicate, if any)
  const phases = {};
  const deltas = {};
  if (chosen) {
    for (const p of FORWARD_PHASES) {
      const loaded = loadForwardPhase(framework, chosen, p);
      phases[p] = loaded.data;
      if (p > 1) {
        const d = loadDelta(framework, chosen, p - 1, p);
        deltas[`${p - 1}_to_${p}`] = d.data;
      }
    }
  }

  // Responder log (live file on the chosen replicate branch, or fallback)
  const responder = chosen ? loadResponderLog(framework, chosen) : { ref: null, entries: [] };
  const workflowLog = chosen
    ? loadWorkflowLog(framework, chosen)
    : { ref: null, path: null, entries: [] };

  // Apply rubric per phase
  const findingsByPhase = {};
  // Phase 1 — use the chosen replicate's data (or whichever exists)
  const phase1Data = chosen ? replicates[chosen]?.data : Object.values(replicates).find((r) => r?.data)?.data;
  if (phase1Data) {
    findingsByPhase[1] = applyRubric(phase1Data, {
      framework,
      phase: 1,
      delta: null,
      responderEntries: responder.entries,
      workflowLogEntries: workflowLog.entries,
    });
  }
  for (const p of FORWARD_PHASES) {
    if (!phases[p]) continue;
    findingsByPhase[p] = applyRubric(phases[p], {
      framework,
      phase: p,
      delta: deltas[`${p - 1}_to_${p}`],
      responderEntries: responder.entries,
      workflowLogEntries: workflowLog.entries,
    });
  }

  const composite = computeComposite(framework, {
    replicates,
    representative,
    phases: { ...phases, 1: phase1Data },
    deltas,
  });

  // Tally completed phases
  const completedPhases = [
    phase1Data ? 1 : null,
    ...FORWARD_PHASES.map((p) => (phases[p] ? p : null)),
  ].filter((p) => p != null);

  return {
    framework,
    chosen,
    replicatesFound: Object.values(replicates).filter((r) => r.data).length,
    completedPhases,
    findingsByPhase,
    responderEntries: responder.entries.length,
    composite: composite.composite,
    axes: composite.axes,
    rationale: representative?.rationale ?? null,
    noisyMetrics: representative?.noisyMetrics ?? [],
    workflowLogEntries: workflowLog.entries.length,
  };
}

// ------------------------------------------------------------------
// Markdown rendering
// ------------------------------------------------------------------

function renderMarkdown(report) {
  const lines = [];
  const ts = new Date().toISOString();

  lines.push("# FINAL_RANKING.md — Experiment Results");
  lines.push("");
  lines.push(`**Generated:** ${ts}`);
  lines.push("");
  lines.push(
    "This is the auto-generated cross-framework rollup of all 45 actions (15 Phase 1 replicates + 5 representative selections + 25 forward-iteration builds across Phases 2–6). The composite score is a weighted mean of five maintainability axes. See **methodology** at the bottom for the weighting and what data went into each axis.",
  );
  lines.push("");
  lines.push(
    "**Read this in light of [docs/FRAMING.md](../../docs/FRAMING.md).** The result supports a narrow claim: best workflow on this Next.js project, run autonomously, n=3 replicates at Phase 1, n=1 forward iteration on the median-LOC representative across Phases 2–6.",
  );
  lines.push("");

  // Ranking table
  lines.push("## Ranking");
  lines.push("");
  const ranked = [...report.frameworks].sort((a, b) => {
    if (a.composite == null && b.composite == null) return 0;
    if (a.composite == null) return 1;
    if (b.composite == null) return -1;
    return b.composite - a.composite;
  });
  lines.push("| Rank | Framework | Composite | Test Quality | Complexity | Diff Hygiene | Completion | Variance | Phases | Findings |");
  lines.push("|------|-----------|-----------|--------------|------------|--------------|------------|----------|--------|----------|");
  for (let i = 0; i < ranked.length; i++) {
    const f = ranked[i];
    const axes = Object.fromEntries(f.axes.map((a) => [a.name, a.score]));
    const totalFindings = Object.values(f.findingsByPhase).reduce(
      (s, arr) => s + arr.length,
      0,
    );
    lines.push(
      `| ${i + 1} | **${f.framework}** | ${f.composite ?? "—"} | ${axes.testQuality ?? "—"} | ${axes.complexity ?? "—"} | ${axes.diffHygiene ?? "—"} | ${axes.completion ?? "—"} | ${axes.variance ?? "—"} | ${f.completedPhases.length}/6 | ${totalFindings} |`,
    );
  }
  lines.push("");

  // Per-framework details
  lines.push("## Per-framework breakdown");
  lines.push("");
  for (const f of ranked) {
    lines.push(`### ${f.framework}`);
    lines.push("");
    lines.push(`- **Composite:** ${f.composite ?? "—"}`);
    lines.push(`- **Replicates found:** ${f.replicatesFound}/3`);
    lines.push(`- **Chosen representative:** ${f.chosen ?? "—"}${f.rationale ? ` (${f.rationale})` : ""}`);
    lines.push(`- **Phases with metrics:** ${f.completedPhases.join(", ") || "none"}`);
    lines.push(`- **Responder-log entries:** ${f.responderEntries}`);
    if (f.noisyMetrics.length > 0) {
      lines.push(`- **Noisy metrics (RSD > 25%):** ${f.noisyMetrics.map((m) => `${m.metric} (${m.rsd}%)`).join(", ")}`);
    }
    lines.push("");
    lines.push("**Axes:**");
    lines.push("");
    for (const a of f.axes) {
      lines.push(`- \`${a.name}\` = ${a.score ?? "—"} — ${a.notes}`);
    }
    lines.push("");

    const totalFindings = Object.values(f.findingsByPhase).reduce(
      (s, arr) => s + arr.length,
      0,
    );
    if (totalFindings > 0) {
      lines.push("**Findings:**");
      lines.push("");
      for (const [phase, findings] of Object.entries(f.findingsByPhase)) {
        if (!findings.length) continue;
        lines.push(`- Phase ${phase}:`);
        for (const finding of findings) {
          lines.push(`  - #${finding.id} ${finding.name} — ${finding.detail}`);
        }
      }
      lines.push("");
    } else {
      lines.push("**No findings detected.**");
      lines.push("");
    }
  }

  // Cross-framework metrics table (per phase)
  lines.push("## Cross-framework metric comparison");
  lines.push("");
  lines.push("Each row is a metric; each column is a framework. Cell = `phase1 → last-completed` (Phase 6 if everything ran). Missing values shown as `—`.");
  lines.push("");
  const metricSpecs = [
    ["E2e pass rate", (p) => p?.playwright?.passRate, "%"],
    ["Vitest coverage (lines)", (p) => p?.vitest?.coverage?.lines, "%"],
    ["Production LOC", (p) => p?.linesOfCode?.productionLOC, ""],
    ["Test LOC", (p) => p?.linesOfCode?.testLOC, ""],
    ["Application file count", (p) => p?.linesOfCode?.application?.files, ""],
    ["Complexity avg", (p) => p?.complexity?.average, ""],
    ["Complexity max", (p) => p?.complexity?.max, ""],
    ["Bundle first-load (kB)", (p) => p?.bundleSize?.firstLoadJsShared?.size, ""],
    ["Duplication %", (p) => p?.duplication?.percentage, "%"],
  ];
  lines.push(`| Metric | ${ranked.map((f) => f.framework).join(" | ")} |`);
  lines.push(`|--------|${ranked.map(() => "----").join("|")}|`);
  for (const [label, getter, unit] of metricSpecs) {
    const cells = ranked.map((f) => {
      const p1 = getter(f._raw?.phase1);
      const pLast = getter(f._raw?.lastPhase);
      const fmt = (v) => (v == null ? "—" : typeof v === "number" ? `${v.toFixed(1)}${unit}` : v);
      return `${fmt(p1)} → ${fmt(pLast)}`;
    });
    lines.push(`| ${label} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  // Methodology
  lines.push("## Methodology");
  lines.push("");
  lines.push("Composite score is a weighted mean of:");
  lines.push("");
  lines.push("- **Test quality (25%)** — Phase 1 → last-completed-phase coverage delta + last-completed-phase e2e pass rate.");
  lines.push("- **Complexity (25%)** — Last-completed phase's avg complexity + trajectory penalty if any phase added > 1.5 to avg.");
  lines.push("- **Diff hygiene (20%)** — Mean `scopeAdherence` across Phases 2–6; penalty if total unexpected LOC > 500.");
  lines.push("- **Scope completion (20%)** — Phases completed / 6. A framework that hit a blocker at Phase 3 maxes out at ~50.");
  lines.push("- **Variance (10%)** — Inverse of mean RSD across Phase 1 metrics (lower variance scores higher).");
  lines.push("");
  lines.push("Composite weights only the axes that have data — a framework with no representative.json still gets a composite from the four other axes, just with the variance term dropped.");
  lines.push("");
  lines.push("Findings come from the 13-check rubric in [scoring/auto-findings-rubric.md](../../scoring/auto-findings-rubric.md). Only checks 1, 5, 6, 7, 11, 12, 13 are programmatically applied here; the rest depend on adherence-report JSON not produced by the autonomous pipeline.");
  lines.push("");
  lines.push("Open the per-phase JSON in `metrics/experiment/<framework>-<replicate>/phase<N>.json` for full per-function complexity, every test name, and bundle-size detail. Open `metrics/experiment/<framework>-<replicate>/delta-phase<N-1>-to-phase<N>.md` for the per-phase Markdown delta render.");
  lines.push("");

  return lines.join("\n");
}

// ------------------------------------------------------------------
// Entrypoint
// ------------------------------------------------------------------

function main() {
  console.log("Voter Choice — Cross-framework Aggregator");
  console.log(`Repo: ${ROOT}`);

  const selectedFrameworks = TARGET ? FRAMEWORKS.filter((fw) => fw === TARGET) : FRAMEWORKS;
  if (TARGET && selectedFrameworks.length === 0) {
    console.error(`Unknown --target framework: ${TARGET}`);
    process.exit(2);
  }

  const frameworks = [];
  for (const fw of selectedFrameworks) {
    console.log(`\n  ${fw}…`);
    const summary = aggregateFramework(fw);
    // Stash raw phase data for the metric comparison table
    const phase1Data = summary.chosen
      ? readJsonIfExists(
          join(ROOT, "metrics", "experiment", `${fw}-${summary.chosen}`, "phase1.json"),
        )
      : null;
    const lastPhaseNum = summary.completedPhases[summary.completedPhases.length - 1];
    const lastPhase = lastPhaseNum && summary.chosen
      ? readJsonIfExists(
          join(
            ROOT,
            "metrics",
            "experiment",
            `${fw}-${summary.chosen}`,
            `phase${lastPhaseNum}.json`,
          ),
        )
      : phase1Data;
    summary._raw = { phase1: phase1Data, lastPhase };
    frameworks.push(summary);
    console.log(`    composite=${summary.composite ?? "—"}, phases=${summary.completedPhases.length}/6, findings=${Object.values(summary.findingsByPhase).reduce((s, a) => s + a.length, 0)}`);
  }

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      repo: ROOT,
      frameworks: selectedFrameworks,
      rubric: "scoring/auto-findings-rubric.md (checks 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 programmatically applied)",
    },
    frameworks,
  };

  if (DRY_RUN) {
    console.log("\nDry run rubric coverage:");
    console.log("check 4 implemented");
    console.log("check 8 implemented");
    console.log("check 9 implemented");
    console.log("check 10 implemented");
    for (const framework of frameworks) {
      for (const [phase, findings] of Object.entries(framework.findingsByPhase)) {
        for (const finding of findings.filter((entry) => [4, 8, 9, 10].includes(entry.id))) {
          console.log(
            `${framework.framework} phase ${phase}: check ${finding.id} ${finding.name} — ${finding.detail}`,
          );
        }
      }
    }
    return;
  }

  const outDir = join(ROOT, "metrics", "experiment");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const jsonPath = join(outDir, "FINAL_REPORT.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${jsonPath}`);

  const mdPath = join(outDir, "FINAL_RANKING.md");
  writeFileSync(mdPath, renderMarkdown(report));
  console.log(`Wrote ${mdPath}`);
}

main();

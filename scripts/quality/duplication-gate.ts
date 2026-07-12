#!/usr/bin/env node
// scripts/quality/duplication-gate.ts
//
// Component/code duplication ratchet — the "don't let copy-paste grow" CI
// gate. jscpd (already a devDependency, configured by .jscpd.json) finds
// exact clones across src/**; this script compares its findings against a
// committed baseline (duplication-baseline.json, same directory) and fails
// when duplication GROWS, while grandfathering everything that already
// exists. This is deliberately not a percentage threshold: a flat "fail
// above N%" lets brand-new copy-pasted components sneak in under the global
// number, and a flat 0% would turn 36 pre-existing clone pairs into
// permanent red. The ratchet instead answers the one reviewable question:
// did THIS change introduce new duplication?
//
//   - A clone pair (two files sharing a duplicated fragment, or one file
//     duplicating itself) that is NOT in the baseline → FAIL. This is the
//     "someone copied RepCard.tsx into NewCard.tsx and tweaked it" case.
//   - A baselined pair whose clone count grew, or whose duplicated line
//     count grew by more than LINE_SLACK → FAIL. LINE_SLACK exists because
//     jscpd's clone boundaries jitter by a line or two when surrounding
//     code shifts; without it, unrelated edits near a grandfathered clone
//     would flake the gate.
//   - Duplication that shrank or disappeared → PASS, with a printed nudge
//     to run `npm run dup:baseline` so the ratchet tightens. Improvement is
//     never punished with a red check.
//
// Intentional duplication (rare, e.g. a deliberate fork of a component
// mid-migration) is an explicit, auditable act: run `npm run dup:baseline`
// and justify the baseline diff in the PR — same spirit as parity-gate.ts's
// STRUCTURAL_WAIVERS ("an explicit, auditable exemption, not a heuristic").
//
// Usage:
//   npm run dup:check      — run jscpd + gate against the baseline (CI)
//   npm run dup:baseline   — regenerate the baseline from the current tree
//
// The jscpd run itself: .jscpd.json's threshold is 0, which makes bare
// `npx jscpd` exit non-zero on any duplication at all — useless as a gate
// (see above) but kept for ad-hoc local runs. This script overrides it with
// --threshold 100 so jscpd always exits 0 and the ratchet below is the only
// verdict. NOTE: jscpd v4's JSON report writes `tokens: 0` on every
// duplicate entry (verified against 4.0.5 directly), so the ratchet counts
// LINES, not tokens.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const REPORT_PATH = path.join(REPO_ROOT, ".jscpd-report/jscpd-report.json");
const BASELINE_PATH = path.join(SCRIPT_DIR, "duplication-baseline.json");

/** Allowed growth in a baselined pair's duplicated-line count before the
 *  gate fails — absorbs jscpd's clone-boundary jitter (a 21-line clone can
 *  re-detect as 22-23 lines when nearby code shifts), NOT a budget for
 *  actually writing more duplication: a new clone in the same pair raises
 *  the pair's clone COUNT, which has zero slack. */
export const LINE_SLACK = 5;

// -- jscpd report shapes (the subset this gate reads) -----------------------

interface JscpdFileRef {
  name: string;
  start: number;
  end: number;
}

interface JscpdDuplicate {
  lines: number;
  firstFile: JscpdFileRef;
  secondFile: JscpdFileRef;
}

export interface JscpdReport {
  duplicates: JscpdDuplicate[];
}

// -- baseline shapes ---------------------------------------------------------

export interface PairStats {
  /** Number of distinct clone fragments shared by this file pair. */
  clones: number;
  /** Total duplicated lines across those fragments. */
  lines: number;
}

export interface Baseline {
  /** Keyed by pairKey() — "fileA :: fileB" with the two names sorted. */
  pairs: Record<string, PairStats>;
}

/** Order-independent key for a clone's file pair (self-clones key as
 *  "file :: file"), so A→B and B→A detections never read as different
 *  pairs across runs. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(" :: ");
}

export function summarizeReport(
  report: JscpdReport,
): Record<string, PairStats> {
  const pairs: Record<string, PairStats> = {};
  for (const dup of report.duplicates) {
    const key = pairKey(dup.firstFile.name, dup.secondFile.name);
    const entry = (pairs[key] ??= { clones: 0, lines: 0 });
    entry.clones += 1;
    entry.lines += dup.lines;
  }
  return pairs;
}

export interface GateFinding {
  pair: string;
  kind: "new-pair" | "more-clones" | "more-lines";
  message: string;
}

export interface GateOutcome {
  failures: GateFinding[];
  /** Baselined pairs that shrank or vanished — candidates for tightening
   *  the baseline via `npm run dup:baseline`. */
  improvements: string[];
}

export function compareToBaseline(
  current: Record<string, PairStats>,
  baseline: Baseline,
): GateOutcome {
  const failures: GateFinding[] = [];
  const improvements: string[] = [];

  for (const [pair, stats] of Object.entries(current)) {
    const base = baseline.pairs[pair];
    if (!base) {
      failures.push({
        pair,
        kind: "new-pair",
        message:
          `NEW duplication between:\n    ${pair.split(" :: ").join("\n    ")}\n` +
          `  ${stats.clones} clone(s), ${stats.lines} duplicated lines — this file pair shares no duplication on main.`,
      });
      continue;
    }
    if (stats.clones > base.clones) {
      failures.push({
        pair,
        kind: "more-clones",
        message: `MORE clones in already-duplicated pair ${pair}: ${base.clones} → ${stats.clones}.`,
      });
    } else if (stats.lines > base.lines + LINE_SLACK) {
      failures.push({
        pair,
        kind: "more-lines",
        message: `GREW duplication in pair ${pair}: ${base.lines} → ${stats.lines} duplicated lines (slack ${LINE_SLACK}).`,
      });
    } else if (stats.clones < base.clones || stats.lines < base.lines) {
      improvements.push(pair);
    }
  }

  for (const pair of Object.keys(baseline.pairs)) {
    if (!current[pair]) improvements.push(pair);
  }

  return { failures, improvements };
}

// -- runner ------------------------------------------------------------------

function runJscpd(): JscpdReport {
  fs.rmSync(path.dirname(REPORT_PATH), { recursive: true, force: true });
  // --threshold 100 overrides .jscpd.json's 0 (CLI wins — verified) so the
  // jscpd process itself never fails; this gate's ratchet is the verdict.
  const result = spawnSync(
    "npx",
    ["jscpd", "--config", ".jscpd.json", "--threshold", "100", "--silent"],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`jscpd exited with status ${result.status}`);
  }
  if (!fs.existsSync(REPORT_PATH)) {
    throw new Error(`jscpd ran but wrote no report at ${REPORT_PATH}`);
  }
  return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) as JscpdReport;
}

function writeBaseline(pairs: Record<string, PairStats>): void {
  const sorted: Baseline = { pairs: {} };
  for (const key of Object.keys(pairs).sort()) sorted.pairs[key] = pairs[key];
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

function main(): void {
  const update = process.argv.includes("--update");
  const current = summarizeReport(runJscpd());

  if (update) {
    writeBaseline(current);
    console.log(
      `Baseline updated: ${Object.keys(current).length} pair(s) → ${path.relative(REPO_ROOT, BASELINE_PATH)}`,
    );
    console.log(
      "Commit the baseline diff and justify it in the PR if duplication grew.",
    );
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(
      `No baseline at ${path.relative(REPO_ROOT, BASELINE_PATH)} — run \`npm run dup:baseline\` and commit it.`,
    );
    process.exit(1);
  }
  const baseline = JSON.parse(
    fs.readFileSync(BASELINE_PATH, "utf8"),
  ) as Baseline;
  const { failures, improvements } = compareToBaseline(current, baseline);

  if (improvements.length > 0) {
    console.log(
      `Duplication SHRANK for ${improvements.length} baselined pair(s) — nice. ` +
        "Tighten the ratchet with `npm run dup:baseline` (optional but keeps the gate honest):",
    );
    for (const pair of improvements) console.log(`  - ${pair}`);
  }

  if (failures.length === 0) {
    console.log(
      `Duplication gate: PASS (${Object.keys(current).length} pair(s), all within baseline).`,
    );
    return;
  }

  console.error(`\nDuplication gate: FAIL — ${failures.length} finding(s):\n`);
  for (const f of failures) console.error(`- ${f.message}\n`);
  console.error(
    [
      "Fix: extract the shared markup/logic into one component or util instead of copying it.",
      "If this duplication is genuinely intentional (e.g. a deliberate mid-migration fork),",
      "run `npm run dup:baseline`, commit the baseline diff, and justify it in the PR —",
      "an explicit, auditable exemption, same spirit as parity-gate.ts's STRUCTURAL_WAIVERS.",
      "Clone locations: .jscpd-report/jscpd-report.json (or rerun without --silent via `npx jscpd --config .jscpd.json --threshold 100`).",
    ].join("\n"),
  );
  process.exit(1);
}

// Only run when executed directly — importing this module (tests) must not
// spawn jscpd. (parity-gate.ts's run-on-import behavior is documented as a
// hazard in gate-verdict.ts; don't repeat it here.)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}

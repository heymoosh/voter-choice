#!/usr/bin/env node
// scripts/design/gate-summary.ts
//
// Phase 3 of docs/operations/keystone-fidelity-fix-plan-2026-07-08.md — reads
// parity-gate.ts's report.json and prints the same pass/fail tally its own
// printReport() already computes (mirrors that file's overallPass()). Used by
// .github/workflows/design-parity.yml's review-gallery job to surface the
// gate's result in a PR comment.
//
// Deliberately duplicates overallPass() (11 lines) rather than importing it:
// parity-gate.ts's module body calls main() the instant it's imported (same
// reason capture-shared.ts's header warns off importing parity-gallery.ts
// directly) — importing it here would boot a second dev server + browser as
// a side effect of reading a report.
//
// Usage: npx tsx scripts/design/gate-summary.ts [path/to/report.json]
// Prints "<pass>/<total> gated scenarios passed" to stdout. When $GITHUB_OUTPUT
// is set, also appends `summary=...` to it for use in a later workflow step.

import fs from "node:fs";
import path from "node:path";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_REPORT = path.join(SCRIPT_DIR, ".parity-gate-out/report.json");

interface CheckResult {
  ran: boolean;
  pass?: boolean;
}
interface GateResult {
  captureError?: string;
  structural: CheckResult;
  visual: CheckResult;
}

function overallPass(r: GateResult): boolean | null {
  if (r.captureError) return false;
  const structuralOk = !r.structural.ran || r.structural.pass === true;
  const visualOk = !r.visual.ran || r.visual.pass === true;
  const anyRan = r.structural.ran || r.visual.ran;
  if (!anyRan) return null;
  return structuralOk && visualOk;
}

const reportPath = process.argv[2] ?? DEFAULT_REPORT;
let summary: string;
if (!fs.existsSync(reportPath)) {
  summary = "gate did not produce a report (see workflow run for details)";
} else {
  const results: GateResult[] = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const ran = results.filter((r) => overallPass(r) !== null);
  const passed = ran.filter((r) => overallPass(r) === true).length;
  summary = `${passed}/${ran.length} gated scenarios passed`;
}

console.log(summary);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary=${summary}\n`);
}

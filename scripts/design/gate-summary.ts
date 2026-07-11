#!/usr/bin/env node
// scripts/design/gate-summary.ts
//
// Phase 3 of docs/operations/keystone-fidelity-fix-plan-2026-07-08.md — reads
// parity-gate.ts's report.json and prints the same pass/fail tally its own
// printReport() already computes (mirrors that file's overallPass()). Used by
// .github/workflows/design-parity.yml's review-gallery job to surface the
// gate's result in a PR comment.
//
// Imports computeVerdict from gate-verdict.ts rather than parity-gate.ts
// itself: that file's module body calls main() the instant it's imported
// (same reason capture-shared.ts's header warns off importing
// parity-gallery.ts directly) — importing it here would boot a second dev
// server + browser as a side effect of reading a report. gate-verdict.ts has
// no such side effect, and is the SAME logic parity-gate.ts's own
// printReport() uses to compute the gate's exit code — this used to
// hand-duplicate a slightly different (and buggy — it silently ignored the
// CONTENT check entirely) copy of that logic; sharing one module means the
// two can no longer drift apart.
//
// Usage: npx tsx scripts/design/gate-summary.ts [path/to/report.json]
// Prints "<pass>/<total> gated scenarios passed" to stdout. When $GITHUB_OUTPUT
// is set, also appends `summary=...` to it for use in a later workflow step.

import fs from "node:fs";
import path from "node:path";
import { computeVerdict, type GateResultLike } from "./gate-verdict";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_REPORT = path.join(SCRIPT_DIR, ".parity-gate-out/report.json");

const reportPath = process.argv[2] ?? DEFAULT_REPORT;
let summary: string;
if (!fs.existsSync(reportPath)) {
  summary = "gate did not produce a report (see workflow run for details)";
} else {
  const results: GateResultLike[] = JSON.parse(
    fs.readFileSync(reportPath, "utf8"),
  );
  const verdicts = results.map(computeVerdict);
  const ran = verdicts.filter((v) => v.pass !== null);
  const passed = ran.filter((v) => v.pass === true).length;
  summary = `${passed}/${ran.length} gated scenarios passed`;
}

console.log(summary);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary=${summary}\n`);
}

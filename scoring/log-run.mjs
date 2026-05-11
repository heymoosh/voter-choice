#!/usr/bin/env node

/**
 * Append a one-section RUN_LOG.md entry recording a completed sub-agent
 * build. Inserts directly after the `## Completed` header so the most
 * recent run is always at the top of the completed list.
 *
 * Usage:
 *   node scoring/log-run.mjs \
 *     --phase 1 \
 *     --framework bmad \
 *     --replicate r1 \
 *     --branch experiment/bmad-r1 \
 *     --tag bmad-r1-phase1-complete \
 *     --status ok \
 *     --summary "lint 0/0, vitest 50/50 100%, playwright 42/42, LOC 1422"
 *
 * --replicate is optional (omit for forward-iteration phases).
 * --status is "ok" | "blocked" | "partial".
 *
 * Reads metrics/<branch>/phase<N>.json if present to add a one-line
 * metrics row beneath the summary.
 *
 * The script edits docs/RUN_LOG.md in place. Caller is responsible for
 * `git add docs/RUN_LOG.md && git commit && git push`.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);
function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const phase = argValue("--phase");
const framework = argValue("--framework");
const replicate = argValue("--replicate"); // optional
const branch = argValue("--branch");
const tag = argValue("--tag");
const status = argValue("--status") || "ok";
const summary = argValue("--summary") || "";
const repoArg = argValue("--repo");

if (!phase || !framework || !branch || !tag) {
  console.error(
    "Usage: log-run.mjs --phase <N> --framework <fw> [--replicate <r>] --branch <branch> --tag <tag> [--status ok|blocked|partial] [--summary '<text>']",
  );
  process.exit(2);
}

const ROOT = repoArg ? resolve(repoArg) : process.cwd();
const runLogPath = join(ROOT, "docs", "RUN_LOG.md");

if (!existsSync(runLogPath)) {
  console.error(`RUN_LOG.md not found at ${runLogPath}`);
  process.exit(2);
}

const phaseNum = Number(phase);
const isReplicate = replicate != null;
const title = isReplicate
  ? `Phase ${phase} replicate — ${framework} ${replicate} (auto)`
  : `Phase ${phase} forward — ${framework} (auto)`;

// Pull a few headline metrics from the matching phase JSON, if present.
let metricsLine = "";
const metricsPath = join(ROOT, "metrics", branch, `phase${phase}.json`);
if (existsSync(metricsPath)) {
  try {
    const m = JSON.parse(readFileSync(metricsPath, "utf-8"));
    const e2e =
      m.playwright?.passing != null && m.playwright?.total != null
        ? `e2e ${m.playwright.passing}/${m.playwright.total}`
        : null;
    const cov =
      typeof m.vitest?.coverage?.lines === "number"
        ? `coverage ${m.vitest.coverage.lines.toFixed(1)}%`
        : null;
    const loc = m.linesOfCode?.application?.code != null
      ? `LOC ${m.linesOfCode.application.code}`
      : null;
    const complex =
      typeof m.complexity?.average === "number"
        ? `complexity avg ${m.complexity.average.toFixed(2)} max ${m.complexity.max ?? "?"}`
        : null;
    const adherence =
      typeof m.diffHygiene?.scopeAdherence === "number"
        ? `scope adherence ${m.diffHygiene.scopeAdherence.toFixed(2)}`
        : null;
    metricsLine = [e2e, cov, loc, complex, adherence].filter(Boolean).join(", ");
  } catch (err) {
    // Soft failure — entry still records that the build happened
    metricsLine = `(could not parse ${metricsPath}: ${err.message})`;
  }
}

const statusBadge =
  status === "ok" ? "✓"
  : status === "blocked" ? "✗ BLOCKED"
  : status === "partial" ? "△ PARTIAL"
  : status;

const ts = new Date().toISOString();
const replicateLine = isReplicate
  ? `- **Replicate:** ${replicate}\n`
  : "";

const entry = `
### ${title}

- **Date:** ${ts}
- **Branch:** \`${branch}\`
- **Tag:** \`${tag}\`
- **Status:** ${statusBadge}
${replicateLine}- **Summary:** ${summary || "(no summary provided)"}
${metricsLine ? `- **Metrics:** ${metricsLine}\n` : ""}
`;

let runLog = readFileSync(runLogPath, "utf-8");

// Insert right after the first `## Completed` line so most recent is at top.
const completedMatch = runLog.match(/^## Completed\s*$/m);
if (!completedMatch) {
  console.error("RUN_LOG.md has no `## Completed` section — refusing to append blindly");
  process.exit(2);
}
const insertAt = completedMatch.index + completedMatch[0].length;
runLog = runLog.slice(0, insertAt) + "\n" + entry + runLog.slice(insertAt);

writeFileSync(runLogPath, runLog);
console.log(`Appended RUN_LOG entry: ${title}`);

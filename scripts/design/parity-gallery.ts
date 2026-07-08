#!/usr/bin/env node
// scripts/design/parity-gallery.ts
//
// Phase 4 of docs/operations/keystone-design-source-plan-2026-07.md — the
// standing before/after review artifact. Screenshots every app surface mapped
// to the 28 Keystone canvas artboards (.keystone-canvas-refs/manifest.json)
// at 1180px content width, for a "before" ref and an "after" ref, and emits
// an HTML gallery: one row per artboard — ref PNG | before | after — with a
// "changed in this PR" badge derived from `git diff --name-only <before>..
// <after>` (two-dot: a direct before/after content diff, not a three-dot
// merge-base diff — see scripts/design/PARITY-GALLERY-README.md for why that
// distinction matters).
//
// Usage (see PARITY-GALLERY-README.md for the full walkthrough):
//   npm run design:parity-gallery -- --before origin/main --after HEAD
//   npm run design:parity-gallery -- --before-url http://localhost:3100 --after-url http://localhost:3101
//   npm run design:parity-gallery -- --only 02a-results-main,05b-headtohead
//
// Design choice: refs are captured SEQUENTIALLY against ONE dev server (one
// git-worktree checkout + `next dev` at a time), not two servers running
// concurrently. That trades some wall-clock time for a much smaller surface
// of things that can go wrong (port/env coordination, double the memory) —
// reasonable for a manual/PR-review tool that isn't on a CI critical path.
// When --before/--after resolve to the SAME commit (e.g. comparing a ref to
// itself), no worktree is created at all — the current checkout is reused
// directly for both sides. Pass --before-url/--after-url to skip server
// bring-up entirely if you already have two dev servers running.

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { SCENARIOS, type Scenario } from "./parity-gallery-scenarios";
import { type AppInstance } from "./dev-server";
import {
  captureScenarios,
  changedFiles,
  git,
  resolveAppInstance,
  revParse,
  type ScenarioResult,
} from "./capture-shared";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const REFS_DIR = path.join(REPO_ROOT, ".keystone-canvas-refs");

interface Args {
  before: string;
  after: string;
  beforeUrl?: string;
  afterUrl?: string;
  out: string;
  only?: string[];
  headed: boolean;
  keepServers: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      before: { type: "string", default: "origin/main" },
      after: { type: "string", default: "HEAD" },
      "before-url": { type: "string" },
      "after-url": { type: "string" },
      out: {
        type: "string",
        default: path.join(SCRIPT_DIR, ".parity-gallery-out"),
      },
      only: { type: "string" },
      headed: { type: "boolean", default: false },
      "keep-servers": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      [
        "Usage: npm run design:parity-gallery -- [options]",
        "",
        "  --before <ref>       git ref for the 'before' side (default: origin/main)",
        "  --after <ref>        git ref for the 'after' side (default: HEAD)",
        "  --before-url <url>   use an already-running server instead of checking out --before",
        "  --after-url <url>    use an already-running server instead of checking out --after",
        "  --out <dir>          output directory (default: scripts/design/.parity-gallery-out)",
        "  --only <ids>         comma-separated scenario ids to run (default: all 28)",
        "  --headed             run the browser headed (debugging)",
        "  --keep-servers       don't tear down spawned dev servers / worktrees on exit",
      ].join("\n"),
    );
    process.exit(0);
  }
  return {
    before: values.before as string,
    after: values.after as string,
    beforeUrl: values["before-url"] as string | undefined,
    afterUrl: values["after-url"] as string | undefined,
    out: path.resolve(values.out as string),
    only: values.only
      ? (values.only as string).split(",").map((s) => s.trim())
      : undefined,
    headed: values.headed as boolean,
    keepServers: values["keep-servers"] as boolean,
  };
}

// ---------------------------------------------------------------------------
// gallery HTML
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Copies every referenced ref PNG into <out>/refs/ so the gallery is a
 *  self-contained directory with no ".." in any <img src>. Chrome (and most
 *  browsers) refuse to load file:// resources reached via parent-directory
 *  traversal from a locally-opened HTML file — linking straight at
 *  .keystone-canvas-refs/ two directories up would render as broken images. */
function copyRefsIntoOut(outDir: string, scenarios: Scenario[]): void {
  const refsOut = path.join(outDir, "refs");
  fs.mkdirSync(refsOut, { recursive: true });
  for (const s of scenarios) {
    if (!s.refFile) continue;
    const src = path.join(REFS_DIR, s.refFile);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(refsOut, s.refFile));
    }
  }
}

function buildGalleryHtml(
  outDir: string,
  scenarios: Scenario[],
  before: Record<string, ScenarioResult>,
  after: Record<string, ScenarioResult>,
  changed: string[],
  meta: { beforeRef: string; afterRef: string; generatedAt: string },
): string {
  const rows = scenarios
    .map((s) => {
      const refCopied =
        !!s.refFile && fs.existsSync(path.join(outDir, "refs", s.refFile));
      const refCell = refCopied
        ? `<img src="${esc(`refs/${s.refFile}`)}" alt="ref">`
        : s.refFile
          ? `<div class="missing">ref PNG missing</div>`
          : `<div class="missing">no canvas export — not yet built on this branch</div>`;

      const cell = (r: ScenarioResult) => {
        if (r.status === "ok") {
          const rel = path.relative(outDir, r.file); // e.g. "before/01-….png"
          return `<img src="${esc(rel)}" alt="${esc(s.id)}">`;
        }
        if (r.status === "not-automatable")
          return `<div class="not-automatable">not automatable</div>`;
        return `<div class="error">capture failed:<br>${esc(r.error)}</div>`;
      };

      const isChanged = s.files.some((f) =>
        changed.some((cf) => cf.includes(f)),
      );
      const badge =
        s.automatable === "no"
          ? ""
          : isChanged
            ? `<span class="badge changed">changed in this PR</span>`
            : `<span class="badge unchanged">unchanged</span>`;

      const autoBadge =
        s.automatable === "yes"
          ? `<span class="tag yes">automated</span>`
          : s.automatable === "proxy"
            ? `<span class="tag proxy">proxy</span>`
            : `<span class="tag no">not automatable</span>`;

      return `
      <tr>
        <td class="meta">
          <div class="id">${esc(s.id)}</div>
          <div class="label">${esc(s.label)}</div>
          ${badge}
          ${autoBadge}
          <div class="note">${esc(s.note)}</div>
        </td>
        <td class="shot">${refCell}</td>
        <td class="shot">${cell(before[s.id])}</td>
        <td class="shot">${cell(after[s.id])}</td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Keystone parity gallery</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; background: #f6f7f8; color: #1a1a1a; }
  @media (prefers-color-scheme: dark) { body { background: #14161a; color: #e8e8e8; } }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; padding: 8px; position: sticky; top: 0; background: #f6f7f8; }
  @media (prefers-color-scheme: dark) { th { background: #14161a; } }
  td { border-top: 1px solid #ddd; padding: 10px 8px; vertical-align: top; }
  @media (prefers-color-scheme: dark) { td { border-top: 1px solid #333; } }
  td.meta { width: 240px; font-size: 12px; }
  td.meta .id { font-weight: 600; font-family: ui-monospace, monospace; }
  td.meta .label { color: #555; margin: 2px 0 6px; }
  @media (prefers-color-scheme: dark) { td.meta .label { color: #aaa; } }
  td.meta .note { color: #777; margin-top: 6px; line-height: 1.4; }
  td.shot { width: 25%; }
  td.shot img { width: 100%; height: auto; border: 1px solid #ccc; display: block; }
  @media (prefers-color-scheme: dark) { td.shot img { border-color: #444; } }
  .missing, .error, .not-automatable { font-size: 12px; padding: 10px; border: 1px dashed #999; color: #999; }
  .error { color: #b3261e; border-color: #b3261e33; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-right: 4px; }
  .badge.changed { background: #ffe1a8; color: #7a4b00; }
  .badge.unchanged { background: #e5e5e5; color: #666; }
  @media (prefers-color-scheme: dark) { .badge.unchanged { background: #333; color: #aaa; } }
  .tag { display: inline-block; font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-right: 4px; text-transform: uppercase; }
  .tag.yes { background: #d7f0d7; color: #1e6b1e; }
  .tag.proxy { background: #fff0c2; color: #7a5c00; }
  .tag.no { background: #f5d5d5; color: #8a1f1f; }
</style>
</head>
<body>
  <h1>Keystone parity gallery</h1>
  <div class="sub">before: <code>${esc(meta.beforeRef)}</code> · after: <code>${esc(meta.afterRef)}</code> · generated ${esc(meta.generatedAt)}</div>
  <table>
    <thead><tr><th>Artboard</th><th>Reference</th><th>Before</th><th>After</th></tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function printSummary(
  scenarios: Scenario[],
  beforeResults: Record<string, ScenarioResult>,
  afterResults: Record<string, ScenarioResult>,
  indexPath: string,
): void {
  const yes = scenarios.filter((s) => s.automatable === "yes").length;
  const proxy = scenarios.filter((s) => s.automatable === "proxy").length;
  const no = scenarios.filter((s) => s.automatable === "no").length;
  const errors = scenarios.filter(
    (s) =>
      beforeResults[s.id]?.status === "error" ||
      afterResults[s.id]?.status === "error",
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Gallery: ${indexPath}`);
  console.log(
    `Coverage: ${yes}/${scenarios.length} automated · ${proxy}/${scenarios.length} proxy · ${no}/${scenarios.length} not automatable`,
  );
  if (errors.length > 0) {
    console.log(`\nCapture errors (${errors.length}):`);
    for (const s of errors) {
      const b = beforeResults[s.id];
      const a = afterResults[s.id];
      if (b?.status === "error")
        console.log(`  [before] ${s.id}: ${b.error.split("\n")[0]}`);
      if (a?.status === "error")
        console.log(`  [after]  ${s.id}: ${a.error.split("\n")[0]}`);
    }
  }
  const notAuto = scenarios.filter((s) => s.automatable === "no");
  if (notAuto.length > 0) {
    console.log(`\nNot automatable (${notAuto.length}):`);
    for (const s of notAuto) console.log(`  ${s.id}: ${s.note}`);
  }
  console.log(`${"=".repeat(60)}\n`);
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const scenarios = args.only
    ? SCENARIOS.filter((s) => args.only!.includes(s.id))
    : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(
      "No scenarios matched --only; check the ids against .keystone-canvas-refs/manifest.json.",
    );
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const headSha = git(["rev-parse", "HEAD"]);

  console.log(
    `Resolving app instances (before="${args.before}", after="${args.after}")…`,
  );

  const beforeSha = args.beforeUrl ? null : revParse(args.before);
  const afterSha = args.afterUrl ? null : revParse(args.after);
  const sameCommit =
    !args.beforeUrl &&
    !args.afterUrl &&
    beforeSha !== null &&
    beforeSha === afterSha;

  let before: AppInstance;
  let after: AppInstance;
  // Track cleanup fns as each side comes up (rather than after both
  // resolve) so that if the SECOND side fails to boot, the first side's
  // dev server + temp worktree still get torn down instead of leaking —
  // this whole block runs inside the try below so a throw here still hits
  // the shared `finally`.
  const cleanupFns: Array<() => Promise<void>> = [];
  try {
    if (sameCommit) {
      console.log(
        `  "${args.before}" and "${args.after}" resolve to the same commit (${beforeSha!.slice(0, 8)}) — ` +
          `starting ONE server and using it for both sides.`,
      );
      before = await resolveAppInstance(
        "before",
        args.beforeUrl,
        args.before,
        headSha,
      );
      cleanupFns.push(before.cleanup);
      after = { ...before, label: "after" };
    } else {
      before = await resolveAppInstance(
        "before",
        args.beforeUrl,
        args.before,
        headSha,
      );
      cleanupFns.push(before.cleanup);
      after = await resolveAppInstance(
        "after",
        args.afterUrl,
        args.after,
        headSha,
      );
      cleanupFns.push(after.cleanup);
    }

    console.log(`\nLaunching browser…`);
    const browser = await chromium.launch({ headless: !args.headed });
    try {
      console.log(`\nCapturing "before" (${before.url})…`);
      const beforeOut = path.join(args.out, "before");
      const beforeResults = await captureScenarios(
        browser,
        before,
        beforeOut,
        scenarios,
      );

      console.log(`\nCapturing "after" (${after.url})…`);
      const afterOut = path.join(args.out, "after");
      const afterResults = await captureScenarios(
        browser,
        after,
        afterOut,
        scenarios,
      );

      const changed =
        beforeSha && afterSha ? changedFiles(beforeSha, afterSha) : [];

      copyRefsIntoOut(args.out, scenarios);
      const html = buildGalleryHtml(
        args.out,
        scenarios,
        beforeResults,
        afterResults,
        changed,
        {
          beforeRef: args.beforeUrl
            ? args.beforeUrl
            : `${args.before} (${beforeSha?.slice(0, 8)})`,
          afterRef: args.afterUrl
            ? args.afterUrl
            : `${args.after} (${afterSha?.slice(0, 8)})`,
          generatedAt: new Date().toISOString(),
        },
      );
      const indexPath = path.join(args.out, "index.html");
      fs.writeFileSync(indexPath, html);

      printSummary(scenarios, beforeResults, afterResults, indexPath);
    } finally {
      await browser.close();
    }
  } finally {
    if (!args.keepServers) {
      for (const fn of cleanupFns) await fn();
    } else {
      console.log(
        "--keep-servers set: leaving spawned dev servers/worktrees running.",
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

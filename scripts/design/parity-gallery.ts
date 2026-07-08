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

import { chromium, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseArgs } from "node:util";
import { SCENARIOS, type Scenario } from "./parity-gallery-scenarios";
import { type AppInstance, getFreePort, startNextDev } from "./dev-server";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const REFS_DIR = path.join(REPO_ROOT, ".keystone-canvas-refs");
const VIEWPORT = { width: 1180, height: 1000 };

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
// git helpers
// ---------------------------------------------------------------------------

function git(args: string[], cwd = REPO_ROOT): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function revParse(ref: string): string {
  try {
    return git(["rev-parse", ref]);
  } catch {
    throw new Error(
      `Could not resolve git ref "${ref}" from ${REPO_ROOT}. Pass --before/--after a valid ` +
        `ref, or use --before-url/--after-url to bypass ref resolution entirely.`,
    );
  }
}

/** Two-dot diff (direct before/after content diff), not three-dot (merge-base) —
 *  a three-dot diff against the merge-base can mis-attribute a sibling PR's
 *  already-landed change on "before" to this comparison. See PARITY-GALLERY-README.md. */
function changedFiles(beforeSha: string, afterSha: string): string[] {
  if (beforeSha === afterSha) return [];
  return git(["diff", "--name-only", beforeSha, afterSha])
    .split("\n")
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// dev server bring-up (getFreePort/startNextDev/AppInstance now live in
// ./dev-server, shared with parity-gate.ts) — resolveSide below is the
// before/after-specific layer on top: which ref maps to which server.
// ---------------------------------------------------------------------------

async function resolveSide(
  label: "before" | "after",
  explicitUrl: string | undefined,
  ref: string,
  headSha: string,
): Promise<AppInstance> {
  if (explicitUrl) {
    return { url: explicitUrl, label, cleanup: async () => {} };
  }
  const sha = revParse(ref);
  if (sha === headSha) {
    console.log(
      `  [${label}] "${ref}" resolves to the current worktree's HEAD — no checkout needed.`,
    );
    const port = await getFreePort();
    return startNextDev(REPO_ROOT, port, label);
  }

  console.log(
    `  [${label}] "${ref}" (${sha.slice(0, 8)}) differs from HEAD — checking out a temp worktree…`,
  );
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `parity-gallery-${label}-`),
  );
  try {
    git(["worktree", "add", "--detach", tmpDir, sha]);
    // Reuse installed deps rather than a fresh `npm install` — fine for a
    // same-repo before/after design comparison where deps rarely move.
    const nodeModules = path.join(REPO_ROOT, "node_modules");
    if (fs.existsSync(nodeModules)) {
      fs.symlinkSync(nodeModules, path.join(tmpDir, "node_modules"), "dir");
    }
    const envLocal = path.join(REPO_ROOT, ".env.local");
    if (fs.existsSync(envLocal)) {
      fs.copyFileSync(envLocal, path.join(tmpDir, ".env.local"));
    }
    const port = await getFreePort();
    const inst = await startNextDev(tmpDir, port, label);
    return {
      ...inst,
      async cleanup() {
        await inst.cleanup();
        try {
          git(["worktree", "remove", "--force", tmpDir]);
        } catch (err) {
          console.warn(
            `  ↳ could not remove temp worktree ${tmpDir}: ${String(err)}`,
          );
        }
      },
    };
  } catch (err) {
    // The dev server (or the worktree/symlink setup before it) failed —
    // don't leave a registered git worktree / temp dir behind.
    try {
      git(["worktree", "remove", "--force", tmpDir]);
    } catch {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------

type ScenarioResult =
  | { status: "ok"; file: string }
  | { status: "error"; error: string }
  | { status: "not-automatable" };

async function captureSide(
  browser: import("@playwright/test").Browser,
  instance: AppInstance,
  outDir: string,
  scenarios: Scenario[],
): Promise<Record<string, ScenarioResult>> {
  fs.mkdirSync(outDir, { recursive: true });
  const results: Record<string, ScenarioResult> = {};
  for (const scenario of scenarios) {
    if (scenario.automatable === "no" || !scenario.capture) {
      results[scenario.id] = { status: "not-automatable" };
      continue;
    }
    const context = await browser.newContext({
      viewport: VIEWPORT,
      baseURL: instance.url,
    });
    const page: Page = await context.newPage();
    try {
      await scenario.capture(page);
      const file = path.join(outDir, `${scenario.id}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results[scenario.id] = { status: "ok", file };
      console.log(`  [${instance.label}] ${scenario.id} ✓`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[scenario.id] = { status: "error", error: message };
      console.log(
        `  [${instance.label}] ${scenario.id} ✗ ${message.split("\n")[0]}`,
      );
    } finally {
      await context.close();
    }
  }
  return results;
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
      const refCopied = fs.existsSync(path.join(outDir, "refs", s.refFile));
      const refCell = refCopied
        ? `<img src="${esc(`refs/${s.refFile}`)}" alt="ref">`
        : `<div class="missing">ref PNG missing</div>`;

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
      before = await resolveSide(
        "before",
        args.beforeUrl,
        args.before,
        headSha,
      );
      cleanupFns.push(before.cleanup);
      after = { ...before, label: "after" };
    } else {
      before = await resolveSide(
        "before",
        args.beforeUrl,
        args.before,
        headSha,
      );
      cleanupFns.push(before.cleanup);
      after = await resolveSide("after", args.afterUrl, args.after, headSha);
      cleanupFns.push(after.cleanup);
    }

    console.log(`\nLaunching browser…`);
    const browser = await chromium.launch({ headless: !args.headed });
    try {
      console.log(`\nCapturing "before" (${before.url})…`);
      const beforeOut = path.join(args.out, "before");
      const beforeResults = await captureSide(
        browser,
        before,
        beforeOut,
        scenarios,
      );

      console.log(`\nCapturing "after" (${after.url})…`);
      const afterOut = path.join(args.out, "after");
      const afterResults = await captureSide(
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

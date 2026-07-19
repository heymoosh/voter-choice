// scripts/design/capture-shared.ts
//
// The single screenshot-capture path shared by parity-gallery.ts (before/
// after diff) and review-gallery.ts (single-branch review artifact, Phase 1
// of docs/operations/keystone-fidelity-fix-plan-2026-07-08.md). Centralizing
// this means both tools get scroll-trap handling for free instead of each
// carrying its own (partial) full-page capture logic.
//
// Also hosts the git-ref → running-app-instance resolution (resolveAppInstance)
// that both tools need, so it lives in a plain library module with no
// top-level side effects — parity-gallery.ts's own file runs a `main()` the
// moment it's imported, so review-gallery.ts must NOT import from it directly.

import { type Browser, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseArgs } from "node:util";
import { type AppInstance, getFreePort, startNextDev } from "./dev-server";
import { type Scenario } from "./parity-gallery-scenarios";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");

export const VIEWPORT = { width: 1180, height: 1000 };

// ---------------------------------------------------------------------------
// design-sync bundle CLI/entry helpers — shared by design-sync-extract.ts,
// design-sync-page-extract.ts, and design-sync-render-check.ts, each of
// which drives a different capture pass over the same on-disk bundle.
// ---------------------------------------------------------------------------

/** repo root, derived from a script's own `import.meta.url` (every
 *  design-sync script lives directly under scripts/design/). */
export function repoRootFromScriptUrl(importMetaUrl: string): string {
  const scriptDir = path.dirname(new URL(importMetaUrl).pathname);
  return path.resolve(scriptDir, "../..");
}

export function defaultBundleDir(repoRoot: string): string {
  return path.resolve(repoRoot, "../design-sync-bundle");
}

/** Resolve --bundle-dir → $DESIGN_SYNC_BUNDLE_DIR → the repo-relative
 *  default, in that order. */
export function resolveBundleDirArg(
  bundleDirArg: string | undefined,
  defaultDir: string,
): string {
  return path.resolve(
    bundleDirArg || process.env.DESIGN_SYNC_BUNDLE_DIR || defaultDir,
  );
}

export interface CommonCliArgs {
  only: string[] | undefined;
  list: boolean;
  bundleDir: string;
  headed: boolean;
}

/** The --only/--list/--bundle-dir/--headed flags every design-sync capture
 *  script accepts. Extra parseArgs `options` (e.g. extract.ts's --help)
 *  merge in via `extraOptions`; the caller reads those off the returned raw
 *  `values` object. */
export function parseCommonCliArgs(
  defaultDir: string,
  extraOptions: Record<
    string,
    { type: "string" | "boolean"; default?: string | boolean }
  > = {},
): CommonCliArgs & { values: Record<string, unknown> } {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      list: { type: "boolean", default: false },
      "bundle-dir": { type: "string" },
      headed: { type: "boolean", default: false },
      ...extraOptions,
    },
  });
  return {
    values,
    only: values.only
      ? (values.only as string).split(",").map((s) => s.trim())
      : undefined,
    list: values.list as boolean,
    bundleDir: resolveBundleDirArg(
      values["bundle-dir"] as string | undefined,
      defaultDir,
    ),
    headed: values.headed as boolean,
  };
}

/** Stylesheet <link> hrefs pointing at the bundle's own copied CSS
 *  (…/assets/*.css) — checked against network-response status to confirm
 *  each sheet actually loaded. Shared by the off-disk render checker
 *  (components) and page checker (full screens). */
export async function collectAssetStylesheetHrefs(
  page: Page,
): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => (l as HTMLLinkElement).href)
      .filter((h) => h.includes("/assets/") && h.endsWith(".css")),
  );
}

export type CheckStatus = "ok" | "thin" | "bad";

export function statusTag(status: CheckStatus): string {
  return status === "ok" ? "✓" : status === "thin" ? "~" : "✗";
}

/** One-line "  ✓ id (WxH) — issue; issue" progress log, shared by every
 *  bundle checker. */
export function logCheckResult(
  id: string,
  status: CheckStatus,
  width: number,
  height: number,
  issues: string[],
): void {
  console.log(
    `  ${statusTag(status)} ${id} (${width}×${height})${issues.length ? " — " + issues.join("; ") : ""}`,
  );
}

/** Common CLI-entry tail: log where the summary landed, and set the
 *  process's exit code non-zero when anything came back "bad". */
export function finishSummary(summaryPath: string, bad: number): void {
  console.log(`Summary written to ${summaryPath}`);
  if (bad > 0) process.exitCode = 1;
}

/** Run a script's async main() with the standard top-level error handler
 *  every design-sync script's `main().catch(...)` tail uses. */
export function runCli(main: () => Promise<void>): void {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// git helpers
// ---------------------------------------------------------------------------

export function git(args: string[], cwd = REPO_ROOT): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function revParse(ref: string): string {
  try {
    return git(["rev-parse", ref]);
  } catch {
    throw new Error(
      `Could not resolve git ref "${ref}" from ${REPO_ROOT}. Pass a valid ref, or use an ` +
        `explicit --*-url flag to bypass ref resolution entirely.`,
    );
  }
}

/** Two-dot diff (direct content diff between two SHAs), not three-dot
 *  (merge-base) — a three-dot diff can mis-attribute a sibling branch's
 *  already-landed change to this comparison. See PARITY-GALLERY-README.md. */
export function changedFiles(fromSha: string, toSha: string): string[] {
  if (fromSha === toSha) return [];
  return git(["diff", "--name-only", fromSha, toSha])
    .split("\n")
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// dev server bring-up: resolve a git ref (or explicit URL) to a running
// AppInstance, checking out a temp worktree only when the ref differs from
// the current worktree's HEAD.
// ---------------------------------------------------------------------------

export async function resolveAppInstance(
  label: string,
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `capture-${label}-`));
  try {
    git(["worktree", "add", "--detach", tmpDir, sha]);
    // Reuse installed deps rather than a fresh `npm install` — fine for a
    // same-repo comparison where deps rarely move across a design PR.
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

export type ScenarioResult =
  | { status: "ok"; file: string }
  | { status: "error"; error: string }
  | { status: "not-automatable" };

/** Some layouts (e.g. the Results workspace's sticky-sidebar shell,
 *  `.ws-shell` in public/prototype-c.css: `height: 100vh; overflow: hidden`)
 *  scroll their content INTERNALLY instead of letting the document itself
 *  grow — so `page.screenshot({ fullPage: true })`, which measures the
 *  document's own scroll height, never sees content trapped inside them.
 *  Confirmed empirically (see docs/operations/keystone-phase0-findings-
 *  2026-07-08.md): 02a-results-main captured at exactly 1180×1000 (the
 *  viewport) instead of its true ~2000px content height.
 *
 *  Detects any such container generically — large enough to matter,
 *  genuinely clipping content — rather than hardcoding `.ws-shell`, so this
 *  keeps working if the trap moves or a new one appears elsewhere. Run this
 *  right before the final screenshot, on a throwaway page/context, so there's
 *  nothing to restore afterward. */
export async function neutralizeScrollTraps(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Multiple passes: neutralizing an outer clipping ancestor can reveal
    // that an inner "auto" region (which previously fit its clipped
    // content exactly) NOW has more content than fits — e.g. a nested
    // sticky-sidebar shell inside another sticky-sidebar shell. Re-scan
    // until a pass finds nothing new to fix (bounded so a pathological
    // layout can't loop forever).
    for (let pass = 0; pass < 5; pass++) {
      const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
      const traps = all.filter((el) => {
        const cs = getComputedStyle(el);
        // Not just `hidden`: an `overflow-y: auto`/`scroll` region (e.g.
        // the Results workspace's `.ws-chat .body`) is EXACTLY as invisible
        // to `page.screenshot({ fullPage: true })` as `hidden` is — the
        // document's own scroll height never reflects content scrolled
        // inside a nested region, regardless of whether that region shows
        // a scrollbar. `visible` (and the rare `clip`) are the only values
        // that don't trap content this way.
        const clips =
          cs.overflowY === "hidden" ||
          cs.overflowY === "auto" ||
          cs.overflowY === "scroll";
        if (!clips) return false;
        const hiddenAmount = el.scrollHeight - el.clientHeight;
        // Skip tiny/decorative elements (truncated text spans, tooltips) —
        // only containers that are both sizeable and genuinely clipping
        // meaningful content count as a "trap" worth forcing open.
        return el.clientHeight > 40 && hiddenAmount > 20;
      });
      if (traps.length === 0) break;
      for (const el of traps) {
        el.style.setProperty("overflow-y", "visible", "important");
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("max-height", "none", "important");
      }
    }
  });
}

export async function captureScenarios(
  browser: Browser,
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
      await neutralizeScrollTraps(page);
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

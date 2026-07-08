#!/usr/bin/env node
// scripts/design/review-gallery.ts
//
// Phase 1 of docs/operations/keystone-fidelity-fix-plan-2026-07-08.md — the
// review artifact Muxin actually uses to check Keystone canvas fidelity.
// Replaces the old `keystone-contact-sheet.html` approach (a 15MB single
// file with 56 base64-inlined images, screenshots viewport-cropped at
// ~900px instead of full-page, and silent coverage holes — see
// docs/operations/keystone-parity-failure-handoff-2026-07-08.md).
//
// Unlike parity-gallery.ts (which diffs a "before" ref against an "after"
// ref), this captures ONE checkout — whatever branch you point it at — and
// emits an index page + one HTML page per section, each showing every
// scenario in that section as a reference-artboard | repo-screenshot pair.
// Images are separate committed PNGs (no base64), so every page stays small
// and loads instantly regardless of how many screenshots it references.
//
// Usage:
//   npm run design:review-gallery                        # current checkout
//   npm run design:review-gallery -- --ref wt/some-branch # a specific ref
//   npm run design:review-gallery -- --url http://localhost:3100
//   npm run design:review-gallery -- --only 02a-results-main,05b-headtohead
//
// Output defaults to docs/design-review/ — committed to the repo (pure
// relative paths, no dependency on any worktree that could go EPERM-stale).
// Regenerate any time by re-running the npm script above against whichever
// branch you're reviewing.

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { SCENARIOS, type Scenario } from "./parity-gallery-scenarios";
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
const DEFAULT_OUT = path.join(REPO_ROOT, "docs/design-review");

// Purely presentational grouping of the flat SCENARIOS list into the named
// sections Muxin actually reviews by (Results, Scorecard, Candidates, …).
const SECTIONS: Array<{ slug: string; title: string; prefix: string }> = [
  { slug: "orientation", title: "Orientation", prefix: "01" },
  { slug: "results", title: "Results (workspace)", prefix: "02" },
  { slug: "color", title: "Color", prefix: "03" },
  { slug: "scorecard", title: "Scorecard", prefix: "04" },
  { slug: "candidates", title: "Candidates", prefix: "05" },
  { slug: "homepage", title: "Homepage", prefix: "06" },
  { slug: "whynow", title: "Why Now", prefix: "07" },
  {
    slug: "statics",
    title: "Statics (About / How it works / Privacy / Tip jar / Loading)",
    prefix: "08",
  },
  { slug: "intake", title: "Intake", prefix: "09" },
  { slug: "polis", title: "Polis", prefix: "10" },
  { slug: "moneygap", title: "Money-gap", prefix: "11" },
];

function sectionFor(scenario: Scenario): (typeof SECTIONS)[number] {
  const section = SECTIONS.find((s) => scenario.id.startsWith(s.prefix));
  if (!section) {
    throw new Error(
      `Scenario "${scenario.id}" doesn't match any SECTIONS prefix — add one in review-gallery.ts.`,
    );
  }
  return section;
}

interface Args {
  ref: string;
  url?: string;
  base: string;
  out: string;
  only?: string[];
  headed: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      ref: { type: "string", default: "HEAD" },
      url: { type: "string" },
      base: { type: "string", default: "origin/main" },
      out: { type: "string", default: DEFAULT_OUT },
      only: { type: "string" },
      headed: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      [
        "Usage: npm run design:review-gallery -- [options]",
        "",
        "  --ref <gitref>    git ref to capture (default: HEAD, i.e. the current checkout)",
        "  --url <url>       use an already-running server instead of checking out --ref",
        "  --base <gitref>   ref to diff against for 'changed since base' badges (default: origin/main)",
        "  --out <dir>       output directory (default: docs/design-review)",
        "  --only <ids>      comma-separated scenario ids to run (default: all)",
        "  --headed          run the browser headed (debugging)",
      ].join("\n"),
    );
    process.exit(0);
  }
  return {
    ref: values.ref as string,
    url: values.url as string | undefined,
    base: values.base as string,
    out: path.resolve(values.out as string),
    only: values.only
      ? (values.only as string).split(",").map((s) => s.trim())
      : undefined,
    headed: values.headed as boolean,
  };
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const PAGE_STYLE = `
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; background: #f6f7f8; color: #1a1a1a; }
  @media (prefers-color-scheme: dark) { body { background: #14161a; color: #e8e8e8; } }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 0; }
  a { color: #1e5b8f; }
  @media (prefers-color-scheme: dark) { a { color: #7ab8ea; } }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  @media (prefers-color-scheme: dark) { .sub { color: #999; } }
  .nav-links { margin: 16px 0; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; padding: 8px; }
  td { border-top: 1px solid #ddd; padding: 10px 8px; vertical-align: top; }
  @media (prefers-color-scheme: dark) { td { border-top: 1px solid #333; } }
  td.meta { width: 260px; font-size: 12px; }
  td.meta .id { font-weight: 600; font-family: ui-monospace, monospace; }
  td.meta .label { color: #555; margin: 2px 0 6px; }
  @media (prefers-color-scheme: dark) { td.meta .label { color: #aaa; } }
  td.meta .note { color: #777; margin-top: 6px; line-height: 1.4; }
  td.shot { width: 37.5%; }
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
  .cov { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
  .cov-tile { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; font-size: 13px; }
  @media (prefers-color-scheme: dark) { .cov-tile { border-color: #333; } }
  .cov-tile b { font-size: 18px; display: block; }
  .section-list { list-style: none; padding: 0; margin: 0; }
  .section-list li { border-top: 1px solid #ddd; padding: 12px 4px; display: flex; align-items: center; justify-content: space-between; }
  @media (prefers-color-scheme: dark) { .section-list li { border-color: #333; } }
  .section-list a { font-size: 15px; font-weight: 600; text-decoration: none; }
  .section-list .counts { font-size: 12px; color: #777; }
`;

function pageShell(title: string, sub: string, body: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="sub">${sub}</div>
  ${body}
</body>
</html>`;
}

function statusOf(
  r: ScenarioResult | undefined,
): "ok" | "error" | "not-automatable" | "missing" {
  if (!r) return "missing";
  return r.status;
}

function shotCell(
  outDir: string,
  screenshotsDir: string,
  r: ScenarioResult | undefined,
): string {
  const status = statusOf(r);
  if (status === "ok" && r!.status === "ok") {
    const rel = path.relative(outDir, r!.file);
    return `<img src="${esc(rel)}" alt="repo screenshot">`;
  }
  if (status === "not-automatable") {
    return `<div class="not-automatable">not automatable — see note</div>`;
  }
  if (status === "error" && r!.status === "error") {
    return `<div class="error">capture failed:<br>${esc(r!.error)}</div>`;
  }
  return `<div class="missing">not captured</div>`;
}

function refCell(outDir: string, scenario: Scenario): string {
  if (!scenario.refFile) {
    return `<div class="missing">no canvas export — not yet built on this branch (see note)</div>`;
  }
  const refPath = path.join(outDir, "screenshots", "refs", scenario.refFile);
  if (!fs.existsSync(refPath)) {
    return `<div class="missing">ref PNG missing</div>`;
  }
  return `<img src="${esc(path.relative(outDir, refPath))}" alt="reference artboard">`;
}

function buildSectionPage(
  section: (typeof SECTIONS)[number],
  scenarios: Scenario[],
  results: Record<string, ScenarioResult>,
  changed: string[],
  outDir: string,
  meta: { ref: string; generatedAt: string },
): string {
  const rows = scenarios
    .map((s) => {
      const isChanged = s.files.some((f) =>
        changed.some((cf) => cf.includes(f)),
      );
      const badge =
        s.automatable === "no"
          ? ""
          : isChanged
            ? `<span class="badge changed">changed since base</span>`
            : `<span class="badge unchanged">unchanged since base</span>`;
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
        <td class="shot">${refCell(outDir, s)}</td>
        <td class="shot">${shotCell(outDir, path.join(outDir, "screenshots", "repo"), results[s.id])}</td>
      </tr>`;
    })
    .join("\n");

  const body = `
  <div class="nav-links"><a href="index.html">&larr; back to index</a></div>
  <table>
    <thead><tr><th>Scenario</th><th>Reference artboard</th><th>Repo (${esc(meta.ref)})</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="nav-links"><a href="index.html">&larr; back to index</a></div>`;

  return pageShell(
    `Keystone review — ${section.title}`,
    `ref: <code>${esc(meta.ref)}</code> &middot; generated ${esc(meta.generatedAt)}`,
    body,
  );
}

function buildIndexPage(
  results: Record<string, ScenarioResult>,
  changed: string[],
  meta: { ref: string; refSha: string; base: string; generatedAt: string },
): string {
  const automated = SCENARIOS.filter((s) => s.automatable === "yes").length;
  const proxy = SCENARIOS.filter((s) => s.automatable === "proxy").length;
  const notAuto = SCENARIOS.filter((s) => s.automatable === "no").length;
  const errors = SCENARIOS.filter((s) => results[s.id]?.status === "error");

  const sectionRows = SECTIONS.map((section) => {
    const scenarios = SCENARIOS.filter((s) => sectionFor(s) === section);
    const errCount = scenarios.filter(
      (s) => results[s.id]?.status === "error",
    ).length;
    const changedCount = scenarios.filter((s) =>
      s.files.some((f) => changed.some((cf) => cf.includes(f))),
    ).length;
    const countsParts = [
      `${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"}`,
    ];
    if (changedCount > 0) countsParts.push(`${changedCount} changed`);
    if (errCount > 0)
      countsParts.push(`${errCount} capture error${errCount === 1 ? "" : "s"}`);
    return `<li><a href="${esc(section.slug)}.html">${esc(section.title)}</a><span class="counts">${esc(countsParts.join(" · "))}</span></li>`;
  }).join("\n");

  const errorList =
    errors.length > 0
      ? `<h2>Capture errors (${errors.length})</h2><ul>${errors
          .map(
            (s) =>
              `<li><code>${esc(s.id)}</code> — ${esc(
                (results[s.id] as { error: string }).error.split("\n")[0],
              )}</li>`,
          )
          .join("\n")}</ul>`
      : "";

  const body = `
  <div class="cov">
    <div class="cov-tile"><b>${automated}</b>automated</div>
    <div class="cov-tile"><b>${proxy}</b>proxy (documented substitute)</div>
    <div class="cov-tile"><b>${notAuto}</b>not automatable / not built</div>
    <div class="cov-tile"><b>${errors.length}</b>capture errors</div>
  </div>
  <ul class="section-list">${sectionRows}</ul>
  ${errorList}
  <p class="sub">Regenerate: <code>npm run design:review-gallery -- --ref &lt;branch&gt;</code></p>`;

  return pageShell(
    "Keystone design review",
    `ref: <code>${esc(meta.ref)}</code> (<code>${esc(meta.refSha.slice(0, 8))}</code>) &middot; ` +
      `changed-since: <code>${esc(meta.base)}</code> &middot; generated ${esc(meta.generatedAt)}`,
    body,
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

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
  const refSha = args.url ? "unknown (--url)" : revParse(args.ref);
  const baseSha = (() => {
    try {
      return revParse(args.base);
    } catch {
      console.warn(
        `  ↳ could not resolve --base "${args.base}" — 'changed since base' badges will be empty.`,
      );
      return null;
    }
  })();
  const changed =
    baseSha && refSha !== "unknown (--url)"
      ? changedFiles(baseSha, refSha)
      : [];

  console.log(`Resolving app instance (ref="${args.ref}")…`);
  const instance = await resolveAppInstance(
    "repo",
    args.url,
    args.ref,
    headSha,
  );
  try {
    console.log(`\nLaunching browser…`);
    const browser = await chromium.launch({ headless: !args.headed });
    try {
      console.log(`\nCapturing (${instance.url})…`);
      const screenshotsOut = path.join(args.out, "screenshots", "repo");
      const results = await captureScenarios(
        browser,
        instance,
        screenshotsOut,
        scenarios,
      );

      // Copy ref PNGs alongside, self-contained under <out>/screenshots/refs/
      // (no ".." in any <img src> — file:// browsers refuse parent-dir
      // traversal from a locally-opened HTML file).
      const refsOut = path.join(args.out, "screenshots", "refs");
      fs.mkdirSync(refsOut, { recursive: true });
      for (const s of scenarios) {
        if (!s.refFile) continue;
        const src = path.join(REFS_DIR, s.refFile);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(refsOut, s.refFile));
        }
      }

      const generatedAt = new Date().toISOString();
      const refLabel = args.url
        ? args.url
        : `${args.ref} (${refSha.slice(0, 8)})`;

      for (const section of SECTIONS) {
        const sectionScenarios = scenarios.filter(
          (s) => sectionFor(s) === section,
        );
        if (sectionScenarios.length === 0) continue;
        const html = buildSectionPage(
          section,
          sectionScenarios,
          results,
          changed,
          args.out,
          { ref: refLabel, generatedAt },
        );
        fs.writeFileSync(path.join(args.out, `${section.slug}.html`), html);
      }

      const indexHtml = buildIndexPage(results, changed, {
        ref: refLabel,
        refSha: refSha === "unknown (--url)" ? args.url! : refSha,
        base: args.base,
        generatedAt,
      });
      fs.writeFileSync(path.join(args.out, "index.html"), indexHtml);

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Review artifact: ${path.join(args.out, "index.html")}`);
      const errors = scenarios.filter((s) => results[s.id]?.status === "error");
      if (errors.length > 0) {
        console.log(`\nCapture errors (${errors.length}):`);
        for (const s of errors) {
          const r = results[s.id];
          if (r?.status === "error")
            console.log(`  ${s.id}: ${r.error.split("\n")[0]}`);
        }
      }
      console.log(`${"=".repeat(60)}\n`);
    } finally {
      await browser.close();
    }
  } finally {
    await instance.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// scripts/design/design-sync-page-extract.ts
//
// FULL-PAGE counterpart to design-sync-extract.ts. Where that script boots
// the app to a scenario and grabs ONE component's outerHTML, this one grabs
// the WHOLE rendered screen — the assembled page, every component in place,
// exactly as the app lays it out — and writes it as a self-contained preview
// under design-sync-bundle/screens/<id>.html. It then re-opens each written
// card off disk (file://) to prove it renders standalone, and saves a
// full-page screenshot beside it (screens/<id>.png) — the same
// build-then-verify contract design-sync-render-check.ts gives components.
//
// One card per reachable scenario in parity-gallery-scenarios.ts's SCENARIOS
// (those with a capture()). A scenario with no capture() (automatable: "no")
// is reported as a skip, not a failure — so this degrades gracefully on an
// older tree, same as the component extractor.
//
// Output dir default: ../design-sync-bundle (override --bundle-dir /
// $DESIGN_SYNC_BUNDLE_DIR). Its assets/*.css must be current (copy the repo's
// public/*.css + src/styles/print.css over before running — extraction links
// to them, it does not copy them).
//
// Usage:
//   npx tsx scripts/design/design-sync-page-extract.ts
//   npx tsx scripts/design/design-sync-page-extract.ts --only 02a-results-main,04-scorecard
//   npx tsx scripts/design/design-sync-page-extract.ts --list

import { chromium } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { SCENARIOS } from "./parity-gallery-scenarios";
import { neutralizeScrollTraps, VIEWPORT } from "./capture-shared";
import { getFreePort, startNextDev } from "./dev-server";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_BUNDLE_DIR = path.resolve(REPO_ROOT, "../design-sync-bundle");

const THIN_HEIGHT_PX = 120; // a real page shorter than this is almost certainly broken

const GOOGLE_FONTS_LINK =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";

const SHEETS = [
  "prototype.css",
  "prototype-c.css",
  "redesign2.css",
  "candidates.css",
  "print.css",
];

// Section label for the Design System pane, keyed by scenario-id prefix.
const AREA_BY_PREFIX: Record<string, string> = {
  "01": "Intake",
  "02": "Results",
  "03": "Foundation",
  "04": "Scorecard",
  "05": "Candidates",
  "06": "Home",
  "07": "Home",
  "08": "Static",
  "09": "Intake",
  "10": "Polis",
  "11": "Money",
};

function groupFor(id: string): string {
  return `Page · ${AREA_BY_PREFIX[id.slice(0, 2)] ?? "Screens"}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attrsString(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${v.replace(/"/g, "&quot;")}"`)
    .join(" ");
}

interface PageCapture {
  htmlAttrs: Record<string, string>;
  bodyAttrs: Record<string, string>;
  bodyInner: string;
}

// Grab the whole rendered screen, minus the app's own scripts and stylesheet
// links (a static snapshot needs neither — the bundle's ../assets/*.css supply
// the styling, exactly as the component cards do). Real <html>/<body>
// attributes (data-mood/data-palette/data-treatment/class) are preserved so
// the page renders in its true Bold Flag treatment.
async function capturePage(
  page: import("@playwright/test").Page,
): Promise<PageCapture> {
  // NB: keep this arrow body free of named inner-function declarations —
  // tsx/esbuild's keep-names wraps a `const fn = …` with a __name(...) helper
  // that isn't defined in the browser context, throwing "__name is not
  // defined" inside page.evaluate. Inline everything with loops instead.
  return page.evaluate(() => {
    const htmlAttrs: Record<string, string> = {};
    for (const a of Array.from(document.documentElement.attributes))
      htmlAttrs[a.name] = a.value;
    const bodyAttrs: Record<string, string> = {};
    for (const a of Array.from(document.body.attributes))
      bodyAttrs[a.name] = a.value;
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("script, link[rel='stylesheet'], style, noscript")
      .forEach((n) => n.remove());
    return { htmlAttrs, bodyAttrs, bodyInner: clone.innerHTML };
  });
}

function wrapPage(id: string, title: string, cap: PageCapture): string {
  const links = SHEETS.map(
    (f) => `    <link rel="stylesheet" href="../assets/${f}">`,
  ).join("\n");
  // Drop any min-height:0 override — a full page SHOULD fill its height.
  return `<!-- @dsCard group="${groupFor(id)}" -->
<!doctype html>
<html ${attrsString(cap.htmlAttrs)}>
<head>
    <meta charset="utf-8">
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${GOOGLE_FONTS_LINK}" rel="stylesheet">
${links}
    <style>html, body { margin: 0; }</style>
</head>
<body ${attrsString(cap.bodyAttrs)}>
${cap.bodyInner}
</body>
</html>
`;
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      list: { type: "boolean", default: false },
      "bundle-dir": { type: "string" },
      headed: { type: "boolean", default: false },
    },
  });
  return {
    only: values.only
      ? (values.only as string).split(",").map((s) => s.trim())
      : undefined,
    list: values.list as boolean,
    bundleDir: path.resolve(
      (values["bundle-dir"] as string | undefined) ||
        process.env.DESIGN_SYNC_BUNDLE_DIR ||
        DEFAULT_BUNDLE_DIR,
    ),
    headed: values.headed as boolean,
  };
}

interface PageCheck {
  id: string;
  group: string;
  status: "ok" | "thin" | "bad";
  width: number;
  height: number;
  contentHash: string;
  issues: string[];
}

type Scenario = (typeof SCENARIOS)[number];
type NextInstance = { url: string; cleanup: () => Promise<void> };
type Browser = Awaited<ReturnType<typeof chromium.launch>>;

// phase 1 — drive the live app to one screen and write its full-page card.
// Returns a "bad" PageCheck if capture threw, else null (verified in phase 2).
async function captureScreen(
  browser: Browser,
  instance: NextInstance,
  scenario: Scenario,
  screensDir: string,
): Promise<PageCheck | null> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    baseURL: instance.url,
  });
  const page = await context.newPage();
  try {
    await scenario.capture!(page);
    await neutralizeScrollTraps(page);
    const cap = await capturePage(page);
    fs.writeFileSync(
      path.join(screensDir, `${scenario.id}.html`),
      wrapPage(scenario.id, scenario.label, cap),
    );
    console.log(`  ${scenario.id} captured`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.log(`  ${scenario.id} ✗ capture failed: ${msg}`);
    return {
      id: scenario.id,
      group: groupFor(scenario.id),
      status: "bad",
      width: 0,
      height: 0,
      contentHash: "",
      issues: [`capture failed: ${msg}`],
    };
  } finally {
    await context.close();
  }
}

// phase 2 — open one written card off disk (file://), confirm its stylesheets
// loaded and it rendered, and save a full-page screenshot beside it.
async function verifyScreen(
  browser: Browser,
  screensDir: string,
  id: string,
): Promise<PageCheck> {
  const fullPath = path.join(screensDir, `${id}.html`);
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const assetResponses = new Map<string, number>();
  page.on("response", (res) => {
    if (res.url().includes("/assets/") && res.url().endsWith(".css"))
      assetResponses.set(res.url(), res.status());
  });
  const issues: string[] = [];
  let width = 0;
  let height = 0;
  let contentHash = "";
  try {
    await page.goto(`file://${fullPath}`, {
      waitUntil: "load",
      timeout: 20_000,
    });
    const hrefs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((l) => (l as HTMLLinkElement).href)
        .filter((h) => h.includes("/assets/") && h.endsWith(".css")),
    );
    for (const href of hrefs) {
      const status = assetResponses.get(href);
      if (status === undefined) issues.push(`stylesheet no response: ${href}`);
      else if (status < 200 || status >= 400)
        issues.push(`stylesheet HTTP ${status}: ${href}`);
    }
    const box = await page.locator("body").boundingBox();
    if (box) {
      width = Math.round(box.width);
      height = Math.round(box.height);
    }
    const screenshotPath = path.join(screensDir, `${id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    contentHash = crypto
      .createHash("sha1")
      .update(fs.readFileSync(screenshotPath))
      .digest("hex");
  } catch (err) {
    issues.push(
      `verify error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    await context.close();
  }
  const status: PageCheck["status"] =
    issues.length > 0
      ? "bad"
      : height > 0 && height < THIN_HEIGHT_PX
        ? "thin"
        : "ok";
  const tag = status === "ok" ? "✓" : status === "thin" ? "~" : "✗";
  console.log(
    `  ${tag} ${id} (${width}×${height})${issues.length ? " — " + issues.join("; ") : ""}`,
  );
  return {
    id,
    group: groupFor(id),
    status,
    width,
    height,
    contentHash,
    issues,
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const reachable = SCENARIOS.filter((s) => s.capture);

  if (args.list) {
    for (const s of SCENARIOS)
      console.log(
        `${s.id}\t[${groupFor(s.id)}]\t${s.label}${s.capture ? "" : "  (no capture — skip)"}`,
      );
    return;
  }

  const scenarios = args.only
    ? reachable.filter((s) => args.only!.includes(s.id))
    : reachable;
  if (scenarios.length === 0) {
    console.error("No reachable scenarios matched --only; run --list.");
    process.exit(1);
  }

  const screensDir = path.join(args.bundleDir, "screens");
  fs.mkdirSync(screensDir, { recursive: true });

  console.log(`Booting dev server from ${REPO_ROOT}…`);
  const port = await getFreePort();
  const instance = await startNextDev(REPO_ROOT, port, "design-sync-page");
  const browser = await chromium.launch({ headless: !args.headed });
  const checks: PageCheck[] = [];
  try {
    // phase 1: capture each screen's HTML off the live app.
    for (const scenario of scenarios) {
      const failed = await captureScreen(
        browser,
        instance,
        scenario,
        screensDir,
      );
      if (failed) checks.push(failed);
    }

    // phase 2: verify + screenshot each successfully-written card off disk.
    console.log("\nVerifying off-disk (file://)…");
    const written = fs
      .readdirSync(screensDir)
      .filter((f) => f.endsWith(".html"))
      .sort();
    for (const file of written) {
      const id = file.replace(/\.html$/, "");
      if (checks.find((c) => c.id === id)) continue; // already failed in capture
      checks.push(await verifyScreen(browser, screensDir, id));
    }
  } finally {
    await browser.close();
    await instance.cleanup();
  }

  const bad = checks.filter((c) => c.status === "bad").length;
  const thin = checks.filter((c) => c.status === "thin").length;
  const summaryPath = path.join(args.bundleDir, ".page-check.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        total: checks.length,
        bad,
        thin,
        generatedAt: new Date().toISOString(),
        cards: checks,
      },
      null,
      2,
    ),
  );
  console.log(`\n${checks.length} pages · ${bad} bad · ${thin} thin`);
  console.log(`Summary written to ${summaryPath}`);
  if (bad > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

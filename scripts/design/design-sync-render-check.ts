#!/usr/bin/env node
// scripts/design/design-sync-render-check.ts
//
// Headless verification pass for the design-sync bundle (design-sync-
// extract.ts's output). Opens every design-sync-bundle/components/*.html
// card DIRECTLY off disk (file:// — no dev server, no network required
// beyond the Google Fonts <link>, no JS) with Playwright, and checks each
// one actually rendered: its linked stylesheets loaded (not a 404 →
// "missing-CSS bare-text" look), its component root has non-zero size, and
// it isn't suspiciously tiny. Saves a screenshot beside each card
// (components/<id>.png) and writes a summary to
// design-sync-bundle/.render-check.json.
//
// Usage:
//   npx tsx scripts/design/design-sync-render-check.ts
//   npx tsx scripts/design/design-sync-render-check.ts --bundle-dir /path/to/design-sync-bundle
//
// Exit code is non-zero when bad > 0 — wire this into a re-run loop: fix the
// flagged card(s) (usually a selector or missing asset in design-sync-
// extract.ts), re-run extraction, re-run this script, repeat until bad = 0.

import { chromium } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_BUNDLE_DIR = path.resolve(REPO_ROOT, "../design-sync-bundle");

// Below this height (px), a card is flagged "thin" (informational — some
// components, e.g. MedianChip, are legitimately small pills) rather than
// "bad" (broken/empty, which fails the run).
const THIN_HEIGHT_PX = 24;

interface CardCheck {
  id: string;
  group: string | null;
  status: "ok" | "thin" | "bad";
  width: number;
  height: number;
  screenshot: string;
  contentHash: string;
  issues: string[];
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      "bundle-dir": { type: "string" },
      headed: { type: "boolean", default: false },
    },
  });
  return {
    bundleDir: path.resolve(
      (values["bundle-dir"] as string | undefined) ||
        process.env.DESIGN_SYNC_BUNDLE_DIR ||
        DEFAULT_BUNDLE_DIR,
    ),
    headed: values.headed as boolean,
  };
}

function readGroupFromFirstLine(file: string): string | null {
  const firstLine = fs.readFileSync(file, "utf8").split("\n", 1)[0];
  const m = firstLine.match(/@dsCard\s+group="([^"]+)"/);
  return m ? m[1] : null;
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const componentsDir = path.join(args.bundleDir, "components");
  if (!fs.existsSync(componentsDir)) {
    console.error(
      `No components dir at ${componentsDir} — run design-sync-extract.ts first.`,
    );
    process.exit(1);
  }
  const files = fs
    .readdirSync(componentsDir)
    .filter((f) => f.endsWith(".html"))
    .sort();
  if (files.length === 0) {
    console.error(`No .html cards found in ${componentsDir}.`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: !args.headed });
  const checks: CardCheck[] = [];
  try {
    for (const file of files) {
      const id = file.replace(/\.html$/, "");
      const fullPath = path.join(componentsDir, file);
      const group = readGroupFromFirstLine(fullPath);
      const context = await browser.newContext({
        viewport: { width: 1180, height: 1000 },
      });
      const page = await context.newPage();
      const failedRequests: string[] = [];
      page.on("requestfailed", (req) => {
        failedRequests.push(
          `${req.method()} ${req.url()} — ${req.failure()?.errorText}`,
        );
      });
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      // Track our own relative-path (../assets/*.css) stylesheet responses by
      // network status — NOT by introspecting document.styleSheets[i].cssRules
      // from page.evaluate(). Under file://, Chromium puts each loaded file in
      // its own opaque origin, so cssRules access throws a SecurityError even
      // for a stylesheet that loaded and IS applied for rendering (confirmed:
      // the visual render is correct, only same-page introspection is
      // blocked). Network status is the reliable "did it actually load" signal.
      const assetResponses = new Map<string, number>();
      page.on("response", (res) => {
        if (res.url().includes("/assets/") && res.url().endsWith(".css")) {
          assetResponses.set(res.url(), res.status());
        }
      });

      const issues: string[] = [];
      let width = 0;
      let height = 0;
      let contentHash = "";

      try {
        await page.goto(`file://${fullPath}`, {
          waitUntil: "load",
          timeout: 15_000,
        });
        const expectedAssetHrefs: string[] = await page.evaluate(() =>
          Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((l) => (l as HTMLLinkElement).href)
            .filter((h) => h.includes("/assets/") && h.endsWith(".css")),
        );
        for (const href of expectedAssetHrefs) {
          const status = assetResponses.get(href);
          if (status === undefined) {
            issues.push(`stylesheet never got a network response: ${href}`);
          } else if (status < 200 || status >= 400) {
            issues.push(`stylesheet load failed (HTTP ${status}): ${href}`);
          }
        }

        const root = page.locator(".ds-card-frame > *").first();
        const count = await page.locator(".ds-card-frame > *").count();
        if (count === 0) {
          issues.push(
            "component root (.ds-card-frame > *) not found — extraction produced an empty card",
          );
        } else {
          const box = await root.boundingBox();
          if (!box || box.width <= 0 || box.height <= 0) {
            issues.push(
              "component root has zero size (display:none or unrendered)",
            );
          } else {
            width = Math.round(box.width);
            height = Math.round(box.height);
          }
          const text = ((await root.innerText().catch(() => "")) || "").trim();
          const childCount = await root.evaluate((el) => el.childElementCount);
          if (text.length === 0 && childCount === 0) {
            issues.push(
              "no text content and no child elements — likely broken/empty",
            );
          }
        }

        const relevantFailed = failedRequests.filter(
          (r) =>
            !r.includes("fonts.googleapis.com") &&
            !r.includes("fonts.gstatic.com"),
        );
        if (relevantFailed.length > 0)
          issues.push(...relevantFailed.map((r) => `request failed: ${r}`));
        if (pageErrors.length > 0)
          issues.push(...pageErrors.map((e) => `page error: ${e}`));

        const screenshotPath = path.join(componentsDir, `${id}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const pngBuf = fs.readFileSync(screenshotPath);
        contentHash = crypto.createHash("sha1").update(pngBuf).digest("hex");
      } catch (err) {
        issues.push(
          `navigation/check error: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        await context.close();
      }

      const status: CardCheck["status"] =
        issues.length > 0
          ? "bad"
          : height > 0 && height < THIN_HEIGHT_PX
            ? "thin"
            : "ok";

      checks.push({
        id,
        group,
        status,
        width,
        height,
        screenshot: `components/${id}.png`,
        contentHash,
        issues,
      });
      const tag = status === "ok" ? "✓" : status === "thin" ? "~" : "✗";
      console.log(
        `  ${tag} ${id} (${width}×${height})${issues.length ? " — " + issues.join("; ") : ""}`,
      );
    }
  } finally {
    await browser.close();
  }

  // variantsIdentical: cards that are pixel-for-pixel identical to a DIFFERENT
  // card (same PNG hash) — usually means a "variant" pair (e.g. rep-card-
  // collapsed vs -expanded) accidentally captured the same state twice.
  const byHash = new Map<string, string[]>();
  for (const c of checks) {
    if (!c.contentHash) continue;
    const list = byHash.get(c.contentHash) || [];
    list.push(c.id);
    byHash.set(c.contentHash, list);
  }
  const variantsIdentical: string[][] = Array.from(byHash.values()).filter(
    (ids) => ids.length > 1,
  );

  const summaryPath = path.join(args.bundleDir, ".render-check.json");
  const prev = fs.existsSync(summaryPath)
    ? (JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        iterations?: number;
      })
    : {};
  const iterations = (prev.iterations || 0) + 1;

  const bad = checks.filter((c) => c.status === "bad").length;
  const thin = checks.filter((c) => c.status === "thin").length;

  const summary = {
    total: checks.length,
    bad,
    thin,
    variantsIdentical,
    iterations,
    generatedAt: new Date().toISOString(),
    cards: checks,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(
    `\n${checks.length} cards · ${bad} bad · ${thin} thin · ${variantsIdentical.length} identical-content group(s) · iteration ${iterations}`,
  );
  if (variantsIdentical.length > 0) {
    console.log(
      "Identical-content groups (check these are meant to be distinct):",
    );
    for (const g of variantsIdentical) console.log(`  ${g.join(" == ")}`);
  }
  console.log(`Summary written to ${summaryPath}`);
  if (bad > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

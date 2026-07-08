// scripts/design/capture-shared.test.ts
//
// Regression test for the scroll-trap bug found in Phase 0 (docs/operations/
// keystone-phase0-findings-2026-07-08.md): a container with `overflow:
// hidden` + a fixed height (e.g. the Results workspace's `.ws-shell`) hides
// its overflow from `page.screenshot({ fullPage: true })`, which only
// measures the document's own scroll height. Exercises a real headless
// browser (not jsdom) since the bug is a layout/rendering behavior.

import { describe, it, expect } from "vitest";
import { chromium } from "@playwright/test";
import { neutralizeScrollTraps, VIEWPORT } from "./capture-shared";

describe("neutralizeScrollTraps", () => {
  it("expands a scroll-trapped shell so full-page capture sees content below the internal fold", async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await page.setContent(`
          <div class="ws-shell" style="height:${VIEWPORT.height}px; overflow:hidden;">
            <div class="ws-wrap" style="height:${VIEWPORT.height * 3}px;">
              <div id="marker" style="margin-top:${VIEWPORT.height * 2}px;">
                below the fold
              </div>
            </div>
          </div>
        `);

      const beforeHeight = await page.evaluate(
        () => document.body.scrollHeight,
      );
      expect(beforeHeight).toBeLessThan(VIEWPORT.height * 1.5);

      await neutralizeScrollTraps(page);

      const afterHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(afterHeight).toBeGreaterThan(VIEWPORT.height * 2.5);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("leaves ordinary, non-trapped content unmodified", async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: VIEWPORT });
      await page.setContent(
        `<div id="plain" style="height:200px;">hello</div>`,
      );
      const before = await page.evaluate(
        () => document.getElementById("plain")!.outerHTML,
      );

      await neutralizeScrollTraps(page);

      const after = await page.evaluate(
        () => document.getElementById("plain")!.outerHTML,
      );
      expect(after).toBe(before);
    } finally {
      await browser.close();
    }
  }, 30_000);

  it("does not touch a small, intentionally-scrollable widget", async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: VIEWPORT });
      // Below the clientHeight > 40 threshold — a small scrollable chip
      // list or tooltip should not get blown open.
      await page.setContent(`
          <div id="widget" style="height:30px; overflow:hidden;">
            <div style="height:200px;">lots of content</div>
          </div>
        `);
      const beforeHeight = await page.evaluate(
        () => document.getElementById("widget")!.clientHeight,
      );

      await neutralizeScrollTraps(page);

      const afterHeight = await page.evaluate(
        () => document.getElementById("widget")!.clientHeight,
      );
      expect(afterHeight).toBe(beforeHeight);
    } finally {
      await browser.close();
    }
  }, 30_000);
});

// Congress-assessment experience — head-to-head candidate duel.
//
// "Time to replace" on a seat WITH 2026 challengers opens the full-screen
// duel (incumbent vs. one challenger, challenger switcher, per-issue Δ ledger,
// Keep / Replace at the foot). Replace records the verdict AND the chosen
// successor, which rides to the scorecard. Faithful to the design's DIRECTION
// B (design-handoff/design-session/screens-candidates.jsx).
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect } from "@playwright/test";
import {
  mockDelegationWithChallengers,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
  goToWorkspace,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

test.describe("head-to-head candidate duel", () => {
  test("Time to replace opens the duel; switcher + Δ ledger + Replace record the pick", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "duel reached from the per-seat card — desktop-only overlay flow",
    );
    await mockDelegationWithChallengers(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // The House seat is active first. Its "Time to replace" CTA now leads into
    // the duel (the seat has challengers), not an inline verdict toggle.
    const cta = page.getByTestId("open-duel");
    await expect(cta).toContainText("compare who's running");
    await cta.click();

    // Full-screen duel: incumbent column + challenger column + the switcher.
    const cmp = page.locator(".cmp");
    await expect(cmp).toBeVisible();
    await expect(cmp.locator(".cmp-col.inc")).toContainText(
      "The record you have",
    );
    await expect(cmp.locator(".cmp-col.ch")).toContainText(
      "Running to replace them",
    );

    // Incumbent overall is the roll-call score (5/6 = 83%).
    await expect(cmp.locator(".cmp-col.inc .cmp-big b")).toHaveText("83%");

    // Switcher carries the real challengers (ranked by funds raised).
    const switcher = cmp.locator(".cmp-switch");
    await expect(switcher).toContainText("Reyes");
    await expect(switcher).toContainText("Whitfield");

    // Δ ledger: the user's issue rows render with the incumbent column value.
    const ledger = cmp.locator(".cmp-ledger");
    await expect(ledger).toContainText("Lower insulin & drug prices");
    // Challenger research (web_search, in_favor → directional 80%) settles.
    await expect(cmp.locator(".cmp-col.ch .cmp-big b")).toHaveText("80%", {
      timeout: 10000,
    });
    // The honest-provenance note marks the challenger figures as researched.
    await expect(ledger).toContainText("directional read");

    // Switch to the second challenger — the challenger column updates.
    await switcher.getByRole("tab", { name: /Whitfield/ }).click();
    await expect(cmp.locator(".cmp-col.ch .cmp-cname")).toContainText(
      "Sam Whitfield",
    );

    // Switch back to Reyes and Replace — records the verdict + successor.
    await switcher.getByRole("tab", { name: /Reyes/ }).click();
    await cmp.getByRole("button", { name: /Replace with Reyes/ }).click();

    // Back on the workspace: the scorecard shows the replace verdict + the
    // chosen successor (the answer to "what happens when you replace?").
    await expect(page.locator(".ws-ballot")).toBeVisible();
    const houseRow = page.locator(".b-row").first();
    await expect(houseRow.locator(".verdict-chip")).toHaveText("⇄ REPLACE");
    await expect(houseRow.locator(".pick-successor")).toContainText(
      "Elena Reyes",
    );
  });

  test("Keep at the foot records a keep verdict and returns to the scorecard", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "duel reached from the per-seat card — desktop-only overlay flow",
    );
    await mockDelegationWithChallengers(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    await page.getByTestId("open-duel").click();
    await expect(page.locator(".cmp")).toBeVisible();
    await page
      .locator(".cmp")
      .getByRole("button", { name: /^Keep / })
      .click();

    await expect(page.locator(".ws-ballot")).toBeVisible();
    await expect(
      page.locator(".b-row").first().locator(".verdict-chip"),
    ).toHaveText("✓ KEEP");
    // No successor on a keep.
    await expect(
      page.locator(".b-row").first().locator(".pick-successor"),
    ).toHaveCount(0);
  });
});

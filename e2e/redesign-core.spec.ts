// Congress-assessment experience (src/prototype/redesign/) — core flow.
//
// Requires a build with NEXT_PUBLIC_BALLOT_ENABLED unset/false (the new
// default). Self-skips against a legacy-flag build, where the prototype-*
// specs run instead.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect } from "@playwright/test";
import {
  mockDelegation,
  mockDelegationFailure,
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

test.describe("delegation flow — address → assess → verdicts", () => {
  test("walks home → cold-open → workspace with real card surfaces", async ({
    page,
  }, testInfo) => {
    // The left rail is desktop-only (<768px shows the scorecard pane first).
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "rail assertions are desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Blind-first: identity hidden, judged by record.
    await expect(page.locator(".cv2-name.blind").first()).toContainText(
      "Your U.S. Representative",
    );

    // Seat strip + attendance band + eligibility + sources are all present.
    await expect(page.locator(".seat-strip")).toContainText("TX-37");
    await expect(page.locator(".att-band")).toContainText("missed 1.4%");
    await expect(page.locator(".att-band .att-chip")).toHaveText(
      "Rarely misses",
    );
    await expect(page.locator(".elig")).toContainText("2026");
    await expect(page.locator(".card-sources")).toContainText("GovTrack");

    // Money trail summary carries the donor total (core thesis).
    await expect(page.locator(".cv2-disclose-summary")).toContainText(
      "$5M raised",
    );

    // Scorecard rail shows the issues with jurisdiction tags.
    await expect(page.locator(".ws-rail .lvl-tag").first()).toBeVisible();
  });

  test("reveal shows the member; verdicts ride into the scorecard and unlock print", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    const counters = await mockCounters(page);
    await goToWorkspace(page);

    // Print is disabled until at least one verdict exists.
    await expect(
      page.getByRole("button", { name: /Print my scorecard/ }),
    ).toBeDisabled();

    await page.locator(".cv2-reveal").first().click();
    await expect(page.locator(".cv2-name").first()).toHaveText("Alex Rivera");

    // Verdict all three seats. The card auto-advances ~600ms after each
    // verdict — wait it out so the next click lands on the NEXT seat.
    await page.getByRole("button", { name: /Worth keeping/ }).click();
    await page.waitForTimeout(900);
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: "Time to replace", exact: true })
        .click();
      await page.waitForTimeout(900);
    }

    await expect(page.locator(".ws-ballot")).toContainText("3/3");
    await expect(page.locator(".verdict-chip").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Print my scorecard/ }),
    ).toBeEnabled();

    // Session-end counters fired once, with concerns and WITHOUT verdicts.
    await expect.poll(() => counters.calls.length).toBeGreaterThan(0);
    expect(counters.calls[0].picks).toEqual([]);
    expect(counters.calls[0].primary).toBe("GENERAL");

    // Print sheet renders the verdicts + districts line.
    await page.getByRole("button", { name: /Print my scorecard/ }).click();
    await expect(page.locator(".print-sheet")).toContainText("Alex Rivera");
    await expect(page.locator(".print-sheet")).toContainText(
      "U.S. House TX-37",
    );
    await expect(page.locator(".verdict-print").first()).toContainText(
      "WORTH KEEPING",
    );
  });

  test("no-DB-record member renders the web_search card in the same surface", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "seat selection via the rail is desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Open the junior senator's card (research fallback path).
    await page.locator(".ws-rail .race-list li").nth(2).click();
    await expect(
      page.locator('[data-testid="web-search-alignment-banner"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="web-search-alignment-banner"]'),
    ).toContainText("Based on public statements");
  });
});

test.describe("standing stage (polis)", () => {
  test("above threshold renders the shared-priority map", async ({ page }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page, true);
    await mockCounters(page);
    await goToWorkspace(page);

    await page.locator(".standing-cta button").click();
    await expect(page.locator(".polis h2")).toContainText(
      "less divided than you think",
    );
    // Clusters named by shared priority, never party.
    await expect(page.locator(".scatter-legend")).toContainText("first");
    await expect(page.locator(".scatter-legend")).not.toContainText("Democrat");
    // Bridges are sentinel-only in v1 → panel hidden.
    await expect(page.locator(".bridges")).toHaveCount(0);
  });

  test("below threshold renders the lock state, never a fake map", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page, false);
    await mockCounters(page);
    await goToWorkspace(page);

    await page.locator(".standing-cta button").click();
    await expect(page.locator(".polis-lede")).toContainText("soon");
    await expect(page.locator(".scatter")).toHaveCount(0);
  });
});

test.describe("honest failure states", () => {
  test("geocode failure offers an address edit", async ({ page }) => {
    await mockDelegationFailure(page, "geocode_failed");
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
      .fill("asdf qwerty");
    await page.getByRole("button", { name: "Pull my representatives →" }).click();
    await expect(page.locator(".err-banner")).toContainText(
      "couldn't place that address",
    );
    await page.getByRole("button", { name: "Edit address" }).click();
    await expect(
      page.getByRole("button", { name: "Pull my representatives →" }),
    ).toBeVisible();
  });

  test("DC / territories get the no-representation state", async ({ page }) => {
    await mockDelegationFailure(page, "no_representation");
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
      .fill("1600 Pennsylvania Ave NW");
    await page.getByRole("button", { name: "Pull my representatives →" }).click();
    await expect(page.locator(".err-banner")).toContainText(
      "no voting member of Congress",
    );
  });
});

import { test, expect } from "@playwright/test";

/**
 * Phase 6 e2e tests: Issue Ranking, Concern Disambiguation, Polis Overlay.
 *
 * These tests verify:
 * - Required data-testid attributes exist after zip lookup
 * - Issue ranking list renders with all canonical issues
 * - Skip buttons work
 * - Confirm button advances the workflow
 * - Concern disambiguation flow renders
 * - No client-side persistence (no localStorage/sessionStorage keys set)
 */

// ---------------------------------------------------------------------------
// Issue Ranking appears after zip lookup
// ---------------------------------------------------------------------------

test.describe("Phase 6 — Issue Ranking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });
  });

  test("issue-ranking-list is visible after zip lookup", async ({ page }) => {
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
  });

  test("issue-rank-skip-button is visible", async ({ page }) => {
    await expect(page.getByTestId("issue-rank-skip-button")).toBeVisible();
  });

  test("issue-rank-confirm-button is visible", async ({ page }) => {
    await expect(page.getByTestId("issue-rank-confirm-button")).toBeVisible();
  });

  test("all 12 canonical issue items are rendered", async ({ page }) => {
    const items = page.locator('[data-testid^="issue-rank-item-"]');
    await expect(items).toHaveCount(12);
  });

  test("first canonical issue item exists (economy-jobs)", async ({ page }) => {
    await expect(page.getByTestId("issue-rank-item-economy-jobs")).toBeAttached();
  });

  test("last canonical issue item exists (voting-rights-democracy)", async ({
    page,
  }) => {
    await expect(
      page.getByTestId("issue-rank-item-voting-rights-democracy"),
    ).toBeAttached();
  });

  test("clicking skip advances to concern disambiguation", async ({ page }) => {
    await page.getByTestId("issue-rank-skip-button").click();
    // Should show the concern disambiguation step
    await expect(
      page.getByTestId("concern-disambiguation-input"),
    ).toBeVisible();
  });

  test("clicking confirm advances to concern disambiguation", async ({
    page,
  }) => {
    await page.getByTestId("issue-rank-confirm-button").click();
    await expect(
      page.getByTestId("concern-disambiguation-input"),
    ).toBeVisible();
  });

  test("no ranking data stored in localStorage", async ({ page }) => {
    await page.getByTestId("issue-rank-skip-button").click();
    const lsKeys = await page.evaluate(() => Object.keys(localStorage));
    const rankingKeys = lsKeys.filter(
      (k) => k.includes("rank") || k.includes("issue") || k.includes("phase6"),
    );
    expect(rankingKeys).toHaveLength(0);
  });

  test("no ranking data stored in sessionStorage", async ({ page }) => {
    await page.getByTestId("issue-rank-skip-button").click();
    const ssKeys = await page.evaluate(() => Object.keys(sessionStorage));
    const rankingKeys = ssKeys.filter(
      (k) => k.includes("rank") || k.includes("issue") || k.includes("phase6"),
    );
    expect(rankingKeys).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Concern Disambiguation flow
// ---------------------------------------------------------------------------

test.describe("Phase 6 — Concern Disambiguation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });
    // Skip issue ranking to get to concern step
    await page.getByTestId("issue-rank-skip-button").click();
    await page.getByTestId("concern-disambiguation-input").waitFor({
      state: "visible",
    });
  });

  test("concern-disambiguation-input is visible", async ({ page }) => {
    await expect(page.getByTestId("concern-disambiguation-input")).toBeVisible();
  });

  test("concern-disambiguation-submit is visible", async ({ page }) => {
    await expect(
      page.getByTestId("concern-disambiguation-submit"),
    ).toBeVisible();
  });

  test("submit button is disabled when input is empty", async ({ page }) => {
    const submitBtn = page.getByTestId("concern-disambiguation-submit");
    await expect(submitBtn).toBeDisabled();
  });

  test("submit button enables when text is entered", async ({ page }) => {
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I care about housing costs");
    const submitBtn = page.getByTestId("concern-disambiguation-submit");
    await expect(submitBtn).toBeEnabled();
  });

  test("submitting concern text shows confirmation panel", async ({ page }) => {
    test.setTimeout(30000);
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I rent and can't afford housing. My kid has Type 1 diabetes.");
    await page.getByTestId("concern-disambiguation-submit").click();
    // In test/CI env, mock response returns immediately
    await expect(page.getByTestId("concern-mapping-confirmation")).toBeVisible({
      timeout: 15000,
    });
  });

  test("confirmation panel shows issue checkboxes after submit", async ({
    page,
  }) => {
    test.setTimeout(30000);
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I rent and can't afford housing. My kid has Type 1 diabetes.");
    await page.getByTestId("concern-disambiguation-submit").click();
    await page.getByTestId("concern-mapping-confirmation").waitFor({
      state: "visible",
      timeout: 15000,
    });
    // Mock response includes housing and healthcare
    await expect(
      page.getByTestId("concern-mapping-issue-housing"),
    ).toBeAttached();
    await expect(
      page.getByTestId("concern-mapping-issue-healthcare"),
    ).toBeAttached();
  });

  test("concern-confirm-button present in confirmation panel", async ({
    page,
  }) => {
    test.setTimeout(30000);
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I care about the environment");
    await page.getByTestId("concern-disambiguation-submit").click();
    await page.getByTestId("concern-mapping-confirmation").waitFor({
      state: "visible",
      timeout: 15000,
    });
    await expect(page.getByTestId("concern-confirm-button")).toBeVisible();
  });

  test("skipping concern step advances to main content", async ({ page }) => {
    // Skip concern disambiguation — should reveal prompt/chat sections
    const skipBtns = page.getByRole("button", { name: /skip/i });
    await skipBtns.first().click();
    // After skipping, the issue ranking step + concern step are done
    // The chat CTA or prompt section should be visible
    await expect(page.getByTestId("copy-button")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// Required data-testid attributes present
// ---------------------------------------------------------------------------

test.describe("Phase 6 — Required testids", () => {
  test("all Phase 6 required testids exist after zip lookup", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });

    // Ranking testids
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
    await expect(page.getByTestId("issue-rank-skip-button")).toBeVisible();
    await expect(page.getByTestId("issue-rank-confirm-button")).toBeVisible();
    // At least one item
    await expect(
      page.getByTestId("issue-rank-item-economy-jobs"),
    ).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Phase 5 regression — existing testids still present after Phase 6 changes
// ---------------------------------------------------------------------------

test.describe("Phase 6 — Phase 5 regression", () => {
  test("Phase 5 features still accessible after completing ranking flow", async ({
    page,
  }) => {
    test.setTimeout(15000);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });

    // Complete ranking flow
    await page.getByTestId("issue-rank-skip-button").click();
    await page.getByTestId("concern-disambiguation-input").waitFor({
      state: "visible",
    });
    // Skip concerns too
    const skipBtns = page.getByRole("button", { name: /skip/i });
    await skipBtns.first().click();

    // Phase 5 features should still be accessible
    await expect(page.getByTestId("copy-button")).toBeVisible();
    await expect(page.getByTestId("chat-cta")).toBeVisible();
    await expect(page.getByTestId("ballot-paste-input")).toBeVisible();
    await expect(page.getByTestId("upload-profile-input")).toBeAttached();
  });
});

import { test, expect } from "@playwright/test";

/**
 * Phase 6 e2e tests: Issue Ranking, Concern Disambiguation, Polis Overlay.
 *
 * Tests use mock mode (ANTHROPIC_API_KEY=test) and no Upstash credentials,
 * so Polis Overlay graceful-degradation is exercised (overlay absent but
 * ranking still works).
 */

const TEXAS_ZIP = "73301";

// ---------------------------------------------------------------------------
// Issue Ranking — basic render
// ---------------------------------------------------------------------------

test.describe("Issue Ranking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
  });

  test("issue ranking list is visible after zip submission", async ({
    page,
  }) => {
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
  });

  test("issue ranking list has 12 items", async ({ page }) => {
    const items = page.locator("[data-testid^='issue-rank-item-']");
    await expect(items).toHaveCount(12);
  });

  test("skip button is present", async ({ page }) => {
    await expect(page.getByTestId("issue-rank-skip-button")).toBeVisible();
  });

  test("confirm button is present", async ({ page }) => {
    await expect(page.getByTestId("issue-rank-confirm-button")).toBeVisible();
  });

  test("specific canonical issue items are present", async ({ page }) => {
    await expect(
      page.getByTestId("issue-rank-item-healthcare"),
    ).toBeVisible();
    await expect(page.getByTestId("issue-rank-item-housing")).toBeVisible();
    await expect(
      page.getByTestId("issue-rank-item-economy-jobs"),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Issue Ranking — skip flow
// ---------------------------------------------------------------------------

test.describe("Issue Ranking — skip flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
  });

  test("clicking skip shows concern disambiguation section", async ({
    page,
  }) => {
    await page.getByTestId("issue-rank-skip-button").click();
    await expect(
      page.getByTestId("concern-disambiguation-section"),
    ).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Issue Ranking — confirm flow
// ---------------------------------------------------------------------------

test.describe("Issue Ranking — confirm flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
  });

  test("confirming ranking shows concern disambiguation section", async ({
    page,
  }) => {
    await page.getByTestId("issue-rank-confirm-button").click();
    await expect(
      page.getByTestId("concern-disambiguation-section"),
    ).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

test.describe("Issue Ranking — keyboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
  });

  test("issue rank items are keyboard focusable", async ({ page }) => {
    const firstItem = page.getByTestId("issue-rank-item-economy-jobs");
    await firstItem.focus();
    await expect(firstItem).toBeFocused();
  });

  test("pressing Space on an item makes it 'grabbed'", async ({ page }) => {
    const firstItem = page.getByTestId("issue-rank-item-economy-jobs");
    await firstItem.focus();
    await firstItem.press(" ");
    // The item should now have grabbed state (aria-grabbed=true)
    await expect(firstItem).toHaveAttribute("aria-grabbed", "true");
  });
});

// ---------------------------------------------------------------------------
// Concern Disambiguation — UI elements
// ---------------------------------------------------------------------------

test.describe("Concern Disambiguation — UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });

    // Skip issue ranking to get to concern disambiguation
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
    await page.getByTestId("issue-rank-skip-button").click();
    await expect(
      page.getByTestId("concern-disambiguation-section"),
    ).toBeVisible({ timeout: 3000 });
  });

  test("concern text input is visible", async ({ page }) => {
    await expect(
      page.getByTestId("concern-disambiguation-input"),
    ).toBeVisible();
  });

  test("concern submit button is visible", async ({ page }) => {
    await expect(
      page.getByTestId("concern-disambiguation-submit"),
    ).toBeVisible();
  });

  test("concern submit is disabled when input is empty", async ({ page }) => {
    await expect(
      page.getByTestId("concern-disambiguation-submit"),
    ).toBeDisabled();
  });

  test("concern submit is enabled when input has text", async ({ page }) => {
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I care about housing");
    await expect(
      page.getByTestId("concern-disambiguation-submit"),
    ).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Concern Disambiguation — mock API flow
// ---------------------------------------------------------------------------

test.describe("Concern Disambiguation — mock flow", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });

    // Skip issue ranking
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();
    await page.getByTestId("issue-rank-skip-button").click();
    await expect(
      page.getByTestId("concern-disambiguation-section"),
    ).toBeVisible({ timeout: 3000 });
  });

  test("submitting concern text shows confirmation panel (mock API)", async ({
    page,
  }) => {
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I can't afford housing in my city");
    await page.getByTestId("concern-disambiguation-submit").click();

    // Wait for mock API response and confirmation panel
    await expect(
      page.getByTestId("concern-mapping-confirmation"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("concern-confirm-button is present in confirmation panel", async ({
    page,
  }) => {
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I can't afford housing in my city");
    await page.getByTestId("concern-disambiguation-submit").click();

    await expect(
      page.getByTestId("concern-mapping-confirmation"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("concern-confirm-button")).toBeVisible();
  });

  test("issue checkboxes appear in confirmation panel", async ({ page }) => {
    await page
      .getByTestId("concern-disambiguation-input")
      .fill("I can't afford housing in my city");
    await page.getByTestId("concern-disambiguation-submit").click();

    await expect(
      page.getByTestId("concern-mapping-confirmation"),
    ).toBeVisible({ timeout: 10000 });

    // Should have at least one issue checkbox
    const issueCheckboxes = page.locator(
      "[data-testid^='concern-mapping-issue-']",
    );
    await expect(issueCheckboxes.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Polis overlay — graceful degradation (no Upstash in test mode)
// ---------------------------------------------------------------------------

test.describe("Polis Overlay — graceful degradation", () => {
  test("app loads and ranking works without Upstash credentials", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });

    // Issue ranking should work
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible();

    // Confirm ranking — no crash
    await page.getByTestId("issue-rank-confirm-button").click();

    // App should still be functional (concern disambiguation shows)
    await expect(
      page.getByTestId("concern-disambiguation-section"),
    ).toBeVisible({ timeout: 3000 });
  });

  test("privacy disclosure is shown on the page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });

    // Privacy section should be shown
    await expect(
      page.getByTestId("polis-privacy-section"),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API routes — smoke tests
// ---------------------------------------------------------------------------

test.describe("Issue counts API — graceful degradation", () => {
  test("GET /api/issue-counts returns valid shape without Upstash", async ({
    page,
  }) => {
    const response = await page.request.get(
      "/api/issue-counts?countyFips=48201",
    );
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as {
      countyFips: string;
      issueCounts: Record<string, number>;
      totalRespondents: null;
    };
    expect(data.countyFips).toBe("48201");
    expect(typeof data.issueCounts).toBe("object");
    expect(data.totalRespondents).toBeNull();
  });

  test("POST /api/issue-counts/increment returns success without Upstash", async ({
    page,
  }) => {
    const response = await page.request.post(
      "/api/issue-counts/increment",
      {
        data: { countyFips: "48201", issueSlug: "housing" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as { success: boolean };
    expect(data.success).toBe(true);
  });

  test("POST /api/disambiguate-concerns returns mock response", async ({
    page,
  }) => {
    const response = await page.request.post("/api/disambiguate-concerns", {
      data: { concernText: "I can't afford housing" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.ok()).toBe(true);
    const data = (await response.json()) as {
      interpretation: string;
      matchedIssues: Array<{ issue: string; quote: string; confidence: string }>;
      unmatched: string[];
    };
    expect(data.interpretation).toBeTruthy();
    expect(Array.isArray(data.matchedIssues)).toBe(true);
  });
});

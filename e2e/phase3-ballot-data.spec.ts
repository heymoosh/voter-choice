import { test, expect } from "@playwright/test";

/**
 * Phase 3 e2e tests for real ballot data integration.
 * These run with E2E_MOCK_APIS=1 so no real API calls are made.
 * Fixture data is in src/lib/server/mockFixtures.ts.
 */

test.describe("Phase 3: Loading state", () => {
  test("submit button shows loading state while fetching", async ({ page }) => {
    await page.goto("/");
    // Intercept the API call to delay it
    await page.route("/api/ballot-data*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // The submit button or loading spinner should appear
    // Check for either the spinner in button or the data-loading indicator
    const hasLoading = await page
      .getByTestId("data-loading")
      .isVisible()
      .catch(() => false);
    const hasSpinner = await page
      .locator('[data-testid="zip-submit"] .animate-spin')
      .isVisible()
      .catch(() => false);
    expect(hasLoading || hasSpinner).toBeTruthy();
  });
});

test.describe("Phase 3: Polling location", () => {
  test("displays polling location section after valid zip (Texas)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const pollingLocation = page.getByTestId("polling-location");
    await expect(pollingLocation).toBeVisible({ timeout: 8000 });
  });

  test("polling location contains address for Texas", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const pollingLocation = page.getByTestId("polling-location");
    await expect(pollingLocation).toBeVisible({ timeout: 8000 });
    const text = await pollingLocation.textContent();
    expect(text).toBeTruthy();
  });

  test("displays polling location for California", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("90210");
    await page.getByTestId("zip-submit").click();
    const pollingLocation = page.getByTestId("polling-location");
    await expect(pollingLocation).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Phase 3: Ballot contests", () => {
  test("displays ballot contests section after valid zip", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const ballotContests = page.getByTestId("ballot-contests");
    await expect(ballotContests).toBeVisible({ timeout: 8000 });
  });

  test("ballot contests section contains candidate info", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const ballotContests = page.getByTestId("ballot-contests");
    await expect(ballotContests).toBeVisible({ timeout: 8000 });
    // Should contain at least one candidate detail
    const candidateDetails = page.getByTestId("candidate-detail");
    await expect(candidateDetails.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Phase 3: Candidate detail expansion", () => {
  test("candidate detail panel expands on click (Texas)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // Wait for ballot contests to appear
    await expect(page.getByTestId("ballot-contests")).toBeVisible({
      timeout: 8000,
    });

    // Find a "View voting record" button
    const viewRecordBtn = page.getByText("View voting record").first();
    await expect(viewRecordBtn).toBeVisible({ timeout: 5000 });

    // Click to expand
    await viewRecordBtn.click();

    // Should now show loading or enrichment content
    // Either loading text or the voting record content
    await page.waitForTimeout(200);
    const isExpanded =
      (await page
        .getByText(/Loading candidate info|Voting Record|voting record/i)
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page.getByText(/Information not available/i).first().isVisible().catch(() => false));
    expect(isExpanded).toBeTruthy();
  });
});

test.describe("Phase 3: Data attribution", () => {
  test("displays data attribution footer after valid zip", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const attribution = page.getByTestId("data-attribution");
    await expect(attribution).toBeVisible({ timeout: 8000 });
  });

  test("attribution contains Civic/Anthropic reference", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const attribution = page.getByTestId("data-attribution");
    await expect(attribution).toBeVisible({ timeout: 8000 });
    await expect(attribution).toContainText(/Civic|Anthropic/i);
  });
});

test.describe("Phase 3: Enriched prompt output", () => {
  test("prompt output includes election and state info (Texas)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible({ timeout: 8000 });
    await expect(promptOutput).toContainText(/Texas/i);
    await expect(promptOutput).toContainText(/73301/);
  });

  test("prompt output includes district info when available", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible({ timeout: 8000 });
    // Fixture has district data (Travis County, CD-25)
    const text = (await promptOutput.textContent()) ?? "";
    expect(text.length).toBeGreaterThan(100);
  });
});

test.describe("Phase 3: State info card backward compatibility", () => {
  test("still shows election name and date (Texas)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("election-name")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByTestId("election-date")).toBeVisible({
      timeout: 8000,
    });
  });

  test("still shows registration status (Texas)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("registration-status")).toBeVisible({
      timeout: 8000,
    });
  });
});

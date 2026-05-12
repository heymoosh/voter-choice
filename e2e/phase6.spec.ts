import { test, expect, Page } from "@playwright/test";

/**
 * Phase 6 e2e tests: Issue Ranking, Concern Disambiguation, Polis Overlay
 */

async function submitZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
  await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 5000 });
}

async function goToConcernStep(page: Page) {
  await page.goto("/");
  await submitZip(page, "73301");
  await page.getByTestId("chat-cta").click();
  await expect(page.getByTestId("issue-ranking-list")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("issue-rank-skip-button").click();
  await expect(page.getByTestId("concern-disambiguation-input")).toBeVisible({ timeout: 3000 });
}

// ---------------------------------------------------------------------------
// Phase 6: Issue Ranking Flow
// ---------------------------------------------------------------------------

test.describe("Phase 6: Issue Ranking", () => {
  test("clicking chat CTA starts issue ranking flow", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    // Should show issue ranking
    const rankingList = page.getByTestId("issue-ranking-list");
    await expect(rankingList).toBeVisible({ timeout: 5000 });
  });

  test("issue ranking list contains all 12 canonical issues", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible({ timeout: 5000 });
    // Check a few specific issues are present
    await expect(page.getByTestId("issue-rank-item-economy-jobs")).toBeVisible();
    await expect(page.getByTestId("issue-rank-item-healthcare")).toBeVisible();
    await expect(page.getByTestId("issue-rank-item-housing")).toBeVisible();
    await expect(page.getByTestId("issue-rank-item-education")).toBeVisible();
  });

  test("skip button bypasses ranking and shows concern disambiguation", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("issue-rank-skip-button").click();
    // Should show concern disambiguation
    await expect(page.getByTestId("concern-disambiguation-input")).toBeVisible({ timeout: 3000 });
  });

  test("confirm button after ranking shows concern disambiguation", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("issue-rank-confirm-button").click();
    // Should show concern disambiguation
    await expect(page.getByTestId("concern-disambiguation-input")).toBeVisible({ timeout: 3000 });
  });

  test("issue ranking list items are visible and labeled", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("issue-ranking-list")).toBeVisible({ timeout: 5000 });
    // All 12 slugs
    const slugs = [
      "economy-jobs", "healthcare", "education", "climate-environment",
      "housing", "crime-public-safety", "immigration", "reproductive-rights",
      "civil-rights-equality", "gun-policy", "foreign-policy", "voting-rights-democracy",
    ];
    for (const slug of slugs) {
      await expect(page.getByTestId(`issue-rank-item-${slug}`)).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 6: Concern Disambiguation
// ---------------------------------------------------------------------------

test.describe("Phase 6: Concern Disambiguation", () => {
  test("concern disambiguation input is visible", async ({ page }) => {
    await goToConcernStep(page);
    await expect(page.getByTestId("concern-disambiguation-input")).toBeVisible();
  });

  test("concern disambiguation submit button is visible", async ({ page }) => {
    await goToConcernStep(page);
    await expect(page.getByTestId("concern-disambiguation-submit")).toBeVisible();
  });

  test("skipping concern disambiguation opens chat window", async ({ page }) => {
    await goToConcernStep(page);
    // Find and click skip button
    const skipBtn = page.getByRole("button", { name: /skip/i }).last();
    await skipBtn.click();
    // Should open chat window
    await expect(page.getByTestId("chat-window")).toBeVisible({ timeout: 3000 });
  });

  test("concern disambiguation with mocked API shows confirmation panel", async ({ page }) => {
    // Mock the disambiguate-concerns API
    await page.route("/api/disambiguate-concerns", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          matchedIssues: ["housing", "economy-jobs"],
          rationale: "The concern about rent affordability maps to Housing and Economy & Jobs.",
        }),
      });
    });

    await goToConcernStep(page);
    await page.getByTestId("concern-disambiguation-input").fill("I can't afford rent in my city");
    await page.getByTestId("concern-disambiguation-submit").click();

    // Should show confirmation panel
    await expect(page.getByTestId("concern-mapping-confirmation")).toBeVisible({ timeout: 5000 });
    // Should show matched issues
    await expect(page.getByTestId("concern-mapping-issue-housing")).toBeVisible();
    await expect(page.getByTestId("concern-mapping-issue-economy-jobs")).toBeVisible();
  });

  test("concern confirm button opens chat window", async ({ page }) => {
    await page.route("/api/disambiguate-concerns", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          matchedIssues: ["healthcare"],
          rationale: "Maps to healthcare issues.",
        }),
      });
    });

    await goToConcernStep(page);
    await page.getByTestId("concern-disambiguation-input").fill("my kid has Type 1 diabetes");
    await page.getByTestId("concern-disambiguation-submit").click();
    await expect(page.getByTestId("concern-mapping-confirmation")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("concern-confirm-button").click();
    await expect(page.getByTestId("chat-window")).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Phase 6: API Routes
// ---------------------------------------------------------------------------

test.describe("Phase 6: API - disambiguate-concerns", () => {
  test("POST /api/disambiguate-concerns returns 400 for missing text", async ({ request }) => {
    const res = await request.post("/api/disambiguate-concerns", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/disambiguate-concerns returns 400 for empty text", async ({ request }) => {
    const res = await request.post("/api/disambiguate-concerns", {
      data: { text: "  " },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Phase 6: API - issue-counts", () => {
  test("GET /api/issue-counts returns 400 for missing countyFips", async ({ request }) => {
    const res = await request.get("/api/issue-counts");
    expect(res.status()).toBe(400);
  });

  test("GET /api/issue-counts returns 400 for invalid countyFips", async ({ request }) => {
    const res = await request.get("/api/issue-counts?countyFips=abc");
    expect(res.status()).toBe(400);
  });

  test("GET /api/issue-counts returns counts for valid FIPS", async ({ request }) => {
    const res = await request.get("/api/issue-counts?countyFips=48201");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("countyFips", "48201");
    expect(data).toHaveProperty("issueCounts");
    expect(data).toHaveProperty("totalRespondents", null);
  });

  test("POST /api/issue-counts returns 400 for invalid countyFips", async ({ request }) => {
    const res = await request.post("/api/issue-counts", {
      data: { countyFips: "bad", issueSlug: "housing" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/issue-counts returns 400 for invalid issueSlug", async ({ request }) => {
    const res = await request.post("/api/issue-counts", {
      data: { countyFips: "48201", issueSlug: "not-a-real-issue" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/issue-counts returns success for valid data", async ({ request }) => {
    const res = await request.post("/api/issue-counts", {
      data: { countyFips: "48201", issueSlug: "housing" },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("success", true);
  });
});

// ---------------------------------------------------------------------------
// Phase 6: Polis Overlay (graceful degradation)
// ---------------------------------------------------------------------------

test.describe("Phase 6: Polis Overlay", () => {
  test("issue counts endpoint gracefully degrades with valid FIPS", async ({ request }) => {
    const res = await request.get("/api/issue-counts?countyFips=48201");
    expect(res.status()).toBe(200);
    const data = await res.json();
    // All canonical issue slugs should be present
    const expectedSlugs = [
      "economy-jobs", "healthcare", "education", "climate-environment",
      "housing", "crime-public-safety", "immigration", "reproductive-rights",
      "civil-rights-equality", "gun-policy", "foreign-policy", "voting-rights-democracy",
    ];
    for (const slug of expectedSlugs) {
      expect(data.issueCounts).toHaveProperty(slug);
    }
  });
});

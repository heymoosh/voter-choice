import { test, expect } from "@playwright/test";

/**
 * Shared e2e test suite for the ballot research tool.
 * These tests are measurement infrastructure — they run on ALL workflow branches
 * and are NOT modified by individual workflows.
 *
 * Tests rely on data-testid attributes defined in PROJECT_SPEC.md.
 * Stub data states: TX (73301), CA (90210), NH (03031), multi-state (86515 → AZ/NM).
 */

// ---------------------------------------------------------------------------
// Page load
// ---------------------------------------------------------------------------

test.describe("Page load", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/); // any non-empty title
  });

  test("zip code input is visible and focusable", async ({ page }) => {
    await page.goto("/");
    const zipInput = page.getByTestId("zip-input");
    await expect(zipInput).toBeVisible();
    await zipInput.focus();
    await expect(zipInput).toBeFocused();
  });

  test("submit button is visible", async ({ page }) => {
    await page.goto("/");
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Validation / error states
// ---------------------------------------------------------------------------

test.describe("Input validation", () => {
  test("shows error for empty submission", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/zip code/i);
  });

  test("shows error for non-numeric input", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("abcde");
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/valid/i);
  });

  test("shows error for too-short input", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("123");
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/5-digit|valid/i);
  });

  test("shows not-found message for unknown zip code", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("00000");
    await page.getByTestId("zip-submit").click();
    const notFound = page.getByTestId("not-found-message");
    await expect(notFound).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Valid zip code → state info + prompt (Texas: 73301)
// ---------------------------------------------------------------------------

test.describe("Valid zip code — Texas (73301)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
  });

  test("displays state info card", async ({ page }) => {
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
    await expect(stateInfo).toContainText(/Texas/i);
  });

  test("shows election name and date", async ({ page }) => {
    const electionName = page.getByTestId("election-name");
    const electionDate = page.getByTestId("election-date");
    await expect(electionName).toBeVisible();
    await expect(electionDate).toBeVisible();
  });

  test("shows registration status", async ({ page }) => {
    const regStatus = page.getByTestId("registration-status");
    await expect(regStatus).toBeVisible();
  });

  test("displays customized prompt output", async ({ page }) => {
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    // Prompt should contain state-specific content
    await expect(promptOutput).toContainText(/Texas/i);
    await expect(promptOutput).toContainText(/73301/);
  });

  test("prompt contains required context fields", async ({ page }) => {
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    // Should include key info from the state data
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/election/i);
    expect(text).toMatch(/registration/i);
  });
});

// ---------------------------------------------------------------------------
// Valid zip code — California (90210)
// ---------------------------------------------------------------------------

test.describe("Valid zip code — California (90210)", () => {
  test("displays California state info", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("90210");
    await page.getByTestId("zip-submit").click();
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
    await expect(stateInfo).toContainText(/California/i);
  });

  test("displays customized prompt for California", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("90210");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    await expect(promptOutput).toContainText(/California/i);
    await expect(promptOutput).toContainText(/90210/);
  });
});

// ---------------------------------------------------------------------------
// Multi-state zip code (86515 → AZ/NM)
// ---------------------------------------------------------------------------

test.describe("Multi-state zip code (86515)", () => {
  test("shows state selector for multi-state zip", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("86515");
    await page.getByTestId("zip-submit").click();
    const stateSelector = page.getByTestId("state-selector");
    await expect(stateSelector).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Copy to clipboard
// ---------------------------------------------------------------------------

test.describe("Copy to clipboard", () => {
  test("copy button is visible after valid zip submission", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const copyBtn = page.getByTestId("copy-button");
    await expect(copyBtn).toBeVisible();
  });

  test("copy button shows confirmation after click", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("copy-button").click();
    const confirmation = page.getByTestId("copy-confirmation");
    await expect(confirmation).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

test.describe("Responsive layout", () => {
  test("renders correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const zipInput = page.getByTestId("zip-input");
    await expect(zipInput).toBeVisible();
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toBeVisible();
  });

  test("renders correctly on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const zipInput = page.getByTestId("zip-input");
    await expect(zipInput).toBeVisible();
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

test.describe("Keyboard accessibility", () => {
  test("can submit zip code via Enter key", async ({ page }) => {
    await page.goto("/");
    const zipInput = page.getByTestId("zip-input");
    await zipInput.fill("73301");
    await zipInput.press("Enter");
    // Should show state info (form submitted via Enter)
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
  });

  test("can tab through interactive elements", async ({ page }) => {
    await page.goto("/");
    // Tab to zip input
    await page.keyboard.press("Tab");
    // The input should eventually be reachable via tab
    // We just verify the page doesn't crash on keyboard nav
    const zipInput = page.getByTestId("zip-input");
    await zipInput.focus();
    await expect(zipInput).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — Live Data Integration Tests
// These tests use route interception to avoid hitting real APIs.
// ---------------------------------------------------------------------------

const MOCK_CIVIC_RESPONSE = {
  pollingLocation: {
    name: "City Hall Annex",
    address: "123 Main St, Austin, TX 78701",
    hours: "7am–7pm",
  },
  ballotContests: [
    {
      contestId: "1",
      name: "U.S. Senate",
      type: "office",
      candidates: [
        { candidateId: "c1", name: "Alice Smith", party: "Party A" },
        { candidateId: "c2", name: "Bob Jones", party: "Party B" },
      ],
    },
    {
      contestId: "2",
      name: "Governor",
      type: "office",
      candidates: [
        { candidateId: "c3", name: "Carol White", party: "Party C" },
      ],
    },
  ],
  districts: {
    county: "Travis County",
    congressional: "TX-10",
    stateSenate: "TX SD-14",
    stateHouse: "TX HD-49",
  },
  fetchedAt: Date.now(),
};

const MOCK_CANDIDATE_RESPONSE = {
  votingRecord: "Voted in favor of environmental protections 8/10 times.",
  topDonors: "Top donors include local business associations.",
  endorsements: "Endorsed by the State Teachers Association.",
  sources: ["https://ballotpedia.org", "https://fec.gov"],
};

test.describe("Phase 3 — Polling Location", () => {
  test("displays polling location section after valid zip (mocked API)", async ({
    page,
  }) => {
    await page.route("**/api/civic**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CIVIC_RESPONSE),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    const pollingLocation = page.getByTestId("polling-location");
    await expect(pollingLocation).toBeVisible({ timeout: 10000 });
    await expect(pollingLocation).toContainText(/City Hall Annex/i);
  });
});

test.describe("Phase 3 — Ballot Contests", () => {
  test("displays ballot contests section after valid zip (mocked API)", async ({
    page,
  }) => {
    await page.route("**/api/civic**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CIVIC_RESPONSE),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    const ballotContests = page.getByTestId("ballot-contests");
    await expect(ballotContests).toBeVisible({ timeout: 10000 });
    await expect(ballotContests).toContainText(/U.S. Senate/i);
  });
});

test.describe("Phase 3 — Data Attribution", () => {
  test("data attribution footer is visible after valid zip", async ({
    page,
  }) => {
    await page.route("**/api/civic**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CIVIC_RESPONSE),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    const attribution = page.getByTestId("data-attribution");
    await expect(attribution).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Phase 3 — Partial API Failure", () => {
  test("shows partial error banner when civic API fails", async ({ page }) => {
    await page.route("**/api/civic**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "civic_unavailable",
          message: "Service temporarily unavailable",
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // State info card should still appear (with static data)
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible({ timeout: 10000 });

    // Partial error banner should appear
    const partialError = page.getByTestId("api-partial-error");
    await expect(partialError).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Phase 3 — Candidate Detail Panel", () => {
  test("can expand candidate detail panel", async ({ page }) => {
    await page.route("**/api/civic**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CIVIC_RESPONSE),
      });
    });

    await page.route("**/api/candidate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CANDIDATE_RESPONSE),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // Wait for ballot contests to load
    const ballotContests = page.getByTestId("ballot-contests");
    await expect(ballotContests).toBeVisible({ timeout: 10000 });

    // Click "View voting record" for the first candidate
    const viewRecordBtn = page.getByText(/View voting record/i).first();
    await expect(viewRecordBtn).toBeVisible({ timeout: 5000 });
    await viewRecordBtn.click();

    // Candidate detail should expand and show enrichment data
    const candidateDetail = page.getByTestId("candidate-detail").first();
    await expect(candidateDetail).toBeVisible({ timeout: 5000 });
    await expect(candidateDetail).toContainText(/Voting Record/i);
  });
});

test.describe("Phase 3 — Loading State", () => {
  test("shows loading indicator while data loads", async ({ page }) => {
    // Use a slow route to catch the loading state
    let resolveRoute!: () => void;
    const routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/api/civic**", async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CIVIC_RESPONSE),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // Loading indicator should be visible immediately
    const loadingEl = page.getByTestId("data-loading").first();
    await expect(loadingEl).toBeVisible({ timeout: 5000 });

    // Now let the route resolve
    resolveRoute();

    // State info should eventually appear
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Phase 3 — Session Cache", () => {
  test("second lookup for same zip does not show loading state", async ({
    page,
  }) => {
    let callCount = 0;
    await page.route("**/api/civic**", async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_CIVIC_RESPONSE, fetchedAt: Date.now() }),
      });
    });

    await page.goto("/");

    // First lookup
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 10000 });
    const firstCount = callCount;

    // Clear the form and look up the same zip again
    await page.getByTestId("zip-input").fill("");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // Result should appear (cached)
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 5000 });
    // API should not have been called again
    expect(callCount).toBe(firstCount);
  });
});

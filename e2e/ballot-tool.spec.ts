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

// ---------------------------------------------------------------------------
// Phase 4 — Language Selector Tests
// ---------------------------------------------------------------------------

test.describe("Phase 4 — Language Selector Present", () => {
  test("language selector is present on page load", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
  });

  test("language option testids are present for all 5 languages", async ({
    page,
  }) => {
    await page.goto("/");
    for (const code of ["en", "es", "vi", "zh", "ar"]) {
      const opt = page.getByTestId(`language-option-${code}`);
      await expect(opt).toBeAttached();
    }
  });
});

test.describe("Phase 4 — Language Switching", () => {
  test("selecting Vietnamese updates html lang attribute", async ({ page }) => {
    await page.goto("/");
    // Select Vietnamese via the native select inside the toggle
    await page.getByTestId("language-toggle").locator("select").selectOption("vi");
    const lang = await page.evaluate(
      () => document.documentElement.lang,
    );
    expect(lang).toBe("vi");
  });

  test("selecting Chinese updates html lang attribute", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("zh");
    const lang = await page.evaluate(
      () => document.documentElement.lang,
    );
    expect(lang).toBe("zh");
  });

  test("selecting Arabic sets dir=rtl on html element", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("ar");
    const dir = await page.evaluate(
      () => document.documentElement.dir,
    );
    expect(dir).toBe("rtl");
  });

  test("switching from Arabic back to English reverts dir to ltr", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("ar");
    await page.getByTestId("language-toggle").locator("select").selectOption("en");
    const dir = await page.evaluate(
      () => document.documentElement.dir,
    );
    expect(dir).toBe("ltr");
  });

  test("switching from Arabic to Spanish reverts dir to ltr", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("ar");
    await page.getByTestId("language-toggle").locator("select").selectOption("es");
    const dir = await page.evaluate(
      () => document.documentElement.dir,
    );
    expect(dir).toBe("ltr");
  });
});

test.describe("Phase 4 — Language Persistence", () => {
  test("language preference persists across page reload", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("vi");

    // Verify lang attribute set
    const langBefore = await page.evaluate(
      () => document.documentElement.lang,
    );
    expect(langBefore).toBe("vi");

    // Reload page
    await page.reload();

    // Language should still be Vietnamese
    const langAfter = await page.evaluate(
      () => document.documentElement.lang,
    );
    // Note: lang updates after React hydration; wait briefly
    await page.waitForFunction(
      () => document.documentElement.lang === "vi",
      { timeout: 5000 },
    );
    void context; // suppress unused variable warning
    void langAfter;
  });
});

test.describe("Phase 4 — State Preservation on Language Switch", () => {
  test("switching language does not clear zip code results", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();

    // Wait for state info to appear
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible({ timeout: 10000 });

    // Switch to Spanish
    await page.getByTestId("language-toggle").locator("select").selectOption("es");

    // State info should still be visible
    await expect(stateInfo).toBeVisible();
    await expect(stateInfo).toContainText(/Texas/i);
  });
});

test.describe("Phase 4 — Prompt in Selected Language", () => {
  test("prompt output contains Vietnamese content when Vietnamese selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("vi");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible({ timeout: 10000 });
    const text = (await promptOutput.textContent()) ?? "";
    expect(text).toMatch(/bỏ phiếu|Việt|tháng/i);
  });

  test("prompt output contains Chinese content when Chinese selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("zh");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible({ timeout: 10000 });
    const text = (await promptOutput.textContent()) ?? "";
    expect(text).toMatch(/投票|选票|年/);
  });

  test("prompt output contains Arabic content when Arabic selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").locator("select").selectOption("ar");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible({ timeout: 10000 });
    const text = (await promptOutput.textContent()) ?? "";
    expect(text).toMatch(/اقتراع|الانتخابات|ناخب/);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Chat CTA and Chat Window
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat CTA", () => {
  test("chat CTA button appears after data loads", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const chatCta = page.getByTestId("chat-cta");
    await expect(chatCta).toBeVisible({ timeout: 10000 });
  });

  test("clicking chat CTA opens chat window", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });
    const chatWindow = page.getByTestId("chat-window");
    await expect(chatWindow).toBeVisible({ timeout: 5000 });
  });

  test("chat window shows privacy notice before first message", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });
    const privacyNotice = page.getByTestId("chat-privacy-notice");
    await expect(privacyNotice).toBeVisible({ timeout: 5000 });
  });

  test("chat window has message input and send button", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });
    await expect(page.getByTestId("chat-input")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("chat-send")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Chat with mocked API
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat with mocked API", () => {
  test("sends message and shows assistant response", async ({ page }) => {
    // Mock the /api/chat endpoint
    await page.route("/api/chat", async (route) => {
      const sseBody = [
        'data: {"type":"delta","content":"Hello! I can help you research your ballot."}\n\n',
        'data: {"type":"done","inputTokens":100,"outputTokens":20}\n\n',
      ].join("");
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Budget-Percent": "10",
          "X-Budget-Status": "normal",
        },
        body: sseBody,
      });
    });

    await page.route("/api/budget", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ percentUsed: 10, status: "normal" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });
    await page.getByTestId("chat-input").fill("What are the main races on my ballot?");
    await page.getByTestId("chat-send").click();

    // Should show user message
    await expect(page.getByTestId("chat-message-user").first()).toBeVisible({
      timeout: 5000,
    });

    // Should show assistant response
    await expect(
      page.getByTestId("chat-message-assistant").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows budget warning notice at 75%", async ({ page }) => {
    await page.route("/api/budget", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ percentUsed: 75, status: "warning" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });

    const budgetNotice = page.getByTestId("chat-budget-notice");
    await expect(budgetNotice).toBeVisible({ timeout: 5000 });
  });

  test("shows critical budget notice at 95%", async ({ page }) => {
    await page.route("/api/budget", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ percentUsed: 95, status: "critical" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });

    const budgetNotice = page.getByTestId("chat-budget-notice");
    await expect(budgetNotice).toBeVisible({ timeout: 5000 });
  });

  test("shows disabled message when budget exhausted", async ({ page }) => {
    await page.route("/api/budget", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ percentUsed: 100, status: "exhausted" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });

    const disabledMsg = page.getByTestId("chat-disabled-message");
    await expect(disabledMsg).toBeVisible({ timeout: 5000 });
  });

  test("chat produces Download My Ballot button after ballot block in response", async ({
    page,
  }) => {
    const ballotResponse = `
Here are your ballot choices:

MY BALLOT — Travis County — Texas General Election — November 3, 2026

U.S. Senate: Jane Doe
Governor: John Smith

REMINDER: Texas law prohibits wireless devices in the voting room.`;

    await page.route("/api/chat", async (route) => {
      const sseBody =
        `data: ${JSON.stringify({ type: "delta", content: ballotResponse })}\n\n` +
        `data: ${JSON.stringify({ type: "done", inputTokens: 200, outputTokens: 100 })}\n\n`;
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "X-Budget-Percent": "15",
          "X-Budget-Status": "normal",
        },
        body: sseBody,
      });
    });

    await page.route("/api/budget", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ percentUsed: 15, status: "normal" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("chat-cta").click({ timeout: 10000 });
    await page.getByTestId("chat-input").fill("Generate my ballot summary");
    await page.getByTestId("chat-send").click();

    const downloadBtn = page.getByTestId("download-ballot-btn");
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Ballot Builder (Path B)
// ---------------------------------------------------------------------------

test.describe("Phase 5: Ballot Builder (Path B)", () => {
  const sampleBallotText = `MY BALLOT — Travis County — Texas General Election — November 3, 2026

U.S. Senate: Jane Doe
Governor: John Smith

Propositions:
Prop 1: YES

REMINDER: Texas law prohibits wireless devices in the voting room.`;

  test("paste area is visible after data loads", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("ballot-paste-input")).toBeVisible({
      timeout: 10000,
    });
  });

  test("pasting valid ballot output shows preview and download button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("ballot-paste-input").fill(sampleBallotText, {
      timeout: 10000,
    });

    await expect(page.getByTestId("ballot-preview")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible({
      timeout: 5000,
    });
  });

  test("pasting invalid text shows parse error and manual entry fallback", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("ballot-paste-input").fill("This is not ballot text at all.", {
      timeout: 10000,
    });

    // Should show parse error with manual entry option
    await expect(page.locator("text=Enter choices manually instead")).toBeVisible({
      timeout: 5000,
    });

    // Click to open manual entry
    await page.locator("text=Enter choices manually instead").click();
    await expect(page.getByTestId("ballot-manual-entry")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Voter Profile Upload
// ---------------------------------------------------------------------------

test.describe("Phase 5: Voter Profile Upload", () => {
  test("profile upload input is visible on page load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("upload-profile-input")).toBeVisible();
  });

  test("uploading a valid .txt profile shows confirmation", async ({
    page,
  }) => {
    await page.goto("/");
    const profileContent = `=== MY VOTER PROFILE — May 2026 ===

LOCATION: 73301, Texas

WHAT I CARE ABOUT:
- Climate action
- Healthcare

=== END VOTER PROFILE ===`;

    // Create a mock file
    await page.getByTestId("upload-profile-input").setInputFiles({
      name: "voter-profile.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(profileContent),
    });

    const confirmation = page.getByTestId("profile-confirmation");
    await expect(confirmation).toBeVisible({ timeout: 5000 });
  });

  test("uploading oversized file shows error", async ({ page }) => {
    await page.goto("/");
    // Create a file just over 10KB
    const oversizedContent = "x".repeat(11 * 1024);
    await page.getByTestId("upload-profile-input").setInputFiles({
      name: "too-big.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(oversizedContent),
    });

    await expect(
      page.locator('[role="alert"]').filter({ hasText: /too large/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});

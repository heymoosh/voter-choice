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
// Language toggle (Phase 2)
// ---------------------------------------------------------------------------

test.describe("Language toggle", () => {
  test("language toggle button is visible", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
  });

  test("language toggle shows Español by default (English mode)", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toContainText("Español");
  });

  test("clicking language toggle switches to Spanish", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await toggle.click();
    // After switching to Spanish, toggle should show "English"
    await expect(toggle).toContainText("English");
  });

  test("switching to Spanish translates hero title", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await toggle.click();
    // Hero title should be in Spanish
    await expect(page.locator("h1")).toContainText("Herramienta");
  });

  test("switching language preserves zip code results", async ({ page }) => {
    await page.goto("/");
    // Submit a zip code
    const zipInput = page.getByTestId("zip-input");
    await zipInput.fill("73301");
    await page.getByTestId("zip-submit").click();
    // Wait for state info
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
    // Toggle language
    const toggle = page.getByTestId("language-toggle");
    await toggle.click();
    // State info should still be visible (no page reset)
    await expect(stateInfo).toBeVisible();
  });

  test("language toggle is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    // Should have switched languages
    await expect(toggle).toContainText("English");
  });
});

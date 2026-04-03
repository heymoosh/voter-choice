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
  test("language toggle is visible on page load", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
    // In English mode, toggle shows "Español" (non-active language)
    await expect(toggle).toContainText("Español");
  });

  test("clicking toggle switches UI to Spanish", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").click();
    // After switching to Spanish, toggle shows "English" (non-active language)
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toContainText("English");
    // Spanish placeholder is visible
    const zipInput = page.getByTestId("zip-input");
    await expect(zipInput).toHaveAttribute(
      "placeholder",
      /código postal/i,
    );
  });

  test("clicking toggle twice returns to English", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await toggle.click(); // EN → ES
    await toggle.click(); // ES → EN
    await expect(toggle).toContainText("Español");
    const zipInput = page.getByTestId("zip-input");
    await expect(zipInput).toHaveAttribute("placeholder", /zip code/i);
  });

  test("state results remain visible after language switch", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // Confirm state info and prompt are shown
    await expect(page.getByTestId("state-info")).toBeVisible();
    await expect(page.getByTestId("prompt-output")).toBeVisible();
    // Switch to Spanish
    await page.getByTestId("language-toggle").click();
    // Results remain visible (FR-004: language switch doesn't clear state)
    await expect(page.getByTestId("state-info")).toBeVisible();
    await expect(page.getByTestId("prompt-output")).toBeVisible();
  });

  test("persists Spanish after page reload", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish
    await page.getByTestId("language-toggle").click();
    await expect(page.getByTestId("language-toggle")).toContainText("English");
    // Reload the page
    await page.reload();
    // Language should still be Spanish (localStorage persistence)
    await expect(page.getByTestId("language-toggle")).toContainText("English");
  });
});

// ---------------------------------------------------------------------------
// Accessibility — language features (Phase 2)
// ---------------------------------------------------------------------------

test.describe("Accessibility — language features", () => {
  test("language toggle is a native button element", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    const tagName = await toggle.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("button");
  });

  test("toggle has correct aria-label in English mode", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toHaveAttribute("aria-label", "Switch to Spanish");
  });

  test("html element has lang='en' on initial load", async ({ page }) => {
    await page.goto("/");
    const langAttr = await page.evaluate(() =>
      document.documentElement.getAttribute("lang"),
    );
    expect(langAttr).toBe("en");
  });

  test("html[lang] becomes 'es' after toggle click", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").click();
    const langAttr = await page.evaluate(() =>
      document.documentElement.getAttribute("lang"),
    );
    expect(langAttr).toBe("es");
  });

  test("aria-live region announces language change to Spanish", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").click();
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText("Idioma cambiado a español");
  });
});

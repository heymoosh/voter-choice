import { test, expect } from "@playwright/test";

/**
 * Phase 2 e2e tests: Language toggle functionality.
 * Tests rely on data-testid="language-toggle" defined in PHASE2_SPEC.md.
 */

test.describe("Language toggle", () => {
  test("language toggle is visible on page load", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
  });

  test("default language is English", async ({ page }) => {
    await page.goto("/");
    // Default should show Spanish option (toggling to Spanish)
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toContainText(/Español/i);
  });

  test("clicking toggle switches to Spanish", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await toggle.click();
    // After switching to Spanish, toggle should say English
    await expect(toggle).toContainText(/English/i);
    // UI should show Spanish text
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
  });

  test("toggling preserves application state", async ({ page }) => {
    await page.goto("/");
    // Submit a zip code first
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // Wait for results
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
    // Now switch language
    await page.getByTestId("language-toggle").click();
    // State info should still be visible (state not reset)
    await expect(stateInfo).toBeVisible();
    await expect(stateInfo).toContainText(/Texas/i);
  });

  test("html lang attribute updates on language switch", async ({ page }) => {
    await page.goto("/");
    // Default lang should be en
    const htmlLang = await page.getAttribute("html", "lang");
    expect(htmlLang).toBe("en");
    // Switch to Spanish
    await page.getByTestId("language-toggle").click();
    // Wait for lang attribute update
    await page.waitForFunction(
      () => document.documentElement.lang === "es",
      { timeout: 2000 },
    );
    const langAfter = await page.getAttribute("html", "lang");
    expect(langAfter).toBe("es");
  });

  test("language preference persists across page refresh", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish
    await page.getByTestId("language-toggle").click();
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
    // Reload page
    await page.reload();
    // Should still be in Spanish
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText(/English/i);
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
  });

  test("toggle is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    // Focus and activate with Enter key
    await toggle.focus();
    await toggle.press("Enter");
    // Language should have switched
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
  });

  test("toggle is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
  });

  test("Spanish error messages display correctly", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish
    await page.getByTestId("language-toggle").click();
    // Submit empty form
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/código postal/i);
  });

  test("Spanish prompt shows Spanish content", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish first
    await page.getByTestId("language-toggle").click();
    // Submit a zip code
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    // Spanish context block should have Spanish greeting
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/Hola|Voy a votar|boleta/i);
  });
});

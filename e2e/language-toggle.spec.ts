import { test, expect } from "@playwright/test";

/**
 * Phase 2 + Phase 4 e2e tests: Language selector functionality.
 * Phase 2 tested an en/es toggle button.
 * Phase 4 upgraded to a 5-language <select> element.
 * data-testid="language-toggle" is preserved for backward compatibility.
 */

test.describe("Language selector", () => {
  test("language selector is visible on page load", async ({ page }) => {
    await page.goto("/");
    const selector = page.getByTestId("language-toggle");
    await expect(selector).toBeVisible();
  });

  test("default language is English", async ({ page }) => {
    await page.goto("/");
    // Default state: submit button shows English text
    await expect(page.getByTestId("zip-submit")).toContainText(
      /Look up my ballot/i,
    );
  });

  test("language-option-{code} test IDs present for all 5 languages", async ({
    page,
  }) => {
    await page.goto("/");
    for (const code of ["en", "es", "vi", "zh", "ar"]) {
      const option = page.getByTestId(`language-option-${code}`);
      await expect(option).toBeAttached();
    }
  });

  test("switching to Spanish updates UI text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("es");
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
  });

  test("switching to Vietnamese updates UI text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await expect(page.getByTestId("zip-submit")).toContainText(/Tra cứu/i);
  });

  test("switching to Chinese updates UI text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await expect(page.getByTestId("zip-submit")).toContainText(/查询/);
  });

  test("switching to Arabic updates UI text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await expect(page.getByTestId("zip-submit")).toContainText(/ابحث/);
  });

  test("switching language preserves application state", async ({ page }) => {
    await page.goto("/");
    // Submit a zip code first
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // Wait for results
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();
    await expect(stateInfo).toContainText(/Texas/i);
    // Now switch language
    await page.getByTestId("language-toggle").selectOption("es");
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
    await page.getByTestId("language-toggle").selectOption("es");
    await page.waitForFunction(
      () => document.documentElement.lang === "es",
      { timeout: 2000 },
    );
    const langAfter = await page.getAttribute("html", "lang");
    expect(langAfter).toBe("es");
  });

  test("html lang attribute updates to vi", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await page.waitForFunction(
      () => document.documentElement.lang === "vi",
      { timeout: 2000 },
    );
    const langAttr = await page.getAttribute("html", "lang");
    expect(langAttr).toBe("vi");
  });

  test("html lang attribute updates to zh", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await page.waitForFunction(
      () => document.documentElement.lang === "zh",
      { timeout: 2000 },
    );
    const langAttr = await page.getAttribute("html", "lang");
    expect(langAttr).toBe("zh");
  });

  test("Arabic sets html dir=rtl", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.waitForFunction(
      () =>
        document.documentElement.lang === "ar" &&
        document.documentElement.dir === "rtl",
      { timeout: 2000 },
    );
    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("rtl");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("ar");
  });

  test("switching from Arabic back to English reverts dir to ltr", async ({
    page,
  }) => {
    await page.goto("/");
    // Switch to Arabic first
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.waitForFunction(
      () => document.documentElement.dir === "rtl",
      { timeout: 2000 },
    );
    // Switch back to English
    await page.getByTestId("language-toggle").selectOption("en");
    await page.waitForFunction(
      () => document.documentElement.dir === "ltr",
      { timeout: 2000 },
    );
    const dir = await page.getAttribute("html", "dir");
    expect(dir).toBe("ltr");
  });

  test("language preference persists across page refresh (Vietnamese)", async ({
    page,
  }) => {
    await page.goto("/");
    // Switch to Vietnamese
    await page.getByTestId("language-toggle").selectOption("vi");
    await expect(page.getByTestId("zip-submit")).toContainText(/Tra cứu/i);
    // Reload page
    await page.reload();
    // Should still be in Vietnamese
    await expect(page.getByTestId("zip-submit")).toContainText(/Tra cứu/i);
  });

  test("language preference persists across page refresh (Spanish)", async ({
    page,
  }) => {
    await page.goto("/");
    // Switch to Spanish
    await page.getByTestId("language-toggle").selectOption("es");
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
    // Reload page
    await page.reload();
    // Should still be in Spanish
    await expect(page.getByTestId("zip-submit")).toContainText(/Buscar/i);
  });

  test("selector is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const selector = page.getByTestId("language-toggle");
    await expect(selector).toBeVisible();
  });

  test("Spanish error messages display correctly", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish
    await page.getByTestId("language-toggle").selectOption("es");
    // Submit empty form
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/código postal/i);
  });

  test("Spanish prompt shows Spanish content", async ({ page }) => {
    await page.goto("/");
    // Switch to Spanish first
    await page.getByTestId("language-toggle").selectOption("es");
    // Submit a zip code
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    // Spanish context block should have Spanish greeting
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/Hola|Voy a votar|boleta/i);
  });

  test("Vietnamese prompt shows Vietnamese content", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/Xin chào|lá phiếu|tháng/i);
  });

  test("Chinese prompt shows Chinese content", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/你好|选票|年.*月.*日/);
  });

  test("Arabic prompt shows Arabic content", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) || "";
    expect(text).toMatch(/مرحباً|الاقتراع|مارس|أبريل|مايو/);
  });
});

import { test, expect } from "@playwright/test";

/**
 * Phase 4: Extended Language Support (Vietnamese, Chinese, Arabic)
 * Tests for language selection, RTL support, persistence, and prompt output.
 */

test.describe("Phase 4: Language Selector", () => {
  test("language selector is visible on page load", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
  });

  test("language selector has all 5 language options", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("language-toggle");
    await expect(toggle).toBeVisible();
    // Verify select has all 5 options
    const options = await toggle.locator("option").count();
    expect(options).toBe(5);
  });

  test("language options have correct data-testid attributes", async ({
    page,
  }) => {
    await page.goto("/");
    const codes = ["en", "es", "vi", "zh", "ar"];
    for (const code of codes) {
      const option = page.getByTestId(`language-option-${code}`);
      await expect(option).toHaveCount(1);
    }
  });

  test("switching to Vietnamese updates zip submit button text", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await expect(page.getByTestId("zip-submit")).toContainText("Tra Cứu");
  });

  test("switching to Chinese updates zip submit button text", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await expect(page.getByTestId("zip-submit")).toContainText("查询");
  });

  test("switching to Arabic updates zip submit button text", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await expect(page.getByTestId("zip-submit")).toContainText("بحث");
  });

  test("switching to Spanish updates zip submit button text", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("es");
    await expect(page.getByTestId("zip-submit")).toContainText("Buscar");
  });
});

test.describe("Phase 4: HTML lang attribute", () => {
  test("html lang attribute updates to vi", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("vi");
  });

  test("html lang attribute updates to zh", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("zh");
  });

  test("html lang attribute updates to ar", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("ar");
  });
});

test.describe("Phase 4: Arabic RTL support", () => {
  test("Arabic sets dir=rtl on html element", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });

  test("switching from Arabic to English reverts dir=ltr", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("language-toggle").selectOption("en");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("switching from Arabic to Spanish reverts to ltr", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("language-toggle").selectOption("es");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("switching from Arabic to Vietnamese reverts to ltr", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("language-toggle").selectOption("vi");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("LTR languages do not set dir=rtl", async ({ page }) => {
    await page.goto("/");
    for (const lang of ["en", "es", "vi", "zh"]) {
      await page.getByTestId("language-toggle").selectOption(lang);
      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    }
  });
});

test.describe("Phase 4: Language persistence", () => {
  test("Vietnamese persists across page refresh", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await page.reload();
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("vi");
    await expect(page.getByTestId("zip-submit")).toContainText("Tra Cứu");
  });

  test("Arabic persists across page refresh with RTL", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.reload();
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("ar");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });
});

test.describe("Phase 4: State preservation on language switch", () => {
  test("state info card remains visible after language switch", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // Wait for state info to appear
    await expect(page.getByTestId("state-info-card")).toBeVisible({
      timeout: 5000,
    });
    // Switch language
    await page.getByTestId("language-toggle").selectOption("vi");
    // State info should still be visible (no state loss)
    await expect(page.getByTestId("state-info-card")).toBeVisible();
  });

  test("prompt output remains visible after language switch", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info-card")).toBeVisible({
      timeout: 5000,
    });
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    // Switch language — results should not be cleared
    await page.getByTestId("language-toggle").selectOption("zh");
    await expect(page.getByTestId("state-info-card")).toBeVisible();
  });
});

test.describe("Phase 4: Prompt output in selected language", () => {
  test("prompt output contains Vietnamese text for vi language", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info-card")).toBeVisible({
      timeout: 5000,
    });
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = await promptOutput.textContent();
    // Should contain Vietnamese text (tháng = month in Vietnamese)
    expect(text).toMatch(/tháng|không đảng phái|bỏ phiếu/);
  });

  test("prompt output contains Chinese date format for zh language", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info-card")).toBeVisible({
      timeout: 5000,
    });
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = await promptOutput.textContent();
    // Should contain Chinese date format (年月日)
    expect(text).toMatch(/年.*月.*日/);
  });

  test("prompt output contains Arabic text for ar language", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info-card")).toBeVisible({
      timeout: 5000,
    });
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = await promptOutput.textContent();
    // Should contain Arabic text
    expect(text).toMatch(/غير حزبي|ساعدني|اقتراع/);
  });
});

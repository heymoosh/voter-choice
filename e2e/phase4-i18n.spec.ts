import { test, expect } from "@playwright/test";

/**
 * Phase 4 e2e tests: Extended language support (Vietnamese, Chinese, Arabic).
 * Tests cover: language selection, RTL layout, date formatting,
 * language persistence, state preservation, character rendering.
 */

// ---------------------------------------------------------------------------
// Language selector presence
// ---------------------------------------------------------------------------

test.describe("Language selector", () => {
  test("language selector is present on page load", async ({ page }) => {
    await page.goto("/");
    const selector = page.getByTestId("language-toggle");
    await expect(selector).toBeVisible();
  });

  test("language selector has all 5 language options", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("language-option-en")).toBeAttached();
    await expect(page.getByTestId("language-option-es")).toBeAttached();
    await expect(page.getByTestId("language-option-vi")).toBeAttached();
    await expect(page.getByTestId("language-option-zh")).toBeAttached();
    await expect(page.getByTestId("language-option-ar")).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Language switching — UI text updates
// ---------------------------------------------------------------------------

test.describe("Language switching — Spanish", () => {
  test("switching to Spanish updates submit button text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("es");
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toContainText(/investigar/i);
  });
});

test.describe("Language switching — Vietnamese", () => {
  test("switching to Vietnamese updates submit button text", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toContainText(/Nghiên cứu/i);
  });

  test("switching to Vietnamese updates page language attribute", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("vi");
  });
});

test.describe("Language switching — Chinese", () => {
  test("switching to Chinese updates submit button text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toContainText("研究选票");
  });

  test("switching to Chinese updates page language attribute", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("zh");
  });
});

test.describe("Language switching — Arabic", () => {
  test("switching to Arabic updates submit button text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const submitBtn = page.getByTestId("zip-submit");
    await expect(submitBtn).toContainText("البحث في بطاقة الاقتراع");
  });

  test("switching to Arabic sets dir=rtl on html element", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });

  test("switching to Arabic updates page language attribute", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("ar");
  });

  test("switching away from Arabic reverts dir to ltr", async ({ page }) => {
    await page.goto("/");
    // Set Arabic
    await page.getByTestId("language-toggle").selectOption("ar");
    let dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");

    // Switch back to English
    await page.getByTestId("language-toggle").selectOption("en");
    dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("switching from Arabic to Vietnamese reverts dir to ltr", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("language-toggle").selectOption("vi");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });
});

// ---------------------------------------------------------------------------
// Language persistence across page refresh
// ---------------------------------------------------------------------------

test.describe("Language persistence", () => {
  test("Vietnamese persists after page refresh", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    // Verify it's applied before reload
    await page.waitForFunction(() => document.documentElement.lang === "vi");
    // Refresh
    await page.reload();
    // Wait for the client-side useEffect to hydrate and apply the persisted lang
    await page.waitForFunction(() => document.documentElement.lang === "vi", {
      timeout: 5000,
    });
    const langAfterReload = await page.evaluate(
      () => document.documentElement.lang,
    );
    expect(langAfterReload).toBe("vi");
  });

  test("Arabic persists after page refresh and RTL is restored", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.waitForFunction(() => document.documentElement.dir === "rtl");
    await page.reload();
    // Wait for the client-side hydration to restore RTL
    await page.waitForFunction(() => document.documentElement.dir === "rtl", {
      timeout: 5000,
    });
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });

  test("Chinese persists after page refresh", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await page.waitForFunction(() => document.documentElement.lang === "zh");
    await page.reload();
    // Wait for the client-side hydration to restore persisted language
    await page.waitForFunction(() => document.documentElement.lang === "zh", {
      timeout: 5000,
    });
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe("zh");
  });
});

// ---------------------------------------------------------------------------
// State preservation on language switch
// ---------------------------------------------------------------------------

test.describe("State preservation on language switch", () => {
  test("switching language after zip submission preserves results", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    // Wait for state info
    await page.getByTestId("state-info").waitFor({ state: "visible" });

    // Switch to Vietnamese
    await page.getByTestId("language-toggle").selectOption("vi");

    // State info should still be visible
    const stateInfo = page.getByTestId("state-info");
    await expect(stateInfo).toBeVisible();

    // Prompt should still be visible
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
  });

  test("switching to Chinese after zip submission keeps state info visible", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("90210");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });

    await page.getByTestId("language-toggle").selectOption("zh");

    await expect(page.getByTestId("state-info")).toBeVisible();
  });

  test("switching to Arabic after zip submission keeps prompt visible", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.getByTestId("state-info").waitFor({ state: "visible" });

    await page.getByTestId("language-toggle").selectOption("ar");

    await expect(page.getByTestId("prompt-output")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Prompt output language
// ---------------------------------------------------------------------------

test.describe("Prompt output language", () => {
  test("prompt contains Vietnamese text when Vietnamese is selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) ?? "";
    // Vietnamese prompt should contain Vietnamese phrases
    expect(text).toMatch(/Bước|bỏ phiếu|phiếu bầu/i);
  });

  test("prompt contains Chinese text when Chinese is selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) ?? "";
    // Chinese prompt should contain Chinese characters
    expect(text).toMatch(/选票|投票|选举/);
  });

  test("prompt contains Arabic text when Arabic is selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    const text = (await promptOutput.textContent()) ?? "";
    // Arabic prompt should contain Arabic script
    expect(text).toMatch(/بطاقة|الاقتراع|التصويت/);
  });
});

// ---------------------------------------------------------------------------
// Character rendering verification
// ---------------------------------------------------------------------------

test.describe("Character rendering", () => {
  test("Vietnamese diacritics render correctly in UI", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("vi");
    // Look for Vietnamese-specific characters in the page
    const content = await page.locator("body").textContent();
    // The submit button should have Vietnamese text with diacritics
    expect(content).toMatch(/[àáâãèéêìíòóôõùúýăđơư]/i);
  });

  test("Chinese characters render correctly in UI", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("zh");
    const content = await page.locator("body").textContent();
    // Should contain CJK characters
    expect(content).toMatch(/[一-鿿]/);
  });

  test("Arabic script renders correctly in UI", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("language-toggle").selectOption("ar");
    const content = await page.locator("body").textContent();
    // Should contain Arabic script characters
    expect(content).toMatch(/[؀-ۿ]/);
  });
});

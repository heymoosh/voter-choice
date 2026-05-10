import { test, expect, type Page } from "@playwright/test";

/** Fill the zip-code form and submit. */
async function fillZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
}

/** Wait for the research workspace to be fully visible (chat + prompt). */
async function waitForResearchWorkspace(page: Page) {
  await page.getByTestId("chat-window").waitFor({
    state: "visible",
    timeout: 10000,
  });
  await page.getByTestId("prompt-output").waitFor({
    state: "visible",
    timeout: 10000,
  });
}

async function resolveTexasRunoffGate(page: import("@playwright/test").Page) {
  const gate = page.getByTestId("runoff-gate");
  await gate.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await gate.isVisible().catch(() => false)) {
    await expect(gate).toBeVisible();
    await page.getByTestId("runoff-option-unsure").click();
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="chat-window"]') &&
        !!document.querySelector('[data-testid="prompt-output"]'),
      { timeout: 10000 },
    );
  }
}

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
    await expect(error).toContainText(/address/i);
  });

  test("shows error for non-numeric input", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("abcde");
    await page.getByTestId("zip-submit").click();
    const error = page.getByTestId("zip-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/5-digit zip code/i);
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
    await resolveTexasRunoffGate(page);
    await page.getByTestId("chat-window").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.getByTestId("prompt-output").waitFor({
      state: "visible",
      timeout: 10000,
    });
  });

  test("displays research workspace", async ({ page }) => {
    await expect(page.getByTestId("chat-window")).toBeVisible();
    await expect(page.getByTestId("prompt-output")).toBeVisible();
    await expect(page.getByTestId("ballot-data-status")).toBeVisible();
  });

  test("shows Texas context in fallback prompt", async ({ page }) => {
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    await expect(promptOutput).toContainText(/Texas/i);
    await expect(promptOutput).toContainText(/73301/);
  });

  test("shows ballot data completeness status", async ({ page }) => {
    const ballotStatus = page.getByTestId("ballot-data-status");
    await expect(ballotStatus).toBeVisible();
    await expect(ballotStatus).toContainText(/Exact ballot|Official contests/i);
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
    await expect(page.getByTestId("chat-window")).toBeVisible();
    await expect(page.getByTestId("prompt-output")).toContainText(
      /California/i,
    );
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
    await resolveTexasRunoffGate(page);
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
    await resolveTexasRunoffGate(page);
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
    await resolveTexasRunoffGate(page);
    // Should show research workspace (form submitted via Enter)
    await expect(page.getByTestId("chat-window")).toBeVisible();
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
// Legal pages
// ---------------------------------------------------------------------------

test.describe("Privacy Policy page", () => {
  test("loads and has correct heading", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle(/Privacy Policy/i);
    await expect(
      page.getByRole("heading", { name: /Privacy Policy/i, level: 1 }),
    ).toBeVisible();
  });

  test("contains key privacy sections", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { name: /Minimal Data Collection/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /What We Cannot Provide/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Chat Conversations/i }),
    ).toBeVisible();
    await expect(page.getByText(/Grey Bird LLC/i).first()).toBeVisible();
  });

  test("back link navigates to home", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("link", { name: /Back to Voter Choice/i }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Terms of Use page", () => {
  test("loads and has correct heading", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveTitle(/Terms of Use/i);
    await expect(
      page.getByRole("heading", { name: /Terms of Use/i, level: 1 }),
    ).toBeVisible();
  });

  test("contains key terms sections", async ({ page }) => {
    await page.goto("/terms");
    await expect(
      page.getByRole("heading", { name: /Research Purposes Only/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /AI Can Make Mistakes/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Not Affiliated with Government/i }),
    ).toBeVisible();
  });

  test("back link navigates to home", async ({ page }) => {
    await page.goto("/terms");
    await page.getByRole("link", { name: /Back to Voter Choice/i }).click();
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Footer navigation
// ---------------------------------------------------------------------------

test.describe("Footer links", () => {
  test("footer contains privacy and terms links", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: /Privacy/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Terms/i })).toBeVisible();
  });

  test("privacy link navigates to privacy page", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: /Privacy/i }).click();
    await expect(page).toHaveURL("/privacy");
    await expect(
      page.getByRole("heading", { name: /Privacy Policy/i }),
    ).toBeVisible();
  });

  test("terms link navigates to terms page", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: /Terms/i }).click();
    await expect(page).toHaveURL("/terms");
    await expect(
      page.getByRole("heading", { name: /Terms of Use/i }),
    ).toBeVisible();
  });

  test("footer shows copyright", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(/Grey Bird LLC/);
  });

  test("footer shows data last updated", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(/Data last updated/i);
  });
});

// ---------------------------------------------------------------------------
// Per-state coverage — all 9 populated states + Wyoming fallback
// ---------------------------------------------------------------------------

// Texas (73301) — runoff gate should be visible (runoff upcoming, partyLocked=true)
test.describe("State coverage — Texas runoff gate (73301)", () => {
  test("shows runoff gate for Texas address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "73301");
    const gate = page.getByTestId("runoff-gate");
    await gate.waitFor({ state: "visible", timeout: 8000 });
    await expect(gate).toBeVisible();
    // Gate title references Texas
    await expect(gate).toContainText(/Texas/i);
  });
});

// New York (10007) — no runoff gate; prompt contains state name and registration deadline
test.describe("State coverage — New York (10007)", () => {
  test("renders New York-specific data for a NY address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "10007");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // No runoff gate for NY
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/New York/i);
    // Registration deadline from NY top-level registration (general: 2026-10-09)
    await expect(promptOutput).toContainText(/2026-10-09/);
  });
});

// Florida (32399) — no runoff gate; state name in prompt
test.describe("State coverage — Florida (32399)", () => {
  test("renders Florida-specific data for a FL address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "32399");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/Florida/i);
    // Registration deadline from FL top-level registration: 2026-10-05
    await expect(promptOutput).toContainText(/2026-10-05/);
  });
});

// Georgia (30303) — runoff gate IS visible (runoff upcoming, partyLocked=true)
test.describe("State coverage — Georgia runoff gate (30303)", () => {
  test("shows runoff gate for Georgia address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "30303");
    const gate = page.getByTestId("runoff-gate");
    await gate.waitFor({ state: "visible", timeout: 8000 });
    await expect(gate).toBeVisible();
    // Gate title references Georgia
    await expect(gate).toContainText(/Georgia/i);
  });
});

// North Carolina (27601) — runoff upcoming but partyLocked=false → no runoff gate
test.describe("State coverage — North Carolina (27601)", () => {
  test("renders North Carolina-specific data for a NC address", async ({
    page,
  }) => {
    await page.goto("/");
    await fillZip(page, "27601");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // NC has runoff but partyLockedToFirstRoundPrimary=false → no runoff gate
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/North Carolina/i);
    // Registration deadline from NC top-level registration: 2026-10-09
    await expect(promptOutput).toContainText(/2026-10-09/);
  });
});

// New Hampshire (03301) — no online reg deadline (SDR state); no runoff gate
test.describe("State coverage — New Hampshire (03301)", () => {
  test("renders New Hampshire-specific data for a NH address", async ({
    page,
  }) => {
    await page.goto("/");
    await fillZip(page, "03301");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/New Hampshire/i);
    // NH has no online registration deadline (same-day registration state)
    // Confirm state name appears without asserting an online deadline date
  });
});

// Arizona (86515 — multi-state AZ/NM; user must select state)
test.describe("State coverage — Arizona via multi-state selector (86515)", () => {
  test("shows state selector then renders Arizona data", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "86515");
    // Multi-state selector appears (renders state codes as button labels)
    const stateSelector = page.getByTestId("state-selector");
    await expect(stateSelector).toBeVisible();
    // Select Arizona — buttons show state code "AZ"
    await stateSelector.getByRole("button", { name: "AZ" }).click();
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/Arizona/i);
    // Registration deadline from AZ top-level registration: 2026-07-06
    await expect(promptOutput).toContainText(/2026-07-06/);
  });
});

// New Mexico (86515 — multi-state AZ/NM; user selects NM)
test.describe("State coverage — New Mexico via multi-state selector (86515)", () => {
  test("shows state selector then renders New Mexico data", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "86515");
    const stateSelector = page.getByTestId("state-selector");
    await expect(stateSelector).toBeVisible();
    // Select New Mexico — buttons show state code "NM"
    await stateSelector.getByRole("button", { name: "NM" }).click();
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await waitForResearchWorkspace(page);
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toContainText(/New Mexico/i);
  });
});

// Wyoming (82001) — unpopulated state: zip not in lookup ranges → not-found-message
test.describe("State coverage — Wyoming fallback (82001)", () => {
  test("renders not-found for an unpopulated state zip (Wyoming)", async ({
    page,
  }) => {
    await page.goto("/");
    await fillZip(page, "82001");
    // Wyoming is not in the zip lookup ranges; app shows not-found-message
    const notFound = page.getByTestId("not-found-message");
    await expect(notFound).toBeVisible();
    // Runoff gate should not appear
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
  });
});

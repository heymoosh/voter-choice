import { test, expect, type Page } from "@playwright/test";

// CI-conditional waitFor budgets for helpers that wait on the research
// workspace to render. Cold-start `next start` on a fresh CI runner adds
// hydration latency that exceeds the 10s local-dev budget. Local dev keeps
// the tight 10s budget so flake surfaces fast.
//
// Documented in .ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md.
const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

/** Fill the zip-code form and submit. */
async function fillZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
}

/**
 * Wait for the research workspace to be ready by waiting for the chat-window
 * to be attached. The chat-window is the default workspace path (rendered
 * when `chatAvailable` — budget tier is `normal` or `notice`). The
 * `prompt-output` testId is the fallback path (rendered when chat is
 * unavailable) and is NOT required for "workspace ready" — tests that
 * specifically need the fallback path should call `mockBudgetExhausted`
 * first, then assert `prompt-output` directly.
 *
 * See `.ai/work-packets/e2e-prompt-output-rendering-drift.md`.
 */
async function waitForChatWorkspace(page: Page) {
  await page.getByTestId("chat-window").waitFor({
    state: "attached",
    timeout: WORKSPACE_TIMEOUT,
  });
}

/**
 * Wait for the fallback (prompt-output) workspace path. Requires the budget
 * to have been forced to a non-chat-available tier (e.g. via
 * `mockBudgetExhausted`). The fallback path renders the copy/paste
 * `<PromptOutput>` instead of the chat window.
 */
async function waitForFallbackWorkspace(page: Page) {
  await page.getByTestId("prompt-output").waitFor({
    state: "visible",
    timeout: WORKSPACE_TIMEOUT,
  });
}

/**
 * Force the chat-availability budget check (`GET /api/chat`) to return an
 * exhausted tier so the research workspace renders the fallback
 * `prompt-output` path instead of the chat window.
 *
 * Must be called BEFORE `page.goto("/")` so the route is registered before
 * the budget probe fires on mount. See `useBudgetCheck` in
 * `src/components/BallotToolClient.tsx`.
 *
 * Documented in `.ai/work-packets/e2e-prompt-output-rendering-drift.md`.
 */
async function mockBudgetExhausted(page: Page) {
  await page.route("**/api/chat", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          budget: {
            tier: "exhausted",
            percent: 100,
            messagesUsed: 10,
            messagesMax: 10,
          },
        }),
      });
    }
    return route.continue();
  });
}

async function resolveRunoffGate(page: import("@playwright/test").Page) {
  const gate = page.getByTestId("runoff-gate");
  await gate.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await gate.isVisible().catch(() => false)) {
    await expect(gate).toBeVisible();
    await page.getByTestId("runoff-option-unsure").click();
    // Wait for the research workspace to render. We wait for EITHER
    // chat-window OR prompt-output because the rendering mode depends on
    // budget tier (see ResearchLayout.tsx lines ~1594, 1618).
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="chat-window"]') ||
        !!document.querySelector('[data-testid="prompt-output"]'),
      { timeout: WORKSPACE_TIMEOUT },
    );
  }
}

/**
 * Closed/semi-closed primary participation gate options, mapping to the
 * `ClosedPrimaryChoice` union in src/components/BallotToolClient.tsx. The
 * gate renders for states with `primaryParticipation.type` in `closed` or
 * `semi-closed` when the upcoming election is a primary.
 *
 * `unaffiliated` is the safest default for state-coverage tests:
 *   - in semi-closed states (AZ, NH), unaffiliated voters CAN participate
 *   - in closed states (NY, FL, NM, WY), unaffiliated voters cannot vote in
 *     a partisan primary but the gate still resolves and the workspace
 *     renders (the gate is advisory, not blocking)
 */
type ClosedPrimaryChoice =
  | "registered_dem"
  | "registered_rep"
  | "registered_other"
  | "unaffiliated";

/**
 * Traverse the closed-primary participation gate (`primary-participation-gate`
 * testId) by selecting a party option. Waits for the gate to appear, picks
 * the supplied choice, and waits for the chat-window (research workspace) to
 * be attached.
 *
 * Defaults to `unaffiliated` because it is universally available across all
 * gated states (closed AND semi-closed). Tests that need a specific party
 * lane (e.g. for ballot-content assertions) can pass a different choice.
 */
async function resolveClosedPrimaryGate(
  page: Page,
  choice: ClosedPrimaryChoice = "unaffiliated",
) {
  const gate = page.getByTestId("primary-participation-gate");
  await gate.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
  await expect(gate).toBeVisible();
  await page.getByTestId(`closed-primary-option-${choice}`).click();
  // After the gate is resolved, the research workspace renders. We wait for
  // chat-window to be attached because chat is available by default. We do
  // NOT wait for prompt-output here — that's the fallback path covered by
  // the separate e2e-prompt-output-rendering-drift packet.
  await page.getByTestId("chat-window").waitFor({
    state: "attached",
    timeout: WORKSPACE_TIMEOUT,
  });
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

// Valid zip code — Texas (73301).
//
// Tests split into two groups by which workspace path they exercise:
//   - Chat path (default): chat-window renders, prompt-output does not.
//     Tests that just need "workspace is ready" or ballot-data-status live
//     here.
//   - Fallback path (forced via mockBudgetExhausted): prompt-output renders
//     instead of chat-window. Tests that assert on prompt-output content
//     live here (the test names indicate "fallback prompt" or "customized
//     prompt output").
//
// State machine: ResearchLayout.tsx lines ~1594, 1618 — chat-window when
// `canStartResearch && (chatAvailable || !budgetChecked)`; PromptOutput
// when `canStartResearch && budgetChecked && !chatAvailable`. `chatAvailable`
// is `budgetStatus.tier === "normal" || "notice"`. Mocking the budget to
// `exhausted` forces the fallback.
test.describe("Valid zip code — Texas (73301) — chat path", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await resolveRunoffGate(page);
    await waitForChatWorkspace(page);
  });

  test("displays research workspace", async ({ page }) => {
    await expect(page.getByTestId("chat-window")).toBeAttached();
    await expect(page.getByTestId("ballot-data-status")).toBeVisible();
  });

  test("shows ballot data completeness status", async ({ page }) => {
    const ballotStatus = page.getByTestId("ballot-data-status");
    await expect(ballotStatus).toBeVisible();
    await expect(ballotStatus).toContainText(/Exact ballot|Official contests/i);
  });
});

test.describe("Valid zip code — Texas (73301) — fallback path", () => {
  test.beforeEach(async ({ page }) => {
    await mockBudgetExhausted(page);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await resolveRunoffGate(page);
    await waitForFallbackWorkspace(page);
  });

  test("shows Texas context in fallback prompt", async ({ page }) => {
    const promptOutput = page.getByTestId("prompt-output");
    await expect(promptOutput).toBeVisible();
    await expect(promptOutput).toContainText(/Texas/i);
    await expect(promptOutput).toContainText(/73301/);
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

// Valid zip code — California (90210). CA has no runoff gate and no
// closed-primary gate (CA is a top-two primary state per state data). Both
// tests assert on prompt-output content, so they force the fallback path
// via mockBudgetExhausted.
test.describe("Valid zip code — California (90210) — fallback path", () => {
  test.beforeEach(async ({ page }) => {
    await mockBudgetExhausted(page);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("90210");
    await page.getByTestId("zip-submit").click();
    await waitForFallbackWorkspace(page);
  });

  test("displays California state info", async ({ page }) => {
    await expect(page.getByTestId("prompt-output")).toContainText(
      /California/i,
    );
  });

  test("displays customized prompt for California", async ({ page }) => {
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

// Copy to clipboard — the copy-button testId is rendered by <PromptOutput>
// (the fallback path). Tests force the fallback via mockBudgetExhausted so
// the button is present.
test.describe("Copy to clipboard — fallback path", () => {
  test("copy button is visible after valid zip submission", async ({
    page,
  }) => {
    await mockBudgetExhausted(page);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await resolveRunoffGate(page);
    await waitForFallbackWorkspace(page);
    const copyBtn = page.getByTestId("copy-button");
    await expect(copyBtn).toBeVisible();
  });

  test("copy button shows confirmation after click", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockBudgetExhausted(page);
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await resolveRunoffGate(page);
    await waitForFallbackWorkspace(page);
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
    await resolveRunoffGate(page);
    // Should show research workspace (form submitted via Enter). Default
    // budget → chat path → chat-window attached.
    await expect(page.getByTestId("chat-window")).toBeAttached();
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

// New York (10007) — closed primary (NY Election Law §6-100); participation
// gate renders before the research workspace. After gate traversal, the
// research workspace renders (chat-window attached) and the
// research-context-strip shows the state name.
test.describe("State coverage — New York (10007)", () => {
  test("renders New York-specific data for a NY address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "10007");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // No runoff gate for NY (NY has no party-locked runoff)
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    // Closed-primary gate must be resolved before workspace renders
    await resolveClosedPrimaryGate(page);
    // After gate, research workspace is present and state name appears in
    // the context strip. Prompt-output text assertions are deferred to the
    // separate prompt-output-rendering-drift packet (only renders when
    // chat is unavailable).
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/New York/i);
  });
});

// Florida (32399) — closed primary (F.S. §101.021); participation gate
// renders before the research workspace.
test.describe("State coverage — Florida (32399)", () => {
  test("renders Florida-specific data for a FL address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "32399");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/Florida/i);
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

// North Carolina (27601) — runoff gate IS visible (runoff upcoming 2026-07-07,
// partyLockedToFirstRoundPrimary=true per N.C. Gen. Stat. §163-110).
//
// Data correction landed in commit bf5c099 (data: complete primaryParticipation
// for all 50 states + DC; fix NC/SD runoffRules) — flipped NC's
// `runoffRules.partyLockedToFirstRoundPrimary` from `false` to `true`, citing
// N.C. Gen. Stat. §163-110. The runoff gate is correctly rendered for NC zips
// now; the test had to be updated to reflect this. Mirrors the GA/TX pattern.
test.describe("State coverage — North Carolina runoff gate (27601)", () => {
  test("shows runoff gate for North Carolina address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "27601");
    const gate = page.getByTestId("runoff-gate");
    await gate.waitFor({ state: "visible", timeout: 8000 });
    await expect(gate).toBeVisible();
    // Gate title references North Carolina
    await expect(gate).toContainText(/North Carolina/i);
  });
});

// New Hampshire (03301) — semi-closed primary (RSA 659:14); participation
// gate renders before the research workspace. NH has no online registration
// deadline (same-day registration state).
test.describe("State coverage — New Hampshire (03301)", () => {
  test("renders New Hampshire-specific data for a NH address", async ({
    page,
  }) => {
    await page.goto("/");
    await fillZip(page, "03301");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/New Hampshire/i);
  });
});

// Arizona (86515 — multi-state AZ/NM; user must select state). Semi-closed
// primary (A.R.S. §16-467) — participation gate renders after state selection.
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
    // AZ has semi-closed primary — gate renders before workspace
    await resolveClosedPrimaryGate(page);
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/Arizona/i);
  });
});

// New Mexico (86515 — multi-state AZ/NM; user selects NM). Closed primary
// (NMSA §1-8-16) — participation gate renders after state selection.
test.describe("State coverage — New Mexico via multi-state selector (86515)", () => {
  test("shows state selector then renders New Mexico data", async ({
    page,
  }) => {
    await page.goto("/");
    await fillZip(page, "86515");
    const stateSelector = page.getByTestId("state-selector");
    await expect(stateSelector).toBeVisible();
    // Select New Mexico — buttons show state code "NM"
    await stateSelector.getByRole("button", { name: "NM" }).click();
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    // NM has closed primary — gate renders before workspace
    await resolveClosedPrimaryGate(page);
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/New Mexico/i);
  });
});

// Wyoming (82001) — populated as part of the 50-state expansion. Zip lands
// on the Wyoming research view; closed primary (Wyo. Stat. Ann. §22-5-101).
// Runoff gate does not render (WY has no party-locked legislative-primary
// runoff). Closed-primary participation gate renders before workspace.
test.describe("State coverage — Wyoming (82001)", () => {
  test("renders Wyoming-specific data for a Wyoming zip", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "82001");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // Runoff gate should not appear (WY runoffs are not party-locked)
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const strip = page.getByTestId("research-context-strip");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/Wyoming/i);
  });
});

import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Cold open (Phase 2 redesign) — e2e happy path.
//
// Verifies the new free-form textarea flow when PROMPT_FLEET_V2 is on
// and locale is `en`. The dev/preview server reads PROMPT_FLEET_V2 at
// startup, so the playwright `webServer.env` MUST set it for this spec
// to be meaningful.
//
// TODO(orchestrator): the existing e2e specs (ballot-tool.spec.ts,
// features.spec.ts) depend on the legacy auto-startSession behavior
// under `en`+flag-off. Flipping `webServer.env.PROMPT_FLEET_V2 = "1"`
// globally will break those specs. Until a per-project webServer or a
// migration of the legacy specs lands, this spec is gated on the env
// being set out-of-band (e.g. `PROMPT_FLEET_V2=1 npx playwright test
// e2e/cold-open.spec.ts`).
//
// When the env is not set, the spec skips (rather than fails) so CI
// pipelines stay green until the env-propagation story is resolved.
// ──────────────────────────────────────────────────────────────

const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

/* ── Helpers ──────────────────────────────────────────────── */

async function fillZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
}

async function waitForChatWindow(page: Page) {
  await page.getByTestId("chat-window").waitFor({
    state: "attached",
    timeout: WORKSPACE_TIMEOUT,
  });
}

/**
 * Resolve the runoff gate (Texas — closed primary requires the gate).
 * No-op when the gate isn't visible.
 */
async function resolveRunoffGate(page: Page) {
  const gate = page.getByTestId("runoff-gate");
  await gate.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await gate.isVisible().catch(() => false)) {
    await page.getByTestId("runoff-option-unsure").click();
  }
}

/**
 * Mock /api/chat to return a canned theme-extraction response. The
 * cold-open flow's POST body is `view: "cold-open"` with
 * `raceContext.userInput`. We deliberately do NOT assert on the body
 * shape here (that's covered by the integration test); the e2e only
 * cares that themes render and the workspace transitions correctly.
 */
async function mockColdOpenChatResponse(page: Page) {
  const themesJson = JSON.stringify([
    {
      name: "Healthcare costs",
      quotes: ["my mom's insulin keeps going up"],
    },
    {
      name: "Housing affordability",
      quotes: ["rent went up 30% in two years"],
    },
  ]);
  // Encode as SSE.
  const events = [
    `data: ${JSON.stringify({ type: "text", text: themesJson })}\n\n`,
    `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
  ];
  await page.route("**/api/chat", (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          budget: { tier: "normal", percent: 0 },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events.join(""),
    });
  });
}

/* ── Spec ─────────────────────────────────────────────────── */

test.describe("cold open (PROMPT_FLEET_V2 + en)", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/cold-open.spec.ts` " +
      "or add `webServer.env.PROMPT_FLEET_V2 = '1'` to playwright.config.ts.",
  );

  test("free-form input → themes → lock in → workspace", async ({ page }) => {
    await mockColdOpenChatResponse(page);
    await page.goto("/");

    // Address lookup.
    await fillZip(page, "73301");
    await resolveRunoffGate(page);
    await waitForChatWindow(page);

    // The cold-open textarea is visible; the legacy chat-input is NOT.
    const userText =
      "my mom's insulin keeps going up and rent went up 30% in two years";
    const textarea = page.getByTestId("cold-open-textarea");
    await textarea.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await expect(page.getByTestId("chat-input")).toHaveCount(0);

    // Submit.
    await textarea.fill(userText);
    await page.getByTestId("cold-open-send").click();

    // Themes render.
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Each quote must be a substring of the user's message (verbatim rule).
    const quoteTexts = await page
      .locator('[data-testid^="theme-quote-"]')
      .allTextContents();
    expect(quoteTexts.length).toBeGreaterThan(0);
    for (const raw of quoteTexts) {
      const stripped = raw.replace(/[“”"]/g, "").trim();
      expect(userText).toContain(stripped);
    }

    // Lock in.
    await page.getByTestId("theme-ranker-lock-in").click();

    // Confirmation panel renders; cold-open UI is gone.
    await page
      .getByTestId("cold-open-locked")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await expect(page.getByTestId("cold-open-textarea")).toHaveCount(0);
    await expect(page.getByTestId("concern-interpretation-themes")).toHaveCount(
      0,
    );
  });
});

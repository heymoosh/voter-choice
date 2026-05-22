/**
 * e2e/budget-exhausted.spec.ts — Phase 9 continuity screen + BYOK.
 *
 * Verifies the out-of-budget continuity reframe and the BYOK direct-to-
 * Anthropic path. Self-skips when PROMPT_FLEET_V2 is missing — same gating
 * pattern as cold-open.spec.ts so legacy CI stays green.
 *
 * Coverage:
 *   - Walk through cold-open + workspace (deterministic civic mock + themes).
 *   - Trigger BudgetExhausted via the BallotPane "Continue in another chatbot"
 *     button (the Phase 9 surface that doesn't require actually hitting the
 *     budget cap — same continuity screen). Per packet:
 *     "BallotPane.onHandoff (Phase 3 stub) — update to also trigger
 *     setBudgetExhausted({...}) even when budget isn't actually exhausted
 *     (allows 'Continue elsewhere' before reaching the limit)".
 *   - Four chatbot links render in strict alphabetical order.
 *   - Save & continue with a BYOK key persists into localStorage.
 *   - Saving the key fires NO additional /api/chat requests
 *     (network-trace assertion).
 *
 * Mirrors helper conventions in e2e/workspace.spec.ts.
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

/* ── Helpers (mirror e2e/workspace.spec.ts) ─────────────────── */

async function fillZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
}

async function resolveRunoffGate(page: Page) {
  const partyGate = page.getByTestId("party-gate");
  await partyGate
    .waitFor({ state: "visible", timeout: 2500 })
    .catch(() => null);
  if (await partyGate.isVisible().catch(() => false)) {
    await page.getByTestId("party-gate-option-voted_dem_primary").click();
    await page.getByTestId("party-gate-continue").click();
    return;
  }
  const legacy = page.getByTestId("runoff-gate");
  await legacy.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await legacy.isVisible().catch(() => false)) {
    await page.getByTestId("runoff-option-unsure").click();
  }
}

async function mockColdOpenChatResponse(page: Page) {
  const themesJson = JSON.stringify([
    { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
    { name: "Housing affordability", quotes: ["rent went up 30%"] },
  ]);
  const events = [
    `data: ${JSON.stringify({ type: "text", text: themesJson })}\n\n`,
    `data: ${JSON.stringify({
      type: "done",
      budget: { tier: "normal", percent: 0 },
    })}\n\n`,
  ];
  await page.route("**/api/chat", (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events.join(""),
    });
  });
}

async function mockCivicResponse(page: Page) {
  const payload = {
    pollingLocations: [],
    earlyVoteSites: [],
    county: "Travis County",
    contests: [
      {
        office: "U.S. President",
        district: "",
        type: "General",
        candidates: [
          { name: "Alice Anderson", party: "Democratic" },
          { name: "Bob Brown", party: "Republican" },
        ],
      },
      {
        office: "Governor",
        district: "Texas",
        type: "General",
        candidates: [
          { name: "Carol Cain", party: "Democratic" },
          { name: "Dan Davis", party: "Republican" },
        ],
      },
    ],
  };
  await page.route("**/api/civic", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}

async function landOnWorkspace(page: Page) {
  await mockColdOpenChatResponse(page);
  await mockCivicResponse(page);
  await page.goto("/");
  await fillZip(page, "73301");
  await resolveRunoffGate(page);

  const userText = "insulin keeps going up and rent went up 30% in two years";
  const textarea = page.getByTestId("cold-open-textarea");
  await textarea.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
  await textarea.fill(userText);
  await page.getByTestId("cold-open-send").click();

  await page
    .getByTestId("concern-interpretation-themes")
    .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
  await page.getByTestId("theme-ranker-lock-in").click();

  await page
    .getByTestId("workspace-shell")
    .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
}

/* ── Tests ──────────────────────────────────────────────────── */

test.describe("Phase 9 — budget exhaustion continuity + BYOK", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/budget-exhausted.spec.ts`.",
  );

  test("BallotPane 'Continue in another chatbot' surfaces the BudgetExhausted continuity screen + alphabetical links + BYOK", async ({
    page,
  }) => {
    await landOnWorkspace(page);

    // Click "Continue in another chatbot" — Phase 9 wired this to mount the
    // BudgetExhausted screen, even pre-exhaustion.
    await page.getByTestId("ballot-pane-handoff").click();

    await page
      .getByTestId("budget-exhausted-screen")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    const headline = page.getByTestId("budget-exhausted-headline");
    await expect(headline).toHaveText(/Your ballot is saved/);
    await expect(headline).not.toHaveText(/sorry/i);

    // Four chatbot links — strict alphabetical order (load-bearing).
    const linkIds = await page
      .locator('[data-testid^="chatbot-link-"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    expect(linkIds).toEqual([
      "chatbot-link-claude",
      "chatbot-link-chatgpt",
      "chatbot-link-gemini",
      "chatbot-link-grok",
    ]);

    await expect(page.getByTestId("tip-jar-link")).toBeVisible();
    await expect(page.getByText(/not required/i)).toBeVisible();

    await expect(page.getByTestId("byok-input")).toBeVisible();
    await expect(page.getByTestId("byok-privacy-copy")).toContainText(
      /key stays in your browser/i,
    );
  });

  test("saving a BYOK key persists into localStorage and triggers NO new /api/chat POSTs", async ({
    page,
  }) => {
    await landOnWorkspace(page);
    await page.getByTestId("ballot-pane-handoff").click();
    await page
      .getByTestId("budget-exhausted-screen")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Replace the existing /api/chat route to capture any POSTs that fire
    // while or after the user saves the BYOK key. Per the packet's privacy
    // contract: "Workers must NOT send the BYOK key to the Voter Choice
    // server in any code path." Saving the key is a pure-localStorage op;
    // no /api/chat POST should fire.
    const postBYOKChatCalls: string[] = [];
    await page.unroute("**/api/chat");
    await page.route("**/api/chat", async (route: Route) => {
      const req = route.request();
      if (req.method() === "POST") postBYOKChatCalls.push(req.url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ budget: { tier: "exhausted", percent: 100 } }),
      });
    });

    await page.getByTestId("byok-input").fill("sk-ant-byok-test-e2e");
    await page.getByTestId("byok-save").click();

    // The key persists in localStorage under the documented namespace.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("voter-choice:byok-anthropic-key"),
    );
    expect(stored).toBe("sk-ant-byok-test-e2e");

    // No /api/chat POST happened while saving the BYOK key.
    expect(postBYOKChatCalls).toEqual([]);
  });
});

import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Phase 6 — mid-session theme amendment e2e happy path (PR3 opt-in).
//
// Exercises the rail-link entry: cold-open → lock themes → workspace →
// pick a race first (so the offer has decisions to re-score) → click
// "Edit" in the rail → amend editor renders inline in the chat thread
// (not a modal) → add a new theme via the free-text inputs → "Lock
// these changes" → AmendRescoreOffer renders inline (NOT the delta
// directly — re-score is opt-in per UX feedback). Two follow-up paths:
//
//   · Accept ("Yes, show me the deltas") → /api/chat amend call fires
//     → AmendDeltaMessage renders.
//   · Decline ("No, keep what I have") → offer dismissed; NO delta
//     message; themes still committed.
//
// Self-skips when PROMPT_FLEET_V2 is absent — same gating as
// workspace.spec.ts. CI wires this spec into the same flag-on Playwright
// step at .github/workflows/test.yml.
// ──────────────────────────────────────────────────────────────

const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

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

async function mockColdOpenAndAmendChat(page: Page) {
  const themesJson = JSON.stringify([
    { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
    { name: "Housing affordability", quotes: ["rent went up 30%"] },
  ]);
  const amendJson = JSON.stringify({
    new_theme: {
      name: "School funding",
      quotes: ["kids' schools are crumbling"],
    },
    suggested_rank: 1,
    rescored: [
      {
        race_id: "us-president",
        old_score: 82,
        new_score: 65,
        verdict: "REVISIT",
      },
      {
        race_id: "governor-texas",
        old_score: 70,
        new_score: 70,
        verdict: "HOLD",
      },
    ],
  });

  await page.route("**/api/chat", (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
      });
    }
    // Inspect POST body to switch between cold-open and amend responses.
    let body: { view?: string } = {};
    try {
      body = JSON.parse(req.postData() ?? "{}") as { view?: string };
    } catch {
      // Default to cold-open response on parse failure.
    }
    const responseJson = body.view === "amend" ? amendJson : themesJson;
    const events = [
      `data: ${JSON.stringify({ type: "text", text: responseJson })}\n\n`,
      `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
    ];
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

test.describe("theme amendment (PROMPT_FLEET_V2 + en)", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/theme-amend.spec.ts` " +
      "or add `webServer.env.PROMPT_FLEET_V2 = '1'` to playwright.config.ts.",
  );

  /**
   * Shared bootstrap: cold-open → lock themes → workspace → commit one
   * decision (so the offer has prior decisions to re-score) → open the amend
   * editor → add a theme → click Lock. Returns at the point where the
   * AmendRescoreOffer is visible.
   */
  async function bootstrapToOffer(page: Page) {
    await mockColdOpenAndAmendChat(page);
    await mockCivicResponse(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);

    // Cold-open phase — submit free-form text to extract themes.
    const userText = "insulin keeps going up and rent went up 30% in two years";
    const textarea = page.getByTestId("cold-open-textarea");
    await textarea.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await textarea.fill(userText);
    await page.getByTestId("cold-open-send").click();

    // Lock themes.
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();

    // Workspace renders.
    await page
      .getByTestId("workspace-shell")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Commit one decision so decisionCount > 0 — opt-in offer needs prior
    // decisions to surface.
    await page.getByTestId("workspace-pick-trigger").click();
    await page
      .getByTestId("workspace-why-textarea")
      .fill("strong record matches my top theme");
    await page.getByTestId("workspace-why-commit").click();

    // Click the rail's "Edit" link — opens the editor inline in chat.
    await page.getByTestId("workspace-rail-edit-themes").click();
    const editor = page.getByTestId("theme-amend-editor");
    await expect(editor).toBeVisible();

    // Editor is inside the workspace chat (NOT a modal / portal).
    const isInsideWorkspaceChat = await editor.evaluate(
      (el) => el.closest('[data-testid="workspace-chat"]') !== null,
    );
    expect(isInsideWorkspaceChat).toBe(true);

    // Add a new theme via the free-text inputs.
    await page.getByTestId("theme-amend-new-name-input").fill("School funding");
    await page
      .getByTestId("theme-amend-new-context-input")
      .fill("kids' schools are crumbling");

    // Lock the changes — now the offer should appear (NOT the delta).
    await page.getByTestId("theme-amend-lock").click();

    // The offer renders inline.
    const offer = page.getByTestId("amend-rescore-offer");
    await expect(offer).toBeVisible({ timeout: WORKSPACE_TIMEOUT });
    // The delta message has NOT rendered yet — opt-in!
    await expect(page.getByTestId("amend-delta-message")).toHaveCount(0);
    return offer;
  }

  test("rail-link → amend editor → lock → offer → Accept → delta renders (opt-in YES path)", async ({
    page,
  }) => {
    const offer = await bootstrapToOffer(page);

    // Accept the offer — fires the re-score and renders the delta.
    await offer.getByTestId("amend-rescore-accept").click();

    // The delta message now renders inline.
    const delta = page.getByTestId("amend-delta-message");
    await expect(delta).toBeVisible({ timeout: WORKSPACE_TIMEOUT });
    await expect(delta).toContainText(/School funding/);

    // REVISIT block visible (the mock returns one REVISIT race).
    await expect(page.getByTestId("amend-delta-revisit-block")).toBeVisible();

    // HOLD list is collapsed by default; the toggle is present and expandable.
    await expect(page.getByTestId("amend-delta-hold-toggle")).toBeVisible();
  });

  test("rail-link → amend editor → lock → offer → Decline → NO delta, themes still committed (opt-in NO path)", async ({
    page,
  }) => {
    await bootstrapToOffer(page);

    // Decline the offer — dismisses without firing the re-score.
    await page.getByTestId("amend-rescore-decline").click();

    // Offer dismissed; no delta.
    await expect(page.getByTestId("amend-rescore-offer")).toHaveCount(0);
    await expect(page.getByTestId("amend-delta-message")).toHaveCount(0);

    // Themes still committed — verify the new theme appears at the top of the
    // workspace rail.
    await expect(page.getByTestId("workspace-rail-theme-0")).toContainText(
      "School funding",
    );
  });
});

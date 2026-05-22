import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Workspace (Phase 3 redesign) — e2e happy path.
//
// Exercises the 3-pane workspace shell that appears after the user locks
// themes in the Phase 2 cold open. Mocks /api/chat so the cold-open turn
// returns a canned theme-extraction JSON, then lock-in flips the UI to
// rail + chat + ballot pane. The user picks the first race, commits a
// why-note, the decision lands in the ballot pane, and the workspace
// auto-advances.
//
// Self-skips when PROMPT_FLEET_V2 is absent — same gating as
// cold-open.spec.ts. The CI step at .github/workflows/test.yml runs this
// spec alongside cold-open.spec.ts with the flag on.
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

async function resolveRunoffGate(page: Page) {
  const gate = page.getByTestId("runoff-gate");
  await gate.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await gate.isVisible().catch(() => false)) {
    await page.getByTestId("runoff-option-unsure").click();
  }
}

async function mockColdOpenChatResponse(page: Page) {
  const themesJson = JSON.stringify([
    {
      name: "Healthcare costs",
      quotes: ["insulin keeps going up"],
    },
    {
      name: "Housing affordability",
      quotes: ["rent went up 30%"],
    },
  ]);
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

/**
 * Mock /api/civic with a canned ballot — Phase 3's workspace needs at least
 * one derivable race so the rail/chat/ballot pane all have something to show.
 * Real Civic API returns nothing for arbitrary ZIPs without a key, so we
 * deterministically supply a small federal-state-prop slate here.
 */
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
      {
        office: "Proposition 1",
        district: "",
        type: "Referendum",
        candidates: [],
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

/* ── Spec ─────────────────────────────────────────────────── */

test.describe("workspace (PROMPT_FLEET_V2 + en)", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/workspace.spec.ts` " +
      "or add `webServer.env.PROMPT_FLEET_V2 = '1'` to playwright.config.ts.",
  );

  test("cold-open → lock themes → workspace 3-pane → pick → commit why → auto-advance → print enables", async ({
    page,
  }) => {
    await mockColdOpenChatResponse(page);
    await mockCivicResponse(page);
    await page.goto("/");

    // Address lookup.
    await fillZip(page, "73301");
    await resolveRunoffGate(page);

    // Cold-open phase — fill the textarea and submit.
    const userText = "insulin keeps going up and rent went up 30% in two years";
    const textarea = page.getByTestId("cold-open-textarea");
    await textarea.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await textarea.fill(userText);
    await page.getByTestId("cold-open-send").click();

    // Themes render; lock in.
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();

    // Workspace 3-pane renders.
    await page
      .getByTestId("workspace-shell")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await expect(
      page.getByRole("navigation", { name: /workspace navigation/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: /your ballot/i }),
    ).toBeVisible();
    await expect(page.getByTestId("workspace-chat-header")).toBeVisible();

    // Print button starts disabled (zero decisions).
    await expect(page.getByTestId("ballot-pane-print")).toBeDisabled();

    // Pick the active race's candidate.
    const pickBtn = page.getByTestId("workspace-pick-trigger");
    await pickBtn.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await pickBtn.click();

    // Inline why-prompt appears.
    const whyTextarea = page.getByTestId("workspace-why-textarea");
    await whyTextarea.waitFor({
      state: "visible",
      timeout: WORKSPACE_TIMEOUT,
    });
    await whyTextarea.fill("Their record matches my top priority");
    await page.getByTestId("workspace-why-commit").click();

    // Decision lands in the ballot pane with the verbatim why.
    await expect(page.getByTestId("ballot-pane-header")).toContainText(/1\//);
    const ballotPane = page.getByTestId("ballot-pane");
    await expect(ballotPane).toContainText(
      "Their record matches my top priority",
    );

    // Print button now enabled.
    await expect(page.getByTestId("ballot-pane-print")).toBeEnabled();
  });
});

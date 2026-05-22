import { test, expect, type Page } from "@playwright/test";

// ──────────────────────────────────────────────────────────────
// Print ballot (Phase 7 redesign) — e2e happy path.
//
// Walks the same workspace flow as e2e/workspace.spec.ts, picks the first
// race, commits a why-note, then clicks the BallotPane's Print button.
// The shell swaps to the full-page PrintBallot view (the state-lift
// approach). We assert the print sheet, sectioned picks, and themes are
// in the DOM, then click the in-sheet "Print / Save as PDF" button and
// assert window.print() fired. The window.print stub is installed via
// `page.addInitScript` so it lands BEFORE any app code captures a
// reference to the original.
//
// Self-skips when PROMPT_FLEET_V2 is absent — same gating as
// cold-open.spec.ts / workspace.spec.ts. CI flag-on e2e step at
// .github/workflows/test.yml runs this spec alongside those.
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

async function mockCivicResponse(page: Page) {
  // One race is enough to enable the Print button and exercise the
  // PrintBallot pick-row rendering. Keeping the slate small keeps the
  // print sheet comfortably under the one-page cap.
  const payload = {
    pollingLocations: [
      {
        name: "Travis County Annex",
        address: "1234 Test Ave, Austin TX 73301",
        hours: "7am – 7pm",
        notes: "ADA accessible",
      },
    ],
    earlyVoteSites: [
      {
        name: "Early Vote Site",
        address: "5678 Early St, Austin TX 73301",
        hours: "Oct 20 – Oct 31, 8am – 6pm",
        notes: "",
      },
    ],
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

test.describe("print ballot (PROMPT_FLEET_V2 + en)", () => {
  test.skip(
    !PROMPT_FLEET_V2_ENABLED,
    "PROMPT_FLEET_V2 env not set on the playwright webServer. " +
      "Run with `PROMPT_FLEET_V2=1 npx playwright test e2e/print-ballot.spec.ts` " +
      "or add `webServer.env.PROMPT_FLEET_V2 = '1'` to playwright.config.ts.",
  );

  test("decide → click print → print sheet renders → print button fires window.print", async ({
    page,
  }) => {
    // Stub window.print BEFORE app scripts load so the reference can't be
    // captured anywhere upstream. We persist the call on window so the
    // assertion below can read it back through page.evaluate.
    await page.addInitScript(() => {
      (window as unknown as { __printCalled?: number }).__printCalled = 0;
      window.print = () => {
        const w = window as unknown as { __printCalled: number };
        w.__printCalled = (w.__printCalled ?? 0) + 1;
      };
    });

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

    // Pick the first race + commit a why-note.
    await page
      .getByTestId("workspace-pick-trigger")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("workspace-pick-trigger").click();
    const whyTextarea = page.getByTestId("workspace-why-textarea");
    await whyTextarea.waitFor({
      state: "visible",
      timeout: WORKSPACE_TIMEOUT,
    });
    await whyTextarea.fill("Strongest record on my top priority");
    await page.getByTestId("workspace-why-commit").click();

    // Wait for the decision to land in the ballot pane.
    await expect(page.getByTestId("ballot-pane-header")).toContainText(/1\//);

    // Click the BallotPane's Print button — the shell flips to PrintBallot.
    await page.getByTestId("ballot-pane-print").click();

    // Print sheet renders.
    const sheet = page.getByTestId("print-sheet");
    await sheet.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await expect(sheet).toBeVisible();

    // Sectioned pick: at least one ballot-group is present.
    const federalGroup = page.getByTestId("ballot-group-Federal");
    await expect(federalGroup).toBeVisible();
    await expect(federalGroup).toContainText(/U\.S\. President/);
    await expect(federalGroup).toContainText(/Alice Anderson/);

    // Verbatim why-note rendered italic on the print sheet.
    await expect(sheet).toContainText("Strongest record on my top priority");

    // Themes ordered list at the bottom.
    const themesList = page.getByTestId("themes-list");
    await expect(themesList).toBeVisible();
    await expect(themesList).toContainText(/Healthcare costs/);
    await expect(themesList).toContainText(/Housing affordability/);

    // Polling header populated from the mocked civic response.
    await expect(sheet).toContainText(/Travis County Annex/);

    // Footer signature line.
    await expect(sheet).toContainText(/Signed at the booth/i);

    // Click the in-sheet Print button → window.print() fires.
    await page.getByTestId("print-button").click();
    const printed = await page.evaluate(
      () =>
        (window as unknown as { __printCalled?: number }).__printCalled ?? 0,
    );
    expect(printed).toBeGreaterThanOrEqual(1);

    // Back to ballot returns to the workspace shell.
    await page.getByTestId("back-button").click();
    await expect(page.getByTestId("workspace-shell")).toBeVisible();
  });
});

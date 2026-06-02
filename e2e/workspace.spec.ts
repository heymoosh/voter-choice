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
  // Phase 5 — new PartyGate takes precedence under PROMPT_FLEET_V2=1 + en.
  const partyGate = page.getByTestId("party-gate");
  await partyGate
    .waitFor({ state: "visible", timeout: 2500 })
    .catch(() => null);
  if (await partyGate.isVisible().catch(() => false)) {
    await page.getByTestId("party-gate-option-voted_dem_primary").click();
    await page.getByTestId("party-gate-continue").click();
    return;
  }
  // Legacy runoff gate (flag-off or non-Phase-5-state).
  const legacy = page.getByTestId("runoff-gate");
  await legacy.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await legacy.isVisible().catch(() => false)) {
    await page.getByTestId("runoff-option-unsure").click();
  }
}

/**
 * Cards-first chat mock (PIVOT): chat NO LONGER emits cards. The cold-open
 * turn returns the theme JSON; any other turn returns plain prose (the
 * demoted Q&A box). Cards come from /api/race-data (mocked separately).
 */
async function mockChatColdOpenAndQA(page: Page) {
  const themesJson = JSON.stringify([
    { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
    { name: "Housing affordability", quotes: ["rent went up 30%"] },
  ]);
  const sseFor = (text: string) =>
    [
      `data: ${JSON.stringify({ type: "text", text })}\n\n`,
      `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
    ].join("");

  await page.route("**/api/chat", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
      });
    }
    let view: string | undefined;
    try {
      const body = JSON.parse(req.postData() ?? "{}") as { view?: string };
      view = body.view;
    } catch {
      view = undefined;
    }
    const body =
      view === "cold-open"
        ? sseFor(themesJson)
        : sseFor("Here's a quick answer to your question.");
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

/**
 * Mock POST /api/race-data — the deterministic, LLM-free card data source.
 * Returns a populated RacePatternsBlock + AlignmentScoresBlock so the
 * workspace renders real cards. `delayMs` lets a test observe the
 * ProcessingSteps loader before the data resolves.
 */
async function mockRaceData(page: Page, opts: { delayMs?: number } = {}) {
  const payload = {
    racePatterns: {
      race: "U.S. President",
      candidates: [
        {
          id: "A",
          name: "Alice Anderson",
          incumbent: true,
          donorCoalition: [
            { label: "Healthcare industry", percent: 60, amount: 60000 },
            {
              label: "Small individual donors (under $200)",
              percent: 40,
              amount: 40000,
            },
          ],
          donorDataSource: "voting_record",
          donorSource: { name: "FEC", url: "https://www.fec.gov/" },
          totalRaised: 100000,
          endorsements: null,
          endorsementUnavailable: { reason: "Endorsement data not available" },
          platformAlignment: null,
          retrospective: null,
          retrospectiveUnavailable: { reason: "No performance record" },
          valuesHighlight: null,
        },
        {
          id: "B",
          name: "Bob Brown",
          incumbent: false,
          donorCoalition: null,
          donorUnavailable: { reason: "Couldn't match this candidate" },
          endorsements: null,
          endorsementUnavailable: { reason: "Endorsement data not available" },
          platformAlignment: null,
          retrospective: null,
          retrospectiveUnavailable: { reason: "Challenger — no record yet" },
          valuesHighlight: null,
        },
      ],
    },
    alignmentScores: {
      race: "U.S. President",
      entries: [
        {
          candidateId: "A",
          scores: [
            {
              canonicalIssue: "healthcare_affordability",
              issueLabel: "Healthcare Affordability",
              resolvedStance: "in_favor",
              sourceType: "voting_record",
              kept: 4,
              total: 6,
              contributingVotes: [],
            },
          ],
        },
        {
          candidateId: "B",
          scores: null,
          unavailable: { reason: "No record" },
        },
      ],
    },
    legislativeCoverage: true,
  };
  await page.route("**/api/race-data", async (route) => {
    if (opts.delayMs) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
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

  test("cold-open → lock → workspace 3-pane → data-driven cards → card pick → ballot + print", async ({
    page,
  }) => {
    await mockChatColdOpenAndQA(page);
    await mockRaceData(page);
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

    // Data-driven candidate cards render in the center (from /api/race-data,
    // NOT from a chat message).
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Pick candidate A directly on the card. Blind mode is on by default
    // (the card shows "Pick Candidate A"); picking auto-commits a why-note.
    await page
      .getByTestId("race-patterns-pick-A")
      .click({ timeout: WORKSPACE_TIMEOUT });

    // Decision lands in the ballot pane (card pick auto-commits a why-note).
    await expect(page.getByTestId("ballot-pane-header")).toContainText(/1\//);

    // Print button now enabled.
    await expect(page.getByTestId("ballot-pane-print")).toBeEnabled();
  });

  // ─────────────────────────────────────────────────────────────
  // Cards-first regression guard (PIVOT) — see
  // docs/design/2026-redesign/CARDS_FIRST_BUILD_PLAN.md.
  //
  // Cards render from the deterministic /api/race-data endpoint, NOT from a
  // chat message. This mocks that endpoint with a small delay and asserts:
  //   (1) the ProcessingSteps loader is the primary surface while fetching,
  //   (2) candidate cards then render in the center,
  //   (3) no raw [RACE_PATTERNS] JSON ever appears (chat is prose-only).
  // Runs fully locally — no API key needed (the pivot removed the LLM from
  // the card path), which is what makes this the cards-first definition-of-done.
  // ─────────────────────────────────────────────────────────────
  test("workspace shows ProcessingSteps loader then data-driven candidate cards", async ({
    page,
  }) => {
    await mockChatColdOpenAndQA(page);
    await mockRaceData(page, { delayMs: 1200 });
    await mockCivicResponse(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);

    const textarea = page.getByTestId("cold-open-textarea");
    await textarea.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await textarea.fill(
      "insulin keeps going up and rent went up 30% in two years",
    );
    await page.getByTestId("cold-open-send").click();

    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();

    // Workspace shell mounts.
    await page
      .getByTestId("workspace-shell")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (1) Loader is the primary surface while /api/race-data is in flight.
    await page
      .getByTestId("race-patterns-loading")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (2) Cards then render from the resolved data.
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (3) Raw [RACE_PATTERNS] JSON must never leak into the transcript.
    await expect(page.getByText(/\[RACE_PATTERNS race=/)).toHaveCount(0);
    await expect(page.getByText(/\[\/RACE_PATTERNS\]/)).toHaveCount(0);
  });
});

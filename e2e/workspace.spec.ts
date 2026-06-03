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
  // Themes carry canonicalIssue + stance, exactly as the real
  // theme-extraction call now emits them (P1). This lets the e2e prove the
  // full thread: cold-open → ThemeRanker → lockedThemes → /api/race-data
  // POST body. The race-data mock (mockRaceData) captures that body so a
  // test can assert the canonical ids survived every hop.
  const themesJson = JSON.stringify([
    {
      name: "Healthcare costs",
      quotes: ["insulin keeps going up"],
      canonicalIssue: "healthcare_affordability",
      stance: "in_favor",
    },
    {
      name: "Housing affordability",
      quotes: ["rent went up 30%"],
      canonicalIssue: "housing_affordability",
      stance: "in_favor",
    },
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
/**
 * Captures the most recent POST body sent to /api/race-data so a test can
 * assert the canonical-issue thread (cold-open → lockedThemes → request body)
 * survived. Returned by mockRaceData.
 */
type RaceDataBodyCapture = { last: Record<string, unknown> | null };

async function mockRaceData(
  page: Page,
  opts: { delayMs?: number } = {},
): Promise<RaceDataBodyCapture> {
  const capture: RaceDataBodyCapture = { last: null };
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
    try {
      capture.last = JSON.parse(route.request().postData() ?? "{}");
    } catch {
      capture.last = null;
    }
    if (opts.delayMs) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
  return capture;
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
  test("full-screen loader gate runs, THEN the workspace mounts with data-driven cards", async ({
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

    // (1) Lock-in shows the FULL-SCREEN loader gate while /api/race-data is in
    // flight — the 3-pane workspace must NOT be up yet.
    await page
      .getByTestId("workspace-loading-gate")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (2) Once the data resolves, the workspace mounts with cards already
    // populated (no empty/transcript intermediate state).
    await page
      .getByTestId("workspace-shell")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (3) Raw [RACE_PATTERNS] JSON must never leak into the transcript.
    await expect(page.getByText(/\[RACE_PATTERNS race=/)).toHaveCount(0);
    await expect(page.getByText(/\[\/RACE_PATTERNS\]/)).toHaveCount(0);
  });

  // ─────────────────────────────────────────────────────────────
  // Canonical-issue thread guard (PIVOT P1). The whole point of P1 is that
  // the voter's words get mapped to a canonical issue id at cold-open and
  // that id reaches lookupAlignment. This test proves the END-TO-END thread:
  //   cold-open themes (with canonicalIssue) → ThemeRanker → lockedThemes →
  //   the /api/race-data POST body's `issues`.
  // Without this, an empty alignment section post-DB-seed would be ambiguous
  // (data gap vs. wiring gap) — this disambiguates it.
  // ─────────────────────────────────────────────────────────────
  test("threads canonicalIssue from cold-open themes into the /api/race-data request", async ({
    page,
  }) => {
    await mockChatColdOpenAndQA(page);
    const capture = await mockRaceData(page);
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

    // Cards render → the race-data fetch fired with a body we captured.
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    await expect
      .poll(() => capture.last?.issues, { timeout: WORKSPACE_TIMEOUT })
      .toBeTruthy();
    const issues = (capture.last?.issues ?? []) as Array<{
      canonicalIssue: string;
      stance: string;
    }>;
    const ids = issues.map((i) => i.canonicalIssue);
    // Both threaded canonical ids must reach the endpoint — proving the
    // parser → ThemeRanker → lockedThemes → raceDataInput hops preserved them.
    expect(ids).toContain("healthcare_affordability");
    expect(ids).toContain("housing_affordability");
    expect(issues.every((i) => i.stance === "in_favor")).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // Prototype CARD-INTERACTION parity (PIVOT). Drives the cards-first
  // workspace with a RICH 2-candidate mock (both scored, contributing votes,
  // funding mix) and exercises each interaction the prototype defines:
  // reveal, money-trail disclosure, alignment drilldown, compare modal,
  // see-all-votes panel, pick. This is the durable regression guard for
  // "nothing from the prototype is missing." (Real prod data is currently
  // thinner — single-candidate primary races, only total_receipts buckets —
  // so this asserts the COMPONENTS work given rich data; the real-data
  // coverage is tracked separately in FLOW_VERIFICATION.md.)
  // ─────────────────────────────────────────────────────────────
  async function mockRaceDataRich(page: Page) {
    const v = (id: string, title: string, cast: "with" | "against") => ({
      billTitle: title,
      voteCast: cast,
      date: "2025-12-11",
      source: { name: "govtrack", url: "https://www.govtrack.us/" },
      ...(id === "A"
        ? { narrative: "Voted to cap insulin copays at $35 a month." }
        : {}),
    });
    const payload = {
      racePatterns: {
        race: "U.S. President",
        candidates: [
          {
            id: "A",
            name: "Alice Anderson",
            incumbent: true,
            priorRole: "Senator since 2019",
            donorCoalition: [
              { label: "Healthcare industry", percent: 40, amount: 400000 },
              {
                label: "Small individual donors (under $200)",
                percent: 35,
                amount: 350000,
              },
              {
                label: "Issue-aligned PACs — healthcare",
                percent: 25,
                amount: 250000,
                isIssuePAC: true,
                alignsWith: "healthcare_affordability",
              },
            ],
            donorDataSource: "voting_record",
            donorSource: { name: "FEC", url: "https://www.fec.gov/" },
            totalRaised: 1000000,
            fundingMix: {
              small: 35,
              large: 40,
              pac: 25,
              total: 1000000,
              cycle: "2026",
            },
            endorsements: null,
            endorsementUnavailable: { reason: "n/a" },
            platformAlignment: { kept: 8, total: 12 },
            retrospective: null,
            retrospectiveUnavailable: { reason: "n/a" },
            valuesHighlight: null,
          },
          {
            id: "B",
            name: "Bob Brown",
            incumbent: false,
            donorCoalition: [
              {
                label: "Finance, banking & insurance",
                percent: 100,
                amount: 200000,
              },
            ],
            donorDataSource: "voting_record",
            donorSource: { name: "FEC", url: "https://www.fec.gov/" },
            totalRaised: 200000,
            fundingMix: {
              small: 10,
              large: 70,
              pac: 20,
              total: 200000,
              cycle: "2026",
            },
            endorsements: null,
            endorsementUnavailable: { reason: "n/a" },
            platformAlignment: null,
            retrospective: null,
            retrospectiveUnavailable: { reason: "n/a" },
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
                kept: 5,
                total: 6,
                contributingVotes: [
                  v("A", "Lower Health Care Costs Act", "with"),
                  v("A", "Drug Pricing Reform Act", "with"),
                ],
              },
            ],
          },
          {
            candidateId: "B",
            scores: [
              {
                canonicalIssue: "healthcare_affordability",
                issueLabel: "Healthcare Affordability",
                resolvedStance: "in_favor",
                sourceType: "voting_record",
                kept: 1,
                total: 4,
                contributingVotes: [
                  v("B", "Lower Health Care Costs Act", "against"),
                ],
              },
            ],
          },
        ],
      },
      legislativeCoverage: true,
    };
    await page.route("**/api/race-data", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      }),
    );
  }

  test("candidate-card interactions: reveal · money-trail · drilldown · compare · see-all-votes · pick", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await mockChatColdOpenAndQA(page);
    await mockCivicResponse(page);
    await mockRaceDataRich(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);
    const ta = page.getByTestId("cold-open-textarea");
    await ta.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await ta.fill("insulin keeps going up and rent went up 30% in two years");
    await page.getByTestId("cold-open-send").click();
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();

    // Cards render from the rich data.
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // (1) Reveal — blind by default; per-card reveal flips to the name.
    await page.getByTestId("race-patterns-reveal-candidate-A").click();

    // (2) Money-trail disclosure present + interactive; funder bars rendered.
    const moneyTrailA = page.getByTestId("race-patterns-money-trail-A");
    await expect(moneyTrailA).toBeVisible();
    const moneyToggle = page.getByTestId("race-patterns-money-trail-toggle-A");
    await expect(moneyToggle).toBeVisible();
    await moneyToggle.click(); // toggle the disclosure
    await expect(moneyTrailA.getByTestId("funder-bars")).toBeAttached();

    // (3) Alignment drilldown — tap a score row with contributing votes.
    await page
      .getByTestId("alignment-issue-row-healthcare_affordability")
      .first()
      .click();
    await expect(
      page.getByTestId("alignment-drilldown-vote-list").first(),
    ).toBeVisible();

    // (4) Compare modal opens.
    await page.getByTestId("race-patterns-compare").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    // (5) See-all-votes panel opens.
    await page.getByTestId("race-patterns-see-all-votes-A").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    // (6) Pick a candidate → the decision lands in the ballot pane.
    await page.getByTestId("race-patterns-pick-A").click();
    await expect(page.getByTestId("ballot-pane-print")).toBeEnabled();
  });

  test("rank — drag-drop reorders themes (real pointer gesture)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await mockChatColdOpenAndQA(page);
    await mockCivicResponse(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);
    const ta = page.getByTestId("cold-open-textarea");
    await ta.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await ta.fill("insulin keeps going up and rent went up 30% in two years");
    await page.getByTestId("cold-open-send").click();
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Capture order before the drag.
    const name0Before = (
      await page.getByTestId("theme-name-0").textContent()
    )?.trim();
    const name1Before = (
      await page.getByTestId("theme-name-1").textContent()
    )?.trim();
    expect(name0Before).toBeTruthy();
    expect(name1Before).toBeTruthy();
    expect(name0Before).not.toBe(name1Before);

    // Drive a real dnd-kit PointerSensor drag: grab handle 0, move past the
    // midpoint of card 1, release. Intermediate steps are required for dnd-kit
    // to register the drag start + collision crossing.
    const handle = page.getByTestId("theme-drag-handle-0");
    const target = page.getByTestId("theme-card-1");
    const hb = await handle.boundingBox();
    const tb = await target.boundingBox();
    if (!hb || !tb) throw new Error("drag handle / target not measurable");
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    // small nudge to trip the sensor, then travel below card 1's midpoint
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 6, {
      steps: 3,
    });
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height * 0.75, {
      steps: 12,
    });
    await page.mouse.up();

    // After the drag, index 0 should hold what used to be at index 1.
    await expect(page.getByTestId("theme-name-0")).toHaveText(
      name1Before as string,
      { timeout: 5000 },
    );
  });

  test("pick → auto-advance moves the active race to the next undecided", async ({
    page,
  }) => {
    await mockChatColdOpenAndQA(page);
    await mockRaceData(page);
    await mockCivicResponse(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);
    const ta = page.getByTestId("cold-open-textarea");
    await ta.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await ta.fill("insulin keeps going up and rent went up 30% in two years");
    await page.getByTestId("cold-open-send").click();
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();

    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // The active race is the rail row with aria-current="page".
    const activeRail = page.locator(
      '[data-testid^="workspace-rail-race-"][aria-current="page"]',
    );
    await expect(activeRail).toHaveCount(1);
    const beforeId = await activeRail.getAttribute("data-testid");
    expect(beforeId).toBeTruthy();

    // Pick candidate A in the active race; auto-advance fires ~600ms later.
    await page
      .getByTestId("race-patterns-pick-A")
      .click({ timeout: WORKSPACE_TIMEOUT });

    // The just-decided race is marked decided immediately…
    await expect(page.getByTestId(beforeId as string)).toHaveAttribute(
      "data-decided",
      "true",
      { timeout: 5000 },
    );
    // …then ~600ms later auto-advance moves the active highlight OFF that row.
    await expect(page.getByTestId(beforeId as string)).not.toHaveAttribute(
      "aria-current",
      "page",
      { timeout: 5000 },
    );
    // Exactly one row is active now, and it's a different (undecided) race.
    await expect(activeRail).toHaveCount(1);
    const afterId = await activeRail.getAttribute("data-testid");
    expect(afterId).not.toBe(beforeId);
  });

  test("blind controls: per-card reveal↔hide round-trip + header blind toggle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await mockChatColdOpenAndQA(page);
    await mockCivicResponse(page);
    await mockRaceDataRich(page);
    await page.goto("/");

    await fillZip(page, "73301");
    await resolveRunoffGate(page);
    const ta = page.getByTestId("cold-open-textarea");
    await ta.waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await ta.fill("insulin keeps going up and rent went up 30% in two years");
    await page.getByTestId("cold-open-send").click();
    await page
      .getByTestId("concern-interpretation-themes")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });
    await page.getByTestId("theme-ranker-lock-in").click();
    await page
      .getByTestId("race-patterns")
      .waitFor({ state: "visible", timeout: WORKSPACE_TIMEOUT });

    // Blind by default → per-card Reveal affordance is present.
    const revealA = page.getByTestId("race-patterns-reveal-candidate-A");
    await expect(revealA).toBeVisible();

    // Per-card round-trip: Reveal → Hide appears → Hide → Reveal returns.
    await revealA.click();
    const hideA = page.getByTestId("race-patterns-hide-candidate-A");
    await expect(hideA).toBeVisible();
    await hideA.click();
    await expect(revealA).toBeVisible();

    // Header toggle flips GLOBAL blind mode: OFF removes the per-card reveal
    // affordance (names shown); ON brings it back.
    await page.getByTestId("workspace-chat-blind-toggle").click();
    await expect(revealA).toBeHidden();
    await page.getByTestId("workspace-chat-blind-toggle").click();
    await expect(revealA).toBeVisible();
  });
});

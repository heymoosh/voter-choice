import { test, expect, type Page } from "@playwright/test";

// CI-conditional waitFor budgets for helpers that wait on the research
// workspace to render. Cold-start `next start` on a fresh CI runner adds
// hydration latency that exceeds the 10s local-dev budget. Local dev keeps
// the tight 10s budget so flake surfaces fast.
//
// Documented in .ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md.
const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

/**
 * Whether the PROMPT_FLEET_V2 flag is active on the playwright webServer.
 * Mirrors the gating used by cold-open.spec.ts / workspace.spec.ts. Used to
 * branch helpers that need to detect the new (PartyGate, no Terms footer,
 * etc.) vs. legacy chrome and to self-skip flag-off-only assertions.
 *
 * See `.github/workflows/test.yml` for the CI matrix that exercises this
 * spec under both flag states.
 */
const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

/** Fill the zip-code form and submit. */
async function fillZip(page: Page, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
}

/**
 * Mock /api/civic with a minimal canned slate so the workspace has a ballot
 * to render once any gate completes. Without this, the new flag-on
 * "ballot-before-themes" guard (PR 6 fix D) routes us through
 * BallotLookupNeeded instead of the research workspace — both
 * `chat-window` and `prompt-output` testids vanish in that state.
 *
 * Safe to call on both flag states: under flag-off the route still
 * returns the canned payload, but the legacy auto-prompt path doesn't
 * gate on it. The canned slate IS state-agnostic — Civic API responses
 * are not validated against the inferred state.
 *
 * Mirrors `mockCivicWithContests` from cold-open.spec.ts.
 */
async function mockCivicWithContests(page: Page) {
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
        district: "",
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

/**
 * Resolve whichever pre-research gate is currently shown — the new Phase 5
 * data-driven `PartyGate` (PROMPT_FLEET_V2=1 + en, runoff-overlay states
 * AL/AR/GA/MS/NC/OK/SC/TX) or the legacy `runoff-gate` (flag-off or any
 * non-Phase-5 state). No-op when neither is visible.
 *
 * Mirrors the dual-detect helper in cold-open.spec.ts so the legacy specs
 * survive under both CI matrices. Picks an "unsure"-equivalent option for
 * the PartyGate path: `voted_dem_primary` is the safest universally-available
 * named option that doesn't trigger the unaffiliated-clarification panel.
 */
async function resolveRunoffGate(page: import("@playwright/test").Page) {
  // Phase 5 — new PartyGate takes precedence under flag-on + en. Wait
  // for whichever gate variant appears, or until both have been ruled
  // out by the time the workspace anchor renders. We use waitForFunction
  // so we exit as soon as ANY of these conditions is true:
  //   - PartyGate visible (flag-on path)
  //   - Legacy runoff-gate visible (flag-off path)
  //   - Workspace anchor visible (no gate fires — e.g. TX runoff past)
  // This avoids the 2.5s-too-short / WORKSPACE_TIMEOUT-too-long tradeoff.
  await page
    .waitForFunction(
      () => {
        const gate = (id: string) => {
          const el = document.querySelector<HTMLElement>(
            `[data-testid="${id}"]`,
          );
          return el !== null && el.offsetParent !== null;
        };
        return (
          gate("party-gate") ||
          gate("runoff-gate") ||
          gate("chat-window") ||
          gate("prompt-output") ||
          gate("co-context-breadcrumb") ||
          gate("cold-open-input")
        );
      },
      { timeout: WORKSPACE_TIMEOUT },
    )
    .catch(() => null);
  const partyGate = page.getByTestId("party-gate");
  if (await partyGate.isVisible().catch(() => false)) {
    await page.getByTestId("party-gate-option-voted_dem_primary").click();
    await page.getByTestId("party-gate-continue").click();
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="chat-window"]') ||
        !!document.querySelector('[data-testid="prompt-output"]'),
      { timeout: WORKSPACE_TIMEOUT },
    );
    return;
  }
  // Legacy runoff gate (flag-off or non-Phase-5-state).
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
 * Resolve whichever pre-research participation gate is currently shown:
 * the new Phase 5 data-driven `PartyGate` (PROMPT_FLEET_V2=1 + en, closed/
 * semi-closed states with a PartyGate rule row) or the legacy
 * `primary-participation-gate` (flag-off path).
 *
 * Both gates ultimately set the same downstream context (party lane + ballot
 * context); they differ only in chrome and testids. After resolution we wait
 * for chat-window OR research-context-strip — under flag-on + civic mock,
 * the workspace transitions to ResearchLayout (which renders both); under
 * flag-off the closed-primary lane lands on chat-window first.
 *
 * Defaults to `registered_dem` (DEM-registered lane). The flag-on PartyGate
 * unaffiliated path with `canSkipToGeneral=true` emits a `GENERAL` ballot
 * tag that has NO legacy back-map in `handlePartyGateSelect` (BallotToolClient
 * .tsx ~1242), leaving `closedPrimaryChoice` null and re-surfacing the
 * legacy gate inside ResearchLayout. Picking `registered_dem` cleanly
 * back-maps to `closedPrimaryChoice="registered_dem"` so the workspace
 * renders. (Flagged as a real src/ bug — see spawned task for the fix.)
 *
 * Tests that need a specific party lane (e.g. for ballot-content assertions)
 * can pass a different choice.
 */
async function resolveClosedPrimaryGate(
  page: Page,
  choice: ClosedPrimaryChoice = "registered_dem",
) {
  // Phase 5 — new PartyGate takes precedence under flag-on + en. Wait
  // for whichever gate variant appears, or until workspace anchors
  // render directly (no gate fires). See resolveRunoffGate for the
  // matching pattern. The legacy `primary-participation-gate` is the
  // flag-off testid; PartyGate replaces it under flag-on.
  await page
    .waitForFunction(
      () => {
        const gate = (id: string) => {
          const el = document.querySelector<HTMLElement>(
            `[data-testid="${id}"]`,
          );
          return el !== null && el.offsetParent !== null;
        };
        return (
          gate("party-gate") ||
          gate("primary-participation-gate") ||
          gate("chat-window") ||
          gate("prompt-output") ||
          gate("co-context-breadcrumb") ||
          gate("cold-open-input")
        );
      },
      { timeout: WORKSPACE_TIMEOUT },
    )
    .catch(() => null);
  const partyGate = page.getByTestId("party-gate");
  if (await partyGate.isVisible().catch(() => false)) {
    // Pick a named registered-party option so `handlePartyGateSelect`
    // back-maps to `closedPrimaryChoice` / `runoffChoice` (see
    // src/components/BallotToolClient.tsx ~line 1242). This keeps
    // `researchReady=true` post-gate; the `unaffiliated` skip-to-general
    // path emits the `GENERAL` tag which has NO legacy back-map, leaving
    // `closedPrimaryChoice` null and surfacing the legacy gate INSIDE
    // ResearchLayout (researchReady stays false). The Phase 5 unaffiliated
    // flow is covered by the PartyGate component tests; here we just need
    // the gate to dismiss into a ready workspace.
    //
    // PartyGate option IDs are verbatim from
    // src/lib/state-rules/rules.ts; the universal pick across closed,
    // semi-closed, and runoff-overlay rules is `registered_dem` (every
    // rule defines it). Try the asked-for choice first; fall back to
    // `registered_dem`; then the semi-closed unaffiliated lanes.
    const candidates = [
      `party-gate-option-${choice}`,
      "party-gate-option-registered_dem",
      "party-gate-option-voted_dem_primary",
      "party-gate-option-unaffiliated_dem",
    ];
    let clicked = false;
    for (const testId of candidates) {
      const opt = page.getByTestId(testId);
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error(
        "Could not find a clickable PartyGate option (none of: " +
          candidates.join(", ") +
          ")",
      );
    }
    // Continue button — present on the registered-party lane. The
    // unaffiliated path may instead surface a "skip to general" CTA (when
    // `unaffiliatedPath.canSkipToGeneral` is set). Tolerate either.
    const continueBtn = page.getByTestId("party-gate-continue");
    const skipBtn = page.getByTestId("party-gate-skip-to-general");
    if (await continueBtn.isVisible().catch(() => false)) {
      await expect(continueBtn).toBeEnabled({ timeout: 5000 });
      await continueBtn.click();
    } else if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
    }
    // Under flag-on the post-gate surface is one of:
    //  - chat-window (default chat path)
    //  - prompt-output (budget-exhausted fallback path)
    //  - research-context-strip (flag-off vestige, mostly inert here)
    //  - co-context-breadcrumb (flag-on cold-open chrome)
    //  - cold-open-input (cold-open textarea itself)
    //  - ballot-lookup-needed (multi-state path: handleStateSelect doesn't
    //    re-fire fetchCivicData, so pollingData stays null and we land on
    //    BallotLookupNeeded — callers must paste a ballot to exit)
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="chat-window"]') ||
        !!document.querySelector('[data-testid="prompt-output"]') ||
        !!document.querySelector('[data-testid="research-context-strip"]') ||
        !!document.querySelector('[data-testid="co-context-breadcrumb"]') ||
        !!document.querySelector('[data-testid="cold-open-input"]') ||
        !!document.querySelector('[data-testid="ballot-lookup-needed"]'),
      { timeout: WORKSPACE_TIMEOUT },
    );
    return;
  }

  // Legacy primary-participation-gate (flag-off path).
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
 * Bypass the flag-on `BallotLookupNeeded` funnel by pasting a stub ballot
 * if the funnel is visible. Used by the multi-state-selector tests
 * (86515 → AZ/NM): `handleStateSelect` in BallotToolClient.tsx ~line 2015
 * doesn't re-fire `fetchCivicData`, so `pollingData` stays null after a
 * state pick from the selector. Under flag-on this routes through
 * BallotLookupNeeded, blocking the workspace anchors the per-state tests
 * assert on. Pasting a stub ballot exits the funnel and renders the
 * workspace with sample-ballot-derived races.
 *
 * No-op when the funnel isn't visible.
 */
async function bypassBallotLookupIfPresent(page: Page, stateCode: string) {
  const funnel = page.getByTestId("ballot-lookup-needed");
  if (!(await funnel.isVisible().catch(() => false))) {
    return;
  }
  const textarea = page.getByTestId("ballot-lookup-textarea");
  await textarea.waitFor({ state: "visible", timeout: 5000 });
  await textarea.fill(
    `Sample ${stateCode} ballot\nU.S. President: Alice Anderson, Bob Brown\nGovernor: Carol Cain, Dan Davis`,
  );
  const confirm = page.getByTestId("ballot-lookup-confirm");
  await expect(confirm).toBeEnabled({ timeout: 5000 });
  await confirm.click();
}

/**
 * Assert that whichever pre-research gate matches the (state, electionType)
 * pair has rendered. Mirrors the existence-only check the per-state runoff
 * specs perform — the gate's job is to gate the workspace and surface the
 * statute, regardless of which UI chrome (PartyGate vs. legacy runoff-gate)
 * delivers it.
 *
 * Returns the locator + the detected variant ("party-gate" | "runoff-gate")
 * so callers can perform variant-specific text assertions (e.g. the legacy
 * gate copy embeds the state name; the new PartyGate uses an "Before we
 * start: {state} ballot check" heading).
 */
async function expectAnyRunoffGateVisible(
  page: Page,
): Promise<{ locator: ReturnType<Page["getByTestId"]>; variant: string }> {
  // Wait until either gate variant renders. Shared timeout budget — see
  // resolveRunoffGate for the matching pattern.
  await page
    .waitForFunction(
      () => {
        const gate = (id: string) => {
          const el = document.querySelector<HTMLElement>(
            `[data-testid="${id}"]`,
          );
          return el !== null && el.offsetParent !== null;
        };
        return gate("party-gate") || gate("runoff-gate");
      },
      { timeout: WORKSPACE_TIMEOUT },
    )
    .catch(() => null);
  const partyGate = page.getByTestId("party-gate");
  if (await partyGate.isVisible().catch(() => false)) {
    return { locator: partyGate, variant: "party-gate" };
  }
  const legacy = page.getByTestId("runoff-gate");
  await expect(legacy).toBeVisible();
  return { locator: legacy, variant: "runoff-gate" };
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
  // Under flag-on the cold-start hydration + Civic mock round-trip +
  // gate-detection waitForFunction can exceed the 10s local-test budget.
  // test.slow() triples it. Flag-off path is unaffected — its civic mock
  // is skipped entirely.
  test.slow();
  test.beforeEach(async ({ page }) => {
    // Under flag-on, stub Civic with a canned slate so the new
    // "ballot-before-themes" guard (PR 6 fix D) doesn't short-circuit
    // the workspace into BallotLookupNeeded — that branch has no
    // chat-window testid. Flag-off path is unchanged: the live Civic
    // API call falls through, returning [] for arbitrary TX ZIPs and
    // leaving the legacy chat-window path intact.
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await resolveRunoffGate(page);
    await waitForChatWorkspace(page);
  });

  test("displays research workspace", async ({ page }) => {
    await expect(page.getByTestId("chat-window")).toBeAttached();
    if (PROMPT_FLEET_V2_ENABLED) {
      // Under flag-on + en, `suppressLegacyChrome=true` in
      // ResearchLayout.tsx (line 1505) hides `research-context-strip`;
      // the prototype's `co-context-breadcrumb` (rendered by ChatPanel
      // when coldOpenContext is supplied — line 804) is the equivalent
      // workspace-ready signal.
      await expect(page.getByTestId("co-context-breadcrumb")).toBeVisible();
    } else {
      // Legacy flag-off: live Civic returns [] for 73301 → warning panel
      // renders. Preserve the original assertion shape here.
      await expect(page.getByTestId("ballot-data-status")).toBeVisible();
    }
  });

  test("shows ballot data completeness status", async ({ page }) => {
    // The `ballot-data-status` warning panel only renders when Civic
    // returns NO contests AND no user paste has happened. Under flag-on
    // we mock Civic with contests to bypass BallotLookupNeeded, which
    // also hides this panel. Coverage retained in BallotToolClient.test
    // .tsx (unit test) for the empty-Civic-warning path.
    test.skip(
      PROMPT_FLEET_V2_ENABLED,
      "Conflicts with flag-on civic mock — ballot-data-status requires empty-Civic, but the mock provides contests to bypass BallotLookupNeeded. Covered by src/components/BallotToolClient.test.tsx (empty-Civic-warning unit tests).",
    );
    const ballotStatus = page.getByTestId("ballot-data-status");
    await expect(ballotStatus).toBeVisible();
    await expect(ballotStatus).toContainText(/Exact ballot|Official contests/i);
  });
});

test.describe("Valid zip code — Texas (73301) — fallback path", () => {
  test.slow();
  test.beforeEach(async ({ page }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
  test.slow();
  test.beforeEach(async ({ page }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
  test.slow();
  test("copy button is visible after valid zip submission", async ({
    page,
  }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
    // PR A2 normalized the legal entity to "Gray Bird LLC" across user-facing
    // copy (privacy, terms, footer, translations).
    await expect(page.getByText(/Gray Bird LLC/i).first()).toBeVisible();
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
    test.skip(
      PROMPT_FLEET_V2_ENABLED,
      "Legacy-only footer chrome. Prototype landing footer (EnglishShell in src/app/PageContent.tsx ~line 397) ships 'Ballot data · Methodology · Privacy · Support' — no Terms link. Privacy link presence is covered by the 'privacy link navigates to privacy page' test, which already passes under flag-on; the bundled 'privacy+terms' assertion is legacy-only.",
    );
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
    test.skip(
      PROMPT_FLEET_V2_ENABLED,
      "Legacy-only footer chrome. Prototype landing footer (EnglishShell in src/app/PageContent.tsx ~line 397) omits the Terms link entirely; Terms of Use page itself is still reachable at /terms (covered by the 'Terms of Use page › loads and has correct heading' test, which passes under both flags).",
    );
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
    // PR A2 normalized the legal entity to "Gray Bird LLC".
    await expect(footer).toContainText(/Gray Bird LLC/);
  });

  test("footer shows data last updated", async ({ page }) => {
    test.skip(
      PROMPT_FLEET_V2_ENABLED,
      "Legacy-only footer chrome. Prototype landing footer (EnglishShell in src/app/PageContent.tsx ~line 397) does not display 'Data last updated'. The data-freshness signal is communicated in-context within the workspace (ballot-data-status testid) rather than as a footer micro-copy line.",
    );
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(/Data last updated/i);
  });
});

// ---------------------------------------------------------------------------
// Per-state coverage — all 9 populated states + Wyoming fallback
// ---------------------------------------------------------------------------

// Texas (73301) — runoff gate should be visible (runoff upcoming, partyLocked=true).
//
// `requiresRunoffGate` only fires when the next upcoming election in
// src/data/states/TX.json is of type "primary" or "runoff". After the
// 2026-05-26 TX runoff date passes, getUpcomingElection rolls forward to
// the General (type "general"), the gate stops rendering, and this test
// would fail purely due to the calendar. Self-skip in that window so the
// test only runs while the assertion is still meaningful.
//
// See: src/components/BallotToolClient.tsx :: requiresRunoffGate /
//      getUpcomingElection (uses getTodayInLatestUsZone — Hawaii midnight).
const TX_RUNOFF_DATE = "2026-05-26";
test.describe("State coverage — Texas runoff gate (73301)", () => {
  test("shows runoff gate for Texas address", async ({ page }) => {
    // Compare YYYY-MM-DD strings against the runoff date so the skip
    // tracks the same Hawaii-zone "today" the app uses.
    const todayHi = new Date().toLocaleDateString("en-CA", {
      timeZone: "Pacific/Honolulu",
    });
    test.skip(
      todayHi > TX_RUNOFF_DATE,
      `Texas runoff (${TX_RUNOFF_DATE}) is past — gate no longer renders.`,
    );
    await page.goto("/");
    await fillZip(page, "73301");
    const { locator, variant } = await expectAnyRunoffGateVisible(page);
    if (variant === "party-gate") {
      // PartyGate variant — statute box surfaces Tex. Elec. Code §172.087.
      await expect(locator).toContainText(/TX|Texas|§172\.087/i);
    } else {
      await expect(locator).toContainText(/Texas/i);
    }
  });
});

// New York (10007) — closed primary (NY Election Law §6-100); participation
// gate renders before the research workspace. After gate traversal, the
// research workspace renders (chat-window attached) and the
// research-context-strip shows the state name.
//
// Under flag-on the legacy `primary-participation-gate` is replaced by the
// new Phase 5 `party-gate` (data-driven, statute citation embedded). The
// `resolveClosedPrimaryGate` helper dual-detects either variant.
test.describe("State coverage — New York (10007)", () => {
  // PartyGate render + click + workspace transition can exceed the 10s
  // local-test budget under flag-on (cold-start hydration + Civic mock
  // round-trip + PartyGate paint). test.slow() triples the budget.
  test.slow();
  test("renders New York-specific data for a NY address", async ({ page }) => {
    // Civic mock so the flag-on "ballot-before-themes" guard doesn't route
    // us through BallotLookupNeeded (no research-context-strip there).
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
    await page.goto("/");
    await fillZip(page, "10007");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // No runoff gate for NY (NY has no party-locked runoff)
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    // Closed-primary gate must be resolved before workspace renders
    await resolveClosedPrimaryGate(page);
    // Workspace chrome contract: under flag-on, the prototype's
    // `co-context-breadcrumb` replaces the legacy `research-context-strip`
    // (suppressed via `suppressLegacyChrome` in ResearchLayout.tsx ~1505).
    // Both carry the state name; dual-detect so the same test exercises
    // both surfaces.
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/New York/i);
  });
});

// Florida (32399) — closed primary (F.S. §101.021); participation gate
// renders before the research workspace. Under flag-on the gate ships as
// the new Phase 5 PartyGate; dual-detect via resolveClosedPrimaryGate.
test.describe("State coverage — Florida (32399)", () => {
  test.slow();
  test("renders Florida-specific data for a FL address", async ({ page }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
    await page.goto("/");
    await fillZip(page, "32399");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/Florida/i);
  });
});

// Georgia (30303) — runoff overlay visible (runoff upcoming, partyLocked=true).
// Under flag-on the gate ships as the new Phase 5 `PartyGate` (data-driven,
// `Ga. Code §21-2-224` statute citation); under flag-off it's the legacy
// `runoff-gate`. We dual-detect so the same test exercises both surfaces.
test.describe("State coverage — Georgia runoff gate (30303)", () => {
  test("shows runoff gate for Georgia address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "30303");
    const { locator, variant } = await expectAnyRunoffGateVisible(page);
    if (variant === "party-gate") {
      // PartyGate heading is "Before we start: GA ballot check" + statute
      // panel — match GA via the statute citation (Ga. Code §21-2-224).
      await expect(locator).toContainText(/GA|Georgia|Ga\.\s*Code/i);
    } else {
      // Legacy gate title references Georgia explicitly.
      await expect(locator).toContainText(/Georgia/i);
    }
  });
});

// North Carolina (27601) — runoff overlay visible (runoff upcoming 2026-07-07,
// partyLockedToFirstRoundPrimary=true per N.C. Gen. Stat. §163-110).
//
// Data correction landed in commit bf5c099 (data: complete primaryParticipation
// for all 50 states + DC; fix NC/SD runoffRules) — flipped NC's
// `runoffRules.partyLockedToFirstRoundPrimary` from `false` to `true`, citing
// N.C. Gen. Stat. §163-110. The runoff gate is correctly rendered for NC zips
// now; the test had to be updated to reflect this. Mirrors the GA/TX pattern.
//
// Under flag-on the gate ships as the new Phase 5 `PartyGate`; dual-detect.
test.describe("State coverage — North Carolina runoff gate (27601)", () => {
  test("shows runoff gate for North Carolina address", async ({ page }) => {
    await page.goto("/");
    await fillZip(page, "27601");
    const { locator, variant } = await expectAnyRunoffGateVisible(page);
    if (variant === "party-gate") {
      // PartyGate variant — statute box surfaces N.C. Gen. Stat. §163-110.
      await expect(locator).toContainText(/NC|North Carolina|§163-110/i);
    } else {
      await expect(locator).toContainText(/North Carolina/i);
    }
  });
});

// New Hampshire (03301) — semi-closed primary (RSA 659:14); participation
// gate renders before the research workspace. NH has no online registration
// deadline (same-day registration state). Under flag-on the gate ships as
// the new Phase 5 PartyGate; dual-detect.
test.describe("State coverage — New Hampshire (03301)", () => {
  test.slow();
  test("renders New Hampshire-specific data for a NH address", async ({
    page,
  }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
    await page.goto("/");
    await fillZip(page, "03301");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/New Hampshire/i);
  });
});

// Arizona (86515 — multi-state AZ/NM; user must select state). Semi-closed
// primary (A.R.S. §16-467) — participation gate renders after state selection.
// Under flag-on the gate ships as the new Phase 5 PartyGate; dual-detect.
test.describe("State coverage — Arizona via multi-state selector (86515)", () => {
  test.slow();
  test("shows state selector then renders Arizona data", async ({ page }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
    // Multi-state path: `handleStateSelect` in BallotToolClient.tsx ~line
    // 2015 doesn't re-fire `fetchCivicData`, so `pollingData` stays null
    // and the flag-on path lands on BallotLookupNeeded. Bypass it by
    // pasting a stub ballot — the workspace then renders with the
    // sample-ballot races. (Flag-off doesn't hit this surface so the
    // bypass is a no-op there.)
    if (PROMPT_FLEET_V2_ENABLED) {
      await bypassBallotLookupIfPresent(page, "AZ");
    }
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/Arizona/i);
  });
});

// New Mexico (86515 — multi-state AZ/NM; user selects NM). Closed primary
// (NMSA §1-8-16) — participation gate renders after state selection. Under
// flag-on the gate ships as the new Phase 5 PartyGate; dual-detect.
test.describe("State coverage — New Mexico via multi-state selector (86515)", () => {
  test.slow();
  test("shows state selector then renders New Mexico data", async ({
    page,
  }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
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
    if (PROMPT_FLEET_V2_ENABLED) {
      await bypassBallotLookupIfPresent(page, "NM");
    }
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/New Mexico/i);
  });
});

// Wyoming (82001) — populated as part of the 50-state expansion. Zip lands
// on the Wyoming research view; closed primary (Wyo. Stat. Ann. §22-5-101).
// Runoff gate does not render (WY has no party-locked legislative-primary
// runoff). Closed-primary participation gate renders before workspace.
// Under flag-on the gate ships as the new Phase 5 PartyGate; dual-detect.
test.describe("State coverage — Wyoming (82001)", () => {
  test.slow();
  test("renders Wyoming-specific data for a Wyoming zip", async ({ page }) => {
    if (PROMPT_FLEET_V2_ENABLED) {
      await mockCivicWithContests(page);
    }
    await page.goto("/");
    await fillZip(page, "82001");
    await expect(page.getByTestId("not-found-message")).toHaveCount(0);
    // Runoff gate should not appear (WY runoffs are not party-locked)
    await expect(page.getByTestId("runoff-gate")).toHaveCount(0);
    await resolveClosedPrimaryGate(page);
    const chrome = PROMPT_FLEET_V2_ENABLED
      ? page.getByTestId("co-context-breadcrumb")
      : page.getByTestId("research-context-strip");
    await expect(chrome).toBeVisible();
    await expect(chrome).toContainText(/Wyoming/i);
  });
});

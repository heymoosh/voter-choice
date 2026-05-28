import { test, expect, type Page } from "@playwright/test";

// CI-conditional waitFor budget for helpers waiting on the research
// workspace to render. Cold-start `next start` on a fresh CI runner adds
// hydration latency that exceeds the 10s local-dev budget.
//
// Documented in .ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md.
const WORKSPACE_TIMEOUT = process.env.CI ? 20000 : 10000;

/**
 * Whether the PROMPT_FLEET_V2 flag is active on the playwright webServer.
 * Mirrors the gating used by cold-open.spec.ts / workspace.spec.ts. Used
 * to apply civic-payload mocks only on the flag-on matrix (the flag-off
 * matrix relies on the live Civic API returning empty contests for the
 * TX P.O.-box ZIP, which keeps the legacy auto-prompt path intact).
 */
const PROMPT_FLEET_V2_ENABLED =
  typeof process.env.PROMPT_FLEET_V2 === "string" &&
  process.env.PROMPT_FLEET_V2.length > 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mock /api/civic with a canned slate so the new flag-on
 * "ballot-before-themes" guard (PR 6 fix D) doesn't short-circuit the
 * workspace into BallotLookupNeeded — that branch has no
 * research-context-strip / chat-window testid.
 *
 * Mirrors `mockCivicWithContests` from cold-open.spec.ts (and the matching
 * helper in ballot-tool.spec.ts). Safe under flag-off too.
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

async function goToTexasWorkspace(page: Page) {
  if (PROMPT_FLEET_V2_ENABLED) {
    // Under flag-on, the new "ballot-before-themes" guard would short-
    // circuit to BallotLookupNeeded without a Civic slate, hiding
    // research-context-strip. Mock contests to keep the workspace
    // surface visible. Flag-off path is unchanged — the live Civic API
    // returns [] for the TX P.O.-box ZIP and the legacy chat-window
    // path renders without the new guard.
    await mockCivicWithContests(page);
  }
  await page.goto("/");
  await page.getByTestId("zip-input").fill("73301");
  await page.getByTestId("zip-submit").click();

  // Handle optional gate — under flag-on (PROMPT_FLEET_V2=1 + en) this is
  // the new Phase 5 `party-gate`; under flag-off it's the legacy
  // `runoff-gate`. Dual-detect so the helper works on both CI matrices.
  // TX runoff date is 2026-05-26 — past that, neither gate renders for
  // 73301 (upcoming election rolls forward to the general). We wait for
  // whichever shows up first OR for the workspace anchor to render
  // directly (no-gate path), so the wait budget is shared rather than
  // doubled across both gate variants.
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
    // Pick `voted_dem_primary` (TX runoff overlay option) for the runoff
    // PartyGate path. For the closed-primary PartyGate this option won't
    // exist; fall back to `registered_dem` (universal across PartyGate
    // closed-primary rules).
    const dem = page.getByTestId("party-gate-option-voted_dem_primary");
    if (await dem.isVisible().catch(() => false)) {
      await dem.click();
    } else {
      await page.getByTestId("party-gate-option-registered_dem").click();
    }
    await page.getByTestId("party-gate-continue").click();
  } else {
    const legacy = page.getByTestId("runoff-gate");
    if (await legacy.isVisible().catch(() => false)) {
      await page.getByTestId("runoff-option-unsure").click();
    }
  }

  // Wait for the research workspace to be ready. Under flag-off, the
  // persistent `research-context-strip` is the most stable signal —
  // chat-window/prompt-output come and go with chat state. Under flag-on
  // (PROMPT_FLEET_V2 + en), `suppressLegacyChrome=true` in ResearchLayout
  // (line ~1505) hides that strip; the prototype's `co-context-breadcrumb`
  // (rendered by ChatPanel.tsx ~line 804) is the equivalent always-on
  // workspace chrome. Dual-detect so the helper works on both matrices.
  //
  // See `.ai/work-packets/e2e-prompt-output-rendering-drift.md` for the
  // chat/fallback state machine.
  await page.waitForFunction(
    () =>
      !!document.querySelector('[data-testid="research-context-strip"]') ||
      !!document.querySelector('[data-testid="co-context-breadcrumb"]'),
    { timeout: WORKSPACE_TIMEOUT },
  );
}

/** Intercept /api/chat and return a canned SSE response. */
function mockChatResponse(page: Page, text: string) {
  const body = [
    `data: ${JSON.stringify({ type: "text", text })}\n\n`,
    `data: ${JSON.stringify({
      type: "done",
      budget: { tier: "normal", percent: 5, messagesUsed: 1, messagesMax: 10 },
    })}\n\n`,
  ].join("");

  return page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      body,
    }),
  );
}

/**
 * Ensure the "Paste your ballot instead" <details> section is open.
 *
 * The element was changed to `<details open>` (default-expanded) in commit
 * `1054bcb` ("post-E2E batch 1 — labels, reveal, OCR, proactive profile"),
 * so the previous behaviour of clicking the summary to expand now CLOSES
 * the section instead. We check the current state and only toggle if
 * needed.
 */
async function openSampleBallotDetails(page: Page) {
  const input = page.getByTestId("user-sample-ballot-input");
  // If already visible, no action needed (details is open by default).
  if (!(await input.isVisible().catch(() => false))) {
    await page.getByText("Paste your ballot instead").click();
  }
  await input.waitFor({ state: "visible", timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Sample ballot upload
// ---------------------------------------------------------------------------

test.describe("Sample ballot upload", () => {
  test.slow(); // Navigation + gate handling can exceed 10 s on mobile

  // Under flag-on, the legacy in-workspace `Paste your ballot instead`
  // widget (ResearchLayout.tsx ~line 1590) is suppressed once
  // `hasUserSampleBallot` is true (PR 8 Fix M). The new BallotLookupNeeded
  // funnel owns the paste path before the workspace — covered by
  // e2e/cold-open.spec.ts:241 (`Civic empty → BallotLookupNeeded → paste
  // → cold-open → workspace`). These flag-off-specific assertions check
  // the in-workspace post-apply confirmation that no longer exists under
  // flag-on; skip the entire describe in that matrix.
  test.skip(
    () => PROMPT_FLEET_V2_ENABLED,
    "Legacy in-workspace ballot-paste widget; replaced under PROMPT_FLEET_V2 by BallotLookupNeeded (covered by e2e/cold-open.spec.ts paste-funnel happy path).",
  );

  test.beforeEach(async ({ page }) => {
    await goToTexasWorkspace(page);
    await openSampleBallotDetails(page);
  });

  test("text file upload populates textarea and apply confirms", async ({
    page,
  }) => {
    await page.getByTestId("user-sample-ballot-file").setInputFiles({
      name: "ballot.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("President: Candidate A\nSenate: Candidate B"),
    });

    await expect(page.getByTestId("user-sample-ballot-textarea")).toHaveValue(
      /Candidate A/,
    );

    const applyBtn = page.getByTestId("apply-user-sample-ballot");
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    await expect(page.getByTestId("user-sample-ballot-applied")).toBeVisible();
  });

  test("PDF file triggers extraction or error notice — UI stays functional", async ({
    page,
  }) => {
    // Minimal valid PDF with a text stream
    const pdfContent =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]" +
      "/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
      "4 0 obj<</Length 44>>\nstream\n" +
      "BT /F1 12 Tf 100 700 Td (BALLOT TEST) Tj ET\n" +
      "endstream\nendobj\n" +
      "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n" +
      "xref\n0 6\n" +
      "0000000000 65535 f \n" +
      "0000000009 00000 n \n" +
      "0000000058 00000 n \n" +
      "0000000115 00000 n \n" +
      "0000000274 00000 n \n" +
      "0000000370 00000 n \n" +
      "trailer<</Size 6/Root 1 0 R>>\nstartxref\n441\n%%EOF\n";

    await page.getByTestId("user-sample-ballot-file").setInputFiles({
      name: "ballot.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdfContent),
    });

    // Outcome A: text extracted into textarea
    // Outcome B: status notice shown (scanned PDF or CDN error)
    // Either way the input section must remain visible (no crash)
    await expect(page.getByTestId("user-sample-ballot-input")).toBeVisible({
      timeout: 8000,
    });
  });
});

// ---------------------------------------------------------------------------
// Ballot printout popup
// ---------------------------------------------------------------------------

// When the assistant response contains "MY BALLOT", ChatPanel auto-activates the
// ResearchPortfolio view with a "Print Ballot" button (no `download-ballot-btn`
// testid in that view). The test targets that button by role + name.
const BALLOT_SSE_TEXT = [
  "MY BALLOT",
  "",
  "1. President: Write-In Candidate",
  "2. Senate: Favorite Senator",
].join("\n");

test.describe("Ballot printout popup", () => {
  test.slow();

  // Under flag-on, ChatPanel is in `cold-open` phase by default — the
  // textarea-driven theme-extraction step in ColdOpenInput.tsx. No auto-
  // start fires until the user submits free-form text, so the canned
  // `MY BALLOT` SSE never plays and ResearchPortfolio's Print Ballot
  // button never mounts. Print-ballot coverage under flag-on lives in
  // e2e/print-ballot.spec.ts (which exercises the post-lock workspace
  // path with explicit print intents).
  test.skip(
    () => PROMPT_FLEET_V2_ENABLED,
    "Legacy auto-start MY-BALLOT path; replaced under PROMPT_FLEET_V2 by the cold-open textarea + lock-in flow. Print-ballot popup coverage on flag-on lives in e2e/print-ballot.spec.ts.",
  );

  test.beforeEach(async ({ page }) => {
    // Mock must be registered before navigation so the auto-start is captured.
    await mockChatResponse(page, BALLOT_SSE_TEXT);
    await goToTexasWorkspace(page);
  });

  test("print ballot button appears in portfolio view after MY BALLOT response", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /Print.*Ballot/i }).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("clicking print ballot button opens printable popup with correct title", async ({
    page,
    context,
  }) => {
    const printBtn = page
      .getByRole("button", { name: /Print.*Ballot/i })
      .first();
    await printBtn.waitFor({ timeout: 8000 });

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      printBtn.click(),
    ]);

    await expect(popup).toHaveTitle(/My Ballot/i, { timeout: 5000 });
    await popup.close();
  });
});

// ---------------------------------------------------------------------------
// Voter profile download
// ---------------------------------------------------------------------------

const PROFILE_SSE_TEXT = [
  "=== MY VOTER PROFILE — May 2026 ===",
  "Name: Test Voter",
  "State: Texas",
  "=== END VOTER PROFILE ===",
].join("\n");

test.describe("Voter profile download", () => {
  test.slow();

  // Under flag-on, the cold-open phase blocks the auto-start path the
  // same way the Ballot printout suite is blocked. The download-profile
  // affordance under flag-on lives inside the post-lock workspace
  // (HandoffPackage / BallotActions) and is exercised by the workspace
  // and theme-amend e2e specs.
  test.skip(
    () => PROMPT_FLEET_V2_ENABLED,
    "Legacy auto-start MY-VOTER-PROFILE path; replaced under PROMPT_FLEET_V2 by the cold-open + lock + handoff flow. download-profile-btn coverage on flag-on lives in workspace + theme-amend specs (HandoffPackage / BallotActions).",
  );

  test.beforeEach(async ({ page }) => {
    await mockChatResponse(page, PROFILE_SSE_TEXT);
    await goToTexasWorkspace(page);
  });

  test("download-profile-btn appears after MY VOTER PROFILE response", async ({
    page,
  }) => {
    await expect(page.getByTestId("download-profile-btn")).toBeVisible({
      timeout: 8000,
    });
  });

  test("clicking download-profile-btn downloads voter-profile.txt", async ({
    page,
  }) => {
    await page.getByTestId("download-profile-btn").waitFor({ timeout: 8000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("download-profile-btn").click(),
    ]);

    expect(download.suggestedFilename()).toBe("voter-profile.txt");
  });
});

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToTexasWorkspace(page: Page) {
  await page.goto("/");
  await page.getByTestId("zip-input").fill("73301");
  await page.getByTestId("zip-submit").click();

  // Handle optional runoff gate
  const gate = page.getByTestId("runoff-gate");
  await gate.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
  if (await gate.isVisible().catch(() => false)) {
    await page.getByTestId("runoff-option-unsure").click();
  }

  // prompt-output is always rendered once the research workspace loads,
  // regardless of whether the chat-window or portfolio view is active.
  await page
    .getByTestId("prompt-output")
    .waitFor({ state: "visible", timeout: 10000 });
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

/** Expand the "Paste your ballot instead" <details> section. */
async function openSampleBallotDetails(page: Page) {
  await page.getByText("Paste your ballot instead").click();
  await page
    .getByTestId("user-sample-ballot-input")
    .waitFor({ state: "visible", timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Sample ballot upload
// ---------------------------------------------------------------------------

test.describe("Sample ballot upload", () => {
  test.slow(); // Navigation + gate handling can exceed 10 s on mobile

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

    await expect(
      page.getByTestId("user-sample-ballot-applied"),
    ).toBeVisible();
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
    await expect(
      page.getByTestId("user-sample-ballot-input"),
    ).toBeVisible({ timeout: 8000 });
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
    const printBtn = page.getByRole("button", { name: /Print.*Ballot/i }).first();
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
    await page
      .getByTestId("download-profile-btn")
      .waitFor({ timeout: 8000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("download-profile-btn").click(),
    ]);

    expect(download.suggestedFilename()).toBe("voter-profile.txt");
  });
});

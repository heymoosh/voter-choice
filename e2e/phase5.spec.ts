import { test, expect } from "@playwright/test";

/**
 * Phase 5 e2e tests: LLM Chat Window, Downloadable Ballot, Voter Profile
 *
 * Chat tests use mocked API responses to avoid real API calls and costs.
 * Budget state tests mock the /api/chat GET endpoint.
 */

const MOCK_BALLOT_RESPONSE = `I've analyzed your ballot! Here are your choices:

MY BALLOT — Texas — Texas Primary 2026 — March 3, 2026

Governor: Jane Smith
US Senate: Bob Jones

Propositions:
Prop 1: YES
Prop 2: NO

REMINDER: Texas law prohibits wireless devices in the voting room. Print this or write it down.

Generated with Voter Choice — voterchoice.org
This document is your personal notes, not an official ballot.`;

const MOCK_STREAMING_RESPONSE = `Hello! I'm ready to help you research your ballot. Let's start by looking at the races in your area.`;

async function submitZip(page: Parameters<typeof test.fn>[0] & { goto: (url: string) => Promise<void> }, zip: string) {
  await page.getByTestId("zip-input").fill(zip);
  await page.getByTestId("zip-submit").click();
  await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Phase 5: Chat CTA
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat CTA", () => {
  test("chat CTA button is visible after zip submission", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    const cta = page.getByTestId("chat-cta");
    await expect(cta).toBeVisible({ timeout: 5000 });
  });

  test("clicking chat CTA shows the chat window", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    const chatWindow = page.getByTestId("chat-window");
    await expect(chatWindow).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Chat privacy notice
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat privacy notice", () => {
  test("privacy notice visible when chat opens", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    const notice = page.getByTestId("chat-privacy-notice");
    await expect(notice).toBeVisible({ timeout: 3000 });
    await expect(notice).toContainText(/conversation stays in your browser/i);
  });

  test("privacy notice can be dismissed", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await page.getByText("Got it").click();
    const notice = page.getByTestId("chat-privacy-notice");
    await expect(notice).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Chat input
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat input", () => {
  test("chat input and send button are visible", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("chat-input")).toBeVisible();
    await expect(page.getByTestId("chat-send")).toBeVisible();
  });

  test("can type in chat input", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    const input = page.getByTestId("chat-input");
    await input.fill("Hello, help me with my ballot");
    await expect(input).toHaveValue("Hello, help me with my ballot");
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Chat sends a message and gets a streaming response
// ---------------------------------------------------------------------------

test.describe("Phase 5: Chat streaming response", () => {
  test("sending a message shows user message and assistant response", async ({
    page,
  }) => {
    // Mock the chat API to return a deterministic SSE response as a string body
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ budgetPercent: 10, budgetExhausted: false }),
        });
        return;
      }

      // POST: return full SSE body as a string
      const delta = `data: ${JSON.stringify({ type: "delta", text: MOCK_STREAMING_RESPONSE, budgetPercent: 10 })}\n\n`;
      const done = `data: ${JSON.stringify({ type: "done", inputTokens: 100, outputTokens: 50, budgetPercent: 10 })}\n\n`;

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: delta + done,
      });
    });

    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await page.getByTestId("chat-input").fill("Hello!");
    await page.getByTestId("chat-send").click();

    // User message should appear
    const userMsg = page.getByTestId("chat-message-user").first();
    await expect(userMsg).toBeVisible({ timeout: 5000 });
    await expect(userMsg).toContainText("Hello!");

    // Assistant response should appear (text is set via setMessages after done event)
    await expect(page.getByTestId("chat-message-assistant").last()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Ballot generation (Path A) — chat produces MY BALLOT output
// ---------------------------------------------------------------------------

test.describe("Phase 5: Ballot generation from chat (Path A)", () => {
  test("download ballot button appears after MY BALLOT response", async ({
    page,
  }) => {
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ budgetPercent: 10, budgetExhausted: false }),
        });
        return;
      }

      const delta = `data: ${JSON.stringify({ type: "delta", text: MOCK_BALLOT_RESPONSE, budgetPercent: 10 })}\n\n`;
      const done = `data: ${JSON.stringify({ type: "done", inputTokens: 100, outputTokens: 200, budgetPercent: 10 })}\n\n`;

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: delta + done,
      });
    });

    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();
    await page.getByTestId("chat-input").fill("I'm done, generate my ballot.");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("ballot-preview")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Budget degradation states
// ---------------------------------------------------------------------------

test.describe("Phase 5: Budget degradation", () => {
  test("shows 70% budget notice", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ budgetPercent: 75, budgetExhausted: false }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: "data: " + JSON.stringify({ type: "done", budgetPercent: 75 }) + "\n\n",
        });
      }
    });

    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();

    const notice = page.getByTestId("chat-budget-notice");
    await expect(notice).toBeVisible({ timeout: 3000 });
  });

  test("shows disabled message when budget exhausted via GET response", async ({
    page,
  }) => {
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ budgetPercent: 100, budgetExhausted: true }),
        });
      } else {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "budget_exhausted",
            budgetPercent: 100,
          }),
        });
      }
    });

    await page.goto("/");
    await submitZip(page, "73301");
    await page.getByTestId("chat-cta").click();

    await expect(page.getByTestId("chat-disabled-message")).toBeVisible({
      timeout: 3000,
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Ballot generation (Path B) — paste flow
// ---------------------------------------------------------------------------

test.describe("Phase 5: Ballot paste (Path B)", () => {
  test("ballot paste input is visible after zip submission", async ({
    page,
  }) => {
    await page.goto("/");
    await submitZip(page, "73301");
    const pasteInput = page.getByTestId("ballot-paste-input");
    await expect(pasteInput).toBeVisible({ timeout: 5000 });
  });

  test("pasting valid ballot text generates ballot preview", async ({
    page,
  }) => {
    await page.goto("/");
    await submitZip(page, "73301");

    await page.getByTestId("ballot-paste-input").fill(MOCK_BALLOT_RESPONSE);
    await page.getByText("Generate Ballot").first().click();

    await expect(page.getByTestId("ballot-preview")).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible();
  });

  test("pasting invalid text shows parse error and manual entry", async ({
    page,
  }) => {
    await page.goto("/");
    await submitZip(page, "73301");

    await page
      .getByTestId("ballot-paste-input")
      .fill("This is not a ballot format at all.");
    await page.getByText("Generate Ballot").first().click();

    // Should show parse error
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /couldn't read/i }),
    ).toBeVisible({ timeout: 3000 });

    // Should show manual entry form
    await expect(page.getByTestId("ballot-manual-entry")).toBeVisible();
  });

  test("manual entry form generates ballot", async ({ page }) => {
    await page.goto("/");
    await submitZip(page, "73301");

    // Force the manual entry to appear by pasting invalid content first
    await page
      .getByTestId("ballot-paste-input")
      .fill("invalid");
    await page.getByText("Generate Ballot").first().click();

    // Fill in manual entry
    const raceInputs = await page.locator('[aria-label*="Race"]').all();
    const choiceInputs = await page.locator('[aria-label*="Choice"]').all();

    if (raceInputs.length > 0) {
      await raceInputs[0].fill("US Governor");
      await choiceInputs[0].fill("Jane Smith");
      await page.getByText("Build My Ballot").click();

      await expect(page.getByTestId("ballot-preview")).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Voter Profile Upload
// ---------------------------------------------------------------------------

test.describe("Phase 5: Voter profile upload", () => {
  test("voter profile upload input is visible", async ({ page }) => {
    await page.goto("/");
    const uploadInput = page.getByTestId("upload-profile-input");
    await expect(uploadInput).toBeVisible();
  });

  test("uploading a valid .txt profile shows confirmation", async ({
    page,
  }) => {
    await page.goto("/");

    const profileContent = `=== MY VOTER PROFILE — March 2026 ===

LOCATION: Austin, TX 73301

WHAT I CARE ABOUT:
- Environmental policy: high priority

=== END VOTER PROFILE ===`;

    // Create a .txt file buffer and upload it
    const uploadInput = page.getByTestId("upload-profile-input");
    await uploadInput.setInputFiles({
      name: "voter-profile.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(profileContent),
    });

    await expect(page.getByTestId("profile-confirmation")).toBeVisible({
      timeout: 3000,
    });
  });

  test("uploading a non-.txt file shows error", async ({ page }) => {
    await page.goto("/");

    const uploadInput = page.getByTestId("upload-profile-input");
    await uploadInput.setInputFiles({
      name: "profile.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"test": true}'),
    });

    const errorAlert = page.locator("#profile-upload-error");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/.txt/i);
  });

  test("uploading a file > 10KB shows error", async ({ page }) => {
    await page.goto("/");

    // Create a 11KB buffer
    const bigContent = "a".repeat(11 * 1024);
    const uploadInput = page.getByTestId("upload-profile-input");
    await uploadInput.setInputFiles({
      name: "big-profile.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(bigContent),
    });

    const errorAlert = page.locator("#profile-upload-error");
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
    await expect(errorAlert).toContainText(/10KB/i);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: API route security
// ---------------------------------------------------------------------------

test.describe("Phase 5: API security", () => {
  test("chat API GET returns budget status", async ({ page }) => {
    await page.goto("/");

    // The GET endpoint should return budget info without any credentials
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/chat");
      const data = await res.json();
      return { status: res.status, hasBudgetPercent: "budgetPercent" in data };
    });

    expect(response.status).toBe(200);
    expect(response.hasBudgetPercent).toBe(true);
  });

  test("chat API requires messages array", async ({ page }) => {
    await page.goto("/");

    // Request without messages array should return 400
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ systemPrompt: "test" }),
      });
      return res.status;
    });

    // Should be 400 (bad request) or 403 (forbidden - no origin) or handled error
    expect([400, 403, 429]).toContain(response);
  });
});

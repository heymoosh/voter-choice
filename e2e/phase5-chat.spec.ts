import { test, expect } from "@playwright/test";

/**
 * Phase 5: LLM Chat Window tests.
 * All API calls to /api/chat are mocked via page.route() — no real Anthropic API calls.
 */

const MOCK_BALLOT_RESPONSE = `
Here's your ballot summary!

MY BALLOT — Travis County — Texas General Election — November 3, 2026

US Senate: Jane Doe
Governor: John Smith

REMINDER: Texas law prohibits wireless devices in the voting room. Print this or write it down.

Generated with VoterChoice
This document is your personal notes, not an official ballot.
`;

const MOCK_ALIGNMENT_RESPONSE = `
Here are the alignment scores:

[ALIGNMENT_SCORES]
{
  "race": "Texas US Senate 2026",
  "scores": [
    {
      "candidate": "Jane Doe",
      "overall": 78,
      "issues": [
        {
          "issue": "Climate",
          "userPriority": "high",
          "score": 92,
          "rationale": "Co-sponsored 2025 Clean Air Act.",
          "sources": ["Congress.gov roll call 119-H-432"]
        }
      ]
    }
  ]
}
[/ALIGNMENT_SCORES]
`;

function sseStream(text: string): string {
  return `data: ${JSON.stringify({ type: "delta", text })}\n\ndata: ${JSON.stringify({ type: "done", budgetStatus: "ok" })}\n\n`;
}

async function submitZipAndWaitForResults(
  page: import("@playwright/test").Page,
) {
  await page.goto("/");
  await page.getByTestId("zip-input").fill("73301");
  await page.getByTestId("zip-submit").click();
  await page.waitForSelector('[data-testid="prompt-output"]', {
    timeout: 8000,
  });
}

test.describe("Phase 5: Chat CTA", () => {
  test("chat CTA button is visible after zip lookup", async ({ page }) => {
    await submitZipAndWaitForResults(page);
    await expect(page.getByTestId("chat-cta")).toBeVisible();
  });

  test("clicking chat CTA opens chat window", async ({ page }) => {
    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("chat-window")).toBeVisible();
  });

  test("chat window shows privacy notice before first message", async ({
    page,
  }) => {
    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("chat-privacy-notice")).toBeVisible();
  });
});

test.describe("Phase 5: Chat flow with mocked API", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the /api/chat endpoint with SSE response
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: sseStream("Hello! I'm here to help you research your ballot."),
      });
    });
  });

  test("user can send a message and receive a streaming response", async ({
    page,
  }) => {
    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();

    // Accept privacy notice
    await page.getByText("I understand — start chat").click();

    // Chat input and send should be visible
    await expect(page.getByTestId("chat-input")).toBeVisible();
    await expect(page.getByTestId("chat-send")).toBeVisible();

    // Send a message
    await page.getByTestId("chat-input").fill("Hello");
    await page.getByTestId("chat-send").click();

    // User message appears
    await expect(page.getByTestId("chat-message-user")).toBeVisible();

    // Assistant message appears
    await expect(page.getByTestId("chat-message-assistant")).toBeVisible();
  });

  test("conversation history displays multiple messages", async ({ page }) => {
    let callCount = 0;
    await page.route("/api/chat", async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: sseStream(`Response ${callCount}`),
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    // Send first message
    await page.getByTestId("chat-input").fill("First message");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("chat-message-assistant")).toBeVisible();

    // Send second message
    await page.getByTestId("chat-input").fill("Second message");
    await page.getByTestId("chat-send").click();

    // Both user messages should be visible
    await expect(page.getByTestId("chat-message-user")).toHaveCount(2);
  });

  test("budget warning notice appears when API reports warning status", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: `data: ${JSON.stringify({ type: "delta", text: "Hi there!" })}\n\ndata: ${JSON.stringify({ type: "done", budgetStatus: "warning" })}\n\n`,
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Hello");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("chat-budget-notice")).toBeVisible();
  });

  test("chat disabled when budget exhausted (503 response)", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "budget_exhausted" }),
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Hello");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("chat-disabled-message")).toBeVisible();
  });

  test("session limit message appears on 429 with session_limit reason", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "rate_limited",
          reason: "session_limit",
        }),
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Hello");
    await page.getByTestId("chat-send").click();

    // Session limit message should appear somewhere
    await expect(page.getByTestId("chat-message-assistant")).toBeVisible();
  });
});

test.describe("Phase 5: Chat produces ballot output", () => {
  test("download ballot button appears after ballot output in chat", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: sseStream(MOCK_BALLOT_RESPONSE),
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Show me my ballot");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("download-ballot-btn")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("ballot-preview")).toBeVisible();
  });

  test("alignment banner appears after alignment scores in chat", async ({
    page,
  }) => {
    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: sseStream(MOCK_ALIGNMENT_RESPONSE),
      });
    });

    await submitZipAndWaitForResults(page);
    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Score the candidates");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("alignment-banner-jane-doe")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByTestId("alignment-score-overall-jane-doe"),
    ).toContainText("78");
  });
});

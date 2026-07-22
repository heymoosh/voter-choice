// Congress-assessment experience — per-seat support chat.
//
// The seat chat is the "Ask anything about this seat" surface under the
// RepCard (center pane). Covers: send → streamed reply, blind-mode prompt
// hygiene (the request's systemPrompt must never carry the unrevealed
// member's real name), per-seat history isolation, block-code error banner +
// retry, and the budget gate routing to the continue-elsewhere modal.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect, type Page } from "@playwright/test";
import {
  mockDelegation,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
  mockChatBlocked,
  goToWorkspace,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

async function setupWorkspace(page: Page) {
  await mockDelegation(page);
  await mockSeatRaceData(page);
  await mockResearch(page);
  await mockPolis(page);
  await mockCounters(page);
  await goToWorkspace(page);
}

test.describe("seat chat — ask anything about this seat", () => {
  test("sends a question and streams the reply as plain text; the blind prompt never carries the member's name", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane chat assertions are desktop-only",
    );
    await setupWorkspace(page);

    // Capture the chat request the seat chat sends (the route is already
    // mocked by goToWorkspace's mockChat; we only observe here).
    const chatPosts: { systemPrompt?: string; activeRaceId?: string }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/chat") && req.method() === "POST") {
        chatPosts.push(req.postDataJSON());
      }
    });

    const chat = page.getByTestId("seat-chat");
    await expect(chat).toBeVisible();
    // Deterministic starter chips bind the voter's top issue.
    await expect(chat.locator(".chip").first()).toContainText(
      "lower insulin & drug prices",
    );

    await page
      .getByTestId("seat-chat-input")
      .fill("How do they vote on drug pricing?");
    await page.getByTestId("seat-chat-send").click();

    await expect(chat.locator(".msg.user .bubble")).toContainText(
      "How do they vote on drug pricing?",
    );
    await expect(chat.locator(".msg.ai .bubble")).toContainText(
      "(mocked reply)",
    );

    // Blind-mode prompt hygiene: the active seat (TX-37) is unrevealed, so the
    // grounding prompt must use the blind label, never "Alex Rivera".
    const seatPost = chatPosts.find((p) => p.activeRaceId === "house-TX-37");
    expect(seatPost).toBeTruthy();
    expect(seatPost!.systemPrompt).toContain("Your U.S. Representative");
    expect(seatPost!.systemPrompt).not.toContain("Alex Rivera");
    expect(seatPost!.systemPrompt).not.toContain("Rivera");
  });

  test("keeps chat history isolated per seat", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "scorecard seat navigation is desktop-only",
    );
    await setupWorkspace(page);

    await page.getByTestId("seat-chat-input").fill("Question for seat one");
    await page.getByTestId("seat-chat-send").click();
    await expect(
      page.getByTestId("seat-chat").locator(".msg.ai .bubble"),
    ).toContainText("(mocked reply)");

    // Switch to the senior senator's seat — fresh, empty log. v3 rail
    // removal: the overview is the only nav surface now, reached via
    // back-to-overview + a seat-card click.
    await page.getByTestId("back-to-overview").click();
    await page
      .locator('[data-testid="seat-card"]')
      .nth(1)
      .click({ timeout: 15000 });
    await expect(page.getByTestId("seat-chat").locator(".msg")).toHaveCount(0);

    // Back to the House seat — the conversation survives the switch.
    await page.getByTestId("back-to-overview").click();
    await page
      .locator('[data-testid="seat-card"]')
      .nth(0)
      .click({ timeout: 15000 });
    await expect(
      page.getByTestId("seat-chat").locator(".msg.user .bubble"),
    ).toContainText("Question for seat one");
  });

  test("shows the block-specific banner on a coded block and recovers via retry", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane chat assertions are desktop-only",
    );
    await setupWorkspace(page);
    await mockChatBlocked(page, { kind: "code", code: "SESSION_LIMIT" });

    await page.getByTestId("seat-chat-input").fill("Will this be blocked?");
    await page.getByTestId("seat-chat-send").click();

    const banner = page.locator(".msg.ai-error");
    await expect(banner).toContainText(
      "You've reached this session's message limit.",
    );

    // Service recovers (drop the block override) → Retry replays the turn.
    await page.unroute("**/api/chat");
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"type":"text","text":"(recovered reply)"}\n\ndata: {"type":"done"}\n\n',
      });
    });
    await banner.getByRole("button", { name: /try again/i }).click();
    await expect(
      page.getByTestId("seat-chat").locator(".msg.ai .bubble"),
    ).toContainText("(recovered reply)");
  });

  test("routes a budget block to the budget modal with the scorecard intact", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane chat assertions are desktop-only",
    );
    await setupWorkspace(page);
    await mockChatBlocked(page, { kind: "budget" });

    await page.getByTestId("seat-chat-input").fill("One more question");
    await page.getByTestId("seat-chat-send").click();

    // Budget gate → the budget modal (BYOK + continue elsewhere), no banner.
    const modal = page.getByTestId("budget-modal");
    await expect(modal).toContainText("The shared budget is used up");
    await expect(modal).toContainText("still safe on this device.");
    await expect(modal).toContainText("community AI budget");
    await expect(modal.getByTestId("byok-input")).toBeVisible();
    await expect(modal.getByTestId("handoff-actions")).toBeVisible();
    await expect(page.locator(".msg.ai-error")).toHaveCount(0);

    // The assessment is untouched behind the modal — still on the same
    // seat's deep view (v3 rail removal dropped the rail's own row count
    // as a "nothing navigated away" signal).
    await page.locator(".be-x").click();
    await expect(page.locator(".rep-card")).toBeVisible();
  });

  test("BYOK: save a key, retry the refused turn browser-direct to Anthropic", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane chat assertions are desktop-only",
    );
    await setupWorkspace(page);
    await mockChatBlocked(page, { kind: "budget" });

    // Intercept the browser-direct Anthropic call BEFORE the retry.
    const anthropicHeaders: Record<string, string>[] = [];
    await page.route("https://api.anthropic.com/v1/messages", async (route) => {
      anthropicHeaders.push(route.request().headers());
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"(byok reply)"}}\n\n' +
          'data: {"type":"message_stop"}\n\n',
      });
    });

    await page.getByTestId("seat-chat-input").fill("Needs my own key");
    await page.getByTestId("seat-chat-send").click();

    const modal = page.getByTestId("budget-modal");
    await modal.getByTestId("byok-input").fill("sk-ant-test-1234567890");
    await modal.getByTestId("byok-save").click();
    await modal.getByTestId("budget-retry-key").click();

    // The refused turn replays browser-direct with the key; the modal closes
    // and the reply streams into the same seat's log.
    await expect(
      page.getByTestId("seat-chat").locator(".msg.ai .bubble"),
    ).toContainText("(byok reply)");
    expect(anthropicHeaders[0]["x-api-key"]).toBe("sk-ant-test-1234567890");
    expect(
      anthropicHeaders[0]["anthropic-dangerous-direct-browser-access"],
    ).toBe("true");
  });

  test("soft budget tier shows the ribbon; See options opens the informational modal", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane chat assertions are desktop-only",
    );
    await setupWorkspace(page);
    // Successful SSE reply that carries the soft-tier headers.
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "X-Budget-Tier": "notice",
          "X-Budget-Percent": "74",
        },
        body: 'data: {"type":"text","text":"(tiered reply)"}\n\ndata: {"type":"done"}\n\n',
      });
    });

    await page.getByTestId("seat-chat-input").fill("Anything");
    await page.getByTestId("seat-chat-send").click();
    await expect(page.getByTestId("budget-ribbon")).toContainText(
      "Community AI budget is 70%+ used",
    );

    await page
      .getByTestId("budget-ribbon")
      .getByRole("button", { name: /see options/i })
      .click();
    const modal = page.getByTestId("budget-modal");
    await expect(modal).toContainText("running low");
    // Informational framing: nothing was refused, so no retry CTA.
    await expect(modal.getByTestId("budget-retry-key")).toHaveCount(0);
  });
});

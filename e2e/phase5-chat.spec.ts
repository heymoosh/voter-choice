import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

/**
 * Phase 5 e2e tests: LLM Chat Window, Downloadable Ballot, Voter Profile.
 *
 * Chat tests use the mock Anthropic API (ANTHROPIC_API_KEY=test).
 * The mock returns a deterministic response containing MY BALLOT and
 * MY VOTER PROFILE blocks.
 */

const TEXAS_ZIP = "73301";

// ---------------------------------------------------------------------------
// Chat CTA — appears after data loads
// ---------------------------------------------------------------------------

test.describe("Chat CTA", () => {
  test("chat CTA is present after valid zip submission", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    // Wait for state info to load
    await expect(page.getByTestId("state-info")).toBeVisible();
    // Chat CTA should now be visible
    await expect(page.getByTestId("chat-cta")).toBeVisible();
  });

  test("chat CTA is not visible before zip submission", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("chat-cta")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Chat window — open / privacy notice
// ---------------------------------------------------------------------------

test.describe("Chat window", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible();
    await page.getByTestId("chat-cta").click();
  });

  test("chat window opens when CTA is clicked", async ({ page }) => {
    await expect(page.getByTestId("chat-window")).toBeVisible();
  });

  test("privacy notice is visible before first message", async ({ page }) => {
    await expect(page.getByTestId("chat-privacy-notice")).toBeVisible();
  });

  test("chat input and send button are visible", async ({ page }) => {
    await expect(page.getByTestId("chat-input")).toBeVisible();
    await expect(page.getByTestId("chat-send")).toBeVisible();
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await expect(page.getByTestId("chat-send")).toBeDisabled();
  });

  test("send button is enabled when input has text", async ({ page }) => {
    await page.getByTestId("chat-input").fill("Hello");
    await expect(page.getByTestId("chat-send")).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// Chat flow — send message and receive streaming response
// ---------------------------------------------------------------------------

test.describe("Chat flow with mock API", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(20000);
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("chat-cta").click();
    await expect(page.getByTestId("chat-window")).toBeVisible();
  });

  test("sending a message shows user message bubble", async ({ page }) => {
    await page.getByTestId("chat-input").fill("What are the key races?");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("chat-message-user").first()).toBeVisible();
    await expect(page.getByTestId("chat-message-user").first()).toContainText(
      "What are the key races?",
    );
  });

  test("assistant response appears after sending message", async ({ page }) => {
    await page.getByTestId("chat-input").fill("What are the key races?");
    await page.getByTestId("chat-send").click();
    // Wait for assistant message to appear and streaming to complete
    await expect(
      page.getByTestId("chat-message-assistant").first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId("chat-message-assistant").first(),
    ).not.toBeEmpty();
  });

  test("download ballot button appears after mock response", async ({
    page,
  }) => {
    await page.getByTestId("chat-input").fill("Help me research my ballot");
    await page.getByTestId("chat-send").click();
    // The mock response includes MY BALLOT block, so download button should appear
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible({
      timeout: 18000,
    });
  });

  test("ballot preview is shown after mock chat completes", async ({ page }) => {
    await page.getByTestId("chat-input").fill("Help me research my ballot");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("ballot-preview")).toBeVisible({
      timeout: 18000,
    });
  });

  test("download profile button appears after mock response", async ({
    page,
  }) => {
    await page.getByTestId("chat-input").fill("Help me research my ballot");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("download-profile-btn")).toBeVisible({
      timeout: 18000,
    });
  });
});

// ---------------------------------------------------------------------------
// Path B: Ballot paste input
// ---------------------------------------------------------------------------

test.describe("Ballot paste flow (Path B)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible();
  });

  test("ballot paste input is visible", async ({ page }) => {
    await expect(page.getByTestId("ballot-paste-input")).toBeVisible();
  });

  test("pasting valid ballot text shows ballot preview", async ({ page }) => {
    const ballotText = `MY BALLOT — Travis County — 2026 General Election — November 3, 2026
U.S. Senate: Jane Doe
U.S. House District 10: John Smith
Propositions:
Prop 1: YES`;

    await page.getByTestId("ballot-paste-input").fill(ballotText);
    await page.getByTestId("ballot-parse-btn").click();

    await expect(page.getByTestId("ballot-preview")).toBeVisible();
    await expect(page.getByTestId("ballot-preview")).toContainText("Jane Doe");
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible();
  });

  test("pasting invalid text shows error and manual entry button", async ({
    page,
  }) => {
    await page.getByTestId("ballot-paste-input").fill("This is not a ballot");
    await page.getByTestId("ballot-parse-btn").click();
    // Should show parse error notice
    await expect(
      page.locator(".notice-error").filter({ hasText: /format|ballot/i }),
    ).toBeVisible();
    // Manual entry button should appear
    await expect(
      page.locator("button").filter({ hasText: /manually|manual/i }),
    ).toBeVisible();
  });

  test("manual entry form appears when triggered", async ({ page }) => {
    await page.getByTestId("ballot-paste-input").fill("not a ballot");
    await page.getByTestId("ballot-parse-btn").click();
    // Click the manual entry button
    await page.locator("button").filter({ hasText: /manually|manual/i }).click();
    await expect(page.getByTestId("ballot-manual-entry")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Voter profile upload
// ---------------------------------------------------------------------------

test.describe("Voter profile upload", () => {
  test("upload profile input is visible on page load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("upload-profile-input")).toBeVisible();
  });

  test("uploading a valid .txt profile shows confirmation", async ({ page }) => {
    await page.goto("/");

    // Create a temporary profile file
    const tmpDir = os.tmpdir();
    const profilePath = path.join(tmpDir, "test-voter-profile.txt");
    fs.writeFileSync(
      profilePath,
      `=== MY VOTER PROFILE — 2026-01-01 ===

LOCATION: Austin, TX 78701

WHAT I CARE ABOUT:
- Climate and environment
- Healthcare access

HOW I MAKE DECISIONS:
- Track record over promises

=== END VOTER PROFILE ===`,
    );

    await page.getByTestId("upload-profile-input").setInputFiles(profilePath);
    await expect(page.getByTestId("profile-confirmation")).toBeVisible();

    fs.unlinkSync(profilePath);
  });

  test("uploading a non-.txt file shows error", async ({ page }) => {
    await page.goto("/");

    const tmpDir = os.tmpdir();
    const pdfPath = path.join(tmpDir, "test.pdf");
    fs.writeFileSync(pdfPath, "fake pdf content");

    await page.getByTestId("upload-profile-input").setInputFiles(pdfPath);
    await expect(page.locator(".notice-error")).toBeVisible();

    fs.unlinkSync(pdfPath);
  });

  test("uploading a file > 10KB shows size error", async ({ page }) => {
    await page.goto("/");

    const tmpDir = os.tmpdir();
    const bigPath = path.join(tmpDir, "big-profile.txt");
    // Create a file just over 10KB
    fs.writeFileSync(bigPath, "x".repeat(10241));

    await page.getByTestId("upload-profile-input").setInputFiles(bigPath);
    await expect(page.locator(".notice-error")).toBeVisible();

    fs.unlinkSync(bigPath);
  });
});

// ---------------------------------------------------------------------------
// Alignment banners
// ---------------------------------------------------------------------------

test.describe("Alignment banners", () => {
  test("alignment banners appear after mock chat response", async ({ page }) => {
    page.setDefaultTimeout(25000);
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("chat-cta").click();
    await page.getByTestId("chat-input").fill("Score the candidates");
    await page.getByTestId("chat-send").click();

    // Wait for alignment banners from mock response
    await expect(
      page.locator("[data-testid^='alignment-banner-']").first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test("expanding alignment banner shows drill-down", async ({ page }) => {
    page.setDefaultTimeout(25000);
    await page.goto("/");
    await page.getByTestId("zip-input").fill(TEXAS_ZIP);
    await page.getByTestId("zip-submit").click();
    await expect(page.getByTestId("state-info")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("chat-cta").click();
    await page.getByTestId("chat-input").fill("Score the candidates");
    await page.getByTestId("chat-send").click();

    // Wait for banner and click expand
    const banner = page.locator("[data-testid^='alignment-banner-']").first();
    await expect(banner).toBeVisible({ timeout: 20000 });

    const expandBtn = banner
      .locator("button")
      .filter({ hasText: /expand|breakdown/i });
    await expandBtn.click();

    // Drill-down should appear
    await expect(
      page.locator("[data-testid^='alignment-drill-down-']").first(),
    ).toBeVisible();
  });
});

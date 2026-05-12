import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * Phase 5: Voter Profile upload/download tests.
 */

// Create temp test files
function createTempFile(content: string, filename: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

const VALID_PROFILE_CONTENT = `=== MY VOTER PROFILE — 2026-01-15 ===

LOCATION: Austin, TX, 73301

WHAT I CARE ABOUT:
- Environment (high priority)
- Healthcare (high priority)
- Education (medium priority)

HOW I MAKE DECISIONS:
- Look at voting records over promises
- Prioritize local impact

WHAT AFFECTS ME PERSONALLY:
- Renter in urban area
- Work in tech sector

MY VOTING HISTORY WITH THIS TOOL:
- 2024 General: Voted for environmental candidates

NOTES:
- Always verify candidate claims

=== END VOTER PROFILE ===`;

const LARGE_PROFILE_CONTENT = "x".repeat(10 * 1024 + 1); // over 10KB

test.describe("Phase 5: Voter Profile upload", () => {
  test("upload profile input is visible on page load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("upload-profile-input")).toBeVisible();
  });

  test("uploading valid .txt profile shows confirmation", async ({ page }) => {
    const filePath = createTempFile(VALID_PROFILE_CONTENT, "voter-profile.txt");

    await page.goto("/");
    await page.getByTestId("upload-profile-input").setInputFiles(filePath);

    await expect(page.getByTestId("profile-confirmation")).toBeVisible({
      timeout: 3000,
    });

    fs.unlinkSync(filePath);
  });

  test("profile confirmation shows date when present in profile", async ({
    page,
  }) => {
    const filePath = createTempFile(
      VALID_PROFILE_CONTENT,
      "voter-profile-dated.txt",
    );

    await page.goto("/");
    await page.getByTestId("upload-profile-input").setInputFiles(filePath);

    await expect(page.getByTestId("profile-confirmation")).toContainText(
      "2026-01-15",
    );

    fs.unlinkSync(filePath);
  });

  test("uploading file over 10KB shows error message", async ({ page }) => {
    const filePath = createTempFile(LARGE_PROFILE_CONTENT, "large-profile.txt");

    await page.goto("/");
    await page.getByTestId("upload-profile-input").setInputFiles(filePath);

    // Error message should appear
    await expect(page.getByTestId("profile-upload-error")).toBeVisible({
      timeout: 3000,
    });

    fs.unlinkSync(filePath);
  });
});

test.describe("Phase 5: Voter Profile with chat integration", () => {
  test("uploaded profile is visible in confirmation after upload", async ({
    page,
  }) => {
    const filePath = createTempFile(
      VALID_PROFILE_CONTENT,
      "voter-profile-chat.txt",
    );

    await page.goto("/");
    await page.getByTestId("upload-profile-input").setInputFiles(filePath);
    await expect(page.getByTestId("profile-confirmation")).toBeVisible({
      timeout: 3000,
    });

    fs.unlinkSync(filePath);
  });
});

test.describe("Phase 5: Voter Profile download", () => {
  test("download profile button appears in chat after profile output", async ({
    page,
  }) => {
    const profileOutput = `=== MY VOTER PROFILE — 2026-05-12 ===

LOCATION: Travis County, TX

WHAT I CARE ABOUT:
- Climate change

=== END VOTER PROFILE ===`;

    await page.route("/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: `data: ${JSON.stringify({ type: "delta", text: profileOutput })}\n\ndata: ${JSON.stringify({ type: "done", budgetStatus: "ok" })}\n\n`,
      });
    });

    await page.goto("/");
    await page.getByTestId("zip-input").fill("73301");
    await page.getByTestId("zip-submit").click();
    await page.waitForSelector('[data-testid="prompt-output"]', {
      timeout: 8000,
    });

    await page.getByTestId("chat-cta").click();
    await page.getByText("I understand — start chat").click();

    await page.getByTestId("chat-input").fill("Give me my voter profile");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("download-profile-btn")).toBeVisible({
      timeout: 5000,
    });
  });
});

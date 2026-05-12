import { test, expect } from "@playwright/test";

/**
 * Phase 5: Ballot Builder (copy-paste path) tests.
 */

const VALID_BALLOT_TEXT = `
MY BALLOT — Travis County — Texas General Election — November 3, 2026

US Senate: Jane Doe
Governor: John Smith
Proposition 1: YES
Proposition 2: NO

REMINDER: Texas law prohibits wireless devices in the voting room.

Generated with VoterChoice
This document is your personal notes, not an official ballot.
`;

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

test.describe("Phase 5: Ballot Builder — paste flow", () => {
  test("ballot-paste-input text area is visible after results load", async ({
    page,
  }) => {
    await submitZipAndWaitForResults(page);
    await expect(page.getByTestId("ballot-paste-input")).toBeVisible();
  });

  test("pasting valid ballot text shows ballot preview", async ({ page }) => {
    await submitZipAndWaitForResults(page);
    await page.getByTestId("ballot-paste-input").fill(VALID_BALLOT_TEXT);
    await page
      .getByRole("button", {
        name: /Build My Ballot|Crear Mi Boleta|Tạo Phiếu|生成我的|إنشاء/i,
      })
      .first()
      .click();

    await expect(page.getByTestId("ballot-preview")).toBeVisible();
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible();
  });

  test("pasting invalid text shows error and manual entry fallback", async ({
    page,
  }) => {
    await submitZipAndWaitForResults(page);
    await page
      .getByTestId("ballot-paste-input")
      .fill("This is not a ballot at all, just random text.");
    await page
      .getByRole("button", {
        name: /Build My Ballot|Crear Mi Boleta|Tạo Phiếu|生成我的|إنشاء/i,
      })
      .first()
      .click();

    await expect(page.getByTestId("ballot-manual-entry")).toBeVisible();
  });
});

test.describe("Phase 5: Ballot Builder — manual entry fallback", () => {
  test("manual entry form accepts race/choice pairs and generates ballot", async ({
    page,
  }) => {
    await submitZipAndWaitForResults(page);

    // Force manual entry by pasting invalid text
    await page.getByTestId("ballot-paste-input").fill("invalid content");
    await page
      .getByRole("button", {
        name: /Build My Ballot|Crear Mi Boleta|Tạo Phiếu|生成我的|إنشاء/i,
      })
      .first()
      .click();

    await expect(page.getByTestId("ballot-manual-entry")).toBeVisible();

    // Fill manual entry
    const raceInputs = page.locator(
      '[data-testid="ballot-manual-entry"] input[placeholder*="Senate"]',
    );
    const firstRaceInput = page
      .locator('[data-testid="ballot-manual-entry"] input')
      .first();
    const firstChoiceInput = page
      .locator('[data-testid="ballot-manual-entry"] input')
      .nth(1);

    await firstRaceInput.fill("US Senate");
    await firstChoiceInput.fill("Jane Doe");

    // Build ballot from manual entry
    const buildBtn = page
      .locator('[data-testid="ballot-manual-entry"] button')
      .filter({ hasText: /Build|Crear|Tạo|生成|إنشاء/i });
    await buildBtn.click();

    await expect(page.getByTestId("ballot-preview")).toBeVisible();
    await expect(page.getByTestId("download-ballot-btn")).toBeVisible();
  });
});

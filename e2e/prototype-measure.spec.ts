// Ballot-measure body text for the SHIPPED prototype. measureBody is only populated by the
// /api/extract-ballot path, so this drives the upload flow: address → (civic empty) →
// "sample ballot needed" → upload a file (extraction mocked) → cold-open → workspace →
// the measure renders its verbatim body text (PropositionCard measureBody branch).
import { test, expect } from "@playwright/test";

// Legacy ballot experience — only rendered when the build sets
// NEXT_PUBLIC_BALLOT_ENABLED=true (the congress-assessment experience is the
// default). The e2e-ballot-legacy CI leg builds with the flag.
test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED !== "true",
  "legacy specs need the ballot-experience build (flag=true)",
);

import {
  mockChat,
  mockRaceData,
  mockCivicEmpty,
  mockExtractBallot,
  completeColdOpenAndLock,
  EXTRACTION_WITH_MEASURE,
  MEASURE_BODY_TEXT,
} from "./helpers/prototype-mocks";

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "prototype e2e is desktop-only for now",
  );
});

test("ballot measure renders its verbatim body text", async ({ page }) => {
  await mockChat(page);
  await mockRaceData(page, {}); // measure has no candidates → no race-data fetch
  await mockCivicEmpty(page);
  await mockExtractBallot(page, EXTRACTION_WITH_MEASURE);

  await page.goto("/");
  await page
    .getByPlaceholder(/1600 Pennsylvania/i)
    .fill("50 Park Pl, Newark, NJ 07102");
  await page.getByRole("button", { name: /Pull my representatives/i }).click();

  // Civic returned no contests → the upload/paste screen.
  await page
    .getByTestId("ballot-lookup-needed")
    .waitFor({ state: "visible", timeout: 30000 });

  // Upload a (dummy) file — extraction is mocked, so the bytes don't matter.
  await page.locator('input[type="file"]').setInputFiles({
    name: "sample-ballot.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("sample ballot"),
  });

  // Upload → extraction → cold-open theme step → lock → workspace.
  await completeColdOpenAndLock(page);

  const measure = page.getByTestId("measure-body");
  await expect(measure).toBeVisible({ timeout: 30000 });
  await expect(measure).toContainText(MEASURE_BODY_TEXT.slice(0, 40));
});

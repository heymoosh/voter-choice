// Judicial-retention rendering for the SHIPPED prototype: a retention question must render
// as a name-visible Yes/No card (PropositionCard's Judicial Retention branch).
import { test, expect } from "@playwright/test";
import { mockChat, mockCivic, mockRaceData, gotoWorkspace, JUDICIAL_ONLY_CONTESTS } from "./helpers/prototype-mocks";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "prototype e2e is desktop-only for now");
});

test("judicial retention renders name-visible Yes/No", async ({ page }) => {
  await mockChat(page);
  await mockRaceData(page, {}); // no candidate races
  await mockCivic(page, JUDICIAL_ONLY_CONTESTS);

  await gotoWorkspace(page, "judicial-retention");

  const card = page.getByTestId("judicial-retention");
  await expect(card).toBeVisible();
  // The judge's name is visible (retention questions are never blinded).
  await expect(card).toContainText(/Jane Doe/i);
  // Yes / No choices are present.
  await expect(card.getByRole("button", { name: /^☑?\s*Yes$/i })).toBeVisible();
  await expect(card.getByRole("button", { name: /^☑?\s*No$/i })).toBeVisible();
});

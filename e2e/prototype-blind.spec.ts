// Blind mode for the SHIPPED prototype: candidates render anonymized ("Candidate A") by
// default; Reveal shows the real name; Hide re-blinds. Decide-on-the-record is a core promise.
import { test, expect } from "@playwright/test";

// Legacy ballot experience — only rendered when the build sets
// NEXT_PUBLIC_BALLOT_ENABLED=true (the congress-assessment experience is the
// default). The e2e-ballot-legacy CI leg builds with the flag.
test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED !== "true",
  "legacy specs need the ballot-experience build (flag=true)",
);

import { installCoreMocks, gotoWorkspace } from "./helpers/prototype-mocks";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "prototype e2e is desktop-only for now",
  );
  await installCoreMocks(page);
});

test("blind mode: anonymized by default, reveal ↔ hide round-trip", async ({
  page,
}) => {
  await gotoWorkspace(page);

  const firstCard = page.getByTestId("candidate-card").first();
  await expect(firstCard).toBeVisible();

  // Default blinded: the alias shows, the real name does not.
  await expect(firstCard).toContainText(/Candidate A/i);
  await expect(firstCard).not.toContainText(/Cory Booker/i);

  // Reveal → real name appears.
  await firstCard.getByRole("button", { name: /Reveal/i }).click();
  await expect(firstCard).toContainText(/Booker/i);

  // Hide → re-blinded.
  await firstCard.getByRole("button", { name: /Hide/i }).click();
  await expect(firstCard).toContainText(/Candidate A/i);
  await expect(firstCard).not.toContainText(/Cory Booker/i);
});

// Core e2e for the SHIPPED prototype (src/prototype/VoterChoiceApp.tsx, rendered by src/app/page.tsx).
//
// Drives the real app with mocked data seams and asserts the critical path plus the
// launch-acceptance behaviors: voting-record alignment, funding summary, funding-honesty
// fallback, and the candidate_data web-research fallback. Judicial retention, measure body,
// and blind mode live in sibling prototype-*.spec.ts files.
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
  // Desktop-only for now: the mobile workspace uses a different (tabbed) pane layout —
  // mobile e2e is a tracked follow-up. Mobile parity was manually verified (2026-06-06).
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "prototype e2e is desktop-only for now",
  );
  await installCoreMocks(page);
});

test.describe("prototype — core workspace", () => {
  test("critical path: address → ballot → themes → workspace → pick → print enabled", async ({
    page,
  }) => {
    await gotoWorkspace(page);

    // Workspace mounted with candidate cards (Booker + Bashaw).
    const cards = page.getByTestId("candidate-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(2);

    // Print is gated until at least one decision is made.
    const printBtn = page.getByRole("button", { name: /Print my ballot/i });
    await expect(printBtn).toBeDisabled();

    // Pick the first candidate → card flips to "Picked", print enables.
    await page.getByTestId("pick-candidate").first().click();
    await expect(
      page.getByRole("button", { name: /Picked — undo/i }),
    ).toBeVisible();
    await expect(printBtn).toBeEnabled();
  });

  test("voting-record alignment renders (Aligned on 11 of 18 → 61%)", async ({
    page,
  }) => {
    await gotoWorkspace(page);
    const row = page.getByTestId("voting-record-alignment-row").first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Aligned on\s*11\s*of\s*18\s*votes/i);
    await expect(row).toContainText("61");
  });

  test("funding summary renders real money trail ($13.6M · 60% small donors)", async ({
    page,
  }) => {
    await gotoWorkspace(page);
    const funding = page.getByTestId("funding-summary").first();
    await expect(funding).toBeVisible();
    await expect(funding).toContainText(/\$13\.6M/);
    await expect(funding).toContainText(/60% small donors/i);
  });

  test("funding honesty fallback shows 'Sector breakdown not available' for a no-data candidate", async ({
    page,
  }) => {
    await gotoWorkspace(page);
    const unavailable = page.getByTestId("funding-unavailable");
    await expect(unavailable).toBeVisible();
    await expect(unavailable).toContainText(/Sector breakdown not available/i);
  });

  test("candidate_data web-research fallback renders for a no-record candidate", async ({
    page,
  }) => {
    await gotoWorkspace(page);
    // Bashaw has no voting record → the app fires /api/research-candidate and renders the
    // web-search banner ("Based on public statements — not a voting record").
    const banner = page.getByTestId("web-search-alignment-banner");
    await expect(banner).toBeVisible({ timeout: 30000 });
    await expect(banner).toContainText(/public statements/i);
    await expect(
      page.getByTestId("web-search-alignment-row").first(),
    ).toBeVisible();
  });
});

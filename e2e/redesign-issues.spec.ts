// Congress-assessment experience — conversational issue intake + edit loop.
//
// Covers: multi-turn intake (extract → refine → lock), the edit-issues modal
// (same loop seeded with locked issues → Apply & re-score with verdicts
// preserved + delta banner), and budget-gate preservation mid-conversation.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect, type Page } from "@playwright/test";
import {
  mockDelegation,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
  mockChat,
  mockChatBlocked,
  goToWorkspace,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

async function installDataMocks(page: Page) {
  await mockDelegation(page);
  await mockSeatRaceData(page);
  await mockResearch(page);
  await mockPolis(page);
  await mockCounters(page);
}

/** Drive home → cold-open up to the extracted themes card (not locked). */
async function goToIntakeReview(page: Page) {
  await mockChat(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page
    .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
    .fill("1100 Congress Ave, Austin, TX 78701");
  await page.getByRole("button", { name: "Pull my representatives →" }).click();
  await page.getByTestId("issue-convo-input").waitFor({ timeout: 15000 });
  await page
    .getByTestId("issue-convo-input")
    .fill("Insulin prices are insane and rent went up again.");
  await page.getByTestId("issue-convo-send").click();
  await page.getByTestId("issue-themes-card").waitFor({ timeout: 15000 });
}

test.describe("conversational issue intake", () => {
  test("extracts starter themes, refines them in conversation, then locks into the workspace", async ({
    page,
  }) => {
    await installDataMocks(page);
    await goToIntakeReview(page);

    // Turn 1: two extracted themes.
    await expect(
      page.getByTestId("issue-themes-card").locator(".theme-row"),
    ).toHaveCount(2);

    // Turn 2: the voter gives more context; the refinement turn replies with
    // prose AND an updated list (the fence never renders to the user).
    await page
      .getByTestId("issue-convo-input")
      .fill("I also hate that Congress can trade stocks.");
    await page.getByTestId("issue-convo-send").click();
    await expect(page.locator(".issue-convo .msg.ai").last()).toContainText(
      "added congressional stock trading",
    );
    await expect(page.locator(".issue-convo .msg.ai").last()).not.toContainText(
      "```",
    );
    await expect(
      page.getByTestId("issue-themes-card").locator(".theme-row"),
    ).toHaveCount(3);

    // Lock → IntakeLocked pre-lock confirm screen → guided orientation
    // interstitial → workspace, with all three issues on the rail.
    await page.getByTestId("issue-primary").click();
    await page
      .getByTestId("issue-locked-confirm-btn")
      .click({ timeout: 15000 });
    await page.getByTestId("orientation-continue").click({ timeout: 15000 });
    await page.locator(".b-row").first().waitFor({ timeout: 20000 });
    await expect(page.locator(".ws-ballot .b-issues-list li")).toHaveCount(3);
  });

  test("a budget block mid-intake preserves the conversation and opens the budget modal", async ({
    page,
  }) => {
    await installDataMocks(page);
    await goToIntakeReview(page);
    await mockChatBlocked(page, { kind: "budget" });

    await page
      .getByTestId("issue-convo-input")
      .fill("And one more thing about schools");
    await page.getByTestId("issue-convo-send").click();

    const budgetModal = page.getByTestId("budget-modal");
    await expect(budgetModal).toContainText("The shared budget is used up");
    await expect(budgetModal).toContainText("still safe on this device.");
    // The working list survives; the refused message is back in the composer.
    await page.locator(".be-x").click();
    await expect(
      page.getByTestId("issue-themes-card").locator(".theme-row"),
    ).toHaveCount(2);
    await expect(page.getByTestId("issue-convo-input")).toHaveValue(
      "And one more thing about schools",
    );
  });
});

test.describe("edit issues from the workspace", () => {
  test("scorecard Edit button is reachable on mobile and tablet (no rail)", async ({
    page,
  }, testInfo) => {
    // The desktop left rail (ws-rail) is hidden at ≤1023px, so the only
    // edit-issues affordance at tablet/mobile is the Edit button inside
    // ws-ballot (.b-issues-edit, shown by CSS at ≤1023px).
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "this test targets the mobile/tablet edit path; desktop uses the rail",
    );
    await installDataMocks(page);
    await goToWorkspace(page);

    // ws-ballot is the primary surface on mobile; b-issues-edit sits right
    // below the scorecard header so it's immediately visible without scrolling.
    const editBtn = page.getByTestId("edit-issues-scorecard");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal should open and show the two seeded issues.
    const modal = page.getByTestId("edit-issues-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".theme-row")).toHaveCount(2);

    // Dismiss to confirm close works cleanly.
    await modal
      .getByRole("button", { name: "Cancel — keep my current issues" })
      .click();
    await expect(modal).not.toBeVisible();
  });

  // Re-check at a tablet viewport (768–1023px: rail hidden, ballot + chat visible).
  // Playwright has no built-in tablet project, so we set the viewport inline.
  test("scorecard Edit button is reachable at tablet viewport (768px)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "tablet viewport test runs on the desktop project (viewport overridden inline)",
    );
    await page.setViewportSize({ width: 900, height: 768 });
    await installDataMocks(page);
    await goToWorkspace(page);

    // At 768-1023px prototype.css hides ws-rail. The ballot stays visible
    // (340px right column) and b-issues-edit shows via @media (max-width:1023px).
    const editBtn = page.getByTestId("edit-issues-scorecard");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const modal = page.getByTestId("edit-issues-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".theme-row")).toHaveCount(2);
  });

  test("conversational edit → Apply & re-score keeps verdicts and shows the delta banner", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "scorecard edit + verdict flow is desktop-only",
    );
    await installDataMocks(page);
    await goToWorkspace(page);

    // Verdict the first seat so we can prove verdicts survive the re-score.
    await page.getByRole("button", { name: /Worth keeping/ }).click();
    await page.waitForTimeout(900);
    await expect(page.locator(".ws-ballot")).toContainText("1/3");

    // EDIT now lives only in the right scorecard pane ([P1] removed the left
    // rail that previously carried the desktop Edit control).
    await page.getByTestId("edit-issues-scorecard").click();
    const modal = page.getByTestId("edit-issues-modal");
    await expect(modal).toContainText("verdicts you've already made are kept");
    // Seeded with the locked issues.
    await expect(modal.locator(".theme-row")).toHaveCount(2);

    // Converse: the refinement turn adds the third theme.
    await modal
      .getByTestId("issue-convo-input")
      .fill("Add congressional stock trading too.");
    await modal.getByTestId("issue-convo-send").click();
    await expect(modal.locator(".theme-row")).toHaveCount(3);

    // Apply → deterministic re-score (analyzing interstitial) → workspace.
    await modal.getByTestId("issue-primary").click();
    await page.locator(".b-row").first().waitFor({ timeout: 20000 });

    // Verdict survived; the rail now carries three issues; the delta banner
    // reports honestly (mock data scores identically → nothing significant).
    await expect(page.locator(".ws-ballot")).toContainText("1/3");
    await expect(page.locator(".verdict-chip").first()).toBeVisible();
    await expect(page.locator(".ws-ballot .b-issues-list li")).toHaveCount(3);
    await expect(page.getByTestId("issue-delta-banner")).toContainText(
      "your verdicts stand",
    );
    // Dismiss clears it.
    await page
      .getByTestId("issue-delta-banner")
      .getByRole("button", { name: "Dismiss" })
      .click();
    await expect(page.getByTestId("issue-delta-banner")).toHaveCount(0);
  });
});

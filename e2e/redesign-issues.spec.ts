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
    .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
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
    // interstitial → workspace, with all three issues scored against.
    await page.getByTestId("issue-primary").click();
    await page
      .getByTestId("issue-locked-confirm-btn")
      .click({ timeout: 15000 });
    await page.getByTestId("orientation-continue").click({ timeout: 15000 });
    // Workspace now lands on the delegation overview (one card per seat)
    // first; click into the first seat to reach its deep view.
    await page
      .locator('[data-testid="seat-card"]')
      .first()
      .click({ timeout: 15000 });
    await page.locator(".rep-card").first().waitFor({ timeout: 20000 });
    // v3 rail removal: the issue count now surfaces in the alignment
    // section's fine print, not a right-rail issues list.
    await expect(page.locator(".al-edit")).toContainText("3 ranked issues");
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
  // v3 rail removal (2026-07-21): there's no right rail at any breakpoint
  // anymore, so the old per-viewport "which edit affordance is visible at
  // this width" split no longer applies — the seat page renders identically
  // everywhere. §3b's two entry points replace it instead: a quiet
  // fine-print link under the alignment score (contextual, provoked by the
  // score itself) and an always-available fallback in Settings.
  test("the alignment fine-print 'Edit your issues' link opens the edit-issues modal", async ({
    page,
  }) => {
    await installDataMocks(page);
    await goToWorkspace(page);

    const editLink = page.getByTestId("edit-issues-alignment");
    await expect(editLink).toBeVisible();
    await editLink.click();

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

  test("the Settings panel's Edit-issues row opens the same modal (always-available fallback)", async ({
    page,
  }) => {
    await installDataMocks(page);
    await goToWorkspace(page);

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByTestId("edit-issues-settings").click();

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
    // Let the verdict commit (commitVerdict defers auto-advance ~600ms; v3
    // rail removal means the deep view now moves to the next undecided seat
    // in place, with no persistent sidebar to read an aggregate count from).
    await page.waitForTimeout(900);
    await page.locator(".rep-card").first().waitFor({ timeout: 15000 });
    // Confirm the decided count via the overview (§3b: the aggregate count
    // now lives only there, not on a rail). senate-TX-b isn't on the 2026
    // ballot, so the decided-count denominator is the 2 decidable seats
    // only (Muxin, 2026-07-12: not-up seats are reviewable, never
    // decidable — they never sit in this count).
    await page.getByTestId("back-to-overview").click();
    await expect(page.locator(".dg-prog .mlab")).toContainText("1 of 2");
    await page
      .locator('[data-testid="seat-card"]')
      .first()
      .click({ timeout: 15000 });
    await page.locator(".rep-card").first().waitFor({ timeout: 15000 });

    // v3 §3b: the alignment fine-print link is the primary edit-issues entry.
    await page.getByTestId("edit-issues-alignment").click();
    const modal = page.getByTestId("edit-issues-modal");
    // Canvas-verbatim lede (screens-intake.jsx EditIssues, ported in 93801957).
    await expect(modal).toContainText("Your verdicts are kept");
    // Seeded with the locked issues.
    await expect(modal.locator(".theme-row")).toHaveCount(2);

    // Converse: the refinement turn adds the third theme.
    await modal
      .getByTestId("issue-convo-input")
      .fill("Add congressional stock trading too.");
    await modal.getByTestId("issue-convo-send").click();
    await expect(modal.locator(".theme-row")).toHaveCount(3);

    // Apply → deterministic re-score (analyzing interstitial) → workspace,
    // landing back on the same seat that was active when the modal opened
    // (re-scoring doesn't change which seat is focused).
    await modal.getByTestId("issue-primary").click();
    await page.locator(".rep-card").first().waitFor({ timeout: 20000 });

    // Verdict survived the re-score — checked directly on this seat's own
    // verdict button (a more precise check than the old rail text-content
    // read, which only proved the aggregate count, not which seat). The
    // alignment fine print now scores against three issues; the delta
    // banner reports honestly (mock data scores identically → nothing
    // significant).
    await expect(
      page.getByRole("button", { name: /Worth keeping — undo/ }),
    ).toBeVisible();
    await expect(page.locator(".al-edit")).toContainText("3 ranked issues");
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

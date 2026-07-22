// Congress-assessment experience — head-to-head candidate duel.
//
// "Time to replace" on a seat WITH 2026 challengers opens the full-screen
// duel (incumbent vs. one challenger, challenger switcher, per-issue Δ ledger,
// Keep / Replace at the foot). Replace records the verdict AND the chosen
// successor, which rides to the scorecard. Faithful to the design's DIRECTION
// B (claude-code-handoff/design-session/screens-candidates.jsx).
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect } from "@playwright/test";
import {
  mockDelegationWithChallengers,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
  goToWorkspace,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

test.describe("head-to-head candidate duel", () => {
  test("Time to replace opens the duel; switcher + Δ ledger + Replace record the pick", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "duel reached from the per-seat card — desktop-only overlay flow",
    );
    await mockDelegationWithChallengers(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // The House seat is active first. Its "Time to replace" CTA now leads into
    // the duel (the seat has challengers), not an inline verdict toggle.
    const cta = page.getByTestId("open-duel");
    await expect(cta).toContainText("Time to replace");
    await cta.click();

    // Full-screen duel: incumbent column + challenger column + the switcher.
    const cmp = page.locator(".cmp");
    await expect(cmp).toBeVisible();
    await expect(cmp.locator(".cmp-col.inc")).toContainText(
      "The record you have",
    );
    await expect(cmp.locator(".cmp-col.ch")).toContainText(
      "Running to replace them",
    );

    // Incumbent overall is the roll-call score (5/6 = 83%).
    await expect(cmp.locator(".cmp-col.inc .cmp-big b")).toHaveText("83%");

    // Switcher carries the real challengers (ranked by funds raised).
    const switcher = cmp.locator(".cmp-switch");
    await expect(switcher).toContainText("Reyes");
    await expect(switcher).toContainText("Whitfield");

    // Δ ledger: the user's issue rows render with the incumbent column value.
    const ledger = cmp.locator(".cmp-ledger");
    await expect(ledger).toContainText("Lower insulin & drug prices");
    // Challenger research (web_search, in_favor → directional 80%) settles.
    await expect(cmp.locator(".cmp-col.ch .cmp-big b")).toHaveText("80%", {
      timeout: 10000,
    });
    // The honest-provenance note marks the challenger figures as researched.
    await expect(ledger).toContainText("directional read");

    // Switch to the second challenger — the challenger column updates.
    await switcher.getByRole("tab", { name: /Whitfield/ }).click();
    await expect(cmp.locator(".cmp-col.ch .cmp-cname")).toContainText(
      "Sam Whitfield",
    );

    // Switch back to Reyes and Replace — records the verdict + successor.
    await switcher.getByRole("tab", { name: /Reyes/ }).click();
    await cmp.getByRole("button", { name: /Replace with Reyes/ }).click();

    // Back on the seat's own deep view (closing the duel doesn't navigate
    // away): the verdict button itself now names the successor — the
    // answer to "what happens when you replace?" (v3 rail removal dropped
    // the rail's own .verdict-chip/.pick-successor readout).
    await expect(page.locator(".rep-card")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Replacing with Elena Reyes/ }),
    ).toBeVisible();
  });

  test("Keep at the foot records a keep verdict and returns to the scorecard", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "duel reached from the per-seat card — desktop-only overlay flow",
    );
    await mockDelegationWithChallengers(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    await page.getByTestId("open-duel").click();
    await expect(page.locator(".cmp")).toBeVisible();
    await page
      .locator(".cmp")
      .getByRole("button", { name: /^Keep / })
      .click();

    // Back on the seat's own deep view — the verdict button reads the keep
    // state directly (v3 rail removal dropped the rail's own readout).
    await expect(page.locator(".rep-card")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Worth keeping — undo/ }),
    ).toBeVisible();
    // No successor on a keep — the replace button still reads its default.
    await expect(
      page.getByRole("button", { name: "Time to replace", exact: true }),
    ).toBeVisible();
  });
});

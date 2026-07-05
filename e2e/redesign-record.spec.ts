// Congress-assessment experience — full voting record panel.
//
// The "See the full voting record" CTA under the alignment surface opens the
// restored AllVotesPanel: every curated vote grouped by issue, filterable,
// with per-vote collapse (one open by default), ✓/✗ with-you flags and
// roll-call source links. Blind mode keeps the member's identity out of the
// panel header. Structure matches the Keystone res-allvotes artboard.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect } from "@playwright/test";
import {
  mockDelegation,
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

test.describe("full voting record", () => {
  test("opens the all-votes panel with sources; blind mode hides the name until reveal", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "center-pane card assertions are desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // The CTA carries the curated-vote count from /api/race-data.
    const cta = page.getByTestId("see-full-record");
    await expect(cta).toContainText("See the full voting record — 1 vote");
    await cta.click();

    // Panel: header is the BLIND label (identity hidden until reveal). Votes
    // are grouped under a per-issue subheader; each row carries the bill, a
    // ✓/✗ with-you flag, and — for the row expanded by default — a roll-call
    // link inside the detail.
    const panel = page.locator(".avsheet");
    await expect(panel).toContainText("Your U.S. Representative");
    await expect(panel).not.toContainText("Alex Rivera");
    await expect(panel).toContainText("S 1339");
    await expect(panel.locator(".av-row.with .avr-flag").first()).toHaveText(
      "✓",
    );
    await expect(panel.locator(".avg-name").first()).toContainText(
      "Lower insulin & drug prices",
    );
    await expect(
      panel.getByRole("link", { name: /roll-call/i }),
    ).toHaveAttribute("href", "https://www.govtrack.us/");

    // Filter chips render, led by the "All" chip.
    await expect(panel.locator(".avf").first()).toContainText("All");

    // Close, reveal the member, reopen — the header now shows the real name.
    await panel.locator(".av-close").click();
    await page.locator(".cv2-reveal").first().click();
    await page.getByTestId("see-full-record").click();
    await expect(page.locator(".avsheet")).toContainText("Alex Rivera");
  });
});

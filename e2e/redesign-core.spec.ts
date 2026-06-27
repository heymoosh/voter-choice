// Congress-assessment experience (src/prototype/redesign/) — core flow.
//
// Requires a build with NEXT_PUBLIC_BALLOT_ENABLED unset/false (the new
// default). Self-skips against a legacy-flag build, where the prototype-*
// specs run instead.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect } from "@playwright/test";
import {
  mockDelegation,
  mockDelegationFailure,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
  goToWorkspace,
  goToStanding,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

test.describe("delegation flow — address → assess → verdicts", () => {
  test("walks home → cold-open → workspace with real card surfaces", async ({
    page,
  }, testInfo) => {
    // The left rail is desktop-only (<768px shows the scorecard pane first).
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "rail assertions are desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Blind-first: identity hidden, judged by record.
    await expect(page.locator(".cv2-name.blind").first()).toContainText(
      "Your U.S. Representative",
    );

    // Seat strip + attendance band + eligibility + sources are all present.
    await expect(page.locator(".seat-strip")).toContainText("TX-37");
    await expect(page.locator(".att-band")).toContainText("missed 1.4%");
    await expect(page.locator(".att-band .att-chip")).toHaveText(
      "Rarely misses",
    );
    await expect(page.locator(".elig")).toContainText("2026");
    await expect(page.locator(".card-sources")).toContainText("GovTrack");

    // Money trail summary carries the donor total (core thesis).
    await expect(page.locator(".cv2-disclose-summary")).toContainText(
      "$5M raised",
    );
    await expect(page.locator(".tweaks2")).toHaveCount(0);

    // Single right panel ([P1]): the left rail was removed, so the scorecard
    // pane is the only side panel and it renders the issues. The confusing
    // Fed/Both/State jurisdiction tags were removed ([P0]) — assert they no
    // longer appear, and that the dropped rail is truly gone.
    await expect(page.locator(".ws-ballot")).toBeVisible();
    await expect(
      page.locator(".ws-ballot .b-issues-list li").first(),
    ).toBeVisible();
    await expect(page.locator(".ws-rail")).toHaveCount(0);
    await expect(page.locator(".lvl-tag")).toHaveCount(0);
  });

  test("threads the delegation's resolved candidateId into /api/race-data", async ({
    page,
  }) => {
    await mockDelegation(page);
    const seat = await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Regression guard for the House-vs-Senate alignment bug: the House card must
    // request its votes by the resolved DB id the delegation already knows
    // (federal-TEST1), NOT by forcing a name re-resolution that can hit a
    // voteless FEC-roster duplicate.
    type RaceDataReq = {
      raceId?: string;
      candidates?: Array<{ candidateId?: string }>;
    };
    await expect
      .poll(() =>
        (seat.requests as RaceDataReq[]).find(
          (r) => r.raceId === "house-TX-37",
        ),
      )
      .toBeTruthy();
    const houseReq = (seat.requests as RaceDataReq[]).find(
      (r) => r.raceId === "house-TX-37",
    );
    expect(houseReq?.candidates?.[0]?.candidateId).toBe("federal-TEST1");
  });

  test("continue elsewhere opens a handoff modal with a portable prompt", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    await page
      .getByRole("button", { name: /Continue in another chatbot/ })
      .click();
    await expect(page.locator(".be-modal")).toContainText(
      "Take your scorecard with you",
    );
    const promptText = page.locator(".be-modal .be-prompt-text");
    await expect(promptText).toContainText("MY CONGRESSIONAL SCORECARD");
    await expect(promptText).toContainText(
      "MY PRIORITIES (ranked, with the direction I want):",
    );
    await expect(promptText).toContainText("CONTINUE FROM HERE:");
    // Evidence basis rides along (5/6 + 1/6 mock rows → not bare verdicts).
    await expect(promptText).toContainText("scored votes");

    // Restored affordances: chatbot copy & open buttons, .txt download, BYOK.
    await expect(
      page.locator(".be-modal").getByRole("button", {
        name: /Copy & open Claude/,
      }),
    ).toBeVisible();
    await expect(
      page.locator(".be-modal").getByTestId("handoff-download"),
    ).toBeVisible();
    await expect(
      page.locator(".be-modal").getByTestId("byok-input"),
    ).toBeVisible();

    // The .txt download carries the same portable prompt.
    const downloadPromise = page.waitForEvent("download");
    await page.locator(".be-modal").getByTestId("handoff-download").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("voter-choice-scorecard.txt");
  });

  test("total-receipts-only donor data renders as pending detail, not an industry breakdown", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "card assertions are desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page, { donorMode: "totalReceiptsOnly" });
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    const sparseFunding = page
      .locator('[data-testid="funding-sparse"]')
      .first();
    await expect(sparseFunding).toContainText(
      "Detailed donor breakdown is not available yet",
    );
    await expect(page.locator(".cv2-industry").first()).toHaveCount(0);
    await expect(sparseFunding).not.toContainText("total_receipts");
  });

  test("reveal shows the member; verdicts ride into the scorecard and unlock print", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "verdict flow requires the card overlay open per-seat on mobile — desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    const counters = await mockCounters(page);
    await goToWorkspace(page);

    // Print is disabled until at least one verdict exists.
    await expect(
      page.getByRole("button", { name: /Print my scorecard/ }),
    ).toBeDisabled();

    await page.locator(".cv2-reveal").first().click();
    await expect(page.locator(".cv2-name").first()).toHaveText("Alex Rivera");

    // Verdict all three seats. The card auto-advances ~600ms after each
    // verdict — wait it out so the next click lands on the NEXT seat.
    await page.getByRole("button", { name: /Worth keeping/ }).click();
    await page.waitForTimeout(900);
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: "Time to replace", exact: true })
        .click();
      await page.waitForTimeout(900);
    }

    await expect(page.locator(".ws-ballot")).toContainText("3/3");
    await expect(page.locator(".verdict-chip").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Print my scorecard/ }),
    ).toBeEnabled();

    // Session-end counters fired once, with concerns and WITHOUT verdicts.
    await expect.poll(() => counters.calls.length).toBeGreaterThan(0);
    expect(counters.calls[0].picks).toEqual([]);
    expect(counters.calls[0].primary).toBe("GENERAL");

    // Print sheet renders the verdicts + districts line.
    await page.getByRole("button", { name: /Print my scorecard/ }).click();
    await expect(page.locator(".print-sheet")).toContainText("Alex Rivera");
    await expect(page.locator(".print-sheet")).toContainText(
      "U.S. House TX-37",
    );
    await expect(page.locator(".verdict-print").first()).toContainText(
      "WORTH KEEPING",
    );
  });

  test("no-DB-record member renders the web_search card in the same surface", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "scorecard seat selection is desktop-only",
    );
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Open the junior senator's card (research fallback path) — seat rows now
    // live only in the right scorecard pane (the left rail was removed).
    await page.locator(".ws-ballot .b-row").nth(2).click();
    await expect(
      page.locator('[data-testid="web-search-alignment-banner"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="web-search-alignment-banner"]'),
    ).toContainText("Based on public statements");
  });
});

test.describe("standing stage (polis)", () => {
  test("above threshold renders the shared-priority map", async ({ page }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page, true);
    await mockCounters(page);
    await goToWorkspace(page);

    // The "see where you stand" teaser was removed ([P1]); reach standing via
    // the completion link that appears once the whole delegation is verdicted.
    await goToStanding(page);
    await expect(page.locator(".polis h2")).toContainText(
      "less divided than you think",
    );
    // Party-free cloud — scatter renders, no cluster/party labels.
    await expect(page.locator(".scatter")).toHaveCount(1);
    // Bridges are sentinel-only in v1 → panel hidden.
    await expect(page.locator(".bridges")).toHaveCount(0);
  });

  test("sparse sample shows early-days framing, cloud still renders", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page, false);
    await mockCounters(page);
    await goToWorkspace(page);

    await goToStanding(page);
    // Low sampleSize (<30) → honest "early days" framing, no participation gate.
    await expect(page.locator(".polis-lede")).toContainText("Early days");
    // Scatter still renders — locked only when sampleSize=0.
    await expect(page.locator(".scatter")).toHaveCount(1);
  });
});

test.describe("honest failure states", () => {
  test("geocode failure offers an address edit", async ({ page }) => {
    await mockDelegationFailure(page, "geocode_failed");
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
      .fill("asdf qwerty");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();
    await expect(page.locator(".err-banner")).toContainText(
      "couldn't place that address",
    );
    await page.getByRole("button", { name: "Edit address" }).click();
    await expect(
      page.getByRole("button", { name: "Pull my representatives →" }),
    ).toBeVisible();
  });

  test("DC / territories get the no-representation state", async ({ page }) => {
    await mockDelegationFailure(page, "no_representation");
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
      .fill("1600 Pennsylvania Ave NW");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();
    await expect(page.locator(".err-banner")).toContainText(
      "no voting member of Congress",
    );
  });
});

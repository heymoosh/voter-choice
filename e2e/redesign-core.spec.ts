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
  mockChat,
  goToWorkspace,
  goToStanding,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

// Reps-first flow (2026-08-18 product decision): address entry lands
// directly on the delegation overview — facts-only, reps immediately
// visible. Issues intake is now an OPTIONAL "tailor to your issues" step
// reachable from the overview, not a forced gate before seeing anyone.
test.describe("reps-first flow — address → overview (no issues) → optional tailor", () => {
  test("lands on the delegation overview with no issues, gates research/Polis spend until issues exist, then re-scores after tailoring", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockChat(page);
    await mockCounters(page);
    // Track /api/polis calls directly (rather than mockPolis's canned
    // response) so this test can assert on WHEN the call happens, not just
    // that it eventually succeeds.
    const polisRequests: string[] = [];
    await page.route("**/api/polis?*", async (route) => {
      polisRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          scope: "state",
          sampleSize: 0,
          thresholdMet: false,
          countToUnlock: 200,
          dots: [],
          you: null,
          consensus: [],
          groups: [],
        }),
      });
    });

    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
      .fill("1100 Congress Ave, Austin, TX 78701");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();

    // No forced cold-open, no forced orientation — straight to the overview.
    const overview = page.getByTestId("delegation-overview");
    await overview.waitFor({ timeout: 15000 });
    await expect(
      overview.locator('[data-testid="seat-facts"]').first(),
    ).toBeVisible();
    await expect(overview).not.toContainText("Aligns with your issues");

    // Spend gating: no issues yet, so no Polis-scope research call fires.
    expect(polisRequests).toHaveLength(0);

    // Second journey: tailor → issues → re-scored.
    await page.getByTestId("tailor-issues-cta").click();
    await page.locator(".coldopen textarea").waitFor({ timeout: 15000 });
    await page
      .locator(".coldopen textarea")
      .fill("Insulin prices are insane and rent went up again.");
    await page.locator("button.send").click();
    // Locking finalizes immediately — no confirm screen, no orientation.
    await page.locator("button.lock").click({ timeout: 15000 });

    // Back on the overview, now scored against the tailored issues.
    await overview.waitFor({ timeout: 15000 });
    await expect(
      overview.locator('[data-testid="seat-card"]').first(),
    ).toContainText("Aligns with your issues");
    await expect.poll(() => polisRequests.length).toBeGreaterThan(0);
  });
});

test.describe("delegation flow — address → assess → verdicts", () => {
  test("walks home → overview → tailor issues → workspace with real card surfaces", async ({
    page,
  }) => {
    // v3 rail removal (2026-07-21): the seat page renders identically at
    // every breakpoint now (no more desktop-only rail split), so this runs
    // on every project.
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Blind-first: identity hidden, judged by record. RepCard (canvas
    // variant) shows the canvas-literal "This seat's incumbent" label
    // (Muxin's 2026-07-11 ruling) rather than seat.blindLabel's "Your
    // U.S. Representative" — that field is unchanged and still used
    // elsewhere (e.g. chat grounding prompt, all-votes panel).
    await expect(page.locator(".cv2-name.blind").first()).toContainText(
      "This seat's incumbent",
    );

    // Seat strip + attendance band + sources are all present. The
    // standalone election-info block (.elig, EligibilityNote2) was removed
    // from the main card entirely (v3 §2 row 4, 2026-07-21 human decision:
    // "one focus per page" — the seat page is record + money only; the
    // election date stays in the seat strip and resurfaces at the all-done
    // junction, covered by redesign-core's all-done tests instead).
    await expect(page.locator(".seat-strip")).toContainText("TX-37");
    // Whiteboard v4 attendance copy: "Present for {a} of {b} floor votes —
    // missed just {p}%." (was the shorter "missed {p}%" sentence).
    await expect(page.locator(".att-band")).toContainText("missed just 1.4%");
    await expect(page.locator(".att-band .att-chip")).toHaveText(
      "Rarely misses",
    );
    await expect(page.locator(".card-sources")).toContainText("GovTrack");

    // Money hero carries the donor total (core thesis). The money-redesign
    // section is always open now — no more collapsible glance/disclosure
    // wrapper in this shape (v2/v3, 2026-07-21).
    await expect(page.locator(".mny-total")).toContainText("$5M");
    await expect(page.locator(".tweaks2")).toHaveCount(0);

    // One focus per page (v3, 2026-07-21): the seat page's right rail is
    // gone entirely — no ws-rail, no ws-ballot, just the centered seat card.
    // The confusing per-issue Fed/Both/State jurisdiction tags stay removed
    // ([P0]) — the one jurisdiction tag DECISIONS.md keeps lives once, on
    // the seat-tier header (canvas res-tier's .lvl), not per issue chip.
    await expect(page.locator(".rep-card")).toBeVisible();
    await expect(page.locator(".ws-ballot")).toHaveCount(0);
    await expect(page.locator(".ws-rail")).toHaveCount(0);
    await expect(page.locator(".lvl-tag")).toHaveCount(1);
    await expect(page.locator(".tier-intro .lvl-tag")).toHaveText("FEDERAL");

    // Per-seat progress framing (canvas res-tier's "SEAT N OF M"): counted
    // among the two 2026 seats (house-TX-37, senate-TX-a) — senate-TX-b is
    // excluded (onBallot2026: false), matching DelegationOverview's own count.
    await expect(page.locator(".ti-place")).toHaveText("SEAT 1 OF 2");
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

    // v3 rail removal: the persistent rail's own handoff button is gone —
    // "Continue in another chatbot" now lives in the all-done panel, so
    // both decidable seats need a verdict first to reach it (senate-TX-b
    // isn't on the 2026 ballot and carries no verdict UI).
    await page.getByRole("button", { name: /Worth keeping/ }).click();
    await page.waitForTimeout(900);
    // Not `exact: true` anymore — the whiteboard's verdict button grew a
    // `<small>` subline ("See who's running →"), which is part of the
    // button's accessible name now.
    await page.getByRole("button", { name: /^Time to replace/ }).click();
    await page.waitForTimeout(900);
    await page.locator(".all-done").waitFor({ timeout: 15000 });

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

    // Whiteboard v4 merged money into one expander-gated section — the
    // sparse-breakdown note now lives behind it, not in the always-open hero.
    await page.getByTestId("money-expander-toggle").click();

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

    // "Print my scorecard" now lives only in the all-done panel (v3 rail
    // removal dropped the rail's own always-present-but-disabled print
    // button), so it doesn't render at all until every decidable seat has
    // a verdict.
    await expect(
      page.getByRole("button", { name: /Print my scorecard/i }),
    ).toHaveCount(0);

    await page.locator(".cv2-reveal").first().click();
    await expect(page.locator(".cv2-name").first()).toHaveText("Alex Rivera");

    // Verdict both decidable seats (house-TX-37, senate-TX-a) — senate-TX-b
    // isn't on the 2026 ballot, so it carries no verdict UI to click (Muxin,
    // 2026-07-12: not-up seats are reviewable, never decidable). The card
    // auto-advances ~600ms after each verdict, skipping the not-up seat.
    await page.getByRole("button", { name: /Worth keeping/ }).click();
    await page.waitForTimeout(900);
    // Not `exact: true` anymore — the whiteboard's verdict button grew a
    // `<small>` subline ("See who's running →"), which is part of the
    // button's accessible name now.
    await page.getByRole("button", { name: /^Time to replace/ }).click();
    await page.waitForTimeout(900);

    // Both decidable seats done (the not-up seat never sits in the
    // denominator) surfaces the all-done panel — v3 rail removal dropped
    // the rail's own persistent "N/M decided" + .verdict-chip readout, so
    // this is the equivalent terminal-state signal now.
    await expect(page.locator(".all-done")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Print my scorecard/i }),
    ).toBeEnabled();

    // Session-end counters fired once, with concerns and WITHOUT verdicts.
    await expect.poll(() => counters.calls.length).toBeGreaterThan(0);
    expect(counters.calls[0].picks).toEqual([]);
    expect(counters.calls[0].primary).toBe("GENERAL");

    // Print sheet renders the verdicts + districts line. The not-up seat
    // still appears (reviewable) but in its own "shown for context, no
    // decision needed" group — never scored as a keep/replace decision.
    await page.getByRole("button", { name: /Print my scorecard/i }).click();
    await expect(page.locator(".print-sheet")).toContainText("Alex Rivera");
    await expect(page.locator(".print-sheet")).toContainText(
      "U.S. House TX-37",
    );
    await expect(page.locator(".verdict-print").first()).toContainText("KEEP");
    const notupRow = page.locator(".br.notup");
    await expect(notupRow).toContainText("Jordan Okafor");
    await expect(notupRow.locator(".verdict-print")).toHaveClass(/notup/);
  });

  test("no-DB-record member renders the web_search card in the same surface", async ({
    page,
  }) => {
    await mockDelegation(page);
    await mockSeatRaceData(page);
    await mockResearch(page);
    await mockPolis(page);
    await mockCounters(page);
    await goToWorkspace(page);

    // Open the junior senator's card (research fallback path, not-up-2026
    // so it's excluded from the overview's scored grid) — v3 rail removal:
    // the overview is the only nav surface now, and excluded seats render
    // as .dg-excluded rows rather than seat-cards.
    await page.getByTestId("back-to-overview").click();
    await page.locator(".dg-excluded").first().click();
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
    // Keystone "Where you stand" report masthead.
    await expect(page.locator(".pr-mast h1")).toContainText("stand");
    // Party-free cloud — scatter renders, no cluster/party labels.
    await expect(page.locator(".scatter")).toHaveCount(1);
    // Bridges are sentinel-only in this mock → common-ground list hidden.
    await expect(page.locator(".pr-list")).toHaveCount(0);
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
    await expect(page.locator(".pr-mast")).toContainText("Early days");
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
      .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
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
      .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
      .fill("1600 Pennsylvania Ave NW");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();
    await expect(page.locator(".err-banner")).toContainText(
      "elects a non-voting Delegate",
    );
    await expect(page.locator(".err-banner")).toContainText("roadmap");
  });

  test("Puerto Rico gets the Resident Commissioner variant", async ({
    page,
  }) => {
    await mockDelegationFailure(page, "no_representation", {
      stateCode: "PR",
      territoryName: "Puerto Rico",
    });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
      .fill("San Juan, PR 00901");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();
    await expect(page.locator(".err-banner")).toContainText(
      "elects a non-voting Resident Commissioner",
    );
  });
});

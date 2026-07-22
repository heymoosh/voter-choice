// Congress-assessment experience — head-to-head candidate duel.
//
// "Time to replace" on a seat WITH 2026 challengers opens the full-screen
// duel (incumbent vs. one challenger, challenger switcher, per-issue Δ ledger,
// Keep / Replace at the foot). Replace records the verdict AND the chosen
// successor, which rides to the scorecard. Whiteboard v4 (2026-07-22)
// rebuilt this onto the whiteboard's BLIND `.dl-*` markup (App2's blindMode
// is always true today): the incumbent and every challenger render behind an
// alias ("This seat's incumbent" / "Candidate A/B…") and a dashed `.pip.hid`
// until individually revealed — real names/parties never leak into the
// switcher, ledger, or sources while blind. This spec exercises that blind
// default explicitly, then reveals a challenger to prove the real name only
// surfaces post-reveal, and confirms the pick recorded on Replace is always
// the real successor regardless of the duel's own display state.
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

    // Full-screen duel, blind by default: incumbent column + challenger
    // column + the switcher, neither identity shown yet.
    const dl = page.locator(".dl");
    await expect(dl).toBeVisible();
    const cols = dl.locator(".dl-grid .dl-col");
    await expect(cols.nth(0)).toContainText("The record you have");
    await expect(cols.nth(0)).toContainText("This seat's incumbent");
    await expect(cols.nth(1)).toContainText("Running for this seat");
    // Blind-safe: the challenger is aliased by roster order ("Candidate A" —
    // Reyes raised the most), never the real name, while unrevealed.
    await expect(cols.nth(1)).toContainText("Candidate A");
    await expect(cols.nth(1)).not.toContainText("Reyes");
    await expect(dl.locator(".pip.hid").first()).toBeVisible();
    await expect(dl.locator(".dl-blindbar")).toContainText(
      "Names & parties hidden",
    );

    // Incumbent overall is the roll-call score (5/6 = 83%) — the score
    // itself is never blinded, only identity.
    await expect(cols.nth(0).locator(".dl-big b")).toHaveText("83%");

    // Switcher carries the two challengers by BLIND alias (ranked by funds
    // raised — Reyes first), never their real names while unrevealed.
    const switcher = dl.locator(".dl-tabs");
    await expect(switcher).toContainText("Candidate A");
    await expect(switcher).toContainText("Candidate B");
    await expect(switcher).not.toContainText("Reyes");
    await expect(switcher).not.toContainText("Whitfield");

    // Δ ledger: the user's issue rows render with the incumbent column value.
    const ledger = dl.locator(".dl-ledger");
    await expect(ledger).toContainText("Lower insulin & drug prices");
    // Challenger research (web_search, in_favor → directional 80%) settles.
    await expect(cols.nth(1).locator(".dl-big b")).toHaveText("80%", {
      timeout: 10000,
    });
    // The honest-provenance note marks the challenger figures as researched,
    // and — still blind — spells out that nothing here names anyone yet.
    const ledgerNote = dl.locator(".dl-note").first();
    await expect(ledgerNote).toContainText("directional read");
    await expect(ledgerNote).toContainText(
      "Nothing here names anyone until you reveal.",
    );
    // Sources are locked behind the reveal too (Frame 5 item 5).
    await expect(cols.nth(1).locator(".dl-lock")).toContainText(
      "sources unlock on reveal",
    );

    // Reveal the selected challenger (Reyes) — real name appears, sources
    // unlock. The handler always received the real id even while blind
    // (only the display was aliased), but this proves the UI itself only
    // shows it post-reveal.
    await cols.nth(1).getByRole("button", { name: "Reveal" }).click();
    await expect(cols.nth(1)).toContainText("Elena Reyes");
    await expect(cols.nth(1).locator(".dl-lock")).toHaveCount(0);

    // Switch to the second challenger — a per-challenger reveal, not a
    // global one — Whitfield is still shown blind.
    await switcher.getByRole("tab", { name: /Candidate B/ }).click();
    await expect(cols.nth(1).locator(".dl-cname")).toContainText("Candidate B");
    await expect(cols.nth(1)).not.toContainText("Whitfield");

    // Switch back to the now-revealed Reyes (tab itself now reads the real
    // last name, not the alias) and Replace — records the verdict +
    // successor.
    await switcher.getByRole("tab", { name: /Reyes/ }).click();
    await dl.getByRole("button", { name: /Replace with Elena Reyes/ }).click();

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
    const dl = page.locator(".dl");
    await expect(dl).toBeVisible();
    // Foot's keep button reads "Worth keeping" (shared repCard copy) with a
    // "Keep this incumbent" subline — not a bespoke "Keep {name}" label.
    await dl.getByRole("button", { name: /Worth keeping/ }).click();

    // Back on the seat's own deep view — the verdict button reads the keep
    // state directly (v3 rail removal dropped the rail's own readout).
    await expect(page.locator(".rep-card")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Worth keeping — undo/ }),
    ).toBeVisible();
    // No successor on a keep — the replace button still reads its default
    // (not `exact: true` — the whiteboard button grew a `<small>` subline).
    await expect(
      page.getByRole("button", { name: /^Time to replace/ }),
    ).toBeVisible();
  });
});

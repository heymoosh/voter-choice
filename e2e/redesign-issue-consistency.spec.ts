// Congress-assessment experience — cross-surface ISSUE-CONSISTENCY gate.
//
// The user's locked issues are one data set that must read coherently on
// every surface that claims to show "your issues". This spec seeds the three
// cases that historically made surfaces disagree (the "I gave 3 issues and
// every screen showed me a different set" report) and pins the invariant:
//
//   1. FULL-LIST surfaces — the intake review card, the IntakeLocked confirm
//      screen, and the workspace ballot rail — show EVERY locked issue.
//   2. The intake banner's federal/state split is computed from the same
//      decorated levels the workspace uses (a custom/unmapped issue counts
//      as "both", not as nothing — IntakeLocked.tsx).
//   3. SEAT-SCOPED surfaces agree with each other exactly: the overview
//      card's issue rows (seatIssueAlignmentRows), the deep card's alignment
//      rows (AlignmentScoreBanner), and the all-votes panel's issue groups
//      (voteGroupsForUserIssues) present the same set, order, and labels.
//      An issue with no matched roll-call votes appears with an honest empty
//      state — it does not vanish from the votes panel while sitting as a
//      "—" row on the card above it.
//   4. Level scoping is the ONLY difference between the full list and the
//      seat-scoped set: a state-leaning issue is consistently absent from
//      every federal seat surface (and only from those).
//
// Deliberately NOT pinned here: whether a state-leaning issue should get an
// explanatory row/note on federal surfaces instead of being scoped out —
// that's a product ruling (see delegationData.test.ts's issuesForLevel
// coverage for the current scoping contract). Whatever that ruling turns
// out to be, it changes issuesForLevel/seatIssueAlignmentRows once, and this
// spec keeps every surface honest to it.
//
// All data seams are mocked (e2e/helpers/redesign-mocks.ts) — no network.

import { test, expect, type Page } from "@playwright/test";
import {
  mockDelegation,
  mockSeatRaceData,
  mockResearch,
  mockPolis,
  mockCounters,
} from "./helpers/redesign-mocks";

test.skip(
  process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true",
  "redesign specs need the congress-assessment build (flag unset)",
);

// The three divergence-triggering issues (labels are what every surface must
// display — the user's own interpretation wording, never the API's):
//   insulin  → healthcare_affordability, lean FEDERAL, has 1 matched vote in
//              mockSeatRaceData — the happy path every surface always showed.
//   rent     → housing_affordability, lean BOTH, mapped but with NO matched
//              votes in mockSeatRaceData — used to vanish from the votes
//              panel while rendering as a "—" row on the cards.
//   property → property_taxes, lean STATE — scoped off federal seats; must
//              be absent from ALL federal seat surfaces but present on every
//              full-list surface.
const INSULIN = "Lower insulin & drug prices";
const RENT = "Rent & cost-of-living protections";
const PROPERTY = "Cut my property taxes";

const MIXED_THEMES_SSE =
  `data: ${JSON.stringify({
    type: "text",
    text: JSON.stringify([
      {
        name: INSULIN,
        quotes: ["insulin"],
        canonicalIssue: "healthcare_affordability",
        stance: "in_favor",
      },
      {
        name: RENT,
        quotes: ["rent"],
        canonicalIssue: "housing_affordability",
        stance: "in_favor",
      },
      {
        name: PROPERTY,
        quotes: ["property taxes"],
        canonicalIssue: "property_taxes",
        stance: "in_favor",
      },
    ]),
  })}\n\n` + 'data: {"type":"done"}\n\n';

/** POST /api/chat → the 3-theme extraction above on turn 1. */
async function mockChatMixedLevels(page: Page): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    const sysPrompt =
      (route.request().postDataJSON() as { systemPrompt?: string })
        ?.systemPrompt || "";
    const body = sysPrompt.includes("extract civic themes")
      ? MIXED_THEMES_SSE
      : 'data: {"type":"text","text":"(mocked reply)"}\n\ndata: {"type":"done"}\n\n';
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

test.describe("issue set persists across intake, overview, deep view, and voting history", () => {
  test("every surface presents the same issue data, with level scoping as the only (consistent) difference", async ({
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
    await mockChatMixedLevels(page);

    // ---- Intake: extract 3 issues in one turn -------------------------
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await page
      .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
      .fill("1100 Congress Ave, Austin, TX 78701");
    await page
      .getByRole("button", { name: "Pull my representatives →" })
      .click();
    await page.getByTestId("issue-convo-input").waitFor({ timeout: 15000 });
    await page
      .getByTestId("issue-convo-input")
      .fill("Insulin prices, my rent, and my property taxes are all insane.");
    await page.getByTestId("issue-convo-send").click();
    await page.getByTestId("issue-themes-card").waitFor({ timeout: 15000 });
    await expect(
      page.getByTestId("issue-themes-card").locator(".theme-row"),
    ).toHaveCount(3);

    // ---- IntakeLocked confirm screen: full list + coherent split ------
    await page.getByTestId("issue-primary").click();
    const confirm = page.getByTestId("issue-locked-confirm");
    await expect(confirm.locator(".theme-row")).toHaveCount(3);
    // Decorated levels: insulin=federal, rent=both, property=state →
    // 2 apply federally, 2 at the state level. The split must be derived
    // from the same list rendered above it (IntakeLocked counts on the
    // decorated levels the workspace itself will use).
    await expect(confirm.locator(".iq-locked .iq-juris.fed")).toHaveText(
      "2 Federal",
    );
    await expect(confirm.locator(".iq-locked .iq-juris.state")).toHaveText(
      "2 State",
    );

    // ---- Delegation overview: seat-scoped rows ------------------------
    await page
      .getByTestId("issue-locked-confirm-btn")
      .click({ timeout: 15000 });
    await page.getByTestId("orientation-continue").click({ timeout: 15000 });
    const firstCard = page.locator('[data-testid="seat-card"]').first();
    await firstCard.waitFor({ timeout: 15000 });
    // Federal seat card: exactly the two federally-applicable issues, in
    // the user's order, in the user's wording. The state-leaning issue is
    // scoped out — consistently (asserted absent from every federal
    // surface below, not just this one).
    await expect(firstCard.locator(".cd-irow .ik")).toHaveText([INSULIN, RENT]);
    await expect(
      page.locator('[data-testid="delegation-overview"]'),
    ).not.toContainText(PROPERTY);

    // ---- Deep seat view: edit-issues modal (full list) vs card rows
    // (scoped set) ---
    await firstCard.click();
    await page.locator(".rep-card").first().waitFor({ timeout: 20000 });
    // v3 rail removal (2026-07-21): the full-list-of-all-issues surface in
    // the deep view used to be the persistent rail; that's gone, and the
    // edit-issues modal (reachable via the alignment fine print) is now the
    // only place the deep view shows every locked issue, state one included.
    await page.getByTestId("edit-issues-alignment").click();
    const editModal = page.getByTestId("edit-issues-modal");
    await editModal.waitFor({ timeout: 15000 });
    await expect(editModal.locator(".theme-row")).toHaveCount(3);
    await expect(editModal).toContainText(PROPERTY);
    await editModal
      .getByRole("button", { name: "Cancel — keep my current issues" })
      .click();
    await expect(editModal).not.toBeVisible();
    // The deep card's alignment rows are the SAME set as the overview card.
    // (money-redesign v2 renamed the canvas row's name class from
    // .cv2-iss-name to .iss-name — .iss is the new `.iss`/`.iss-head`/
    // `.iss-name` per-issue card shape, unrelated to rail removal.)
    await expect(
      page.locator('[data-testid="voting-record-alignment-row"] .iss-name'),
    ).toHaveText([INSULIN, RENT]);

    // ---- Voting history: same issues, votes joined on -----------------
    await page.getByTestId("see-full-record").click();
    const panel = page.locator(".av-panel");
    await panel.waitFor({ timeout: 15000 });
    // One group per seat-scoped user issue — the voteless one included.
    await expect(panel.locator(".av-group .avg-name")).toHaveText([
      INSULIN,
      RENT,
    ]);
    // The issue with a matched vote shows it; the voteless one shows the
    // honest empty state instead of disappearing.
    const groups = panel.locator(".av-group");
    await expect(groups.nth(0).locator(".av-row")).toHaveCount(1);
    await expect(groups.nth(1).locator(".av-none")).toContainText(
      "No roll-call votes matched to this issue yet.",
    );
    // The header tally counts issues with votes — not the group count, and
    // not a vote-derived issue set that disagrees with the rows above.
    await expect(panel.locator("h3")).toContainText(
      "1 votes across 1 of your issues",
    );
    // Level scoping holds here too: the state-leaning issue is absent from
    // this federal surface, same as the card rows behind it.
    await expect(panel).not.toContainText(PROPERTY);
  });
});

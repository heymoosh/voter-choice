// Shared Playwright mocks for the congress-assessment experience
// (src/prototype/redesign/, served when NEXT_PUBLIC_BALLOT_ENABLED is unset).
//
// Data seam is src/prototype/redesign/delegationData.ts + polisAdapter.ts:
//   POST /api/delegation         → sitting members for the address
//   POST /api/race-data          → { racePatterns, alignmentScores } per seat
//   POST /api/research-candidate → web-research fallback (no-record member)
//   GET  /api/polis(+/bridges)   → standing-stage aggregates
//   POST /api/counters           → anonymous session-end increment
//
// State election data (eligibility, deadlines, accepted IDs) is bundled
// client-side (src/data/states/TX.json) — no mock needed.

import { type Page } from "@playwright/test";

type Json = Record<string, unknown>;

export const TX_SEATS = [
  {
    seatId: "house-TX-37",
    office: "U.S. House",
    chamber: "house",
    districtLabel: "TX-37",
    blindLabel: "Your U.S. Representative",
    candidate: {
      id: "federal-TEST1",
      name: "Alex Rivera",
      party: "Democrat",
      priorRole: "U.S. Representative since 2019",
    },
    attendance: { missedPct: 1.4, of: "612 floor votes", band: "good" },
    onBallot2026: true,
    nextElectionYear: 2026,
  },
  {
    seatId: "senate-TX-a",
    office: "U.S. Senate",
    chamber: "senate",
    districtLabel: "Texas (statewide)",
    blindLabel: "Your Senior U.S. Senator",
    candidate: {
      id: "federal-TEST2",
      name: "Morgan Hale",
      party: "Republican",
      priorRole: "U.S. Senator since 2015",
    },
    attendance: { missedPct: 11.2, of: "486 floor votes", band: "bad" },
    onBallot2026: true,
    nextElectionYear: 2026,
  },
  {
    seatId: "senate-TX-b",
    office: "U.S. Senate",
    chamber: "senate",
    districtLabel: "Texas (statewide)",
    blindLabel: "Your Junior U.S. Senator",
    candidate: {
      id: "federal-TEST3",
      name: "Jordan Okafor",
      party: "Republican",
      priorRole: "U.S. Senator since 2021",
    },
    attendance: null,
    onBallot2026: false,
    nextElectionYear: 2028,
  },
] as const;

export async function mockDelegation(page: Page): Promise<void> {
  await page.route("**/api/delegation", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        stateCode: "TX",
        stateName: "Texas",
        county: "Travis County",
        districtLabel: "TX-37",
        seats: TX_SEATS,
      }),
    });
  });
}

/** 2026 FEC filers running against the House incumbent — drives the
 *  head-to-head duel ("Time to replace" flow). Ranked by funds raised. */
export const HOUSE_CHALLENGERS = [
  {
    id: "ch-reyes",
    name: "Elena Reyes",
    party: "Democrat",
    totalReceipts: 1_340_000,
  },
  {
    id: "ch-whitfield",
    name: "Sam Whitfield",
    party: "Independent",
    totalReceipts: 95_000,
  },
] as const;

/** Same as mockDelegation but the House seat carries 2026 challengers, so the
 *  "Time to replace" CTA opens the duel instead of toggling an inline verdict. */
export async function mockDelegationWithChallengers(page: Page): Promise<void> {
  const seats = TX_SEATS.map((s) =>
    s.seatId === "house-TX-37" ? { ...s, challengers: HOUSE_CHALLENGERS } : s,
  );
  await page.route("**/api/delegation", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        stateCode: "TX",
        stateName: "Texas",
        county: "Travis County",
        districtLabel: "TX-37",
        seats,
      }),
    });
  });
}

export async function mockDelegationFailure(
  page: Page,
  status: "geocode_failed" | "no_representation" | "db_unavailable",
): Promise<void> {
  const bodies: Record<string, Json> = {
    geocode_failed: { status: "geocode_failed" },
    no_representation: {
      status: "no_representation",
      stateCode: "DC",
      territoryName: "District of Columbia",
    },
    db_unavailable: {
      status: "db_unavailable",
      stateCode: "TX",
      county: "Travis County",
      districtLabel: "TX-37",
    },
  };
  await page.route("**/api/delegation", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bodies[status]),
    });
  });
}

/** Voting-record card data for the first two seats; seat 3 has no DB record
 *  (drives the web_search fallback path). */
export async function mockSeatRaceData(
  page: Page,
  options: { donorMode?: "rich" | "totalReceiptsOnly" } = {},
): Promise<{ requests: Json[] }> {
  const donorMode = options.donorMode ?? "rich";
  // Captured /api/race-data POST bodies — lets tests assert the client threads
  // the resolved candidateId instead of forcing a name re-resolution.
  const requests: Json[] = [];
  const aligned = (
    seatId: string,
    candidateId: string,
    name: string,
    kept: number,
    total: number,
  ) => ({
    racePatterns: {
      race: seatId,
      candidates: [
        {
          id: candidateId,
          name,
          incumbent: true,
          donorCoalition:
            donorMode === "totalReceiptsOnly"
              ? [{ label: "total_receipts", percent: 100, amount: 5_000_000 }]
              : [
                  {
                    label: "Small individual donors (under $200)",
                    percent: 40,
                    amount: 2_000_000,
                  },
                  { label: "PACs", percent: 60, amount: 3_000_000 },
                ],
          donorSource: { name: "fec", url: "https://www.fec.gov/" },
          totalRaised: 5_000_000,
          fundingMix:
            donorMode === "totalReceiptsOnly"
              ? undefined
              : {
                  small: 40,
                  large: 0,
                  pac: 60,
                  total: 5_000_000,
                  cycle: "2026 cycle",
                },
          endorsements: null,
          platformAlignment: null,
          retrospective: null,
          valuesHighlight: null,
        },
      ],
    },
    alignmentScores: {
      race: seatId,
      entries: [
        {
          candidateId,
          scores: [
            {
              canonicalIssue: "healthcare_affordability",
              issueLabel: "Lower insulin & drug prices",
              resolvedStance: "in_favor",
              sourceType: "voting_record",
              kept,
              total,
              contributingVotes: [
                {
                  billTitle: "S 1339 · Insulin Price Cap Act",
                  voteCast: kept > total / 2 ? "with" : "against",
                  date: "2025-06-12",
                  source: { name: "GovTrack", url: "https://www.govtrack.us/" },
                },
              ],
            },
          ],
        },
      ],
    },
  });

  await page.route("**/api/race-data", async (route) => {
    const body = route.request().postDataJSON() as {
      raceId?: string;
      candidates?: Array<{ candidateId?: string }>;
    };
    requests.push(body as Json);
    let data: Json;
    if (body?.raceId === "house-TX-37") {
      data = aligned("house-TX-37", "federal-TEST1", "Alex Rivera", 5, 6);
    } else if (body?.raceId === "senate-TX-a") {
      data = aligned("senate-TX-a", "federal-TEST2", "Morgan Hale", 1, 6);
    } else {
      // Junior senator: resolved member but NO DB record → research fallback.
      data = {
        racePatterns: {
          race: "senate-TX-b",
          candidates: [
            {
              id: "federal-TEST3",
              name: "Jordan Okafor",
              incumbent: true,
              donorCoalition: null,
              donorUnavailable: { reason: "No donor data on file" },
              endorsements: null,
              platformAlignment: null,
              retrospective: null,
              valuesHighlight: null,
            },
          ],
        },
        alignmentScores: {
          race: "senate-TX-b",
          entries: [
            {
              candidateId: "federal-TEST3",
              scores: null,
              unavailable: { reason: "research_pending" },
            },
          ],
        },
      };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  return { requests };
}

export async function mockResearch(page: Page): Promise<void> {
  await page.route("**/api/research-candidate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scores: [
          {
            canonicalIssue: "healthcare_affordability",
            issueLabel: "Lower insulin & drug prices",
            resolvedStance: "in_favor",
            sourceType: "web_search",
            confidence: "medium",
            evidence: [
              {
                summary:
                  "Said insulin pricing needs federal caps at a town hall",
                url: "https://example.org/source",
              },
            ],
          },
        ],
      }),
    });
  });
}

/** Polis above threshold for the state scope; bridges sentinel-empty. */
export async function mockPolis(
  page: Page,
  thresholdMet = true,
): Promise<void> {
  await page.route("**/api/polis?*", async (route) => {
    const url = new URL(route.request().url());
    const sampleSize = thresholdMet ? 412 : 12;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope:
          url.searchParams.get("scope") === "national" ? "national" : "state",
        sampleSize,
        thresholdMet,
        ...(thresholdMet ? {} : { countToUnlock: 200 - sampleSize }),
        dots: thresholdMet
          ? Array.from({ length: 60 }, (_, i) => ({
              x: (i % 10) / 10 - 0.5,
              y: Math.floor(i / 10) / 10 - 0.3,
              primary: i % 2 ? "GENERAL" : "DEM",
            }))
          : [],
        you: thresholdMet ? { x: 0.1, y: 0.05 } : null,
        consensus: [],
        groups: thresholdMet
          ? [
              {
                primary: "GENERAL",
                count: 220,
                topIssues: ["healthcare_affordability"],
              },
              {
                primary: "DEM",
                count: 192,
                topIssues: ["housing_affordability"],
              },
            ]
          : [],
      }),
    });
  });
  await page.route("**/api/polis/bridges?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "county",
        threshold: 200,
        count: 0,
        status: "no_bridges_yet",
        bridges: [],
      }),
    });
  });
}

/** Cold-open theme-extraction SSE: a JSON theme array (canonical ids so the
 *  locked issues carry jurisdiction tags + score) in the chat route's SSE frames. */
const THEME_EXTRACTION_SSE =
  `data: ${JSON.stringify({
    type: "text",
    text: JSON.stringify([
      {
        name: "Lower insulin & drug prices",
        quotes: ["insulin"],
        canonicalIssue: "healthcare_affordability",
        stance: "in_favor",
      },
      {
        name: "Rent & cost-of-living protections",
        quotes: ["rent"],
        canonicalIssue: "housing_affordability",
        stance: "in_favor",
      },
    ]),
  })}\n\n` + 'data: {"type":"done"}\n\n';

/** Theme-refinement SSE (turns 2+ of the issue conversation): prose + the
 *  FULL updated array in a fenced block — adds a third theme so specs can
 *  assert the list actually changed. */
const REFINED_THEMES = [
  {
    name: "Lower insulin & drug prices",
    quotes: ["insulin"],
    canonicalIssue: "healthcare_affordability",
    stance: "in_favor",
  },
  {
    name: "Rent & cost-of-living protections",
    quotes: ["rent"],
    canonicalIssue: "housing_affordability",
    stance: "in_favor",
  },
  {
    name: "Ban congressional stock trading",
    quotes: ["stock trading"],
    canonicalIssue: "congressional_accountability",
    stance: "in_favor",
  },
];

const THEME_REFINEMENT_SSE =
  `data: ${JSON.stringify({
    type: "text",
    text:
      "Got it — accountability matters to you, so I added congressional stock trading.\n\n```json\n" +
      JSON.stringify(REFINED_THEMES) +
      "\n```",
  })}\n\n` + 'data: {"type":"done"}\n\n';

/** POST /api/chat → SSE, dispatched on the builder's marker phrase:
 *  - "extract civic themes"   → turn-1 theme JSON array
 *  - "refining a voter's priority themes" → prose + fenced updated array
 *  - anything else            → minimal reply (never hits the real model) */
export async function mockChat(page: Page): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    const sysPrompt =
      (route.request().postDataJSON() as { systemPrompt?: string })
        ?.systemPrompt || "";
    const body = sysPrompt.includes("extract civic themes")
      ? THEME_EXTRACTION_SSE
      : sysPrompt.includes("refining a voter's priority themes")
        ? THEME_REFINEMENT_SSE
        : 'data: {"type":"text","text":"(mocked reply)"}\n\ndata: {"type":"done"}\n\n';
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

/** POST /api/chat → a server-side block. `kind: "budget"` is the structured
 *  200 budget-exhausted continuity payload; `kind: "code"` is a 503 with an
 *  explicit block code (rate-limit family). Installed AFTER goToWorkspace so
 *  the cold-open extraction (earlier mockChat) still succeeds — Playwright
 *  gives the later route priority. */
export async function mockChatBlocked(
  page: Page,
  block: { kind: "budget" } | { kind: "code"; code: string; status?: number },
): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    if (block.kind === "budget") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "budget_exhausted",
          resetAt: "2099-01-01T00:00:00Z",
          budget: { tier: "exhausted", percent: 100 },
        }),
      });
      return;
    }
    await route.fulfill({
      status: block.status ?? 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "blocked", code: block.code }),
    });
  });
}

export async function mockCounters(page: Page): Promise<{ calls: Json[] }> {
  const calls: Json[] = [];
  await page.route("**/api/counters", async (route) => {
    calls.push(route.request().postDataJSON() as Json);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, alreadyCounted: false }),
    });
  });
  return { calls };
}

/** Drive home → cold-open → workspace over the installed mocks. */
export async function goToWorkspace(page: Page): Promise<void> {
  // Cold-open issue extraction now streams from /api/chat; mock it so Send
  // produces the locked issues (otherwise button.lock never appears).
  await mockChat(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page
    .getByPlaceholder("1600 Pennsylvania Ave NW, Washington DC 20500")
    .fill("1100 Congress Ave, Austin, TX 78701");
  // The trailing → is an aria-hidden span, so it's not part of the accessible
  // name; match on the visible label only (substring, arrow-agnostic).
  await page.getByRole("button", { name: "Pull my representatives" }).click();
  // Cold-open: free-text issues → preset interpretation list → lock.
  await page.getByTestId("issue-convo-input").waitFor({ timeout: 15000 });
  await page
    .getByTestId("issue-convo-input")
    .fill("Insulin prices are insane and rent went up again.");
  await page.locator("button.send").click();
  await page.locator("button.lock").click({ timeout: 15000 });
  // Guided orientation interstitial sits between locking issues and the first
  // representative; click through it to reach the workspace.
  await page.getByTestId("orientation-continue").click({ timeout: 15000 });
  // Workspace is ready once the scorecard rows appear. On mobile the center
  // pane (rep-card) starts hidden until a row is tapped; the scorecard rows
  // are always visible and are the safe signal for both viewports.
  await page.locator(".b-row").first().waitFor({ timeout: 20000 });
}

/**
 * Drive the workspace to the standing (polis) stage. With the [P1] declutter
 * the "see where you stand" teaser was removed; the only remaining entry to
 * standing is the `.all-done` completion link, which appears in the center
 * (rep) column once every seat has a verdict. Verdict each scorecard row in
 * turn (selecting the row first makes this deterministic across the
 * auto-advance and works on both desktop inline cards and the mobile center
 * overlay), then open a seat so the center column is visible and follow the
 * link. On mobile the center is a tap-to-open overlay that closes after each
 * verdict, so the final row click is what surfaces `.all-done`.
 */
export async function goToStanding(page: Page): Promise<void> {
  const rows = page.locator(".b-row");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    await rows.nth(i).click();
    const keep = page.getByRole("button", { name: /Worth keeping/ }).first();
    await keep.waitFor({ timeout: 15000 });
    await keep.click();
    // Let the verdict commit (commitVerdict defers the auto-advance ~600ms).
    await page.waitForTimeout(700);
  }
  // Re-open a seat so the center column (which holds .all-done) is on screen;
  // on mobile the last verdict closed the overlay.
  await rows.first().click();
  const standingLink = page
    .locator(".all-done")
    .getByRole("button", { name: /where you stand/ });
  await standingLink.waitFor({ timeout: 15000 });
  await standingLink.click();
}

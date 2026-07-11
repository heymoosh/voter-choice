// scripts/design/parity-gallery-scenarios.ts
//
// The 28 Keystone canvas artboards (.keystone-canvas-refs/manifest.json) mapped
// to how to reach that exact screen state in the running congress-assessment
// experience (src/prototype/redesign/, served when NEXT_PUBLIC_BALLOT_ENABLED
// is unset). Reuses the same mock seams as e2e/helpers/redesign-mocks.ts (no
// network) — the mocks there are plain functions over a Playwright `Page`, so
// they work identically outside the `@playwright/test` runner.
//
// See scripts/design/PARITY-GALLERY-README.md for the coverage summary (which
// of these are fully automated vs. a documented proxy vs. not automatable).

import { type Page } from "@playwright/test";
import {
  mockDelegation,
  mockDelegationWithChallengers,
  mockResearch,
  mockPolis,
  mockCounters,
  goToStanding,
  TX_SEATS,
} from "../../e2e/helpers/redesign-mocks";
import {
  assembleClusterMap,
  type ResponseVector,
} from "../../src/lib/polis/pca";

export type Automatable = "yes" | "proxy" | "no";

export interface Scenario {
  id: string;
  /** Filename under .keystone-canvas-refs/. Absent when no canvas artboard
   *  was ever exported for this surface (e.g. a screen the canvas designed
   *  but the repo hasn't built yet) — the gallery renders an explicit
   *  "no canvas export" note instead of a broken image in that case. */
  refFile?: string;
  label: string;
  /** Repo-relative substrings — a changed file counts if it CONTAINS one of these. */
  files: string[];
  automatable: Automatable;
  /** Why it's a proxy / not automatable, or a one-line confirmation when 'yes'. */
  note: string;
  /** Absent when automatable === 'no' — nothing to run. */
  capture?: (page: Page) => Promise<void>;
}

const ADDRESS = "1100 Congress Ave, Austin, TX 78701";

// ---------------------------------------------------------------------------
// Shared mocks — extensions over e2e/helpers/redesign-mocks.ts's mockSeatRaceData.
// Kept local (not added to the e2e helper) so the e2e suite's contract stays
// untouched; these are gallery-only fixtures.
// ---------------------------------------------------------------------------

/** Chat mock matching e2e's mockChat contract (theme-extraction / refinement /
 *  minimal reply), duplicated locally so this script has zero dependency on
 *  the e2e helper's internal (non-exported) SSE constants. */
async function mockChatLocal(page: Page): Promise<void> {
  const extraction =
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
  const refined =
    `data: ${JSON.stringify({
      type: "text",
      text:
        "Got it — accountability matters to you, so I added congressional stock trading.\n\n```json\n" +
        JSON.stringify([
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
        ]) +
        "\n```",
    })}\n\n` + 'data: {"type":"done"}\n\n';
  await page.route("**/api/chat", async (route) => {
    const sysPrompt =
      (route.request().postDataJSON() as { systemPrompt?: string })
        ?.systemPrompt || "";
    const body = sysPrompt.includes("extract civic themes")
      ? extraction
      : sysPrompt.includes("refining a voter's priority themes")
        ? refined
        : 'data: {"type":"text","text":"(mocked reply)"}\n\ndata: {"type":"done"}\n\n';
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

/** Like e2e's mockSeatRaceData, but attaches `chamberMedian` so
 *  derivePeerComparison() (src/prototype/redesign/peerComparison.ts) produces
 *  a non-null PeerComparison — without it every candidate's peerComparison is
 *  null (no chamberMedian in the e2e fixtures) and MoneyGapScale renders
 *  nothing at all, which would make the money-gap artboards blank. */
async function mockSeatRaceDataMedian(page: Page): Promise<void> {
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
          donorCoalition: [
            {
              label: "Small individual donors (under $200)",
              percent: 40,
              amount: 2_000_000,
            },
            { label: "PACs", percent: 60, amount: 3_000_000 },
          ],
          donorSource: { name: "fec", url: "https://www.fec.gov/" },
          totalRaised: 5_000_000,
          chamberMedian: 1_400_000,
          fundingMix: {
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
                  source: {
                    name: "GovTrack",
                    url: "https://www.govtrack.us/",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  });

  await page.route("**/api/race-data", async (route) => {
    const body = route.request().postDataJSON() as { raceId?: string };
    let data: unknown;
    if (body?.raceId === "house-TX-37") {
      data = aligned("house-TX-37", "federal-TEST1", "Alex Rivera", 5, 6);
    } else if (body?.raceId === "senate-TX-a") {
      data = aligned("senate-TX-a", "federal-TEST2", "Morgan Hale", 1, 6);
    } else {
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
}

/** Race-data mock whose House score SWINGS hard depending on whether the
 *  submitted issue list includes `congressional_accountability` — lets the
 *  edit-issues → re-score flow (09e) produce a real, visible REVISIT delta
 *  instead of the flat "nothing moved" branch. */
async function mockSeatRaceDataDeltaAware(page: Page): Promise<void> {
  await page.route("**/api/race-data", async (route) => {
    const body = route.request().postDataJSON() as {
      raceId?: string;
      issues?: Array<{ canonicalIssue?: string }>;
    };
    const hasAccountability = (body?.issues || []).some(
      (i) => i?.canonicalIssue === "congressional_accountability",
    );
    let data: unknown;
    if (body?.raceId === "house-TX-37") {
      const kept = hasAccountability ? 1 : 5;
      data = {
        racePatterns: {
          race: "house-TX-37",
          candidates: [
            {
              id: "federal-TEST1",
              name: "Alex Rivera",
              incumbent: true,
              donorCoalition: [
                {
                  label: "Small individual donors (under $200)",
                  percent: 40,
                  amount: 2_000_000,
                },
                { label: "PACs", percent: 60, amount: 3_000_000 },
              ],
              donorSource: { name: "fec", url: "https://www.fec.gov/" },
              totalRaised: 5_000_000,
              fundingMix: {
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
          race: "house-TX-37",
          entries: [
            {
              candidateId: "federal-TEST1",
              scores: [
                {
                  canonicalIssue: "healthcare_affordability",
                  issueLabel: "Lower insulin & drug prices",
                  resolvedStance: "in_favor",
                  sourceType: "voting_record",
                  kept,
                  total: 6,
                  contributingVotes: [
                    {
                      billTitle: "S 1339 · Insulin Price Cap Act",
                      voteCast: kept > 3 ? "with" : "against",
                      date: "2025-06-12",
                      source: {
                        name: "GovTrack",
                        url: "https://www.govtrack.us/",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
    } else if (body?.raceId === "senate-TX-a") {
      data = {
        racePatterns: {
          race: "senate-TX-a",
          candidates: [
            {
              id: "federal-TEST2",
              name: "Morgan Hale",
              incumbent: true,
              donorCoalition: [],
              donorSource: { name: "fec", url: "https://www.fec.gov/" },
              totalRaised: 5_000_000,
              endorsements: null,
              platformAlignment: null,
              retrospective: null,
              valuesHighlight: null,
            },
          ],
        },
        alignmentScores: {
          race: "senate-TX-a",
          entries: [
            {
              candidateId: "federal-TEST2",
              scores: [
                {
                  canonicalIssue: "healthcare_affordability",
                  issueLabel: "Lower insulin & drug prices",
                  resolvedStance: "opposed",
                  sourceType: "voting_record",
                  kept: 1,
                  total: 6,
                  contributingVotes: [],
                },
              ],
            },
          ],
        },
      };
    } else {
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
}

/** `divided` is the /api/polis/bridges response's "where it split" honest
 *  complement of `bridges`. It carries the EXACT shape the real route emits and
 *  the adapter reads — `{ statement, agreePercent, disagreePercent }` (see
 *  BridgesResponseBody in src/app/api/polis/bridges/route.ts and ApiDivided in
 *  src/prototype/redesign/polisAdapter.ts). PolisClose.tsx renders these as the
 *  "Where it split" panel (agree-vs-disagree SplitBar + PT SPLIT figure).
 *  Bridges keep their flat `agreementPercent` — the shape the adapter reads for
 *  the common-ground rows. */
/** Per-opinion-group breakdown for the convergence dots + chips. Party-free
 *  (DECISION #116): clusterId 0/1/2 = Group A/B/C (same size-desc ids + colour
 *  tokens the opinion map uses), NEVER D/R/I. Test fixture only. */
type MockClusterAgreement = Array<{
  clusterId: number;
  label: string;
  agreePct: number;
}>;

async function mockBridges(
  page: Page,
  bridges: Array<{
    statement: string;
    agreementPercent: number;
    clusterAgreement?: MockClusterAgreement;
  }>,
  divided: Array<{
    statement: string;
    agreePercent: number;
    disagreePercent: number;
    clusterAgreement?: MockClusterAgreement;
  }> = [],
): Promise<void> {
  await page.route("**/api/polis/bridges?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "state",
        threshold: 200,
        count: bridges.length + divided.length,
        status: bridges.length || divided.length ? "ok" : "no_bridges_yet",
        bridges,
        divided,
      }),
    });
  });
}

/** Build a party-free 3-group breakdown (Group A/B/C) for a statement's
 *  convergence dots + chips. Colours match the map (clusterId 0/1/2 →
 *  --cluster-a/b/c). Test fixture only. */
function groups(a: number, b: number, c: number): MockClusterAgreement {
  return [
    { clusterId: 0, label: "Group A", agreePct: a },
    { clusterId: 1, label: "Group B", agreePct: b },
    { clusterId: 2, label: "Group C", agreePct: c },
  ];
}

/* ---------------------------------------------------------------------------
 * Opinion-map CAPTURE FIXTURE (10c / 10d).
 *
 * The real /api/polis endpoint builds its `clusterMap` from stored
 * `polis_response_vectors` (empty in a fresh capture env → single-cloud
 * fallback). To exercise the real 3-cluster map on the parity gallery we feed
 * the endpoint the SAME algorithm's output over three synthetic archetypal
 * answer-patterns + noise — i.e. this fixture is genuine `assembleClusterMap`
 * output, not hand-drawn dots. Party-free (DECISION #116): neutral Group
 * A/B/C, positions + counts + neutral ids only.
 * --------------------------------------------------------------------------- */
const POLIS_MAP_STATEMENTS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;
const POLIS_ARCHETYPES: Record<
  "A" | "B" | "C",
  Array<"agree" | "disagree" | "pass">
> = {
  A: ["agree", "agree", "disagree", "disagree", "pass", "pass"],
  B: ["disagree", "disagree", "agree", "agree", "pass", "pass"],
  C: ["disagree", "disagree", "disagree", "disagree", "agree", "agree"],
};
function makePolisRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function polisArchetypeRows(
  kind: "A" | "B" | "C",
  n: number,
  rng: () => number,
): ResponseVector[] {
  const base = POLIS_ARCHETYPES[kind];
  const rows: ResponseVector[] = [];
  for (let i = 0; i < n; i++) {
    const v: ResponseVector = {};
    for (let j = 0; j < POLIS_MAP_STATEMENTS.length; j++) {
      let ans = base[j];
      if (rng() < 0.15) {
        const alt = ["agree", "disagree", "pass"] as const;
        ans = alt[Math.floor(rng() * 3)];
      }
      v[POLIS_MAP_STATEMENTS[j]] = ans;
    }
    rows.push(v);
  }
  return rows;
}
/** Deterministic 3-archetype fixture → real assembleClusterMap output. */
const POLIS_CLUSTER_MAP = (() => {
  const rng = makePolisRng(42);
  const vectors = [
    ...polisArchetypeRows("A", 26, rng),
    ...polisArchetypeRows("B", 25, rng),
    ...polisArchetypeRows("C", 17, rng),
  ];
  // A cross-pressured "You" so the marker lands centrally, between the camps.
  const you: ResponseVector = {
    s1: "agree",
    s2: "disagree",
    s3: "agree",
    s4: "disagree",
    s5: "agree",
    s6: "pass",
  };
  return assembleClusterMap(vectors, you, 3);
})();

/**
 * Override /api/polis with a payload carrying the real 3-cluster opinion map.
 * Register AFTER mockPolis so this handler wins (Playwright matches the
 * most-recently-added route first). sampleSize mirrors the canvas's
 * illustrative "12,480 voters" copy; the map dots are the algorithm's output.
 */
async function mockPolisClusterMap(page: Page): Promise<void> {
  await page.route("**/api/polis?*", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope:
          url.searchParams.get("scope") === "national" ? "national" : "state",
        sampleSize: 12480,
        thresholdMet: true,
        dots: [],
        you: null,
        clusterMap: POLIS_CLUSTER_MAP,
        consensus: [],
        overlap: { mostCommon: null, youShares: [] },
        issueRegions: [],
      }),
    });
  });
}

/** Delegation mock whose response is delayed so the LoadingView's checklist
 *  (a self-advancing 600ms/step timer, independent of network timing — see
 *  VoterChoiceApp.tsx's LoadingView) stays on screen long enough to capture. */
async function mockDelegationSlow(page: Page): Promise<void> {
  await page.route("**/api/delegation", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
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

// ---------------------------------------------------------------------------
// Shared interaction primitives
// ---------------------------------------------------------------------------

async function gotoHomeClean(page: Page): Promise<void> {
  await mockChatLocal(page);
  await page.goto("/");
  // Clear BOTH storages, not just localStorage: App2.tsx's SESSION_KEY (in-
  // progress stage/address/verdicts) lives in sessionStorage specifically so
  // it "survives a same-tab reload" (its own comment) — a real product
  // feature for users, but it also means a bare localStorage.clear() here
  // does NOT undo progress within the same Playwright page/tab. Scenarios
  // that call this (or reachWorkspace below) more than once per capture —
  // e.g. 09c-intake-locked / 10a-polis-entry's reachPreLock()/reachAllDone()
  // retry after an irreversible "Lock"/"where you stand" click — need a
  // genuine fresh start, or the address screen never reappears and
  // submitAddress() hangs waiting for a placeholder that's no longer there.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
}

async function submitAddress(page: Page, address = ADDRESS): Promise<void> {
  await page
    .getByPlaceholder("1100 Congress Ave, Austin, TX 78701")
    .fill(address);
  // Match on the visible label only (substring, arrow-agnostic) — some
  // branches render the trailing → as an aria-hidden span, which drops it
  // from the accessible name entirely; "Pull my representatives" is a
  // substring of both variants.
  await page.getByRole("button", { name: "Pull my representatives" }).click();
}

async function reachColdOpen(page: Page): Promise<void> {
  await gotoHomeClean(page);
  await submitAddress(page);
  // getByTestId rather than a literal ".coldopen textarea" class selector —
  // the cold-open shell's wrapper class has been renamed across redesign
  // work (e.g. ".coldopen" → ".iq"); the input's data-testid is the stable
  // contract shared with e2e/helpers/redesign-mocks.ts.
  await page.getByTestId("issue-convo-input").waitFor({ timeout: 15000 });
}

async function sendFirstIssue(page: Page): Promise<void> {
  await page
    .getByTestId("issue-convo-input")
    .fill("Insulin prices are insane and rent went up again.");
  await page.locator("button.send").click();
  await page.getByTestId("issue-themes-card").waitFor({ timeout: 15000 });
}

/** Clicks the conversation's primary "Lock these in" button. Some branches
 *  insert IntakeLocked, a distinct pre-lock confirm interstitial, between
 *  that click and the lock actually taking effect (see
 *  src/prototype/redesign/IntakeLocked.tsx's issue-locked-confirm-btn) —
 *  click through it defensively if it shows up, so this one helper keeps
 *  working unmodified on branches with and without that screen. */
async function lockIssues(page: Page): Promise<void> {
  await page.getByTestId("issue-primary").click();
  const confirmBtn = page.getByTestId("issue-locked-confirm-btn");
  await confirmBtn.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
}

async function waitForCountAtLeast(
  locator: ReturnType<Page["locator"]>,
  n: number,
  timeout = 15000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await locator.count()) >= n) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `timed out waiting for locator count >= ${n} (got ${await locator.count()})`,
  );
}

/** Sends a follow-up turn in whichever issue-conversation is currently on
 *  screen (cold-open or the edit-issues modal — both host the same
 *  IssueConversation component). Gates on the AI reply COUNT increasing
 *  rather than button enabled-state: the send button stays disabled after
 *  sending regardless of busy state (its draft is empty), so "visible"/
 *  "enabled" alone never actually proves the turn resolved. */
async function sendFollowUpIssue(page: Page): Promise<void> {
  const aiMsgs = page.locator('[data-testid="issue-conversation"] .msg.ai');
  const before = await aiMsgs.count();
  await page
    .getByTestId("issue-convo-input")
    .fill("Also — ban congressional stock trading, that really bothers me.");
  await page.getByTestId("issue-convo-send").click();
  await waitForCountAtLeast(aiMsgs, before + 1);
}

async function reachOrientation(page: Page): Promise<void> {
  await reachColdOpen(page);
  await sendFirstIssue(page);
  await lockIssues(page);
  await page.getByTestId("orientation-continue").waitFor({ timeout: 15000 });
}

async function reachWorkspace(page: Page): Promise<void> {
  await mockChatLocal(page);
  await page.goto("/");
  // See gotoHomeClean's comment above: clear sessionStorage too, not just
  // localStorage, so 10a-polis-entry's reachAllDone() retry (called twice in
  // the same capture when PolisEntry isn't merged yet) actually restarts
  // from the address screen instead of resuming the already-completed
  // session.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/");
  await submitAddress(page);
  await page.getByTestId("issue-convo-input").waitFor({ timeout: 15000 });
  await sendFirstIssue(page);
  await lockIssues(page);
  await page.getByTestId("orientation-continue").click({ timeout: 15000 });
  // PR #243 (not yet merged) makes DelegationOverview the default landing
  // screen (App2.tsx's seatOverviewOpen defaults true) instead of landing
  // directly on the single-seat rail — its cards carry a shared
  // data-testid="seat-card" (src/prototype/redesign/DelegationOverview.tsx
  // on that branch). Race both markers rather than a fixed pre-wait, so a
  // branch without the overview pays no extra latency (.b-row just wins the
  // race as before) and a branch with it clicks through the first card
  // before falling through to the same rail wait every scenario expects.
  const seatCard = page.getByTestId("seat-card").first();
  const rail = page.locator(".b-row").first();
  await Promise.race([
    seatCard.waitFor({ timeout: 20000 }),
    rail.waitFor({ timeout: 20000 }),
  ]).catch(() => {});
  if (await seatCard.isVisible().catch(() => false)) {
    await seatCard.click();
  }
  await rail.waitFor({ timeout: 20000 });
}

async function setMoneyDisclosure(page: Page, open: boolean): Promise<void> {
  const toggle = page.locator('[aria-controls^="mt2-"]').first();
  const expanded = await toggle.getAttribute("aria-expanded");
  if ((expanded === "true") !== open) {
    await toggle.click();
    await page.waitForTimeout(200);
  }
}

async function verdictRow(
  page: Page,
  rowIndex: number,
  verdict: "keep" | "replace",
): Promise<void> {
  const rows = page.locator(".b-row");
  await rows.nth(rowIndex).click();
  const btn =
    verdict === "keep"
      ? page.getByRole("button", { name: /Worth keeping/ }).first()
      : page
          .getByRole("button", { name: "Time to replace", exact: true })
          .first();
  await btn.waitFor({ timeout: 15000 });
  await btn.click();
  await page.waitForTimeout(700);
}

// ---------------------------------------------------------------------------
// Scenarios — one per manifest entry, in manifest order.
// ---------------------------------------------------------------------------

export const SCENARIOS: Scenario[] = [
  {
    id: "01-orientation-activated",
    refFile: "01-orientation-activated.png",
    label: "Orientation — OrientationActivated",
    files: ["src/prototype/redesign/App2.tsx", "public/redesign2.css"],
    automatable: "yes",
    note:
      "Reachable directly (lock issues → orientation interstitial). Known confirmed gap " +
      "per HANDOFF-EXACT-MATCH.md §1.1: today's OrientationView is a bare div, no flagbar/" +
      "ori-card/3-step list — the screenshot documents that gap, it is not a tooling limitation.",
    async capture(page) {
      // mockDelegation + mockChatLocal aren't required locally (a dev
      // .env.local's real DATABASE_URL/API creds let the real /api/delegation
      // + /api/chat calls succeed) but CI's dev server has neither, so an
      // unmocked submitAddress() resolves to the "dberror" stage instead of
      // "coldopen" — issue-convo-input then never renders, and this scenario
      // (and 09a/09b/09c, the only other reachColdOpen callers) burn the full
      // 15s waitFor before failing. Every other scenario in this file already
      // mocks delegation before touching the address form; this just matches
      // that pattern instead of relying on real network/DB access.
      await mockDelegation(page);
      await mockChatLocal(page);
      await reachOrientation(page);
    },
  },
  {
    id: "02a-results-main",
    refFile: "02a-results-main.png",
    label: "Results — main review surface",
    files: [
      "src/prototype/redesign/DelegationWorkspace.tsx",
      "src/prototype/redesign/RepCard.tsx",
      "public/redesign2.css",
      "public/candidates.css",
    ],
    automatable: "yes",
    note: "Workspace with the money disclosure explicitly collapsed.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await setMoneyDisclosure(page, false);
    },
  },
  {
    id: "02b-results-funding-expanded",
    refFile: "02b-results-funding-expanded.png",
    label: "Results — funding expanded (FunderBars)",
    files: [
      "src/prototype/redesign/RepCard.tsx",
      "src/prototype/redesign/MoneyGap.tsx",
      "public/redesign2.css",
    ],
    automatable: "yes",
    note: "Money-trail disclosure expanded via its toggle.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await setMoneyDisclosure(page, true);
    },
  },
  {
    id: "02c-results-votes-drilldown",
    refFile: "02c-results-votes-drilldown.png",
    label: "Results — per-issue vote drilldown",
    files: [
      "src/prototype/redesign/RepCard.tsx",
      "src/prototype/VoterChoiceApp.tsx",
    ],
    automatable: "yes",
    note: "Clicks the first scoreable issue row to expand AlignmentDrilldown.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      const row = page
        .locator(
          '[data-testid="voting-record-alignment-row"].has-drill .cv2-iss-head',
        )
        .first();
      await row.waitFor({ timeout: 10000 });
      await row.click();
    },
  },
  {
    id: "02d-results-allvotes-sheet",
    refFile: "02d-results-allvotes-sheet.png",
    label: "Results — see all votes (full record sheet)",
    files: [
      "src/prototype/VoterChoiceApp.tsx",
      "src/prototype/redesign/RepCard.tsx",
    ],
    automatable: "yes",
    note: "Opens the AllVotesPanel overlay via the 'see full record' CTA.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      const cta = page.getByTestId("see-full-record").first();
      await cta.waitFor({ timeout: 10000 });
      await cta.click();
      await page
        .locator(".be-modal-overlay .av-panel")
        .waitFor({ timeout: 5000 });
      // .be-modal-overlay's own `be-fadein` opacity keyframe (public/prototype.css)
      // is a nominal 0.15s, but confirmed by inspecting getComputedStyle directly
      // (elementFromPoint + a parent-chain walk) that the scrim's opacity can
      // still read literally 0 several hundred ms after the .waitFor above
      // resolves in a headless capture, then reads back to 1 by ~3s — a headless-
      // Chromium animation-clock-catchup quirk (the timeline only advances once
      // something forces a real paint), not a real user-facing delay. Without
      // this, a screenshot taken right after the .waitFor lands mid-fade and the
      // Results workspace behind the scrim visibly bleeds through the modal.
      await page.waitForTimeout(1500);
    },
  },
  {
    id: "03-color-bold-flag",
    refFile: "03-color-bold-flag.png",
    label: "Color — Bold Flag palette confirmation",
    files: ["public/redesign2.css"],
    automatable: "proxy",
    note:
      "The canvas artboard is a trimmed side-by-side palette-demo card, not a real app " +
      "screen — there is no equivalent standalone surface in the repo. Proxy: the results " +
      "workspace screenshot (02a), which is where the Bold Flag tokens are actually applied " +
      "in the live app; use it to eyeball the same --brand/--keep/--replace/--gold values.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await setMoneyDisclosure(page, false);
    },
  },
  {
    id: "04-scorecard",
    refFile: "04-scorecard.png",
    label: "Scorecard — printable sheet",
    files: [
      "src/prototype/redesign/ScorecardPrintView.tsx",
      "public/redesign2.css",
    ],
    automatable: "yes",
    note: "Mixed verdicts (one keep, one replace) so both badge treatments render.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await verdictRow(page, 0, "keep");
      await verdictRow(page, 1, "replace");
      await page.getByRole("button", { name: /Print my scorecard/ }).click();
      await page.locator(".print-sheet").waitFor({ timeout: 10000 });
    },
  },
  {
    id: "05a-candidates-parity",
    refFile: "05a-candidates-parity.png",
    label: "Candidates — CandidateParity (unified card)",
    files: ["src/prototype/redesign/RepCard.tsx"],
    automatable: "yes",
    note:
      "Captures the junior-senator seat, which has no DB voting record and renders via the " +
      "research/web_search path (the closest current analog to the canvas's dashed " +
      "'RESEARCHED · CITED' provenance treatment). Repo-wide grep found no ROLL-CALL/CITED " +
      "provenance-badge markup at all — HANDOFF §5 flags the badge distinction as unverified; " +
      "this screenshot is honest evidence either way, not a forced match.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await page.locator(".b-row").nth(2).click();
      await page
        .getByTestId("web-search-alignment-banner")
        .waitFor({ timeout: 15000 });
    },
  },
  {
    id: "05b-headtohead",
    refFile: "05b-headtohead.png",
    label: "Candidates — HeadToHead duel",
    files: [
      "src/prototype/redesign/HeadToHead.tsx",
      "src/prototype/redesign/duelAlignment.ts",
    ],
    automatable: "yes",
    note: "Opens the full-screen duel via 'Time to replace' on the House seat (has 2026 challengers).",
    async capture(page) {
      await mockDelegationWithChallengers(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await page.getByTestId("open-duel").click();
      await page.locator(".cmp").waitFor({ timeout: 10000 });
      await page
        .locator(".cmp-col.ch .cmp-big b")
        .waitFor({ timeout: 10000 })
        .catch(() => {});
    },
  },
  {
    id: "05c-candidates-overview",
    refFile: "05c-candidates-overview.png",
    label:
      "Candidates — DelegationOverview (multi-seat scored cards before drill-down)",
    files: ["src/prototype/redesign/DelegationWorkspace.tsx"],
    automatable: "no",
    note:
      "NOT BUILT on this branch — no repo screenshot possible, not a tooling gap. Today the " +
      "app goes straight to the single-seat deep view (02a-results-main) with no scored " +
      "multi-seat overview screen first. Backlog card 5192287a; being built on PR #243 (not " +
      "merged to main as of this report) — capture() below is a real, PR #243-verified " +
      "sequence (data-testid=\"delegation-overview\"), ready to flip automatable to 'yes'/" +
      "'proxy' once #243 merges. The canvas ref PNG that was previously missing now exists: " +
      "the real design source turned out to live in a different, newer, untracked folder " +
      "(design-handoff/design_handoff_voter_choice_redesign/, not design-handoff/" +
      "keystone-canvas/ which predates this screen) — screens-delegation.jsx's " +
      "DelegationOverview, wired into that folder's own standalone canvas viewer ('Voter " +
      "Choice - Keystone Design Session.html') as the 'dg-overview' artboard. Captured " +
      "2026-07-08 by serving that folder locally and screenshotting the artboard's " +
      '[data-dc-slot="dg-overview"] .dc-card node at 3x (deviceScaleFactor) — the same ' +
      "fidelity as the viewer's own Download-PNG export, just driven headlessly. See " +
      ".keystone-canvas-refs/manifest.json's 05c-candidates-overview entry for what it shows. " +
      "automatable stays 'no' for now — flips to 'yes'/'proxy' once PR #243 merges and the " +
      "delegation-overview testid actually exists on main (same pattern as reachWorkspace()'s " +
      "PR #243 comment above).",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachColdOpen(page);
      await sendFirstIssue(page);
      await lockIssues(page);
      await page.getByTestId("orientation-continue").click({ timeout: 15000 });
      await page.getByTestId("delegation-overview").waitFor({ timeout: 20000 });
    },
  },
  {
    id: "06-homehero",
    refFile: "06-homehero.png",
    label: "Homepage — HomeHero",
    files: [
      "src/prototype/VoterChoiceApp.tsx",
      "src/prototype/redesign/App2.tsx",
    ],
    automatable: "yes",
    note:
      "Fresh home stage, no session. The canvas ref depicts the address field filled and the " +
      "submit CTA in its enabled/navy state (disabled={!addr.trim()} in VoterChoiceApp.tsx " +
      "means an empty field renders the CTA gray) — filled, not clicked, since the artboard is " +
      "still the hero itself, not the loading/results screen submitting would navigate to.",
    async capture(page) {
      await gotoHomeClean(page);
      // The app renders via a client-only next/dynamic bundle (SSR bails out
      // on purpose) — wait for real content, not just the network 'load' event.
      const addressInput = page.getByPlaceholder(
        "1100 Congress Ave, Austin, TX 78701",
      );
      await addressInput.waitFor({ timeout: 15000 });
      await addressInput.fill(ADDRESS);
    },
  },
  {
    id: "07-whynow",
    refFile: "07-whynow.png",
    label: "Why Now — editorial page",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note: "Nav → 'Why now?'.",
    async capture(page) {
      await gotoHomeClean(page);
      await page.getByRole("link", { name: "Why now?" }).click();
    },
  },
  {
    id: "08a-about",
    refFile: "08a-about.png",
    label: "Statics — About",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note: "Nav → 'About'.",
    async capture(page) {
      await gotoHomeClean(page);
      await page.getByRole("link", { name: "About", exact: true }).click();
    },
  },
  {
    id: "08b-howitworks",
    refFile: "08b-howitworks.png",
    label: "Statics — How it works (MethodologyPage)",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note:
      "Nav → 'How it works' (label renamed from 'Methodology' by #213, 2026-07-08 — " +
      "confirmed by reading App2.tsx: it renders the base AppNav, whose link uses " +
      "t('nav.howItWorks') = 'How it works', not AppNavWithChrome's t('nav.methodology'). " +
      "Still navigates to the same methodology stage/MethodologyPage. This scenario used to " +
      "click the old 'Methodology' label and timed out post-rename (Phase 0 finding #8). " +
      "Scoped to the 'Main' nav landmark — the homepage's own address-box copy also contains " +
      "an unrelated 'Read about how it works…' link (dead navigate('howitworks') branch) whose " +
      "accessible name substring-matches 'How it works' too, so an unscoped getByRole hits a " +
      "strict-mode violation (2 matches).",
    async capture(page) {
      await gotoHomeClean(page);
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "How it works" })
        .click();
    },
  },
  {
    id: "08c-privacy",
    refFile: "08c-privacy.png",
    label: "Statics — Privacy",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note: "Nav → 'Privacy'.",
    async capture(page) {
      await gotoHomeClean(page);
      await page.getByRole("link", { name: "Privacy" }).click();
    },
  },
  {
    id: "08d-tipjar",
    refFile: "08d-tipjar.png",
    label: "Statics — Tip jar",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note: "Nav → 'Tip jar'.",
    async capture(page) {
      await gotoHomeClean(page);
      await page.getByRole("link", { name: "Tip jar" }).click();
    },
  },
  {
    id: "08e-loading",
    refFile: "08e-loading.png",
    label: "Statics — Loading state",
    files: ["src/prototype/VoterChoiceApp.tsx"],
    automatable: "yes",
    note:
      "The checklist is a self-advancing 600ms/step client timer, independent of network " +
      "timing — /api/delegation is deliberately delayed ~2.5s so the stage doesn't flip away " +
      "before the screenshot.",
    async capture(page) {
      await mockChatLocal(page);
      await mockDelegationSlow(page);
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/");
      await submitAddress(page);
      await page.locator(".loading-screen").waitFor({ timeout: 5000 });
      await page.waitForTimeout(500);
    },
  },
  {
    id: "09a-intake-ask",
    refFile: "09a-intake-ask.png",
    label: "Intake step 1 — the ask",
    files: [
      "src/prototype/redesign/IntakeView.tsx",
      "src/prototype/redesign/IssueConversation.tsx",
    ],
    automatable: "yes",
    note: "Fresh cold-open, before any message is sent.",
    async capture(page) {
      // See 01-orientation-activated's capture() comment: reachColdOpen
      // needs a delegation mock in any environment without a real DB (CI).
      await mockDelegation(page);
      await reachColdOpen(page);
    },
  },
  {
    id: "09b-intake-propose",
    refFile: "09b-intake-propose.png",
    label: "Intake step 2 — AI proposes + running issues card",
    files: ["src/prototype/redesign/IssueConversation.tsx"],
    automatable: "yes",
    note: "After the first (extraction) turn — 2 starter issues + quick-reply chips.",
    async capture(page) {
      // See 01-orientation-activated's capture() comment: reachColdOpen
      // needs a delegation mock, and sendFirstIssue needs a chat mock, in
      // any environment without real DB/API creds (CI).
      await mockDelegation(page);
      await mockChatLocal(page);
      await reachColdOpen(page);
      await sendFirstIssue(page);
    },
  },
  {
    id: "09c-intake-locked",
    refFile: "09c-intake-locked.png",
    label: "Intake step 3 — ready to lock",
    files: [
      "src/prototype/redesign/IssueConversation.tsx",
      "src/prototype/redesign/App2.tsx",
    ],
    automatable: "proxy",
    note:
      "IntakeLocked.tsx (canvas's distinct pre-lock confirmation screen — green 'Your issues " +
      "are set' banner, editable review card, Back/Continue — data-testid=\"issue-locked-" +
      "confirm-btn\") isn't merged to main yet (PR #236). capture() clicks 'Lock these in' and, " +
      "when that screen appears, stops there to shoot the real thing. Until #236 lands, that " +
      "click completes the lock instantly with no interstitial to hold on (jumps straight to " +
      "orientation) — the click can't be undone, so this rebuilds and stops at the prior proxy " +
      "instead: same UI one turn further (3 issues, after a refinement reply), right before " +
      "clicking Lock.",
    async capture(page) {
      // See 01-orientation-activated's capture() comment: reachColdOpen
      // needs a delegation mock, and sendFirstIssue/sendFollowUpIssue need a
      // chat mock, in any environment without real DB/API creds (CI).
      await mockDelegation(page);
      await mockChatLocal(page);
      const reachPreLock = async () => {
        // App2.tsx persists in-progress state to sessionStorage (not
        // localStorage — see its SESSION_KEY), which gotoHomeClean() never
        // clears; every other scenario only calls it once per fresh page so
        // this never mattered, but a second call here (the redo below) would
        // otherwise resume straight into the stale conversation instead of
        // reaching a clean home page.
        await page.evaluate(() => sessionStorage.clear()).catch(() => {});
        await reachColdOpen(page);
        await sendFirstIssue(page);
        await sendFollowUpIssue(page);
      };
      await reachPreLock();
      await page.getByTestId("issue-primary").click();
      const reachedIntakeLocked = await page
        .getByTestId("issue-locked-confirm-btn")
        .waitFor({ state: "visible", timeout: 2000 })
        .then(() => true)
        .catch(() => false);
      if (!reachedIntakeLocked) {
        await reachPreLock();
      }
    },
  },
  {
    id: "09d-edit-issues",
    refFile: "09d-edit-issues.png",
    label: "Intake step 4 — edit issues from workspace",
    files: [
      "src/prototype/redesign/EditIssuesModal.tsx",
      "src/prototype/redesign/IssueConversation.tsx",
    ],
    automatable: "yes",
    note: "Opens the seeded 'Amend your issues' modal from the scorecard's Edit link, then adds a turn.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataDeltaAware(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await page.getByTestId("edit-issues-scorecard").click();
      await page.getByTestId("edit-issues-modal").waitFor({ timeout: 10000 });
      await sendFollowUpIssue(page);
    },
  },
  {
    id: "09e-edit-rescored",
    refFile: "09e-edit-rescored.png",
    label: "Intake step 5 — apply → re-scored with Revisit flags",
    files: [
      "src/prototype/redesign/IssueDeltaBanner.tsx",
      "src/prototype/redesign/App2.tsx",
      "src/prototype/redesign/DelegationWorkspace.tsx",
    ],
    automatable: "yes",
    note:
      "Race-data mock swings the House score hard (83%→17%) once 'congressional " +
      "accountability' enters the issue list, so Apply produces a real >5pt REVISIT flag " +
      "instead of the flat 'nothing moved' branch.",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataDeltaAware(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await page.getByTestId("edit-issues-scorecard").click();
      await page.getByTestId("edit-issues-modal").waitFor({ timeout: 10000 });
      await sendFollowUpIssue(page);
      await page.getByTestId("issue-primary").click();
      await page.getByTestId("issue-delta-banner").waitFor({ timeout: 15000 });
    },
  },
  {
    id: "10a-polis-entry",
    refFile: "10a-polis-entry.png",
    label: "Polis — entry point",
    files: [
      "src/prototype/redesign/DelegationWorkspace.tsx",
      "src/prototype/redesign/App2.tsx",
    ],
    automatable: "no",
    note:
      "NOT AUTOMATABLE: PolisEntry.tsx (canvas's dedicated invite/preview screen — " +
      'data-testid="polis-entry-see-standing") isn\'t merged to main yet (PR #237); it ' +
      "replaces today's inline '.all-done … where you stand' link, which currently jumps " +
      "straight to the standing report with no interstitial. A prior 'proxy' capture stopped " +
      "at that unclicked link instead and pixel-diffed it against the real PolisEntry canvas " +
      "ref — a screen it never actually reaches — which silently false-passed (STOP-SHIP " +
      "2026-07-09 finding). Genuinely not gradable until #237 lands.",
  },
  {
    id: "10b-polis-contribute",
    refFile: "10b-polis-contribute.png",
    label: "Polis — contribute (blind voting)",
    files: [],
    automatable: "no",
    note:
      "NOT AUTOMATABLE: no such UI exists in the app to screenshot. Read src/prototype/redesign/" +
      "PolisClose.tsx in full and grepped the repo for Agree/Disagree/Pass/PolisStand-style " +
      "markup — the current Polis feature is a passive aggregate REPORT only (opinion-map + " +
      "common-ground bridges), fed by server-side counters; there is no per-statement blind " +
      "agree/disagree/pass voting surface anywhere in the codebase. This is a missing feature, " +
      "not a missing test hook — capturing anything here would misrepresent the app.",
  },
  {
    id: "10c-polis-report-consensus",
    refFile: "10c-polis-report-consensus.png",
    label: "Polis — report, common-ground state",
    files: [
      "src/prototype/redesign/PolisClose.tsx",
      "src/prototype/redesign/polisAdapter.ts",
    ],
    automatable: "yes",
    note:
      "Bridges mock returns several high-agreement statements → 'Common ground' panel renders " +
      "populated, plus one divided statement → 'Where it split' renders too (the realistic " +
      "'mostly consensus, some friction' mix). Bridges/divided rendering is real content today; " +
      "PolisClose.tsx doesn't consume the divided field yet (PR #240, not merged) so that " +
      "second panel doesn't show on main until then — see STRUCTURAL_WAIVERS in parity-gate.ts " +
      "for why the residual visual diff is expected either way (DECISION #116, party-free).",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page, true);
      await mockBridges(
        page,
        // Common ground: per-group dots CONVERGE (all three groups near the
        // population headline) — that's what makes it a genuine bridge.
        [
          {
            statement: "Congress should cap prescription drug price increases.",
            agreementPercent: 86,
            clusterAgreement: groups(88, 83, 87),
          },
          {
            statement: "Federal spending needs independent audits every year.",
            agreementPercent: 79,
            clusterAgreement: groups(81, 76, 80),
          },
          {
            statement:
              "Members of Congress should not trade individual stocks.",
            agreementPercent: 71,
            clusterAgreement: groups(73, 68, 72),
          },
          {
            statement:
              "Rent assistance should scale with local cost of living.",
            agreementPercent: 82,
            clusterAgreement: groups(84, 79, 83),
          },
        ],
        // The lone divided row: groups SPREAD apart.
        [
          {
            statement: "Congress should raise the federal minimum wage.",
            agreePercent: 52,
            disagreePercent: 41,
            clusterAgreement: groups(74, 31, 52),
          },
        ],
      );
      await mockCounters(page);
      await mockPolisClusterMap(page);
      await reachWorkspace(page);
      await goToStanding(page);
      await page.locator(".polis").waitFor({ timeout: 10000 });
    },
  },
  {
    id: "10d-polis-report-divided",
    refFile: "10d-polis-report-divided.png",
    label: "Polis — report, divided/no-common-ground state",
    files: [
      "src/prototype/redesign/PolisClose.tsx",
      "src/prototype/redesign/polisAdapter.ts",
    ],
    automatable: "proxy",
    note:
      "PolisClose has no computed 'divided/split' branch yet (PR #240, not merged to main — " +
      "only an early-days vs. normal lede, toggled purely by sampleSize<30, see LOW_N in " +
      "PolisClose.tsx). Bridges mock now returns zero bridges + several real divided " +
      "statements — on #240 this renders the true 'genuinely split' branch (no Common ground " +
      "panel, 'Where it split' populated instead); on main today it exercises the existing " +
      "bridges.length===0 fallback (the 'big stat panel' branch) since divided isn't read yet. " +
      "Proxy until #240 lands. See STRUCTURAL_WAIVERS in parity-gate.ts for why the residual " +
      "visual diff is expected either way (DECISION #116, party-free).",
    async capture(page) {
      await mockDelegation(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page, true);
      await mockBridges(
        page,
        [],
        // Every row here is genuinely split: the per-group dots SPREAD far
        // apart (one group high, another low) — that spread is the divide.
        [
          {
            statement: "Federal spending should be cut across the board.",
            agreePercent: 58,
            disagreePercent: 34,
            clusterAgreement: groups(79, 28, 52),
          },
          {
            statement: "Congress should raise the federal minimum wage.",
            agreePercent: 43,
            disagreePercent: 54,
            clusterAgreement: groups(22, 71, 44),
          },
          {
            statement:
              "The federal government should fund more affordable housing.",
            agreePercent: 38,
            disagreePercent: 57,
            clusterAgreement: groups(18, 66, 40),
          },
        ],
      );
      await mockCounters(page);
      await mockPolisClusterMap(page);
      await reachWorkspace(page);
      await goToStanding(page);
      await page.locator(".polis").waitFor({ timeout: 10000 });
    },
  },
  {
    id: "11a-fieldmoneygap",
    refFile: "11a-fieldmoneygap.png",
    label: "Money-gap — whole field on one scale",
    files: [
      "src/prototype/redesign/MoneyGap.tsx",
      "src/prototype/redesign/peerComparison.ts",
    ],
    automatable: "no",
    note:
      "NOT AUTOMATABLE: the canvas's 'whole field' (3+ candidates on one scale) is not wired — " +
      "confirmed by reading RepCard.tsx: it calls <MoneyGapScale subject=... peer=...> WITHOUT " +
      "a `field` prop, so only the single subject row ever renders in the card. A prior 'proxy' " +
      "capture reused 02b's single-subject funding-expanded panel and pixel-diffed it against " +
      "the real whole-field canvas ref — a structurally different screen — which silently " +
      "false-passed (STOP-SHIP 2026-07-09 finding). Genuinely not gradable until the field prop " +
      "is wired.",
  },
  {
    id: "11b-scalestates",
    refFile: "11b-scalestates.png",
    label: "Money-gap — reading the scale, 4 states + honest blank",
    files: [
      "src/prototype/redesign/MoneyGap.tsx",
      "src/prototype/redesign/peerComparison.ts",
    ],
    automatable: "no",
    note:
      "NOT AUTOMATABLE: the canvas artboard is a style-guide-style enumeration of 4 states + " +
      "the collapsed chip side by side — there is no single app screen that shows all of them " +
      "at once (the real app renders whichever ONE band the data produces per card). A prior " +
      "'proxy' capture reused 02b/11a's single-band funding-expanded panel and pixel-diffed it " +
      "against the real 4-state enumeration canvas ref — a structurally different screen — " +
      "which silently false-passed (STOP-SHIP 2026-07-09 finding). Genuinely not gradable as a " +
      "single screenshot.",
  },
  {
    id: "11c-moneygaph2h",
    refFile: "11c-moneygaph2h.png",
    label: "Money-gap — in the head-to-head",
    files: [
      "src/prototype/redesign/MoneyGap.tsx",
      "src/prototype/redesign/HeadToHead.tsx",
    ],
    automatable: "proxy",
    note:
      "MoneyGapH2H (exported from MoneyGap.tsx) is not wired into HeadToHead.tsx at all — " +
      "confirmed by grep: it has zero usages outside MoneyGap.tsx/MoneyGap.test.tsx. The duel " +
      "screen's actual money treatment is a simpler PAC-percentage footnote (.cmp-fund), not " +
      "the ratio + shared-scale component the canvas shows. Proxy: same HeadToHead screenshot " +
      "as 05b, so the gap is visible rather than hidden.",
    async capture(page) {
      await mockDelegationWithChallengers(page);
      await mockSeatRaceDataMedian(page);
      await mockResearch(page);
      await mockPolis(page);
      await mockCounters(page);
      await reachWorkspace(page);
      await page.getByTestId("open-duel").click();
      await page.locator(".cmp").waitFor({ timeout: 10000 });
    },
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

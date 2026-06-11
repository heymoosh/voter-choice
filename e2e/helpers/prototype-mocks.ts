// Shared Playwright mocks + fixtures for the SHIPPED prototype (src/prototype/VoterChoiceApp.tsx).
//
// The prototype's data seam is src/prototype/realData.ts, which calls:
//   POST /api/civic              → ballot races (or empty → upload/paste flow)
//   POST /api/race-data          → { racePatterns, alignmentScores } (card alignment + funding)
//   POST /api/research-candidate → { scores } web-research fallback for no-record candidates
//   POST /api/chat               → SSE per-race Q&A (not exercised by the core path)
//   POST /api/extract-ballot     → uploaded ballot → races (measure body text)
//
// These helpers install deterministic page.route mocks so the suite never hits the
// network. Shapes mirror src/prototype/data.tsx (RACE_PATTERNS / ALIGNMENT_SCORES) and
// src/lib/structured-blocks.ts. Race ids are makeRaceId(office,district) — lowercased,
// non-alphanumerics → "-" — computed verbatim here to avoid importing app code into e2e.

import { type Page } from "@playwright/test";

/** Mirror of raceDeriver.makeRaceId (kept local so e2e doesn't import the app graph). */
export function raceId(office: string, district = ""): string {
  const raw = `${office} ${district}`.toLowerCase().trim();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "race";
}

// PRESET_ISSUES canonical issues (from data.tsx) — cold-open "show me an example" sets these,
// so mock alignment scores must key on the same canonicalIssue to render aligned rows.
export const ISSUE = {
  healthcare: "healthcare_affordability",
  housing: "housing_affordability",
  accountability: "congressional_accountability",
} as const;

type Json = Record<string, unknown>;

/** POST /api/civic → contests (drives address → cold-open → workspace). */
export async function mockCivic(
  page: Page,
  contests: Array<{
    office: string;
    district?: string;
    candidates: { name: string; party: string }[];
  }>,
  county = "Essex County, NJ",
): Promise<void> {
  await page.route("**/api/civic", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contests,
        county,
        normalizedAddress: "50 Park Pl, Newark, NJ 07102",
        pollingLocations: [],
      }),
    });
  });
}

/** POST /api/civic → NO contests (drives the upload/paste "sample ballot needed" flow). */
export async function mockCivicEmpty(
  page: Page,
  county = "Essex County, NJ",
): Promise<void> {
  await page.route("**/api/civic", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contests: [],
        county,
        normalizedAddress: "50 Park Pl, Newark, NJ 07102",
      }),
    });
  });
}

/** POST /api/race-data → { racePatterns, alignmentScores } keyed by the requested raceId. */
export async function mockRaceData(
  page: Page,
  byRaceId: Record<string, Json>,
): Promise<void> {
  await page.route("**/api/race-data", async (route) => {
    const body = route.request().postDataJSON() as { raceId?: string };
    const data = (body?.raceId && byRaceId[body.raceId]) || {
      racePatterns: null,
      alignmentScores: null,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}

/** POST /api/research-candidate → web-research fallback scores (no-record candidates). */
export async function mockResearchCandidate(
  page: Page,
  result: Json,
): Promise<void> {
  await page.route("**/api/research-candidate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
}

/** Cold-open theme-extraction SSE: a JSON theme array (with canonical ids so the
 *  locked issues score) wrapped in the chat route's SSE frames. */
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

/** POST /api/chat → SSE. The cold-open issue-extraction call (its systemPrompt
 *  asks the model to "extract civic themes") gets a theme JSON array; every other
 *  call (the per-race Q&A) gets a minimal reply so it never hits the real model. */
export async function mockChat(page: Page): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    const sysPrompt =
      (route.request().postDataJSON() as { systemPrompt?: string })
        ?.systemPrompt || "";
    const body = sysPrompt.includes("extract civic themes")
      ? THEME_EXTRACTION_SSE
      : 'data: {"type":"text","text":"(mocked reply)"}\n\ndata: {"type":"done"}\n\n';
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });
}

/** POST /api/extract-ballot → uploaded-ballot extraction (measure body text path). */
export async function mockExtractBallot(
  page: Page,
  extraction: Json,
): Promise<void> {
  await page.route("**/api/extract-ballot", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(extraction),
    });
  });
}

/* ───────────────────────── Fixtures ───────────────────────── */

export const SENATE_OFFICE = "U.S. Senate";
export const SENATE_ID = raceId(SENATE_OFFICE);
export const JUDICIAL_OFFICE = "Justice Jane Doe — Retention";
export const JUDICIAL_ID = raceId(JUDICIAL_OFFICE);

/** Civic contests: a candidate race (Senate) + a judicial-retention question. */
export const NJ_CONTESTS = [
  {
    office: SENATE_OFFICE,
    district: "",
    candidates: [
      { name: "Cory Booker", party: "Democratic" },
      { name: "Curtis Bashaw", party: "Republican" },
    ],
  },
  {
    office: JUDICIAL_OFFICE,
    district: "",
    candidates: [] as { name: string; party: string }[],
  },
];

/** race-data for the Senate race: Booker = voting record + full funding; Bashaw = no record
 *  (→ research fallback) + funding honesty fallback (donorUnavailable). */
export const SENATE_RACE_DATA = {
  racePatterns: {
    race: SENATE_OFFICE,
    candidates: [
      {
        id: "booker",
        name: "Cory Booker",
        incumbent: true,
        priorRole: "U.S. Senator since 2013",
        platformAlignment: { kept: 11, total: 18 },
        donorCoalition: [
          { label: "Small donors", percent: 60, amount: 8160000 },
          { label: "Large donors", percent: 37, amount: 5032000 },
          { label: "PACs", percent: 4, amount: 408000 },
        ],
        donorDataSource: "voting_record",
        totalRaised: 13600000,
        donorSource: {
          name: "FEC · OpenSecrets",
          url: "https://www.opensecrets.org",
        },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        fundingMix: {
          small: 60,
          large: 37,
          pac: 4,
          total: 13600000,
          cycle: "2026 cycle",
        },
      },
      {
        id: "bashaw",
        name: "Curtis Bashaw",
        incumbent: false,
        priorRole: "Hotel developer · first-time federal candidate",
        platformAlignment: null,
        donorCoalition: null,
        donorUnavailable: { reason: "Sector breakdown not available" },
        donorDataSource: "voting_record",
        totalRaised: 2100000,
        donorSource: { name: "FEC", url: "https://www.fec.gov" },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        fundingMix: null,
      },
    ],
  },
  alignmentScores: {
    race: SENATE_OFFICE,
    entries: [
      {
        candidateId: "booker",
        scores: [
          {
            canonicalIssue: ISSUE.healthcare,
            issueLabel: "Lower insulin & drug prices",
            resolvedStance:
              "favors lower drug prices and Medicare drug-price negotiation",
            sourceType: "voting_record",
            kept: 11,
            total: 18,
            contributingVotes: [],
          },
          {
            canonicalIssue: ISSUE.housing,
            issueLabel: "Stronger rent + cost-of-living protections",
            resolvedStance: "favors stronger rent protections",
            sourceType: "voting_record",
            kept: 1,
            total: 2,
            contributingVotes: [],
          },
        ],
      },
      // No legislative record → triggers the /api/research-candidate web-search fallback.
      {
        candidateId: "bashaw",
        scores: null,
        unavailable: { reason: "research_pending" },
      },
    ],
  },
};

/** /api/research-candidate response for the no-record candidate (web_search scores). */
export const RESEARCH_RESULT = {
  scores: [
    {
      canonicalIssue: ISSUE.healthcare,
      issueLabel: "Lower insulin & drug prices",
      resolvedStance: "supports importing lower-cost prescription drugs",
      sourceType: "web_search",
      confidence: "medium",
      evidence: [
        {
          summary: "Campaign site policy page on drug costs",
          url: "https://example.org/policy",
        },
      ],
    },
  ],
};

/** /api/extract-ballot extraction carrying a ballot measure with verbatim body text. */
export const MEASURE_BODY_TEXT =
  "Shall the New Jersey Constitution be amended to dedicate sports-wagering revenue to property-tax relief for senior and disabled residents?";
export const EXTRACTION_WITH_MEASURE = {
  election_metadata: {
    jurisdiction: "Essex County, New Jersey",
    election_type: "general",
  },
  _meta: { low_confidence: false },
  sections: [
    {
      section_name: "Ballot Measures",
      races: [
        {
          office: "Ballot Measure 1",
          party_context: null,
          candidates: [],
          measure_text: MEASURE_BODY_TEXT,
        },
      ],
    },
  ],
};

/** Civic contests with only a judicial-retention question (active immediately in the workspace). */
export const JUDICIAL_ONLY_CONTESTS = [
  {
    office: JUDICIAL_OFFICE,
    district: "",
    candidates: [] as { name: string; party: string }[],
  },
];

/** Install the standard mock set for the civic → workspace happy path. */
export async function installCoreMocks(page: Page): Promise<void> {
  await mockChat(page);
  await mockResearchCandidate(page, RESEARCH_RESULT);
  await mockRaceData(page, { [SENATE_ID]: SENATE_RACE_DATA });
  await mockCivic(page, NJ_CONTESTS);
}

/**
 * Drive the prototype from the landing page to the workspace:
 * address → Pull my representatives → cold-open "show me an example" → Send → Lock these in.
 * Assumes mocks are already installed. Leaves the page on the workspace.
 */
export async function gotoWorkspace(
  page: Page,
  untilTestId = "candidate-card",
): Promise<void> {
  await page.goto("/");
  await page
    .getByPlaceholder(/1600 Pennsylvania/i)
    .fill("50 Park Pl, Newark, NJ 07102");
  await page.getByRole("button", { name: /Pull my representatives/i }).click();
  // Cold-open: deterministic sample → preset issues → lock.
  await completeColdOpenAndLock(page);
  // Workspace mounts with the requested surface (candidate card / proposition / measure).
  await page
    .getByTestId(untilTestId)
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
}

/** Cold-open: "show me an example" → Send → wait for preset issues → "Lock these in". */
export async function completeColdOpenAndLock(page: Page): Promise<void> {
  await page.getByRole("button", { name: /show me an example/i }).click();
  await page.getByRole("button", { name: /^Send/i }).click();
  await page.getByRole("button", { name: /Lock these in/i }).click();
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks: keep the route logic in focus (origin gate, spend gate, budget gate)
// without touching Anthropic, the DB, or the durable store.
// ---------------------------------------------------------------------------
vi.mock("../../../lib/server/race-data-rate-limit", () => ({
  checkRaceDataRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../../lib/server/research-spend-limit", () => ({
  checkResearchSpendLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../../lib/server/budget", () => ({
  getBudgetStatusAsync: vi.fn().mockResolvedValue({ tier: "healthy" }),
}));
vi.mock("../../../lib/server/candidate-data", () => ({
  researchAndPersistCandidate: vi.fn(),
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

import { POST } from "./route";
import { checkRaceDataRateLimit } from "../../../lib/server/race-data-rate-limit";
import { checkResearchSpendLimit } from "../../../lib/server/research-spend-limit";
import { getBudgetStatusAsync } from "../../../lib/server/budget";
import { researchAndPersistCandidate } from "../../../lib/server/candidate-data";

const mockedRateLimit = vi.mocked(checkRaceDataRateLimit);
const mockedSpend = vi.mocked(checkResearchSpendLimit);
const mockedBudget = vi.mocked(getBudgetStatusAsync);
const mockedResearch = vi.mocked(researchAndPersistCandidate);

function researchRequest(body: unknown, origin = "https://example.test") {
  return new NextRequest("https://example.test/api/research-candidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "example.test",
      origin,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  candidateName: "Jane Doe",
  jurisdiction: "county-nj",
  cycle: "2026",
  issues: [{ canonicalIssue: "healthcare_affordability" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockResolvedValue(true);
  mockedSpend.mockResolvedValue(true);
  mockedBudget.mockResolvedValue({ tier: "healthy" } as never);
  mockedResearch.mockResolvedValue([]);
  vi.stubEnv("ANTHROPIC_VOTER_API", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/research-candidate", () => {
  it("rejects a cross-origin POST with 403 (matches sibling AI routes)", async () => {
    const response = await POST(
      researchRequest(validBody, "https://evil.test"),
    );
    expect(response.status).toBe(403);
    // No billable work should even be attempted on a rejected origin.
    expect(mockedResearch).not.toHaveBeenCalled();
  });

  it("denies with 429 when the per-caller spend limit is unavailable (fail closed)", async () => {
    mockedSpend.mockResolvedValue(false);
    const response = await POST(researchRequest(validBody));
    expect(response.status).toBe(429);
    expect(mockedResearch).not.toHaveBeenCalled();
  });

  it("runs research on a valid same-origin request under the spend cap", async () => {
    mockedResearch.mockResolvedValue([
      {
        canonicalIssue: "healthcare_affordability",
        issueLabel: "Healthcare Affordability",
        resolvedStance: "in_favor",
        sourceType: "web_search",
        confidence: "high",
        evidence: [{ summary: "x", url: "https://a.com" }],
      },
    ]);
    const response = await POST(researchRequest(validBody));
    expect(response.status).toBe(200);
    expect(mockedResearch).toHaveBeenCalledTimes(1);
  });
});

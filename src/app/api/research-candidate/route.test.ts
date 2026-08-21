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
// Preserve the real APIError class (via importActual) so the route's
// `instanceof Anthropic.APIError` branch remains exercisable, same approach
// as the chat route's test — see src/app/api/chat/route.test.ts.
vi.mock("@anthropic-ai/sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@anthropic-ai/sdk")>(
      "@anthropic-ai/sdk",
    );
  function AnthropicCtor() {
    return {};
  }
  (AnthropicCtor as unknown as { APIError: unknown }).APIError =
    actual.default.APIError;
  return { default: AnthropicCtor };
});

import { POST } from "./route";
import { checkRaceDataRateLimit } from "../../../lib/server/race-data-rate-limit";
import { checkResearchSpendLimit } from "../../../lib/server/research-spend-limit";
import { getBudgetStatusAsync } from "../../../lib/server/budget";
import { researchAndPersistCandidate } from "../../../lib/server/candidate-data";
// Runtime (not type-only) import of the mocked SDK — needed to build real
// Anthropic.APIError instances via APIError.generate() for the
// upstream-account-exhaustion test below.
import AnthropicSDK from "@anthropic-ai/sdk";

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

  // -------------------------------------------------------------------------
  // Upstream account-level exhaustion — same detector /api/chat uses. Before
  // this, an account-level Anthropic block here was indistinguishable from
  // any other research failure: both fell into the generic RESEARCH_ERROR
  // 502, hiding a sustained shared-key block behind a plain retry-me error.
  // -------------------------------------------------------------------------
  describe("upstream account-level exhaustion", () => {
    /** Build a real Anthropic.APIError via the SDK's own `.generate()`. */
    function apiError(
      status: number,
      errorBody: { type?: string; message?: string; details?: unknown },
      headers: Record<string, string> = {},
    ): Error {
      return (
        AnthropicSDK as unknown as {
          APIError: { generate: (...args: unknown[]) => Error };
        }
      ).APIError.generate(
        status,
        { type: "error", error: errorBody, request_id: "req_test" },
        undefined,
        headers,
      );
    }

    it("returns the shared 503 BUDGET_UPSTREAM_EXHAUSTED payload for a sustained account-level block", async () => {
      mockedResearch.mockRejectedValue(
        apiError(429, {
          type: "rate_limit_error",
          message: "You have reached your API usage limits.",
          details: { error_code: "enforced_spend_limit_reached" },
        }),
      );

      const response = await POST(researchRequest(validBody));

      expect(response.status).toBe(503);
      const body = (await response.json()) as { code?: string };
      expect(body.code).toBe("BUDGET_UPSTREAM_EXHAUSTED");
    });

    it("still returns the plain RESEARCH_ERROR 502 for an ordinary failure", async () => {
      mockedResearch.mockRejectedValue(new Error("boom"));

      const response = await POST(researchRequest(validBody));

      expect(response.status).toBe(502);
      const body = (await response.json()) as { code?: string };
      expect(body.code).toBe("RESEARCH_ERROR");
    });
  });
});

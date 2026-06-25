/**
 * Unit tests for chat-usage-metrics.ts
 *
 * Tests:
 *  1. estimateHaikuCostUsd — cost computation for various usage shapes
 *  2. buildMetricsRow — row mapping + NO identifier assertion
 *
 * No live DB, no network. All tests are pure (no I/O).
 * DB modules are mocked so the test runs without node_modules in the worktree.
 */

import { describe, it, expect, vi } from "vitest";

// Mock DB dependencies before importing the module under test.
// chat-usage-metrics.ts imports db/client and db/schema; both transitively
// require drizzle-orm which is unavailable in a bare worktree.
vi.mock("../../../db/client", () => ({
  getDb: vi.fn(() => "DB_NOT_CONFIGURED"),
  DB_NOT_CONFIGURED: "DB_NOT_CONFIGURED",
}));
vi.mock("../../../db/schema", () => ({
  chatUsageMetrics: {},
}));

import {
  estimateHaikuCostUsd,
  buildMetricsRow,
  HAIKU_4_5_RATES,
} from "./chat-usage-metrics";

// ---------------------------------------------------------------------------
// estimateHaikuCostUsd
// ---------------------------------------------------------------------------

describe("estimateHaikuCostUsd", () => {
  it("returns 0 for all-zero usage", () => {
    expect(
      estimateHaikuCostUsd({
        inputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
        webSearchCount: 0,
      }),
    ).toBe(0);
  });

  it("computes input-only cost correctly", () => {
    // 1M input tokens @ $1.00/MTok = $1.00
    const cost = estimateHaikuCostUsd({
      inputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(1.0, 6);
  });

  it("computes output-only cost correctly", () => {
    // 1M output tokens @ $5.00/MTok = $5.00
    const cost = estimateHaikuCostUsd({
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1_000_000,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(5.0, 6);
  });

  it("computes cache write cost correctly", () => {
    // 1M cache_write tokens @ $1.25/MTok = $1.25
    const cost = estimateHaikuCostUsd({
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 1_000_000,
      outputTokens: 0,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(1.25, 6);
  });

  it("computes cache read cost correctly", () => {
    // 1M cache_read tokens @ $0.10/MTok = $0.10
    const cost = estimateHaikuCostUsd({
      inputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 0,
      outputTokens: 0,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(0.1, 6);
  });

  it("computes web search cost correctly", () => {
    // 3 searches @ $0.01/search = $0.03
    const cost = estimateHaikuCostUsd({
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      webSearchCount: 3,
    });
    expect(cost).toBeCloseTo(0.03, 6);
  });

  it("computes a typical cold (no-cache) call correctly", () => {
    // 2,000 input + 500 output, no cache, no web search
    // = (2000/1e6)*1.0 + (500/1e6)*5.0
    // = 0.002 + 0.0025
    // = 0.0045
    const cost = estimateHaikuCostUsd({
      inputTokens: 2_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 500,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(0.0045, 6);
  });

  it("cache-heavy shape (June-21 style): mostly cache reads → low cost vs uncached", () => {
    // June-21 spike shape: large system prompt cached, small fresh input, mid output.
    // 200 fresh input + 180,000 cache_read + 5,000 cache_write + 800 output + 0 search
    // Expected:
    //   input:       (200/1e6)*1.00    = 0.0002
    //   cacheRead:   (180000/1e6)*0.10 = 0.018
    //   cacheWrite:  (5000/1e6)*1.25   = 0.00625
    //   output:      (800/1e6)*5.00    = 0.004
    //   total = 0.02845
    // Compare: if those 180k cache reads were fresh input at $1/MTok → adds $0.18 more
    const cost = estimateHaikuCostUsd({
      inputTokens: 200,
      cacheReadTokens: 180_000,
      cacheWriteTokens: 5_000,
      outputTokens: 800,
      webSearchCount: 0,
    });
    expect(cost).toBeCloseTo(0.02845, 6);
    // Cache reads at $0.10/MTok are 10× cheaper than uncached input at $1.00/MTok
    const uncachedEquivalent = estimateHaikuCostUsd({
      inputTokens: 200 + 180_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 5_000,
      outputTokens: 800,
      webSearchCount: 0,
    });
    // Cache version must be cheaper than uncached equivalent
    expect(cost).toBeLessThan(uncachedEquivalent);
  });

  it("handles web search on top of a typical call", () => {
    // 1,000 input + 400 output + 2 searches
    // = (1000/1e6)*1.0 + (400/1e6)*5.0 + 2*0.01
    // = 0.001 + 0.002 + 0.02
    // = 0.023
    const cost = estimateHaikuCostUsd({
      inputTokens: 1_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 400,
      webSearchCount: 2,
    });
    expect(cost).toBeCloseTo(0.023, 6);
  });

  it("result is rounded to 8 decimal places", () => {
    const cost = estimateHaikuCostUsd({
      inputTokens: 1,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1,
      webSearchCount: 0,
    });
    // Should not have more than 8 significant decimal digits
    const str = cost.toString();
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(8);
  });

  it("rates constant matches documented Haiku 4.5 pricing", () => {
    expect(HAIKU_4_5_RATES.inputPerMTok).toBe(1.0);
    expect(HAIKU_4_5_RATES.outputPerMTok).toBe(5.0);
    expect(HAIKU_4_5_RATES.cacheWritePerMTok).toBe(1.25);
    expect(HAIKU_4_5_RATES.cacheReadPerMTok).toBe(0.1);
    expect(HAIKU_4_5_RATES.webSearchPerRequest).toBe(0.01);
  });
});

// ---------------------------------------------------------------------------
// buildMetricsRow — row mapping + NO identifier assertion
// ---------------------------------------------------------------------------

describe("buildMetricsRow", () => {
  const sampleUsage = {
    inputTokens: 1000,
    cacheReadTokens: 500,
    cacheWriteTokens: 200,
    outputTokens: 300,
    webSearchCount: 1,
  };

  it("maps usage fields onto the row correctly", () => {
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
    });
    expect(row.model).toBe("claude-haiku-4-5-20251001");
    expect(row.callKind).toBe("chat"); // default
    expect(row.inputTokens).toBe(1000);
    expect(row.cacheReadTokens).toBe(500);
    expect(row.cacheWriteTokens).toBe(200);
    expect(row.outputTokens).toBe(300);
    expect(row.webSearchCount).toBe(1);
  });

  it("accepts an explicit callKind", () => {
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
      callKind: "research",
    });
    expect(row.callKind).toBe("research");
  });

  it("estimatedCostUsd is a valid numeric string", () => {
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
    });
    expect(typeof row.estimatedCostUsd).toBe("string");
    expect(Number.isFinite(parseFloat(row.estimatedCostUsd))).toBe(true);
  });

  it("estimatedCostUsd matches estimateHaikuCostUsd output", () => {
    const expected = estimateHaikuCostUsd(sampleUsage);
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
    });
    expect(parseFloat(row.estimatedCostUsd)).toBeCloseTo(expected, 8);
  });

  // -------------------------------------------------------------------------
  // PRIVACY ASSERTION: the row shape must contain NO identifier fields.
  // This is a structural test — if anyone adds a session id, IP, user id,
  // or free-text field the test will fail, catching the regression.
  // -------------------------------------------------------------------------
  it("row contains NO identifier fields (session id / IP / user id / address / prompt text)", () => {
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
    });

    const IDENTIFIER_KEYS = [
      "sessionId",
      "session_id",
      "ip",
      "ipAddress",
      "ip_address",
      "userId",
      "user_id",
      "address",
      "prompt",
      "promptText",
      "prompt_text",
      "messageContent",
      "message_content",
      "requestBody",
      "request_body",
      "email",
      "name",
      "phone",
    ];

    const rowKeys = Object.keys(row);
    for (const banned of IDENTIFIER_KEYS) {
      expect(rowKeys).not.toContain(banned);
    }
  });

  it("row contains exactly the expected columns and no others", () => {
    const row = buildMetricsRow(sampleUsage, {
      model: "claude-haiku-4-5-20251001",
    });
    const keys = Object.keys(row).sort();
    expect(keys).toEqual(
      [
        "model",
        "callKind",
        "inputTokens",
        "cacheReadTokens",
        "cacheWriteTokens",
        "outputTokens",
        "webSearchCount",
        "estimatedCostUsd",
      ].sort(),
    );
  });
});

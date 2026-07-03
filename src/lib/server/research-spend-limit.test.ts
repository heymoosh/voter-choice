import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the durable store so we can drive the configured/unconfigured/erroring
// branches deterministically.
vi.mock("./durable-store", () => ({
  isDurableStoreConfigured: vi.fn(),
  redisCommand: vi.fn(),
}));

import { isDurableStoreConfigured, redisCommand } from "./durable-store";
import {
  checkResearchSpendLimit,
  _resetResearchSpendLimitForTesting,
  MAX_RESEARCH_PER_IP_PER_HOUR,
} from "./research-spend-limit";

const mockedConfigured = vi.mocked(isDurableStoreConfigured);
const mockedRedis = vi.mocked(redisCommand);

beforeEach(() => {
  vi.clearAllMocks();
  _resetResearchSpendLimitForTesting();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkResearchSpendLimit", () => {
  it("FAILS CLOSED: denies when the durable limit is unavailable (Redis error)", async () => {
    mockedConfigured.mockReturnValue(true);
    mockedRedis.mockRejectedValue(new Error("redis down"));
    // A billable spend must never be allowed when the limit can't be enforced.
    expect(await checkResearchSpendLimit("1.2.3.4")).toBe(false);
  });

  it("allows requests under the durable per-IP cap", async () => {
    mockedConfigured.mockReturnValue(true);
    mockedRedis.mockResolvedValue(1 as never);
    expect(await checkResearchSpendLimit("1.2.3.4")).toBe(true);
  });

  it("denies once the durable per-IP cap is exceeded", async () => {
    mockedConfigured.mockReturnValue(true);
    mockedRedis.mockResolvedValue((MAX_RESEARCH_PER_IP_PER_HOUR + 1) as never);
    expect(await checkResearchSpendLimit("1.2.3.4")).toBe(false);
  });

  it("uses the in-memory fallback when no durable store is configured", async () => {
    mockedConfigured.mockReturnValue(false);
    // First N calls allowed, then denied — a real (per-instance) cap, not open.
    let allowed = 0;
    for (let i = 0; i < MAX_RESEARCH_PER_IP_PER_HOUR + 2; i++) {
      if (await checkResearchSpendLimit("9.9.9.9")) allowed++;
    }
    expect(allowed).toBe(MAX_RESEARCH_PER_IP_PER_HOUR);
  });
});

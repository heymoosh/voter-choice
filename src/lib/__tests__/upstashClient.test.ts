import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isUpstashAvailable } from "../upstashClient";

// Mock fetch globally
const originalFetch = global.fetch;

describe("isUpstashAvailable", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("returns false when UPSTASH_REDIS_REST_URL is missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isUpstashAvailable()).toBe(false);
  });

  it("returns false when UPSTASH_REDIS_REST_TOKEN is missing", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isUpstashAvailable()).toBe(false);
  });

  it("returns true when both credentials are present", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    expect(isUpstashAvailable()).toBe(true);
  });
});

describe("graceful degradation", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("incrementCount returns false when Upstash is unavailable", async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { incrementCount } = await import("../upstashClient");
    const result = await incrementCount("48201", "housing");
    expect(result).toBe(false);

    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });

  it("getCountyCounts returns null when Upstash is unavailable", async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { getCountyCounts } = await import("../upstashClient");
    const result = await getCountyCounts("48201");
    expect(result).toBeNull();

    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
});

describe("incrementCount with mock fetch", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns true on successful increment", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    const { incrementCount } = await import("../upstashClient");
    const result = await incrementCount("48201", "housing");
    expect(result).toBe(true);
  });

  it("returns false on fetch error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { incrementCount } = await import("../upstashClient");
    const result = await incrementCount("48201", "housing");
    expect(result).toBe(false);
  });
});

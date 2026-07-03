/**
 * Unit tests for the shared polis route guard: the GET-appropriate origin
 * rule and the fail-open rate limiter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  validatePolisOrigin,
  checkPolisRateLimit,
  _resetPolisRateLimitForTesting,
} from "./route-guard";

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/polis", { headers });
}

describe("validatePolisOrigin", () => {
  it("allows a missing Origin (same-origin GET, curl, server-side)", () => {
    expect(validatePolisOrigin(req({ host: "localhost" }))).toBe(true);
  });

  it("allows an Origin that matches Host", () => {
    expect(
      validatePolisOrigin(
        req({ origin: "http://localhost", host: "localhost" }),
      ),
    ).toBe(true);
  });

  it("rejects an Origin that disagrees with Host", () => {
    expect(
      validatePolisOrigin(
        req({ origin: "http://evil.example", host: "localhost" }),
      ),
    ).toBe(false);
  });

  it("rejects a present Origin when Host is absent", () => {
    expect(validatePolisOrigin(req({ origin: "http://localhost" }))).toBe(
      false,
    );
  });

  it("rejects a malformed Origin", () => {
    expect(
      validatePolisOrigin(req({ origin: "not-a-url", host: "localhost" })),
    ).toBe(false);
  });
});

describe("checkPolisRateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    _resetPolisRateLimitForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("allows up to the cap then denies within the window", async () => {
    const ip = "10.0.0.1";
    let allowed = 0;
    for (let i = 0; i < 121; i++) {
      if (await checkPolisRateLimit(ip)) allowed++;
    }
    expect(allowed).toBe(120);
    expect(await checkPolisRateLimit(ip)).toBe(false);
  });

  it("tracks separate IPs independently", async () => {
    expect(await checkPolisRateLimit("10.0.0.2")).toBe(true);
    expect(await checkPolisRateLimit("10.0.0.3")).toBe(true);
  });
});

describe("checkPolisRateLimit (durable path fails open)", () => {
  beforeEach(() => {
    _resetPolisRateLimitForTesting();
    vi.stubEnv("KV_REST_API_URL", "https://mock-redis.local");
    vi.stubEnv("KV_REST_API_TOKEN", "mock-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns true (allows the read) when Redis throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("redis down"));
    expect(await checkPolisRateLimit("10.0.0.9")).toBe(true);
  });

  it("denies once the durable INCR crosses the cap", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const cmd = JSON.parse(String(init?.body)) as string[];
      // First command is INCR → return an over-cap count; EXPIRE → ok.
      const result = cmd[0] === "INCR" ? 999 : "OK";
      return new Response(JSON.stringify({ result }), { status: 200 });
    });
    expect(await checkPolisRateLimit("10.0.0.10")).toBe(false);
  });
});

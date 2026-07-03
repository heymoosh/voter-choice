/**
 * Cross-cutting request-guard behavior for the four public GET /api/polis
 * endpoints: cross-origin rejection, the per-IP rate-limit deny path, and the
 * edge Cache-Control header on successful reads.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as polisGET } from "./route";
import { GET as barsGET } from "./bars/route";
import { GET as bridgesGET } from "./bridges/route";
import { GET as compassGET } from "./compass/route";
import {
  POLIS_CACHE_CONTROL,
  _resetPolisRateLimitForTesting,
} from "../../../lib/server/polis/route-guard";
import { _resetMemoryForTesting } from "../../../lib/server/counters";

/** scope=national keeps every route on its param-free happy path. */
const ROUTES: Array<{ name: string; path: string; handler: typeof polisGET }> =
  [
    { name: "polis", path: "/api/polis", handler: polisGET },
    { name: "bars", path: "/api/polis/bars", handler: barsGET },
    { name: "bridges", path: "/api/polis/bridges", handler: bridgesGET },
    { name: "compass", path: "/api/polis/compass", handler: compassGET },
  ];

function makeRequest(
  path: string,
  headers: Record<string, string> = {},
): NextRequest {
  const url = new URL(`http://localhost${path}`);
  url.searchParams.set("scope", "national");
  return new NextRequest(url.toString(), { headers });
}

describe("GET /api/polis request guard", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    _resetPolisRateLimitForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  for (const { name, path, handler } of ROUTES) {
    it(`${name}: rejects a cross-origin request with 403`, async () => {
      const res = await handler(
        makeRequest(path, {
          origin: "http://evil.example",
          host: "localhost",
          "x-real-ip": `1.2.3.${name.length}`,
        }),
      );
      expect(res.status).toBe(403);
    });

    it(`${name}: allows a same-origin (no Origin header) read with 200 + Cache-Control`, async () => {
      const res = await handler(
        makeRequest(path, { "x-real-ip": `4.5.6.${name.length}` }),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(POLIS_CACHE_CONTROL);
    });

    it(`${name}: allows a matching-origin read with 200`, async () => {
      const res = await handler(
        makeRequest(path, {
          origin: "http://localhost",
          host: "localhost",
          "x-real-ip": `7.8.9.${name.length}`,
        }),
      );
      expect(res.status).toBe(200);
    });
  }

  it("rate-limits a single IP once it exceeds the per-minute cap (429)", async () => {
    const ip = "203.0.113.7";
    let last = 0;
    // The cap is 120/min; the 121st same-IP request in the window is denied.
    for (let i = 0; i < 121; i++) {
      const res = await compassGET(
        makeRequest("/api/polis/compass", {
          "x-real-ip": ip,
        }),
      );
      last = res.status;
    }
    expect(last).toBe(429);

    // A different IP is unaffected by another caller's exhausted bucket.
    const fresh = await compassGET(
      makeRequest("/api/polis/compass", { "x-real-ip": "203.0.113.8" }),
    );
    expect(fresh.status).toBe(200);
  });
});

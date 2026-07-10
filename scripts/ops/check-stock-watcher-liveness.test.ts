/**
 * Tests for scripts/ops/check-stock-watcher-liveness.ts
 *
 * PURE evaluation logic tested directly; checkFeed tested with an injected
 * fetcher — no real network calls.
 */

import { describe, expect, it, vi } from "vitest";
import {
  MIN_ROWS,
  evaluateBody,
  allHealthy,
  computeExitCode,
  checkFeed,
  type FeedVerdict,
} from "./check-stock-watcher-liveness";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

describe("evaluateBody", () => {
  it("flags a non-array body as malformed", () => {
    expect(evaluateBody({ not: "an array" })).toEqual({
      status: "malformed",
      rowCount: null,
    });
  });

  it("flags an array below MIN_ROWS as an anomaly", () => {
    const rows = new Array(MIN_ROWS - 1).fill({});
    expect(evaluateBody(rows)).toEqual({
      status: "empty-anomaly",
      rowCount: MIN_ROWS - 1,
    });
  });

  it("flags an empty array as an anomaly", () => {
    expect(evaluateBody([])).toEqual({
      status: "empty-anomaly",
      rowCount: 0,
    });
  });

  it("passes an array at or above MIN_ROWS", () => {
    const rows = new Array(MIN_ROWS).fill({});
    expect(evaluateBody(rows)).toEqual({ status: "ok", rowCount: MIN_ROWS });
  });
});

describe("allHealthy / computeExitCode", () => {
  const ok: FeedVerdict = {
    label: "House",
    status: "ok",
    detail: "100 rows",
    rowCount: 100,
    etag: null,
    lastModified: null,
  };
  const broken: FeedVerdict = { ...ok, label: "Senate", status: "http-error" };

  it("is healthy and exits 0 when every verdict is ok", () => {
    expect(allHealthy([ok, { ...ok, label: "Senate" }])).toBe(true);
    expect(computeExitCode([ok, { ...ok, label: "Senate" }])).toBe(0);
  });

  it("is unhealthy and exits 1 when any verdict is not ok", () => {
    expect(allHealthy([ok, broken])).toBe(false);
    expect(computeExitCode([ok, broken])).toBe(1);
  });
});

describe("checkFeed", () => {
  it("returns ok for a healthy JSON array response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(new Array(10).fill({ ticker: "ABC" }), {
          headers: { etag: '"abc123"', "last-modified": "Thu, 09 Jul 2026 00:00:00 GMT" },
        }),
      );
    const verdict = await checkFeed("https://example.test/data.json", "House", fetcher);
    expect(verdict.status).toBe("ok");
    expect(verdict.rowCount).toBe(10);
    expect(verdict.etag).toBe('"abc123"');
    expect(verdict.lastModified).toBe("Thu, 09 Jul 2026 00:00:00 GMT");
  });

  it("returns unreachable when the fetch throws", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const verdict = await checkFeed("https://example.test/data.json", "Senate", fetcher);
    expect(verdict.status).toBe("unreachable");
    expect(verdict.detail).toContain("network down");
  });

  it("returns http-error on a non-2xx response", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, { status: 403 }));
    const verdict = await checkFeed("https://example.test/data.json", "House", fetcher);
    expect(verdict.status).toBe("http-error");
    expect(verdict.detail).toContain("403");
  });

  it("returns malformed when the body is not valid JSON", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("<html>not json</html>", { status: 200 }));
    const verdict = await checkFeed("https://example.test/data.json", "House", fetcher);
    expect(verdict.status).toBe("malformed");
  });

  it("returns malformed when the body is a JSON object, not an array", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "moved" }));
    const verdict = await checkFeed("https://example.test/data.json", "House", fetcher);
    expect(verdict.status).toBe("malformed");
  });

  it("returns empty-anomaly when the array is suspiciously small", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([]));
    const verdict = await checkFeed("https://example.test/data.json", "Senate", fetcher);
    expect(verdict.status).toBe("empty-anomaly");
    expect(verdict.rowCount).toBe(0);
  });
});

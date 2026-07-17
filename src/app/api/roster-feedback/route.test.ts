import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetRosterFeedbackRateLimitForTesting } from "../../../lib/server/roster-feedback-rate-limit";

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  overrides: { headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest("http://localhost/api/roster-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      ...overrides.headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  message: "The candidate listed for HD-12 dropped out and isn't running.",
  state: "tx",
  office: "house",
  district: "12",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/roster-feedback", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // DATABASE_URL unset in the test env → getDb() returns DB_NOT_CONFIGURED,
    // so happy-path assertions target the 503 "not configured" branch. This
    // still exercises validation + rate-limit ahead of the DB call, which is
    // this route's real behavior-under-test (no test DB in CI for this route).
    _resetRosterFeedbackRateLimitForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("valid body with DB unconfigured: returns 503 (honest failure, not a silent drop)", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("invalid body: missing message → 400", async () => {
    const res = await POST(makeRequest({ state: "TX" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("invalid body: empty message → 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, message: "   " }));
    expect(res.status).toBe(400);
  });

  it("invalid body: message over 2000 chars → 400", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, message: "x".repeat(2001) }),
    );
    expect(res.status).toBe(400);
  });

  it("invalid body: not JSON → 400", async () => {
    const req = new NextRequest("http://localhost/api/roster-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: "not-json!!!",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("invalid body: appContext as an array → 400", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, appContext: [1, 2, 3] }),
    );
    expect(res.status).toBe(400);
  });

  it("invalid body: appContext serialized over the size cap → 400", async () => {
    const res = await POST(
      makeRequest({
        ...VALID_BODY,
        appContext: { blob: "x".repeat(5000) },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rate limit: 11th request from same IP returns 429", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(
        makeRequest({ ...VALID_BODY, message: `${VALID_BODY.message} (${i})` }),
      );
    }

    const res = await POST(
      makeRequest({ ...VALID_BODY, message: `${VALID_BODY.message} (11)` }),
    );
    expect(res.status).toBe(429);
  });

  it("rate limit is per-IP: a different IP is unaffected by another IP's cap", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(
        makeRequest(
          { ...VALID_BODY, message: `${VALID_BODY.message} (${i})` },
          { headers: { "x-forwarded-for": "9.9.9.9" } },
        ),
      );
    }

    // Same 9.9.9.9 IP is now rate-limited...
    const limited = await POST(
      makeRequest(VALID_BODY, {
        headers: { "x-forwarded-for": "9.9.9.9" },
      }),
    );
    expect(limited.status).toBe(429);

    // ...but a fresh IP still reaches validation (503, not 429).
    const fresh = await POST(
      makeRequest(VALID_BODY, {
        headers: { "x-forwarded-for": "8.8.8.8" },
      }),
    );
    expect(fresh.status).toBe(503);
  });
});

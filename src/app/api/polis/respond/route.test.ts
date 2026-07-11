/**
 * Tests for POST /api/polis/respond — the PolisStand write path.
 *
 * `collectPolisVector` is mocked so these tests exercise the ROUTE's own
 * validation/allowlisting/flag-gating logic without a live DB. Conventions
 * mirror src/app/api/counters/route.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { _resetRateLimitForTesting } from "../../../../lib/server/counters-rate-limit";
import { POLIS_STATEMENTS } from "../../../../lib/polis/statements";

vi.mock("../../../../lib/polis/collectVector", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../../lib/polis/collectVector")
    >();
  return {
    ...actual,
    collectPolisVector: vi.fn().mockResolvedValue({
      ok: true,
      outcome: "stored",
    }),
  };
});

import { POST } from "./route";
import { collectPolisVector } from "../../../../lib/polis/collectVector";

const mockedCollectPolisVector = vi.mocked(collectPolisVector);

const STMT_1 = POLIS_STATEMENTS[0];
const STMT_2 = POLIS_STATEMENTS[1];

function makeRequest(
  body: unknown,
  overrides: { headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest("http://localhost/api/polis/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "5.6.7.8",
      ...overrides.headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/polis/respond", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetRateLimitForTesting();
    mockedCollectPolisVector.mockClear();
    mockedCollectPolisVector.mockResolvedValue({ ok: true, outcome: "stored" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("happy path (flag on): calls collectPolisVector and returns { ok, outcome }", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-1",
        stateCode: "TX",
        responses: { [STMT_1]: "agree" },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, outcome: "stored" });
    expect(mockedCollectPolisVector).toHaveBeenCalledTimes(1);
    const input = mockedCollectPolisVector.mock.calls[0][0];
    expect(input.sessionToken).toBe("tok-1");
    expect(input.stateCode).toBe("TX");
    expect(input.responses).toEqual({ [STMT_1]: "agree" });
  });

  it("honest state: flag off → outcome 'skipped', collectPolisVector never called", async () => {
    delete process.env.POLIS_VECTOR_COLLECTION_ENABLED;
    const res = await POST(
      makeRequest({
        sessionToken: "tok-2",
        stateCode: "TX",
        responses: { [STMT_1]: "agree" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "skipped" });
    expect(mockedCollectPolisVector).not.toHaveBeenCalled();
  });

  it("allowlist: drops an unknown statement id, keeps known siblings in the same POST", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-3",
        stateCode: "TX",
        responses: {
          [STMT_1]: "agree",
          "made-up statement not in the catalog": "agree",
        },
      }),
    );
    expect(res.status).toBe(200);
    const input = mockedCollectPolisVector.mock.calls[0][0];
    expect(input.responses).toEqual({ [STMT_1]: "agree" });
  });

  it("allowlist: request with ONLY unknown statement ids → 400 (nothing to record)", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-4",
        stateCode: "TX",
        responses: { "not a real statement": "agree" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedCollectPolisVector).not.toHaveBeenCalled();
  });

  it("rejects an invalid answer value ('yes' instead of agree/disagree/pass)", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-5",
        stateCode: "TX",
        responses: { [STMT_1]: "yes" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mockedCollectPolisVector).not.toHaveBeenCalled();
  });

  it("accepts a null/absent stateCode (voter skipped location)", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-6",
        responses: { [STMT_1]: "pass" },
      }),
    );
    expect(res.status).toBe(200);
    const input = mockedCollectPolisVector.mock.calls[0][0];
    expect(input.stateCode).toBeNull();
  });

  it("invalid body: missing sessionToken → 400", async () => {
    const res = await POST(
      makeRequest({ stateCode: "TX", responses: { [STMT_1]: "agree" } }),
    );
    expect(res.status).toBe(400);
  });

  it("invalid body: not JSON → 400", async () => {
    const req = new NextRequest("http://localhost/api/polis/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "5.6.7.8",
      },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("privacy: county is never accepted — no county field in the request shape at all", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-7",
        stateCode: "TX",
        county: "Travis", // not part of the schema — must be ignored, never read
        responses: { [STMT_1]: "agree" },
      }),
    );
    expect(res.status).toBe(200);
    const input = mockedCollectPolisVector.mock.calls[0][0];
    expect(input).not.toHaveProperty("county");
  });

  it("privacy/party-free: response shape carries only allowlisted top-level keys, never a party field", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const res = await POST(
      makeRequest({
        sessionToken: "tok-8",
        stateCode: "TX",
        responses: { [STMT_1]: "agree", [STMT_2]: "disagree" },
      }),
    );
    const json = await res.json();
    const allowed = new Set(["ok", "outcome"]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
    expect(json).not.toHaveProperty("primary");
    expect(json).not.toHaveProperty("party");
  });

  it("rate limit: 21st request from same IP returns 429", async () => {
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    for (let i = 0; i < 20; i++) {
      const res = await POST(
        makeRequest({
          sessionToken: `tok-rl-${i}`,
          stateCode: "TX",
          responses: { [STMT_1]: "agree" },
        }),
      );
      expect(res.status).toBe(200);
    }
    const res = await POST(
      makeRequest({
        sessionToken: "tok-rl-21",
        stateCode: "TX",
        responses: { [STMT_1]: "agree" },
      }),
    );
    expect(res.status).toBe(429);
  });
});

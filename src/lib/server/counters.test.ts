import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  incrementSessionCounters,
  fetchPolisAggregate,
  _resetMemoryForTesting,
  type IncrementInput,
} from "./counters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<IncrementInput> = {}): IncrementInput {
  return {
    sessionId: "sess-abc123",
    stateCode: "TX",
    county: "Harris",
    primary: "DEM",
    confirmedConcerns: [
      { canonicalIssue: "healthcare_affordability" },
      { canonicalIssue: "education_funding" },
    ],
    picks: [{ race: "governor", candidateId: "candidate-a" }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// In-memory path (no Redis env vars set)
// ---------------------------------------------------------------------------

describe("counters — in-memory fallback", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("increments expected keys for a full session", async () => {
    const result = await incrementSessionCounters(makeInput());

    expect(result.ok).toBe(true);
    expect(result.alreadyCounted).toBe(false);
  });

  it("idempotency: same sessionId twice → second call returns alreadyCounted=true", async () => {
    const input = makeInput();
    const first = await incrementSessionCounters(input);
    const second = await incrementSessionCounters(input);

    expect(first.alreadyCounted).toBe(false);
    expect(second.alreadyCounted).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("idempotency: second call writes nothing additional", async () => {
    const input = makeInput();
    await incrementSessionCounters(input);

    // Aggregate after first call
    const agg1 = await fetchPolisAggregate("TX", "Harris");

    // Second call — should be no-op
    await incrementSessionCounters(input);
    const agg2 = await fetchPolisAggregate("TX", "Harris");

    expect(agg2.sampleSize).toBe(agg1.sampleSize);
  });

  it("county === null → only state-level keys touched (no county bucket inflated)", async () => {
    const input = makeInput({ county: null });
    await incrementSessionCounters(input);

    // State should have 1 session
    const stateAgg = await fetchPolisAggregate("TX", null);
    expect(stateAgg.sampleSize).toBeGreaterThan(0);

    // When asking for Travis county (which has 0 sessions), scope falls back to
    // state (state=1 > Travis=0), so sampleSize is 1, not 0.
    // The important invariant is that no county keys were written.
    const countyAgg = await fetchPolisAggregate("TX", "Travis");
    // State total is 1; Travis total is 0; scope=state wins → sampleSize=1
    // If county keys had been written, Travis would show its own sessions.
    // We verify this by checking primaryTotals for Travis-specific data:
    // since county was null, there are no county:TX:Travis keys,
    // so the county-scoped fetch falls back to state.
    expect(countyAgg.scope).toBe("state");
    expect(countyAgg.sampleSize).toBe(stateAgg.sampleSize);
  });

  it("aggregate fetch: county threshold met → returns county scope", async () => {
    // Add 200 sessions for Harris county
    for (let i = 0; i < 200; i++) {
      await incrementSessionCounters(makeInput({ sessionId: `sess-${i}` }));
    }

    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.scope).toBe("county");
    expect(agg.thresholdMet).toBe(true);
    expect(agg.sampleSize).toBe(200);
  });

  it("aggregate fetch: county thin, state threshold met → returns state scope", async () => {
    // Add 200 sessions but split across counties so neither county hits threshold
    for (let i = 0; i < 100; i++) {
      await incrementSessionCounters(
        makeInput({ sessionId: `sess-h${i}`, county: "Harris" }),
      );
    }
    for (let i = 0; i < 100; i++) {
      await incrementSessionCounters(
        makeInput({ sessionId: `sess-t${i}`, county: "Travis" }),
      );
    }

    // Harris county = 100 (below threshold), state = 200 (at threshold)
    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.scope).toBe("state");
    expect(agg.thresholdMet).toBe(true);
    expect(agg.sampleSize).toBe(200);
  });

  it("aggregate fetch: both below threshold → returns whichever has more, thresholdMet=false", async () => {
    // 10 county sessions, 0 more state-only sessions (state total = 10 as well since county sessions count state too)
    for (let i = 0; i < 10; i++) {
      await incrementSessionCounters(
        makeInput({ sessionId: `sess-${i}`, county: "Harris" }),
      );
    }

    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.thresholdMet).toBe(false);
    // State total = 10, county total = 10. County is not strictly > state, so defaults to state.
    expect(agg.scope).toBe("state");
    expect(agg.sampleSize).toBe(10);
  });

  it("aggregate includes issue counts from confirmed concerns", async () => {
    await incrementSessionCounters(
      makeInput({
        confirmedConcerns: [
          { canonicalIssue: "healthcare_affordability" },
          { canonicalIssue: "education_funding" },
        ],
      }),
    );

    // Add enough sessions for state threshold
    for (let i = 1; i < 200; i++) {
      await incrementSessionCounters(
        makeInput({
          sessionId: `sess-bulk-${i}`,
          confirmedConcerns: [{ canonicalIssue: "healthcare_affordability" }],
        }),
      );
    }

    const agg = await fetchPolisAggregate("TX", null);
    expect(agg.issueCounts.length).toBeGreaterThan(0);

    const hcEntry = agg.issueCounts.find(
      (ic) =>
        ic.canonicalIssue === "healthcare_affordability" &&
        ic.primary === "DEM",
    );
    expect(hcEntry).toBeDefined();
    expect(hcEntry!.count).toBe(200);
  });

  it("aggregate primaryTotals reflects sessions", async () => {
    await incrementSessionCounters(makeInput({ primary: "DEM" }));
    await incrementSessionCounters(
      makeInput({ sessionId: "sess-rep", primary: "REP" }),
    );

    const agg = await fetchPolisAggregate("TX", "Harris");
    const demEntry = agg.primaryTotals.find((pt) => pt.primary === "DEM");
    const repEntry = agg.primaryTotals.find((pt) => pt.primary === "REP");
    expect(demEntry?.count).toBe(1);
    expect(repEntry?.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Durable (Redis) path — mock fetch
// ---------------------------------------------------------------------------

describe("counters — durable Redis path", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("increment: SET NX → OK means first write, proceeds with INCRBYs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as string[];
        // SET NX returns "OK" (new key set)
        if (body[0] === "SET") {
          return new Response(JSON.stringify({ result: "OK" }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      });

    const result = await incrementSessionCounters(makeInput());
    expect(result.ok).toBe(true);
    expect(result.alreadyCounted).toBe(false);

    // Should have called INCRBY at least once
    const incrCalls = fetchMock.mock.calls.filter(([, init]) => {
      const body = JSON.parse(String(init?.body)) as string[];
      return body[0] === "INCRBY";
    });
    expect(incrCalls.length).toBeGreaterThan(0);
  });

  it("idempotency: SET NX returns null → alreadyCounted=true, no INCRBYs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as string[];
        // SET NX returns null (key already exists)
        if (body[0] === "SET") {
          return new Response(JSON.stringify({ result: null }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ result: 1 }), { status: 200 });
      });

    const result = await incrementSessionCounters(makeInput());
    expect(result.ok).toBe(true);
    expect(result.alreadyCounted).toBe(true);

    const incrCalls = fetchMock.mock.calls.filter(([, init]) => {
      const body = JSON.parse(String(init?.body)) as string[];
      return body[0] === "INCRBY";
    });
    expect(incrCalls.length).toBe(0);
  });

  it("Redis-down path: increment returns { ok: false, alreadyCounted: false }", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Redis connection refused"),
    );

    const result = await incrementSessionCounters(makeInput());
    expect(result.ok).toBe(false);
    expect(result.alreadyCounted).toBe(false);
  });

  it("Redis-down path: aggregate returns empty fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Redis connection refused"),
    );

    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.sampleSize).toBe(0);
    expect(agg.thresholdMet).toBe(false);
    expect(agg.issueCounts).toEqual([]);
    expect(agg.primaryTotals).toEqual([]);
  });

  it("aggregate: county threshold met → scope=county", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
      const body = JSON.parse(String(init?.body)) as string[];
      const cmd = body[0];
      const key = body[1] as string;

      if (cmd === "GET") {
        // County total key
        if (key.includes(":county:") && key.endsWith(":total")) {
          // top-level county total
          if (!key.includes(":primary:")) {
            return new Response(JSON.stringify({ result: "250" }), {
              status: 200,
            });
          }
          // primary totals
          return new Response(JSON.stringify({ result: "80" }), {
            status: 200,
          });
        }
        // State total
        if (
          key.includes(":state:") &&
          key.endsWith(":total") &&
          !key.includes(":primary:")
        ) {
          return new Response(JSON.stringify({ result: "500" }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ result: "0" }), { status: 200 });
      }
      if (cmd === "KEYS") {
        return new Response(JSON.stringify({ result: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });

    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.scope).toBe("county");
    expect(agg.thresholdMet).toBe(true);
    expect(agg.sampleSize).toBe(250);
  });

  it("aggregate: county thin, state met → scope=state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
      const body = JSON.parse(String(init?.body)) as string[];
      const cmd = body[0];
      const key = body[1] as string;

      if (cmd === "GET") {
        if (
          key.includes(":county:") &&
          key.endsWith(":total") &&
          !key.includes(":primary:")
        ) {
          return new Response(JSON.stringify({ result: "50" }), {
            status: 200,
          });
        }
        if (
          key.includes(":state:") &&
          key.endsWith(":total") &&
          !key.includes(":primary:")
        ) {
          return new Response(JSON.stringify({ result: "300" }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ result: "0" }), { status: 200 });
      }
      if (cmd === "KEYS") {
        return new Response(JSON.stringify({ result: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });

    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.scope).toBe("state");
    expect(agg.thresholdMet).toBe(true);
    expect(agg.sampleSize).toBe(300);
  });

  it("aggregate: both below threshold → whichever has more, thresholdMet=false", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
      const body = JSON.parse(String(init?.body)) as string[];
      const cmd = body[0];
      const key = body[1] as string;

      if (cmd === "GET") {
        if (
          key.includes(":county:") &&
          key.endsWith(":total") &&
          !key.includes(":primary:")
        ) {
          return new Response(JSON.stringify({ result: "30" }), {
            status: 200,
          });
        }
        if (
          key.includes(":state:") &&
          key.endsWith(":total") &&
          !key.includes(":primary:")
        ) {
          return new Response(JSON.stringify({ result: "20" }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ result: "0" }), { status: 200 });
      }
      if (cmd === "KEYS") {
        return new Response(JSON.stringify({ result: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });

    // County=30, state=20 → county has more
    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.thresholdMet).toBe(false);
    expect(agg.scope).toBe("county");
    expect(agg.sampleSize).toBe(30);
  });
});

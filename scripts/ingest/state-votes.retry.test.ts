import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ingestStateVotes, type PlannedStateRows } from "./state-votes";
import type { DbClient } from "../../db/client";

function makeResponse(status: number, body: unknown): Response {
  const ok = status >= 200 && status < 300;
  return {
    status,
    ok,
    headers: { get: () => null },
    text: async () => JSON.stringify(body ?? {}),
    json: async () => body,
  } as unknown as Response;
}

function makeFakeDb(): DbClient {
  const chain: Record<string, unknown> = {};
  chain.insert = () => chain;
  chain.values = () => chain;
  chain.onConflictDoUpdate = () => Promise.resolve();
  return chain as unknown as DbClient;
}

function baseEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    STATE: "TX",
    OPENSTATES_API_KEY: "test-key",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

const oneSessionJurisdiction = {
  legislative_sessions: [
    {
      id: "ocd-session/2025",
      identifier: "2025",
      classification: ["primary"],
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      active: true,
    },
  ],
};

const twoSessionJurisdiction = {
  legislative_sessions: [
    {
      id: "ocd-session/2025",
      identifier: "2025",
      classification: ["primary"],
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      active: true,
    },
    {
      id: "ocd-session/2023",
      identifier: "2023",
      classification: ["primary"],
      start_date: "2023-01-01",
      end_date: "2023-06-01",
    },
  ],
};

describe("state-votes retry behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries 504 on /jurisdictions and completes after a transient recovery", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(504, { error: "gateway timeout" }))
      .mockResolvedValueOnce(makeResponse(504, { error: "gateway timeout" }))
      .mockResolvedValueOnce(makeResponse(200, oneSessionJurisdiction))
      .mockResolvedValueOnce(makeResponse(200, { results: [] }));

    const resultPromise = ingestStateVotes({
      db: makeFakeDb(),
      fetcher: fetcher as unknown as typeof fetch,
      env: baseEnv(),
    });
    await vi.runAllTimersAsync();
    const result: PlannedStateRows = await resultPromise;

    expect(result.counts.sessionsSelected).toBe(1);
    expect(result.counts.sessionsFailed).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("does not retry a non-retryable HTTP 400", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(400, { error: "bad request" }));

    const resultPromise = ingestStateVotes({
      db: makeFakeDb(),
      fetcher: fetcher as unknown as typeof fetch,
      env: baseEnv(),
    });
    // Attach the rejection expectation before advancing fake timers (the
    // startup-jitter delay still needs one), so the rejection is never
    // briefly "unhandled" between the timer advance and this assertion.
    const assertion = expect(resultPromise).rejects.toThrow(/HTTP 400/u);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("isolates a terminated session so the other session's rows still land", async () => {
    const fetcher = vi.fn(async (url: string) => {
      const parsed = new URL(url);
      if (parsed.pathname.includes("/jurisdictions/")) {
        return makeResponse(200, twoSessionJurisdiction);
      }
      const sessionParam = parsed.searchParams.get("session");
      if (sessionParam === "ocd-session/2025") {
        throw new Error("terminated");
      }
      if (sessionParam === "ocd-session/2023") {
        return makeResponse(200, {
          results: [{ id: "ocd-bill/b1", votes: [] }],
        });
      }
      throw new Error(`unexpected session param: ${sessionParam}`);
    });

    const resultPromise = ingestStateVotes({
      db: makeFakeDb(),
      fetcher: fetcher as unknown as typeof fetch,
      env: baseEnv({ OPENSTATES_SESSION_COUNT: "2" }),
    });
    await vi.runAllTimersAsync();
    const result: PlannedStateRows = await resultPromise;

    expect(result.counts.sessionsSelected).toBe(2);
    expect(result.counts.sessionsFailed).toBe(1);
    // Session 2023's bill was still seen despite session 2025 failing entirely.
    expect(result.counts.billsSeen).toBe(1);
  });

  it("never fetches page 2 once maxBills is satisfied by page 1", async () => {
    const page1Results = Array.from({ length: 20 }, (_, i) => ({
      id: `ocd-bill/p1-${i}`,
      votes: [],
    }));

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200, oneSessionJurisdiction))
      .mockResolvedValueOnce(makeResponse(200, { results: page1Results }));

    const resultPromise = ingestStateVotes({
      db: makeFakeDb(),
      fetcher: fetcher as unknown as typeof fetch,
      env: baseEnv({ OPENSTATES_MAX_BILLS: "20" }),
    });
    await vi.runAllTimersAsync();
    const result: PlannedStateRows = await resultPromise;

    expect(result.counts.billsSeen).toBe(20);
    // jurisdictions call + exactly one bills page — no wasted page-2 fetch.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

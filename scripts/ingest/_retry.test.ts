import { describe, expect, it, vi } from "vitest";
import {
  flattenErrorChain,
  isRetryableHttpStatus,
  isTransientNetworkError,
  withRetry,
} from "./_retry";

describe("isTransientNetworkError", () => {
  it("regression guard: the repo's old de-facto regex misses a bare 'terminated', the new classifier does not", () => {
    const oldRegex = /fetch failed|ECONNRESET|ETIMEDOUT/iu;
    const error = new Error("terminated");

    expect(oldRegex.test(error.message)).toBe(false);
    expect(isTransientNetworkError(error)).toBe(true);
  });

  it("matches known transient error codes", () => {
    const error = Object.assign(new Error("socket blew up"), {
      code: "UND_ERR_SOCKET",
    });
    expect(isTransientNetworkError(error)).toBe(true);
  });

  it("matches known transient messages", () => {
    for (const message of [
      "other side closed",
      "socket hang up",
      "premature close",
      "fetch failed",
      "Connect Timeout Error",
      "Headers Timeout Error",
      "Body Timeout Error",
      "The operation was aborted",
    ]) {
      expect(isTransientNetworkError(new Error(message))).toBe(true);
    }
  });

  it("does not match a genuine non-transient error", () => {
    expect(isTransientNetworkError(new Error("invalid JSON"))).toBe(false);
    expect(isTransientNetworkError(new TypeError("bad argument"))).toBe(false);
  });

  it("walks error.cause chains", () => {
    const root = new Error("terminated");
    const wrapped = new Error("fetch failed", { cause: root });
    const doubleWrapped = new Error("request failed", { cause: wrapped });
    expect(isTransientNetworkError(doubleWrapped)).toBe(true);
  });

  it("walks AggregateError members", () => {
    const agg = new AggregateError(
      [new Error("nope"), new Error("terminated")],
      "all failed",
    );
    expect(isTransientNetworkError(agg)).toBe(true);
  });

  it("does not infinite-loop on a self-referencing cause cycle", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b: Error & { cause?: unknown } = new Error("b");
    a.cause = b;
    b.cause = a; // cycle
    expect(() => isTransientNetworkError(a)).not.toThrow();
    expect(isTransientNetworkError(a)).toBe(false);
  });

  it("respects a max depth bound", () => {
    let error: Error & { cause?: unknown } = new Error("terminated");
    for (let i = 0; i < 20; i++) {
      error = new Error(`wrapper ${i}`, { cause: error });
    }
    // 20 levels deep exceeds a small maxDepth, so the transient cause is never reached.
    expect(isTransientNetworkError(error, 2)).toBe(false);
    // A generous depth reaches it.
    expect(isTransientNetworkError(error, 50)).toBe(true);
  });
});

describe("isRetryableHttpStatus", () => {
  it("treats gateway/rate-limit statuses as retryable", () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504, 522, 524]) {
      expect(isRetryableHttpStatus(status)).toBe(true);
    }
  });

  it("treats client errors and success as non-retryable", () => {
    for (const status of [200, 201, 400, 401, 403, 404, 422]) {
      expect(isRetryableHttpStatus(status)).toBe(false);
    }
  });
});

describe("flattenErrorChain", () => {
  it("flattens a single error", () => {
    expect(flattenErrorChain(new Error("boom"))).toBe("boom");
  });

  it("includes the error code when present", () => {
    const error = Object.assign(new Error("boom"), { code: "ECONNRESET" });
    expect(flattenErrorChain(error)).toBe("boom (ECONNRESET)");
  });

  it("walks the full cause chain", () => {
    const root = new Error("root cause");
    const middle = new Error("middle", { cause: root });
    const top = new Error("top", { cause: middle });
    const flattened = flattenErrorChain(top);
    expect(flattened).toContain("top");
    expect(flattened).toContain("middle");
    expect(flattened).toContain("root cause");
  });

  it("terminates on a self-referencing cause cycle instead of looping forever", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b: Error & { cause?: unknown } = new Error("b");
    a.cause = b;
    b.cause = a;
    expect(() => flattenErrorChain(a)).not.toThrow();
    expect(flattenErrorChain(a)).toContain("a");
  });

  it("includes nested AggregateError members", () => {
    const agg = new AggregateError(
      [new Error("first"), new Error("second")],
      "all failed",
    );
    const flattened = flattenErrorChain(agg);
    expect(flattened).toContain("all failed");
    expect(flattened).toContain("first");
    expect(flattened).toContain("second");
  });
});

describe("withRetry", () => {
  it("retries a transient failure then succeeds", async () => {
    let attempts = 0;
    const result = await withRetry({
      label: "test",
      attempts: 3,
      sleep: async () => {},
      op: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("terminated");
        return "ok";
      },
    });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("rethrows immediately on a non-retryable error without sleeping", async () => {
    const sleepFn = vi.fn(async () => {});
    let attempts = 0;
    await expect(
      withRetry({
        label: "test",
        attempts: 3,
        sleep: sleepFn,
        op: async () => {
          attempts += 1;
          throw new Error("invalid JSON");
        },
      }),
    ).rejects.toThrow("invalid JSON");
    expect(attempts).toBe(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("caps backoff at maxDelayMs", async () => {
    const delays: number[] = [];
    let attempts = 0;
    await expect(
      withRetry({
        label: "test",
        attempts: 5,
        baseDelayMs: 1000,
        maxDelayMs: 3000,
        jitter: false,
        sleep: async (ms) => {
          delays.push(ms);
        },
        op: async () => {
          attempts += 1;
          throw new Error("terminated");
        },
      }),
    ).rejects.toThrow("terminated");
    expect(attempts).toBe(5);
    // 1000, 2000, then capped at 3000, 3000 (4 sleeps between 5 attempts)
    expect(delays).toEqual([1000, 2000, 3000, 3000]);
  });

  it("stops retrying once the wall-clock budget is exhausted", async () => {
    let simulatedNow = 0;
    const realDateNow = Date.now;
    Date.now = () => simulatedNow;
    try {
      let attempts = 0;
      await expect(
        withRetry({
          label: "test",
          attempts: 10,
          baseDelayMs: 1000,
          totalBudgetMs: 2500,
          jitter: false,
          sleep: async (ms) => {
            simulatedNow += ms;
          },
          op: async () => {
            attempts += 1;
            throw new Error("terminated");
          },
        }),
      ).rejects.toThrow("terminated");
      // Budget exhausts partway through — fewer than all 10 attempts run.
      expect(attempts).toBeLessThan(10);
      expect(attempts).toBeGreaterThan(1);
    } finally {
      Date.now = realDateNow;
    }
  });
});

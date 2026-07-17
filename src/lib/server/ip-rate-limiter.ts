/**
 * Shared per-IP rate-limit factory: durable INCR+EXPIRE against the shared
 * Redis/KV store when configured, in-memory Map fallback otherwise.
 *
 * Extracted out of counters-rate-limit.ts, polis/route-guard.ts,
 * race-data-rate-limit.ts, research-spend-limit.ts, and
 * roster-feedback-rate-limit.ts, which had each hand-rolled the identical
 * dual-path INCR/EXPIRE + in-memory window logic — only the key prefix,
 * window, cap, and Redis-error fallback behavior differed between them.
 *
 * `failMode` controls what happens when the durable check itself ERRORS
 * (a real Redis failure, not "over cap"):
 *   - "open"   (default): allow the request. Used by throttles where
 *     availability matters more than exactness (counters, polis, race-data,
 *     roster-feedback) — a Redis hiccup must never break a page.
 *   - "closed": deny the request. Used by research-spend-limit, which
 *     guards real billable spend — an unenforceable cap must never allow it.
 */
import { isDurableStoreConfigured, redisCommand } from "./durable-store";

export interface IpRateLimiter {
  check(ip: string): Promise<boolean>;
  /** Exposed for testing only — clears the in-memory fallback map. */
  _resetForTesting(): void;
}

export function createIpRateLimiter(opts: {
  keyPrefix: string;
  windowSeconds: number;
  maxRequests: number;
  failMode?: "open" | "closed";
}): IpRateLimiter {
  const { keyPrefix, windowSeconds, maxRequests, failMode = "open" } = opts;
  const memRateMap = new Map<string, { count: number; resetAt: number }>();

  return {
    async check(ip: string): Promise<boolean> {
      if (isDurableStoreConfigured()) {
        try {
          const key = `${keyPrefix}:${ip}`;
          const count = Number(
            (await redisCommand<number>(["INCR", key])) ?? 1,
          );
          if (count === 1) {
            await redisCommand(["EXPIRE", key, windowSeconds]);
          }
          return count <= maxRequests;
        } catch {
          return failMode === "open";
        }
      }

      // In-memory fallback
      const now = Date.now();
      const entry = memRateMap.get(ip);
      if (!entry || now > entry.resetAt) {
        memRateMap.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
        return true;
      }
      entry.count++;
      return entry.count <= maxRequests;
    },
    _resetForTesting(): void {
      memRateMap.clear();
    },
  };
}

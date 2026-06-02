/**
 * IP-level rate limit for the /api/race-data endpoint.
 *
 * race-data is a READ the browser fires once per race the voter opens (and
 * re-fires when the roster/issues change). It is cached at the edge
 * (s-maxage=3600) and does only bounded DB reads. So unlike the stats-WRITE
 * `/api/counters` endpoint — which is correctly capped at 20/IP/hour — this
 * one needs a generous per-minute read limit: a human clicking through a
 * dozen races plus a few re-fetches must never be throttled, while scripted
 * abuse is still bounded.
 *
 * Reusing the counters limiter here (the original mistake) capped real users
 * at 20 race-data reads per HOUR, after which cards silently fell back to the
 * stub for an hour.
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";

const WINDOW_SECONDS = 60; // 1 minute
const MAX_READS_PER_IP_PER_MINUTE = 60;

const memRaceDataRateMap = new Map<
  string,
  { count: number; resetAt: number }
>();

// Exposed for testing only.
export function _resetRaceDataRateLimitForTesting(): void {
  memRaceDataRateMap.clear();
}

export async function checkRaceDataRateLimit(ip: string): Promise<boolean> {
  if (isDurableStoreConfigured()) {
    try {
      const key = `voter-choice:race-data-rate:${ip}`;
      const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
      if (count === 1) {
        await redisCommand(["EXPIRE", key, WINDOW_SECONDS]);
      }
      return count <= MAX_READS_PER_IP_PER_MINUTE;
    } catch {
      // Fail open: a Redis hiccup must not break card rendering.
      return true;
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memRaceDataRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memRaceDataRateMap.set(ip, {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_READS_PER_IP_PER_MINUTE;
}

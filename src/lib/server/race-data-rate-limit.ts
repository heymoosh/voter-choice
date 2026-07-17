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
 *
 * Dual-path (durable/in-memory) logic lives in ip-rate-limiter.ts, shared
 * with the other per-IP throttles in this directory.
 */

import { createIpRateLimiter } from "./ip-rate-limiter";

const limiter = createIpRateLimiter({
  keyPrefix: "voter-choice:race-data-rate",
  windowSeconds: 60, // 1 minute
  maxRequests: 60,
});

// Exposed for testing only.
export function _resetRaceDataRateLimitForTesting(): void {
  limiter._resetForTesting();
}

export async function checkRaceDataRateLimit(ip: string): Promise<boolean> {
  return limiter.check(ip);
}

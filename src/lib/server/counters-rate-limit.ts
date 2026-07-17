/**
 * Simple IP-level rate limit for the /api/counters endpoint.
 *
 * Not session-based: the counter endpoint is hit once per session,
 * so we rate-limit by writes-per-IP-per-hour rather than per-session messages.
 *
 * Fails open on a Redis error (allow on Redis error so counter writes aren't
 * blocked). Dual-path (durable/in-memory) logic lives in ip-rate-limiter.ts,
 * shared with the other per-IP throttles in this directory.
 */

import { createIpRateLimiter } from "./ip-rate-limiter";

const limiter = createIpRateLimiter({
  keyPrefix: "voter-choice:counters-rate",
  windowSeconds: 3600, // 1 hour
  maxRequests: 20,
});

// Exposed for testing only.
export function _resetRateLimitForTesting(): void {
  limiter._resetForTesting();
}

export async function checkCounterRateLimit(ip: string): Promise<boolean> {
  return limiter.check(ip);
}

/**
 * IP-level rate limit for the /api/roster-feedback endpoint.
 *
 * This form is submitted rarely by a real voter, so the cap is tighter than
 * the counters endpoint's 20/hour — generous enough for someone reporting a
 * few different roster issues in one sitting, tight enough to blunt spam.
 *
 * Dual-path (durable/in-memory) logic lives in ip-rate-limiter.ts, shared
 * with the other per-IP throttles in this directory.
 */

import { createIpRateLimiter } from "./ip-rate-limiter";

const limiter = createIpRateLimiter({
  keyPrefix: "voter-choice:roster-feedback-rate",
  windowSeconds: 3600, // 1 hour
  maxRequests: 10,
});

// Exposed for testing only.
export function _resetRosterFeedbackRateLimitForTesting(): void {
  limiter._resetForTesting();
}

export async function checkRosterFeedbackRateLimit(
  ip: string,
): Promise<boolean> {
  return limiter.check(ip);
}

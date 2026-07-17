/**
 * IP-level rate limit for the /api/roster-feedback endpoint.
 *
 * Mirrors counters-rate-limit.ts's durable/in-memory dual path. This form is
 * submitted rarely by a real voter, so the cap is tighter than the counters
 * endpoint's 20/hour — generous enough for someone reporting a few different
 * roster issues in one sitting, tight enough to blunt spam.
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";

const WINDOW_SECONDS = 3600; // 1 hour
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;

const memRateMap = new Map<string, { count: number; resetAt: number }>();

// Exposed for testing only.
export function _resetRosterFeedbackRateLimitForTesting(): void {
  memRateMap.clear();
}

export async function checkRosterFeedbackRateLimit(
  ip: string,
): Promise<boolean> {
  if (isDurableStoreConfigured()) {
    try {
      const key = `voter-choice:roster-feedback-rate:${ip}`;
      const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
      if (count === 1) {
        await redisCommand(["EXPIRE", key, WINDOW_SECONDS]);
      }
      return count <= MAX_SUBMISSIONS_PER_IP_PER_HOUR;
    } catch {
      // Fail open: allow on Redis error so a real report isn't silently dropped.
      return true;
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memRateMap.set(ip, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_SUBMISSIONS_PER_IP_PER_HOUR;
}

/**
 * Simple IP-level rate limit for the /api/counters endpoint.
 *
 * Not session-based: the counter endpoint is hit once per session,
 * so we rate-limit by writes-per-IP-per-hour rather than per-session messages.
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";

const WINDOW_SECONDS = 3600; // 1 hour
const MAX_WRITES_PER_IP_PER_HOUR = 20;

const memCounterRateMap = new Map<string, { count: number; resetAt: number }>();

// Exposed for testing only.
export function _resetRateLimitForTesting(): void {
  memCounterRateMap.clear();
}

export async function checkCounterRateLimit(ip: string): Promise<boolean> {
  if (isDurableStoreConfigured()) {
    try {
      const key = `voter-choice:counters-rate:${ip}`;
      const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
      if (count === 1) {
        await redisCommand(["EXPIRE", key, WINDOW_SECONDS]);
      }
      return count <= MAX_WRITES_PER_IP_PER_HOUR;
    } catch {
      // Fail open: allow on Redis error so counter writes aren't blocked
      return true;
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memCounterRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memCounterRateMap.set(ip, {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_WRITES_PER_IP_PER_HOUR;
}

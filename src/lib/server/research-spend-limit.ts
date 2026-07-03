/**
 * Per-caller spend limit for /api/research-candidate.
 *
 * Unlike the /api/race-data read limiter (which FAILS OPEN so a Redis hiccup
 * never blanks a card), this gate guards REAL money: each miss spawns a
 * web_search research sub-agent that bills the community budget. So it FAILS
 * CLOSED — if the durable counter can't be read, we deny rather than allow an
 * uncapped spend. Mirrors the civic lookup limiter's catch → `false` posture.
 *
 * When no durable store is configured (local dev / tests) we fall back to an
 * in-memory per-instance cap: still a real limit, just not shared across
 * serverless instances. "Limit unavailable" means the durable check ERRORED,
 * not that a durable store is absent.
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";

const WINDOW_SECONDS = 3600; // 1 hour
export const MAX_RESEARCH_PER_IP_PER_HOUR = 20;

const memSpendMap = new Map<string, { count: number; resetAt: number }>();

// Exposed for testing only.
export function _resetResearchSpendLimitForTesting(): void {
  memSpendMap.clear();
}

export async function checkResearchSpendLimit(ip: string): Promise<boolean> {
  if (isDurableStoreConfigured()) {
    try {
      const key = `voter-choice:research-spend:${ip}`;
      const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
      if (count === 1) {
        await redisCommand(["EXPIRE", key, WINDOW_SECONDS]);
      }
      return count <= MAX_RESEARCH_PER_IP_PER_HOUR;
    } catch {
      // Fail CLOSED: a billable spend must never proceed when the cap can't be
      // enforced.
      return false;
    }
  }

  // In-memory fallback (per-instance) when no durable store is configured.
  const now = Date.now();
  const entry = memSpendMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memSpendMap.set(ip, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_RESEARCH_PER_IP_PER_HOUR;
}

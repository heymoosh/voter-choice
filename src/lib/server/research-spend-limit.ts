/**
 * Per-caller spend limit for /api/research-candidate.
 *
 * Unlike the /api/race-data read limiter (which FAILS OPEN so a Redis hiccup
 * never blanks a card), this gate guards REAL money: each miss spawns a
 * web_search research sub-agent that bills the community budget. So it FAILS
 * CLOSED — if the durable counter can't be read, we deny rather than allow an
 * uncapped spend.
 *
 * When no durable store is configured (local dev / tests) we fall back to an
 * in-memory per-instance cap: still a real limit, just not shared across
 * serverless instances. "Limit unavailable" means the durable check ERRORED,
 * not that a durable store is absent.
 *
 * Dual-path (durable/in-memory) logic lives in ip-rate-limiter.ts, shared
 * with the other per-IP throttles in this directory.
 */

import { createIpRateLimiter } from "./ip-rate-limiter";

export const MAX_RESEARCH_PER_IP_PER_HOUR = 20;

const limiter = createIpRateLimiter({
  keyPrefix: "voter-choice:research-spend",
  windowSeconds: 3600, // 1 hour
  maxRequests: MAX_RESEARCH_PER_IP_PER_HOUR,
  failMode: "closed",
});

// Exposed for testing only.
export function _resetResearchSpendLimitForTesting(): void {
  limiter._resetForTesting();
}

export async function checkResearchSpendLimit(ip: string): Promise<boolean> {
  return limiter.check(ip);
}

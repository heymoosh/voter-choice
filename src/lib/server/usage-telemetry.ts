/**
 * Usage-block observability.
 *
 * Every point where the app refuses chat / ballot usage (security, rate
 * limits, budget tiers, upstream Anthropic errors, extraction failures) calls
 * `recordBlock`. That gives us two things the app lacked before:
 *
 *   1. A structured server log on EVERY block — so we can tell *why* a given
 *      voter got blocked instead of guessing from a generic error screen.
 *   2. Per-reason daily counters in Redis — so blocks can be tallied across a
 *      day and the noisy reasons (transient Redis blips vs. real caps) can be
 *      separated.
 *
 * Hard invariant: telemetry is side-effect-only. `recordBlock` NEVER throws
 * and NEVER changes the HTTP status or response body of the request that
 * triggered it — it only logs and increments a counter. Every code path here
 * is wrapped in try/catch; the Redis increment is fire-and-forget and guarded
 * on `isDurableStoreConfigured()`, mirroring `writeExtractionCache` in the
 * extract-ballot route.
 */

import { createHash } from "node:crypto";
import { isDurableStoreConfigured, redisCommand } from "./durable-store";

/**
 * The complete set of reasons the app blocks usage. Keep these strings stable —
 * they become the Redis counter suffix (`voter-choice:blocks:<day>:<reason>`)
 * and the client-side message key, so renaming one silently breaks both the
 * historical tally and the user-facing copy.
 */
export type BlockReason =
  // Security / validation
  | "ORIGIN_MISMATCH" // 403 — Origin header didn't match Host
  | "INVALID_REQUEST" // 400 — malformed body / form
  | "PDF_TOO_LARGE" // 413 — upload over the size cap
  // Rate limits (per-IP, 429) — codes mirror rate-limit.ts RateLimitResult.code
  | "SESSION_LIMIT" // >60 msgs/session
  | "CONCURRENT_LIMIT" // >10 concurrent sessions/IP
  | "DAILY_LIMIT" // >10 new sessions/day/IP
  | "RATE_LIMIT_UNAVAILABLE" // Redis error → fail closed (transient, retryable)
  // Budget ($50/mo) — tiers from budget.ts
  | "BUDGET_SOFT_CLOSE" // ≥80%
  | "BUDGET_HANDOFF" // ≥90%
  | "BUDGET_EXHAUSTED" // ≥100%
  // Upstream Anthropic
  | "API_RATE_LIMIT" // 429 from Anthropic (transient per-minute throttle)
  | "BUDGET_UPSTREAM_EXHAUSTED" // sustained account-level block: org spend cap (429), a self-set spend limit (400), or a billing issue (402) — distinct from our own $50/mo community budget
  | "API_OVERLOADED" // 503/529 from Anthropic
  | "AI_ERROR" // 500 — other / unknown AI error
  // Extraction
  | "EXTRACTION_FAILED"; // 500/502 — ballot extraction pipeline failed

/** The full reason list, used by `getBlockStats` to read every counter. */
const ALL_BLOCK_REASONS: readonly BlockReason[] = [
  "ORIGIN_MISMATCH",
  "INVALID_REQUEST",
  "PDF_TOO_LARGE",
  "SESSION_LIMIT",
  "CONCURRENT_LIMIT",
  "DAILY_LIMIT",
  "RATE_LIMIT_UNAVAILABLE",
  "BUDGET_SOFT_CLOSE",
  "BUDGET_HANDOFF",
  "BUDGET_EXHAUSTED",
  "API_RATE_LIMIT",
  "BUDGET_UPSTREAM_EXHAUSTED",
  "API_OVERLOADED",
  "AI_ERROR",
  "EXTRACTION_FAILED",
];

export interface BlockContext {
  route: "chat" | "extract-ballot" | "research-candidate";
  /** Raw client IP. Hashed before logging — never logged in the clear. */
  ip?: string;
  sessionId?: string;
  /** Extra structured fields merged into the log line (e.g. percent, messageCount). */
  detail?: Record<string, unknown>;
}

/** Counters live ~35 days so a full month of daily buckets is always readable. */
const COUNTER_TTL_SECONDS = 35 * 24 * 60 * 60;

/** UTC day bucket, e.g. "2026-06-04". */
function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function blockCounterKey(reason: BlockReason, day: string): string {
  return `voter-choice:blocks:${day}:${reason}`;
}

/**
 * Privacy: never log a raw IP. Hash with SHA-256 and keep the first 10 hex
 * chars — enough to correlate repeated blocks from one source within a day
 * without storing a reversible identifier.
 */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 10);
}

/**
 * Fire-and-forget increment of the per-reason daily counter. Voided (not
 * awaited) so a slow/erroring Redis never delays the request, exactly like
 * `writeExtractionCache`. Skips entirely when the durable store isn't
 * configured (local dev, preview without Upstash).
 */
function incrementCounter(reason: BlockReason): void {
  if (!isDurableStoreConfigured()) return;
  const key = blockCounterKey(reason, utcDay());
  void (async () => {
    try {
      await redisCommand(["INCR", key]);
      await redisCommand(["EXPIRE", key, COUNTER_TTL_SECONDS]);
    } catch {
      // Telemetry counters are best-effort — a Redis hiccup must never
      // surface to the user or break the request.
    }
  })();
}

/**
 * Record that the app blocked a request.
 *
 * Side-effect-only: ALWAYS emits one structured `usage.blocked` log line, and
 * (when Redis is configured) fire-and-forget increments the per-reason daily
 * counter. Wrapped end-to-end in try/catch — this function must never throw,
 * never change the caller's HTTP response, and never delay it.
 */
export function recordBlock(reason: BlockReason, ctx: BlockContext): void {
  try {
    const { route, ip, sessionId, detail } = ctx;
    console.log(
      JSON.stringify({
        event: "usage.blocked",
        reason,
        route,
        ...(ip ? { ip_hash: hashIp(ip) } : {}),
        ...(sessionId ? { session: sessionId } : {}),
        ...(detail ?? {}),
        ts: new Date().toISOString(),
      }),
    );
    incrementCounter(reason);
  } catch {
    // Never throw from telemetry.
  }
}

/**
 * Read all block counters for a given UTC day (default: today). Returns
 * { reason: count } for every reason that has a non-zero count. Iterates the
 * known reason list (deterministic, avoids SCAN over the Upstash REST API).
 * Never throws — returns {} on any error or when the store is unconfigured.
 */
export async function getBlockStats(
  day?: string,
): Promise<Record<string, number>> {
  if (!isDurableStoreConfigured()) return {};
  const target = day ?? utcDay();
  try {
    const results = await Promise.all(
      ALL_BLOCK_REASONS.map(async (reason) => {
        const raw = await redisCommand<string | number>([
          "GET",
          blockCounterKey(reason, target),
        ]);
        const count = Number(raw ?? 0);
        return [reason, Number.isFinite(count) ? count : 0] as const;
      }),
    );
    const out: Record<string, number> = {};
    for (const [reason, count] of results) {
      if (count > 0) out[reason] = count;
    }
    return out;
  } catch {
    return {};
  }
}

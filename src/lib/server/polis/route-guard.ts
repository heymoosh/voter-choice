/**
 * Shared request guard for the four public GET /api/polis endpoints
 * (polis, bars, bridges, compass).
 *
 * These are unauthenticated reads over aggregate, non-personal data. Before
 * this guard they had no throttle and no origin check, so any page on the
 * internet could drive them via a victim's browser and each call fanned out
 * to a keyspace scan on the shared metered store. This adds three cheap
 * defenses that leave the legitimate same-origin client untouched:
 *
 *   1. Origin check — reject only a request whose `Origin` header is PRESENT
 *      and does NOT match `Host`. Same-origin GET fetches omit `Origin`
 *      entirely, so we must allow a missing origin or we'd 403 the real app.
 *      A cross-site `fetch()` always carries `Origin`, so this still blocks
 *      the browser-driven cross-site abuse we care about.
 *   2. Per-IP rate limit — mirrors the race-data read limiter: durable INCR
 *      when the store is configured, in-memory fallback otherwise, and it
 *      FAILS OPEN on a Redis hiccup (a read must never break the panels).
 *   3. Edge Cache-Control — the CDN serves repeats without touching the
 *      function, so bursts on any single query collapse to one origin hit.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isDurableStoreConfigured, redisCommand } from "../durable-store";
import { getClientIP } from "../client-ip";

/**
 * Edge cache policy for polis aggregates. They change slowly and tolerate
 * staleness, so cache at the CDN for a minute and keep serving the stale copy
 * for up to five more while one request refreshes it in the background. Errors
 * (403/429/400) are never sent with this header, so only good reads are cached.
 */
export const POLIS_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=300";

const WINDOW_SECONDS = 60;
const MAX_READS_PER_IP_PER_MINUTE = 120;

const memRateMap = new Map<string, { count: number; resetAt: number }>();

// Exposed for testing only.
export function _resetPolisRateLimitForTesting(): void {
  memRateMap.clear();
}

/**
 * True unless the request carries an `Origin` that disagrees with `Host`.
 * Missing origin (same-origin GET, server-side, curl) is allowed on purpose —
 * see the rate limiter for the throttle that still bounds those callers.
 */
export function validatePolisOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function checkPolisRateLimit(ip: string): Promise<boolean> {
  if (isDurableStoreConfigured()) {
    try {
      const key = `voter-choice:polis-rate:${ip}`;
      const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
      if (count === 1) {
        await redisCommand(["EXPIRE", key, WINDOW_SECONDS]);
      }
      return count <= MAX_READS_PER_IP_PER_MINUTE;
    } catch {
      // Fail open: a Redis hiccup must not break the polis panels.
      return true;
    }
  }

  const now = Date.now();
  const entry = memRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memRateMap.set(ip, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_READS_PER_IP_PER_MINUTE;
}

/**
 * Run the origin + rate-limit gate. Returns a short-circuit NextResponse
 * (403 or 429) to return immediately, or null when the request may proceed.
 */
export async function guardPolisRequest(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!validatePolisOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!(await checkPolisRateLimit(getClientIP(request)))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }
  return null;
}

/** JSON 200 response carrying the shared edge Cache-Control header. */
export function cachedPolisJson(body: unknown): NextResponse {
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": POLIS_CACHE_CONTROL },
  });
}

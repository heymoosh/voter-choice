/**
 * src/lib/server/rate-limited-get-params.ts
 *
 * Shared "rate-limit, then parse-or-bail" wrapper for the family of simple
 * GET routes that validate query params via a `(searchParams) => T |
 * Response` parser and rate-limit by IP through `checkCounterRateLimit`
 * (the /api/alignment, /api/donors, /api/promises pattern). Extracted so
 * the identical rate-limit-check-then-parse boilerplate isn't copy-pasted
 * route to route — see the duplication gate,
 * scripts/quality/duplication-gate.ts.
 *
 * Server-only.
 */

import { NextRequest } from "next/server";
import { checkCounterRateLimit } from "./counters-rate-limit";
import { getClientIP } from "./client-ip";

/**
 * Runs the counters-rate-limit IP check, then hands `parse` the request's
 * search params. Returns the 429 Response immediately on a rate-limit hit
 * without ever calling `parse`; otherwise returns whatever `parse` returns
 * — a validated params object, or `parse`'s own 4xx Response for bad input.
 */
export async function guardedGetParams<T>(
  request: NextRequest,
  parse: (searchParams: URLSearchParams) => T | Response,
): Promise<T | Response> {
  const ip = getClientIP(request);
  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  return parse(searchParams);
}

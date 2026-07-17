/**
 * Shared boilerplate for a simple no-auth, rate-limited JSON POST route:
 * check an IP rate limit, parse the JSON body, and validate it — producing
 * the standard 429/400 failure shapes. Extracted out of /api/counters and
 * /api/roster-feedback, which had each copy-pasted this scaffold verbatim —
 * same behavior, same response shapes, only the per-route rate-limit checker
 * and body validator differ.
 */

import { NextRequest, NextResponse } from "next/server";

export function rateLimitExceededResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Rate limit exceeded." },
    { status: 429 },
  );
}

export function invalidJsonResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Invalid JSON." },
    { status: 400 },
  );
}

export function invalidBodyResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Invalid request body." },
    { status: 400 },
  );
}

export type JsonRouteGateResult<T> =
  | { ok: true; body: T }
  | { ok: false; response: NextResponse };

/**
 * Runs the shared rate-limit → parse-JSON → validate sequence for a simple
 * POST route. Returns `{ ok: false, response }` with the short-circuit
 * response the caller should return immediately, or `{ ok: true, body }`
 * with the validated body when the request may proceed.
 */
export async function gateRateLimitedJsonRequest<T>(
  request: NextRequest,
  ip: string,
  checkRateLimit: (ip: string) => Promise<boolean>,
  validateBody: (body: unknown) => T | null,
): Promise<JsonRouteGateResult<T>> {
  if (!(await checkRateLimit(ip))) {
    return { ok: false, response: rateLimitExceededResponse() };
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { ok: false, response: invalidJsonResponse() };
  }

  const body = validateBody(rawBody);
  if (!body) return { ok: false, response: invalidBodyResponse() };

  return { ok: true, body };
}

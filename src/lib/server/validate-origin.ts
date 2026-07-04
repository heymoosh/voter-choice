import type { NextRequest } from "next/server";

/**
 * Same-origin check: true only when the request's `origin` header names the
 * same host as its `host` header. Used to reject cross-site requests to
 * routes that don't otherwise require auth. A missing header or an
 * unparseable origin fails closed (false).
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

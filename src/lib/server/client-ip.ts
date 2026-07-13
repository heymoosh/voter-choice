import type { NextRequest } from "next/server";

/**
 * Derive the client IP used for rate-limiting and abuse controls.
 *
 * TRUSTED-PROXY ASSUMPTION: this app runs behind Vercel's edge network, the one
 * trusted proxy hop. Vercel overwrites `x-real-ip` with the real connecting IP
 * and appends that same IP as the RIGHTMOST entry of `x-forwarded-for`.
 * Everything to the left of that last hop is client-supplied and spoofable — an
 * attacker can send `x-forwarded-for: evil, 1.2.3.4` to forge the leftmost
 * value. So we prefer `x-real-ip`, then fall back to the rightmost (trusted-
 * proxy-adjacent) entry of `x-forwarded-for`, never the leftmost.
 */
export function getClientIP(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
}

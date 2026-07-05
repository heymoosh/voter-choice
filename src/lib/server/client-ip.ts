import type { NextRequest } from "next/server";

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

// Covers full 8-group addresses, "::" compression at any position, and an
// IPv4-mapped suffix (e.g. "::ffff:1.2.3.4"). Not exhaustively RFC-perfect,
// but catches every well-formed address shape actually seen in these
// headers, which is all this fallback needs — anything else is garbage.
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;

/** True when `ip` is a well-formed IPv4 or IPv6 address. */
export function isValidIpAddress(ip: string): boolean {
  return IPV4_RE.test(ip) || IPV6_RE.test(ip);
}

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
 *
 * Both candidates are validated as a well-formed IPv4/IPv6 address before use
 * — trusting header SHAPE alone would let a garbled rightmost hop become the
 * rate-limit bucket key (e.g. bucketing every malformed request together, or
 * a key an attacker can influence). A candidate that fails validation is
 * treated as absent, never returned; "unknown" is the only fallback.
 */
export function getClientIP(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isValidIpAddress(realIp)) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const lastHop = hops[hops.length - 1];
    if (lastHop && isValidIpAddress(lastHop)) return lastHop;
  }

  return "unknown";
}

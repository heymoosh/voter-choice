import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIP } from "./client-ip";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("getClientIP", () => {
  it("returns a spoof-resistant IP for a multi-value x-forwarded-for", () => {
    // Attacker prepends a forged value; only the rightmost hop (added by the
    // trusted proxy) is credible. Must NOT resolve to the leftmost "evil".
    const req = makeRequest({ "x-forwarded-for": "evil, 1.2.3.4, 5.6.7.8" });
    const ip = getClientIP(req);
    expect(ip).not.toBe("evil");
    expect(ip).toBe("5.6.7.8");
  });

  it("prefers x-real-ip over a spoofable x-forwarded-for", () => {
    const req = makeRequest({
      "x-real-ip": "9.9.9.9",
      "x-forwarded-for": "evil, 1.2.3.4",
    });
    expect(getClientIP(req)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "9.9.9.9" });
    expect(getClientIP(req)).toBe("9.9.9.9");
  });

  it("uses the single x-forwarded-for value when there is one hop", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("trims surrounding whitespace on the resolved value", () => {
    const req = makeRequest({ "x-forwarded-for": "evil,   1.2.3.4  " });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("ignores empty entries in a malformed header", () => {
    const req = makeRequest({ "x-forwarded-for": "evil, ,, 1.2.3.4, ," });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const req = makeRequest({});
    expect(getClientIP(req)).toBe("unknown");
  });
});

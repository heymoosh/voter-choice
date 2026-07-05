import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIP, isValidIpAddress } from "./client-ip";

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

  it("falls back to 'unknown' when the rightmost x-forwarded-for hop is not a valid IP", () => {
    const req = makeRequest({ "x-forwarded-for": "evil, not-an-ip" });
    expect(getClientIP(req)).toBe("unknown");
  });

  it("falls back to 'unknown' when x-real-ip is garbage and there is no valid x-forwarded-for hop", () => {
    const req = makeRequest({ "x-real-ip": "'; DROP TABLE users;--" });
    expect(getClientIP(req)).toBe("unknown");
  });

  it("falls through to a valid x-forwarded-for hop when x-real-ip is garbage", () => {
    const req = makeRequest({
      "x-real-ip": "garbage",
      "x-forwarded-for": "evil, 5.6.7.8",
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("accepts a valid IPv6 address", () => {
    const req = makeRequest({ "x-real-ip": "2001:db8::1" });
    expect(getClientIP(req)).toBe("2001:db8::1");
  });
});

describe("isValidIpAddress", () => {
  it("accepts well-formed IPv4 addresses", () => {
    expect(isValidIpAddress("1.2.3.4")).toBe(true);
    expect(isValidIpAddress("255.255.255.255")).toBe(true);
    expect(isValidIpAddress("0.0.0.0")).toBe(true);
  });

  it("rejects malformed IPv4-shaped addresses", () => {
    expect(isValidIpAddress("256.1.1.1")).toBe(false);
    expect(isValidIpAddress("1.2.3")).toBe(false);
    expect(isValidIpAddress("1.2.3.4.5")).toBe(false);
    expect(isValidIpAddress("1.2.3.")).toBe(false);
  });

  it("accepts well-formed IPv6 addresses, including compressed and IPv4-mapped forms", () => {
    expect(isValidIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
      true,
    );
    expect(isValidIpAddress("2001:db8::1")).toBe(true);
    expect(isValidIpAddress("::1")).toBe(true);
    expect(isValidIpAddress("::ffff:192.168.1.1")).toBe(true);
  });

  it("rejects garbage, empty, and non-IP text", () => {
    expect(isValidIpAddress("")).toBe(false);
    expect(isValidIpAddress("not-an-ip")).toBe(false);
    expect(isValidIpAddress("evil")).toBe(false);
    expect(isValidIpAddress("'; DROP TABLE users;--")).toBe(false);
  });
});

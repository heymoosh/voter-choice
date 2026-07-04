import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { validateOrigin } from "./validate-origin";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("validateOrigin", () => {
  it("accepts a matching origin/host pair", () => {
    const req = makeRequest({
      origin: "https://voterchoice.app",
      host: "voterchoice.app",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects a cross-site origin", () => {
    const req = makeRequest({
      origin: "https://evil.example",
      host: "voterchoice.app",
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects when origin is missing", () => {
    const req = makeRequest({ host: "voterchoice.app" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects when host is missing", () => {
    const req = makeRequest({ origin: "https://voterchoice.app" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects an unparseable origin (fails closed)", () => {
    const req = makeRequest({
      origin: "not-a-url",
      host: "voterchoice.app",
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("matches when a non-default port is present on both sides", () => {
    const req = makeRequest({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects a port mismatch", () => {
    const req = makeRequest({
      origin: "http://localhost:3000",
      host: "localhost:4000",
    });
    expect(validateOrigin(req)).toBe(false);
  });
});

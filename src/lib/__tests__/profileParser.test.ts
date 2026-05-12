import { describe, it, expect } from "vitest";
import { parseProfileDate, validateProfileContent } from "../profileParser";

describe("parseProfileDate", () => {
  it("extracts date from a valid voter profile header", () => {
    const profile = `=== MY VOTER PROFILE — 2026-05-12 ===

LOCATION: Austin, TX

WHAT I CARE ABOUT:
- Environment

=== END VOTER PROFILE ===`;
    expect(parseProfileDate(profile)).toBe("2026-05-12");
  });

  it("returns null for invalid profile", () => {
    expect(parseProfileDate("random text")).toBeNull();
  });
});

describe("validateProfileContent", () => {
  it("accepts a valid .txt profile under 10KB", () => {
    const content =
      "=== MY VOTER PROFILE — 2026-05-12 ===\n\nSome content\n\n=== END VOTER PROFILE ===";
    expect(validateProfileContent(content, content.length)).toEqual({
      valid: true,
    });
  });

  it("rejects content over 10KB", () => {
    const content = "x".repeat(10241);
    const result = validateProfileContent(content, 10241);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("10KB");
    }
  });

  it("accepts any text content (even without profile markers)", () => {
    const result = validateProfileContent("custom voter notes", 18);
    expect(result.valid).toBe(true);
  });
});

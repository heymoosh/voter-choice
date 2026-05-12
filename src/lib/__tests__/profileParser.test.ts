import { describe, it, expect } from "vitest";
import { parseVoterProfile, validateProfileContent } from "../profileParser";

const validProfile = `
=== MY VOTER PROFILE — May 2026 ===

LOCATION: 73301, Texas, Travis County

WHAT I CARE ABOUT:
- Climate change action
- Healthcare affordability
- Education funding

HOW I MAKE DECISIONS:
- Evidence-based policy positions
- Bipartisan track record

MY VOTING HISTORY WITH THIS TOOL:
- Texas General 2024: Voted for climate-focused candidates

=== END VOTER PROFILE ===
`;

describe("parseVoterProfile", () => {
  it("extracts a valid voter profile", () => {
    const result = parseVoterProfile(validProfile);
    expect(result).not.toBeNull();
    expect(result).toContain("=== MY VOTER PROFILE");
    expect(result).toContain("Climate change action");
    expect(result).toContain("=== END VOTER PROFILE ===");
  });

  it("returns null when no profile marker", () => {
    const result = parseVoterProfile("No profile here.");
    expect(result).toBeNull();
  });

  it("handles profile without end marker (uses rest of text)", () => {
    const noEnd = "=== MY VOTER PROFILE — 2026 ===\nSome profile content here.";
    const result = parseVoterProfile(noEnd);
    expect(result).not.toBeNull();
    expect(result).toContain("Some profile content here.");
  });

  it("extracts profile from text with other content before it", () => {
    const textWithBefore = `Some AI response text here.

Here are some ballot suggestions.

=== MY VOTER PROFILE — 2026 ===

I care about the environment.

=== END VOTER PROFILE ===`;
    const result = parseVoterProfile(textWithBefore);
    expect(result).not.toBeNull();
    expect(result).toContain("I care about the environment.");
    expect(result).not.toContain("Some AI response text");
  });
});

describe("validateProfileContent", () => {
  it("validates a normal profile", () => {
    const result = validateProfileContent(validProfile);
    expect(result.valid).toBe(true);
  });

  it("rejects empty content", () => {
    const result = validateProfileContent("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects content over word limit", () => {
    const longContent = "word ".repeat(1001);
    const result = validateProfileContent(longContent);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too long");
  });

  it("accepts content right under word limit", () => {
    const justUnder = "word ".repeat(999);
    const result = validateProfileContent(justUnder);
    expect(result.valid).toBe(true);
  });
});

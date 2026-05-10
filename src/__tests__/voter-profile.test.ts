import { describe, it, expect } from "vitest";
import {
  parseVoterProfile,
  generateProfileText,
  isValidProfile,
} from "@/lib/voter-profile";

const sampleProfile = `=== MY VOTER PROFILE — 2026-05-10 ===

LOCATION: 78701, Texas

WHAT I CARE ABOUT:
- Education funding
- Climate policy

HOW I MAKE DECISIONS:
- Track record over promises

WHAT AFFECTS ME PERSONALLY:
- Renter, not homeowner

MY VOTING HISTORY WITH THIS TOOL:
- 2026 Primary: Researched statewide races

NOTES:
- First time using this tool

=== END VOTER PROFILE ===`;

describe("isValidProfile", () => {
  it("detects valid profile format", () => {
    expect(isValidProfile(sampleProfile)).toBe(true);
  });

  it("rejects random text", () => {
    expect(isValidProfile("random text")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidProfile("")).toBe(false);
  });

  it("rejects profile over 10KB", () => {
    const bigProfile = `=== MY VOTER PROFILE — 2026-05-10 ===\n${"x".repeat(11000)}\n=== END VOTER PROFILE ===`;
    expect(isValidProfile(bigProfile)).toBe(false);
  });
});

describe("parseVoterProfile", () => {
  it("parses location", () => {
    const parsed = parseVoterProfile(sampleProfile);
    expect(parsed.location).toContain("78701");
    expect(parsed.location).toContain("Texas");
  });

  it("parses values list", () => {
    const parsed = parseVoterProfile(sampleProfile);
    expect(parsed.values).toContain("Education funding");
    expect(parsed.values).toContain("Climate policy");
  });

  it("parses decision style", () => {
    const parsed = parseVoterProfile(sampleProfile);
    expect(parsed.decisionStyle).toContain("Track record over promises");
  });

  it("parses personal context", () => {
    const parsed = parseVoterProfile(sampleProfile);
    expect(parsed.personalContext).toContain("Renter, not homeowner");
  });
});

describe("generateProfileText", () => {
  it("generates downloadable profile with header/footer", () => {
    const text = generateProfileText({
      date: "2026-05-10",
      location: "78701, Texas",
      values: ["Education", "Climate"],
      decisionStyle: ["Track record over promises"],
      personalContext: ["Renter"],
      votingHistory: [],
      notes: [],
    });
    expect(text).toContain("=== MY VOTER PROFILE");
    expect(text).toContain("=== END VOTER PROFILE ===");
    expect(text).toContain("Education");
    expect(text).toContain("78701");
  });

  it("round-trips through generate and parse", () => {
    const data = {
      date: "2026-05-10",
      location: "90210, California",
      values: ["Housing", "Transit"],
      decisionStyle: ["Pragmatism over ideology"],
      personalContext: ["Has kids in public school"],
      votingHistory: ["2024 General: Researched all races"],
      notes: ["Check back before 2028"],
    };
    const text = generateProfileText(data);
    const parsed = parseVoterProfile(text);
    expect(parsed.location).toBe("90210, California");
    expect(parsed.values).toContain("Housing");
  });
});

import { describe, it, expect } from "vitest";
import {
  getDeadlineStatus,
  formatDate,
  allDeadlinesPassed,
} from "./deadline-status";

describe("getDeadlineStatus", () => {
  const today = new Date("2026-02-15T12:00:00"); // mid-February 2026

  it("returns passed when deadline is in the past", () => {
    const status = getDeadlineStatus("2026-02-01", today);
    expect(status.label).toBe("passed");
    expect(status.text).toBe("Passed");
    expect(status.date).toBeTruthy();
  });

  it("returns red when deadline is today (0 days)", () => {
    const status = getDeadlineStatus("2026-02-15", today);
    expect(status.label).toBe("red");
    expect(status.text).toMatch(/Today/i);
  });

  it("returns red when deadline is 1-3 days away", () => {
    const status = getDeadlineStatus("2026-02-17", today); // 2 days away
    expect(status.label).toBe("red");
    expect(status.text).toMatch(/2 days left/);
  });

  it("returns yellow when deadline is 4-14 days away", () => {
    const status = getDeadlineStatus("2026-02-22", today); // 7 days away
    expect(status.label).toBe("yellow");
    expect(status.text).toMatch(/7 days left/);
  });

  it("returns green when deadline is more than 14 days away", () => {
    const status = getDeadlineStatus("2026-03-15", today); // 28 days away
    expect(status.label).toBe("green");
    expect(status.text).toMatch(/28 days left/);
  });

  it("returns na for null deadline", () => {
    const status = getDeadlineStatus(null, today);
    expect(status.label).toBe("na");
    expect(status.text).toBe("Not available");
    expect(status.date).toBeNull();
  });

  it("returns na for undefined deadline", () => {
    const status = getDeadlineStatus(undefined, today);
    expect(status.label).toBe("na");
  });

  it("returns na for empty string deadline", () => {
    const status = getDeadlineStatus("", today);
    expect(status.label).toBe("na");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string to human-readable form", () => {
    const result = formatDate("2026-03-03");
    expect(result).toMatch(/March/i);
    expect(result).toMatch(/3/);
    expect(result).toMatch(/2026/);
  });

  it("returns Unknown for null", () => {
    expect(formatDate(null)).toBe("Unknown");
  });

  it("returns Unknown for undefined", () => {
    expect(formatDate(undefined)).toBe("Unknown");
  });
});

describe("allDeadlinesPassed", () => {
  it("returns true when all deadlines have label passed", () => {
    const deadlines = [
      { label: "passed" as const, text: "Passed", date: "Jan 1, 2026" },
      { label: "passed" as const, text: "Passed", date: "Jan 2, 2026" },
    ];
    expect(allDeadlinesPassed(deadlines)).toBe(true);
  });

  it("returns false when some deadlines have not passed", () => {
    const deadlines = [
      { label: "passed" as const, text: "Passed", date: "Jan 1, 2026" },
      { label: "green" as const, text: "20 days left", date: "Feb 20, 2026" },
    ];
    expect(allDeadlinesPassed(deadlines)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(allDeadlinesPassed([])).toBe(false);
  });

  it("ignores na deadlines and returns true if remaining real deadlines are all passed", () => {
    const deadlines = [
      { label: "passed" as const, text: "Passed", date: "Jan 1, 2026" },
      { label: "na" as const, text: "Not available", date: null },
    ];
    // na means "not available" — real deadline passed, so allDeadlinesPassed = true
    expect(allDeadlinesPassed(deadlines)).toBe(true);
  });

  it("returns false when array contains only na deadlines", () => {
    const deadlines = [
      { label: "na" as const, text: "Not available", date: null },
    ];
    expect(allDeadlinesPassed(deadlines)).toBe(false);
  });
});

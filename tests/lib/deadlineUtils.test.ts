import { describe, it, expect } from "vitest";
import { getDeadlineInfo } from "@/lib/deadlineUtils";

// Create local dates (not UTC-parsed) to avoid timezone offset issues
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("getDeadlineInfo", () => {
  it("returns passed for dates in the past", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-03-01", today);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.daysLeft).toBeNull();
  });

  it("returns red with 'Today' for deadline on today", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-11", today);
    expect(result.status).toBe("red");
    expect(result.label).toBe("Today");
    expect(result.daysLeft).toBe(0);
  });

  it("returns red for 1 day left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-12", today);
    expect(result.status).toBe("red");
    expect(result.daysLeft).toBe(1);
  });

  it("returns red for 3 days left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-14", today);
    expect(result.status).toBe("red");
    expect(result.daysLeft).toBe(3);
  });

  it("returns yellow for 4 days left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-15", today);
    expect(result.status).toBe("yellow");
    expect(result.daysLeft).toBe(4);
  });

  it("returns yellow for 14 days left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-25", today);
    expect(result.status).toBe("yellow");
    expect(result.daysLeft).toBe(14);
  });

  it("returns green for 15 days left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-26", today);
    expect(result.status).toBe("green");
    expect(result.daysLeft).toBe(15);
  });

  it("returns green for 20 days left", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo("2026-05-31", today);
    expect(result.status).toBe("green");
    expect(result.daysLeft).toBe(20);
  });

  it("returns passed for null deadline", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo(null, today);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Not available");
  });

  it("returns passed for undefined deadline", () => {
    const today = localDate(2026, 5, 11);
    const result = getDeadlineInfo(undefined, today);
    expect(result.status).toBe("passed");
  });
});

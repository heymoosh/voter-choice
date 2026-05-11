import { describe, it, expect } from "vitest";
import {
  getDaysRemaining,
  getDeadlineStatus,
  getDeadlineLabel,
  formatDate,
  allDeadlinesPassed,
} from "../deadlineUtils";
import { DeadlineStatus } from "../types";

const TODAY = new Date(2026, 4, 11); // May 11, 2026

describe("getDaysRemaining", () => {
  it("returns positive days for future deadline", () => {
    expect(getDaysRemaining("2026-05-25", TODAY)).toBe(14);
  });

  it("returns 0 for today", () => {
    expect(getDaysRemaining("2026-05-11", TODAY)).toBe(0);
  });

  it("returns negative for past deadline", () => {
    expect(getDaysRemaining("2026-05-01", TODAY)).toBe(-10);
  });
});

describe("getDeadlineStatus", () => {
  it("returns GREEN for >14 days", () => {
    expect(getDeadlineStatus("2026-06-01", TODAY)).toBe(DeadlineStatus.GREEN);
  });

  it("returns YELLOW for 14 days exactly", () => {
    expect(getDeadlineStatus("2026-05-25", TODAY)).toBe(DeadlineStatus.YELLOW);
  });

  it("returns YELLOW for 8 days", () => {
    expect(getDeadlineStatus("2026-05-19", TODAY)).toBe(DeadlineStatus.YELLOW);
  });

  it("returns RED for 3 days", () => {
    expect(getDeadlineStatus("2026-05-14", TODAY)).toBe(DeadlineStatus.RED);
  });

  it("returns RED for 0 days (today)", () => {
    expect(getDeadlineStatus("2026-05-11", TODAY)).toBe(DeadlineStatus.RED);
  });

  it("returns PASSED for past deadline", () => {
    expect(getDeadlineStatus("2026-05-01", TODAY)).toBe(DeadlineStatus.PASSED);
  });

  it("returns PASSED for null deadline", () => {
    expect(getDeadlineStatus(null, TODAY)).toBe(DeadlineStatus.PASSED);
  });
});

describe("getDeadlineLabel", () => {
  it("returns 'Passed' for past date", () => {
    expect(getDeadlineLabel("2026-05-01", TODAY)).toBe("Passed");
  });

  it("returns 'Today — Last Day' for today", () => {
    expect(getDeadlineLabel("2026-05-11", TODAY)).toBe("Today — Last Day");
  });

  it("returns '1 day left' for tomorrow", () => {
    expect(getDeadlineLabel("2026-05-12", TODAY)).toBe("1 day left");
  });

  it("returns correct days for future", () => {
    expect(getDeadlineLabel("2026-05-25", TODAY)).toBe("14 days left");
  });

  it("returns 'Not available' for null", () => {
    expect(getDeadlineLabel(null, TODAY)).toBe("Not available");
  });
});

describe("formatDate", () => {
  it("formats ISO date to readable string", () => {
    expect(formatDate("2026-03-03")).toBe("March 3, 2026");
  });

  it("formats November date", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
  });
});

describe("allDeadlinesPassed", () => {
  it("returns true when all deadlines passed", () => {
    expect(allDeadlinesPassed(["2026-01-01", "2026-02-01"], TODAY)).toBe(true);
  });

  it("returns false when at least one deadline is in the future", () => {
    expect(allDeadlinesPassed(["2026-01-01", "2026-12-01"], TODAY)).toBe(false);
  });

  it("returns true for empty array", () => {
    expect(allDeadlinesPassed([], TODAY)).toBe(true);
  });

  it("ignores null deadlines", () => {
    expect(allDeadlinesPassed([null, "2026-01-01"], TODAY)).toBe(true);
  });
});

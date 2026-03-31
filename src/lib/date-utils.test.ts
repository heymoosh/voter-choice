import { describe, it, expect } from "vitest";
import { getDeadlineStatus, formatDate, findNextElection } from "./date-utils";

describe("getDeadlineStatus", () => {
  it("returns unavailable for null deadline", () => {
    const result = getDeadlineStatus(null, new Date("2026-03-31"));
    expect(result.status).toBe("unavailable");
    expect(result.daysRemaining).toBeNull();
    expect(result.label).toBe("Not available");
  });

  it("returns passed for a past deadline", () => {
    const result = getDeadlineStatus("2026-03-01", new Date("2026-03-31"));
    expect(result.status).toBe("passed");
    expect(result.daysRemaining).toBeNull();
    expect(result.label).toBe("Passed");
  });

  it("returns red for deadline today (0 days)", () => {
    const result = getDeadlineStatus("2026-03-31", new Date("2026-03-31"));
    expect(result.status).toBe("red");
    expect(result.daysRemaining).toBe(0);
  });

  it("returns red for 1 day left with singular label", () => {
    const result = getDeadlineStatus("2026-04-01", new Date("2026-03-31"));
    expect(result.status).toBe("red");
    expect(result.daysRemaining).toBe(1);
    expect(result.label).toBe("1 day left");
  });

  it("returns red for 3 days left", () => {
    const result = getDeadlineStatus("2026-04-03", new Date("2026-03-31"));
    expect(result.status).toBe("red");
    expect(result.daysRemaining).toBe(3);
  });

  it("returns yellow for 4 days left", () => {
    const result = getDeadlineStatus("2026-04-04", new Date("2026-03-31"));
    expect(result.status).toBe("yellow");
    expect(result.daysRemaining).toBe(4);
  });

  it("returns yellow for 14 days left", () => {
    const result = getDeadlineStatus("2026-04-14", new Date("2026-03-31"));
    expect(result.status).toBe("yellow");
    expect(result.daysRemaining).toBe(14);
  });

  it("returns green for 15 days left", () => {
    const result = getDeadlineStatus("2026-04-15", new Date("2026-03-31"));
    expect(result.status).toBe("green");
    expect(result.daysRemaining).toBe(15);
  });

  it("returns green for far-future deadline", () => {
    const result = getDeadlineStatus("2026-11-03", new Date("2026-03-31"));
    expect(result.status).toBe("green");
  });
});

describe("formatDate", () => {
  it("returns Not available for null", () => {
    expect(formatDate(null)).toBe("Not available");
  });

  it("formats a date string into human-readable form", () => {
    const result = formatDate("2026-05-26");
    expect(result).toContain("2026");
    expect(result).toContain("May");
  });
});

describe("findNextElection", () => {
  const elections = [
    { id: "e1", date: "2026-03-03" },
    { id: "e2", date: "2026-05-26" },
    { id: "e3", date: "2026-11-03" },
  ];

  it("returns the nearest upcoming election", () => {
    const result = findNextElection(elections, new Date("2026-03-31"));
    expect(result?.id).toBe("e2");
  });

  it("returns election on today's date", () => {
    const result = findNextElection(elections, new Date("2026-03-03"));
    expect(result?.id).toBe("e1");
  });

  it("returns null when all elections are in the past", () => {
    const result = findNextElection(elections, new Date("2026-12-01"));
    expect(result).toBeNull();
  });

  it("returns the only election when it is in the future", () => {
    const result = findNextElection(
      [{ id: "only", date: "2026-11-03" }],
      new Date("2026-03-31"),
    );
    expect(result?.id).toBe("only");
  });
});

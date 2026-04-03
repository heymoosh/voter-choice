import { describe, it, expect } from "vitest";
import { getDeadlineStatus } from "./getDeadlineStatus";

describe("getDeadlineStatus", () => {
  const today = "2026-03-30";

  it("returns green for deadlines more than 14 days away", () => {
    const result = getDeadlineStatus("2026-04-20", today); // 21 days away
    expect(result.color).toBe("green");
    expect(result.daysLeft).toBe(21);
    expect(result.label).toBe("21 days left");
  });

  it("returns yellow for deadlines 4-14 days away", () => {
    const result = getDeadlineStatus("2026-04-07", today); // 8 days away
    expect(result.color).toBe("yellow");
    expect(result.daysLeft).toBe(8);
    expect(result.label).toBe("8 days left");
  });

  it("returns yellow for exactly 14 days away", () => {
    const result = getDeadlineStatus("2026-04-13", today); // 14 days
    expect(result.color).toBe("yellow");
    expect(result.daysLeft).toBe(14);
  });

  it("returns red for deadlines 1-3 days away", () => {
    const result = getDeadlineStatus("2026-04-01", today); // 2 days away
    expect(result.color).toBe("red");
    expect(result.daysLeft).toBe(2);
    expect(result.label).toBe("2 days left");
  });

  it("returns red with 'Today (last day)' label for daysLeft === 0", () => {
    const result = getDeadlineStatus("2026-03-30", today); // same day
    expect(result.color).toBe("red");
    expect(result.daysLeft).toBe(0);
    expect(result.label).toBe("Today (last day)");
  });

  it("returns passed for deadlines in the past", () => {
    const result = getDeadlineStatus("2026-03-01", today); // 29 days ago
    expect(result.color).toBe("passed");
    expect(result.daysLeft).toBeLessThan(0);
    expect(result.label).toBe("Passed");
  });

  it("returns the original date in the result", () => {
    const result = getDeadlineStatus("2026-04-20", today);
    expect(result.date).toBe("2026-04-20");
  });

  it("uses today's actual date when todayISO not provided", () => {
    // Should not throw and should return a valid DeadlineStatus
    const result = getDeadlineStatus("2026-12-31");
    expect(result).toHaveProperty("color");
    expect(result).toHaveProperty("daysLeft");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("date");
  });
});

describe("getDeadlineStatus — Spanish mode", () => {
  const today = "2026-03-30";

  it("returns Spanish 'Quedan X días' label for future deadline", () => {
    const result = getDeadlineStatus("2026-04-20", today, "es");
    expect(result.label).toBe("Quedan 21 días");
  });

  it("returns Spanish 'Pasado' label for past deadline", () => {
    const result = getDeadlineStatus("2026-03-01", today, "es");
    expect(result.label).toBe("Pasado");
  });

  it("returns Spanish label for 0 days left", () => {
    const result = getDeadlineStatus("2026-03-30", today, "es");
    expect(result.label).toMatch(/Hoy|hoy/);
  });

  it("English label unchanged when lang is 'en'", () => {
    const enResult = getDeadlineStatus("2026-04-20", today, "en");
    const defaultResult = getDeadlineStatus("2026-04-20", today);
    expect(enResult.label).toBe(defaultResult.label);
  });
});

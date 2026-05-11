import { describe, it, expect } from "vitest";
import { getDeadlineInfo } from "./deadlineStatus";

describe("getDeadlineInfo", () => {
  it("returns passed for a date in the past", () => {
    const info = getDeadlineInfo("2020-01-01", new Date("2026-05-11"));
    expect(info.status).toBe("passed");
    expect(info.label).toMatch(/passed/i);
    expect(info.daysRemaining).toBeNull();
  });

  it("returns red for deadline 2 days away", () => {
    const info = getDeadlineInfo("2026-05-13", new Date("2026-05-11"));
    expect(info.status).toBe("red");
    expect(info.daysRemaining).toBe(2);
    expect(info.label).toMatch(/2 days/i);
  });

  it("returns yellow for deadline 10 days away", () => {
    const info = getDeadlineInfo("2026-05-21", new Date("2026-05-11"));
    expect(info.status).toBe("yellow");
    expect(info.daysRemaining).toBe(10);
  });

  it("returns green for deadline 20 days away", () => {
    const info = getDeadlineInfo("2026-05-31", new Date("2026-05-11"));
    expect(info.status).toBe("green");
    expect(info.daysRemaining).toBe(20);
  });

  it("returns passed for null deadline", () => {
    const info = getDeadlineInfo(null, new Date("2026-05-11"));
    expect(info.status).toBe("passed");
    expect(info.date).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  getDeadlineInfo,
  formatDate,
  getNextElection,
} from "@/lib/deadlineUtils";

describe("getDeadlineInfo", () => {
  const today = new Date("2026-05-11");

  it("returns 'passed' for a date in the past", () => {
    const result = getDeadlineInfo("2026-03-01", today);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.daysLeft).toBeNull();
  });

  it("returns 'green' for more than 14 days remaining", () => {
    const result = getDeadlineInfo("2026-06-15", today);
    expect(result.status).toBe("green");
    expect(result.daysLeft).toBeGreaterThan(14);
  });

  it("returns 'yellow' for 14 days or fewer remaining", () => {
    const result = getDeadlineInfo("2026-05-20", today);
    expect(result.status).toBe("yellow");
    expect(result.daysLeft).toBeLessThanOrEqual(14);
    expect(result.daysLeft).toBeGreaterThan(3);
  });

  it("returns 'red' for 3 days or fewer remaining", () => {
    const result = getDeadlineInfo("2026-05-13", today);
    expect(result.status).toBe("red");
    expect(result.daysLeft).toBeLessThanOrEqual(3);
  });

  it("returns 'unavailable' for null deadline", () => {
    const result = getDeadlineInfo(null, today);
    expect(result.status).toBe("unavailable");
    expect(result.label).toBe("Not available");
    expect(result.daysLeft).toBeNull();
  });

  it("returns 'unavailable' for undefined deadline", () => {
    const result = getDeadlineInfo(undefined, today);
    expect(result.status).toBe("unavailable");
  });

  it("includes the date in the result", () => {
    const result = getDeadlineInfo("2026-11-03", today);
    expect(result.date).toBe("2026-11-03");
  });

  it("handles exact same-day deadline", () => {
    const result = getDeadlineInfo("2026-05-11", today);
    expect(result.status).toBe("red");
    expect(result.label).toBe("Today");
    expect(result.daysLeft).toBe(0);
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
  });

  it("formats March date correctly", () => {
    expect(formatDate("2026-03-03")).toBe("March 3, 2026");
  });

  it("returns 'Unknown' for null", () => {
    expect(formatDate(null)).toBe("Unknown");
  });

  it("returns 'Unknown' for undefined", () => {
    expect(formatDate(undefined)).toBe("Unknown");
  });
});

describe("getNextElection", () => {
  const elections = [
    {
      id: "1",
      date: "2026-03-03",
      name: "Primary",
      type: "primary" as const,
      isPrimary: true,
      primaryType: "open" as const,
    },
    {
      id: "2",
      date: "2026-05-26",
      name: "Runoff",
      type: "runoff" as const,
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "3",
      date: "2026-11-03",
      name: "General",
      type: "general" as const,
      isPrimary: false,
      primaryType: null,
    },
  ];

  it("returns the next upcoming election", () => {
    const today = new Date("2026-05-11");
    const result = getNextElection(elections, today);
    expect(result?.name).toBe("Runoff");
  });

  it("returns null when no upcoming elections", () => {
    const today = new Date("2027-01-01");
    const result = getNextElection(elections, today);
    expect(result).toBeNull();
  });

  it("includes election on today's date", () => {
    const today = new Date("2026-05-26");
    const result = getNextElection(elections, today);
    expect(result?.name).toBe("Runoff");
  });

  it("skips past elections", () => {
    const today = new Date("2026-04-01");
    const result = getNextElection(elections, today);
    expect(result?.name).toBe("Runoff");
  });
});

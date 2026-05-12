import { describe, it, expect } from "vitest";
import {
  findNextElection,
  getDeadlineStatus,
  formatDate,
  getTodayIso,
} from "../electionUtils";
import type { Election } from "@/types/election";

const mockElections: Election[] = [
  {
    id: "past",
    name: "Past Election",
    date: "2020-11-03",
    type: "general",
    isPrimary: false,
    primaryType: null,
  },
  {
    id: "future-primary",
    name: "2026 Primary",
    date: "2026-05-26",
    type: "primary",
    isPrimary: true,
    primaryType: "open",
  },
  {
    id: "future-general",
    name: "2026 General",
    date: "2026-11-03",
    type: "general",
    isPrimary: false,
    primaryType: null,
  },
];

describe("findNextElection", () => {
  it("returns the first upcoming election", () => {
    const result = findNextElection(mockElections);
    expect(result).not.toBeNull();
    // Should be the soonest future election relative to today (2026-05-11)
    // 2026-05-26 is after today, 2026-11-03 is later
    expect(result!.id).toBe("future-primary");
  });

  it("returns null if all elections are in the past", () => {
    const pastOnly = [mockElections[0]];
    const result = findNextElection(pastOnly);
    expect(result).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(findNextElection([])).toBeNull();
  });

  it("sorts by date and returns earliest upcoming", () => {
    const elections: Election[] = [
      { ...mockElections[2] }, // 2026-11-03
      { ...mockElections[1] }, // 2026-05-26
    ];
    const result = findNextElection(elections);
    expect(result!.date).toBe("2026-05-26");
  });
});

describe("getDeadlineStatus", () => {
  it("returns passed status for null deadline", () => {
    const result = getDeadlineStatus(null);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Not available");
  });

  it("returns passed status for past deadline", () => {
    const result = getDeadlineStatus("2020-01-01");
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
  });

  it("returns red status for deadline within 3 days", () => {
    // Use a dynamic date: 2 days from now (always within red threshold of 7 days)
    const today = getTodayIso();
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 2);
    const futureDate = d.toISOString().split("T")[0];
    const result = getDeadlineStatus(futureDate);
    expect(result.status).toBe("red");
    expect(result.daysLeft).toBe(2);
  });

  it("returns yellow status for deadline within 14 days", () => {
    // Use a dynamic date: 10 days from now (within yellow threshold of 14 days)
    const today = getTodayIso();
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 10);
    const futureDate = d.toISOString().split("T")[0];
    const result = getDeadlineStatus(futureDate);
    expect(result.status).toBe("yellow");
  });

  it("returns green status for deadline more than 14 days away", () => {
    const futureDate = "2026-06-30";
    const result = getDeadlineStatus(futureDate);
    expect(result.status).toBe("green");
    expect(result.label).toMatch(/days left/);
  });
});

describe("formatDate", () => {
  it("formats a date correctly", () => {
    const result = formatDate("2026-03-03");
    expect(result).toContain("March");
    expect(result).toContain("3");
    expect(result).toContain("2026");
  });

  it("handles November dates", () => {
    const result = formatDate("2026-11-03");
    expect(result).toContain("November");
  });
});

describe("getTodayIso", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = getTodayIso();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

import { describe, it, expect } from "vitest";
import {
  getDeadlineStatus,
  formatDate,
  findNextElection,
} from "../deadlineStatus";
import type { Election } from "../types";

const TODAY = new Date(2026, 4, 11); // May 11, 2026

describe("getDeadlineStatus", () => {
  it("returns passed for a deadline in the past", () => {
    const result = getDeadlineStatus("2026-02-01", TODAY);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
  });

  it("returns urgent for a deadline 1 day away", () => {
    const result = getDeadlineStatus("2026-05-12", TODAY);
    expect(result.status).toBe("urgent");
    expect(result.daysRemaining).toBe(1);
  });

  it("returns urgent for a deadline 3 days away", () => {
    const result = getDeadlineStatus("2026-05-14", TODAY);
    expect(result.status).toBe("urgent");
    expect(result.daysRemaining).toBe(3);
  });

  it("returns warning for a deadline 7 days away", () => {
    const result = getDeadlineStatus("2026-05-18", TODAY);
    expect(result.status).toBe("warning");
    expect(result.daysRemaining).toBe(7);
  });

  it("returns warning for a deadline 14 days away", () => {
    const result = getDeadlineStatus("2026-05-25", TODAY);
    expect(result.status).toBe("warning");
    expect(result.daysRemaining).toBe(14);
  });

  it("returns ok for a deadline more than 14 days away", () => {
    const result = getDeadlineStatus("2026-06-30", TODAY);
    expect(result.status).toBe("ok");
  });

  it("returns na for null deadline", () => {
    const result = getDeadlineStatus(null, TODAY);
    expect(result.status).toBe("na");
  });

  it("returns today for today's deadline", () => {
    const result = getDeadlineStatus("2026-05-11", TODAY);
    expect(result.status).toBe("urgent");
    expect(result.daysRemaining).toBe(0);
    expect(result.label).toBe("Today");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2026-03-03");
    expect(result).toContain("2026");
    expect(result).toContain("3"); // day
  });

  it("returns N/A for null", () => {
    expect(formatDate(null)).toBe("N/A");
  });
});

const makeElection = (id: string, date: string, name: string): Election => ({
  id,
  date,
  name,
  type: "general",
  isPrimary: false,
  primaryType: null,
});

describe("findNextElection", () => {
  const elections = [
    makeElection("a", "2026-03-03", "Past Election"),
    makeElection("b", "2026-05-26", "Next Runoff"),
    makeElection("c", "2026-11-03", "General Election"),
  ];

  it("finds the next upcoming election", () => {
    const result = findNextElection(elections, TODAY);
    expect(result?.name).toBe("Next Runoff");
  });

  it("returns null when all elections are in the past", () => {
    const pastElections = [makeElection("a", "2026-01-01", "Past")];
    const result = findNextElection(pastElections, TODAY);
    expect(result).toBeNull();
  });

  it("returns null for empty elections array", () => {
    const result = findNextElection([], TODAY);
    expect(result).toBeNull();
  });
});

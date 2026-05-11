import { describe, it, expect } from "vitest";
import {
  getDeadlineStatus,
  formatDate,
  findNextElection,
  allDeadlinesPassed,
} from "../deadlineUtils";

// Helper to create ISO date N days from today
function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Helper to create ISO date N days AGO
function daysAgo(n: number): string {
  return daysFromToday(-n);
}

describe("getDeadlineStatus", () => {
  it("returns 'passed' for a date in the past", () => {
    const status = getDeadlineStatus(daysAgo(5));
    expect(status.tier).toBe("passed");
    expect(status.daysRemaining).toBeNull();
    expect(status.label).toBe("Passed");
  });

  it("returns 'red' for a date 1 day from now", () => {
    const status = getDeadlineStatus(daysFromToday(1));
    expect(status.tier).toBe("red");
    expect(status.daysRemaining).toBe(1);
    expect(status.label).toBe("1 day left");
  });

  it("returns 'red' for a date 3 days from now", () => {
    const status = getDeadlineStatus(daysFromToday(3));
    expect(status.tier).toBe("red");
    expect(status.daysRemaining).toBe(3);
  });

  it("returns 'yellow' for a date 4 days from now", () => {
    const status = getDeadlineStatus(daysFromToday(4));
    expect(status.tier).toBe("yellow");
    expect(status.daysRemaining).toBe(4);
  });

  it("returns 'yellow' for a date 14 days from now", () => {
    const status = getDeadlineStatus(daysFromToday(14));
    expect(status.tier).toBe("yellow");
    expect(status.daysRemaining).toBe(14);
  });

  it("returns 'green' for a date 15 days from now", () => {
    const status = getDeadlineStatus(daysFromToday(15));
    expect(status.tier).toBe("green");
    expect(status.daysRemaining).toBe(15);
  });

  it("returns 'green' for a date far in the future", () => {
    const status = getDeadlineStatus(daysFromToday(100));
    expect(status.tier).toBe("green");
  });

  it("returns 'red' for today (0 days remaining)", () => {
    const status = getDeadlineStatus(daysFromToday(0));
    expect(status.tier).toBe("red");
    expect(status.daysRemaining).toBe(0);
    expect(status.label).toMatch(/today/i);
  });
});

describe("formatDate", () => {
  it("formats an ISO date to human-readable form", () => {
    const result = formatDate("2026-11-03");
    expect(result).toMatch(/November/i);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/3/);
  });
});

describe("findNextElection", () => {
  it("returns the first upcoming election", () => {
    const elections = [
      { date: daysAgo(10), name: "Past Election" },
      { date: daysFromToday(30), name: "Upcoming Election" },
      { date: daysFromToday(90), name: "Future Election" },
    ];
    const result = findNextElection(elections);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Upcoming Election");
  });

  it("returns null when all elections are in the past", () => {
    const elections = [
      { date: daysAgo(30), name: "Past Election 1" },
      { date: daysAgo(10), name: "Past Election 2" },
    ];
    expect(findNextElection(elections)).toBeNull();
  });

  it("returns null for empty elections array", () => {
    expect(findNextElection([])).toBeNull();
  });
});

describe("allDeadlinesPassed", () => {
  it("returns true when all deadlines are in the past", () => {
    const reg = {
      online: { deadline: daysAgo(30) },
      byMail: { deadline: daysAgo(25) },
      inPerson: { deadline: daysAgo(20) },
    };
    expect(allDeadlinesPassed(reg)).toBe(true);
  });

  it("returns false when at least one deadline is in the future", () => {
    const reg = {
      online: { deadline: daysAgo(5) },
      byMail: { deadline: daysAgo(5) },
      inPerson: { deadline: daysFromToday(5) },
    };
    expect(allDeadlinesPassed(reg)).toBe(false);
  });
});

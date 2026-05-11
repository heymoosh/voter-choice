import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  daysUntil,
  getDeadlineStatus,
  calcDeadline,
  findNextElection,
  formatDate,
} from "../deadlines";
import type { Election } from "../types";

// Pin "today" to a known date for deterministic tests
const TODAY = "2026-05-11";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY + "T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("daysUntil", () => {
  it("returns 0 for today", () => {
    expect(daysUntil("2026-05-11")).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    expect(daysUntil("2026-05-12")).toBe(1);
  });

  it("returns 14 for 14 days out", () => {
    expect(daysUntil("2026-05-25")).toBe(14);
  });

  it("returns null for past dates", () => {
    expect(daysUntil("2026-05-01")).toBeNull();
  });

  it("returns null for yesterday", () => {
    expect(daysUntil("2026-05-10")).toBeNull();
  });
});

describe("getDeadlineStatus", () => {
  it("returns green for > 14 days", () => {
    expect(getDeadlineStatus("2026-06-01")).toBe("green");
  });

  it("returns yellow for exactly 14 days", () => {
    expect(getDeadlineStatus("2026-05-25")).toBe("yellow");
  });

  it("returns yellow for 7 days", () => {
    expect(getDeadlineStatus("2026-05-18")).toBe("yellow");
  });

  it("returns red for exactly 3 days", () => {
    expect(getDeadlineStatus("2026-05-14")).toBe("red");
  });

  it("returns red for 1 day", () => {
    expect(getDeadlineStatus("2026-05-12")).toBe("red");
  });

  it("returns red for today (0 days)", () => {
    expect(getDeadlineStatus("2026-05-11")).toBe("red");
  });

  it("returns passed for past dates", () => {
    expect(getDeadlineStatus("2026-02-02")).toBe("passed");
  });
});

describe("calcDeadline", () => {
  it("sets passed label for past dates", () => {
    const result = calcDeadline("2026-02-02");
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.daysLeft).toBeNull();
  });

  it("sets 'Today' label for today", () => {
    const result = calcDeadline("2026-05-11");
    expect(result.label).toBe("Today");
    expect(result.daysLeft).toBe(0);
  });

  it("sets '1 day left' for tomorrow", () => {
    const result = calcDeadline("2026-05-12");
    expect(result.label).toBe("1 day left");
    expect(result.daysLeft).toBe(1);
  });

  it("sets '<N> days left' for future dates", () => {
    const result = calcDeadline("2026-06-01");
    expect(result.label).toMatch(/\d+ days left/);
  });
});

describe("findNextElection", () => {
  const elections: Election[] = [
    {
      id: "e1",
      name: "Past Election",
      date: "2026-03-03",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
    {
      id: "e2",
      name: "Future Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "e3",
      name: "General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ];

  it("returns the soonest upcoming election", () => {
    const result = findNextElection(elections);
    expect(result?.id).toBe("e2");
  });

  it("returns null if all elections are in the past", () => {
    const past: Election[] = [
      {
        id: "p1",
        name: "Old Election",
        date: "2025-01-01",
        type: "general",
        isPrimary: false,
        primaryType: null,
      },
    ];
    expect(findNextElection(past)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(findNextElection([])).toBeNull();
  });

  it("includes today as upcoming", () => {
    const todayElection: Election[] = [
      {
        id: "t1",
        name: "Today Election",
        date: "2026-05-11",
        type: "primary",
        isPrimary: true,
        primaryType: "open",
      },
    ];
    const result = findNextElection(todayElection);
    expect(result?.id).toBe("t1");
  });
});

describe("formatDate", () => {
  it("formats date in human-readable form", () => {
    const formatted = formatDate("2026-11-03");
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/November|Nov/);
    expect(formatted).toContain("3");
  });
});

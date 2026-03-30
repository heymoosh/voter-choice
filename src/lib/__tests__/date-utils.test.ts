import { describe, it, expect } from "vitest";
import {
  computeDeadlineStatus,
  getNextElection,
  formatDate,
} from "../date-utils";
import type { Election } from "../../types/election";

const elections: Election[] = [
  {
    id: "e1",
    name: "Past Election",
    date: "2025-01-01",
    type: "primary",
    isPrimary: true,
    primaryType: "open",
  },
  {
    id: "e2",
    name: "Future Election",
    date: "2026-11-03",
    type: "general",
    isPrimary: false,
    primaryType: null,
  },
  {
    id: "e3",
    name: "Near Election",
    date: "2026-05-26",
    type: "runoff",
    isPrimary: false,
    primaryType: null,
  },
];

const today = new Date("2026-03-21");

describe("getNextElection", () => {
  it("returns the earliest future election", () => {
    const result = getNextElection(elections, today);
    expect(result?.id).toBe("e3");
  });

  it("returns null if no future elections", () => {
    const pastOnly: Election[] = [elections[0]];
    expect(getNextElection(pastOnly, today)).toBeNull();
  });

  it("includes today as 'upcoming' (date >= today)", () => {
    const todayElection: Election[] = [{ ...elections[0], date: "2026-03-21" }];
    expect(getNextElection(todayElection, today)).not.toBeNull();
  });
});

describe("computeDeadlineStatus", () => {
  it("returns na for null deadline", () => {
    const result = computeDeadlineStatus(null, today);
    expect(result.urgency).toBe("na");
    expect(result.label).toBe("Not available");
    expect(result.daysLeft).toBeNull();
  });

  it("returns passed for a past deadline", () => {
    const result = computeDeadlineStatus("2026-02-01", today);
    expect(result.urgency).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.daysLeft).toBe(0);
  });

  it("returns urgent for deadline 3 or fewer days away", () => {
    const result = computeDeadlineStatus("2026-03-24", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(3);
    expect(result.label).toBe("3 days left");
  });

  it("returns warning for 4-14 days away", () => {
    const result = computeDeadlineStatus("2026-04-01", today);
    expect(result.urgency).toBe("warning");
    expect(result.daysLeft).toBe(11);
    expect(result.label).toBe("11 days left");
  });

  it("returns ok for more than 14 days away", () => {
    const result = computeDeadlineStatus("2026-05-01", today);
    expect(result.urgency).toBe("ok");
    expect(result.daysLeft).toBe(41);
    expect(result.label).toBe("41 days left");
  });

  it("returns urgent for deadline exactly today", () => {
    const result = computeDeadlineStatus("2026-03-21", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(0);
    expect(result.label).toBe("Today");
  });

  it("returns urgent for 1 day left", () => {
    const result = computeDeadlineStatus("2026-03-22", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(1);
    expect(result.label).toBe("1 day left");
  });
});

describe("formatDate", () => {
  it("formats ISO date as 'Month D, YYYY'", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
    expect(formatDate("2026-03-21")).toBe("March 21, 2026");
  });
});

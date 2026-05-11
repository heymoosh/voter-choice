import { describe, test, expect, vi, afterEach } from "vitest";
import { calcDeadline, findNextElection, formatDate } from "./deadlines";

describe("calcDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns not-available for null date", () => {
    const result = calcDeadline(null);
    expect(result.status).toBe("not-available");
    expect(result.label).toBe("Not available");
  });

  test("returns passed for past date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00"));
    const result = calcDeadline("2026-03-01");
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    vi.useRealTimers();
  });

  test("returns red for date <= 3 days out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00"));
    const result = calcDeadline("2026-03-03");
    expect(result.status).toBe("red");
    expect(result.daysLeft).toBe(2);
    vi.useRealTimers();
  });

  test("returns yellow for date 4-14 days out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00"));
    const result = calcDeadline("2026-03-10");
    expect(result.status).toBe("yellow");
    expect(result.daysLeft).toBe(9);
    vi.useRealTimers();
  });

  test("returns green for date more than 14 days out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00"));
    const result = calcDeadline("2026-03-01");
    expect(result.status).toBe("green");
    vi.useRealTimers();
  });
});

describe("formatDate", () => {
  test("formats ISO date to readable string", () => {
    const result = formatDate("2026-03-03");
    expect(result).toMatch(/March/);
    expect(result).toMatch(/2026/);
  });
});

describe("findNextElection", () => {
  const elections = [
    { date: "2026-03-03", name: "Primary" },
    { date: "2026-05-26", name: "Runoff" },
    { date: "2026-11-03", name: "General" },
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns first upcoming election", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00")); // after primary, before runoff
    const result = findNextElection(elections);
    expect(result?.name).toBe("Runoff");
    vi.useRealTimers();
  });

  test("returns null when all elections are past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T00:00:00"));
    const result = findNextElection(elections);
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  test("returns first election when all are upcoming", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00"));
    const result = findNextElection(elections);
    expect(result?.name).toBe("Primary");
    vi.useRealTimers();
  });
});

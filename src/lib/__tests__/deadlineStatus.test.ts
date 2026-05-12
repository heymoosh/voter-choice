import { describe, it, expect } from "vitest";
import { getDeadlineStatus } from "../deadlineStatus";

describe("getDeadlineStatus", () => {
  it("returns passed status when deadline is in the past", () => {
    const result = getDeadlineStatus("2020-01-01", new Date("2026-05-11"));
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.colorClass).toBe("text-gray-500");
  });

  it("returns urgent status when 3 or fewer days remain", () => {
    const result = getDeadlineStatus("2026-05-13", new Date("2026-05-11"));
    expect(result.status).toBe("urgent");
    expect(result.daysLeft).toBe(2);
    expect(result.colorClass).toBe("text-red-600");
  });

  it("returns warning status when 14 or fewer days remain", () => {
    const result = getDeadlineStatus("2026-05-20", new Date("2026-05-11"));
    expect(result.status).toBe("warning");
    expect(result.daysLeft).toBe(9);
    expect(result.colorClass).toBe("text-yellow-600");
  });

  it("returns ok status when more than 14 days remain", () => {
    const result = getDeadlineStatus("2026-06-30", new Date("2026-05-11"));
    expect(result.status).toBe("ok");
    expect(result.colorClass).toBe("text-green-600");
  });

  it("returns passed when deadline is today", () => {
    const result = getDeadlineStatus("2026-05-11", new Date("2026-05-11"));
    expect(result.status).toBe("passed");
  });
});

describe("getDeadlineStatus (Spanish)", () => {
  it("returns Spanish passed label", () => {
    const result = getDeadlineStatus(
      "2020-01-01",
      new Date("2026-05-11"),
      "es",
    );
    expect(result.label).toBe("Pasó");
  });

  it("returns Spanish days-left label (plural)", () => {
    const result = getDeadlineStatus(
      "2026-06-30",
      new Date("2026-05-11"),
      "es",
    );
    expect(result.label).toMatch(/^Quedan \d+ días$/);
  });

  it("returns Spanish days-left label (singular)", () => {
    const result = getDeadlineStatus(
      "2026-05-12",
      new Date("2026-05-11"),
      "es",
    );
    expect(result.label).toBe("Quedan 1 día");
  });

  it("returns Spanish urgent label", () => {
    const result = getDeadlineStatus(
      "2026-05-13",
      new Date("2026-05-11"),
      "es",
    );
    expect(result.label).toMatch(/Quedan 2 días/);
    expect(result.status).toBe("urgent");
  });
});

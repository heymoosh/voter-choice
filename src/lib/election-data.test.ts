import { describe, it, expect } from "vitest";
import { formatDate, getDeadlineStatus } from "./election-data";

describe("formatDate", () => {
  it("formats dates in English by default", () => {
    const result = formatDate("2026-03-03");
    expect(result).toContain("March");
    expect(result).toContain("2026");
  });

  it("formats dates in Spanish when locale is es", () => {
    const result = formatDate("2026-03-03", "es");
    expect(result).toBe("3 de marzo de 2026");
  });

  it("formats all months in Spanish correctly", () => {
    const months = [
      ["2026-01-15", "enero"],
      ["2026-02-15", "febrero"],
      ["2026-04-15", "abril"],
      ["2026-05-15", "mayo"],
      ["2026-06-15", "junio"],
      ["2026-07-15", "julio"],
      ["2026-08-15", "agosto"],
      ["2026-09-15", "septiembre"],
      ["2026-10-15", "octubre"],
      ["2026-11-15", "noviembre"],
      ["2026-12-15", "diciembre"],
    ];
    for (const [date, month] of months) {
      expect(formatDate(date, "es")).toContain(month);
    }
  });

  it("uses en-US format when locale is en-US", () => {
    const result = formatDate("2026-11-03", "en-US");
    expect(result).toContain("November");
    expect(result).toContain("2026");
  });
});

describe("getDeadlineStatus", () => {
  it("returns passed status for past dates", () => {
    const { isPassed, status } = getDeadlineStatus("2020-01-01");
    expect(isPassed).toBe(true);
    expect(status).toBe("passed");
  });

  it("returns good status for dates far in the future", () => {
    const { isPassed, status } = getDeadlineStatus("2099-12-31");
    expect(isPassed).toBe(false);
    expect(status).toBe("good");
  });
});

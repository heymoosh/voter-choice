import { describe, it, expect } from "vitest";
import {
  daysUntil,
  getDeadlineStatus,
  formatDate,
  getDeadlineLabel,
} from "../lib/date-utils";

const today = new Date("2026-02-15T12:00:00");

describe("daysUntil", () => {
  it("returns positive days for future deadline", () => {
    expect(daysUntil("2026-02-20", today)).toBe(5);
  });

  it("returns negative days for past deadline", () => {
    expect(daysUntil("2026-02-10", today)).toBe(-5);
  });

  it("returns 0 for today", () => {
    expect(daysUntil("2026-02-15", today)).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    expect(daysUntil("2026-02-16", today)).toBe(1);
  });

  it("handles month boundaries", () => {
    expect(daysUntil("2026-03-01", today)).toBe(14);
  });
});

describe("getDeadlineStatus", () => {
  it("returns safe when >14 days remaining", () => {
    expect(getDeadlineStatus("2026-03-15", today)).toBe("safe");
  });

  it("returns warning when exactly 14 days remaining", () => {
    expect(getDeadlineStatus("2026-03-01", today)).toBe("warning");
  });

  it("returns warning when 4-14 days remaining", () => {
    expect(getDeadlineStatus("2026-02-25", today)).toBe("warning");
  });

  it("returns urgent when exactly 3 days remaining", () => {
    expect(getDeadlineStatus("2026-02-18", today)).toBe("urgent");
  });

  it("returns urgent when 1 day remaining", () => {
    expect(getDeadlineStatus("2026-02-16", today)).toBe("urgent");
  });

  it("returns urgent when 0 days (today)", () => {
    expect(getDeadlineStatus("2026-02-15", today)).toBe("urgent");
  });

  it("returns passed when deadline has passed", () => {
    expect(getDeadlineStatus("2026-02-10", today)).toBe("passed");
  });

  it("returns passed when deadline is null", () => {
    expect(getDeadlineStatus(null, today)).toBe("passed");
  });
});

describe("formatDate", () => {
  it("formats ISO date to human-readable", () => {
    expect(formatDate("2026-03-03")).toBe("March 3, 2026");
  });

  it("formats another date correctly", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
  });

  it("formats February date", () => {
    expect(formatDate("2026-02-02")).toBe("February 2, 2026");
  });
});

describe("getDeadlineLabel", () => {
  it('returns "Passed" for past deadlines', () => {
    expect(getDeadlineLabel("2026-02-10", today)).toBe("Passed");
  });

  it('returns "Today!" for today', () => {
    expect(getDeadlineLabel("2026-02-15", today)).toBe("Today!");
  });

  it('returns "Tomorrow!" for tomorrow', () => {
    expect(getDeadlineLabel("2026-02-16", today)).toBe("Tomorrow!");
  });

  it('returns "X days left" for future dates', () => {
    expect(getDeadlineLabel("2026-02-20", today)).toBe("5 days left");
  });

  it('returns "Not available" for null deadline', () => {
    expect(getDeadlineLabel(null, today)).toBe("Not available");
  });
});

describe("formatDate with lang param", () => {
  it("returns Spanish locale date for April when lang='es'", () => {
    expect(formatDate("2026-04-03", "es")).toBe("3 de abril de 2026");
  });

  it("returns Spanish locale date for November when lang='es'", () => {
    expect(formatDate("2026-11-03", "es")).toBe("3 de noviembre de 2026");
  });

  it("returns Spanish locale date for February when lang='es'", () => {
    expect(formatDate("2026-02-15", "es")).toBe("15 de febrero de 2026");
  });

  it("returns English date when lang='en' (explicit)", () => {
    expect(formatDate("2026-04-03", "en")).toBe("April 3, 2026");
  });

  it("returns English date when lang omitted (default backward compat)", () => {
    expect(formatDate("2026-04-03")).toBe("April 3, 2026");
  });
});

describe("getDeadlineLabel with lang='es'", () => {
  it("returns 'Quedan X días' for multiple days remaining", () => {
    // today = Feb 15, deadline = Feb 27 → 12 days
    expect(getDeadlineLabel("2026-02-27", today, "es")).toBe("Quedan 12 días");
  });

  it("returns 'Plazo pasado' for past deadline", () => {
    expect(getDeadlineLabel("2026-02-10", today, "es")).toBe("Plazo pasado");
  });

  it("returns '¡Hoy!' for today", () => {
    expect(getDeadlineLabel("2026-02-15", today, "es")).toBe("¡Hoy!");
  });

  it("returns 'Queda 1 día' for exactly 1 day remaining", () => {
    expect(getDeadlineLabel("2026-02-16", today, "es")).toBe("Queda 1 día");
  });

  it("returns 'No disponible' for null deadline", () => {
    expect(getDeadlineLabel(null, today, "es")).toBe("No disponible");
  });

  it("returns English label when lang='en' (explicit)", () => {
    expect(getDeadlineLabel("2026-02-27", today, "en")).toBe("12 days left");
  });

  it("returns English label when lang omitted (default backward compat)", () => {
    expect(getDeadlineLabel("2026-02-27", today)).toBe("12 days left");
  });
});

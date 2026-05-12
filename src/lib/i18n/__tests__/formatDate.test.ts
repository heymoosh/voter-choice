import { describe, it, expect } from "vitest";
import { formatDateLocale } from "../formatDate";

describe("formatDateLocale", () => {
  it("formats a date in en-US style", () => {
    const result = formatDateLocale("2026-03-03", "en");
    expect(result).toBe("March 3, 2026");
  });

  it("formats a date in es-MX style", () => {
    const result = formatDateLocale("2026-03-03", "es");
    expect(result).toMatch(/3 de marzo de 2026/);
  });

  it("handles null date gracefully", () => {
    const result = formatDateLocale(null, "en");
    expect(result).toBe("");
  });

  it("handles undefined date gracefully", () => {
    const result = formatDateLocale(undefined, "es");
    expect(result).toBe("");
  });

  it("formats January 1 correctly in English", () => {
    const result = formatDateLocale("2026-01-01", "en");
    expect(result).toBe("January 1, 2026");
  });

  it("formats December 31 in Spanish", () => {
    const result = formatDateLocale("2026-12-31", "es");
    expect(result).toMatch(/31 de diciembre de 2026/);
  });

  it("formats a date in Vietnamese (tháng) style", () => {
    const result = formatDateLocale("2026-03-03", "vi");
    // Intl with vi-VN produces "3 tháng 3, 2026" or similar
    expect(result).toMatch(/3/);
    expect(result).toMatch(/2026/);
    expect(result.toLowerCase()).toMatch(/tháng/);
  });

  it("formats a date in Chinese (Year年Month月Day日) style", () => {
    const result = formatDateLocale("2026-03-03", "zh");
    expect(result).toBe("2026年3月3日");
  });

  it("formats January 1 in Chinese", () => {
    const result = formatDateLocale("2026-01-01", "zh");
    expect(result).toBe("2026年1月1日");
  });

  it("formats a date in Arabic style", () => {
    const result = formatDateLocale("2026-03-03", "ar");
    // Should contain Arabic month name and year
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/3/);
    // Arabic month name for March
    expect(result).toMatch(/مارس/);
  });
});

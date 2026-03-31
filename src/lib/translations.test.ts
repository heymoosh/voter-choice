import { describe, it, expect } from "vitest";
import { translations } from "./translations";
import type { Language } from "./translations";

const languages: Language[] = ["en", "es"];

describe("translations", () => {
  it("has both en and es translations", () => {
    expect(translations.en).toBeDefined();
    expect(translations.es).toBeDefined();
  });

  it.each(languages)("all string keys are non-empty for %s", (lang) => {
    const t = translations[lang];
    for (const [key, value] of Object.entries(t)) {
      if (typeof value === "string") {
        expect(value.length, `${key} should not be empty for ${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it("deadlineDaysLeft returns correct English format", () => {
    expect(translations.en.deadlineDaysLeft(5)).toBe("5 days left");
    expect(translations.en.deadlineDaysLeft(30)).toBe("30 days left");
  });

  it("deadlineDaysLeft returns correct Spanish format", () => {
    expect(translations.es.deadlineDaysLeft(5)).toBe("Quedan 5 días");
    expect(translations.es.deadlineDaysLeft(30)).toBe("Quedan 30 días");
  });

  it("deadlineDayLeft is singular form for 1 day", () => {
    expect(translations.en.deadlineDayLeft).toBe("1 day left");
    expect(translations.es.deadlineDayLeft).toBe("Queda 1 día");
  });

  it("en and es have the same set of keys", () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();
    expect(enKeys).toEqual(esKeys);
  });
});

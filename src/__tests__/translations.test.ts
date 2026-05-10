import { describe, it, expect } from "vitest";
import { t, TRANSLATIONS } from "@/lib/translations";

describe("translations", () => {
  it("returns English string for en locale", () => {
    expect(t("hero.title", "en")).toBe(TRANSLATIONS.en["hero.title"]);
  });

  it("returns Spanish string for es locale", () => {
    expect(t("hero.title", "es")).toBe(TRANSLATIONS.es["hero.title"]);
  });

  it("all English keys have Spanish translations", () => {
    for (const key of Object.keys(TRANSLATIONS.en)) {
      expect(
        TRANSLATIONS.es[key as keyof typeof TRANSLATIONS.es],
        `Missing Spanish translation for key: ${key}`,
      ).toBeDefined();
    }
  });

  it("Spanish hero title differs from English", () => {
    expect(TRANSLATIONS.es["hero.title"]).not.toBe(
      TRANSLATIONS.en["hero.title"],
    );
  });

  it("Spanish submit button text differs from English", () => {
    expect(TRANSLATIONS.es["zip.submit"]).not.toBe(
      TRANSLATIONS.en["zip.submit"],
    );
  });

  it("language toggle shows Español in English mode", () => {
    expect(t("lang.toggle", "en")).toBe("Español");
  });

  it("language toggle shows English in Spanish mode", () => {
    expect(t("lang.toggle", "es")).toBe("English");
  });
});

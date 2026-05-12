import { describe, it, expect } from "vitest";
import {
  en,
  es,
  vi,
  zh,
  ar,
  getTranslation,
  interpolate,
} from "../translations";
import type { Language, Translations } from "../translations";

const allLanguages: [Language, Translations][] = [
  ["en", en],
  ["es", es],
  ["vi", vi],
  ["zh", zh],
  ["ar", ar],
];

const enKeys = Object.keys(en).sort();

describe("translations — key parity across all 5 languages", () => {
  for (const [lang, record] of allLanguages) {
    it(`${lang} has the same keys as en`, () => {
      const keys = Object.keys(record).sort();
      expect(keys).toEqual(enKeys);
    });
  }
});

describe("translations — all values are non-empty strings", () => {
  for (const [lang, record] of allLanguages) {
    it(`all ${lang} values are non-empty strings`, () => {
      for (const [key, value] of Object.entries(record)) {
        expect(typeof value, `${lang}.${key} should be a string`).toBe(
          "string",
        );
        expect(
          value.length,
          `${lang}.${key} should not be empty`,
        ).toBeGreaterThan(0);
      }
    });
  }
});

describe("getTranslation", () => {
  it("returns English for lang=en", () => {
    expect(getTranslation("en", "zipSubmitButton")).toBe("Look up my ballot");
  });

  it("returns Spanish for lang=es", () => {
    expect(getTranslation("es", "zipSubmitButton")).toBe("Buscar mi boleta");
  });

  it("returns Vietnamese for lang=vi", () => {
    expect(getTranslation("vi", "zipSubmitButton")).toBe(
      "Tra cứu lá phiếu của tôi",
    );
  });

  it("returns Chinese for lang=zh", () => {
    expect(getTranslation("zh", "zipSubmitButton")).toBe("查询我的选票");
  });

  it("returns Arabic for lang=ar", () => {
    expect(getTranslation("ar", "zipSubmitButton")).toBe(
      "ابحث عن ورقة اقتراعي",
    );
  });

  it("returns English error messages", () => {
    expect(getTranslation("en", "zipErrorEmpty")).toBe(
      "Please enter a zip code",
    );
    expect(getTranslation("en", "zipErrorInvalid")).toBe(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("returns Spanish error messages", () => {
    expect(getTranslation("es", "zipErrorEmpty")).toBe(
      "Por favor ingresa un código postal",
    );
    expect(getTranslation("es", "zipErrorInvalid")).toBe(
      "Por favor ingresa un código postal válido de 5 dígitos",
    );
  });

  it("all language toggle labels are different from English", () => {
    const enLabel = getTranslation("en", "languageToggleLabel");
    for (const lang of ["es", "vi", "zh", "ar"] as Language[]) {
      expect(
        getTranslation(lang, "languageToggleLabel"),
        `${lang} languageToggleLabel should differ from en`,
      ).not.toBe(enLabel);
    }
  });
});

describe("interpolate", () => {
  it("replaces single placeholder", () => {
    expect(interpolate("Hello, {name}!", { name: "World" })).toBe(
      "Hello, World!",
    );
  });

  it("replaces multiple placeholders", () => {
    expect(
      interpolate("{zip} in {state}", { zip: "73301", state: "Texas" }),
    ).toBe("73301 in Texas");
  });

  it("leaves unknown placeholders intact", () => {
    expect(interpolate("Hello {unknown}", {})).toBe("Hello {unknown}");
  });

  it("handles template with no placeholders", () => {
    expect(interpolate("No placeholders here", {})).toBe(
      "No placeholders here",
    );
  });
});

import { describe, it, expect } from "vitest";
import { translations } from "../i18n/translations";
import type { Language } from "../i18n/translations";

const languages: Language[] = ["en", "es"];

describe("translations", () => {
  it("has both English and Spanish translations", () => {
    expect(translations.en).toBeDefined();
    expect(translations.es).toBeDefined();
  });

  it("has same keys in both languages", () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  languages.forEach((lang) => {
    describe(`${lang} translations`, () => {
      it("has non-empty heroHeadline", () => {
        expect(translations[lang].heroHeadline.length).toBeGreaterThan(0);
      });

      it("has non-empty zipSubmitButton", () => {
        expect(translations[lang].zipSubmitButton.length).toBeGreaterThan(0);
      });

      it("has non-empty zipErrorEmpty", () => {
        expect(translations[lang].zipErrorEmpty.length).toBeGreaterThan(0);
      });

      it("has non-empty zipErrorInvalid", () => {
        expect(translations[lang].zipErrorInvalid.length).toBeGreaterThan(0);
      });

      it("has non-empty notFoundMessage", () => {
        expect(translations[lang].notFoundMessage.length).toBeGreaterThan(0);
      });

      it("has non-empty copyButton", () => {
        expect(translations[lang].copyButton.length).toBeGreaterThan(0);
      });

      it("has non-empty copyConfirmation", () => {
        expect(translations[lang].copyConfirmation.length).toBeGreaterThan(0);
      });
    });
  });

  it("English site title mentions Voter Choice", () => {
    expect(translations.en.siteTitle).toContain("Voter Choice");
  });

  it("Spanish site title mentions Voter Choice", () => {
    expect(translations.es.siteTitle).toContain("Voter Choice");
  });

  it("English tipText mentions don't know", () => {
    expect(translations.en.tip1.toLowerCase()).toContain("don't know");
  });

  it("Spanish tipText mentions No sé", () => {
    expect(translations.es.tip1).toContain("No sé");
  });
});

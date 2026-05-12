import { describe, it, expect } from "vitest";
import {
  translations,
  getTranslations,
  BALLOT_PROMPT_ES,
} from "./translations";

// ---- Translation coverage --------------------------------------------------

describe("translations", () => {
  it("has both 'en' and 'es' languages defined", () => {
    expect(translations.en).toBeDefined();
    expect(translations.es).toBeDefined();
  });

  it("en translation has correct lang code", () => {
    expect(translations.en.lang).toBe("en");
  });

  it("es translation has correct lang code", () => {
    expect(translations.es.lang).toBe("es");
  });

  it("en toggle label points to Español", () => {
    expect(translations.en.langToggleLabel).toBe("Español");
  });

  it("es toggle label points to English", () => {
    expect(translations.es.langToggleLabel).toBe("English");
  });

  it("both translations have identical keys", () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("no translation key is an empty string", () => {
    for (const [lang, t] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(t)) {
        expect(
          typeof value === "string" && value.trim() !== "",
          `${lang}.${key} should not be empty`,
        ).toBe(true);
      }
    }
  });
});

// ---- getTranslations -------------------------------------------------------

describe("getTranslations", () => {
  it("returns English translations for 'en'", () => {
    const t = getTranslations("en");
    expect(t.lang).toBe("en");
    expect(t.heroTitle).toBe("Free AI Ballot Research Tool");
  });

  it("returns Spanish translations for 'es'", () => {
    const t = getTranslations("es");
    expect(t.lang).toBe("es");
    expect(t.heroTitle).toContain("Herramienta");
  });

  it("Spanish error messages are in Spanish", () => {
    const t = getTranslations("es");
    expect(t.errorEmpty).toBe("Por favor ingresa un código postal");
    expect(t.errorInvalidZip).toContain("5 dígitos");
  });

  it("Spanish deadline badge labels are in Spanish", () => {
    const t = getTranslations("es");
    expect(t.deadlineBadgePassed).toBe("Pasada");
    expect(t.deadlineBadgeToday).toBe("¡Hoy!");
    expect(t.deadlineBadgeDaysLeft).toContain("{n}");
  });

  it("English deadline badge labels are in English", () => {
    const t = getTranslations("en");
    expect(t.deadlineBadgePassed).toBe("Passed");
    expect(t.deadlineBadgeToday).toBe("Today!");
    expect(t.deadlineBadgeDaysLeft).toContain("{n}");
  });
});

// ---- BALLOT_PROMPT_ES ------------------------------------------------------

describe("BALLOT_PROMPT_ES", () => {
  it("is a non-empty string", () => {
    expect(typeof BALLOT_PROMPT_ES).toBe("string");
    expect(BALLOT_PROMPT_ES.trim().length).toBeGreaterThan(100);
  });

  it("contains Spanish text", () => {
    expect(BALLOT_PROMPT_ES).toContain("asistente");
    expect(BALLOT_PROMPT_ES).toContain("elección");
  });

  it("contains all 7 steps", () => {
    expect(BALLOT_PROMPT_ES).toContain("PASO 1");
    expect(BALLOT_PROMPT_ES).toContain("PASO 2");
    expect(BALLOT_PROMPT_ES).toContain("PASO 3");
    expect(BALLOT_PROMPT_ES).toContain("PASO 7");
  });

  it("uses tú voice (informal Spanish)", () => {
    expect(BALLOT_PROMPT_ES).toMatch(/\bpuedes\b/i);
  });
});

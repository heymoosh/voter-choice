import { describe, it, expect } from "vitest";
import {
  translations,
  getTranslations,
  BALLOT_PROMPT_ES,
  BALLOT_PROMPT_VI,
  BALLOT_PROMPT_ZH,
  BALLOT_PROMPT_AR,
  getBallotPrompt,
} from "./translations";

// ---- Translation coverage --------------------------------------------------

describe("translations", () => {
  it("has all 5 languages defined", () => {
    expect(translations.en).toBeDefined();
    expect(translations.es).toBeDefined();
    expect(translations.vi).toBeDefined();
    expect(translations.zh).toBeDefined();
    expect(translations.ar).toBeDefined();
  });

  it("en translation has correct lang code", () => {
    expect(translations.en.lang).toBe("en");
  });

  it("es translation has correct lang code", () => {
    expect(translations.es.lang).toBe("es");
  });

  it("vi translation has correct lang code", () => {
    expect(translations.vi.lang).toBe("vi");
  });

  it("zh translation has correct lang code", () => {
    expect(translations.zh.lang).toBe("zh");
  });

  it("ar translation has correct lang code", () => {
    expect(translations.ar.lang).toBe("ar");
  });

  it("en toggle label points to Español", () => {
    expect(translations.en.langToggleLabel).toBe("Español");
  });

  it("es toggle label points to English (backward compat)", () => {
    expect(translations.es.langToggleLabel).toBe("English");
  });

  it("vi toggle label points to English (toggle reverts to en)", () => {
    expect(translations.vi.langToggleLabel).toBe("English");
  });

  it("zh toggle label points to English (toggle reverts to en)", () => {
    expect(translations.zh.langToggleLabel).toBe("English");
  });

  it("ar toggle label points to English (toggle reverts to en)", () => {
    expect(translations.ar.langToggleLabel).toBe("English");
  });

  it("all translations have identical keys", () => {
    const enKeys = Object.keys(translations.en).sort();
    for (const lang of ["es", "vi", "zh", "ar"] as const) {
      const keys = Object.keys(translations[lang]).sort();
      expect(keys, `${lang} keys should match en`).toEqual(enKeys);
    }
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

  it("returns Vietnamese translations for 'vi'", () => {
    const t = getTranslations("vi");
    expect(t.lang).toBe("vi");
    expect(t.heroTitle).toContain("Bầu Cử");
  });

  it("returns Chinese translations for 'zh'", () => {
    const t = getTranslations("zh");
    expect(t.lang).toBe("zh");
    expect(t.heroTitle).toContain("AI");
  });

  it("returns Arabic translations for 'ar'", () => {
    const t = getTranslations("ar");
    expect(t.lang).toBe("ar");
    expect(t.heroTitle).toContain("الاقتراع");
  });

  it("Spanish error messages are in Spanish", () => {
    const t = getTranslations("es");
    expect(t.errorEmpty).toBe("Por favor ingresa un código postal");
    expect(t.errorInvalidZip).toContain("5 dígitos");
  });

  it("Vietnamese error messages are in Vietnamese", () => {
    const t = getTranslations("vi");
    expect(t.errorEmpty).toContain("Vui lòng");
  });

  it("Chinese error messages are in Chinese", () => {
    const t = getTranslations("zh");
    expect(t.errorEmpty).toContain("请");
  });

  it("Arabic error messages are in Arabic", () => {
    const t = getTranslations("ar");
    expect(t.errorEmpty).toContain("يرجى");
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

  it("Vietnamese deadline badges contain {n} placeholder", () => {
    const t = getTranslations("vi");
    expect(t.deadlineBadgeDaysLeft).toContain("{n}");
  });

  it("Chinese deadline badges contain {n} placeholder", () => {
    const t = getTranslations("zh");
    expect(t.deadlineBadgeDaysLeft).toContain("{n}");
  });

  it("Arabic deadline badges contain {n} placeholder", () => {
    const t = getTranslations("ar");
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

// ---- BALLOT_PROMPT_VI -------------------------------------------------------

describe("BALLOT_PROMPT_VI", () => {
  it("is a non-empty string", () => {
    expect(typeof BALLOT_PROMPT_VI).toBe("string");
    expect(BALLOT_PROMPT_VI.trim().length).toBeGreaterThan(100);
  });

  it("contains Vietnamese text", () => {
    // "bầu cử" = election, appears throughout the prompt
    expect(BALLOT_PROMPT_VI).toContain("bầu cử");
  });

  it("contains all 7 steps", () => {
    expect(BALLOT_PROMPT_VI).toContain("BƯỚC 1");
    expect(BALLOT_PROMPT_VI).toContain("BƯỚC 7");
  });

  it("uses formal bạn register", () => {
    expect(BALLOT_PROMPT_VI).toMatch(/\bbạn\b/);
  });
});

// ---- BALLOT_PROMPT_ZH -------------------------------------------------------

describe("BALLOT_PROMPT_ZH", () => {
  it("is a non-empty string", () => {
    expect(typeof BALLOT_PROMPT_ZH).toBe("string");
    expect(BALLOT_PROMPT_ZH.trim().length).toBeGreaterThan(100);
  });

  it("contains Chinese simplified text", () => {
    expect(BALLOT_PROMPT_ZH).toContain("选票");
  });

  it("contains all 7 steps", () => {
    expect(BALLOT_PROMPT_ZH).toContain("第一步");
    expect(BALLOT_PROMPT_ZH).toContain("第七步");
  });

  it("uses informal 你 register", () => {
    // \b does not work with CJK; check for presence of 你 directly
    expect(BALLOT_PROMPT_ZH).toContain("你");
  });
});

// ---- BALLOT_PROMPT_AR -------------------------------------------------------

describe("BALLOT_PROMPT_AR", () => {
  it("is a non-empty string", () => {
    expect(typeof BALLOT_PROMPT_AR).toBe("string");
    expect(BALLOT_PROMPT_AR.trim().length).toBeGreaterThan(100);
  });

  it("contains Arabic text", () => {
    expect(BALLOT_PROMPT_AR).toContain("اقتراع");
  });

  it("contains all 7 steps in Arabic", () => {
    expect(BALLOT_PROMPT_AR).toContain("الخطوة الأولى");
    expect(BALLOT_PROMPT_AR).toContain("الخطوة السابعة");
  });

  it("uses Modern Standard Arabic (MSA)", () => {
    // MSA uses أنت/you formal
    expect(BALLOT_PROMPT_AR).toMatch(/أنت/);
  });
});

// ---- getBallotPrompt --------------------------------------------------------

describe("getBallotPrompt", () => {
  it("returns undefined for English (uses default)", () => {
    expect(getBallotPrompt("en")).toBeUndefined();
  });

  it("returns BALLOT_PROMPT_ES for Spanish", () => {
    expect(getBallotPrompt("es")).toBe(BALLOT_PROMPT_ES);
  });

  it("returns BALLOT_PROMPT_VI for Vietnamese", () => {
    expect(getBallotPrompt("vi")).toBe(BALLOT_PROMPT_VI);
  });

  it("returns BALLOT_PROMPT_ZH for Chinese", () => {
    expect(getBallotPrompt("zh")).toBe(BALLOT_PROMPT_ZH);
  });

  it("returns BALLOT_PROMPT_AR for Arabic", () => {
    expect(getBallotPrompt("ar")).toBe(BALLOT_PROMPT_AR);
  });
});

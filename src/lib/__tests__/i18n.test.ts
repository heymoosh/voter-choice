import { describe, it, expect } from "vitest";
import { translations, tStr, daysLeftLabel } from "../i18n";

describe("translations", () => {
  it("has all required keys in both languages", () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("has all required keys in vi, zh, ar", () => {
    const enKeys = Object.keys(translations.en).sort();
    const viKeys = Object.keys(translations.vi).sort();
    const zhKeys = Object.keys(translations.zh).sort();
    const arKeys = Object.keys(translations.ar).sort();
    expect(viKeys).toEqual(enKeys);
    expect(zhKeys).toEqual(enKeys);
    expect(arKeys).toEqual(enKeys);
  });

  it("tStr returns a string for string keys", () => {
    expect(typeof tStr("en", "heroHeadline")).toBe("string");
    expect(typeof tStr("es", "heroHeadline")).toBe("string");
  });

  it("en heroHeadline is correct", () => {
    expect(tStr("en", "heroHeadline")).toBe("Know What You're Voting For");
  });

  it("es heroHeadline is correct", () => {
    expect(tStr("es", "heroHeadline")).toBe("Conoce por qué estás votando");
  });

  it("es footerAttribution matches spec", () => {
    expect(tStr("es", "footerAttribution")).toContain(
      "Creado por una persona usando herramientas de IA",
    );
  });

  it("es stateSelectorPrompt matches spec", () => {
    expect(tStr("es", "stateSelectorPrompt")).toContain(
      "Este código postal abarca varios estados",
    );
  });

  it("es zipError matches spec", () => {
    expect(tStr("es", "zipError")).toBe("Por favor ingresa un código postal");
  });

  it("es zipErrorInvalid matches spec", () => {
    expect(tStr("es", "zipErrorInvalid")).toBe(
      "Por favor ingresa un código postal válido de 5 dígitos",
    );
  });
});

describe("daysLeftLabel", () => {
  it("returns English label", () => {
    expect(daysLeftLabel("en", 5)).toBe("5 days left");
  });

  it("returns English singular label", () => {
    expect(daysLeftLabel("en", 1)).toBe("1 day left");
  });

  it("returns Spanish label", () => {
    expect(daysLeftLabel("es", 5)).toBe("Quedan 5 días");
  });

  it("returns Spanish singular label", () => {
    expect(daysLeftLabel("es", 1)).toBe("Quedan 1 día");
  });

  it("returns Vietnamese label", () => {
    expect(daysLeftLabel("vi", 5)).toBe("Còn 5 ngày");
  });

  it("returns Chinese label", () => {
    expect(daysLeftLabel("zh", 3)).toBe("还有 3 天");
  });

  it("returns Arabic singular label", () => {
    expect(daysLeftLabel("ar", 1)).toBe("يوم واحد متبقي");
  });

  it("returns Arabic dual label", () => {
    expect(daysLeftLabel("ar", 2)).toBe("يومان متبقيان");
  });

  it("returns Arabic plural label", () => {
    expect(daysLeftLabel("ar", 5)).toBe("5 أيام متبقية");
  });
});

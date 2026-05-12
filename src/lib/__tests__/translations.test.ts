import { describe, it, expect } from "vitest";
import { en, es, getTranslation, interpolate } from "../translations";

describe("translations", () => {
  it("en and es have the same keys", () => {
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("all en values are non-empty strings", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(typeof value, `en.${key} should be a string`).toBe("string");
      expect(value.length, `en.${key} should not be empty`).toBeGreaterThan(0);
    }
  });

  it("all es values are non-empty strings", () => {
    for (const [key, value] of Object.entries(es)) {
      expect(typeof value, `es.${key} should be a string`).toBe("string");
      expect(value.length, `es.${key} should not be empty`).toBeGreaterThan(0);
    }
  });

  it("getTranslation returns English for lang=en", () => {
    expect(getTranslation("en", "zipSubmitButton")).toBe("Look up my ballot");
  });

  it("getTranslation returns Spanish for lang=es", () => {
    expect(getTranslation("es", "zipSubmitButton")).toBe("Buscar mi boleta");
  });

  it("getTranslation returns English error messages", () => {
    expect(getTranslation("en", "zipErrorEmpty")).toBe(
      "Please enter a zip code",
    );
    expect(getTranslation("en", "zipErrorInvalid")).toBe(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("getTranslation returns Spanish error messages", () => {
    expect(getTranslation("es", "zipErrorEmpty")).toBe(
      "Por favor ingresa un código postal",
    );
    expect(getTranslation("es", "zipErrorInvalid")).toBe(
      "Por favor ingresa un código postal válido de 5 dígitos",
    );
  });

  it("English and Spanish toggle labels are different", () => {
    expect(getTranslation("en", "languageToggleLabel")).not.toBe(
      getTranslation("es", "languageToggleLabel"),
    );
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

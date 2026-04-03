import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "../translations";

describe("TRANSLATIONS", () => {
  it("has 'en' and 'es' language entries", () => {
    expect(TRANSLATIONS).toHaveProperty("en");
    expect(TRANSLATIONS).toHaveProperty("es");
  });

  it("en - hero title is present", () => {
    expect(TRANSLATIONS.en.hero.title).toBe("Know What You're Voting For");
  });

  it("es - hero title is present", () => {
    expect(TRANSLATIONS.es.hero.title).toBe("Sabe por quién vas a votar");
  });

  it("en - zipForm errors are present", () => {
    expect(TRANSLATIONS.en.zipForm.errors.required).toBe(
      "Please enter a zip code",
    );
    expect(TRANSLATIONS.en.zipForm.errors.invalid).toBe(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("es - zipForm errors are present", () => {
    expect(TRANSLATIONS.es.zipForm.errors.required).toBe(
      "Por favor ingresa un código postal",
    );
    expect(TRANSLATIONS.es.zipForm.errors.invalid).toBe(
      "Por favor ingresa un código postal válido de 5 dígitos",
    );
  });

  it("notFound.description is a function returning a string with zip", () => {
    const desc = TRANSLATIONS.en.notFound.description("90210");
    expect(desc).toContain("90210");
    const descEs = TRANSLATIONS.es.notFound.description("90210");
    expect(descEs).toContain("90210");
  });

  it("stateInfo.stateInfoTitle is a function returning state name", () => {
    expect(TRANSLATIONS.en.stateInfo.stateInfoTitle("Texas")).toContain(
      "Texas",
    );
    expect(TRANSLATIONS.es.stateInfo.stateInfoTitle("Texas")).toContain(
      "Texas",
    );
  });

  it("stateInfo.deadlineDaysLeft returns correct singular/plural", () => {
    expect(TRANSLATIONS.en.stateInfo.deadlineDaysLeft(1)).toBe("1 day left");
    expect(TRANSLATIONS.en.stateInfo.deadlineDaysLeft(5)).toBe("5 days left");
    expect(TRANSLATIONS.es.stateInfo.deadlineDaysLeft(1)).toBe("Queda 1 día");
    expect(TRANSLATIONS.es.stateInfo.deadlineDaysLeft(5)).toBe("Quedan 5 días");
  });

  it("en and es have the same set of top-level keys", () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const esKeys = Object.keys(TRANSLATIONS.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("tips.items is an array with 4 items in both languages", () => {
    expect(TRANSLATIONS.en.tips.items).toHaveLength(4);
    expect(TRANSLATIONS.es.tips.items).toHaveLength(4);
  });

  it("footer.created is translated", () => {
    expect(TRANSLATIONS.en.footer.created).toBe(
      "Created by a human using AI tools",
    );
    expect(TRANSLATIONS.es.footer.created).toBe(
      "Creado por una persona usando herramientas de IA",
    );
  });
});

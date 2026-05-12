import { describe, it, expect, beforeEach, vi } from "vitest";
import { en } from "../en";
import { es } from "../es";

// Test the translation dictionaries directly (context is React-only)
describe("Translation dictionaries", () => {
  it("en dictionary has all required keys matching the Translations interface", () => {
    expect(en.hero.headline).toBeTruthy();
    expect(en.hero.subtitle).toBeTruthy();
    expect(en.zipForm.label).toBeTruthy();
    expect(en.zipForm.placeholder).toBeTruthy();
    expect(en.zipForm.submitButton).toBeTruthy();
    expect(en.errors.emptyZip).toBeTruthy();
    expect(en.errors.invalidZip).toBeTruthy();
    expect(en.errors.zipNotFound.heading).toBeTruthy();
    expect(en.errors.zipNotFound.message).toBeTruthy();
    expect(en.errors.zipNotFound.linkText).toBeTruthy();
    expect(en.footer.shareHeading).toBeTruthy();
    expect(en.footer.shareText).toBeTruthy();
    expect(en.footer.attribution).toBeTruthy();
    expect(en.tips.heading).toBeTruthy();
    expect(en.stateSelector.prompt).toBeTruthy();
    expect(en.languageToggle.label).toBeTruthy();
  });

  it("es dictionary has all required keys matching the Translations interface", () => {
    expect(es.hero.headline).toBeTruthy();
    expect(es.hero.subtitle).toBeTruthy();
    expect(es.zipForm.label).toBeTruthy();
    expect(es.zipForm.placeholder).toBeTruthy();
    expect(es.zipForm.submitButton).toBeTruthy();
    expect(es.errors.emptyZip).toBeTruthy();
    expect(es.errors.invalidZip).toBeTruthy();
    expect(es.errors.zipNotFound.heading).toBeTruthy();
    expect(es.errors.zipNotFound.message).toBeTruthy();
    expect(es.errors.zipNotFound.linkText).toBeTruthy();
    expect(es.footer.shareHeading).toBeTruthy();
    expect(es.footer.shareText).toBeTruthy();
    expect(es.footer.attribution).toBeTruthy();
    expect(es.tips.heading).toBeTruthy();
    expect(es.stateSelector.prompt).toBeTruthy();
    expect(es.languageToggle.label).toBeTruthy();
  });

  it("en and es headlines are different", () => {
    expect(en.hero.headline).not.toBe(es.hero.headline);
  });

  it("en and es submit buttons are different", () => {
    expect(en.zipForm.submitButton).not.toBe(es.zipForm.submitButton);
  });

  it("en deadline.daysLeft function returns correct label", () => {
    expect(en.deadline.daysLeft(1)).toBe("1 day left");
    expect(en.deadline.daysLeft(5)).toBe("5 days left");
  });

  it("es deadline.daysLeft function returns correct label", () => {
    expect(es.deadline.daysLeft(1)).toBe("Quedan 1 día");
    expect(es.deadline.daysLeft(5)).toBe("Quedan 5 días");
  });

  it("en errors.noElections function interpolates state name", () => {
    const result = en.errors.noElections("Texas");
    expect(result).toContain("Texas");
  });

  it("es errors.noElections function interpolates state name", () => {
    const result = es.errors.noElections("Texas");
    expect(result).toContain("Texas");
  });
});

describe("localStorage mock for locale persistence", () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("stores locale value correctly", () => {
    localStorage.setItem("voter-choice-language", "es");
    expect(localStorage.getItem("voter-choice-language")).toBe("es");
  });

  it("returns null for unset key", () => {
    expect(localStorage.getItem("voter-choice-language")).toBeNull();
  });

  it("allows resetting to en", () => {
    localStorage.setItem("voter-choice-language", "es");
    localStorage.setItem("voter-choice-language", "en");
    expect(localStorage.getItem("voter-choice-language")).toBe("en");
  });
});
